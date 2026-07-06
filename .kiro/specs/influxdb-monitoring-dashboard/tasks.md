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
  - Create `README.md` skeleton (fill in content in task 10)
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

- [ ] 5. Backend gap fills and new routers
  - [ ] 5.1 Update `routers/health.py` to include `database` and `latest_ingested_at` fields
    - Add `database` field from `settings.influxdb_database` to the health response
    - Add `latest_ingested_at` field: run `SELECT MAX(time) AS latest FROM device_metrics` via `query_sql()`; format result as ISO 8601 UTC string; return `null` if InfluxDB unreachable or table empty
    - If InfluxDB is unreachable, return `latest_ingested_at: null` alongside `influxdb_connected: false` — never raise
    - _Requirements: 6.1_
  - [ ] 5.2 Update `routers/metrics.py` to add `unit`/`status` to timeseries and add `/list` and `/detail` endpoints
    - Update `GET /api/metrics/timeseries`: after the `DATE_BIN` query, run a second `selector_last(unit, time)['unit']` query grouped by `source_id, metric` for the same range; attach `unit` and compute `status` via `compute_status()` per row; return enriched `TimeseriesItem[]`
    - Add `GET /api/metrics/list`: run `SELECT DISTINCT source_id FROM device_metrics` and `SELECT DISTINCT metric FROM device_metrics`; return `{ sources: [...], metrics: [...] }`
    - Add `GET /api/metrics/detail`: accept required `source_id` and `metric` query params (422 if missing), optional `start`, `end`, `interval` (default `5m`); run the summary SQL with added `source_id = $source_id AND metric = $metric` filters; run the timeseries SQL with the same filters; return `{ summary: SummaryItem, timeseries: TimeseriesItem[] }`
    - _Requirements: 11.6, 12.3, 13.4_
  - [ ] 5.3 Create `backend/config/sources.json` with content `[]`
    - _Requirements: 9.3_
  - [ ] 5.4 Create `routers/ingestion.py` with two GET endpoints
    - `GET /api/ingestion/summary`: query `ingestion_log WHERE records_ingested > 0 ORDER BY time DESC LIMIT 1`; return `{ latest_success_at, last_batch_records, last_batch_source, last_batch_method }` — all null if no rows
    - `GET /api/ingestion/errors`: query `ingestion_log WHERE error_message IS NOT NULL AND error_message != '' ORDER BY time DESC LIMIT 20`; return array of `{ time, source_id, method, records_rejected, error_message }`
    - _Requirements: 8.3, 8.4_
  - [ ] 5.5 Create `routers/sources.py` with GET, POST, and PUT endpoints
    - `GET /api/sources`: run `SELECT source_id, source_type, MAX(time) AS latest_at, COUNT(*) AS record_count FROM device_metrics GROUP BY source_id, source_type`; merge with `sources.json` overrides (`display_name`, `source_type` override, `active`); default `display_name=source_id`, `active=true`; return `SourceItem[]`
    - `POST /api/sources`: validate required fields `source_id`, `display_name`, `source_type` (422 if missing/empty); return 409 if `source_id` already exists in `sources.json`; append entry and write back; return created entry with HTTP 201
    - `PUT /api/sources/{source_id}`: accept optional `display_name`, `source_type`, `active`; update matching entry in `sources.json` or create if not found; write back; return updated entry
    - Use read-modify-write pattern for all `sources.json` mutations
    - _Requirements: 9.3, 9.4, 9.5_
  - [ ] 5.6 Create `routers/thresholds.py` with GET and PUT endpoints
    - `GET /api/thresholds`: return `app.state.thresholds` as a JSON array
    - `PUT /api/thresholds/{metric}`: accept optional `warning_high` and `critical_high`; apply updates; enforce `warning_high < critical_high` (422 with descriptive message if violated); 404 if metric not in `thresholds.json`; write updated entry to `thresholds.json`; reload `app.state.thresholds`; return updated entry
    - _Requirements: 10.3, 10.4, 10.5_
  - [ ] 5.7 Create `routers/ingest.py` with manual and batch POST endpoints
    - `POST /api/ingest/manual`: validate required fields `source_id`, `metric`, `value` (numeric), `unit` (non-empty string), optional `timestamp` (ISO 8601, defaults to server UTC now), optional `tags` object; build device_metrics line protocol row; `write_lp()` for device_metrics; `write_lp()` for ingestion_log row (method=manual, records_ingested=1); return `{ ok: true }`; return 422 with descriptive `detail` on validation failure
    - `POST /api/ingest/batch`: accept multipart CSV file; parse header + data rows; validate each row (required cols: `timestamp`, `source_id`, `metric`, `value`, `unit`; reject rows with missing cols, non-numeric value, or unparseable timestamp); write all valid rows in one `write_lp()` batch; write one `ingestion_log` entry (method=manual, records_ingested=N, records_rejected=M); return `{ records_ingested, records_rejected, errors[] }` — HTTP 200 even if all rows rejected
    - _Requirements: 12.6, 12.8_
  - [ ] 5.8 Add `python-multipart` to `backend/requirements.txt`
    - _Requirements: 12.8_
  - [ ] 5.9 Register all new routers in `main.py` and load `sources.json` at startup
    - Import and register `ingestion`, `sources`, `thresholds`, `ingest` routers with `/api` prefix
    - In `lifespan`: load `config/sources.json` into `app.state.sources` at startup alongside `app.state.thresholds`
    - _Requirements: 8.3, 9.3, 10.3, 12.6_

