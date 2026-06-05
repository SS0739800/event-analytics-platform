import pandas as pd


class SubjectStats:
    def __init__(self, df: pd.DataFrame):
        self.df = df

    def events_by_category(self) -> dict[str, int]:
        return self.df["category"].value_counts().to_dict()

    def duration_by_category(self) -> dict[str, int]:
        return self.df.groupby("category")["duration_minutes"].sum().to_dict()

    def average_duration_by_category(self) -> dict[str, float]:
        return self.df.groupby("category")["duration_minutes"].mean().round(1).to_dict()
