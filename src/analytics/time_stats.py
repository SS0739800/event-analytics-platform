import pandas as pd


class TimeStats:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.df["hour"] = pd.to_datetime(self.df["start_time"], format="%H:%M").dt.hour
        self.df["day_of_week"] = pd.to_datetime(self.df["date"]).dt.day_name()
        self.df["month"] = pd.to_datetime(self.df["date"]).dt.month_name()

    def busiest_hours(self) -> dict[int, int]:
        return self.df["hour"].value_counts().sort_index().to_dict()

    def busiest_days(self) -> dict[str, int]:
        order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        counts = self.df["day_of_week"].value_counts()
        return {day: int(counts.get(day, 0)) for day in order if day in counts}

    def busiest_months(self) -> dict[str, int]:
        return self.df["month"].value_counts().to_dict()

    def total_hours_per_day(self) -> dict[str, float]:
        daily = self.df.groupby("date")["duration_minutes"].sum() / 60
        return {str(k): round(v, 2) for k, v in daily.items()}
