import pandas as pd


class Trends:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.df["date"] = pd.to_datetime(self.df["date"])
        self.df["month"] = self.df["date"].dt.to_period("M").astype(str)

    def monthly_event_count(self) -> dict[str, int]:
        return self.df.groupby("month").size().to_dict()

    def monthly_duration(self) -> dict[str, int]:
        return self.df.groupby("month")["duration_minutes"].sum().to_dict()

    def category_trend_by_month(self) -> pd.DataFrame:
        return self.df.groupby(["month", "category"]).size().unstack(fill_value=0)
