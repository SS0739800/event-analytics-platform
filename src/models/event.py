from dataclasses import dataclass
from datetime import date


@dataclass
class Event:
    id: int
    title: str
    category: str
    start_time: str
    end_time: str
    duration_minutes: int
    date: date
