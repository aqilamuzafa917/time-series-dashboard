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
| **Source_Registry** | A JSON file (`config/sources.json`) storing display names, types, and active flags for known sources. |
| **Threshold_Config** | The JSON file (`config/thresholds.json`) storing per-metric warning and critical bounds. |

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

---

### Requirement 6: Status Page — Gap Fill

**User Story:** As a user, I want the Status page to show the active database name and the latest ingestion time so that I can confirm what data is available.

#### Acceptance Criteria

1. THE Backend SHALL update `GET /api/health` to include two additional fields: `database` (the configured `INFLUXDB_DATABASE` value) and `latest_ingested_at` (the `MAX(time)` from `device_metrics` as an ISO 8601 UTC string, or `null` if no data exists or if InfluxDB is unreachable).
2. WHEN `GET /api/health` returns successfully, THE Status page SHALL display the `database` field value as a plain string label.
3. WHEN the `latest_ingested_at` field is a non-null ISO 8601 string, THE Status page SHALL display it formatted as a locale date and time string (e.g., using `new Date(value).toLocaleString()`).
4. WHEN `latest_ingested_at` is `null`, THE Status page SHALL display the text "No data ingested yet" in place of the timestamp.

---

### Requirement 7: Monitoring Dashboard — Gap Fill

**User Story:** As a user, I want a trend chart on the Dashboard page so that I can see metric patterns without going to the Explorer.

#### Acceptance Criteria

1. THE Dashboard page SHALL include a Recharts `LineChart` wrapped in a `ResponsiveContainer` showing time-series data for the current time range; one `<Line>` per unique `source_id`+`metric` combination derived from the current summary API response.
2. WHEN the Dashboard page loads or the time range changes, THE Dashboard page SHALL call `GET /api/metrics/timeseries` with `interval=5m`, the current `start` and `end` values as ISO 8601 UTC strings, and the `source_id[]` and `metric[]` values present in the current summary response, then re-render the chart using the returned rows.
3. THE Dashboard page SHALL render the trend chart using the same `<LineChart>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`, and `<ResponsiveContainer>` component pattern already used in the Explorer page — no new chart library or component is needed.
4. WHEN the timeseries fetch returns an empty array, THE Dashboard page SHALL show an empty-state message in place of the chart.
5. IF the timeseries fetch fails, THE Dashboard page SHALL show an inline error message with a retry button scoped to the chart area only, without affecting the summary cards or Latest Records table.

---

### Requirement 8: Ingestion Monitor Page

**User Story:** As an operator, I want a dedicated page showing recent ingestion activity so that I can verify data is flowing and spot errors quickly.

#### Acceptance Criteria

1. THE Dashboard SHALL add a route `/ingestion` rendering an Ingestion Monitor page.
2. THE navigation bar SHALL include a link to `/ingestion`.
3. THE Backend SHALL expose `GET /api/ingestion/summary` returning a JSON object with: `latest_success_at` (ISO 8601 UTC timestamp of the most recent `ingestion_log` row where `records_ingested > 0`), `last_batch_records` (the `records_ingested` value of that row), `last_batch_source` (the `source_id` of that row), `last_batch_method` (the `method` of that row); all fields are `null` if no successful ingestion exists.
4. THE Backend SHALL expose `GET /api/ingestion/errors` returning a JSON array of the 20 most recent `ingestion_log` rows where `error_message` is not null and not empty, ordered by `time` descending; each row contains `time`, `source_id`, `method`, `records_rejected`, and `error_message`.
5. WHEN the Ingestion Monitor page loads, THE page SHALL call `GET /api/ingestion/summary` and `GET /api/ingestion/errors` in parallel and display: a summary card showing `latest_success_at` formatted as a locale date-time string (or "Never" if null), `last_batch_records`, `last_batch_source`, and `last_batch_method`; and a table of recent errors below it.
6. WHILE either fetch is in progress, THE Ingestion Monitor page SHALL show a loading indicator.
7. THE Ingestion Monitor page SHALL include a "Refresh" button; WHEN clicked, THE page SHALL re-fetch both `GET /api/ingestion/summary` and `GET /api/ingestion/errors` and update the display.
8. WHEN the errors array is empty, THE Ingestion Monitor page SHALL display "No ingestion errors recorded" in place of the errors table.
9. IF either fetch fails, THE Ingestion Monitor page SHALL show an inline error message with a "Retry" button that re-fetches both endpoints.

---

### Requirement 9: Data Source Management Page

**User Story:** As an operator, I want to view and manage known data sources so that I can label, activate, or deactivate them from the UI.

#### Acceptance Criteria

