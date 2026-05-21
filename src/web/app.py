import io
import tempfile
import time
import uuid
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

from src.analytics.subject_stats import SubjectStats
from src.analytics.time_stats import TimeStats
from src.analytics.trends import Trends
from src.auth.password import check_password
from src.auth.tokens import create_token, verify_token
from src.auth.totp import get_qr_base64, verify_code
from src.db.events import fetch_events_df, create_event, update_event, delete_event
from src.db.profiles import (
    email_taken, create_profile_from_pending,
    get_profile_by_email, get_profile_by_id, get_profile_by_id_full
)
from src.export.excel_exporter import ExcelExporter
from src.export.pdf_exporter import PDFExporter

# In-memory store for pending registrations (keyed by UUID, expires in 10 min)
_pending: dict[str, dict] = {}

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
