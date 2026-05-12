import argparse
from pathlib import Path

from src.analytics.subject_stats import SubjectStats
from src.analytics.time_stats import TimeStats
from src.analytics.trends import Trends
from src.export.csv_exporter import CSVExporter
from src.export.excel_exporter import ExcelExporter
from src.export.pdf_exporter import PDFExporter
from src.parser.event_parser import EventParser
from src.visualization.charts import save_bar_chart

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "sample_events.csv"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"


def _print_summary(subject: SubjectStats, time_s: TimeStats, trends: Trends) -> None:
    print("\n=== EVENT ANALYTICS SUMMARY ===\n")

    print("Events by Category:")
    for cat, count in subject.events_by_category().items():
        print(f"  {cat}: {count}")

    print("\nTotal Duration by Category (minutes):")
    for cat, mins in subject.duration_by_category().items():
        print(f"  {cat}: {mins} min")

    print("\nBusiest Days:")
    for day, count in time_s.busiest_days().items():
        print(f"  {day}: {count} events")

    print("\nMonthly Event Count:")
    for month, count in trends.monthly_event_count().items():
        print(f"  {month}: {count} events")

    print("\nTop 5 Longest Events:")
    for event in subject.top_events(5):
        print(f"  {event['title']} ({event['category']}): {event['duration_minutes']} min")


def run_cli() -> None:
    parser = argparse.ArgumentParser(description="Event Analytics Platform CLI")
    parser.add_argument("--data", default=str(DATA_FILE), help="Path to events CSV")
    parser.add_argument(
        "--export",
        choices=["csv", "excel", "pdf", "all"],
        help="Export format",
    )
    parser.add_argument("--chart", action="store_true", help="Save charts to output/")
    parser.add_argument("--summary", action="store_true", help="Print analytics summary")
    args = parser.parse_args()

    ep = EventParser(args.data)
    df = ep.dataframe
    subject = SubjectStats(df)
    time_s = TimeStats(df)
    trends = Trends(df)

    if args.summary or not any([args.export, args.chart]):
        _print_summary(subject, time_s, trends)

    OUTPUT_DIR.mkdir(exist_ok=True)

    if args.chart:
        print("\nSaving charts to output/...")
        save_bar_chart(
            subject.events_by_category(),
            "Events by Category", "Category", "Count",
            str(OUTPUT_DIR / "events_by_category.png"),
        )
        save_bar_chart(
            subject.duration_by_category(),
            "Total Duration by Category (min)", "Category", "Minutes",
            str(OUTPUT_DIR / "duration_by_category.png"),
            color="coral",
        )
        save_bar_chart(
            time_s.busiest_days(),
            "Events by Day of Week", "Day", "Count",
            str(OUTPUT_DIR / "busiest_days.png"),
            color="mediumseagreen",
        )
        print(f"Charts saved to {OUTPUT_DIR}/")

    if args.export in ("csv", "all"):
        path = CSVExporter(df).export(str(OUTPUT_DIR / "events_export.csv"))
        print(f"CSV exported: {path}")

    if args.export in ("excel", "all"):
        analytics = {
            "By Category": subject.events_by_category(),
            "Duration": subject.duration_by_category(),
        }
        path = ExcelExporter(df).export(str(OUTPUT_DIR / "events_export.xlsx"), analytics)
        print(f"Excel exported: {path}")

    if args.export in ("pdf", "all"):
        analytics = {
            "Events by Category": subject.events_by_category(),
            "Total Duration (minutes)": subject.duration_by_category(),
            "Busiest Days": time_s.busiest_days(),
            "Monthly Trends": trends.monthly_event_count(),
        }
        path = PDFExporter(analytics).export(str(OUTPUT_DIR / "events_report.pdf"))
        print(f"PDF exported: {path}")


if __name__ == "__main__":
    run_cli()
