# Design Document: InfluxDB Time-Series Monitoring Dashboard

## Overview

Minimal three-tier prototype: React SPA on port 5173, FastAPI backend on port 8000, InfluxDB 3 Core on port 8181. All under Docker Compose. Frontend only talks to the backend; the backend is the sole InfluxDB gateway. No SQLite, no ORM — thresholds and source metadata are JSON config files.

---

## Architecture

```
Browser
  React SPA :5173
  (Vite · React Router · Recharts)
       │  HTTP/REST  (VITE_API_BASE_URL)
       ▼
  FastAPI :8000
  (httpx · Pydantic · JSON config)
       │  HTTP :8181
       ▼
  InfluxDB 3 Core :8181
  database: monitoring
  tables: device_metrics, ingestion_log

  ingestion/generate_and_load.py
  → HTTP POST :8181 (direct, bypasses backend)
```

### Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Threshold storage | `config/thresholds.json` read at startup | No persistence needed for a prototype; eliminates SQLite/ORM entirely |
| Source registry | `config/sources.json` read/written at runtime | Lightweight override store; sources auto-discovered from InfluxDB |
| InfluxDB client | Plain `httpx` to `/api/v3/write_lp` and `/api/v3/query_sql` | No extra driver; straightforward async HTTP calls matching the official v3 HTTP API |
| Query transport | HTTP (`/api/v3/query_sql`) not Flight/gRPC | Avoids `pyarrow`/`grpcio` dependencies; returns JSON directly serializable by FastAPI |
| Aggregation | All in InfluxDB SQL (`DATE_BIN`, `AVG`, `LAST`) | Thin Python layer; no reshaping in application code |
| Interval validation | Whitelist + safe literal interpolation for `DATE_BIN` | InfluxDB 3 parameterized query engine does not reliably support `$param::INTERVAL` cast; whitelist makes interpolation safe |
| Frontend state | Inline `useEffect` + `fetch` per page | No custom hook abstraction needed |
| Chart library | Recharts only | One dependency, composable React components |
| Source discovery | Read distinct `source_id` values from InfluxDB, merged with sources.json | Sources appear automatically as data is ingested; overrides stored separately |
| CSV upload | `python-multipart` for multipart form parsing | Standard FastAPI file upload; no extra parsing library needed |

---

## Components and Interfaces

### Backend Layout

```
backend/
├── app/
│   ├── main.py           # FastAPI app, CORS, register routers, load thresholds + sources
│   ├── config.py         # Pydantic BaseSettings — reads INFLUXDB_URL/TOKEN/DATABASE
│   ├── influx.py         # httpx helpers: write_lp(), query_sql(), ping()
│   └── routers/
│       ├── health.py     # GET /api/health
│       ├── metrics.py    # GET /api/metrics/summary|timeseries|latest|list|detail
│       ├── ingestion.py  # GET /api/ingestion/summary, GET /api/ingestion/errors
│       ├── sources.py    # GET/POST /api/sources, PUT /api/sources/{source_id}
│       ├── thresholds.py # GET /api/thresholds, PUT /api/thresholds/{metric}
│       └── ingest.py     # POST /api/ingest/manual, POST /api/ingest/batch
├── config/
│   ├── thresholds.json
│   └── sources.json      # initially []
├── requirements.txt      # includes python-multipart
└── Dockerfile
```

**`influx.py` — InfluxDB HTTP helpers**

All three functions use `httpx.AsyncClient` with `Authorization: Token {token}` header.
The token is read from `Settings` and never returned in any response.

```python
async def ping(settings: Settings) -> bool:
    # GET {INFLUXDB_URL}/health
    # Returns False on any exception — never raises

async def query_sql(sql: str, params: dict, settings: Settings) -> list[dict]:
    # POST {INFLUXDB_URL}/api/v3/query_sql
    # Body: {"db": database, "q": sql, "format": "json"}
    # Body includes "params": {...} only when params dict is non-empty
    # Raises HTTP 503 on network error or non-2xx response

async def write_lp(lp: str, settings: Settings) -> None:
    # POST {INFLUXDB_URL}/api/v3/write_lp?db={database}
    # Body: raw line protocol text (Content-Type: text/plain; charset=utf-8)
    # Raises HTTP 503 on non-2xx response
```

**Request body shape for `query_sql` (confirmed against official v3 HTTP API docs):**

