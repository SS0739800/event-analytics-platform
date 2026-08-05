"""Local development entrypoint.

Production runs gunicorn against src.web.app:app directly (see Dockerfile) —
Flask's built-in server is not suitable for public hosting.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.web.app import app

if __name__ == "__main__":
    # Debug is opt-in via FLASK_DEBUG=1. The Werkzeug debugger it enables
    # exposes an interactive Python console and full tracebacks, so it must
    # never be on for a deployed app.
    debug = os.environ.get("FLASK_DEBUG") == "1"

    # The reloader used to be disabled unconditionally because pending
    # registrations lived in a module-level dict that a restart would wipe
    # mid-flow. They're in Postgres now (src/db/pending.py), so auto-reload
    # is safe again.
    app.run(debug=debug, use_reloader=debug)
