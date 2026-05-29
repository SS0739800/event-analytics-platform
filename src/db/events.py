import uuid
import pandas as pd
from src.db.client import get_client


def fetch_events_df(user_id: str) -> pd.DataFrame:
    result = get_client().rpc("get_user_events", {"p_user_id": user_id}).execute()
    if not result.data:
        return pd.DataFrame(
            columns=["id", "title", "category", "start_time", "end_time", "duration_minutes", "date", "series_id"]
        )
    return pd.DataFrame(result.data)


def check_overlap(user_id: str, date: str, start_time: str, end_time: str,
                  exclude_id: int = None) -> dict | None:
    """Return the first existing event that overlaps the given time slot, or None."""
    result = get_client().table("events") \
        .select("id, title, start_time, end_time") \
        .eq("user_id", user_id) \
        .eq("date", date) \
        .execute()
    new_start = start_time[:5]
    new_end = end_time[:5]
    for e in (result.data or []):
        if exclude_id and e["id"] == exclude_id:
            continue
        e_start = str(e["start_time"])[:5]
        e_end = str(e["end_time"])[:5]
        if new_start < e_end and new_end > e_start:
            return e
    return None


def create_event(user_id: str, title: str, category: str,
                 start_time: str, end_time: str, duration_minutes: int,
                 date: str, series_id: str = None):
    return get_client().rpc("create_event", {
        "p_user_id": user_id,
        "p_title": title,
        "p_category": category,
        "p_start_time": start_time,
        "p_end_time": end_time,
        "p_duration_minutes": duration_minutes,
        "p_date": date,
        "p_series_id": series_id,
    }).execute()


def update_event(event_id: int, user_id: str, title: str, category: str,
                 start_time: str, end_time: str, duration_minutes: int, date: str):
    return get_client().rpc("update_event", {
        "p_event_id": event_id,
        "p_user_id": user_id,
        "p_title": title,
        "p_category": category,
        "p_start_time": start_time,
        "p_end_time": end_time,
        "p_duration_minutes": duration_minutes,
        "p_date": date,
    }).execute()


def create_events_bulk(user_id: str, events: list[dict]) -> dict:
    """Create non-conflicting events stamped with a shared series_id."""
    series_id = str(uuid.uuid4())
    succeeded = 0
    skipped = []
    committed: list[dict] = []

    for e in events:
        if e.get("conflict"):
            skipped.append({"title": e["title"], "date": e["date"], "reason": e["conflict"]})
            continue
        date = e["date"]
        start = e["start_time"][:5]
        end = e["end_time"][:5]
        batch_conflict = next(
            (c for c in committed
             if c["date"] == date and start < c["end_time"] and end > c["start_time"]),
            None
        )
        if batch_conflict:
            skipped.append({
                "title": e["title"], "date": date,
                "reason": f"Conflicts with '{batch_conflict['title']}' in this batch",
            })
            continue
        try:
            create_event(
                user_id=user_id,
                title=e["title"],
                category=e["category"],
                start_time=e["start_time"],
                end_time=e["end_time"],
                duration_minutes=int(e["duration_minutes"]),
                date=date,
                series_id=series_id,
            )
            committed.append({"date": date, "start_time": start, "end_time": end, "title": e["title"]})
            succeeded += 1
        except Exception:
            skipped.append({"title": e["title"], "date": date, "reason": "Database error"})

    return {"created": succeeded, "skipped": len(skipped), "skipped_details": skipped, "series_id": series_id}


def delete_series(series_id: str, user_id: str) -> int:
    result = get_client().rpc("delete_event_series", {
        "p_series_id": series_id,
        "p_user_id": user_id,
    }).execute()
    return result.data or 0


def delete_event(event_id: int, user_id: str):
    return get_client().rpc("delete_event", {
        "p_event_id": event_id,
        "p_user_id": user_id,
    }).execute()