```json
{
  "db": "monitoring",
  "q": "SELECT source_id, metric FROM device_metrics LIMIT $limit",
  "params": { "limit": 10 },
  "format": "json"
}
```

`db` is a **required** field in the POST body. `params` is omitted when there are no query parameters. `format: "json"` returns an array of objects, directly serializable by FastAPI.

**`config/thresholds.json`** — loaded once at startup, injected as `app.state.thresholds`:

```json
[
  { "metric": "cpu_usage",    "warning_high": 80,  "critical_high": 95  },
  { "metric": "memory_usage", "warning_high": 75,  "critical_high": 90  },
  { "metric": "temperature",  "warning_high": 70,  "critical_high": 85  },
  { "metric": "disk_io",      "warning_high": 200, "critical_high": 400 }
]
```

**`config/sources.json`** — read/written at runtime by the sources router. Initially an empty array:

```json
[]
```

Each entry shape:

```json
{ "source_id": "server-01", "display_name": "Server 01", "source_type": "server", "active": true }
```

Status computation (Python, after fetching `current` from InfluxDB):

```python
def compute_status(value: float, thresholds: dict) -> str:
    if thresholds.get("critical_high") is not None and value > thresholds["critical_high"]:
        return "critical"
    if thresholds.get("critical_low") is not None and value < thresholds["critical_low"]:
        return "critical"
    if thresholds.get("warning_high") is not None and value > thresholds["warning_high"]:
        return "warning"
    if thresholds.get("warning_low") is not None and value < thresholds["warning_low"]:
        return "warning"
    return "ok"
```

Note: uses `is not None` guards (not truthiness) so a threshold of `0` is handled correctly.

**`metrics.py` — interval whitelist**

```python
VALID_INTERVALS = {"1m", "5m", "15m", "30m", "1h", "6h", "12h", "1d"}
```

`interval` is validated against this set before use. If invalid, returns HTTP 422. If valid, interpolated directly as `INTERVAL '5m'` literal — not as a `$param` — because InfluxDB 3 Core's parameterized query engine does not support the `$param::INTERVAL` cast syntax. The whitelist makes this safe.

---

### Frontend Layout

```
frontend/src/
├── main.tsx              # ReactDOM.createRoot, RouterProvider
├── router.tsx            # createBrowserRouter — 10 routes
├── api.ts                # typed fetch helpers
├── types.ts              # shared TS interfaces
└── pages/
    ├── StatusPage.tsx        # /
    ├── DashboardPage.tsx     # /dashboard
    ├── ExplorerPage.tsx      # /explorer
    ├── IngestionPage.tsx     # /ingestion
    ├── SourcesPage.tsx       # /sources
    ├── ThresholdsPage.tsx    # /thresholds
    ├── HistoryPage.tsx       # /history
    ├── IngestPage.tsx        # /ingest
    ├── DetailPage.tsx        # /detail/:source_id/:metric
    ├── ReportPage.tsx        # /report
```

No shared component library. Recharts `<LineChart>` and `<ResponsiveContainer>` used directly.

**Router**

```typescript
createBrowserRouter([
  { path: "/",                          element: <StatusPage /> },
  { path: "/dashboard",                 element: <DashboardPage /> },
  { path: "/explorer",                  element: <ExplorerPage /> },
  { path: "/ingestion",                 element: <IngestionPage /> },
  { path: "/sources",                   element: <SourcesPage /> },
  { path: "/thresholds",                element: <ThresholdsPage /> },
  { path: "/history",                   element: <HistoryPage /> },
  { path: "/ingest",                    element: <IngestPage /> },
  { path: "/detail/:source_id/:metric", element: <DetailPage /> },
  { path: "/report",                    element: <ReportPage /> },
])
```

A top-level `<nav>` with `<NavLink>` is rendered outside the router outlet — either inline in `main.tsx` or in a thin `Layout.tsx` wrapper. Nav links: Status, Dashboard, Explorer, Ingestion, Sources, Thresholds, History, Ingest, Report.

**Data fetching pattern** — inline per page, no custom hook abstraction:

```typescript
const [data, setData] = useState<SummaryItem[] | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  setLoading(true)
  setData(null)
  fetch(`${import.meta.env.VITE_API_BASE_URL}/api/metrics/summary`)
    .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
    .then(setData)
    .catch(e => setError(String(e)))
    .finally(() => setLoading(false))
}, [params])
```

