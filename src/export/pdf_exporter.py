import datetime
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class PDFExporter:
    def __init__(self, analytics: dict):
        self.analytics = analytics

    def export(self, filepath: str) -> str:
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)

        doc = SimpleDocTemplate(str(path), pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("Event Analytics Report", styles["Title"]))
        story.append(Spacer(1, 0.2 * inch))
        story.append(
            Paragraph(
                f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}",
                styles["Normal"],
            )
        )
        story.append(Spacer(1, 0.3 * inch))

        for section, data in self.analytics.items():
            story.append(Paragraph(section, styles["Heading2"]))
            story.append(Spacer(1, 0.1 * inch))

            if isinstance(data, dict):
                table_data = [["Category", "Value"]] + [
                    [str(k), str(v)] for k, v in data.items()
                ]
                table = Table(table_data, colWidths=[3 * inch, 2 * inch])
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            (
                                "ROWBACKGROUNDS",
                                (0, 1),
                                (-1, -1),
                                [colors.white, colors.HexColor("#f2f2f2")],
                            ),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                            ("PADDING", (0, 0), (-1, -1), 6),
                        ]
                    )
                )
                story.append(table)
            else:
                story.append(Paragraph(str(data), styles["Normal"]))

            story.append(Spacer(1, 0.3 * inch))

        doc.build(story)
        return str(path)