1. THE Dashboard SHALL add a route `/sources` rendering a Data Source Management page.
2. THE navigation bar SHALL include a link to `/sources`.
3. THE Backend SHALL expose `GET /api/sources` returning a JSON array of known sources derived from distinct `source_id` values in `device_metrics`, merged with any overrides stored in `config/sources.json`; each item contains: `source_id`, `display_name` (from `sources.json` if present, otherwise equals `source_id`), `source_type` (from `sources.json` if present, otherwise the `source_type` tag from InfluxDB), `latest_at` (MAX time for that source as an ISO 8601 UTC string), `record_count` (COUNT of rows for that source as an integer), and `active` (boolean, default `true`).
4. THE Backend SHALL expose `POST /api/sources` accepting a JSON body with required fields `source_id`, `display_name`, and `source_type`; THE Backend SHALL write the entry to `config/sources.json` and return the created source object with HTTP 201; IF `source_id`, `display_name`, or `source_type` is missing or empty, THE Backend SHALL return HTTP 422; IF the `source_id` already exists in `sources.json`, THE Backend SHALL return HTTP 409.
5. THE Backend SHALL expose `PUT /api/sources/{source_id}` accepting a JSON body with at least one of the optional fields `display_name`, `source_type`, or `active`; THE Backend SHALL update the matching entry in `config/sources.json` and return the updated source object; IF the `source_id` is not found in `sources.json`, THE Backend SHALL create a new entry with that `source_id`.
6. THE Data Source Management page SHALL display the source list as a table with columns: display name, source type, latest data timestamp, record count, and active status.
7. WHILE the source list is loading, THE Data Source Management page SHALL show a loading indicator.
8. THE Data Source Management page SHALL include a search/filter text input; WHEN text is entered, THE page SHALL filter the displayed rows client-side (case-insensitive) to those whose `display_name` or `source_id` contains the entered text.
9. THE Data Source Management page SHALL include an "Add Source" form (or modal) with fields: source ID, display name, source type; WHEN submitted with all fields filled, THE page SHALL call `POST /api/sources` and refresh the source list; IF the response is HTTP 409, THE page SHALL display "Source ID already exists".
10. THE Data Source Management page SHALL allow inline editing of `display_name`, `source_type`, and the `active` toggle for each row; WHEN the user saves an edit, THE page SHALL call `PUT /api/sources/{source_id}` and refresh the list.
11. IF any backend call fails, THE Data Source Management page SHALL show an inline error message.

---

### Requirement 10: Threshold Configuration Page

**User Story:** As an operator, I want to view and edit metric thresholds from the UI so that I can adjust alert levels without editing JSON files manually.

#### Acceptance Criteria

1. THE Dashboard SHALL add a route `/thresholds` rendering a Threshold Configuration page.
2. THE navigation bar SHALL include a link to `/thresholds`.
3. THE Backend SHALL expose `GET /api/thresholds` returning the full contents of `config/thresholds.json` as a JSON array; each item contains `metric` (string), `warning_high` (number), and `critical_high` (number).
4. THE Backend SHALL expose `PUT /api/thresholds/{metric}` accepting a JSON body with at least one of `warning_high` (number, > 0) or `critical_high` (number, > 0); THE Backend SHALL enforce that `warning_high` is strictly less than `critical_high` after applying the update and SHALL return HTTP 422 with a descriptive error message if this constraint is violated; IF the metric is not found in `config/thresholds.json`, THE Backend SHALL return HTTP 404.
5. WHEN a valid `PUT /api/thresholds/{metric}` request is processed, THE Backend SHALL write the updated entry to `config/thresholds.json` and reload `app.state.thresholds` so the new thresholds take effect immediately; THE Backend SHALL return the updated threshold object.
6. WHEN the Threshold Configuration page loads, THE page SHALL call `GET /api/thresholds` and display the results as a table with columns: metric, warning_high, critical_high.
7. THE Threshold Configuration page SHALL allow inline editing of `warning_high` and `critical_high` for each row; WHEN the user saves an edit, THE page SHALL call `PUT /api/thresholds/{metric}` and re-call `GET /api/thresholds` to refresh the table.
8. IF the `warning_high` input value is greater than or equal to the `critical_high` input value, THE Threshold Configuration page SHALL display a validation error message and SHALL NOT submit the request.
9. IF the `GET /api/thresholds` fetch fails on load, THE Threshold Configuration page SHALL show an inline error message with a retry button.
10. IF the `PUT /api/thresholds/{metric}` call fails, THE Threshold Configuration page SHALL show an inline error message adjacent to the affected row.

---

### Requirement 11: Historical Data Page

**User Story:** As an analyst, I want a dedicated Historical Data page so that I can query and browse past metric data with a clear interface.

#### Acceptance Criteria

