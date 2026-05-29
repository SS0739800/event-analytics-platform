import io
import os
import tempfile
import time
import uuid
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory, after_this_request
from flask_cors import CORS

from src.analytics.subject_stats import SubjectStats
from src.analytics.time_stats import TimeStats
from src.analytics.trends import Trends
from src.auth.password import check_password
from src.auth.tokens import create_token, verify_token
from src.auth.totp import get_qr_base64, verify_code
from src.db.events import fetch_events_df, create_event, update_event, delete_event, create_events_bulk, delete_series, check_overlap
from src.db.profiles import (
    email_taken, create_profile_from_pending,
    get_profile_by_email, get_profile_by_id, get_profile_by_id_full
)
from src.export.excel_exporter import ExcelExporter
from src.export.pdf_exporter import PDFExporter

# In-memory store for pending registrations (keyed by UUID, expires in 10 min)
_pending: dict[str, dict] = {}


def _purge_expired_pending():
    now = time.time()
    expired = [k for k, v in _pending.items() if now > v["expires"]]
    for k in expired:
        _pending.pop(k, None)

ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = ROOT / "frontend" / "dist"

app = Flask(__name__, static_folder=str(FRONTEND_DIST), static_url_path="")
CORS(app)


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401
        try:
            payload = verify_token(auth_header[len("Bearer "):])
            user_id = payload["sub"]
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(user_id, *args, **kwargs)
    return decorated


def _analytics(user_id: str):
    df = fetch_events_df(user_id)
    return df, SubjectStats(df), TimeStats(df), Trends(df)


def _to_series(d: dict, key: str, value: str) -> list[dict]:
    return [{key: k, value: v} for k, v in d.items()]


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route("/auth/register", methods=["POST"])
def auth_register():
    body = request.get_json()
    email = body.get("email", "").strip().lower()
    full_name = body.get("full_name", "").strip()
    password = body.get("password", "")

    if email_taken(email):
        return jsonify({"error": "Email already registered"}), 409

    from src.auth.password import hash_password
    from src.auth.totp import generate_secret
    totp_secret = generate_secret()
    password_hash = hash_password(password)

    _purge_expired_pending()
    pending_id = str(uuid.uuid4())
    _pending[pending_id] = {
        "email": email,
        "full_name": full_name,
        "password_hash": password_hash,
        "totp_secret": totp_secret,
        "expires": time.time() + 600,
    }

    qr = get_qr_base64(email, totp_secret)
    return jsonify({"pending_id": pending_id, "qr_code": qr, "secret": totp_secret})


