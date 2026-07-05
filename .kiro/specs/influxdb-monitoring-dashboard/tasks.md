# Implementation Plan: InfluxDB Time-Series Monitoring Dashboard

## Overview

Day 1: Docker Compose + InfluxDB + FastAPI backend + data generator.
Day 2: React frontend (3 pages) + README + polish.

Everything is intentionally small. No SQLite, no ORM, no custom hooks, no shared component library. Three frontend pages. Four backend endpoints.

---

## Tasks

- [x] 1. Project scaffolding
  - Create `docker-compose.yml` with three services: `influxdb` (influxdb:3-core, port 8181, file object-store volume, healthcheck on `/health`), `backend` (port 8000, depends on influxdb healthy), `frontend` (port 5173, depends on backend)
  - Create `.env.example` with placeholder values: `INFLUXDB_URL=http://influxdb:8181`, `INFLUXDB_TOKEN=your-token-here`, `INFLUXDB_DATABASE=monitoring`, `VITE_API_BASE_URL=http://localhost:8000`
  - Create `.gitignore` including `.env`, `__pycache__/`, `*.pyc`, `node_modules/`, `dist/`
  - Create `README.md` skeleton (fill in content in task 9)
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Backend scaffold
  - Create `backend/Dockerfile`: `python:3.12-slim`, copies `requirements.txt` then `app/` and `config/`, runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`
  - Create `backend/requirements.txt` with pinned versions: `fastapi`, `uvicorn[standard]`, `pydantic-settings`, `httpx`
  - Create `backend/config/thresholds.json` with hardcoded thresholds for all 4 metrics:
    ```json
    [
      { "metric": "cpu_usage",    "warning_high": 80,  "critical_high": 95  },
      { "metric": "memory_usage", "warning_high": 75,  "critical_high": 90  },
      { "metric": "temperature",  "warning_high": 70,  "critical_high": 85  },
      { "metric": "disk_io",      "warning_high": 200, "critical_high": 400 }
    ]
    ```
  - Create `backend/app/__init__.py`, `backend/app/config.py`, `backend/app/influx.py`, `backend/app/main.py`, `backend/app/routers/__init__.py`, `backend/app/routers/health.py`, `backend/app/routers/metrics.py`
  - _Requirements: 1.4, 3.8, 5.1_

- [x] 3. Backend core: config and InfluxDB helpers
  - Implement `app/config.py`: `pydantic-settings` `BaseSettings` reading `INFLUXDB_URL`, `INFLUXDB_TOKEN`, `INFLUXDB_DATABASE` from env; expose `get_settings()` lru_cache dependency
  - Implement `app/influx.py` with three async functions using `httpx.AsyncClient`:
    - `ping(settings) -> bool`: GET `{INFLUXDB_URL}/health`; return `False` (never raise) on any exception
    - `query_sql(sql: str, params: dict, settings) -> list[dict]`: POST `{INFLUXDB_URL}/api/v3/query_sql` with `{"q": sql, "params": params, "format": "json"}`; raise HTTP 503 on non-2xx or network error
    - `write_lp(lp: str, settings) -> None`: POST `{INFLUXDB_URL}/api/v3/write_lp?db={database}`; raise HTTP 503 on non-2xx
  - All requests include `Authorization: Token {token}` header — token read from settings, never returned in any response
  - _Requirements: 3.7, 3.8_

- [x] 4. Backend: health and metrics routers
  - Implement `app/main.py`: create FastAPI app, configure CORS (allow all origins for prototype), load `config/thresholds.json` into `app.state.thresholds` on startup, register both routers with `/api` prefix
  - Implement `routers/health.py` — `GET /api/health`:
    - Call `influx.ping()`
    - Return `{ "status": "ok", "influxdb_connected": true, "timestamp": <UTC ISO 8601> }` if connected
    - Return `{ "status": "degraded", "influxdb_connected": false }` if not — always HTTP 200
  - Implement `routers/metrics.py` — three endpoints:
    - `GET /api/metrics/summary`: accept optional `source_id[]`, `metric[]`, `start`, `end`; run parameterized `SELECT source_id, metric, LAST(value) AS current, AVG(value) AS avg, MIN(value) AS min, MAX(value) AS max, COUNT(*) AS count FROM device_metrics WHERE ...` via `influx.query_sql()`; compute `status` per row in Python against `request.app.state.thresholds`; return `SummaryItem[]`
    - `GET /api/metrics/timeseries`: require `start`, `end`, `interval` (return 422 if missing); run `DATE_BIN` query; return `TimeseriesItem[]`
    - `GET /api/metrics/latest`: optional `limit` (default 10, cap at 100); `ORDER BY time DESC LIMIT $limit`; return `LatestItem[]`
  - All filter values use `$param` parameterized syntax — no string interpolation into SQL
  - _Requirements: 3.1–3.8_

- [ ] 5. Checkpoint — backend smoke test
  - Run `docker compose up influxdb backend` and verify:
    - `GET http://localhost:8000/api/health` returns HTTP 200
    - `influxdb_connected` is `true` when InfluxDB container is healthy
    - `influxdb_connected` is `false` when InfluxDB container is stopped
  - Ask the user if questions arise before proceeding.