1. THE Dashboard SHALL add a route `/history` rendering a Historical Data page.
2. THE navigation bar SHALL include a link to `/history`.
3. THE Historical Data page SHALL provide the following filter controls: source multi-select (populated from `GET /api/sources`), metric multi-select (populated from distinct `metric` values in `GET /api/metrics/summary`), aggregation interval select with values `1m`, `5m`, `15m`, `30m`, `1h`, `6h`, `12h`, `1d`, start datetime input, and end datetime input.
4. THE Historical Data page SHALL default to: the alphabetically first `source_id` pre-selected, all metrics selected, interval `5m`, start = now minus 24 hours, end = now.
5. WHEN any filter value changes, THE Historical Data page SHALL call `GET /api/metrics/timeseries` with the current filter values and re-render the chart and table; WHEN no source or no metric is selected, THE page SHALL show a prompt to select at least one source and one metric without making a fetch.
6. THE Backend SHALL update `GET /api/metrics/timeseries` to include `unit` (string) and `status` (string: `ok`, `warning`, or `critical`) fields in each returned row; `status` is computed server-side using the same threshold logic as `GET /api/metrics/summary`; `unit` is the most recent `unit` value for the source/metric combination within the queried time range.
7. THE Historical Data page SHALL display a Recharts `<LineChart>` wrapped in `<ResponsiveContainer>` above the table, with time on the x-axis, `avg` on the y-axis, and one `<Line>` per `source_id`+`metric` combination.
8. THE Historical Data page SHALL display results in a table with columns: timestamp, source_id, metric, avg value, unit, and status.
9. WHEN the result is empty, THE Historical Data page SHALL show an empty-state message in place of both the chart and the table.
10. IF the fetch fails, THE Historical Data page SHALL show an inline error message with a "Retry" button.

---

### Requirement 12: Manual/Batch Ingestion Page

**User Story:** As an operator, I want to manually enter a single metric reading or upload a CSV batch so that I can load data without running the generator script.

#### Acceptance Criteria

1. THE Dashboard SHALL add a route `/ingest` rendering a Manual/Batch Ingestion page.
2. THE navigation bar SHALL include a link to `/ingest`.
3. THE Backend SHALL expose `GET /api/metrics/list` returning a JSON object with `sources` (array of distinct `source_id` strings from `device_metrics`) and `metrics` (array of distinct `metric` strings from `device_metrics`); used to populate the manual entry form dropdowns.
4. THE Manual/Batch Ingestion page SHALL include a form for single-record entry with fields: source_id (select populated from `GET /api/metrics/list`), metric (select populated from `GET /api/metrics/list`), value (number input), unit (text input), timestamp (datetime-local input, defaults to the current local datetime), and an optional tags field accepting comma-separated `key=value` pairs.
5. WHEN the single-record form is submitted with all required fields filled, THE page SHALL call `POST /api/ingest/manual`; WHEN the response is HTTP 200, THE page SHALL display "Record saved successfully"; WHEN the response is HTTP 422, THE page SHALL display the error detail returned by the backend.
6. THE Backend SHALL expose `POST /api/ingest/manual` accepting a JSON body with required fields `source_id` (non-empty string), `metric` (non-empty string), `value` (number), `unit` (non-empty string), optional `timestamp` (ISO 8601 string, defaults to server UTC time if absent), and optional `tags` (object); THE Backend SHALL write one row to `device_metrics` via line protocol and one `ingestion_log` row with `method=manual` and `records_ingested=1`; THE Backend SHALL return HTTP 422 with a descriptive `detail` field if `source_id`, `metric`, or `unit` is missing or empty, if `value` is non-numeric, or if `timestamp` is present but not a valid ISO 8601 datetime.
7. THE Manual/Batch Ingestion page SHALL include a CSV file upload section with a file input and a "Submit Batch" button; WHEN a file is selected and the button is clicked, THE page SHALL call `POST /api/ingest/batch` with the file as multipart form data and display "Ingested: {records_ingested}, Rejected: {records_rejected}".
8. THE Backend SHALL expose `POST /api/ingest/batch` accepting a multipart file upload (`content-type: text/csv`) where the CSV has a header row and columns `timestamp`, `source_id`, `metric`, `value`, `unit`; THE Backend SHALL parse each data row and reject rows with missing required columns, non-numeric `value`, or unparseable `timestamp`; THE Backend SHALL write all valid rows to `device_metrics` in a single line-protocol batch; THE Backend SHALL write one `ingestion_log` entry with `method=manual`, `records_ingested` (count of valid rows), `records_rejected` (count of rejected rows); IF all rows are rejected (`records_ingested=0`), THE Backend SHALL still return HTTP 200 with `records_ingested=0`; THE Backend SHALL return `{ records_ingested, records_rejected, errors[] }` where each `errors` element contains the 1-based row number and rejection reason.
9. IF `records_rejected` is greater than 0, THE Manual/Batch Ingestion page SHALL display the list of rejection errors (row number and reason) below the summary counts.

