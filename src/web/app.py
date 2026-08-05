import io
import os
import tempfile
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, Response, jsonify, make_response, request, send_file, send_from_directory, after_this_request
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

from src.analytics.subject_stats import SubjectStats
from src.analytics.time_stats import TimeStats
from src.analytics.trends import Trends
from src.auth.password import check_password
from src.auth.tokens import (
    create_token, verify_token, renew_token, create_ical_token, verify_ical_token,
    create_login_token, verify_login_token,
)
from src.auth.totp import get_qr_base64, verify_code
from src.db.events import fetch_events_df, create_event, update_event, delete_event, create_events_bulk, delete_series, check_overlap
from src.db.pending import (
    create_pending, get_pending, delete_pending, is_expired, purge_expired_pending,
)
from src.db.profiles import (
    email_taken, create_profile_from_pending,
    get_profile_by_email, get_profile_by_id, get_profile_by_id_full,
    get_categories, update_categories,
)
from src.export.excel_exporter import ExcelExporter
from src.export.pdf_exporter import PDFExporter

ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = ROOT / "frontend" / "dist"

# static_folder=None disables Flask's built-in static route on purpose. With
# static_url_path="" it registered /<path:filename>, which is matched before
# serve_react's /<path:path> and turned every client-side route into a 404 —
# /dashboard looked for a *file* called "dashboard". Vite's dev server hides
# this locally, so it would only have shown up in production on a page
# refresh. serve_react below handles both real assets and the SPA fallback.
app = Flask(__name__, static_folder=None)

# Behind a TLS-terminating proxy (Render, Railway, Fly), the upstream scheme
# and host arrive only as X-Forwarded-* headers. Flask ignores them by
# default, so request.host_url would report http:// and the iCal
# subscription URL built in api_ical_token() would hand out a long-lived
# token over plaintext. Opt in explicitly: trusting these headers when
# nothing is actually in front of the app would let a client spoof them.
if os.environ.get("TRUST_PROXY") == "1":
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# In both dev and production the browser talks to this app on a single
# origin — Vite proxies /api, /auth and /export to Flask locally, and in
# production Flask serves the built frontend itself (see serve_react below).
# So no CORS headers are needed at all, and the previous blanket CORS(app)
# let any website drive the unauthenticated endpoints. Set CORS_ORIGINS to a
# comma-separated allowlist only if you split the frontend onto its own host.
_cors_origins = os.environ.get("CORS_ORIGINS", "").strip()
if _cors_origins:
    # expose_headers matters here: cross-origin JS can't read X-Renewed-Token
    # without it, so sessions would silently stop sliding.
    CORS(app,
         origins=[o.strip() for o in _cors_origins.split(",") if o.strip()],
         expose_headers=["X-Renewed-Token"])


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

        response = make_response(f(user_id, *args, **kwargs))
        # Push the idle window forward. None means the session hit its absolute
        # cap, so we just let the current token run out.
        renewed = renew_token(payload)
        if renewed:
            response.headers["X-Renewed-Token"] = renewed
        return response
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

    purge_expired_pending()
    pending_id = create_pending(
        email=email,
        full_name=full_name,
        password_hash=password_hash,
        totp_secret=totp_secret,
    )

    qr = get_qr_base64(email, totp_secret)
    return jsonify({"pending_id": pending_id, "qr_code": qr, "secret": totp_secret})


@app.route("/auth/register/verify", methods=["POST"])
def auth_register_verify():
    body = request.get_json()
    pending_id = (body.get("pending_id") or "").strip()
    code = body.get("code", "")

    pending = get_pending(pending_id)
    if not pending:
        return jsonify({"error": "Registration session not found — please start again"}), 400
    if is_expired(pending):
        delete_pending(pending_id)
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

    delete_pending(pending_id)
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

    return jsonify({"login_token": create_login_token(profile["id"])})


@app.route("/auth/login/verify", methods=["POST"])
def auth_login_verify():
    body = request.get_json()
    code = body.get("code", "")

    try:
        user_id = verify_login_token(body.get("login_token") or "")["sub"]
    except Exception:
        return jsonify({"error": "Login session expired — please sign in again"}), 401

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
    # Let pandas serialize: it writes `null` for NaN/NaT (jsonify would emit the
    # invalid `NaN` token, which makes the client's r.json() throw) and coerces
    # numpy scalars to native types.
    return Response(
        df.to_json(orient="records", date_format="iso"),
        mimetype="application/json",
    )


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
        categories = get_categories(user_id)
        return jsonify(parse_event_smart(text, categories))
    except Exception as e:
        return jsonify({"error": f"Could not parse: {e}"}), 422


