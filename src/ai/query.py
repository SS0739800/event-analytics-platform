import os
import pandas as pd
from groq import Groq
from dotenv import load_dotenv

load_dotenv()


def answer_query(question: str, df: pd.DataFrame) -> str:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    if df.empty:
        return "You have no events logged yet. Add some events to start asking questions about your data."

    # Build a compact data context
    total = len(df)
    total_hours = round(df["duration_minutes"].sum() / 60, 1)
    date_min = str(df["date"].min())[:10]
    date_max = str(df["date"].max())[:10]

    cat_summary = df.groupby("category").agg(
        events=("id", "count"),
        hours=("duration_minutes", lambda x: round(x.sum() / 60, 1))
    ).reset_index().to_string(index=False)

    monthly = df.copy()
    monthly["month"] = pd.to_datetime(df["date"]).dt.to_period("M").astype(str)
    monthly_summary = monthly.groupby("month").agg(
        events=("id", "count"),
        hours=("duration_minutes", lambda x: round(x.sum() / 60, 1))
    ).reset_index().to_string(index=False)

    # Include individual events (cap at 300 to stay within token limits)
    events_cols = ["date", "title", "category", "start_time", "end_time", "duration_minutes"]
    available = [c for c in events_cols if c in df.columns]
    events_csv = df[available].sort_values("date").tail(300).to_csv(index=False)

    context = f"""User activity data:
- Total events: {total}
- Total hours: {total_hours}h
- Date range: {date_min} to {date_max}

Category breakdown:
{cat_summary}

Monthly breakdown:
{monthly_summary}

Individual events (most recent 300):
{events_csv}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=400,
        messages=[
            {
                "role": "system",
                "content": "You are a personal analytics assistant. Answer questions about the user's activity data concisely and accurately using the data provided. If the answer requires a calculation, show the result. If the data doesn't contain enough information to answer, say so clearly."
            },
            {
                "role": "user",
                "content": f"Data:\n{context}\n\nQuestion: {question}"
            }
        ],
    )
    return response.choices[0].message.content.strip()