- [ ] 6. Data generator
  - [ ] 6.1 Implement `ingestion/generate_and_load.py`
    - Load `INFLUXDB_URL`, `INFLUXDB_TOKEN`, `INFLUXDB_DATABASE` from `.env` via `python-dotenv`
    - Define 3 sources: `server-01` (server), `server-02` (server), `sensor-01` (sensor)
    - Define 4 metrics with baselines and units: `cpu_usage` (%, baseline 40), `memory_usage` (%, baseline 55), `temperature` (celsius, baseline 45), `disk_io` (MB/s, baseline 120)
    - Generate 1-minute-resolution rows spanning 48 hours (≥ 2,880 rows per source×metric combination, ≥ 34,560 total)
    - Add Gaussian noise (`random.gauss`): ±5–10% of baseline per reading
    - Inject deliberate spikes at hours 12, 24, and 36: `cpu_usage` on `server-01` → 97 (critical), `temperature` on `sensor-01` → 88 (critical)
    - Write in batches of 500 rows via `httpx` POST to `{INFLUXDB_URL}/api/v3/write_lp?db={database}` with `Authorization: Token {token}` header
    - After each batch, write a corresponding `ingestion_log` line-protocol entry with `method=generator`, `records_ingested`, `records_rejected=0`
    - On any non-2xx response: print error body to stderr and `sys.exit(1)`
    - _Requirements: 2.1–2.7_
  - [ ] 6.2 Create `ingestion/requirements.txt` with `httpx`, `python-dotenv`
    - _Requirements: 2.1_

- [ ] 7. Frontend scaffold and base page updates
  - [ ] 7.1 Verify `frontend/` scaffold is complete
    - Confirm `Dockerfile`, `package.json` (react@18, react-router-dom@6, recharts@2), `vite.config.ts`, `tsconfig.json`, `index.html` all exist and are correct
    - _Requirements: 4.1, 5.1_
  - [ ] 7.2 Update `frontend/src/types.ts` with all new interfaces
    - Extend `HealthResponse` to add `database: string` and `latest_ingested_at: string | null`
    - Extend `TimeseriesItem` to add `unit?: string` and `status?: string`
    - Add `IngestionSummary`, `IngestionError`, `SourceItem`, `ThresholdItem`, `IngestResult`, `DetailResponse`, `MetricsList`
    - _Requirements: 6.2, 8.5, 9.6, 10.6, 11.8, 12.4, 13.3_
  - [ ] 7.3 Update `frontend/src/router.tsx` to add all new routes and nav links
    - Add routes: `/ingestion` → `IngestionPage`, `/sources` → `SourcesPage`, `/thresholds` → `ThresholdsPage`, `/history` → `HistoryPage`, `/ingest` → `IngestPage`, `/detail/:source_id/:metric` → `DetailPage`, `/report` → `ReportPage`
    - Update nav bar with `<NavLink>` entries for all pages: Status, Dashboard, Explorer, Ingestion, Sources, Thresholds, History, Ingest, Report
    - _Requirements: 8.1, 8.2, 9.1, 9.2, 10.1, 10.2, 11.1, 11.2, 12.1, 12.2, 13.1, 14.1, 14.2_
  - [ ] 7.4 Update `frontend/src/pages/StatusPage.tsx` to display new health fields
    - Display `database` field value as a plain string label
    - Display `latest_ingested_at` formatted with `new Date(value).toLocaleString()` when non-null
    - Display "No data ingested yet" when `latest_ingested_at` is null
    - _Requirements: 6.2, 6.3, 6.4_
  - [ ] 7.5 Update `frontend/src/pages/DashboardPage.tsx` with trend chart and detail links
    - Add Recharts `<LineChart>` wrapped in `<ResponsiveContainer>` that fetches `GET /api/metrics/timeseries?interval=5m` with current `start`/`end` and `source_id[]`/`metric[]` values from the summary response
    - Use the same `<LineChart>`, `<XAxis>`, `<YAxis>`, `<Tooltip>` pattern as ExplorerPage
    - Show empty-state message if timeseries returns empty array; show scoped inline error with retry button if timeseries fetch fails
    - Make each summary card a `<Link>` to `/detail/{source_id}/{metric}`
    - _Requirements: 7.1–7.5, 13.2_