---

## Data Models

### InfluxDB Tables

**`device_metrics`**

| Column | Kind | Type | Notes |
|---|---|---|---|
| `time` | timestamp | ns int | Set by InfluxDB |
| `source_id` | tag | string | e.g., `server-01` |
| `source_type` | tag | string | e.g., `server`, `sensor` |
| `metric` | tag | string | e.g., `cpu_usage` |
| `value` | field | float64 | Measured reading |
| `unit` | field | string | e.g., `percent` |

Long-format: one row per `source_id × metric × timestamp`. Adding a new metric = write rows with a new `metric` tag value, no schema change.

```
# line protocol
device_metrics,source_id=server-01,source_type=server,metric=cpu_usage value=72.3,unit="percent" 1715000000000000000
```

**`ingestion_log`**

| Column | Kind | Type |
|---|---|---|
| `time` | timestamp | ns int |
| `source_id` | tag | string |
| `method` | tag | string (`generator` / `manual`) |
| `records_ingested` | field | int64 |
| `records_rejected` | field | int64 |
| `error_message` | field | string (nullable) |

### TypeScript Types (`src/types.ts`)

```typescript
export interface HealthResponse {
  status: "ok" | "degraded"
  influxdb_connected: boolean
  timestamp: string
  database: string
  latest_ingested_at: string | null
}

export interface SummaryItem {
  source_id: string
  metric: string
  current: number
  avg: number
  min: number
  max: number
  count: number
  status: "ok" | "warning" | "critical"
}

export interface TimeseriesItem {
  time: string        // ISO 8601 bucket start
  source_id: string
  metric: string
  avg: number
  min: number
  max: number
  count: number
  unit?: string       // added for History page (most recent unit in range)
  status?: string     // added for History page (computed server-side)
}

export interface LatestItem {
  time: string
  source_id: string
  source_type: string
  metric: string
  value: number
  unit: string
}

export interface IngestionSummary {
  latest_success_at: string | null
  last_batch_records: number | null
  last_batch_source: string | null
  last_batch_method: string | null
}

export interface IngestionError {
  time: string
  source_id: string
  method: string
  records_rejected: number
  error_message: string
}

export interface SourceItem {
  source_id: string
  display_name: string
  source_type: string
  latest_at: string | null
  record_count: number
  active: boolean
}

export interface ThresholdItem {
  metric: string
  warning_high: number
  critical_high: number
}

export interface IngestResult {
  records_ingested: number
  records_rejected: number
  errors: Array<{ row: number; reason: string }>
}

export interface DetailResponse {
  summary: SummaryItem
  timeseries: TimeseriesItem[]
}

export interface MetricsList {
  sources: string[]
  metrics: string[]
}
```

---

## API Contract

| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/api/health` | — | `HealthResponse` (`status`, `influxdb_connected`, `timestamp`, `database`, `latest_ingested_at`) |
| GET | `/api/metrics/summary` | `source_id[]?`, `metric[]?`, `start?`, `end?` | `SummaryItem[]` |
| GET | `/api/metrics/timeseries` | `start`*, `end`*, `interval`*, `source_id[]?`, `metric[]?` | `TimeseriesItem[]` (includes `unit`, `status`) |
| GET | `/api/metrics/latest` | `limit?` (default 10, max 100) | `LatestItem[]` |
| GET | `/api/metrics/detail` | `source_id`*, `metric`*, `start?`, `end?`, `interval?` | `DetailResponse` |
| GET | `/api/metrics/list` | — | `MetricsList` |
| GET | `/api/ingestion/summary` | — | `IngestionSummary` |
| GET | `/api/ingestion/errors` | — | `IngestionError[]` (max 20) |
| GET | `/api/sources` | — | `SourceItem[]` |
| POST | `/api/sources` | body: `{source_id, display_name, source_type}` | `SourceItem` (201) |
| PUT | `/api/sources/{source_id}` | body: optional `{display_name, source_type, active}` | `SourceItem` |
| GET | `/api/thresholds` | — | `ThresholdItem[]` |
| PUT | `/api/thresholds/{metric}` | body: optional `{warning_high, critical_high}` | `ThresholdItem` |
| POST | `/api/ingest/manual` | JSON body | `{ ok: true }` |
| POST | `/api/ingest/batch` | multipart CSV file | `IngestResult` |

_* = required — returns HTTP 422 if missing or invalid_

`interval` must be one of: `1m`, `5m`, `15m`, `30m`, `1h`, `6h`, `12h`, `1d`. Any other value returns HTTP 422.

---

## Key SQL Patterns

**Summary — aggregates + latest value**

All user-supplied filter values use `$param` placeholders. IN-list filters expand to individual params (`$s0`, `$s1`, ... for source IDs; `$m0`, `$m1`, ... for metrics).

```sql
SELECT
  source_id,
  metric,
  selector_last(value, time)['value'] AS current,
  AVG(value)   AS avg,
  MIN(value)   AS min,
  MAX(value)   AS max,
  COUNT(*)     AS count