- [ ] 6. Data generator
  - Implement `ingestion/generate_and_load.py`:
    - Load `INFLUXDB_URL`, `INFLUXDB_TOKEN`, `INFLUXDB_DATABASE` from `.env` via `python-dotenv`
    - Define 3 sources: `server-01` (server), `server-02` (server), `sensor-01` (sensor)
    - Define 4 metrics with baselines and units: `cpu_usage` (%, baseline 40), `memory_usage` (%, baseline 55), `temperature` (celsius, baseline 45), `disk_io` (MB/s, baseline 120)
    - Generate 1-minute-resolution rows spanning 48 hours (≥ 2,880 rows per source×metric combination, ≥ 34,560 total)
    - Add Gaussian noise (`numpy` or `random.gauss`): ±5–10% of baseline per reading
    - Inject deliberate spikes: at hours 12, 24, and 36, push `cpu_usage` on `server-01` to 97 (critical) and `temperature` on `sensor-01` to 88 (critical)
    - Write in batches of 500 rows via `httpx` POST to `{INFLUXDB_URL}/api/v3/write_lp?db={database}` with `Authorization: Token {token}` header
    - After each batch, write a corresponding `ingestion_log` line-protocol entry with `method=generator`, `records_ingested`, `records_rejected=0`
    - On any non-2xx response from InfluxDB: print error body to stderr and `sys.exit(1)`
  - Create `ingestion/requirements.txt` with `httpx`, `python-dotenv`
  - _Requirements: 1.2, 1.3, 2.1–2.7_

- [ ] 7. Frontend scaffold
  - Create `frontend/Dockerfile`: `node:20-alpine`, `npm ci`, expose 5173, CMD `npm run dev -- --host 0.0.0.0`
  - Create `frontend/package.json` with exact versions: `react@18`, `react-dom@18`, `react-router-dom@6`, `recharts@2`; devDeps: `vite@5`, `@vitejs/plugin-react`, `typescript@5`, `@types/react@18`, `@types/react-dom@18`
  - Create `frontend/vite.config.ts`: React plugin; no proxy needed (VITE_API_BASE_URL is set as env var)
  - Create `frontend/tsconfig.json` with strict mode
  - Create `frontend/index.html` with `<div id="root">` and script tag
  - Create `frontend/src/types.ts` with interfaces: `HealthResponse`, `SummaryItem`, `TimeseriesItem`, `LatestItem` (as defined in design.md)
  - Create `frontend/src/api.ts`: simple typed `get<T>(path: string, params?: Record<string, string>) -> Promise<T>` function using `fetch`, throwing `Error` on non-2xx; base URL from `import.meta.env.VITE_API_BASE_URL`
  - _Requirements: 4.1, 4.13, 5.1_

