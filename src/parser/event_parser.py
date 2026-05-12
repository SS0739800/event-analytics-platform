import pandas as pd
from pathlib import Path
from src.models.event import Event


class EventParser:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        self._df: pd.DataFrame | None = None

    def load(self) -> "EventParser":
        self._df = pd.read_csv(self.filepath, parse_dates=["date"])
        return self

    @property
    def dataframe(self) -> pd.DataFrame:
        if self._df is None:
            self.load()
        return self._df

    def parse(self) -> list[Event]:
        return [
            Event(
                id=int(row["id"]),
                title=row["title"],
                category=row["category"],
                start_time=row["start_time"],
                end_time=row["end_time"],
                duration_minutes=int(row["duration_minutes"]),
                date=row["date"].date(),
            )
            for _, row in self.dataframe.iterrows()
        ]