FROM device_metrics
WHERE time >= $start AND time < $end
  AND source_id IN ($s0, $s1)
  AND metric    IN ($m0, $m1)
GROUP BY source_id, metric
```

Filters are appended dynamically — omitted when the corresponding query params are not supplied.

**Timeseries — DATE_BIN bucketing**

`interval` is validated against `VALID_INTERVALS` and interpolated as a SQL literal (not a `$param`). All other values remain parameterized. `unit` and `status` are added in Python after the query.

```sql
SELECT
  DATE_BIN(INTERVAL '5m', time, TIMESTAMP '1970-01-01') AS time,
  source_id,
  metric,
  AVG(value) AS avg,
  MIN(value) AS min,
  MAX(value) AS max,
  COUNT(*)   AS count
FROM device_metrics
WHERE time >= $start AND time < $end
GROUP BY 1, source_id, metric
ORDER BY 1
```

For the `unit` field, a second query fetches `selector_last(unit, time)['unit']` grouped by `source_id, metric` for the same range. Status is computed in Python with `compute_status()`.

**Latest records**

```sql
SELECT time, source_id, source_type, metric, value, unit
FROM device_metrics
ORDER BY time DESC
LIMIT $limit
```

`$limit` is capped at 100 in Python before being passed as a param.

**Ingestion summary — most recent successful ingestion**

```sql
SELECT time, source_id, method, records_ingested
FROM ingestion_log
WHERE records_ingested > 0
ORDER BY time DESC
LIMIT 1
```

**Ingestion errors — 20 most recent error rows**

```sql
SELECT time, source_id, method, records_rejected, error_message
FROM ingestion_log
WHERE error_message IS NOT NULL AND error_message != ''
ORDER BY time DESC
LIMIT 20
```

**Metrics list — distinct sources and metrics**

```sql
SELECT DISTINCT source_id FROM device_metrics
```

```sql
SELECT DISTINCT metric FROM device_metrics
```

Results collected in Python into `{ sources: [...], metrics: [...] }`.

**Sources — aggregated stats per source**

```sql
SELECT
  source_id,
  source_type,
  MAX(time)  AS latest_at,
  COUNT(*)   AS record_count
FROM device_metrics
GROUP BY source_id, source_type
```

The Python layer merges these rows with `config/sources.json` overrides: `display_name`, `source_type` (if present in JSON overrides `source_type` from InfluxDB), and `active` come from the JSON entry when one exists; defaults are `display_name=source_id`, `active=true`.

**Detail endpoint — single source+metric**

Runs the summary SQL with added `source_id = $source_id AND metric = $metric` filters (in addition to any time range filters), and the timeseries SQL with the same filters appended. Returns `{ summary: SummaryItem, timeseries: TimeseriesItem[] }`.

---

## Data Flow

**Read path**
```
Dashboard filter change
  → GET /api/metrics/summary?start=...&end=...
  → FastAPI validates params (Pydantic)
  → Build parameterized SQL + body {db, q, params, format}
  → POST /api/v3/query_sql (InfluxDB :8181)
  → Fetch thresholds from app.state (loaded at startup)
  → Compute status per row in Python
  → Return SummaryItem[] JSON
  → page setState(data) → React re-renders cards
```

**Generator seed path**
```
python generate_and_load.py
  → Read env vars (INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_DATABASE)
  → Generate rows (Gaussian noise + deliberate spikes at hours 12, 24, 36)
  → POST /api/v3/write_lp?db=monitoring in batches of 500
  → POST ingestion_log line-protocol entry per batch
  → Non-2xx → print error body to stderr + sys.exit(1)