@app.route("/api/query", methods=["POST"])
@require_auth
def api_query(user_id):
    body = request.get_json()
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"error": "No question provided"}), 400
    from src.ai.query import answer_query
    df, *_ = _analytics(user_id)
    try:
        return jsonify({"answer": answer_query(question, df)})
    except Exception as e:
        return jsonify({"error": f"Could not answer: {e}"}), 422


@app.route("/api/weekly-summary")
@require_auth
def api_weekly_summary(user_id):
    from src.ai.summary import generate_weekly_summary
    df, *_ = _analytics(user_id)
    try:
        return jsonify({"summary": generate_weekly_summary(df)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Categories ────────────────────────────────────────────────────────────────

@app.route("/api/categories", methods=["GET"])
@require_auth
def api_get_categories(user_id):
    return jsonify(get_categories(user_id))


@app.route("/api/categories", methods=["PUT"])
@require_auth
def api_update_categories(user_id):
    body = request.get_json()
    categories = body.get("categories", [])
    if not isinstance(categories, list) or not categories:
        return jsonify({"error": "categories must be a non-empty list"}), 400
    update_categories(user_id, [c.strip() for c in categories if c.strip()])
    return jsonify({"categories": get_categories(user_id)})


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


# ── iCal helpers ─────────────────────────────────────────────────────────────

def _fold(line: str) -> str:
    """Fold long iCal lines at 75 octets per RFC 5545, never splitting a
    multi-byte character. Continuation lines start with a space (which counts
    toward the octet limit)."""
    if len(line.encode("utf-8")) <= 75:
        return line
    result, chunk = [], b""
    for ch in line:
        ch_bytes = ch.encode("utf-8")
        if len(chunk) + len(ch_bytes) > 75:
            result.append(chunk.decode("utf-8"))
            chunk = b" " + ch_bytes
        else:
            chunk += ch_bytes
    result.append(chunk.decode("utf-8"))
    return "\r\n".join(result)


def _build_ical(df) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//EventAnalytics//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:EventAnalytics",
    ]
    for _, row in df.iterrows():
        d     = str(row["date"])[:10].replace("-", "")
        t0    = str(row["start_time"])[:5].replace(":", "")
        t1    = str(row["end_time"])[:5].replace(":", "")
        title = str(row["title"]).replace(",", "\\,").replace(";", "\\;")
        cat   = str(row["category"])
        lines += [
            "BEGIN:VEVENT",
            f"UID:event-{row['id']}@eventanalytics",
            f"DTSTAMP:{stamp}",
            f"DTSTART:{d}T{t0}00",
            f"DTEND:{d}T{t1}00",
            _fold(f"SUMMARY:{title}"),
            f"CATEGORIES:{cat}",
            f"DESCRIPTION:Duration: {row['duration_minutes']} min",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


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


@app.route("/export/ical")
@require_auth
def export_ical(user_id):
    df, *_ = _analytics(user_id)
    content = _build_ical(df)
    return Response(
        content,
        mimetype="text/calendar",
        headers={"Content-Disposition": "attachment; filename=events.ics"},
    )


@app.route("/api/ical-token")
@require_auth
def api_ical_token(user_id):
    token = create_ical_token(user_id)
    base = request.host_url.rstrip("/")
    return jsonify({"url": f"{base}/export/ical/subscribe/{token}"})


@app.route("/export/ical/subscribe/<token>")
def export_ical_subscribe(token):
    try:
        payload = verify_ical_token(token)
        user_id = payload["sub"]
    except Exception:
        return jsonify({"error": "Invalid or expired token"}), 401
    df = fetch_events_df(user_id)
    content = _build_ical(df)
    return Response(content, mimetype="text/calendar")


# ── Serve React ───────────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    # Real build artefact (/assets/index-*.js, favicon, …) → serve it.
    # Anything else is a client-side route, so hand back index.html and let
    # React Router resolve it. send_from_directory refuses to escape the
    # directory, so a traversal attempt falls through to index.html.
    if path and (FRONTEND_DIST / path).is_file():
        return send_from_directory(str(FRONTEND_DIST), path)
    return send_from_directory(str(FRONTEND_DIST), "index.html")


if __name__ == "__main__":
    # Prefer `python run_web.py`. Never enable debug on a public host: the
    # Werkzeug debugger exposes an interactive console.
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
