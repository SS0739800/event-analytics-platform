import json
import os
from datetime import date

from groq import Groq
from dotenv import load_dotenv

load_dotenv()


def parse_event_smart(text: str) -> list[dict]:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    today = date.today().isoformat()

    prompt = f"""You are a calendar event extractor. The input may describe a single event or recurring/multiple events — figure it out from context.

Today's date: {today}
Input: "{text}"

Return ONLY a valid JSON array — no explanation, no markdown, no code blocks.

Each element must have this exact structure:
{{
  "title": "event title",
  "category": "one of: Academics, Gym, Sports, Cooking, Recreation",
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
- Always pick the closest category from the allowed list
- Always return a JSON array: [{{...}}] for one event, [{{...}}, {{...}}, ...] for many"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.choices[0].message.content.strip()
    start = raw.find("[")
    end = raw.rfind("]") + 1
    return json.loads(raw[start:end])