```

**Manual ingestion path**
```
POST /api/ingest/manual (JSON body)
  → Validate required fields: source_id, metric, value, unit
  → Build device_metrics line protocol row
  → write_lp(device_metrics_lp, settings)
  → Build ingestion_log line protocol row (method=manual, records_ingested=1)
  → write_lp(ingestion_log_lp, settings)
  → Return { ok: true }
```

**Batch ingestion path**
```
POST /api/ingest/batch (multipart CSV)
  → Parse CSV rows, validate each (required cols, numeric value, parseable timestamp)
  → Collect valid rows into line protocol batch; collect rejection errors
  → If valid_rows > 0: write_lp(batch_lp, settings)
  → write_lp(ingestion_log row: records_ingested=N, records_rejected=M, method=manual)
  → Return IngestResult { records_ingested, records_rejected, errors[] }
```

---

## Docker Compose

```yaml
version: "3.9"

services:
  influxdb:
    image: influxdb:3-core
    ports: ["8181:8181"]
    environment:
      INFLUXDB3_OBJECT_STORE: file
      INFLUXDB3_DB_DIR: /var/lib/influxdb3
    volumes:
      - influxdb_data:/var/lib/influxdb3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8181/health"]
      interval: 10s
      timeout: 5s
      retries: 6

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      INFLUXDB_URL: ${INFLUXDB_URL}
      INFLUXDB_TOKEN: ${INFLUXDB_TOKEN}
      INFLUXDB_DATABASE: ${INFLUXDB_DATABASE}
    depends_on:
      influxdb:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    environment:
      VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:8000}
    depends_on:
      - backend

volumes:
  influxdb_data:
```

**Backend Dockerfile**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
COPY config/ config/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

---

## Project Structure

```
time-series-dashboard/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt       # includes python-multipart
│   ├── config/
│   │   ├── thresholds.json
│   │   └── sources.json       # initially []
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── influx.py
│       └── routers/
│           ├── health.py
│           ├── metrics.py
│           ├── ingestion.py
│           ├── sources.py
│           ├── thresholds.py
│           └── ingest.py
│
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── router.tsx
│       ├── api.ts
│       ├── types.ts
│       └── pages/
│           ├── StatusPage.tsx
│           ├── DashboardPage.tsx
│           ├── ExplorerPage.tsx
│           ├── IngestionPage.tsx
│           ├── SourcesPage.tsx
│           ├── ThresholdsPage.tsx
│           ├── HistoryPage.tsx
│           ├── IngestPage.tsx
│           ├── DetailPage.tsx
│           └── ReportPage.tsx
│
└── ingestion/
    ├── generate_and_load.py
    └── requirements.txt
