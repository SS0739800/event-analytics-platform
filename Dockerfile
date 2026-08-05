# Multi-stage: Node builds the React bundle, Python serves it alongside the API.
#
# Docker rather than Render's native Python runtime because the build needs
# BOTH toolchains, and a native Python service only guarantees Python. This
# also pins the Node and Python versions explicitly and works unchanged on
# Railway, Fly, or any other container host.

# ── Stage 1: build the frontend ──────────────────────────────────────────────
FROM node:20-alpine AS frontend

WORKDIR /app/frontend

# Copy manifests alone first so `npm ci` is cached until dependencies change.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python runtime ──────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Every dependency ships manylinux wheels (pandas, Pillow, bcrypt, reportlab),
# so no compiler is needed in the final image.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY run_web.py .

# app.py resolves FRONTEND_DIST as <repo root>/frontend/dist, which is /app
# here. Keep this path in step with src/web/app.py if that ever moves.
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Don't run as root.
RUN useradd --create-home --shell /bin/false appuser && chown -R appuser /app
USER appuser

# Must match the port gunicorn actually binds below. Render injects PORT=10000
# and routes to the EXPOSEd port, so a mismatch makes its edge return
# "x-render-routing: no-server" even though the container is healthy and
# gunicorn logs "Listening at: http://0.0.0.0:10000". 10000 is Render's
# default, so this agrees with the platform whether PORT is set or not.
EXPOSE 10000

# --workers 1 is REQUIRED, not a tuning choice, until src/db/pending.py is the
#   only pending-registration store — which it now is, so this is free to raise.
#   Kept at 1 as a conservative default for the free tier's 512 MB.
# --threads 8 handles concurrency within the single process.
# --timeout 120 because the Groq-backed routes (/api/insights,
#   /api/weekly-summary) can exceed gunicorn's 30s default and would otherwise
#   be killed mid-request and surface as a 502.
CMD ["sh", "-c", "gunicorn --workers 1 --threads 8 --timeout 120 --bind 0.0.0.0:${PORT:-10000} src.web.app:app"]
