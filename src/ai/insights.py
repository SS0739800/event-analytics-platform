import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()


def generate_insights(summary: dict) -> str:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    cat_lines = "\n".join(
        f"  - {cat}: {count} events"
        for cat, count in summary["category_breakdown"].items()
    )

    prompt = f"""You are a personal productivity analyst. Based on this user's activity data, write 3-4 concise, actionable insights in a friendly and encouraging tone. Be specific with numbers. Focus on patterns, balance, and one concrete recommendation.

Activity summary:
- Total events: {summary['total_events']}
- Total hours logged: {summary['total_hours']}h
- Number of categories: {summary['categories']}
- Breakdown by category:
{cat_lines}
- Busiest day of the week: {summary['busiest_day']}
- Peak activity hour: {summary['busiest_hour']}

Format: 3-4 bullet points, each 1-2 sentences. No headers, no intro sentence."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content.strip()