- [ ] 8. New frontend pages — monitoring and management
  - [ ] 8.1 Implement `frontend/src/pages/IngestionPage.tsx`
    - Fetch `GET /api/ingestion/summary` and `GET /api/ingestion/errors` in parallel via `Promise.all` on mount
    - Display summary card: `latest_success_at` formatted with `toLocaleString()` (or "Never" if null), `last_batch_records`, `last_batch_source`, `last_batch_method`
    - Display errors table with columns: time, source_id, method, records_rejected, error_message
    - Show "No ingestion errors recorded" when errors array is empty
    - Include "Refresh" button that re-fetches both endpoints
    - Show loading indicator while fetching; show single inline error with retry if either fetch fails
    - _Requirements: 8.1–8.9_
  - [ ] 8.2 Implement `frontend/src/pages/SourcesPage.tsx`
    - Fetch `GET /api/sources` on mount; display table with columns: display name, source type, latest_at, record_count, active
    - Search text input filters rows client-side (case-insensitive match on `display_name` or `source_id`)
    - "Add Source" form with fields: source_id, display_name, source_type; calls `POST /api/sources` on submit; shows "Source ID already exists" on 409; refreshes list on success
    - Inline edit of `display_name`, `source_type`, and `active` toggle per row; calls `PUT /api/sources/{source_id}` on save; refreshes list
    - Show loading indicator; show inline error message on any backend call failure
    - _Requirements: 9.1–9.11_
  - [ ] 8.3 Implement `frontend/src/pages/ThresholdsPage.tsx`
    - Fetch `GET /api/thresholds` on mount; display table with columns: metric, warning_high, critical_high
    - Inline editing of `warning_high` and `critical_high` per row; calls `PUT /api/thresholds/{metric}` on save; re-fetches table on success
    - Client-side validation: reject `warning_high >= critical_high` before submitting, show validation error message
    - Show loading indicator; show inline error with retry on load failure; show per-row inline error on PUT failure
    - _Requirements: 10.1–10.10_