```

---

## Error Handling

This is a prototype — error handling is intentionally minimal and consistent.

**Backend**

| Scenario | Behaviour |
|---|---|
| InfluxDB unreachable on health check | Return `{ status: "degraded", influxdb_connected: false, latest_ingested_at: null }`, HTTP 200 |
| InfluxDB unreachable on query/write | Raise `HTTP 503 { detail: "InfluxDB unavailable" }` |
| Missing required query param (`start`, `end`, `interval`) | FastAPI/Pydantic returns HTTP 422 automatically |
| Invalid `interval` value | HTTP 422 with list of valid values |
| `limit` exceeds 100 | Silently capped at 100, returns HTTP 200 |
| Token never returned | `INFLUXDB_TOKEN` read from env, used only in `Authorization: Token` header, never included in any response body |
| `POST /api/sources` with duplicate `source_id` | HTTP 409 |
| `POST /api/sources` with missing/empty required fields | HTTP 422 |
| `PUT /api/thresholds/{metric}` with metric not in thresholds.json | HTTP 404 |
| `PUT /api/thresholds/{metric}` with `warning_high >= critical_high` | HTTP 422 with descriptive message |
| `POST /api/ingest/manual` with missing/empty required fields | HTTP 422 with descriptive `detail` field |
| `POST /api/ingest/manual` with non-numeric `value` | HTTP 422 |
| `POST /api/ingest/manual` with invalid ISO 8601 `timestamp` | HTTP 422 |
| `POST /api/ingest/batch` with all rows rejected | HTTP 200 with `records_ingested=0`; no `write_lp` call for device_metrics |
| `GET /api/metrics/detail` with missing `source_id` or `metric` | HTTP 422 |

All `httpx` calls in `influx.py` are wrapped in `try/except`; `httpx.RequestError` surfaces as 503. The health endpoint catches all exceptions and returns degraded status instead.

**Frontend**

Each page follows the same three-state pattern:

```
loading → show spinner
error   → show inline error message + retry button
data    → render content (or empty-state message if array is empty)
```

`data` is reset to `null` at the start of every fetch so stale results are never displayed while a new request is in flight.

Pages that make parallel fetches (IngestionPage) use `Promise.all` and display a single error state if either fetch fails.

---

## Testing Strategy

This prototype prioritises working functionality over test coverage. No testing frameworks are added to keep scope within 2 days.

**Manual verification checklist (run after `docker compose up` + generator):**

- `GET /api/health` returns `influxdb_connected: true`, plus `database` and non-null `latest_ingested_at`
- `GET /api/health` returns `influxdb_connected: false` when InfluxDB container is stopped, `latest_ingested_at: null`
- `GET /api/metrics/summary` returns rows with `status` values including at least one `warning` or `critical` (from generator spikes)
- `GET /api/metrics/timeseries?start=...&end=...&interval=5m` returns bucketed rows with `unit` and `status` fields
- `GET /api/metrics/latest` returns 10 rows ordered newest-first
- `GET /api/metrics/timeseries` without `start`/`end`/`interval` returns HTTP 422
- `GET /api/metrics/timeseries?...&interval=invalid` returns HTTP 422
- `GET /api/metrics/list` returns `{ sources: [...], metrics: [...] }`
- `GET /api/metrics/detail?source_id=server-01&metric=cpu_usage&interval=5m` returns `{ summary, timeseries }`
- `GET /api/ingestion/summary` returns correct fields; all null before generator runs
- `GET /api/ingestion/errors` returns empty array or error rows
- `GET /api/sources` returns merged source list with `latest_at` and `record_count`
- `POST /api/sources` creates entry; second POST with same `source_id` returns 409
- `PUT /api/sources/{source_id}` updates display_name/active in sources.json
- `GET /api/thresholds` returns full thresholds.json
- `PUT /api/thresholds/cpu_usage` with `warning_high=90, critical_high=85` returns 422
- `PUT /api/thresholds/cpu_usage` with valid values updates thresholds and reloads `app.state.thresholds`
- `POST /api/ingest/manual` with valid body writes device_metrics and ingestion_log
- `POST /api/ingest/batch` with valid CSV returns `records_ingested > 0`
- `POST /api/ingest/batch` with all-invalid CSV rows returns `records_ingested=0`
- Dashboard page cards are colour-coded by status and link to `/detail/{source_id}/{metric}`
- Explorer chart renders multiple lines on filter change
- Status page shows `database` label and formatted `latest_ingested_at`
- Ingestion page loads both summary and errors in parallel; Refresh button re-fetches
- Sources page table renders with search/filter; Add Source form handles 409 gracefully
- Thresholds page inline edit rejects `warning_high >= critical_high` before submitting
- History page time-series chart and table include `unit` and `status` columns
- Ingest page manual form and CSV upload both work; rejection errors shown
- Detail page preset time range buttons re-fetch correctly
- Report page Print button triggers `window.print()`; Export CSV downloads file

**Smoke test commands:**

```bash
# health
curl http://localhost:8000/api/health

# summary (last 24h)
curl "http://localhost:8000/api/metrics/summary?start=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)&end=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# timeseries
curl "http://localhost:8000/api/metrics/timeseries?start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z&interval=1h"

# timeseries with invalid interval — should return 422
curl "http://localhost:8000/api/metrics/timeseries?start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z&interval=2h"

# latest
curl http://localhost:8000/api/metrics/latest

# metrics list
curl http://localhost:8000/api/metrics/list

# ingestion summary
curl http://localhost:8000/api/ingestion/summary

# sources
curl http://localhost:8000/api/sources

# thresholds — invalid constraint (should return 422)
curl -X PUT http://localhost:8000/api/thresholds/cpu_usage \
  -H "Content-Type: application/json" \
  -d '{"warning_high": 95, "critical_high": 80}'

# manual ingest
curl -X POST http://localhost:8000/api/ingest/manual \
  -H "Content-Type: application/json" \
  -d '{"source_id":"test-01","metric":"cpu_usage","value":42.5,"unit":"percent"}'
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties must hold for the implementation to be considered correct. These are verified manually and through smoke tests rather than automated property-based testing, as this feature involves API endpoints, file I/O, and infrastructure wiring where example-based and smoke tests provide better cost/value than property-based testing at scale.

