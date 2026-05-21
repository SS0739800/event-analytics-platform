import pandas as pd
from src.db.client import get_client


def fetch_events_df(user_id: str) -> pd.DataFrame:
    result = get_client().rpc("get_user_events", {"p_user_id": user_id}).execute()
    if not result.data:
        return pd.DataFrame(
            columns=["id", "title", "category", "start_time", "end_time", "duration_minutes", "date"]
        )
    return pd.DataFrame(result.data)


def create_event(user_id: str, title: str, category: str,
                 start_time: str, end_time: str, duration_minutes: int, date: str):
    return get_client().rpc("create_event", {
        "p_user_id": user_id,
        "p_title": title,
        "p_category": category,
        "p_start_time": start_time,
        "p_end_time": end_time,
        "p_duration_minutes": duration_minutes,
        "p_date": date,
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


def delete_event(event_id: int, user_id: str):
    return get_client().rpc("delete_event", {
        "p_event_id": event_id,
        "p_user_id": user_id,
    }).execute()
