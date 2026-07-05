# Requirements Document

## Introduction

A 2-day working prototype of an InfluxDB Time-Series Monitoring Dashboard. The system is a React SPA (Vite) backed by a FastAPI service and InfluxDB 3 Core as the sole data store. FastAPI is the only component that talks to InfluxDB — the frontend never contacts InfluxDB directly. The stack ships as a Docker Compose project that starts with a single command.

**Known limitation:** InfluxDB 3 Core has no built-in retention policies (Enterprise-only). Out of scope for this prototype.

**Query transport:** The backend uses the InfluxDB 3 HTTP API (`/api/v3/query_sql` POST) rather than the Flight/gRPC client library. This avoids `pyarrow`/`grpcio` dependencies and returns JSON directly. The official InfluxDB 3 client library (`influxdb3-python`) uses Flight/gRPC for queries and is better suited for analytics pipelines — not thin API proxies.

---

## Glossary

| Term | Definition |
|---|---|
| **Backend** | FastAPI service on port 8000; sole InfluxDB gateway. |
| **InfluxDB** | InfluxDB 3 Core on port 8181; sole time-series store. |
| **Database** | Top-level InfluxDB 3 container, named `monitoring`. |
| **Tag** | Low-cardinality indexed string column (e.g., `source_id`, `metric`). Used for filtering and grouping. |
| **Field** | Unindexed numeric/string column storing measured values. |
| **Source** | A logical data producer identified by `source_id`. |
| **Metric** | A named measurement type stored as the `metric` tag. |
| **Threshold** | An upper/lower bound for a metric, used to derive status. |
| **Generator** | `ingestion/generate_and_load.py` — produces synthetic seed data. |
| **Line Protocol** | InfluxDB write format for batch ingestion. |
| **Interval** | Duration string for time-bucket aggregation (e.g., `5m`, `1h`). |

---

## Requirements

### Requirement 1: Data Model

**User Story:** As a system architect, I want a well-defined InfluxDB schema so that all components write and query data consistently.

#### Acceptance Criteria

1. THE Backend SHALL use a single InfluxDB Database named `monitoring`.
2. THE Backend SHALL write device metrics to a Table named `device_metrics` with columns: `time` (timestamp), `source_id` (tag), `source_type` (tag), `metric` (tag), `value` (float field), `unit` (string field).
3. THE Backend SHALL write ingestion events to a Table named `ingestion_log` with columns: `time` (timestamp), `source_id` (tag), `method` (tag — `generator` or `manual`), `records_ingested` (int field), `records_rejected` (int field), `error_message` (string field, nullable).
4. THE project SHALL store threshold configuration in a JSON file (`config/thresholds.json`) read at backend startup — no database table required.

---

### Requirement 2: Data Generator

**User Story:** As a developer, I want a seed data generator so that the dashboard has realistic demo data immediately after setup.

#### Acceptance Criteria

1. THE Generator SHALL be a standalone Python script at `ingestion/generate_and_load.py`, runnable with `python generate_and_load.py` from the `ingestion/` directory.
2. THE Generator SHALL produce at least 3 distinct `source_id` values, at least 4 distinct `metric` values, at least 1,000 total rows, spanning at least 24 hours.
3. THE Generator SHALL introduce deliberate value spikes that exceed at least one configured threshold, to demonstrate threshold-breach visualisation.
4. THE Generator SHALL add Gaussian noise to baseline values so that charts show natural variation.
5. THE Generator SHALL read `INFLUXDB_URL`, `INFLUXDB_TOKEN`, and `INFLUXDB_DATABASE` from environment variables and write via line-protocol HTTP POST batches directly to InfluxDB.
6. THE Generator SHALL write a corresponding `ingestion_log` entry with `method: "generator"` after each batch, recording `records_ingested` and `records_rejected`.
7. IF the InfluxDB write endpoint returns a non-2xx status, THE Generator SHALL print the error body to stderr and exit non-zero.

---

### Requirement 3: Backend API

**User Story:** As a frontend developer, I want a backend API so that the dashboard can query real InfluxDB data without exposing credentials to the browser.

#### Acceptance Criteria

