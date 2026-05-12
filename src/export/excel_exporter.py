import pandas as pd
from pathlib import Path


class ExcelExporter:
    def __init__(self, df: pd.DataFrame):
        self.df = df

    def export(self, filepath: str, analytics: dict | None = None) -> str:
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            self.df.to_excel(writer, sheet_name="Events", index=False)
            if analytics:
                for sheet_name, data in analytics.items():
                    sheet_df = pd.DataFrame(list(data.items()), columns=["Category", "Value"])
                    sheet_df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
        return str(path)
