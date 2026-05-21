import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.web.app import app

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
