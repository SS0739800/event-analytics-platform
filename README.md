# EventAnalytics Platform

A full-stack personal activity analytics platform. Log events, explore interactive charts, get AI-generated productivity insights, manage your schedule on a calendar, and add recurring events using natural language.

---

## Features

| Feature | Description |
|---|---|
| **Analytics Dashboard** | Charts across categories, time-of-day, day-of-week, and monthly trends |
| **AI Insights** | LLM-generated productivity analysis based on your activity patterns |
| **Smart Event Entry** | Describe events in plain text — AI parses them into structured data |
| **Bulk / Series Events** | Create recurring events across a date range in one shot |
| **Calendar View** | Monthly calendar with event chips, day detail panel, and query filters |
| **Event Query** | Filter events by date range, time range, and category |
| **Conflict Detection** | Prevents overlapping events; offers Skip or Replace resolution |
| **Series Deletion** | Delete a single event or its entire series with one click |
| **Export** | Download your data as CSV, Excel, or PDF |
| **MFA Authentication** | Mandatory TOTP two-factor authentication via any authenticator app |

---

## Tech Stack

**Backend**
- Python 3.11+ / Flask 3
- Supabase (PostgreSQL) — database only, custom auth
- bcrypt — password hashing
- PyJWT — session tokens
- pyotp + qrcode — TOTP / MFA
- Groq API (Llama 3) — AI features
- pandas — analytics
- ReportLab + openpyxl — PDF / Excel export

**Frontend**
- React 19 + Vite
- react-router-dom v7
- Recharts — interactive charts
- Plain CSS (no UI framework)

---

## Project Structure

```
event-analytics-platform/
├── src/
│   ├── ai/
│   │   ├── insights.py        # AI productivity analysis
│   │   └── parser.py          # Natural language → event parser
│   ├── analytics/
│   │   ├── subject_stats.py   # Category-level stats
│   │   ├── time_stats.py      # Hour/day/month breakdown
│   │   └── trends.py          # Monthly trend data
│   ├── auth/
│   │   ├── password.py        # bcrypt helpers
│   │   ├── tokens.py          # JWT create/verify
│   │   └── totp.py            # TOTP + QR code
│   ├── db/
│   │   ├── client.py          # Supabase client singleton
│   │   ├── events.py          # Event CRUD + overlap check
│   │   ├── profiles.py        # User profile helpers
│   │   └── migrations/
│   │       ├── 001_schema.sql      # Events table + CRUD functions
│   │       ├── 003_custom_auth.sql # Profiles table (custom auth)
│   │       └── 004_series.sql      # series_id column + delete series
│   ├── export/
│   │   ├── excel_exporter.py
│   │   └── pdf_exporter.py
│   └── web/
│       └── app.py             # Flask routes
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AIInsightsCard.jsx
│       │   ├── AIParseModal.jsx
│       │   ├── BulkPreviewModal.jsx
│       │   ├── CategoryCharts.jsx
│       │   ├── EventModal.jsx
│       │   ├── EventsTable.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── StatCard.jsx
│       │   ├── TimeCharts.jsx
│       │   ├── TopEventsTable.jsx
│       │   └── TrendChart.jsx
│       ├── lib/
│       │   └── api.js          # Fetch wrapper + token helpers
│       ├── pages/
│       │   ├── CalendarPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── LandingPage.jsx
│       │   ├── LoginPage.jsx
│       │   └── RegisterPage.jsx
│       ├── App.jsx
│       └── index.css
├── run_web.py
├── start.bat
├── requirements.txt
└── .env
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Groq](https://console.groq.com) API key (free tier, no credit card)

---

## Setup

### 1. Clone and create a virtual environment

```bash
git clone <repo-url>
cd event-analytics-platform
python -m venv venv
```

### 2. Install Python dependencies

```bash
# Windows
venv\Scripts\pip install -r requirements.txt

