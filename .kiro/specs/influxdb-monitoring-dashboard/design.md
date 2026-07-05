# Design Document: InfluxDB Time-Series Monitoring Dashboard

## Overview

Minimal three-tier prototype: React SPA on port 5173, FastAPI backend on port 8000, InfluxDB 3 Core on port 8181. All under Docker Compose. Frontend only talks to the backend; the backend is the sole InfluxDB gateway. No SQLite, no ORM, no CRUD pages — thresholds are a JSON config file.

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
| InfluxDB client | Plain `httpx` to `/api/v3/write_lp` and `/api/v3/query_sql` | No extra driver; straightforward async HTTP calls matching the official v3 HTTP API |
| Query transport | HTTP (`/api/v3/query_sql`) not Flight/gRPC | Avoids `pyarrow`/`grpcio` dependencies; returns JSON directly serializable by FastAPI |
| Aggregation | All in InfluxDB SQL (`DATE_BIN`, `AVG`, `LAST`) | Thin Python layer; no reshaping in application code |
| Interval validation | Whitelist + safe literal interpolation for `DATE_BIN` | InfluxDB 3 parameterized query engine does not reliably support `$param::INTERVAL` cast; whitelist makes interpolation safe |
| Frontend state | Inline `useEffect` + `fetch` per page | No custom hook abstraction needed for 3 pages |
| Chart library | Recharts only | One dependency, composable React components |
| Source management | Read distinct `source_id` values from InfluxDB at query time | No CRUD needed — sources appear automatically as data is ingested |

---

## Components and Interfaces

### Backend Layout

```
backend/
├── app/
│   ├── main.py        # FastAPI app, CORS, register routers, load thresholds
│   ├── config.py      # Pydantic BaseSettings — reads INFLUXDB_URL/TOKEN/DATABASE
│   ├── influx.py      # httpx helpers: write_lp(), query_sql(), ping()
│   └── routers/
│       ├── health.py  # GET /api/health
│       └── metrics.py # GET /api/metrics/summary|timeseries|latest
├── config/
│   └── thresholds.json
├── requirements.txt
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
├── main.tsx          # ReactDOM.createRoot, RouterProvider
├── router.tsx        # createBrowserRouter — 3 routes
├── api.ts            # typed fetch helpers
├── types.ts          # shared TS interfaces
└── pages/
    ├── StatusPage.tsx    # /
    ├── DashboardPage.tsx # /dashboard
    └── ExplorerPage.tsx  # /explorer
```

No shared component library. Recharts `<LineChart>` and `<ResponsiveContainer>` used directly.

**Router**
```typescript
createBrowserRouter([
  { path: "/",          element: <StatusPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/explorer",  element: <ExplorerPage /> },
])
```

A top-level `<nav>` with `<NavLink>` is rendered outside the router outlet — either inline in `main.tsx` or in a thin `Layout.tsx` wrapper.

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
}

export interface LatestItem {
  time: string
  source_id: string
  source_type: string
  metric: string
  value: number
  unit: string
}
```

---

## API Contract

| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/api/health` | — | `{ status, influxdb_connected, timestamp }` |
| GET | `/api/metrics/summary` | `source_id[]?`, `metric[]?`, `start?`, `end?` | `SummaryItem[]` |
| GET | `/api/metrics/timeseries` | `start`*, `end`*, `interval`*, `source_id[]?`, `metric[]?` | `TimeseriesItem[]` |
| GET | `/api/metrics/latest` | `limit?` (default 10, max 100) | `LatestItem[]` |

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
  LAST(value)  AS current,
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

`interval` is validated against `VALID_INTERVALS` and interpolated as a SQL literal (not a `$param`). All other values remain parameterized.

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

**Latest records**

```sql
SELECT time, source_id, source_type, metric, value, unit
FROM device_metrics
ORDER BY time DESC
LIMIT $limit
```

`$limit` is capped at 100 in Python before being passed as a param.

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
│   ├── requirements.txt
│   ├── config/
│   │   └── thresholds.json
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── influx.py
│       └── routers/
│           ├── health.py
│           └── metrics.py
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
│           └── ExplorerPage.tsx
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
| InfluxDB unreachable on health check | Return `{ status: "degraded", influxdb_connected: false }`, HTTP 200 |
| InfluxDB unreachable on query/write | Raise `HTTP 503 { detail: "InfluxDB unavailable" }` |
| Missing required query param (`start`, `end`, `interval`) | FastAPI/Pydantic returns HTTP 422 automatically |
| Invalid `interval` value | HTTP 422 with list of valid values |
| `limit` exceeds 100 | Silently capped at 100, returns HTTP 200 |
| Token never returned | `INFLUXDB_TOKEN` read from env, used only in `Authorization: Token` header, never included in any response body |

All `httpx` calls in `influx.py` are wrapped in `try/except`; `httpx.RequestError` surfaces as 503. The health endpoint catches all exceptions and returns degraded status instead.

**Frontend**

Each page follows the same three-state pattern:

```
loading → show spinner
error   → show inline error message + retry button
data    → render content (or empty-state message if array is empty)
```

`data` is reset to `null` at the start of every fetch so stale results are never displayed while a new request is in flight.

---

## Testing Strategy

This prototype prioritises working functionality over test coverage. No testing frameworks are added to keep scope within 2 days.

**Manual verification checklist (run after `docker compose up` + generator):**

- `GET /api/health` returns `influxdb_connected: true`
- `GET /api/health` returns `influxdb_connected: false` when InfluxDB container is stopped
- `GET /api/metrics/summary` returns rows with `status` values including at least one `warning` or `critical` (from generator spikes)
- `GET /api/metrics/timeseries?start=...&end=...&interval=5m` returns bucketed rows
- `GET /api/metrics/latest` returns 10 rows ordered newest-first
- `GET /api/metrics/timeseries` without `start`/`end`/`interval` returns HTTP 422
- `GET /api/metrics/timeseries?...&interval=invalid` returns HTTP 422
- Dashboard page cards are colour-coded by status
- Explorer chart renders multiple lines on filter change
- Status page shows correct badge colours for connected/disconnected InfluxDB

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
```

---

## Correctness Properties

The following properties must hold for the implementation to be considered correct. These are verified manually and through smoke tests rather than automated property-based testing.

### Property 1: All Dashboard Values Originate from InfluxDB

Every number displayed on the Dashboard and Explorer pages must come from a SQL query result. No hardcoded values, no mock data, no client-side calculations of aggregates.

**Validates: Requirements 3.4, 4.4**

### Property 2: Parameterized SQL for All User-Supplied Values

Every `query_sql()` call uses `$param` placeholders for all user-supplied filter values (`start`, `end`, `source_id[]`, `metric[]`, `limit`). The only exception is `interval`, which is validated against a strict whitelist (`VALID_INTERVALS`) before being interpolated as a SQL literal — this is safe and necessary because `$param::INTERVAL` casting is not reliably supported by InfluxDB 3 Core's query engine.

**Validates: Requirements 3.7**

### Property 3: Token Never Exposed

The value of `INFLUXDB_TOKEN` must not appear in any HTTP response body, log line written to stdout, or JavaScript bundle. It is used only in the `Authorization: Token` header of backend-to-InfluxDB requests.

**Validates: Requirements 3.8**

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

**Validates: Requirements 3.1–3.6 (all query endpoints)**