- [ ] 8. Frontend: router, layout, and three pages
  - Implement `frontend/src/router.tsx`: `createBrowserRouter` with routes `/` → `StatusPage`, `/dashboard` → `DashboardPage`, `/explorer` → `ExplorerPage`; wrapped in a layout component that renders a `<nav>` with `<NavLink>` entries for all three routes
  - Implement `frontend/src/main.tsx`: mount `<RouterProvider router={router} />` to `#root`
  - Implement `frontend/src/pages/StatusPage.tsx`:
    - Fetch `GET /api/health` on mount with inline `useEffect` + `fetch`
    - Show loading spinner while fetching
    - Display two status badges (Backend: always green on load; InfluxDB: green if `influxdb_connected`, red otherwise) and the returned timestamp
    - Show error message + retry button on failure
    - _Requirements: 4.3, 4.10, 4.11_
  - Implement `frontend/src/pages/DashboardPage.tsx`:
    - State: `start`, `end` (default last 24h), loading, error
    - On mount and on time range change: fetch `GET /api/metrics/summary?start=...&end=...` and `GET /api/metrics/latest?limit=20` in parallel
    - Render `start`/`end` datetime inputs at the top
    - Render a card grid — one card per `SummaryItem` showing `source_id`, `metric`, `current`, `avg`, `min`, `max`; card border/background coloured by `status` (green=ok, amber=warning, red=critical)
    - Render a table below the cards showing the latest records (columns: time, source_id, metric, value, unit)
    - Loading/empty/error states per requirements 4.10–4.12
    - _Requirements: 4.4, 4.5, 4.6, 4.10, 4.11, 4.12_
  - Implement `frontend/src/pages/ExplorerPage.tsx`:
    - State: `sourceIds[]`, `metrics[]`, `start`, `end`, `interval` (default `5m`)
    - On mount: fetch distinct sources and metrics by calling `GET /api/metrics/summary` (no filters) to extract available values for filter dropdowns
    - Filter controls: multi-select for sources, multi-select for metrics, datetime inputs for start/end, select for interval (`5m`, `15m`, `1h`, `6h`, `1d`)
    - On any filter change: fetch `GET /api/metrics/timeseries` with current params
    - Render Recharts `<LineChart>` inside `<ResponsiveContainer>`: time on x-axis, `avg` on y-axis, one `<Line>` per `source_id`+`metric` combination with distinct colours
    - Render a data table below the chart with columns: time, source_id, metric, avg, min, max, count
    - Loading/empty/error states per requirements 4.10–4.12
    - _Requirements: 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

- [ ] 9. Documentation and final wiring
  - Complete `README.md` with:
    - One-paragraph project description
    - Architecture diagram (ASCII or Mermaid, matching design.md)
    - Prerequisites: Docker, Docker Compose, Python 3.12+
    - Step-by-step setup: clone repo → copy `.env.example` to `.env` → `docker compose up` → token generation command (`docker exec influxdb influxdb3 create token --admin`) → paste token into `.env` → restart backend → run generator
    - Generator usage: `cd ingestion && pip install -r requirements.txt && python generate_and_load.py`
    - URLs: frontend at `http://localhost:5173`, backend API docs at `http://localhost:8000/docs`
  - _Requirements: 5.5_

- [ ] 10. Final checkpoint — full stack integration
  - Run `docker compose up`, run the generator, then verify:
    - `GET http://localhost:8000/api/health` returns `influxdb_connected: true`
    - Dashboard page shows summary cards with at least one `warning` or `critical` status (from generator spikes)
    - Explorer page renders a line chart with multiple series
    - Time range filter on Dashboard re-fetches and updates cards
    - Interval change on Explorer re-fetches and re-renders chart
  - Ask the user if questions arise before finishing.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3"] },
    { "id": 2, "tasks": ["4"] },
    { "id": 3, "tasks": ["5"] },
    { "id": 4, "tasks": ["6", "7"] },
    { "id": 5, "tasks": ["8"] },
    { "id": 6, "tasks": ["9"] },
    { "id": 7, "tasks": ["10"] }
  ]
}
```