1. THE Backend SHALL expose `GET /api/health` returning `{ status, influxdb_connected, timestamp }` — always HTTP 200; `influxdb_connected` is `false` when InfluxDB is unreachable.
2. THE Backend SHALL expose `GET /api/metrics/summary` accepting optional query params `source_id[]`, `metric[]`, `start`, `end`; returning a JSON array where each element contains `source_id`, `metric`, `current` (latest value), `avg`, `min`, `max`, `count`, and `status` (`ok`/`warning`/`critical`).
3. THE Backend SHALL compute `status` by comparing `current` against the in-memory thresholds from `config/thresholds.json` — critical bounds checked before warning bounds; `ok` if no threshold matches.
4. THE Backend SHALL compute all aggregations (`avg`, `min`, `max`, `count`, latest `value`) in SQL, not in Python.
5. THE Backend SHALL expose `GET /api/metrics/timeseries` accepting required params `start`, `end`, `interval` and optional `source_id[]`, `metric[]`; returning time-bucketed rows via a `DATE_BIN` SQL query; returning HTTP 422 if required params are missing or if `interval` is not one of the supported values (`1m`, `5m`, `15m`, `30m`, `1h`, `6h`, `12h`, `1d`).
6. THE Backend SHALL expose `GET /api/metrics/latest` accepting optional `limit` (default 10, max 100); returning the most recent rows from `device_metrics` ordered by `time` descending; silently capping at 100.
7. THE Backend SHALL use parameterized SQL (`$param` syntax) for all user-supplied filter values. The `interval` parameter is an exception: it SHALL be validated against a strict whitelist before being interpolated as a SQL literal, because InfluxDB 3 Core's query engine does not support the `$param::INTERVAL` cast syntax.
8. THE Backend SHALL include `db` in every POST request body sent to `/api/v3/query_sql` — it is a required field per the InfluxDB 3 HTTP API.
9. THE Backend SHALL read `INFLUXDB_URL`, `INFLUXDB_TOKEN`, and `INFLUXDB_DATABASE` exclusively from environment variables and SHALL never return the token in any response.

---

### Requirement 4: Frontend

**User Story:** As a user, I want a dashboard so that I can monitor metric health, explore trends, and confirm the system is running.

#### Acceptance Criteria

1. THE Dashboard SHALL be a React SPA built with Vite and React Router, with three routes: `/` (Status), `/dashboard` (Overview), `/explorer` (Explorer).
2. THE Dashboard SHALL display a persistent navigation bar that highlights the active route.
3. THE Status page SHALL call `GET /api/health` on load and display connection badges for the Backend and InfluxDB, plus the returned timestamp.
4. THE Dashboard page SHALL call `GET /api/metrics/summary` on load, display one summary card per `source_id`+`metric` combination showing `current`, `avg`, `min`, `max`, and colour-code each card by threshold `status` returned by the API.
5. THE Dashboard page SHALL include a time range control; WHEN the time range changes, THE Dashboard SHALL re-call the summary endpoint and the latest-records endpoint with updated parameters.
6. THE Dashboard page SHALL display a "Latest Records" table showing the most recent rows from `GET /api/metrics/latest`.
7. THE Explorer page SHALL provide source, metric, time range, and interval filter controls; WHEN any filter changes, THE Explorer SHALL call `GET /api/metrics/timeseries` and re-render the chart.
8. THE Explorer page SHALL render a line chart (Recharts) with time on the x-axis and `avg` on the y-axis, with one line per `source_id`+`metric` combination.
9. THE Explorer page SHALL display a data table below the chart showing the raw time-bucket rows.
10. WHILE any fetch is in progress, THE Dashboard SHALL show a loading indicator.
11. IF any fetch fails, THE Dashboard SHALL show an inline error message with a retry button.
12. WHEN a fetch returns an empty result, THE Dashboard SHALL show an empty-state message.
13. THE Dashboard SHALL read `VITE_API_BASE_URL` from the Vite environment and use it as the base URL for all API calls — it SHALL NOT make direct HTTP requests to InfluxDB.

---

### Requirement 5: Infrastructure and Documentation

**User Story:** As a developer, I want a single-command setup and clear documentation so that the project runs from a clean clone.

#### Acceptance Criteria

1. THE project SHALL include `docker-compose.yml` defining three services: `influxdb` (port 8181, file object-store volume), `backend` (port 8000), `frontend` (port 5173).
2. THE project SHALL include `.env.example` with placeholder values for `INFLUXDB_URL`, `INFLUXDB_TOKEN`, `INFLUXDB_DATABASE`, and `VITE_API_BASE_URL`.
3. THE project SHALL include `.env` in `.gitignore` — credentials SHALL NOT be committed to source control.
4. WHEN `docker compose up` is run after copying `.env.example` to `.env` and supplying a valid token, THE full stack SHALL be reachable within 60 seconds.
5. THE project SHALL include a `README.md` covering: prerequisites, token generation, `.env` setup, `docker compose up`, how to run the generator, and an architecture diagram.
