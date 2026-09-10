import pandas as pd
from datetime import date, timedelta
from src.ai.client import chat


def generate_weekly_summary(df: pd.DataFrame) -> str:

    today = date.today()
    week_start = today - timedelta(days=today.weekday())       # this Monday
    prev_start = week_start - timedelta(days=7)                # last Monday

    if df.empty:
        return "No events logged yet. Add some activities to get your weekly summary."

    df = df.copy()
    df["date_parsed"] = pd.to_datetime(df["date"]).dt.date

    this_week = df[df["date_parsed"] >= week_start]
    last_week = df[(df["date_parsed"] >= prev_start) & (df["date_parsed"] < week_start)]

    def week_stats(wdf):
        if wdf.empty:
            return {"events": 0, "hours": 0, "categories": {}}
        return {
            "events": len(wdf),
            "hours": round(wdf["duration_minutes"].sum() / 60, 1),
            "categories": wdf.groupby("category")["duration_minutes"].sum()
                            .apply(lambda m: round(m / 60, 1)).to_dict(),
        }

    tw = week_stats(this_week)
    lw = week_stats(last_week)

    prompt = f"""Write a 2-3 sentence weekly activity summary for a personal productivity app. Be specific with numbers, friendly in tone, and end with one short observation or encouragement.

This week (from {week_start}):
- Events logged: {tw['events']}
- Hours logged: {tw['hours']}h
- By category: {tw['categories'] or 'none yet'}

Last week:
- Events logged: {lw['events']}
- Hours logged: {lw['hours']}h
- By category: {lw['categories'] or 'none'}

Write only the summary paragraph. No headers, no bullet points."""

    return chat([{"role": "user", "content": prompt}], max_tokens=600)
