from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from src.analytics.subject_stats import SubjectStats
from src.analytics.time_stats import TimeStats
from src.analytics.trends import Trends
from src.export.csv_exporter import CSVExporter
from src.export.excel_exporter import ExcelExporter
from src.export.pdf_exporter import PDFExporter
from src.parser.event_parser import EventParser

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_FILE = ROOT / "data" / "sample_events.csv"
OUTPUT_DIR = ROOT / "output"
FRONTEND_DIST = ROOT / "frontend" / "dist"

app = Flask(__name__, static_folder=str(FRONTEND_DIST), static_url_path="")
CORS(app)


def _load():
    ep = EventParser(str(DATA_FILE))
    df = ep.dataframe
    return df, SubjectStats(df), TimeStats(df), Trends(df)


def _to_series(d: dict, key: str, value: str) -> list[dict]:
    return [{key: k, value: v} for k, v in d.items()]


# ── API ──────────────────────────────────────────────────────────────────────

@app.route("/api/stats")
def api_stats():
    df, subject, time_s, trends = _load()
    return jsonify({
        "total_events": len(df),
        "total_hours": round(df["duration_minutes"].sum() / 60, 1),
        "categories": int(df["category"].nunique()),
        "avg_duration": round(df["duration_minutes"].mean(), 1),
    })


@app.route("/api/category-stats")
def api_category_stats():
    _, subject, *_ = _load()
    return jsonify({
        "events_by_category": _to_series(subject.events_by_category(), "category", "count"),
        "duration_by_category": _to_series(subject.duration_by_category(), "category", "minutes"),
        "avg_duration_by_category": _to_series(subject.average_duration_by_category(), "category", "avg_minutes"),
    })


@app.route("/api/time-stats")
def api_time_stats():
    _, _, time_s, _ = _load()
    hours_raw = time_s.busiest_hours()
    return jsonify({
        "busiest_hours": [{"hour": h, "count": hours_raw.get(h, 0)} for h in range(24)],
        "busiest_days": _to_series(time_s.busiest_days(), "day", "count"),
        "busiest_months": _to_series(time_s.busiest_months(), "month", "count"),
    })


@app.route("/api/trends")
def api_trends():
    _, _, _, trends = _load()
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
def api_top_events():
    _, subject, *_ = _load()
    events = subject.top_events(5)
    for e in events:
        if hasattr(e.get("date"), "isoformat"):
            e["date"] = e["date"].isoformat()
        else:
            e["date"] = str(e["date"])
    return jsonify(events)


# ── Export ───────────────────────────────────────────────────────────────────

@app.route("/export/csv")
def export_csv():
    import io
    from flask import send_file
    df, *_ = _load()
    buf = io.BytesIO(df.to_csv(index=False).encode())
    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name="events_export.csv")


@app.route("/export/excel")
def export_excel():
    import tempfile
    from flask import send_file
    df, subject, *_ = _load()
    analytics = {
        "By Category": subject.events_by_category(),
        "Duration": subject.duration_by_category(),
    }
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
def export_pdf():
    import tempfile
    from flask import send_file
    df, subject, time_s, trends = _load()
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


# ── Serve React in production ─────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path and (FRONTEND_DIST / path).exists():
        return send_from_directory(str(FRONTEND_DIST), path)
    return send_from_directory(str(FRONTEND_DIST), "index.html")


if __name__ == "__main__":
    app.run(debug=True)
