import io
import base64
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd


def _fig_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def line_graph(
    data: dict,
    title: str,
    xlabel: str,
    ylabel: str,
    color: str = "darkorange",
) -> str:
    fig, ax = plt.subplots(figsize=(9, 5))
    keys = [str(k) for k in data.keys()]
    values = list(data.values())
    ax.plot(keys, values, marker="o", color=color, linewidth=2)
    ax.fill_between(keys, values, alpha=0.1, color=color)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    return _fig_to_base64(fig)


def multi_line_graph(df: pd.DataFrame, title: str, xlabel: str, ylabel: str) -> str:
    fig, ax = plt.subplots(figsize=(10, 6))
    for col in df.columns:
        ax.plot(df.index.astype(str), df[col], marker="o", linewidth=2, label=col)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.legend()
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    return _fig_to_base64(fig)


def hour_bar(busiest_hours: dict, title: str = "Events by Hour of Day") -> str:
    fig, ax = plt.subplots(figsize=(10, 3))
    hours = list(range(24))
    counts = [busiest_hours.get(h, 0) for h in hours]
    ax.bar(hours, counts, color="coral")
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_xlabel("Hour of Day")
    ax.set_ylabel("Event Count")
    ax.set_xticks(hours)
    plt.tight_layout()
    return _fig_to_base64(fig)
