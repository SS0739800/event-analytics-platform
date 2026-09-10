import json
from datetime import date

from src.ai.client import chat


def parse_event_smart(text: str, categories: list[str] = None) -> list[dict]:
    today = date.today().isoformat()
    cat_list = ", ".join(categories) if categories else "Academics, Gym, Sports, Cooking, Recreation"

    prompt = f"""You are a calendar event extractor. The input may describe a single event or recurring/multiple events — figure it out from context.

Today's date: {today}
Input: "{text}"

Return ONLY a valid JSON array — no explanation, no markdown, no code blocks.

Each element must have this exact structure:
{{
  "title": "event title",
  "category": "one of: {cat_list}",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "duration_minutes": number
}}

Rules:
- Single event → return an array with one object
- Recurring or multiple events → return one object per occurrence (e.g. "every Monday in June" = one object per Monday)
- If no date mentioned, use today ({today})
- If no date range given for recurring, generate for the next 4 weeks
- If end time not mentioned, estimate: gym=1h, class=1.5h, cooking=45min, sports=1.5h, recreation=1h
- duration_minutes must equal end minus start in minutes
- Always pick the closest category from: {cat_list}
- Always return a JSON array: [{{...}}] for one event, [{{...}}, {{...}}, ...] for many"""

    raw = chat([{"role": "user", "content": prompt}], max_tokens=4000)
    start = raw.find("[")
    end = raw.rfind("]") + 1
    if start == -1 or end == 0 or end <= start:
        raise ValueError(f"No valid JSON array in response: {raw[:200]}")
    return json.loads(raw[start:end])