- [ ] 9. New frontend pages — data and reporting
  - [ ] 9.1 Implement `frontend/src/pages/HistoryPage.tsx`
    - Filter controls: source multi-select (from `GET /api/sources`), metric multi-select (from distinct metric values in `GET /api/metrics/summary`), interval select (`1m`/`5m`/`15m`/`30m`/`1h`/`6h`/`12h`/`1d`), start/end datetime inputs
    - Default: first alphabetical `source_id` pre-selected, all metrics selected, interval `5m`, start = now−24h, end = now
    - On any filter change: call `GET /api/metrics/timeseries`; show prompt if no source or metric selected without fetching
    - Recharts `<LineChart>` wrapped in `<ResponsiveContainer>` above table; time on x-axis, `avg` on y-axis, one `<Line>` per `source_id`+`metric`
    - Table columns: timestamp, source_id, metric, avg, unit, status
    - Show empty-state message; show inline error with "Retry" button on fetch failure
    - _Requirements: 11.1–11.10_
  - [ ] 9.2 Implement `frontend/src/pages/IngestPage.tsx`
    - Fetch `GET /api/metrics/list` on mount to populate dropdowns
    - Manual form: source_id select, metric select, value number input, unit text input, timestamp datetime-local (default now), optional tags (comma-separated `key=value`)
    - On submit: call `POST /api/ingest/manual`; display "Record saved successfully" on 200; display error detail on 422
    - CSV upload section: file input + "Submit Batch" button; call `POST /api/ingest/batch`; display "Ingested: {N}, Rejected: {M}"; show rejection error list if `records_rejected > 0`
    - _Requirements: 12.1–12.9_
  - [ ] 9.3 Implement `frontend/src/pages/DetailPage.tsx`
    - Read `:source_id` and `:metric` from URL params via `useParams()`
    - Fetch `GET /api/metrics/detail` and `GET /api/thresholds` in parallel on mount and on filter change
    - Summary card: source_id, metric name, current value, unit, status badge (coloured ok/warning/critical), latest timestamp
    - Preset time range buttons: "Last 1h", "Last 6h", "Last 24h", "Last 7d" — update `start`/`end` and re-fetch on click
    - Interval selector: `1m`/`5m`/`15m`/`1h`/`6h`/`1d`, default `5m` — re-fetch on change
    - Recharts `<LineChart>` wrapped in `<ResponsiveContainer>`; time on x-axis, `avg` on y-axis
    - Stats row: min, max, avg, count from summary; `warning_high` and `critical_high` from thresholds response
    - Show inline error with "Retry" button on fetch failure
    - _Requirements: 13.1–13.10_
  - [ ] 9.4 Implement `frontend/src/pages/ReportPage.tsx`
    - Filter inputs: source select, metric multi-select, interval select (`1m`/`5m`/`15m`/`30m`/`1h`/`6h`/`12h`/`1d`), start/end datetime; default last 24h, interval `5m`, first available source
    - "Generate Report" button: call `GET /api/metrics/summary` and `GET /api/metrics/timeseries` in parallel; show validation message and do not fetch if no source or metric selected
    - On success: render summary stats section (current, avg, min, max, count per source/metric), Recharts `<LineChart>` in `<ResponsiveContainer>`, data table (time, source_id, metric, avg, min, max, count)
    - "Print" button calls `window.print()`; include `@media print` CSS that hides nav and filter controls, expands chart and table to full width
    - "Export CSV" button: generate CSV from displayed table rows; trigger browser download as `report-{start}-{end}.csv`
    - Show empty-state when both fetches return empty arrays; show inline error with "Retry" button on fetch failure
    - _Requirements: 14.1–14.10_

- [ ] 10. Documentation and final integration
  - [ ] 10.1 Update `README.md` with full project documentation
    - Add one-paragraph project description
    - Update architecture diagram to reflect 10-page SPA and 15 backend endpoints
    - Add sections for new pages: Ingestion Monitor, Sources, Thresholds, History, Ingest, Detail, Report
    - Prerequisites, setup steps, token generation, generator usage, URLs
    - Add smoke test commands for new endpoints: `/api/ingestion/summary`, `/api/ingestion/errors`, `/api/sources`, `/api/thresholds`, `/api/metrics/list`, `/api/metrics/detail`, `/api/ingest/manual`, `/api/ingest/batch`
    - _Requirements: 5.5_
  - [ ] 10.2 Run full integration verification
    - `docker compose up` + run generator; verify all 10 pages render without errors
    - Verify all new backend endpoints respond as expected (see design.md manual verification checklist)
    - Verify `GET /api/metrics/timeseries` response includes `unit` and `status` fields
    - Verify `PUT /api/thresholds/cpu_usage` with `warning_high >= critical_high` returns 422
    - Verify `POST /api/ingest/batch` with mixed valid/invalid CSV rows returns correct `records_ingested` and `records_rejected` counts
    - Ask the user if questions arise before finishing.
    - _Requirements: 5.5_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP (none in this plan — all tasks are required for full scope)
- Tasks 5 and 6 are fully independent and can be implemented in parallel (backend vs generator)
- Task 7 depends on task 5 completing first (frontend needs updated backend endpoints to verify against)
- Tasks 8 and 9 depend on task 7 (new pages build on the updated scaffold and types)
- Task 10 depends on tasks 8 and 9
- No new libraries beyond `python-multipart` for batch CSV upload
- All new frontend pages use the same inline `useEffect` + `fetch` pattern as existing pages — no custom hooks or shared components
- Recharts `<LineChart>` reused across Dashboard, Explorer, History, Detail, and Report pages without abstraction
- All `sources.json` mutations use a read-modify-write pattern; concurrent writes are not safe (documented prototype limitation)
- Each task references specific requirements for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "6.1", "6.2"] },
    { "id": 1, "tasks": ["5.9"] },
    { "id": 2, "tasks": ["7.1", "7.2"] },
    { "id": 3, "tasks": ["7.3", "7.4", "7.5"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3", "9.4"] },
    { "id": 6, "tasks": ["10.1", "10.2"] }
  ]
}
```