### Property 1: All Dashboard Values Originate from InfluxDB

Every number displayed on the Dashboard and Explorer pages must come from a SQL query result. No hardcoded values, no mock data, no client-side calculations of aggregates.

**Validates: Requirements 3.4, 4.4**

### Property 2: Parameterized SQL for All User-Supplied Values

Every `query_sql()` call uses `$param` placeholders for all user-supplied filter values (`start`, `end`, `source_id[]`, `metric[]`, `limit`). The only exception is `interval`, which is validated against a strict whitelist (`VALID_INTERVALS`) before being interpolated as a SQL literal — this is safe and necessary because `$param::INTERVAL` casting is not reliably supported by InfluxDB 3 Core's query engine.

**Validates: Requirements 3.7**

### Property 3: Token Never Exposed

The value of `INFLUXDB_TOKEN` must not appear in any HTTP response body, log line written to stdout, or JavaScript bundle. It is used only in the `Authorization: Token` header of backend-to-InfluxDB requests.

**Validates: Requirements 3.9**

### Property 4: Status Precedence is Consistent

For any `(current, thresholds)` pair, `compute_status()` must return `critical` before `warning` before `ok`. A value that crosses a critical bound must never be reported as `warning`. The `is not None` guard ensures a threshold value of `0` is handled correctly.

**Validates: Requirements 3.3**

### Property 5: Latest Records are Time-Ordered

`GET /api/metrics/latest` must always return rows sorted by `time` descending — the first row in the array is the most recent data point.

**Validates: Requirements 3.6**

### Property 6: Timeseries Requires All Three Params and Valid Interval

`GET /api/metrics/timeseries` without `start`, `end`, or `interval` must return HTTP 422, not 500. An `interval` value not in `VALID_INTERVALS` must also return HTTP 422.

**Validates: Requirements 3.5**

### Property 7: Limit Cap is Enforced

`GET /api/metrics/latest?limit=999` must return at most 100 rows and HTTP 200, never an error.

**Validates: Requirements 3.6**

### Property 8: Empty Results Return Empty Arrays

When filters match no data, `GET /api/metrics/summary` and `GET /api/metrics/timeseries` return `HTTP 200 []`, not 404 or 500.

**Validates: Requirements 3.2, 3.5**

### Property 9: `db` Always Sent in Query Body

Every call to `POST /api/v3/query_sql` must include `"db": settings.influxdb_database` in the request body. Omitting `db` causes InfluxDB 3 Core to return an error.

**Validates: Requirements 3.1–3.6, 6.1, 8.3–8.4, 9.3, 12.3**

### Property 10: Sources JSON Write Safety

Writes to `config/sources.json` (via `POST /api/sources` and `PUT /api/sources/{source_id}`) use a read-modify-write pattern: read the full file, apply the change in memory, write back atomically. Concurrent mutations are not safe in this prototype — this is documented as a known limitation. A single write at a time must not corrupt the file (i.e., the written JSON must always parse back to a valid array).

**Validates: Requirements 9.4, 9.5**

### Property 11: Threshold Constraint Enforcement

`PUT /api/thresholds/{metric}` must return HTTP 422 if the resulting `warning_high` value would be greater than or equal to `critical_high`, regardless of whether the violation comes from the request body or an existing stored value. This must hold for any numeric pair where `warning_high >= critical_high`.

**Validates: Requirements 10.4**

### Property 12: Batch Ingestion Atomicity on Total Rejection

*For any* CSV upload where every row is rejected (missing required columns, non-numeric value, or unparseable timestamp), `records_ingested` must be 0 and no `write_lp` call is made for `device_metrics`. One `ingestion_log` entry with `records_ingested=0` and `records_rejected=N` is still written. The endpoint returns HTTP 200 in all cases.

**Validates: Requirements 12.8**

### Property 13: Manual Ingestion Log Consistency

*For any* successful `POST /api/ingest/manual` (HTTP 200 response), exactly one `ingestion_log` row must be written with `records_ingested=1` and `method=manual`. No partial writes — if the `device_metrics` write fails (InfluxDB returns non-2xx), the `ingestion_log` write must not proceed.

**Validates: Requirements 12.6**
