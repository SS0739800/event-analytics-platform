import io
import base64
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def _fig_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def bar_chart(
    data: dict,
    title: str,
    xlabel: str,
    ylabel: str,
    color: str = "steelblue",
) -> str:
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar(list(data.keys()), list(data.values()), color=color)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    return _fig_to_base64(fig)


def pie_chart(data: dict, title: str) -> str:
    fig, ax = plt.subplots(figsize=(7, 7))
    ax.pie(
        list(data.values()),
        labels=list(data.keys()),
        autopct="%1.1f%%",
        startangle=140,
    )
    ax.set_title(title, fontsize=14, fontweight="bold")
    plt.tight_layout()
    return _fig_to_base64(fig)


def save_bar_chart(
    data: dict,
    title: str,
    xlabel: str,
    ylabel: str,
    filepath: str,
    color: str = "steelblue",
) -> None:
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar(list(data.keys()), list(data.values()), color=color)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    fig.savefig(filepath, dpi=100)
    plt.close(fig)
