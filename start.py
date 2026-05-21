import subprocess
import sys
import os

root = os.path.dirname(os.path.abspath(__file__))

flask = subprocess.Popen([sys.executable, "run_web.py"], cwd=root)
vite  = subprocess.Popen(["npm", "run", "dev"], cwd=os.path.join(root, "frontend"), shell=True)

try:
    flask.wait()
    vite.wait()
except KeyboardInterrupt:
    flask.terminate()
    vite.terminate()