@app.route("/auth/register/verify", methods=["POST"])
def auth_register_verify():
    body = request.get_json()
    pending_id = (body.get("pending_id") or "").strip()
    code = body.get("code", "")

    pending = _pending.get(pending_id)
    if not pending:
        return jsonify({"error": "Registration session not found — please start again"}), 400
    if time.time() > pending["expires"]:
        _pending.pop(pending_id, None)
        return jsonify({"error": "Registration session expired — please start again"}), 400

    if not verify_code(pending["totp_secret"], code):
        return jsonify({"error": "Invalid code — try again"}), 401

    try:
        profile = create_profile_from_pending(
            email=pending["email"],
            full_name=pending["full_name"],
            password_hash=pending["password_hash"],
            totp_secret=pending["totp_secret"],
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 409

    _pending.pop(pending_id, None)
    token = create_token(profile["id"], profile["email"])
    return jsonify({
        "token": token,
        "user": {"id": profile["id"], "email": profile["email"], "full_name": profile["full_name"]},
    })


@app.route("/auth/login", methods=["POST"])
def auth_login():
    body = request.get_json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    profile = get_profile_by_email(email)
    if not profile or not check_password(password, profile["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({"user_id": profile["id"]})


@app.route("/auth/login/verify", methods=["POST"])
def auth_login_verify():
    body = request.get_json()
    user_id = body.get("user_id")
    code = body.get("code", "")

    profile = get_profile_by_id_full(user_id)
    if not profile:
        return jsonify({"error": "User not found"}), 404

    if not verify_code(profile["totp_secret"], code):
        return jsonify({"error": "Invalid code — try again"}), 401

    token = create_token(profile["id"], profile["email"])
    return jsonify({
        "token": token,
        "user": {
            "id": profile["id"],
            "email": profile["email"],
            "full_name": profile["full_name"],
        },
    })


# ── Profile ───────────────────────────────────────────────────────────────────

@app.route("/api/profile", methods=["GET"])
@require_auth
def api_get_profile(user_id):
    return jsonify(get_profile_by_id(user_id))


# ── Events CRUD ───────────────────────────────────────────────────────────────

@app.route("/api/events", methods=["GET"])
@require_auth
def api_get_events(user_id):
    df = fetch_events_df(user_id)
    records = df.to_dict(orient="records")
    for r in records:
        for k, v in r.items():
            if hasattr(v, "isoformat"):
                r[k] = v.isoformat()
            elif not isinstance(v, (int, float, bool, type(None))):
                r[k] = str(v)
    return jsonify(records)


@app.route("/api/events", methods=["POST"])
@require_auth
def api_create_event(user_id):
    body = request.get_json()
    if body["start_time"] >= body["end_time"]:
        return jsonify({"error": "Start time must be before end time"}), 400
    conflict = check_overlap(user_id, body["date"], body["start_time"], body["end_time"])
    if conflict:
        c_start = str(conflict["start_time"])[:5]
        c_end = str(conflict["end_time"])[:5]
        return jsonify({
            "error": f"Overlaps with '{conflict['title']}' on this date ({c_start}–{c_end})",
            "conflict_id": conflict["id"],
            "conflict_title": conflict["title"],
        }), 409
    result = create_event(
        user_id=user_id,
        title=body["title"],
        category=body["category"],
        start_time=body["start_time"],
        end_time=body["end_time"],
        duration_minutes=int(body["duration_minutes"]),
        date=body["date"],
    )
    return jsonify(result.data), 201


@app.route("/api/events/<int:event_id>", methods=["PUT"])
@require_auth
def api_update_event(user_id, event_id):
    body = request.get_json()
    if body["start_time"] >= body["end_time"]:
        return jsonify({"error": "Start time must be before end time"}), 400
    conflict = check_overlap(user_id, body["date"], body["start_time"], body["end_time"],
                             exclude_id=event_id)
    if conflict:
        c_start = str(conflict["start_time"])[:5]
        c_end = str(conflict["end_time"])[:5]
        return jsonify({
            "error": f"Overlaps with '{conflict['title']}' on this date ({c_start}–{c_end})",
            "conflict_id": conflict["id"],
            "conflict_title": conflict["title"],
        }), 409
    result = update_event(
        event_id=event_id,
        user_id=user_id,
        title=body["title"],
        category=body["category"],
        start_time=body["start_time"],
        end_time=body["end_time"],
        duration_minutes=int(body["duration_minutes"]),
        date=body["date"],
    )
    return jsonify(result.data)


@app.route("/api/events/<int:event_id>", methods=["DELETE"])
@require_auth
def api_delete_event(user_id, event_id):
    delete_event(event_id=event_id, user_id=user_id)
    return "", 204


@app.route("/api/events/series/<series_id>", methods=["DELETE"])
@require_auth
def api_delete_series(user_id, series_id):
    count = delete_series(series_id=series_id, user_id=user_id)
    return jsonify({"deleted": count}), 200


# ── AI ───────────────────────────────────────────────────────────────────────

@app.route("/api/insights")
@require_auth
def api_insights(user_id):
    df, subject, time_s, _ = _analytics(user_id)
    if df.empty:
        return jsonify({"insights": "Add some events to your dashboard to get personalized AI insights!"})

    cat_breakdown = subject.events_by_category()
    busiest_days = time_s.busiest_days()
    busiest_hours = time_s.busiest_hours()
    busiest_day = max(busiest_days, key=busiest_days.get) if busiest_days else "N/A"
    busiest_hour = max(busiest_hours, key=busiest_hours.get) if busiest_hours else "N/A"

    summary = {
        "total_events": len(df),
        "total_hours": round(df["duration_minutes"].sum() / 60, 1),
        "categories": int(df["category"].nunique()),
        "category_breakdown": cat_breakdown,
        "busiest_day": busiest_day,
        "busiest_hour": f"{busiest_hour}:00" if busiest_hour != "N/A" else "N/A",
    }

    from src.ai.insights import generate_insights
    return jsonify({"insights": generate_insights(summary)})


@app.route("/api/parse-event", methods=["POST"])
@require_auth
def api_parse_event(user_id):
    body = request.get_json()
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    from src.ai.parser import parse_event_smart
    try:
        return jsonify(parse_event_smart(text))
    except Exception as e:
        return jsonify({"error": f"Could not parse: {e}"}), 422


@app.route("/api/events/validate-bulk", methods=["POST"])
@require_auth
def api_validate_events_bulk(user_id):
    events = request.get_json()
    if not isinstance(events, list):
        return jsonify({"error": "Expected a list"}), 400

    # Fetch all existing events ONCE — avoids N separate Supabase calls in the loop
    from src.db.client import get_client
    existing = get_client().table("events") \
        .select("id, title, start_time, end_time, date") \
        .eq("user_id", user_id) \
        .execute().data or []

    results = []
    committed = []  # intra-batch intervals already confirmed clean

    for e in events:
        date = e.get("date", "")
        start = (e.get("start_time") or "")[:5]
        end = (e.get("end_time") or "")[:5]
        conflict = None
        conflict_id = None

        # Check in-memory against existing DB events
        for ex in existing:
            if str(ex.get("date", ""))[:10] != date[:10]:
                continue
            ex_start = str(ex["start_time"])[:5]
            ex_end = str(ex["end_time"])[:5]
            if start < ex_end and end > ex_start:
                conflict = f"Overlaps with '{ex['title']}' ({ex_start}–{ex_end})"
                conflict_id = ex["id"]
                break

        if not conflict:
            batch_hit = next(
                (c for c in committed
                 if c["date"] == date and start < c["end_time"] and end > c["start_time"]),
                None
            )
            if batch_hit:
                conflict = f"Conflicts with '{batch_hit['title']}' in this batch ({batch_hit['start_time']}–{batch_hit['end_time']})"

        if not conflict:
            committed.append({"date": date, "start_time": start, "end_time": end, "title": e.get("title")})

        results.append({**e, "conflict": conflict, "conflict_id": conflict_id})

    return jsonify(results)


@app.route("/api/events/bulk", methods=["POST"])
@require_auth
def api_create_events_bulk(user_id):
    events = request.get_json()
    if not isinstance(events, list) or not events:
        return jsonify({"error": "Expected a list of events"}), 400
    result = create_events_bulk(user_id, events)
    return jsonify(result), 201


# ── Analytics ─────────────────────────────────────────────────────────────────

@app.route("/api/stats")
@require_auth
def api_stats(user_id):
    df, *_ = _analytics(user_id)
    if df.empty:
        return jsonify({"total_events": 0, "total_hours": 0, "categories": 0, "avg_duration": 0})
    return jsonify({
        "total_events": len(df),
        "total_hours": round(df["duration_minutes"].sum() / 60, 1),
        "categories": int(df["category"].nunique()),
        "avg_duration": round(df["duration_minutes"].mean(), 1),
    })


@app.route("/api/category-stats")
@require_auth
def api_category_stats(user_id):
    _, subject, *_ = _analytics(user_id)
    return jsonify({
        "events_by_category": _to_series(subject.events_by_category(), "category", "count"),
        "duration_by_category": _to_series(subject.duration_by_category(), "category", "minutes"),
        "avg_duration_by_category": _to_series(subject.average_duration_by_category(), "category", "avg_minutes"),
    })


@app.route("/api/time-stats")
@require_auth
def api_time_stats(user_id):
    _, _, time_s, _ = _analytics(user_id)
    hours_raw = time_s.busiest_hours()
    return jsonify({
        "busiest_hours": [{"hour": h, "count": hours_raw.get(h, 0)} for h in range(24)],
        "busiest_days": _to_series(time_s.busiest_days(), "day", "count"),
        "busiest_months": _to_series(time_s.busiest_months(), "month", "count"),
    })


@app.route("/api/trends")
@require_auth
def api_trends(user_id):
    _, _, _, trends = _analytics(user_id)
    cat_df = trends.category_trend_by_month()
    category_trend = [
        {"month": str(month), **{col: int(cat_df.loc[month, col]) for col in cat_df.columns}}
        for month in cat_df.index
    ]
    return jsonify({
        "monthly_event_count": _to_series(trends.monthly_event_count(), "month", "count"),
        "monthly_duration": _to_series(trends.monthly_duration(), "month", "minutes"),
        "category_trend": category_trend,
    })


@app.route("/api/top-events")
@require_auth
def api_top_events(user_id):
    _, subject, *_ = _analytics(user_id)
    events = subject.top_events(5)
    for e in events:
        for k, v in e.items():
            if hasattr(v, "isoformat"):
                e[k] = v.isoformat()
            elif not isinstance(v, (int, float, bool, type(None))):
                e[k] = str(v)
    return jsonify(events)


# ── Export ────────────────────────────────────────────────────────────────────

@app.route("/export/csv")
@require_auth
def export_csv(user_id):
    df, *_ = _analytics(user_id)
    buf = io.BytesIO(df.to_csv(index=False).encode())
    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name="events_export.csv")


@app.route("/export/excel")
@require_auth
def export_excel(user_id):
    df, subject, *_ = _analytics(user_id)
    analytics = {"By Category": subject.events_by_category(), "Duration": subject.duration_by_category()}
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
        tmp = f.name
    ExcelExporter(df).export(tmp, analytics)

    @after_this_request
    def remove_file(response):
        try: os.unlink(tmp)
        except Exception: pass
        return response

    return send_file(
        tmp,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="events_export.xlsx",
    )


@app.route("/export/pdf")
@require_auth
def export_pdf(user_id):
    df, subject, time_s, trends = _analytics(user_id)
    analytics = {
        "Events by Category": subject.events_by_category(),
        "Total Duration (minutes)": subject.duration_by_category(),
        "Busiest Days": time_s.busiest_days(),
        "Monthly Trends": trends.monthly_event_count(),
    }
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        tmp = f.name
    PDFExporter(analytics).export(tmp)

    @after_this_request
    def remove_file(response):
        try: os.unlink(tmp)
        except Exception: pass
        return response

    return send_file(tmp, mimetype="application/pdf", as_attachment=True, download_name="events_report.pdf")


# ── Serve React ───────────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path and (FRONTEND_DIST / path).exists():
        return send_from_directory(str(FRONTEND_DIST), path)
    return send_from_directory(str(FRONTEND_DIST), "index.html")


if __name__ == "__main__":
    app.run(debug=True)