# macOS / Linux
venv/bin/pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-random-secret-string
GROQ_API_KEY=gsk_your-groq-key
```

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Project Settings → API → `service_role` key |
| `JWT_SECRET` | Any long random string (e.g. `openssl rand -hex 32`) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys |

> **Security:** Never expose `SUPABASE_SERVICE_KEY` or `JWT_SECRET` in the frontend. They live only in `.env` and are used exclusively by the Flask backend.

### 5. Run database migrations

Open your Supabase project → **SQL Editor** → **New query**, then run each migration file in order:

1. `src/db/migrations/001_schema.sql` — events table and CRUD stored functions
2. `src/db/migrations/003_custom_auth.sql` — custom profiles table (replaces Supabase Auth)
3. `src/db/migrations/004_series.sql` — adds `series_id` for recurring events

Run them **in order**. Each file is idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`).

---

## Running the App

### Development (two terminals)

**Terminal 1 — Flask backend:**
```bash
# Windows
venv\Scripts\python run_web.py

# macOS / Linux
venv/bin/python run_web.py
```
Flask starts on `http://localhost:5000`

**Terminal 2 — React frontend:**
```bash
cd frontend
npm run dev
```
Vite starts on `http://localhost:5173`

Then open **http://localhost:5173** in your browser.

### One-command startup (Windows only)

```bash
start.bat
```

This kills any existing Python/Node processes, starts Flask in one terminal window and Vite in another.

---

## Authentication Flow

Registration and login use fully custom auth — no Supabase Auth is involved.

```
Register:
  POST /auth/register        → validates email, hashes password, generates TOTP secret, returns QR code
  POST /auth/register/verify → verifies TOTP code, creates profile in DB, returns JWT

Login:
  POST /auth/login           → verifies bcrypt password, returns user_id
  POST /auth/login/verify    → verifies TOTP code, returns JWT
```

The JWT is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every API request. It expires after 7 days.

MFA is **mandatory** — every account requires a TOTP authenticator (Google Authenticator, Authy, 1Password, etc.).

---

## API Reference

All `/api/*` routes require `Authorization: Bearer <token>`.

### Events

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/events` | All events for the authenticated user |
| `POST` | `/api/events` | Create a single event |
| `PUT` | `/api/events/:id` | Update an event |
| `DELETE` | `/api/events/:id` | Delete a single event |
| `DELETE` | `/api/events/series/:series_id` | Delete all events in a series |
| `POST` | `/api/events/bulk` | Create multiple events |
| `POST` | `/api/events/validate-bulk` | Validate a list of events for conflicts before creating |

### AI

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/parse-event` | Parse natural language into one or more structured events |
| `GET` | `/api/insights` | Generate AI productivity insights from the user's data |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stats` | Summary stats (total events, hours, categories, avg duration) |
| `GET` | `/api/category-stats` | Per-category breakdowns |
| `GET` | `/api/time-stats` | Hourly, daily, and monthly distributions |
| `GET` | `/api/trends` | Monthly event count, duration, and category trends |

### Export

| Method | Path | Description |
|---|---|---|
| `GET` | `/export/csv` | Download events as CSV |
| `GET` | `/export/excel` | Download events + analytics as Excel workbook |
| `GET` | `/export/pdf` | Download analytics summary as PDF |

---

## Conflict Detection

The platform prevents overlapping events automatically:

- **Individual events:** saving an event that overlaps an existing one returns a `409` with the conflicting event's name and time. The form offers **Keep existing** or **Replace** (deletes the old event and saves the new one).
- **Bulk events:** before confirming creation, every event is validated against existing DB events and against other events in the same batch. Conflicts are highlighted in red with per-row **Skip** and **Replace** resolution buttons.

---

## AI Features

Both AI features use [Groq](https://groq.com) with Llama models — free tier is sufficient for personal use.

**Smart Event Entry**
Type anything like:
- `"Gym legs day tomorrow 7–8am"`
- `"Cooking class every Friday in June at 5pm for 90 minutes"`

The LLM detects whether it's a single event or a recurring series and returns structured JSON. Single events open in the edit form for review; series events show a preview table before creation.

**AI Insights**
Generates 3–4 bullet-point productivity insights analysing your category distribution, busiest day/hour, and total hours logged. Powered by `llama-3.3-70b-versatile`.

---

## Environment Notes

- `use_reloader=False` is set in `run_web.py` to prevent Flask's dev reloader from wiping the in-memory pending-registration store between requests.
- The Supabase `service_role` key bypasses Row Level Security — it must never appear in frontend code.
- TOTP uses `valid_window=4` (±2 minutes) to tolerate clock drift on Windows.