---

### Requirement 13: Sensor/Metric Detail Page

**User Story:** As a user, I want a detail page for each source/metric combination so that I can see a full breakdown of one sensor's readings without scrolling through the whole dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL add a route `/detail/:source_id/:metric` rendering a Sensor/Metric Detail page.
2. THE Dashboard page summary cards SHALL each link to `/detail/{source_id}/{metric}` for the corresponding card.
3. THE Sensor/Metric Detail page SHALL display a summary card showing: `source_id`, metric name, current value (latest), unit, threshold status (coloured `ok`/`warning`/`critical`), and latest timestamp.
4. THE Backend SHALL expose `GET /api/metrics/detail` accepting required query params `source_id` and `metric`, and optional `start` (ISO 8601), `end` (ISO 8601), and `interval` (one of the whitelisted values, default `5m`); returning a JSON object with `summary` (same fields as one `SummaryItem` from `GET /api/metrics/summary`) and `timeseries` (same row shape as `GET /api/metrics/timeseries`); returning HTTP 422 if `source_id` or `metric` is missing.
5. THE Sensor/Metric Detail page SHALL display preset time range buttons: "Last 1h", "Last 6h", "Last 24h", "Last 7d"; WHEN a preset is clicked, THE page SHALL update `start` and `end` accordingly and re-fetch.
6. THE Sensor/Metric Detail page SHALL display an interval selector with values `1m`, `5m`, `15m`, `1h`, `6h`, `1d`; the default selected interval SHALL be `5m`.
7. THE Sensor/Metric Detail page SHALL display a Recharts `<LineChart>` wrapped in `<ResponsiveContainer>` with time on the x-axis and `avg` on the y-axis for the selected source/metric.
8. THE Sensor/Metric Detail page SHALL display a stats row showing: min, max, avg, record count from `summary`, and the `warning_high` and `critical_high` threshold values for the metric (fetched from `GET /api/thresholds`).
9. WHEN the time range preset or interval selector changes, THE Sensor/Metric Detail page SHALL re-fetch `GET /api/metrics/detail` with updated parameters and update the chart and stats row.
10. IF the detail fetch fails, THE Sensor/Metric Detail page SHALL show an inline error message with a "Retry" button.

---

### Requirement 14: Report Page

**User Story:** As an analyst, I want to generate a printable report of selected metrics so that I can share results with stakeholders.

#### Acceptance Criteria

1. THE Dashboard SHALL add a route `/report` rendering a Report page.
2. THE navigation bar SHALL include a link to `/report`.
3. THE Report page SHALL include filter inputs: source select, metric multi-select, aggregation interval select (values: `1m`, `5m`, `15m`, `30m`, `1h`, `6h`, `12h`, `1d`), start datetime input, and end datetime input; THE Report page SHALL default to the last 24 hours, interval `5m`, and the first available source.
4. THE Report page SHALL include a "Generate Report" button; WHEN the button is clicked and at least one source and one metric are selected, THE page SHALL call `GET /api/metrics/summary` and `GET /api/metrics/timeseries` with the selected filters in parallel; WHEN either source or metric selection is empty, THE page SHALL display a validation message and SHALL NOT make any fetch.
5. WHEN both fetches complete successfully, THE Report page SHALL render: a summary stats section showing current, avg, min, max, and count per source/metric combination, a Recharts `<LineChart>` wrapped in `<ResponsiveContainer>`, and a data table of time-bucketed rows with columns: time, source_id, metric, avg, min, max, count.
6. THE Report page SHALL include a "Print" button; WHEN clicked, THE page SHALL call `window.print()`; THE Report page stylesheet SHALL include `@media print` rules that hide the navigation bar and filter controls and expand the chart and table to full width.
7. THE Report page SHALL include an "Export CSV" button; WHEN clicked, THE page SHALL generate a CSV string from the currently displayed table rows (using the same columns as the table) and trigger a browser file download with filename `report-{start}-{end}.csv`.
8. WHEN both fetches return empty arrays, THE Report page SHALL display an empty-state message in place of the chart and table.
9. IF either fetch fails, THE Report page SHALL show an inline error message with a "Retry" button that re-runs the Generate Report action.
10. THE Backend SHALL return HTTP 422 if required parameters `start`, `end`, or `interval` are missing from `GET /api/metrics/timeseries` when called from the Report page (this is already enforced by the existing endpoint; no backend change needed).
