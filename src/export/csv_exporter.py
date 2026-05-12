import pandas as pd
from pathlib import Path


class CSVExporter:
    def __init__(self, df: pd.DataFrame):
        self.df = df

    def export(self, filepath: str) -> str:
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.df.to_csv(path, index=False)
        return str(path)

    def export_summary(self, summary: dict, filepath: str) -> str:
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(list(summary.items()), columns=["Metric", "Value"]).to_csv(path, index=False)
        return str(path)
