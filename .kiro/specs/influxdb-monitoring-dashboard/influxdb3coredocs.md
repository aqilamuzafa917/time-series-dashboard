---
title: InfluxDB 3 Core documentation
description: InfluxDB 3 Core is an open source time series database designed and optimized for real-time and recent data. Learn how to use and leverage InfluxDB 3 in use cases such as edge data collection, IoT data, and events.
url: https://docs.influxdata.com/influxdb3/core/
product: InfluxDB 3 Core
type: section
pages: 13
estimated_tokens: 34403
child_pages:
  - url: https://docs.influxdata.com/influxdb3/core/write-data/
    title: Write data to InfluxDB 3 Core
  - url: https://docs.influxdata.com/influxdb3/core/visualize-data/
    title: Visualize data
  - url: https://docs.influxdata.com/influxdb3/core/tags/
    title: Related to "Tags"
  - url: https://docs.influxdata.com/influxdb3/core/release-notes/
    title: InfluxDB 3 Core release notes
  - url: https://docs.influxdata.com/influxdb3/core/reference/
    title: InfluxDB 3 Core reference documentation
  - url: https://docs.influxdata.com/influxdb3/core/query-data/
    title: Query data in InfluxDB 3 Core
  - url: https://docs.influxdata.com/influxdb3/core/plugins/
    title: Processing engine and Python plugins
  - url: https://docs.influxdata.com/influxdb3/core/object-storage/
    title: Configure object storage
  - url: https://docs.influxdata.com/influxdb3/core/install/
    title: Install InfluxDB 3 Core
  - url: https://docs.influxdata.com/influxdb3/core/get-started/
    title: Get started with InfluxDB 3 Core
  - url: https://docs.influxdata.com/influxdb3/core/api/
    title: InfluxDB HTTP API
  - url: https://docs.influxdata.com/influxdb3/core/admin/
    title: Administer InfluxDB 3 Core
publisher: InfluxData
canonical: https://docs.influxdata.com/influxdb3/core/
---

> [!Tip]
> Comparing InfluxDB 3 products or planning a migration from InfluxDB 1 or 2?
> See [Which InfluxDB 3 should I use?](/influxdb3/which-influxdb-3/) for a
> full decision guide.

InfluxDB 3 Core is a database built to collect, process, transform, and store event and time series data, and is ideal for use cases that require real-time ingest and fast query response times to build user interfaces, monitoring, and automation solutions.

Common use cases include:

* Monitoring sensor data
* Server monitoring
* Application performance monitoring
* Network monitoring
* Financial market and trading analytics
* Behavioral analytics

InfluxDB is optimized for scenarios where near real-time data monitoring is essential and queries need to return quickly to support user experiences such as dashboards and interactive user interfaces.

InfluxDB 3 Core is the InfluxDB 3 open source release.

Core’s feature highlights include:

* Diskless architecture with object storage support (or local disk with no dependencies)
* Fast query response times (under 10ms for last-value queries, or 30ms for distinct metadata)
* Embedded Python VM for plugins and triggers
* Parquet file persistence
* Compatibility with InfluxDB 1.x and 2.x write APIs

[Get started with InfluxDB 3 Core](/influxdb3/core/get-started/)

The Enterprise version adds the following features to Core:

* Historical query capability and single series indexing
* High availability
* Read replicas
* Enhanced security (coming soon)
* Row-level delete support (coming soon)
* Integrated admin UI (coming soon)

For more information, see how to [get started with InfluxDB 3 Enterprise](/influxdb3/enterprise/get-started/).


---

## Write data to InfluxDB 3 Core

Use tools like the

`influxdb3`CLI, Telegraf, and InfluxDB client libraries
to write time series data to InfluxDB 3 Core.[line protocol](#line-protocol)is the text-based format used to write data to InfluxDB.

> [!Tip]
> Tools are available to convert other formats (for example—[CSV](/influxdb3/core/write-data/use-telegraf/csv/)) to line protocol.

* [Choose the write endpoint for your workload](#choose-the-write-endpoint-for-your-workload)

  * [Timestamp precision across write APIs](#timestamp-precision-across-write-apis)

* [Line protocol](#line-protocol)

  * [Line protocol elements](#line-protocol-elements)

* [Write data to InfluxDB](#write-data-to-influxdb)

  * [Use InfluxDB client libraries to write data](#use-influxdb-client-libraries-to-write-data)
  * [Use the InfluxDB HTTP API to write data](#use-the-influxdb-http-api-to-write-data)
  * [Use Telegraf to write data](#use-telegraf-to-write-data)
  * [Use the influxdb3 CLI to write data](#use-the-influxdb3-cli-to-write-data)
  * [Best practices for writing data](#best-practices-for-writing-data)
  * [Troubleshoot issues writing data](#troubleshoot-issues-writing-data)

#### Choose the write endpoint for your workload

When creating new write workloads, use the[InfluxDB HTTP API `/api/v3/write_lp` endpoint](/influxdb3/core/write-data/http-api/v3-write-lp/)and [client libraries](/influxdb3/core/write-data/client-libraries/).

When bringing existing *v1* write workloads, use the InfluxDB 3 Core
HTTP API [`/write` endpoint](/influxdb3/core/api/write-data/#operation/PostV1Write).

When bringing existing *v2* write workloads, use the InfluxDB 3 Core
HTTP API [`/api/v2/write` endpoint](/influxdb3/core/api/write-data/).

**For Telegraf**, use the InfluxDB v1.x [`outputs.influxdb`](/telegraf/v1/output-plugins/influxdb/) or v2.x [`outputs.influxdb_v2`](/telegraf/v1/output-plugins/influxdb_v2/) output plugins.
See how to [use Telegraf to write data](/influxdb3/core/write-data/use-telegraf/).

## Timestamp precision across write APIs

InfluxDB 3 Core provides multiple write endpoints for compatibility with different InfluxDB versions.
The following table compares timestamp precision support across v1, v2, and v3 write APIs:

|    Precision     |v1 (`/write`)|v2 (`/api/v2/write`)|v3 (`/api/v3/write_lp`)|
|------------------|-------------|--------------------|-----------------------|
|**Auto detection**|    ❌ No     |        ❌ No        |  ✅ `auto` (default)   |
|   **Seconds**    |    ✅ `s`    |       ✅ `s`        |      ✅ `second`       |
| **Milliseconds** |   ✅ `ms`    |       ✅ `ms`       |    ✅ `millisecond`    |
| **Microseconds** |✅ `u` or `µ` |       ✅ `us`       |    ✅ `microsecond`    |
| **Nanoseconds**  |   ✅ `ns`    |       ✅ `ns`       |    ✅ `nanosecond`     |
|   **Minutes**    |    ✅ `m`    |        ❌ No        |         ❌ No          |
|    **Hours**     |    ✅ `h`    |        ❌ No        |         ❌ No          |
|   **Default**    | Nanosecond  |     Nanosecond     |  **Auto** (guessed)   |

* All write endpoints accept timestamps in line protocol format.
* InfluxDB 3 Core multiplies timestamps by the appropriate precision value to convert them to nanoseconds for internal storage.
* All timestamps are stored internally as nanoseconds regardless of the precision specified when writing.

## Line protocol

All data written to InfluxDB is written using[line protocol](/influxdb3/core/reference/line-protocol/), a text-based format
that lets you provide the necessary information to write a data point to InfluxDB.

### Line protocol elements

In InfluxDB, a point contains a table name, one or more fields, a timestamp,
and optional tags that provide metadata about the observation.

Each line of line protocol contains the following elements:

\* Required

* \* **table**: A string that identifies the
  table to store the data in.
* **tag set**: Comma-delimited list of key value pairs, each representing a tag.
  Tag keys and values are unquoted strings. *Spaces, commas, and equal characters
  must be escaped.*
* \* **field set**: Comma-delimited list of key value pairs, each
  representing a field.
  Field keys are unquoted strings. *Spaces and commas must be escaped.*Field values can be [strings](/influxdb3/core/reference/line-protocol/#string)(quoted),[floats](/influxdb3/core/reference/line-protocol/#float),[integers](/influxdb3/core/reference/line-protocol/#integer),[unsigned integers](/influxdb3/core/reference/line-protocol/#uinteger),
  or [booleans](/influxdb3/core/reference/line-protocol/#boolean).
* **timestamp**: [Unix timestamp](/influxdb3/core/reference/line-protocol/#unix-timestamp)associated with the data. InfluxDB supports up to nanosecond precision.*If the precision of the timestamp is not in nanoseconds, you must specify the
  precision when writing the data to InfluxDB.*

#### Line protocol element parsing

* **table**: Everything before the *first unescaped comma before the first
  whitespace*.
* **tag set**: Key-value pairs between the *first unescaped comma* and the *first
  unescaped whitespace*.
* **field set**: Key-value pairs between the *first and second unescaped whitespaces*.
* **timestamp**: Integer value after the *second unescaped whitespace*.
* Lines are separated by the newline character (`\n`).
  Line protocol is whitespace sensitive.

myTable,tag1=val1,tag2=val2 field1="v1",field2=1i 0000000000000000000

*For schema design recommendations, see[InfluxDB schema design](/influxdb3/core/write-data/best-practices/schema-design/).*

## Write data to InfluxDB

### [Use InfluxDB client libraries to write data](/influxdb3/core/write-data/client-libraries/)

Use InfluxDB API clients to write points as line protocol data to InfluxDB 3 Core.

### [Use the InfluxDB HTTP API to write data](/influxdb3/core/write-data/http-api/)

Use the `/api/v3/write_lp`, `/api/v2/write`, or `/write` HTTP API endpoints to write data to InfluxDB 3 Core.

### [Use Telegraf to write data](/influxdb3/core/write-data/use-telegraf/)

Use Telegraf to collect and write data to InfluxDB 3 Core.

### [Use the influxdb3 CLI to write data](/influxdb3/core/write-data/influxdb3-cli/)

Use the [`influxdb3` CLI](/influxdb3/core/reference/cli/influxdb3/) to write line protocol data to InfluxDB 3 Core.

### [Best practices for writing data](/influxdb3/core/write-data/best-practices/)

Learn about the recommendations and best practices for writing data to InfluxDB 3 Core.

### [Troubleshoot issues writing data](/influxdb3/core/write-data/troubleshoot/)

Troubleshoot issues writing data. Find response codes for failed writes. Discover how writes fail, from exceeding rate or payload limits, to syntax errors and schema conflicts.

[write](/influxdb3/core/tags/write/)[line protocol](/influxdb3/core/tags/line-protocol/)
| Precision | v1 ( /write ) | v2 ( /api/v2/write ) | v3 ( /api/v3/write_lp ) |
| --- | --- | --- | --- |
| Precision | v1 ( /write ) | v2 ( /api/v2/write ) | v3 ( /api/v3/write_lp ) |
| Auto detection | ❌ No | ❌ No | ✅  auto  (default) |
| Seconds | ✅  s | ✅  s | ✅  second |
| Milliseconds | ✅  ms | ✅  ms | ✅  millisecond |
| Microseconds | ✅  u  or  µ | ✅  us | ✅  microsecond |
| Nanoseconds | ✅  ns | ✅  ns | ✅  nanosecond |
| Minutes | ✅  m | ❌ No | ❌ No |
| Hours | ✅  h | ❌ No | ❌ No |
| Default | Nanosecond | Nanosecond | Auto  (guessed) |


---

## Visualize data

Use visualization tools like Grafana, Superset, and others to visualize time
series data queried from InfluxDB 3 Core.

### [Chronograf](/influxdb3/core/visualize-data/chronograf/)

Chronograf is a data visualization and dashboarding tool designed to visualize data in InfluxDB 1.x. Learn how to use Chronograf with InfluxDB 3 Core.

### [Grafana](/influxdb3/core/visualize-data/grafana/)

Install and run [Grafana](https://grafana.com/) to query and visualize data from InfluxDB 3 Core.

### [Power BI](/influxdb3/core/visualize-data/powerbi/)

Use Microsoft Power BI Desktop with the InfluxDB 3 custom connector to query and visualize data from InfluxDB 3 Core.

#### Related

* [Query data in InfluxDB 3 Core](/influxdb3/core/query-data/)


---

## Related to "Tags"

### [Administration](/influxdb3/core/tags/administration/)

### [Adtk](/influxdb3/core/tags/adtk/)

### [Aggregation](/influxdb3/core/tags/aggregation/)

### [AI](/influxdb3/core/tags/ai/)

### [Alerting](/influxdb3/core/tags/alerting/)

### [Analytics](/influxdb3/core/tags/analytics/)

### [Anomaly-Detection](/influxdb3/core/tags/anomaly-detection/)

### [API](/influxdb3/core/tags/api/)

### [Backup](/influxdb3/core/tags/backup/)

### [C#](/influxdb3/core/tags/c%23/)

### [Cache](/influxdb3/core/tags/cache/)

### [Catalog](/influxdb3/core/tags/catalog/)

### [Cli](/influxdb3/core/tags/cli/)

### [Client Libraries](/influxdb3/core/tags/client-libraries/)

### [Data-Lake](/influxdb3/core/tags/data-lake/)

### [Data-Processing](/influxdb3/core/tags/data-processing/)

### [Data-Write](/influxdb3/core/tags/data-write/)

### [Database](/influxdb3/core/tags/database/)

### [Databases](/influxdb3/core/tags/databases/)

### [Deadman](/influxdb3/core/tags/deadman/)

### [Developer Tools](/influxdb3/core/tags/developer-tools/)

### [Downsampling](/influxdb3/core/tags/downsampling/)

### [Enterprise](/influxdb3/core/tags/enterprise/)

### [Errors](/influxdb3/core/tags/errors/)

### [Evaluation](/influxdb3/core/tags/evaluation/)

### [Event-Detection](/influxdb3/core/tags/event-detection/)

### [Examples](/influxdb3/core/tags/examples/)

### [Export](/influxdb3/core/tags/export/)

### [Flight](/influxdb3/core/tags/flight/)

### [Flight API](/influxdb3/core/tags/flight-api/)

### [Flight Client](/influxdb3/core/tags/flight-client/)

### [Flight RPC](/influxdb3/core/tags/flight-rpc/)

### [Flight SQL](/influxdb3/core/tags/flight-sql/)

### [Forecasting](/influxdb3/core/tags/forecasting/)

### [Glossary](/influxdb3/core/tags/glossary/)

### [Go](/influxdb3/core/tags/go/)

### [GRPC](/influxdb3/core/tags/grpc/)

### [Iceberg](/influxdb3/core/tags/iceberg/)

### [Influxdb3](/influxdb3/core/tags/influxdb3/)

### [Influxql](/influxdb3/core/tags/influxql/)

### [Install](/influxdb3/core/tags/install/)

### [Integration](/influxdb3/core/tags/integration/)

### [Internals](/influxdb3/core/tags/internals/)

### [Java](/influxdb3/core/tags/java/)

### [JavaScript](/influxdb3/core/tags/javascript/)

### [Line Protocol](/influxdb3/core/tags/line-protocol/)

### [LLM](/influxdb3/core/tags/llm/)

### [Machine-Learning](/influxdb3/core/tags/machine-learning/)

### [MCP](/influxdb3/core/tags/mcp/)

### [Metrics](/influxdb3/core/tags/metrics/)

### [Migration](/influxdb3/core/tags/migration/)

### [Monitoring](/influxdb3/core/tags/monitoring/)

### [NodeJS](/influxdb3/core/tags/nodejs/)

### [Notifications](/influxdb3/core/tags/notifications/)

### [Object Storage](/influxdb3/core/tags/object-storage/)

### [Observability](/influxdb3/core/tags/observability/)

### [Official](/influxdb3/core/tags/official/)

### [Performance](/influxdb3/core/tags/performance/)

### [Plugin](/influxdb3/core/tags/plugin/)

### [Plugins](/influxdb3/core/tags/plugins/)

### [Powerbi](/influxdb3/core/tags/powerbi/)

### [Processing Engine](/influxdb3/core/tags/processing-engine/)

### [Prophet](/influxdb3/core/tags/prophet/)

### [Python](/influxdb3/core/tags/python/)

### [Query](/influxdb3/core/tags/query/)

### [Regular Expressions](/influxdb3/core/tags/regular-expressions/)

### [Restore](/influxdb3/core/tags/restore/)

### [Retention](/influxdb3/core/tags/retention/)

### [Rust](/influxdb3/core/tags/rust/)

### [S3](/influxdb3/core/tags/s3/)

### [Schemas](/influxdb3/core/tags/schemas/)

### [Security](/influxdb3/core/tags/security/)

### [SQL](/influxdb3/core/tags/sql/)

### [State-Tracking](/influxdb3/core/tags/state-tracking/)

### [Stateless](/influxdb3/core/tags/stateless/)

### [Statistics](/influxdb3/core/tags/statistics/)

### [Syntax](/influxdb3/core/tags/syntax/)

### [System Information](/influxdb3/core/tags/system-information/)

### [System-Metrics](/influxdb3/core/tags/system-metrics/)

### [Tables](/influxdb3/core/tags/tables/)

### [Telegraf](/influxdb3/core/tags/telegraf/)

### [Telemetry](/influxdb3/core/tags/telemetry/)

### [Thresholds](/influxdb3/core/tags/thresholds/)

### [Tokens](/influxdb3/core/tags/tokens/)

### [Transformation](/influxdb3/core/tags/transformation/)

### [Upgrade](/influxdb3/core/tags/upgrade/)

### [Visualization](/influxdb3/core/tags/visualization/)

### [Wal](/influxdb3/core/tags/wal/)

### [Window Functions](/influxdb3/core/tags/window-functions/)

### [Write](/influxdb3/core/tags/write/)


---

## InfluxDB 3 Core release notes

#### Upgrading to InfluxDB 3.10 is a one-way migration

The first time you start InfluxDB 3.10, it automatically upgrades the on-disk
catalog format from v2 to v3. After migration, 3.9.x and older
binaries are unable to read the new catalog, and fail to start on the same
cluster data.

Before upgrading, back up `{prefix}/catalogs/` and `{prefix}/_catalog_checkpoint`.
Restoring these objects is the only way to roll back to 3.9.x.

#### InfluxDB 3 Core and Enterprise relationship

InfluxDB 3 Enterprise is a superset of InfluxDB 3 Core.
All updates to Core are automatically included in Enterprise.
The Enterprise sections below only list updates exclusive to Enterprise.

## v3.10.2

### Core

Maintenance release: v3.10.2 Core includes only build and dependency updates—no user-facing changes.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific updates:

#### Bug fixes

* **Processing engine trigger cancellation**: Disabling or deleting a trigger now cancels its in-flight plugin run. Previously, a synchronous scheduled trigger whose plugin run was still executing could block trigger `disable` and `delete --force` operations until the run finished.
* Other bug fixes and performance improvements

## v3.9.7

### Core

Maintenance release: v3.9.7 Core includes only build and dependency updates—no user-facing changes.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific updates:

#### Bug fixes

* **Processing engine trigger cancellation**: Disabling or deleting a trigger now cancels its in-flight plugin run promptly. Previously, a synchronous scheduled trigger (the default, created without `--run-asynchronous`) whose plugin run was still executing could block trigger `disable`, `delete --force`, and even unrelated `create` operations until the run finished.
* Other bug fixes and performance improvements

## v3.10.1

### Core

#### Bug fixes

* **Snapshot manifest persistence**: Snapshot manifests are now persisted using multipart uploads, preventing errors when writing large manifests to object storage.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific updates:

#### Bug fixes

* **Compacted generation deduplication**: Overlapping compacted generations are now co-partitioned so the querier correctly deduplicates them.
* **Performance upgrade preview file access**: A canceled file fetch no longer cascades cancellation to other waiters with the storage engine upgrade (`--use-pacha-tree`).
* Other bug fixes and performance improvements

## v3.9.6

### Core

Maintenance release: v3.9.6 Core includes only build and dependency updates—no user-facing changes.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific updates:

#### Bug fixes

* **Compacted generation deduplication**: Overlapping compacted generations are now co-partitioned so the querier correctly deduplicates them.
* Other bug fixes and performance improvements

## v3.9.5

### Core

#### Bug fixes

* **Snapshot manifest persistence**: Snapshot manifests are now persisted using multipart uploads, preventing errors when writing large manifests to object storage.

### Enterprise

All Core updates are included in Enterprise.

## v3.10.0

### Core

#### Features

* **Catalog format upgrade (catalog v2 → v3)**: InfluxDB 3.10 automatically migrates the on-disk catalog to v3 format on first startup. The v3 catalog uses a compact binary record format (\~5–6x smaller than v2). Migration is automatic, idempotent, and crash-safe. **Back up `{prefix}/catalogs/` and `{prefix}/_catalog_checkpoint` before upgrading — the migration is one-way and 3.9.x binaries cannot read a v3 catalog.**

* **`influxdb3 debug catalog` command**: Inspect catalog state offline directly from object storage — no running server required. Subcommands: `list`, `snapshot`, `sequence`. Available in both Core and Enterprise.

* **`--max-concurrent-queries` flag**: Limit the number of queries that run concurrently. The limit can also be updated at runtime via `POST /api/v3/configure/query_concurrency_limit`.

* **Processing engine: cross-database queries**: Plugins can now read data from any database using the optional `database=` keyword argument on `influxdb3_local.query()`.

* **Processing engine: trigger lockdown flags**: Two new serve flags restrict plugin behavior. `--restrict-plugin-triggers-to` limits triggers to one or more of `wal`, `schedule`, or `request`. `--plugin-dir-only` (Enterprise) blocks plugin installation from any source other than the configured plugin directory.

* **`GET /ready` endpoint**: Returns `200 OK` when the server can reach object storage, or `503 Service Unavailable` when it cannot. Use this endpoint for readiness probes in load balancers and orchestration systems.

* **Observability: always-on heap profiling**: Heap profiling is now enabled at startup with negligible overhead (\~\<1% CPU). Access profiles at the existing pprof endpoint. To disable, set `MALLOC_CONF=prof:false` before starting the server.

* **Observability: per-request query traces**: Query tracing is now opt-in per request rather than enabled for all queries. This reduces trace volume for high-throughput deployments. See the monitoring documentation for how to enable tracing on individual requests.

* **Embedded Python updated to 3.13.14**: The Processing engine’s embedded Python is updated to 3.13.14, which includes upstream security fixes.

#### Bug fixes

* **`/api/v2/write` returns 403 for unauthorized tokens**: A valid token that lacks write permission on the target database now receives `403 Forbidden` instead of `401 Unauthorized`. Update client-side retry logic if it differentiates on these status codes.

* **Line-protocol parse errors return 400**: Malformed line protocol sent to the v1 `/write` or v2 `/api/v2/write` endpoints now returns `400 Bad Request` instead of `500 Internal Server Error`.

* **Invalid queries return HTTP 4xx**: A syntactically invalid query now returns an appropriate 4xx response rather than a 5xx error.

* **Query log records `query_text` on terminal phases**: The query log now includes the `query_text` field for queries that have reached a terminal phase.

#### Breaking changes

* **Catalog format upgrade (catalog v2 → v3) is one-way**: The first startup of InfluxDB 3.10 migrates the catalog to v3. After migration, 3.9.x binaries cannot start against the same object store. Back up `{prefix}/catalogs/` and `{prefix}/_catalog_checkpoint` before upgrading.

* **`influxdb3 write` output changed**: The write command now prints a throughput report on success instead of printing `success`. Scripts that parse the previous output should use `--quiet` (`-q`) to suppress all output.

* **`/api/v2/write` returns 403 instead of 401**: See bug fixes above. Clients that treat 401 and 403 differently must be updated.

* **Line-protocol parse errors return 400 instead of 500**: See bug fixes above.

* **Heap profiling is always on**: The \~\<1% CPU overhead is present by default. Opt out with `MALLOC_CONF=prof:false`.

* **Query traces are now per-request opt-in**: Observability pipelines that expect a trace for every query will see far fewer traces. Update your pipeline to request traces explicitly per query.

### Enterprise

All Core updates are included in Enterprise. The following updates are exclusive to Enterprise.

#### Features

* **Wide-tag support**: Tag IDs have been widened from u8 to u16. This raises the practical limit to thousands of tables and millions of columns per database. Available with the storage engine upgrade (`--use-pacha-tree`).

* **Row-level deletion**: Delete rows by time range and tag predicates using `influxdb3 delete rows` and `influxdb3 cancel row-delete`. Deletion is asynchronous — requests persist to object storage and the compactor applies them when rewriting run sets. Requires `--use-pacha-tree`. Monitor pending deletes with the `system.row_deletes` system table and 9 new `influxdb3_compactor_row_delete_*` metrics.

* **Runtime query-concurrency limit**: Adjust the maximum number of concurrent queries at runtime via the `/api/v3/configure/query_concurrency_limit` API — `GET` to read the current limit, `PUT` to set it, and `DELETE` to reset it to the startup default.

* **Backup and restore**: Create and manage full backups of Enterprise data with `influxdb3 create backup`, `influxdb3 status backup`, `influxdb3 show backups`, `influxdb3 delete backup`, and `influxdb3 cancel backup`. Initiate restore operations with `influxdb3 create restore`, `influxdb3 status restore`, `influxdb3 show restores`, and `influxdb3 cancel restore`. Backup and restore require `--use-pacha-tree` and a compactor node with an admin token. `create backup` refuses to overwrite an existing backup. Only one restore runs at a time across the cluster. After a restore completes, restart the node(s) for the in-memory view to update. API: `POST|GET|DELETE /api/v3/enterprise/backup[/{name}]` and `/api/v3/enterprise/restore[/{id}]`.

* **Bulk import**: Import generic (non-IOx) Parquet files into Enterprise with `influxdb3 import upload`. Map Parquet columns to InfluxDB types (`i64`, `u64`, `f64`, `bool`, `string`, `time`, `tag`) using `--column` flags. Unmapped columns become fields. List in-progress and completed import jobs with `influxdb3 import list`. The target database and table must exist before importing.

* **User auth and RBAC preview**: Multi-user authentication is now available as a preview feature. It is off by default (`--without-user-auth true`). When enabled, users authenticate with username and password to receive JWTs. Optional OAuth/OIDC is supported. Three built-in roles are available: Admin, Auditor, and Member.

  New CLI commands: `influxdb3 auth login`, `influxdb3 auth logout` (removes local credentials; does not revoke the signed JWT), `influxdb3 auth reset-password`, `influxdb3 create user`, `influxdb3 show users`, `influxdb3 update user`, `influxdb3 update user-roles`, `influxdb3 delete user`, `influxdb3 user require-password-reset`.

  New API endpoints:

  * `POST /api/v3/configure/user` — configure the initial user and create the operator token (also used by `influxdb3 manage init-admin`)
  * `POST /api/v3/authorize` — authenticate and obtain tokens
  * `POST /api/v3/authorize/refresh` — refresh an access token using a refresh token
  * `POST /api/v3/authorize/reset-password` — reset password using current credentials
  * `GET /api/v3/users`, `POST /api/v3/users` — list or create users (Enterprise)
  * `GET /api/v3/users/{id}`, `PATCH /api/v3/users/{id}`, `DELETE /api/v3/users/{id}` — get, update, or delete a user
  * `POST /api/v3/users/{id}/require-password-reset` — force password reset on next login
  * `GET /api/v3/users/{id}/roles`, `PUT /api/v3/users/{id}/roles` — read or replace a user’s roles
  * `GET /api/v3/roles` — list available roles
  * `GET /api/v3/auth/oauth/config` — discover OAuth configuration for device-code login

  New serve flags: `--without-user-auth`, `--jwt-key-id`, `--jwt-private-key`, `--jwt-issuer`, `--jwt-default-ttl-seconds`, `--oauth-issuer`, `--oauth-audience`, `--oauth-client-id`, `--oauth-scopes`, and `--rbac-authoring-disabled`.

  JWT keys must be PKCS#1 format (`openssl genrsa -traditional`). PKCS#8 format silently fails.

* **`influxdb3 manage` command group**: A new `manage` subcommand groups offline administrative operations: `influxdb3 manage init-admin`, `influxdb3 manage add-admin-token`, and `influxdb3 manage downgrade-to-parquet`. The `downgrade-to-parquet` command has moved from the top level to this group (the old spelling still works but prints a deprecation warning).

* **`influxdb3 remove node` command**: Remove a stopped node from the catalog. The compactor drains the node’s data before removal completes.

* **Service-level logs**: Structured query and storage logging is now available for observability. Configure log output format and levels using new `serve` flags.

* **Processing engine: internode gRPC for plugin writes**: Plugin writes from non-ingester nodes now route over internode gRPC rather than HTTP. This improves reliability in multi-node clusters. Requires `--internode-bind-addr` and `--conn-info` pointing at the gRPC port.

* **Licensing: object-store portability**: Enterprise licenses are no longer bound to the object-store configuration (type, bucket, endpoint, region). Validation now enforces only JWT signature, expiry, and licensed core count. You can move to a different bucket or store with the same license. When moving to an empty store, copy `{cluster-id}/commercial_license` from the old store or restart with `--license-file`.

* **Observability: 36 new compactor metrics**: 36 new `influxdb3_compactor_*` Prometheus metrics are now emitted. The primary health signal is `influxdb3_compactor_snapshot_lag_seconds`. A new `influxdb3_compaction_sequence_number` gauge tracks Parquet engine lag.

* **`influxdb3 debug object-store-check` command**: Validate S3-compatible backend semantics before putting a store into production. Checks that the backend correctly implements the operations that InfluxDB relies on.

#### Bug fixes

* **Compaction stability**: Several compaction bugs are fixed, including: compaction incorrectly setting `ingest_time` (causing deduplication and row delete bugs), compactor deadlock and write amplification, stopped compactor nodes blocking storage engine upgrades, and compactor orphaning gen1 files.

* **Tag case preserved during storage engine upgrades**: Tag names now preserve their original case when upgrading from Parquet to the new storage engine.

* **Bulk import memory usage reduced**: Peak memory during multi-file bulk import operations is significantly reduced.

* **Last cache delete deadlock fixed**: Deleting a last-value cache entry no longer causes a deadlock.

* **Row delete: aborted requests no longer processed**: Row delete requests that were aborted are no longer picked up by the compactor.

* **Table and database soft-delete name collision fixed**: Deleting a table or database and recreating it with the same name now works correctly.

* **TLS CA flag cleanup**: The `serve` command no longer accepts `--tls-ca` — it was non-functional there. Client commands (such as `query` and `write`) still accept `--tls-ca` to trust a custom or self-signed CA, and the flag is now consistently bound to the `INFLUXDB3_TLS_CA` environment variable across commands that were previously missing the binding. The `cancel row-delete` command now also accepts TLS options.

#### Breaking changes

* **`influxdb3 row-delete` → `influxdb3 delete rows` and `influxdb3 cancel row-delete`**: The old `row-delete` top-level command is removed. Update scripts to use the new `delete rows` and `cancel row-delete` subcommands.

* **`--conn-info` must point to the internode gRPC port for plugin writes**: In multi-node deployments, `--conn-info` must now reference the internode gRPC port (not the HTTP port) for plugin writes to reach the ingester. Update your cluster configuration before upgrading.

* **PT compactor stale-job timeout changed from 5 minutes to 1 hour**: Compactor jobs that appear stuck take up to 1 hour to be retried (previously 5 minutes). This reduces false-positive preemption on slow storage backends.

* **`--help-full` removed**: The `--help-full` flag is no longer available. Update any scripts that invoke `influxdb3 --help-full`.

* **`--package-manager` flag deprecated**: The `uv` package manager has been removed. `pip` is always used for plugin package installation. The `--package-manager` flag still starts the server but prints a deprecation warning. Remove it from your startup configuration.

* **`--pt-partition-count` renamed to `--pt-shard-count`**: The flag has no alias. Update any startup scripts that pass `--pt-partition-count` before upgrading to 3.10.

* **System table columns renamed**: The following columns in storage engine system tables are renamed. Update any dashboards or queries that reference the old names:

  * `partition_id` → `shard_id`
  * `partition_start_time` → `shard_start_time`

### Known issues

* **Row delete ghost rows**: After a row delete reports as “completed,” rows in the un-compacted ingest tail can survive and remain visible in queries. Workaround: re-issue the delete request after the affected data has been compacted and verify row counts.

* **`system.row_deletes` returns HTTP 500 for predicate-less `--all-time` deletes**: Querying the `system.row_deletes` system table after a delete issued with `--all-time` and no tag predicate may return HTTP 500. Workaround: use `GET /api/v3/row_delete_requests` instead.

* **Multi-shard data loss with `--use-pacha-tree`**: When the `--use-pacha-tree` storage engine is enabled, running with more than one shard (`--pt-shard-count > 1`) can cause data loss and a bootstrap deadlock. Workaround: keep `--pt-shard-count` at `1`.

* **Backup does not capture row-delete state**: Backup (beta) doesn’t currently pick up row-delete state files in object storage, so row deletes may persist across a restore.

* **Built-in roles grant narrower access than their descriptions suggest**: With the user authentication preview enabled, the Auditor and Member roles enforce less access than their role descriptions imply. Auditor users can list databases but cannot query data or read users or roles. Member users can read and write data but cannot list users or roles. Workaround: use an Admin-role user or an admin token for user and role management.

## v3.9.3

### Core

Maintenance release: v3.9.3 Core includes only build and dependency updates—no user-facing changes.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific updates:

#### Bug fixes

* **Query chunk deduplication**: Fixed an issue where the same file could reach the query path from both the compactor and the ingester, causing affected queries to abort.
* **Large file uploads during compaction**: Index files written during compaction now use adaptive uploads, preventing errors when writing large files to object storage.
* Other bug fixes and performance improvements

## v3.9.2

### Core

Maintenance release: v3.9.2 Core includes only build and dependency updates—no user-facing changes.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific updates:

#### Bug fixes

* **Gen1 file deduplication in compactor**: Fixed an issue where stale snapshot markers after `CompactionSummary` recovery could leave duplicate gen1 file entries and cause recompaction to abort.
* **Empty series key handling**: Fixed compaction for tables with no tags (empty series key).
* **Catalog token hash lookup**: Fixed a case where a failed `add_token` insert could leave a stale entry in the token hash lookup map. The lookup is now only updated after the underlying repository insert succeeds.
* Other bug fixes and performance improvements

## v3.9.1

### Core

Maintenance release: v3.9.1 Core includes only build and dependency updates—no user-facing changes.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific updates:

#### Features

* **Configurable compactor snapshot loading**: The number of snapshots the Parquet compactor loads at startup is now externally configurable, making it easier to tune recovery behavior for large deployments.

#### Bug Fixes and Performance Improvements

* **Performance Improvements**: This release features faster multi-source query merges and improved retention scheduling with the new Performance Update Preview.

* **Bug Fixes**: New updates fix issues where duplicate rows could be returned, Gen0 pruning safety, invalid status codes, and more.

## v3.9.0

### Core

#### Features

* **DataFusion upgrade**: Upgraded the embedded DataFusion query engine for more
  efficient query execution.

* **Python runtime upgrade**: Updated the bundled Python runtime for processing
  engine plugins with the latest security and bug fixes.

* **Product identity in HTTP responses**: Metrics, HTTP response headers, and
  metadata now distinguish between Core and Enterprise builds.

* **Database lifecycle hardening**: Background resources such as processing
  engine triggers are now cleanly decommissioned when a database is removed.

#### Bug fixes

* Additional bug fixes and performance improvements.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific features and fixes:

#### Features

* **Performance upgrade preview (beta)**: Preview major storage layer upgrades
  with the `--use-pacha-tree` flag. Includes a new columnar file format
  (`.pt` files), automatic Parquet migration with hybrid query mode,
  column families for efficient wide-table I/O, and bounded compaction.
  See [Performance upgrade preview](/influxdb3/enterprise/performance-preview/).

  > [!Warning]
> The performance upgrade preview is a beta feature for staging and test
> environments only. Do not use for production workloads.

* **Bulk data export**: Export compacted data as Parquet files for use with
  external tools. Use the new `influxdb3 export` subcommands to list databases,
  tables, and compacted time windows, then export selected data.
  See [Export to Parquet](/influxdb3/enterprise/performance-preview/#export-to-parquet).

* **Automatic distinct value caching**: Enable automatic DVC creation for`SHOW TAG VALUES` queries and the `tag_values()` SQL function with`--pt-enable-auto-dvc`. Max cardinality and refresh intervals are configurable.

* **Downgrade from performance preview**: Use`influxdb3 downgrade-to-parquet` to revert from the performance preview back
  to standard Parquet storage. Only data that existed before the upgrade
  (original Parquet files) is preserved.
  See [Downgrade to Parquet](/influxdb3/enterprise/performance-preview/#downgrade-to-parquet).

* **Non-interactive delete confirmation**: Use the `--yes` (`-y`) flag with
  delete commands to skip interactive confirmation prompts in automated and
  headless environments.

* **1MB default string field limit**: The maximum string field size defaults to
  1MB (previously 64KB) to support v1 migration workloads. Writes exceeding 1MB
  are rejected with a validation error.

#### Bug fixes

* **Compaction stability**: Multiple fixes to compaction scheduling, priority
  handling, and resource management for improved stability in multi-node
  clusters.

* Additional bug fixes and performance improvements.

## v3.8.4

### Core

No adjustments in this release.
Core remains on v3.8.3.

### Enterprise

#### Security

* **Read and write tokens can no longer delete databases**: Authorization now evaluates both the HTTP method and the request path. Previously, tokens with read or write access to a database could also issue delete requests.

#### Bug fixes

* **Stale compactor blocking startup**: Fixed an issue where stopped (stale) compactor entries in the catalog prevented new compactor nodes from starting. Enterprise now only considers currently running compactor nodes for conflict checks.

* **WAL replay**: Fixed an issue where combined-mode deployments silently ignored the `--wal-replay-concurrency-limit` flag and always used serial replay (concurrency of 1). The flag is now respected.

* Other bug fixes and performance improvements.

## v3.8.3

### Core

#### Bug fixes

* **WAL Buffer**: Fix an edge case that could potentially cause the WAL buffer to overflow

## v3.8.2

### Core

#### Features

* **TLS: Skip certificate verification in CLI subcommands**: Use the new `--tls-no-verify` flag with any CLI subcommand to skip TLS certificate verification when connecting to a server. Useful for testing environments with self-signed certificates.

* **Environment variable prefix standardization**: InfluxDB 3 specific environment variables use the `INFLUXDB3_` prefix for consistency. Legacy variable names continue to work (deprecated) for backward compatibility.

  > [!Important]
> `INFLUXDB3_LOG_FILTER` is currently ignored. To set the log filter, use `LOG_FILTER` or the `--log-filter` flag.

* **Parquet output format for `show` subcommands**: You can now save query results from the `show` subcommand directly to a Parquet file.

* **SQL: `tag_values()` table function**: Query distinct tag values using the new `tag_values()` SQL table function.

* **InfluxQL: `SHOW TAG VALUES` improvements**: In Enterprise deployments with auto-DVC enabled, `SHOW TAG VALUES` queries now use the Distinct Value Cache (DVC) automatically for improved performance. The `WHERE` clause is also now supported in `SHOW TAG VALUES` queries backed by the DVC, including compound predicates using `AND` and `OR`.

* **InfluxQL: `SHOW RETENTION POLICIES` returns duration**: The `duration` column in `SHOW RETENTION POLICIES` results now returns the configured retention period in InfluxDB v1-compatible format (for example, `168h0m0s`) instead of returning an empty value.

* **Ceph S3 backend support**: Use `--aws-s3-custom-backend ceph` with `influxdb3 serve` to connect to Ceph S3-compatible object storage. This enables ETag quote stripping required for conditional PUT operations with Ceph.

* **`_internal` database default retention**: The `_internal` system database now defaults to a 7-day retention period (previously infinite). Only admin tokens can modify retention on the `_internal` database.

* **Snapshot checkpointing for faster startup**: Use the new [`--checkpoint-interval`](/influxdb3/core/reference/config-options/#checkpoint-interval) serve option to periodically consolidate snapshots into monthly checkpoints. On startup, the server loads one to two checkpoints per calendar month instead of thousands of individual snapshots, reducing startup time for long-running servers.

#### Bug fixes

* **Sparse write handling for LVC, DVC, and Processing Engine**: Fixed incorrect behavior when processing sparse writes (writes that include only some fields from a table with multiple field families).

* **`influxdb3-launcher`: SSL certificate path on RHEL systems**: Fixed an issue where the `SSL_CERT_FILE` environment variable was not correctly set on affected RHEL-based
  systems when using the `influxdb3-launcher` script.

* Additional bug fixes and performance improvements.

### Enterprise

All Core updates are included in Enterprise.
Additional Enterprise-specific features and fixes:

#### Features

* **Data-only deletion for databases and tables**: Delete only the stored data from a database or table while preserving catalog entries, schema, and associated resources (tokens, triggers, caches, and processing engine configurations).

#### Bug fixes

* **Compaction stability**: Several fixes to compaction scheduling and processing to improve stability and correctness in multi-node clusters.

* **TableIndexCache initialization**: Fixed a concurrency bug that could cause incorrect behavior during `TableIndexCache` initialization.

* **Snapshot checkpointing**: Fixed an issue where snapshot checkpoint cleanup was not running as a background task.

## v3.8.0

### Core

#### Features

* **Linux Service Management**: Run InfluxDB 3 as a managed system service on Linux ([#27026](https://github.com/influxdata/influxdb/pull/27026)):
  * Use `influxdb3-launcher` script to initialize the service
  * Deploy with systemd on modern Linux distributions
  * Deploy with SysV init on legacy systems
  * Customize service behavior with configuration files

#### Bug fixes

* **CLI**: View only active databases and tables when running `SHOW RETENTION`
* **Database operations**: Receive an error when attempting to delete tables from an already-deleted database
* **Retention Policy**: Receive an error when attempting to modify retention settings on deleted databases

#### Security

* **Processing Engine**: Run processing engine plugins with Python 3.13.11, which includes security and bug fixes ([#27014](https://github.com/influxdata/influxdb/pull/27014))

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

#### Bug fixes

* **Table Limits**: Delete tables without affecting your table limit quota
* **Retention Policy**: Receive an error when attempting to modify retention settings on deleted tables

## v3.7.0

### Core

#### Features

* **HTTP API Enhancements**:
  * All HTTP responses now include a `cluster-uuid` header containing the catalog UUID, enabling clients to identify specific cluster instances programmatically
  * HTTP API now supports multi-member gzip payloads enabling batch operations

* **CLI Commands**:
  * The new `influxdb3 show retention` command displays effective retention periods for each table, showing whether retention is set at the database-level or table-level with human-readable formatting (for example, “7d”, “24h”)

#### Bug fixes

* **Authorization**: Fixed multi-database permission handling to properly authorize queries across multiple databases.

* **General Improvements**: Several key bug fixes and performance improvements.

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

* **General Improvements**: Several key bug fixes and performance improvements.

## v3.6.0

### Core

#### Features

* **Quick-Start Developer Experience**:
  * `influxdb3` now supports running without arguments for instant database startup, automatically generating IDs and storage flags values based on your system’s setup.

* **Processing Engine**:
  * Plugins now support multiple files instead of single-file limitations.
  * When creating a trigger, you can upload a plugin directly from your local machine using the `--upload` flag.
  * Existing plugin files can now be updated at runtime without recreating triggers.
  * New `system.plugin_files` table and `show plugins` CLI command now provide visibility into all loaded plugin files.
  * Custom plugin repositories are now supported via `--plugin-repo` CLI flag.
  * Python package installation can now be disabled with `--package-manager disabled` for locked-down environments.
  * Plugin file path validation now prevents directory traversal attacks by blocking relative and absolute path patterns.

#### Bug fixes

* **Write API**: Fixed abbreviated precision values (`ns`, `ms`, `us`, `s`) to work correctly with the `/api/v3/write_lp` endpoint. Previously, only full precision names (`nanosecond`, `microsecond`, `millisecond`, `second`) worked.
* **Token management**: Token display now works correctly for hard-deleted databases

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

#### Operational improvements

* **Storage engine**: improvements to the Docker-based license service development environment
* **Catalog consistency**: Node management fixes for catalog edge cases
* Other enhancements and performance improvements

## v3.5.0

### Core

#### Features

* **Custom Plugin Repository**:
  * Use the `--plugin-repo` option with `influxdb3 serve` to specify custom plugin repositories. This enables loading plugins from personal repos or disabling remote repo access.

#### Bug fixes

* **Database reliability**:
  * Table index updates now complete atomically before creating new indices, preventing race conditions that could corrupt database state ([#26838](https://github.com/influxdata/influxdb/pull/26838))
  * Delete operations are now idempotent, preventing errors during object store cleanup ([#26839](https://github.com/influxdata/influxdb/pull/26839))

* **Write path**:
  * Write operations to soft-deleted databases are now rejected, preventing data loss ([#26722](https://github.com/influxdata/influxdb/pull/26722))

* **Runtime stability**:
  * Fixed a compatibility issue that could cause deadlocks for concurrent operations ([#26804](https://github.com/influxdata/influxdb/pull/26804))

* Other bug fixes and performance improvements

#### Security & Misc

* Sensitive environment variable values are now hidden in CLI output and log messages ([#26837](https://github.com/influxdata/influxdb/pull/26837))

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

#### Features

* **Cache optimization**:
  * Last Value Cache (LVC) and Distinct Value Cache (DVC) now populate on creation and only on query nodes, reducing resource usage on ingest nodes.

#### Bug fixes

* **Object store reliability**:
  * Object store operations now use retryable mechanisms with better error handling

#### Operational improvements

* **Compaction optimizations**:
  * Compaction producer now waits 10 seconds before starting cycles, reducing resource contention during startup
  * Enhanced scheduling algorithms distribute compaction work more efficiently across available resources

* **System tables**:
  * System tables now provide consistent data across different node modes (ingest, query, compact), enabling better monitoring in multi-node deployments

## v3.4.2

### Core

#### Bug fixes

* **Database reliability**:
  * TableIndexCache initialization and ObjectStore improvements
  * Persister doesn’t need a TableIndexCache

#### HTTP API changes

* **v2 write API**: Standardized `/api/v2/write` error response format to match other InfluxDB editions. Error responses now use the consistent format: `{"code": "<code>", "message": "<detailed message>"}` ([#26787](https://github.com/influxdata/influxdb/pull/26787))

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

#### Features

* **Storage engine**: Pass in root CA and disable TLS verify for object store
* **Support**: Add support for manually stopping a node

#### Bug fixes

* **Bug fix**: Generation detail path calculation panic
* **Database reliability**: Pass TableIndexCache through to PersistedFiles

#### Operational improvements

* **Compaction optimizations**:
  * Compaction cleaner now waits for 1 hour by default (previously 10 minutes)
  * Compaction producer now waits for 10 seconds before starting compaction cycle

* **Catalog synchronization**: Background catalog update is synchronized every 1 second (previously 10 seconds)
* **Logging improvements**: Added clear logging to indicate what sequence is persisted on producer side and what is consumed by the consumer side

## v3.4.1

### Core

#### Bug Fixes

* Upgrading from 3.3.0 to 3.4.x no longer causes possible catalog migration issues ([#26756](https://github.com/influxdata/influxdb/pull/26756))

## v3.4.0

### Core

#### Features

* **Token Provisioning**:
  * Generate admin tokens offline and use them when starting the database if tokens do not already exist.
    This is meant for automated deployments and containerized environments.
    ([#26734](https://github.com/influxdata/influxdb/pull/26734))

* **Azure Endpoint**:
  * Use the `--azure-endpoint` option with `influxdb3 serve` to specify the Azure Blob Storage endpoint for object store connections. ([#26687](https://github.com/influxdata/influxdb/pull/26687))

* **No\_Sync via CLI**:
  * Use the `--no-sync` option with `influxdb3 write` to skip waiting for WAL persistence on write and immediately return a response to the write request. ([#26703](https://github.com/influxdata/influxdb/pull/26703))

#### Bug Fixes

* Validate tag and field names when creating tables ([#26641](https://github.com/influxdata/influxdb/pull/26641))
* Using GROUP BY twice on the same column no longer causes incorrect data ([#26732](https://github.com/influxdata/influxdb/pull/26732))

#### Operational and security improvements

* Introduce a new `v2` catalog path structure:

  * `catalog/v2/logs/` directory for log files (instead of `catalogs/`)
  * `catalog/v2/snapshot` file for checkpoint/snapshot files (instead of `_catalog_checkpoint`)

* Reduce verbosity of the TableIndexCache log. ([#26709](https://github.com/influxdata/influxdb/pull/26709))

* WAL replay concurrency limit defaults to number of CPU cores, preventing possible OOMs. ([#26715](https://github.com/influxdata/influxdb/pull/26715))

* Remove unsafe signal\_handler code. ([#26685](https://github.com/influxdata/influxdb/pull/26685))

* Upgrade Python version to 3.13.7-20250818. ([#26686](https://github.com/influxdata/influxdb/pull/26686), [#26700](https://github.com/influxdata/influxdb/pull/26700))

* Tags with `/` in the name no longer break the primary key.

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

#### Features

* **Token Provisioning**:

  * Generate *resource* and *admin* tokens offline and use them when starting the database.

* Select a home or trial license without using an interactive terminal.
  Use `--license-type` [home | trial | commercial] option to the `influxdb3 serve` command to automate the selection of the license type.

#### Bug Fixes

* Don’t initialize the Processing Engine when the specified `--mode` does not require it.
* Don’t panic when `INFLUXDB3_PLUGIN_DIR` is set in containers without the Processing Engine enabled.

## v3.3.0

### Core

#### Features

* **Database management**:
  * Add `influxdb_schema` system table for database schema management ([#26640](https://github.com/influxdata/influxdb/pull/26640))
  * Add `system.processing_engine_trigger_arguments` table for trigger configuration management ([#26604](https://github.com/influxdata/influxdb/pull/26604))
  * Add write path logging to capture database name and client IP address for failed writes. The IP address is fetched from `x-forwarded-for` header if available, `x-real-ip` if available, or remote address as reported by TlsStream/AddrStream ([#26616](https://github.com/influxdata/influxdb/pull/26616))

* **Storage engine**: Introduce `TableIndexCache` for efficient automatic cleanup of expired gen1 Parquet files based on retention policies and hard deletes. Includes new background loop for applying data retention policies with configurable intervals and comprehensive purge operations for tables and retention period expired data ([#26636](https://github.com/influxdata/influxdb/pull/26636))
* **Authentication and security**: Add admin token recovery server that allows regenerating lost admin tokens without existing authentication. Includes new `--admin-token-recovery-http-bind` option for running recovery server on separate port, with automatic shutdown after successful token regeneration ([#26594](https://github.com/influxdata/influxdb/pull/26594))
* **Build process**: Allow passing git hash via environment variable in build process ([#26618](https://github.com/influxdata/influxdb/pull/26618))

#### Bug Fixes

* **Database reliability**:
  * Fix URL-encoded table name handling failures ([#26586](https://github.com/influxdata/influxdb/pull/26586))
  * Allow hard deletion of existing soft-deleted schema ([#26574](https://github.com/influxdata/influxdb/pull/26574))

* **Authentication**: Fix AWS S3 API error handling when tokens are expired ([#1013](https://github.com/influxdata/influxdb/pull/1013))
* **Query processing**: Set nanosecond precision as default for V1 query API CSV output ([#26577](https://github.com/influxdata/influxdb/pull/26577))
* **CLI reliability**:
  * Mark `--object-store` CLI argument as explicitly required ([#26575](https://github.com/influxdata/influxdb/pull/26575))
  * Add help text for the new update subcommand ([#26569](https://github.com/influxdata/influxdb/pull/26569))

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

#### Features

* **License management**:
  * Improve licensing suggestions for Core users
  * Update license information handling

* **Database management**:
  * Enhance `TableIndexCache` with advanced features beyond Core’s basic cleanup: persistent snapshots, object store integration, merge operations for distributed environments, and recovery capabilities for multi-node clusters
  * Add `TableIndexSnapshot`, `TableIndex`, and `TableIndices` types for distributed table index management

* **Support**: Include contact information in trial error messages
* **Telemetry**: Send onboarding telemetry before licensing setup

#### Bug Fixes

* **Compaction stability**:
  * Fix compactor re-compaction issues on max generation data overwrite
  * Fix compactor to treat “all” mode as “ingest” mode

* **Database reliability**:
  * Add missing system tables to compact mode

* **Storage integrity**: Update Parquet file paths to use 20 digits of 0-padding
* **General fixes**:
  * Only load processing engine in correct server modes
  * Remove load generator alias clash

## v3.2.1

### Core

#### Features

* **Enhanced database lifecycle management**:
  * Allow updating the hard deletion date for already-deleted databases and tables, providing flexibility in managing data retention and compliance requirements
  * Include `hard_deletion_date` column in `_internal` system tables (`databases` and `tables`) for better visibility into data lifecycle and audit trails

#### Bug Fixes

* **CLI improvements**:
  * Added help text for the new `update` subcommand for database and table update features ([#26569](https://github.com/influxdata/influxdb/pull/26569))
  * `--object-store` and storage configuration parameters are required for the `serve` command ([#26575](https://github.com/influxdata/influxdb/pull/26575))

* **Query processing**: Fixed V1-compatible `/query` HTTP API endpoint to correctly default to nanosecond precision (`ns`) for CSV output, ensuring backward compatibility with InfluxDB 1.x clients and preventing data precision loss ([#26577](https://github.com/influxdata/influxdb/pull/26577))
* **Database reliability**: Fixed issue preventing hard deletion of soft-deleted databases and tables, enabling complete data removal for compliance and storage management needs ([#26574](https://github.com/influxdata/influxdb/pull/26574))

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

#### Features

* **License management improvements**: New `influxdb3 show license` command displays detailed license information including type, expiration date, and resource limits, making it easier to monitor license status and compliance

#### Bug Fixes

* **API stability**: Fixed HTTP API trigger specification to use the correct `"request:REQUEST_PATH"` syntax, ensuring proper request-based trigger configuration for processing engine workflows

## v3.2.0

**Core**: revision 1ca3168bee  
**Enterprise**: revision 1ca3168bee

### Core

#### Features

* **Hard delete for databases and tables**: Permanently delete databases and tables, enabling complete removal of data structures for compliance and storage management ([#26553](https://github.com/influxdata/influxdb/pull/26553))
* **AWS credentials auto-reload**: Support dynamic reloading of ephemeral AWS credentials from files, improving security and reliability when using AWS services ([#26537](https://github.com/influxdata/influxdb/pull/26537))
* **Database retention period support**: Add retention period support for databases via CLI commands (`create database` and `update database` commands) and HTTP APIs ([#26520](https://github.com/influxdata/influxdb/pull/26520)):
  * New CLI command: `update database --retention-period`

* **Configurable lookback duration**: Users can specify lookback duration for PersistedFiles buffer, providing better control over query performance ([#26528](https://github.com/influxdata/influxdb/pull/26528))
* **WAL replay concurrency control**: Add concurrency limits for WAL (Write-Ahead Log) replay to improve startup performance and resource management ([#26483](https://github.com/influxdata/influxdb/pull/26483))
* **Enhanced write path**: Separate write path executor with unbounded memory for improved write performance ([#26455](https://github.com/influxdata/influxdb/pull/26455))

#### Bug Fixes

* **WAL corruption handling**: Handle corrupt WAL files during replay without panic, improving data recovery and system resilience ([#26556](https://github.com/influxdata/influxdb/pull/26556))
* **Database naming validation**: Disallow underscores in database names when created via API to ensure consistency ([#26507](https://github.com/influxdata/influxdb/pull/26507))
* **Object store cleanup**: Automatic intermediate directory cleanup for file object store, preventing storage bloat ([#26480](https://github.com/influxdata/influxdb/pull/26480))

#### Additional Updates

* Track generation 1 duration in catalog for better performance monitoring ([#26508](https://github.com/influxdata/influxdb/pull/26508))
* Add retention period support to the catalog ([#26479](https://github.com/influxdata/influxdb/pull/26479))
* Update help text for improved user experience ([#26509](https://github.com/influxdata/influxdb/pull/26509))

### Enterprise

All Core updates are included in Enterprise. Additional Enterprise-specific features and fixes:

#### Features

* **License management improvements**:
  * New `influxdb3 show license` command to display current license information

* **Table-level retention period support**: Add retention period support for individual tables in addition to database-level retention, providing granular data lifecycle management
  * New CLI commands: `create table --retention-period` and `update table --retention-period`
  * Set or clear table-specific retention periods independent of database settings

* **Compaction improvements**:
  * Address compactor restart issues for better reliability
  * Track compacted generation durations in catalog for monitoring
  * Disable Parquet cache for ingest mode to optimize memory usage

#### Bug Fixes

* **Query optimization**: Correctly partition query chunks into generations for improved performance
* **Data integrity**: Don’t delete generation 1 files as part of compaction process
* **License handling**: Trim whitespace from license file contents after reading to prevent validation issues

## v3.1.0

**Core**: revision `482dd8aac580c04f37e8713a8fffae89ae8bc264`

**Enterprise**: revision `2cb23cf32b67f9f0d0803e31b356813a1a151b00`

### Core

#### Token and Security Updates

* Named admin tokens can now be created, with configurable expirations
* `health`, `ping`, and `metrics` endpoints can now be opted out of authorization
* `Basic $TOKEN` is now supported for all APIs
* Additional info available when creating a new token
* Additional info available when starting InfuxDB using `--without-auth`

#### Additional Updates

* New catalog metrics available for count operations
* New object store metrics available for transfer latencies and transfer sizes
* New query duration metrics available for Last Value caches
* `/ping` API now contains versioning headers
* Other performance improvements

#### Fixes

* New tags are now backfilled with NULL instead of empty strings
* Bitcode deserialization error fixed
* Series key metadata not persisting to Parquet is now fixed
* Other general fixes and corrections

### Enterprise

#### Token and Security Updates

* Resource tokens now use resource names in `show tokens`
* Tokens can now be granted `CREATE` permission for creating databases

#### Additional Updates

* Last value caches reload on restart
* Distinct value caches reload on restart
* Other performance improvements
* Replaces remaining “INFLUXDB\_IOX” Dockerfile environment variables with the following:
  * `ENV INFLUXDB3_OBJECT_STORE=file`
  * `ENV INFLUXDB3_DB_DIR=/var/lib/influxdb3`

#### Fixes

* Improvements and fixes for license validations
* False positive fixed for catalog error on shutdown
* UX improvements for error and onboarding messages
* Other general fixes and corrections

## v3.0.3

**Core**: revision 384c457ef5f0d5ca4981b22855e411d8cac2688e

**Enterprise**: revision 34f4d28295132b9efafebf654e9f6decd1a13caf

### Core

#### Fixes

* Prevent operator token, `_admin`, from being deleted.

### Enterprise

#### Fixes

* Fix object store info digest that is output during onboarding.
* Fix issues with false positive catalog error on shutdown.
* Fix licensing validation issues.
* Other fixes and performance improvements.

## v3.0.2

**Core**: revision d80d6cd60049c7b266794a48c97b1b6438ac5da9

**Enterprise**: revision e9d7e03c2290d0c3e44d26e3eeb60aaf12099f29

### Core

#### Security updates

* Generate testing TLS certificates on the fly.
* Set the TLS CA via the INFLUXDB3\_TLS\_CA environment variable.
* Enforce a minimum TLS version for enhanced security.
* Allow CORS requests from browsers.

#### General updates

* Support the `--format json` option in the token creation output.
* Remove the Last Values Cache size limitation to improve performance and flexibility.
* Incorporate additional performance improvements.

#### Fixes

* Fix a counting bug in the distinct cache.
* Fix how the distinct cache handles rows with null values.
* Fix handling of `group by` tag columns that use escape quotes.
* Sort the IOx table schema consistently in the `SHOW TABLES` command.

### Enterprise

#### Updates

* Introduce a command and system table to list cluster nodes.
* Support multiple custom permission argument matches.
* Improve overall performance.

#### Fixes

* Initialize the object store only once.
* Prevent the Home license server from crashing on restart.
* Enforce the `--num-cores` thread allocation limit.

## v3.0.1

**Core**: revision d7c071e0c4959beebc7a1a433daf8916abd51214

**Enterprise**: revision 96e4aad870b44709e149160d523b4319ea91b54c

### Core

#### Updates

* TLS CA can now be set with an environment variable: `INFLUXDB3_TLS_CA`
* Other general performance improvements

#### Fixes

* The `--tags` argument is now optional for creating a table, and additionally now requires at least one tag *if* specified

### Enterprise

#### Updates

* Catalog limits for databases, tables, and columns are now configurable using `influxdb3 serve` options:
  * `--num-database-limit`
  * `--num-table-limit`
  * `--num-total-columns-per-table-limit`

* Improvements to licensing prompts for clarity
* Other general performance improvements

#### Fixes

* **Home** license thread count log errors

## v3.0.0

### Core

#### Breaking Changes

* **Parquet cache configuration**: Replaced `--parquet-mem-cache-size-mb` option with `--parquet-mem-cache-size`. The new option accepts values in megabytes (as an integer) or as a percentage of total available memory (for example, `20%`). The default value changed from `1000` MB to `20%` of total available memory. The environment variable `INFLUXDB3_PARQUET_MEM_CACHE_SIZE_MB` was replaced with `INFLUXDB3_PARQUET_MEM_CACHE_SIZE`. ([#26023](https://github.com/influxdata/influxdb/pull/26023))
* **Memory settings updates**:
  * Force snapshot memory threshold now defaults to `50%` of available memory
  * DataFusion execution memory pool now defaults to `20%` of available memory

#### General Updates

* Performance and reliability improvements.

### Enterprise

#### Token Support

* Authorization is now turned on by default.
* Token support for database level permissions are now available.
* Token support for system level queries are now available.

#### General Updates

* You can now use Commercial, Trial, and At-Home licenses.

## v3.0.0-0.beta.3

**Core**: revision f881c5844bec93a85242f26357a1ef3ebf419dd3

**Enterprise**: revision 6bef9e700a59c0973b0cefdc6baf11583933e262

### Core

#### General Improvements

* InfluxDB 3 now supports graceful shutdowns when sending the interrupt signal to the service.

#### Bug fixes

* Empty batches in JSON format results are now handled properly
* The Processing Engine now properly extracts data from DictionaryArrays

### Enterprise

##### Multi-node improvements

* Query nodes now automatically detect new ingest nodes

#### Bug fixes

* Several fixes for compaction planning and processing
* The Processing Engine now properly extracts data from DictionaryArrays

## v3.0.0-0.beta.2

**Core**: revision 033e1176d8c322b763b4aefb24686121b1b24f7c

**Enterprise**: revision e530fcd498c593cffec2b56d4f5194afc717d898

This update brings several backend performance improvements to both Core and Enterprise in preparation for additional new features over the next several weeks.

## v3.0.0-0.beta.1

### Core

#### Features

##### Query and storage enhancements

* New ability to stream response data for CSV and JSON queries, similar to how JSONL streaming works
* Parquet files are now cached on the query path, improving performance
* Query buffer is incrementally cleared when snapshotting, lowering memory spikes

##### Processing engine improvements

* New Trigger Types:
  * *Scheduled*: Run Python plugins on custom, time-defined basis
  * *Request*: Call Python plugins via HTTP requests

* New in-memory cache for storing data temporarily; cached data can be stored for a single trigger or across all triggers
* Integration with virtual environments and install packages:
  * Specify Python virtual environment via CLI or `VIRTUAL_ENV` variable
  * Install packages or a `requirements.txt`

* Python plugins are now implemented through triggers only. Simply create a trigger that references your Python plugin code file directly
* Snapshots are now persisted in parallel, improving performance by running jobs simultaneously, rather than sequentially
* Write to logs from within the Processing Engine

##### Database and CLI improvements

* You can now specify the precision on your timestamps for writes using the `--precision` flag. Includes nano/micro/milli/seconds (ns/us/ms/s)
* Added a new `show` system subcommand to display system tables with different options via SQL (default limit: 100)
* Clearer table creation error messages

##### Bug fixes

* If a database was created and the service was killed before any data was written, the database would not be retained
* A last cache with specific “value” columns could not be queried
* Running CTRL-C no longer stopped an InfluxDB process, due to a Python trigger
* A previous build had broken JSON queries for RecordBatches
* There was an issue with the distinct cache that caused panics

#### Parameter changes

For Core and Enterprise, there are parameter changes for simplicity:

|         Old Parameter         |New Parameter|
|-------------------------------|-------------|
|`--writer-id`  <br/>`--host-id`| `--node-id` |

### Enterprise features

#### Cluster management

* Nodes are now associated with *clusters*, simplifying compaction, read replication, and processing
* Node specs are now available for simpler management of cache creations

#### Mode types

* Set `ingest`, `query`, `compact`, and `process` individually per node

### Enterprise parameter changes

For Enterprise, additional parameters for the `serve` command have been consolidated for simplicity:

|                    Old Parameter                     |             New Parameter             |
|------------------------------------------------------|---------------------------------------|
|`--read-from-node-ids`  <br/>`--compact-from-node-ids`|            `--cluster-id`             |
|     `--run-compactions`  <br/>`--mode=compactor`     |`--mode=compact`  <br/>`--mode=compact`|

In addition to the above changes, `--cluster-id` is now a required parameter for all new instances.

#### Related

* [Get started with InfluxDB 3 Core](/influxdb3/core/get-started/)
| Old Parameter | New Parameter |
| --- | --- |
| Old Parameter | New Parameter |
| --writer-id --host-id | --node-id |

| Old Parameter | New Parameter |
| --- | --- |
| Old Parameter | New Parameter |
| --read-from-node-ids --compact-from-node-ids | --cluster-id |
| --run-compactions --mode=compactor | --mode=compact --mode=compact |


---

## InfluxDB 3 Core reference documentation

### [InfluxDB 3 Core configuration options](/influxdb3/core/reference/config-options/)

InfluxDB 3 Core lets you customize your server configuration by using `influxdb3 serve` command options or by setting environment variables.

### [Command line tools](/influxdb3/core/reference/cli/)

View command line tools used to manage and interact with InfluxDB 3 Core.

### [Line protocol reference](/influxdb3/core/reference/line-protocol/)

InfluxDB 3 Core uses line protocol to write data points. It is a text-based format that provides the table, tag set, field set, and timestamp of a data point.

### [Processing engine reference](/influxdb3/core/reference/processing-engine/)

The InfluxDB 3 Processing engine is an embedded Python virtual machine that runs inside InfluxDB 3 Core to execute Python code in response to triggers you define without requiring external application servers or middleware.

### [SQL reference documentation](/influxdb3/core/reference/sql/)

Learn the SQL syntax and structure used to query InfluxDB.

### [InfluxQL reference documentation](/influxdb3/core/reference/influxql/)

InfluxQL is an SQL-like query language for interacting with data in InfluxDB.

### [API client libraries](/influxdb3/core/reference/client-libraries/)

InfluxDB client libraries are language-specific tools that integrate with InfluxDB APIs. View the list of available client libraries.

### [InfluxDB 3 Core internals](/influxdb3/core/reference/internals/)

Learn about InfluxDb 3 Core internal systems and mechanisms.

### [Naming restrictions and conventions](/influxdb3/core/reference/naming-restrictions/)

Learn about naming restrictions and conventions for databases, tables, tags, fields, and other identifiers in InfluxDB 3 Core.

### [Usage telemetry](/influxdb3/core/reference/telemetry/)

InfluxData collects telemetry data to help improve the InfluxDB 3 Core. Learn what data InfluxDB 3 Core collects and sends to InfluxData, how it’s used, and how you can opt out.

### [Glossary](/influxdb3/core/reference/glossary/)

Terms related to InfluxData products and platforms.

### [Sample data](/influxdb3/core/reference/sample-data/)

Sample datasets are used throughout the the InfluxDB 3 Core documentation to demonstrate functionality. Use the following sample datasets to replicate provided examples.

### [InfluxDB HTTP API](/influxdb3/core/reference/api/)

The InfluxDB HTTP API for InfluxDB 3 Core provides a programmatic interface for interactions with InfluxDB.


---

## Query data in InfluxDB 3 Core

Learn to query data in InfluxDB 3 Core.

### [Execute queries](/influxdb3/core/query-data/execute-queries/)

Use tools and libraries to query data from InfluxDB 3 Core.

### [Query data with SQL](/influxdb3/core/query-data/sql/)

Learn to query data in InfluxDB 3 Core using SQL.

### [Query data with InfluxQL](/influxdb3/core/query-data/influxql/)

Learn to use InfluxQL to query data in InfluxDB 3 Core.

[query](/influxdb3/core/tags/query/)


---

## Processing engine and Python plugins

Use the Processing Engine in InfluxDB 3 Core to extend your database with custom Python code. Trigger your code on write, on a schedule, or on demand to automate workflows, transform data, and create API endpoints.

## What is the Processing Engine?

The Processing Engine is an embedded Python virtual machine that runs inside your InfluxDB 3 Core database. You configure *triggers* to run your Python *plugin* code in response to:

* **Data writes** - Process and transform data as it enters the database
* **Scheduled events** - Run code at defined intervals or specific times
* **HTTP requests** - Expose custom API endpoints that execute your code

You can use the Processing Engine’s in-memory cache to manage state between executions and build stateful applications directly in your database.

This guide walks you through setting up the Processing Engine, creating your first plugin, and configuring triggers that execute your code on specific events.

## Before you begin

Ensure you have:

* A working InfluxDB 3 Core instance
* Access to command line
* Python installed if you’re writing your own plugin
* Basic knowledge of the InfluxDB CLI

Once you have all the prerequisites in place, follow these steps to implement the Processing Engine for your data automation needs.

* [Set up the Processing Engine](#set-up-the-processing-engine)
* [Add a Processing Engine plugin](#add-a-processing-engine-plugin)
  * [Upload plugins from local machine](#upload-plugins-from-local-machine)
  * [Update existing plugins](#update-existing-plugins)
  * [View loaded plugins](#view-loaded-plugins)

* [Create a trigger](#create-a-trigger)
* [Manage plugin dependencies](#manage-plugin-dependencies)
* [Plugin security](#plugin-security)

## Set up the Processing Engine

The Processing Engine activates when `--plugin-dir` or `INFLUXDB3_PLUGIN_DIR` is configured.

### Default behavior by deployment type

|   Deployment   |Default state|              Configuration              |
|----------------|-------------|-----------------------------------------|
| Docker images  | **Enabled** |     `INFLUXDB3_PLUGIN_DIR=/plugins`     |
|DEB/RPM packages| **Enabled** |`plugin-dir="/var/lib/influxdb3/plugins"`|
| Binary/source  |  Disabled   |       No `plugin-dir` configured        |

If you installed InfluxDB 3 Core using Docker or a DEB/RPM package, the Processing Engine is already enabled—skip to [Add a Processing Engine plugin](#add-a-processing-engine-plugin).
To disable the Processing Engine, see [Enable and disable the Processing Engine](/influxdb3/core/reference/processing-engine/#enable-and-disable-the-processing-engine).

### Enable the Processing Engine manually

To activate the Processing Engine when running from a binary or source build, start your InfluxDB 3 Core server with the `--plugin-dir` flag. This flag tells InfluxDB where to load your plugin files.

#### Keep the influxdb3 binary with its python directory

The influxdb3 binary requires the adjacent `python/` directory to function.
If you manually extract from tar.gz, keep them in the same parent directory:

```
your-install-location/
├── influxdb3
└── python/
```

Add the parent directory to your PATH; do not move the binary out of this directory.

```bash
influxdb3 serve \
  --NODE_ID \
  --object-store OBJECT_STORE_TYPE \
  --plugin-dir PLUGIN_DIR
```

In the example above, replace the following:

* `NODE_ID`: Unique identifier for your instance
* `OBJECT_STORE_TYPE`: Type of object store (for example, file or s3)
* `PLUGIN_DIR`: Absolute path to the directory where plugin files are stored. Store all plugin files in this directory or its subdirectories.

#### Use custom plugin repositories

By default, plugins referenced with the `gh:` prefix are fetched from the official[influxdata/influxdb3\_plugins](https://github.com/influxdata/influxdb3_plugins) repository.
To use a custom repository, add the `--plugin-repo` flag when starting the server.
See [Use a custom plugin repository](#option-3-use-a-custom-plugin-repository) for details.

### Configure distributed environments

When running InfluxDB 3 Core in a distributed setup, follow these steps to configure the Processing Engine:

1. Decide where each plugin should run
   * Data processing plugins, such as WAL plugins, run on ingester nodes
   * HTTP-triggered plugins run on nodes handling API requests
   * Scheduled plugins can run on any configured node

2. Enable plugins on the correct instance
3. Maintain identical plugin files across all instances where plugins run
   * Use shared storage or file synchronization tools to keep plugins consistent

#### Provide plugins to nodes that run them

Configure your plugin directory on the same system as the nodes that run the triggers and plugins.

## Add a Processing Engine plugin

A plugin is a Python script that defines a function with a trigger-compatible (*trigger spec*) signature.
When the specified event occurs, InfluxDB runs the plugin.

### Choose a plugin strategy

You have two main options for adding plugins to your InfluxDB instance:

* [Use example plugins](#use-example-plugins) - Get started with prebuilt plugins
* [Create a custom plugin](#create-a-custom-plugin) - Build your own for specialized use cases

### Use example plugins

InfluxData maintains a repository of official and community plugins that you can use immediately in your Processing Engine setup.

Browse the [plugin library](/influxdb3/core/plugins/library/) to find examples and InfluxData official plugins for:

* **Data transformation**: Process and transform incoming data
* **Alerting**: Send notifications based on data thresholds
* **Aggregation**: Calculate statistics on time series data
* **Integration**: Connect to external services and APIs
* **System monitoring**: Track resource usage and health metrics

For community contributions, see the [influxdb3\_plugins repository](https://github.com/influxdata/influxdb3_plugins) on GitHub.

#### Add example plugins

You have two options for using plugins from the repository:

##### Option 1: Copy plugins locally

Clone the `influxdata/influxdb3_plugins` repository and copy plugins to your configured plugin directory:

```
# Clone the repository
git clone https://github.com/influxdata/influxdb3_plugins.git

# Copy a plugin to your configured plugin directory
cp influxdb3_plugins/influxdata/system_metrics/system_metrics.py /path/to/plugins/
```

##### Option 2: Reference plugins directly from GitHub

Skip downloading plugins by referencing them directly from GitHub using the `gh:` prefix:

```bash
# Create a trigger using a plugin from GitHub
influxdb3 create trigger \
  --trigger-spec "every:1m" \
  --path "gh:influxdata/system_metrics/system_metrics.py" \
  --database my_database \
  system_metrics
```

This approach:

* Ensures you’re using the latest version
* Simplifies updates and maintenance
* Reduces local storage requirements

##### Option 3: Use a custom plugin repository

For organizations that maintain their own plugin repositories or need to use private/internal plugins,
configure a custom plugin repository URL:

```bash
# Start the server with a custom plugin repository
influxdb3 serve \
  --node-id node0 \
  --object-store file \
  --data-dir ~/.influxdb3 \
  --plugin-dir ~/.plugins \
  --plugin-repo "https://internal.company.com/influxdb-plugins/"
```

Then reference plugins from your custom repository using the `gh:` prefix:

```bash
# Fetches from: https://internal.company.com/influxdb-plugins/myorg/custom_plugin.py
influxdb3 create trigger \
  --trigger-spec "every:5m" \
  --path "gh:myorg/custom_plugin.py" \
  --database my_database \
  custom_trigger
```

**Use cases for custom repositories:**

* **Private plugins**: Host proprietary plugins not suitable for public repositories
* **Air-gapped environments**: Use internal mirrors when external internet access is restricted
* **Development and staging**: Test plugins from development branches before production deployment
* **Compliance requirements**: Meet data governance policies requiring internal hosting

The `--plugin-repo` option accepts any HTTP/HTTPS URL that serves raw plugin files.
See the [plugin-repo configuration option](/influxdb3/core/reference/config-options/#plugin-repo) for more details.

Plugins have various functions such as:

* Receive plugin-specific arguments (such as written data, call time, or an HTTP request)
* Access keyword arguments (as `args`) passed from *trigger arguments* configurations
* Access the `influxdb3_local` shared API to write data, query data, and managing state between executions

For more information about available functions, arguments, and how plugins interact with InfluxDB, see how to [Extend plugins](/influxdb3/core/extend-plugin/).

### Create a custom plugin

To build custom functionality, you can create your own Processing Engine plugin.

#### Prerequisites

Before you begin, make sure:

* The Processing Engine is enabled on your InfluxDB 3 Core instance.
* You’ve configured the `--plugin-dir` where plugin files are stored.
* You have access to that plugin directory.

#### Steps to create a plugin:

* [Choose your plugin type](#choose-your-plugin-type)
* [Create your plugin file](#create-your-plugin-file)
* [Next Steps](#next-steps)

#### Choose your plugin type

Choose a plugin type based on your automation goals:

|  Plugin Type   |                 Best For                  |
|----------------|-------------------------------------------|
| **Data write** |       Processing data as it arrives       |
| **Scheduled**  |Running code at specific intervals or times|
|**HTTP request**| Running code on demand via API endpoints  |

#### Create your plugin file

Plugins now support both single-file and multifile architectures:

**Single-file plugins:**

* Create a `.py` file in your plugins directory
* Add the appropriate function signature based on your chosen plugin type
* Write your processing logic inside the function

**Multifile plugins:**

* Create a directory in your plugins directory
* Add an `__init__.py` file as the entry point (required)
* Organize supporting modules in additional `.py` files
* Import and use modules within your plugin code

##### Example multifile plugin structure

```
my_plugin/
├── __init__.py       # Required - entry point with trigger function
├── utils.py          # Supporting module
├── processors.py     # Data processing functions
└── config.py         # Configuration helpers
```

The `__init__.py` file must contain your trigger function:

```python
# my_plugin/__init__.py
from .processors import process_data
from .config import get_settings

def process_writes(influxdb3_local, table_batches, args=None):
    settings = get_settings()
    for table_batch in table_batches:
        process_data(influxdb3_local, table_batch, settings)
```

Supporting modules can contain helper functions:

```python
# my_plugin/processors.py
def process_data(influxdb3_local, table_batch, settings):
    # Processing logic here
    pass
```

After writing your plugin, [create a trigger](#create-a-trigger) to connect it to a database event and define when it runs.

#### Create a data write plugin

Use a data write plugin to process data as it’s written to the database. These plugins use [`table:` or `all_tables:`](#trigger-on-data-writes) trigger specifications. Ideal use cases include:

* Data transformation and enrichment
* Alerting on incoming values
* Creating derived metrics

```
def process_writes(influxdb3_local, table_batches, args=None):
    # Process data as it's written to the database
    for table_batch in table_batches:
        table_name = table_batch["table_name"]
        rows = table_batch["rows"]

        # Log information about the write
        influxdb3_local.info(f"Processing {len(rows)} rows from {table_name}")

        # Write derived data back to the database
        line = LineBuilder("processed_data")
        line.tag("source_table", table_name)
        line.int64_field("row_count", len(rows))
        influxdb3_local.write(line)
```

#### Create a scheduled plugin

Scheduled plugins run at defined intervals using [`every:` or `cron:`](#trigger-on-a-schedule) trigger specifications. Use them for:

* Periodic data aggregation
* Report generation
* System health checks

```
def process_scheduled_call(influxdb3_local, call_time, args=None):
    # Run code on a schedule

    # Query recent data
    results = influxdb3_local.query("SELECT * FROM metrics WHERE time > now() - INTERVAL '1 hour'")

    # Process the results
    if results:
        influxdb3_local.info(f"Found {len(results)} recent metrics")
    else:
        influxdb3_local.warn("No recent metrics found")
```

#### Create an HTTP request plugin

HTTP request plugins respond to API calls using [`request:`](#trigger-on-http-requests) trigger specifications. Use them for:

* Creating custom API endpoints
* Webhooks for external integrations
* User interfaces for data interaction

```
def process_request(influxdb3_local, query_parameters, request_headers, request_body, args=None):
    # Handle HTTP requests to a custom endpoint

    # Log the request parameters
    influxdb3_local.info(f"Received request with parameters: {query_parameters}")

    # Process the request body
    if request_body:
        import json
        data = json.loads(request_body)
        influxdb3_local.info(f"Request data: {data}")

    # Return a response (automatically converted to JSON)
    return {"status": "success", "message": "Request processed"}
```

#### Next steps

After writing your plugin:

* [Create a trigger](#create-a-trigger) to connect your plugin to database events
* [Install any Python dependencies](#manage-plugin-dependencies) your plugin requires
* Learn how to [extend plugins with the API](/influxdb3/core/extend-plugin/)

### Upload plugins from local machine

For local development and testing, you can upload plugin files directly from your machine when creating triggers. This eliminates the need to manually copy files to the server’s plugin directory.

* [Upload a plugin using the influxdb3 CLI](#upload-a-plugin-using-the-influxdb3-cli)
* [Upload a plugin using the HTTP API](#upload-a-plugin-using-the-http-api)

#### Upload a plugin using the influxdb3 CLI

Use the `--upload` flag with `--path` to transfer local files or directories:

```bash
# Upload single-file plugin
influxdb3 create trigger \
  --trigger-spec "every:10s" \
  --path "/local/path/to/plugin.py" \
  --upload \
  --database metrics \
  my_trigger

# Upload multifile plugin directory
influxdb3 create trigger \
  --trigger-spec "every:30s" \
  --path "/local/path/to/plugin-dir" \
  --upload \
  --database metrics \
  complex_trigger
```

For more information, see the [`influxdb3 create trigger` CLI reference](/influxdb3/core/reference/cli/influxdb3/create/trigger/).

#### Upload a plugin using the HTTP API

To upload a plugin file using the HTTP API, send a `PUT` request to the `/api/v3/plugins/files` endpoint:

```
PUT localhost:8181/api/v3/plugins/files
```

Include the following in your request:

* **Headers**:
  * `Authorization: Bearer` with your admin token
  * `Content-Type: application/octet-stream`

* **Query parameters**:
  * `path` *(string, required)*: Path to the plugin file relative to the plugin directory

```bash
# Upload a single-file plugin
curl -X PUT "localhost:8181/api/v3/plugins/files?path=plugin.py" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/octet-stream" \
  --data-binary "@/local/path/to/plugin.py"
```

Replace `AUTH_TOKEN`: your [admin token](/influxdb3/core/admin/tokens/admin)

#### Admin privileges required

Plugin uploads require an admin token. This security measure prevents unauthorized code execution on the server.

**When to use plugin upload:**

* Local plugin development and testing
* Deploying plugins without SSH access to the server
* Rapid iteration on plugin code
* Automating plugin deployment in CI/CD pipelines

### Update existing plugins

Modify plugin code for running triggers without recreating them. This allows you to iterate on plugin development while preserving trigger configuration and history.

* [Update a plugin using the influxdb3 CLI](#update-a-plugin-using-the-influxdb3-cli)
* [Update a plugin using the HTTP API](#update-a-plugin-using-the-http-api)

#### Update a plugin using the influxdb3 CLI

Use the `influxdb3 update trigger` command:

```bash
# Update single-file plugin
influxdb3 update trigger \
  --database metrics \
  --trigger-name my_trigger \
  --path "/path/to/updated/plugin.py"

# Update multifile plugin
influxdb3 update trigger \
  --database metrics \
  --trigger-name complex_trigger \
  --path "/path/to/updated/plugin-dir"
```

For complete reference, see [`influxdb3 update trigger`](/influxdb3/core/reference/cli/influxdb3/update/trigger/).

#### Update a plugin using the HTTP API

To update a plugin file using the HTTP API, send a `PUT` request to the `/api/v3/plugins/files` endpoint:

```
PUT localhost:8181/api/v3/plugins/files
```

Include the following in your request:

* **Headers**:
  * `Authorization: Bearer` with your admin token
  * `Content-Type: application/octet-stream`

* **Query parameters**:
  * `path` *(string, required)*: Path to the plugin file relative to the plugin directory

```bash
# Update a plugin file
curl -X PUT "localhost:8181/api/v3/plugins/files?path=plugin.py" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/octet-stream" \
  --data-binary "@/path/to/updated/plugin.py"
```

Replace `AUTH_TOKEN`: your [admin token](/influxdb3/core/admin/tokens/admin)

**The update operation:**

* Replaces plugin files immediately
* Preserves trigger configuration (spec, schedule, arguments)
* Requires admin token for security
* Works with both local paths and uploaded files

### View loaded plugins

Monitor which plugins are loaded in your system for operational visibility and troubleshooting.

**Option 1: Use the CLI command**

```bash
# List all plugins
influxdb3 show plugins --token $ADMIN_TOKEN

# JSON format for programmatic access
influxdb3 show plugins --format json --token $ADMIN_TOKEN
```

**Option 2: Query the system table**

The `system.plugin_files` table in the `_internal` database provides detailed plugin file information:

```bash
influxdb3 query \
  -d _internal \
  "SELECT * FROM system.plugin_files ORDER BY plugin_name" \
  --token $ADMIN_TOKEN
```

**Available columns:**

* `plugin_name` (String): Trigger name
* `file_name` (String): Plugin file name
* `file_path` (String): Full server path
* `size_bytes` (Int64): File size
* `last_modified` (Int64): Modification timestamp (milliseconds)

**Example queries:**

```sql
-- Find plugins by name
SELECT * FROM system.plugin_files WHERE plugin_name = 'my_trigger';

-- Find large plugins
SELECT plugin_name, size_bytes
FROM system.plugin_files
WHERE size_bytes > 10000;

-- Check modification times
SELECT plugin_name, file_name, last_modified
FROM system.plugin_files
ORDER BY last_modified DESC;
```

For more information, see the [`influxdb3 show plugins` reference](/influxdb3/core/reference/cli/influxdb3/show/plugins/) and [Query system data](/influxdb3/core/admin/query-system-data/#query-plugin-files).

## Create a trigger

A trigger connects your plugin code to database events. When the specified event occurs, the processing engine executes your plugin.

* [Understand trigger types](#understand-trigger-types)
* [Create a trigger using the influxdb3 CLI](#create-a-trigger-using-the-influxdb3-cli)
* [Create a trigger using the HTTP API](#create-a-trigger-using-the-http-api)
* [Trigger specification examples](#trigger-specification-examples)

### Understand trigger types

|Plugin Type |          Trigger Specification          |       When Plugin Runs        |
|------------|-----------------------------------------|-------------------------------|
| Data write |  `table:<TABLE_NAME>` or `all_tables`   |When data is written to tables |
| Scheduled  |`every:<DURATION>` or `cron:<EXPRESSION>`|  At specified time intervals  |
|HTTP request|        `request:<REQUEST_PATH>`         |When HTTP requests are received|

### Create a trigger using the influxdb3 CLI

Use the `influxdb3 create trigger` command with the appropriate trigger specification:

```bash
influxdb3 create trigger \
  --trigger-spec SPECIFICATION \
  --path PLUGIN_FILE \
  --database DATABASE_NAME \
  TRIGGER_NAME
```

In the example above, replace the following:

* `SPECIFICATION`: Trigger specification
* `PLUGIN_FILE`: Plugin filename relative to your configured plugin directory
* `DATABASE_NAME`: Name of the database
* `TRIGGER_NAME`: Name of the new trigger

#### Plugin paths

* For **single-file plugins**, provide just the `.py` filename to `--path` (for example, `test_plugin.py`).
* For **multi-file plugins**, provide the directory name containing `__init__.py`.

When not using `--upload`, the server resolves paths relative to the configured `--plugin-dir`.
For details about multi-file plugin structure, see [Create your plugin file](#create-your-plugin-file).

For complete reference, see [`influxdb3 create trigger`](/influxdb3/core/reference/cli/influxdb3/create/trigger/).

### Create a trigger using the HTTP API

To create a trigger using the HTTP API, send a `POST` request to the `/api/v3/configure/processing_engine_trigger` endpoint:

```
POST localhost:8181/api/v3/configure/processing_engine_trigger
```

Include the following in your request:

* **Headers**:
  * `Authorization: Bearer` with your authentication token
  * `Content-Type: application/json`

* **Request body**: JSON object with trigger configuration
  * `db` *(string, required)*: Database name
  * `trigger_name` *(string, required)*: Trigger name
  * `plugin_filename` *(string, required)*: Plugin filename relative to the plugin directory
  * `trigger_specification` *(string, required)*: When the plugin runs (see [trigger types](#understand-trigger-types))
  * `trigger_settings` *(object, required)*: Configuration for error handling and execution
    * `run_async` *(boolean)*: Whether to run asynchronously (default: `false`)
    * `error_behavior` *(string)*: How to handle errors: `Log`, `Retry`, or `Disable` (default: `Log`)

  * `disabled` *(boolean, required)*: Whether the trigger is disabled
  * `trigger_arguments` *(object, optional)*: Arguments passed to the plugin

```bash
# Create a basic trigger
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "TRIGGER_NAME",
    "plugin_filename": "PLUGIN_FILE",
    "trigger_specification": "TRIGGER_SPEC",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Log"
    },
    "disabled": false
  }'
```

In the example above, replace the following:

* `DATABASE_NAME`: Name of the database
* `TRIGGER_NAME`: Name of the new trigger
* `PLUGIN_FILE`: Plugin filename relative to your configured plugin directory
* `TRIGGER_SPEC`: Trigger specification (see [examples](#trigger-specification-examples))
* `AUTH_TOKEN`: your [token](/influxdb3/core/admin/tokens/)

### Trigger specification examples

The following examples demonstrate how to create triggers for different event types.

#### Trigger on data writes

#### influxdb3 CLI ####

```bash
# Trigger on writes to a specific table
# The plugin file must be in your configured plugin directory
influxdb3 create trigger \
  --trigger-spec "table:sensor_data" \
  --path "process_sensors.py" \
  --database my_database \
  sensor_processor

# Trigger on writes to all tables
influxdb3 create trigger \
  --trigger-spec "all_tables" \
  --path "process_all_data.py" \
  --database my_database \
  all_data_processor
```

```bash
# Trigger on writes to a specific table
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "sensor_processor",
    "plugin_filename": "process_sensors.py",
    "trigger_specification": "table:sensor_data",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Log"
    },
    "disabled": false
  }'

# Trigger on writes to all tables
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "all_data_processor",
    "plugin_filename": "process_all_data.py",
    "trigger_specification": "all_tables",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Log"
    },
    "disabled": false
  }'
```

Replace the following:

* `DATABASE_NAME`: the name of the database
* `AUTH_TOKEN`: your [token](/influxdb3/core/admin/tokens/)

The trigger runs when the database flushes ingested data for the specified tables to the Write-Ahead Log (WAL) in the Object store (default is every second).

The plugin receives the written data and table information.

#### Trigger on data writes with table exclusion

If you want to use a single trigger for all tables but exclude specific tables,
you can use trigger arguments and your plugin code to filter out unwanted tables–for example:

```bash
influxdb3 create trigger \
  --database DATABASE_NAME \
  --token AUTH_TOKEN \
  --path processor.py \
  --trigger-spec "all_tables" \
  --trigger-arguments "exclude_tables=temp_data,debug_info,system_logs" \
  data_processor
```

Replace the following:

* DATABASE\_NAME: the name of the database
* AUTH\_TOKEN: your [token](/influxdb3/core/admin/tokens/)

Then, in your plugin:

```python
# processor.py
def on_write(self, database, table_name, batch):
    # Get excluded tables from trigger arguments
    excluded_tables = set(self.args.get('exclude_tables', '').split(','))

    if table_name in excluded_tables:
        return

    # Process allowed tables
    self.process_data(database, table_name, batch)
```

##### Recommendations

* **Early return**: Check exclusions as early as possible in your plugin.
* **Efficient lookups**: Use sets for O(1) lookup performance with large exclusion lists.
* **Performance**: Log skipped tables for debugging but avoid excessive logging in production.
* **Multiple triggers**: For few tables, consider creating separate table-specific
  triggers instead of filtering within plugin code.
  See HTTP API [Processing engine endpoints](/influxdb3/core/api/v3/#tag/Processing-engine) for managing triggers.

#### Trigger on a schedule

#### influxdb3 CLI ####

```bash
# Run every 5 minutes
influxdb3 create trigger \
  --trigger-spec "every:5m" \
  --path "periodic_check.py" \
  --database my_database \
  regular_check

# Run on a cron schedule (8am daily)
# Supports extended cron format with seconds
influxdb3 create trigger \
  --trigger-spec "cron:0 0 8 * * *" \
  --path "daily_report.py" \
  --database my_database \
  daily_report
```

```bash
# Run every 5 minutes
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "regular_check",
    "plugin_filename": "periodic_check.py",
    "trigger_specification": "every:5m",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Log"
    },
    "disabled": false
  }'

# Run on a cron schedule (8am daily)
# Supports extended cron format with seconds
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "daily_report",
    "plugin_filename": "daily_report.py",
    "trigger_specification": "cron:0 0 8 * * *",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Log"
    },
    "disabled": false
  }'
```

Replace the following:

* `DATABASE_NAME`: the name of the database
* `AUTH_TOKEN`: your [token](/influxdb3/core/admin/tokens/)

The plugin receives the scheduled call time.

#### Trigger on HTTP requests

#### influxdb3 CLI ####

```bash
# Create an endpoint at /api/v3/engine/webhook
influxdb3 create trigger \
  --trigger-spec "request:webhook" \
  --path "webhook_handler.py" \
  --database my_database \
  webhook_processor
```

```bash
# Create an endpoint at /api/v3/engine/webhook
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "webhook_processor",
    "plugin_filename": "webhook_handler.py",
    "trigger_specification": "request:webhook",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Log"
    },
    "disabled": false
  }'
```

Replace the following:

* `DATABASE_NAME`: the name of the database
* `AUTH_TOKEN`: your [token](/influxdb3/core/admin/tokens/)

Access your endpoint at `/api/v3/engine/{REQUEST_PATH}` (in this example, `/api/v3/engine/webhook`).
The trigger is enabled by default and runs when an HTTP request is received at the specified path.

To run the plugin, send a `GET` or `POST` request to the endpoint–for example:

```bash
curl http://localhost:8181/api/v3/engine/webhook
```

The plugin receives the HTTP request object with methods, headers, and body.

To view triggers associated with a database, use the `influxdb3 show summary` command:

```bash
influxdb3 show summary --database my_database --token AUTH_TOKEN
```

### Pass arguments to plugins

Use trigger arguments to pass configuration from a trigger to the plugin it runs. You can use this for:

* Threshold values for monitoring
* Connection properties for external services
* Configuration settings for plugin behavior

#### influxdb3 CLI ####

```bash
influxdb3 create trigger \
  --trigger-spec "every:1h" \
  --path "threshold_check.py" \
  --trigger-arguments threshold=90,notify_email=admin@example.com \
  --database my_database \
  threshold_monitor
```

```bash
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "threshold_monitor",
    "plugin_filename": "threshold_check.py",
    "trigger_specification": "every:1h",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Log"
    },
    "trigger_arguments": {
      "threshold": "90",
      "notify_email": "admin@example.com"
    },
    "disabled": false
  }'
```

Replace the following:

* `DATABASE_NAME`: the name of the database
* `AUTH_TOKEN`: your [token](/influxdb3/core/admin/tokens/)

The arguments are passed to the plugin as a `Dict[str, str]` where the key is the argument name and the value is the argument value:

```
def process_scheduled_call(influxdb3_local, call_time, args=None):
    if args and "threshold" in args:
        threshold = float(args["threshold"])
        email = args.get("notify_email", "default@example.com")

        # Use the arguments in your logic
        influxdb3_local.info(f"Checking threshold {threshold}, will notify {email}")
```

### Control trigger execution

By default, triggers run synchronously—each instance waits for previous instances to complete before executing.

To allow multiple instances of the same trigger to run simultaneously, configure triggers to run asynchronously:

#### influxdb3 CLI ####

```bash
# Allow multiple trigger instances to run simultaneously
influxdb3 create trigger \
  --trigger-spec "table:metrics" \
  --path "heavy_process.py" \
  --run-asynchronous \
  --database my_database \
  async_processor
```

```bash
# Allow multiple trigger instances to run simultaneously
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "async_processor",
    "plugin_filename": "heavy_process.py",
    "trigger_specification": "table:metrics",
    "trigger_settings": {
      "run_async": true,
      "error_behavior": "Log"
    },
    "disabled": false
  }'
```

Replace the following:

* `DATABASE_NAME`: the name of the database
* `AUTH_TOKEN`: your [token](/influxdb3/core/admin/tokens/)

### Configure error handling for a trigger

To configure error handling behavior for a trigger, specify one of the following values:

* `log` (default): Log all plugin errors to stdout and the `system.processing_engine_logs` table in the trigger’s database.
* `retry`: Attempt to run the plugin again immediately after an error.
* `disable`: Automatically disable the plugin when an error occurs (can be re-enabled later).

#### influxdb3 CLI ####

For more information, see how to [Query trigger logs](/influxdb3/core/admin/query-system-data/#query-trigger-logs).

```bash
# Automatically retry on error
influxdb3 create trigger \
  --trigger-spec "table:important_data" \
  --path "critical_process.py" \
  --error-behavior retry \
  --database my_database \
  critical_processor

# Disable the trigger on error
influxdb3 create trigger \
  --trigger-spec "request:webhook" \
  --path "webhook_handler.py" \
  --error-behavior disable \
  --database my_database \
  auto_disable_processor
```

```bash
# Automatically retry on error
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "critical_processor",
    "plugin_filename": "critical_process.py",
    "trigger_specification": "table:important_data",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Retry"
    },
    "disabled": false
  }'

# Disable the trigger on error
curl -X POST "localhost:8181/api/v3/configure/processing_engine_trigger" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "DATABASE_NAME",
    "trigger_name": "auto_disable_processor",
    "plugin_filename": "webhook_handler.py",
    "trigger_specification": "request:webhook",
    "trigger_settings": {
      "run_async": false,
      "error_behavior": "Disable"
    },
    "disabled": false
  }'
```

Replace the following:

* `DATABASE_NAME`: the name of the database
* `AUTH_TOKEN`: your [token](/influxdb3/core/admin/tokens/)

## Manage plugin dependencies

Use the `influxdb3 install package` command to add third-party libraries (like `pandas`, `requests`, or `influxdb3-python`) to your plugin environment.  
This installs packages into the Processing Engine’s embedded Python environment to ensure compatibility with your InfluxDB instance.

#### influxdb3 CLI ####

```bash
# Use the CLI to install a Python package
influxdb3 install package pandas
```

```bash
# Use the CLI to install a Python package in a Docker container
docker exec -it CONTAINER_NAME influxdb3 install package pandas
```

```bash
# Use the HTTP API to install Python packages
curl -X POST "localhost:8181/api/v3/configure/plugin_environment/install_packages" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "packages": ["pandas", "requests", "numpy"]
  }'
```

Replace `AUTH_TOKEN`: your [admin token](/influxdb3/core/admin/tokens/admin)

For complete reference, see [Install plugin packages](/influxdb3/core/api/v3/#operation/PostInstallPluginPackages).

These examples install the specified Python packages (for example, pandas) into the Processing Engine’s embedded virtual environment.

* Use the CLI command when running InfluxDB directly on your system.
* Use the Docker variant if you’re running InfluxDB in a containerized environment.
* Use the HTTP API for programmatic package installation or CI/CD workflows.

#### Use bundled Python for plugins

When you start the server with the `--plugin-dir` option, InfluxDB 3 creates a Python virtual environment (`<PLUGIN_DIR>/venv`) for your plugins.
If you need to create a custom virtual environment, use the Python interpreter bundled with InfluxDB 3. Don’t use the system Python.
Creating a virtual environment with the system Python (for example, using `python -m venv`) can lead to runtime errors and plugin failures.

For more information, see the [processing engine README](https://github.com/influxdata/influxdb/blob/main/README_processing_engine.md).

InfluxDB creates a Python virtual environment in your plugins directory with the specified packages installed.

### Disable package installation for secure environments

For air-gapped deployments or environments with strict security requirements, you can disable Python package installation while maintaining Processing Engine functionality.

Start the server with `--package-manager disabled`:

```bash
influxdb3 serve \
  --node-id node0 \
  --object-store file \
  --data-dir ~/.influxdb3 \
  --plugin-dir ~/.plugins \
  --package-manager disabled
```

When package installation is disabled:

* The Processing Engine continues to function normally for triggers
* Plugin code executes without restrictions
* Package installation commands are blocked
* Pre-installed dependencies in the virtual environment remain available

**Pre-install required dependencies:**

Before disabling the package manager, install all required Python packages:

```bash
# Install packages first
influxdb3 install package pandas requests numpy

# Then start with disabled package manager
influxdb3 serve \
  --plugin-dir ~/.plugins \
  --package-manager disabled
```

**Use cases for disabled package management:**

* Air-gapped environments without internet access
* Compliance requirements prohibiting runtime package installation
* Centrally managed dependency environments
* Security policies requiring pre-approved packages only

For more configuration options, see [–package-manager](/influxdb3/core/reference/config-options/#package-manager).

## Plugin security

The Processing Engine includes security features to protect your InfluxDB 3 Core instance from unauthorized code execution and file system attacks.

### Plugin path validation

All plugin file paths are validated to prevent directory traversal attacks. The system blocks:

* **Relative paths with parent directory references** (`../`, `../../`)
* **Absolute paths** (`/etc/passwd`, `/usr/bin/script.py`)
* **Symlinks that escape the plugin directory**

When creating or updating triggers, plugin paths must resolve within the configured `--plugin-dir`.

**Example of blocked paths:**

```bash
# These will be rejected
influxdb3 create trigger \
  --path "../../../etc/passwd" \  # Blocked: parent directory traversal
  ...

influxdb3 create trigger \
  --path "/tmp/malicious.py" \    # Blocked: absolute path
  ...
```

**Valid plugin paths:**

```bash
# These are allowed
influxdb3 create trigger \
  --path "myapp/plugin.py" \      # Relative to plugin-dir
  ...

influxdb3 create trigger \
  --path "transforms/data.py" \    # Subdirectory in plugin-dir
  ...
```

### Upload and update permissions

Plugin upload and update operations require admin tokens to prevent unauthorized code deployment:

* `--upload` flag requires admin privileges
* `update trigger` command requires admin token
* Standard resource tokens cannot upload or modify plugin code

This security model ensures only administrators can introduce or modify executable code in your database.

### Best practices

**For development:**

* Use the `--upload` flag to deploy plugins during development
* Test plugins in non-production environments first
* Review plugin code before deployment

**For production:**

* Pre-deploy plugins to the server’s plugin directory via secure file transfer
* Use custom plugin repositories for vetted, approved plugins
* Disable package installation (`--package-manager disabled`) in locked-down environments
* Audit plugin files using the [`system.plugin_files` table](#view-loaded-plugins)
* Implement change control processes for plugin updates

For more security configuration options, see [Configuration options](/influxdb3/core/reference/config-options/).

#### Related

* [influxdb3 test wal\_plugin](/influxdb3/core/reference/cli/influxdb3/test/wal_plugin/)
* [influxdb3 create trigger](/influxdb3/core/reference/cli/influxdb3/create/trigger/)

[processing engine](/influxdb3/core/tags/processing-engine/)[python](/influxdb3/core/tags/python/)
| Deployment | Default state | Configuration |
| --- | --- | --- |
| Deployment | Default state | Configuration |
| Docker images | Enabled | INFLUXDB3_PLUGIN_DIR=/plugins |
| DEB/RPM packages | Enabled | plugin-dir="/var/lib/influxdb3/plugins" |
| Binary/source | Disabled | No  plugin-dir  configured |

| Plugin Type | Best For |
| --- | --- |
| Plugin Type | Best For |
| Data write | Processing data as it arrives |
| Scheduled | Running code at specific intervals or times |
| HTTP request | Running code on demand via API endpoints |

| Plugin Type | Trigger Specification | When Plugin Runs |
| --- | --- | --- |
| Plugin Type | Trigger Specification | When Plugin Runs |
| Data write | table:<TABLE_NAME>  or  all_tables | When data is written to tables |
| Scheduled | every:<DURATION>  or  cron:<EXPRESSION> | At specified time intervals |
| HTTP request | request:<REQUEST_PATH> | When HTTP requests are received |


---

## Configure object storage

InfluxDB 3 Core can be configured to use different object storage providers
to store time series data in Parquet format. The process of configuring and
connecting to different object storage providers varies.
The following guides walk through configuring, connecting to, and using
different object storage providers as your InfluxDB 3 Core object store.

### [MinIO](/influxdb3/core/object-storage/minio/)

Use [MinIO](https://min.io) as the object store for your InfluxDB 3 Core instance.
InfluxDB uses the MinIO S3-compatible API to interact with your MinIO server or
cluster.

#### Related

* [InfluxDB 3 Core configuration options](/influxdb3/core/reference/config-options/)

[object storage](/influxdb3/core/tags/object-storage/)[S3](/influxdb3/core/tags/s3/)


---

## Install InfluxDB 3 Core

#### Upgrade to InfluxDB 3 Enterprise

If you want to upgrade from InfluxDB 3 Core to InfluxDB 3 Enterprise
for features like high availability, read replicas, and historical query capability,
see [Upgrade to Enterprise](/influxdb3/core/admin/upgrade-to-enterprise/).

* [System Requirements](#system-requirements)
* [Install](#install)
  * [Quick install for Linux and macOS](#quick-install-for-linux-and-macos)
  * [Download and install the latest build artifacts](#download-and-install-the-latest-build-artifacts)
  * [Pull the Docker image](#pull-the-docker-image)
  * [Linux DEB or RPM](#linux-deb-or-rpm)
    * [TOML configuration (Linux)](#toml-configuration-linux)
    * [Run as a system service (Linux)](#run-as-a-system-service-linux)

  * [Verify the installation](#verify-the-installation)

## System Requirements

#### Operating system

InfluxDB 3 Core runs on **Linux**, **macOS**, and **Windows**.

#### Object storage

A key feature of InfluxDB 3 is its use of object storage to store time series
data in Apache Parquet format. You can choose to store these files on your local
file system. Performance on your local filesystem will likely be better, but
object storage has the advantage of not running out of space and being accessible
by other systems over the network. InfluxDB 3 Core natively supports Amazon S3,
Azure Blob Storage, and Google Cloud Storage.
You can also use many local object storage implementations that provide an
S3-compatible API, such as [Minio](https://min.io/).

## Install

InfluxDB 3 Core runs on **Linux**, **macOS**, and **Windows**.

Choose one of the following methods to install InfluxDB 3 Core:

* [Quick install for Linux and macOS](#quick-install-for-linux-and-macos)
* [Download and install the latest build artifacts](#download-and-install-the-latest-build-artifacts)
* [Pull the Docker image](#pull-the-docker-image)
* [Linux DEB or RPM](#linux-deb-or-rpm)

### Quick install for Linux and macOS

To install InfluxDB 3 Core on **Linux** or **macOS**, download and run the quick
installer script for InfluxDB 3 Core–for example, using [`curl`](https://curl.se/)to download the script:

```bash
curl -O https://www.influxdata.com/d/install_influxdb3.sh \
&& sh install_influxdb3.sh
```

> [!Note]
> The quick installer script is updated with each InfluxDB 3 Core release,
> so it always installs the latest version.

#### Production deployment

For production deployments, use [Linux DEB or RPM](#linux-deb-or-rpm)for built-in systemd sandboxing, or [Docker](#pull-the-docker-image) with your own
container security configuration.

For detailed security options, see [Manage security](/influxdb3/core/admin/security/).

### Download and install the latest build artifacts

You can also download and install InfluxDB 3 Core build artifacts directly:

[](#linux-binaries)

Linux binaries

* [Linux | AMD64 (x86\_64) | GNU](https://dl.influxdata.com/influxdb/releases/influxdb3-core-3.10.0_linux_amd64.tar.gz)•[sha256](https://dl.influxdata.com/influxdb/releases/influxdb3-core-3.10.0_linux_amd64.tar.gz.sha256)
* [Linux | ARM64 (AArch64) | GNU](https://dl.influxdata.com/influxdb/releases/influxdb3-core-3.10.0_linux_arm64.tar.gz)•[sha256](https://dl.influxdata.com/influxdb/releases/influxdb3-core-3.10.0_linux_arm64.tar.gz.sha256)

[](#macos-binaries)

macOS binaries

* [macOS | Silicon (ARM64)](https://dl.influxdata.com/influxdb/releases/influxdb3-core-3.10.0_darwin_arm64.tar.gz)•[sha256](https://dl.influxdata.com/influxdb/releases/influxdb3-core-3.10.0_darwin_arm64.tar.gz.sha256)

> [!Note]
> macOS Intel builds are coming soon.

[](#windows-binaries)

Windows binaries

* [Windows (AMD64, x86\_64) binary](https://dl.influxdata.com/influxdb/releases/influxdb3-core-3.10.0-windows_amd64.zip)•[sha256](https://dl.influxdata.com/influxdb/releases/influxdb3-core-3.10.0-windows_amd64.zip.sha256)

### Pull the Docker image

Run the following command to pull the [`influxdb:3-core` image](https://hub.docker.com/_/influxdb/tags?tag=3-core&name=3-core), available for x86\_64 (AMD64) and ARM64 architectures:

```bash
docker pull influxdb:3-core
```

Docker automatically pulls the appropriate image for your system architecture.

[](#pull-for-a-specific-system-architecture)

Pull for a specific system architecture

To specify the system architecture, use platform-specific tags–for example:

```bash
# For x86_64/AMD64
docker pull \
--platform linux/amd64 \
influxdb:3-core
```

```bash
# For ARM64
docker pull \
--platform linux/arm64 \
influxdb:3-core
```

[](#pin-to-a-specific-version)

Pin to a specific version

The `3-core` tag always points to the latest 3.x release.
To keep a deployment on a fixed version, pull a version-specific tag instead:

```bash
# Pin to a specific patch release
docker pull influxdb:3.10.0-core

# Pin to the latest patch in a minor series--for example, 3.10
docker pull influxdb:3.10-core
```

To browse recent InfluxDB 3 image tags (Core and Enterprise), newest first, see[`influxdb` tags on Docker Hub](https://hub.docker.com/_/influxdb/tags?name=3.&ordering=last_updated).

### Linux DEB or RPM

When installed via DEB or RPM on a `systemd`-enabled system, InfluxDB 3 Core runs in a sandboxed environment.
The included `systemd` unit file configures the environment to provide security isolation for typical deployments.
For more information, see [Manage security](/influxdb3/core/admin/security/).

> [!Note]
> DEB and RPM installation is **recommended for non-Docker production deployments** due to built-in `systemd` sandboxing.

[](#deb-based-systems)

DEB-based systems

Use `apt-get` to install InfluxDB 3 Core from the InfluxData repository:

```bash
curl --silent --location -O https://repos.influxdata.com/influxdata-archive.key
gpg --show-keys --with-fingerprint --with-colons ./influxdata-archive.key 2>&1 \
| grep -q '^fpr:\+24C975CBA61A024EE1B631787C3D57159FC2F927:$' \
&& cat influxdata-archive.key \
| gpg --dearmor \
| sudo tee /usr/share/keyrings/influxdata-archive.gpg > /dev/null \
&& echo 'deb [signed-by=/usr/share/keyrings/influxdata-archive.gpg] https://repos.influxdata.com/debian stable main' \
| sudo tee /etc/apt/sources.list.d/influxdata.list
sudo apt-get update && sudo apt-get install influxdb3-core
```

[](#rpm-based-systems)

RPM-based systems

Use `yum` to install InfluxDB 3 Core from the InfluxData repository:

```bash
curl --silent --location -O https://repos.influxdata.com/influxdata-archive.key
test -d /usr/share/influxdata-archive-keyring/keyrings || sudo mkdir -p /usr/share/influxdata-archive-keyring/keyrings
gpg --show-keys --with-fingerprint --with-colons ./influxdata-archive.key 2>&1 \
| grep -q '^fpr:\+24C975CBA61A024EE1B631787C3D57159FC2F927:$' \
&& sudo cp ./influxdata-archive.key /usr/share/influxdata-archive-keyring/keyrings/influxdata-archive.asc \
&& cat <<EOF | sudo tee /etc/yum.repos.d/influxdata.repo
[influxdata]
name = InfluxData Repository - Stable
baseurl = https://repos.influxdata.com/stable/\$basearch/main
enabled = 1
gpgcheck = 1
gpgkey = file:///usr/share/influxdata-archive-keyring/keyrings/influxdata-archive.asc
EOF
sudo yum install influxdb3-core
```

#### TOML configuration (Linux)

After you install the DEB or RPM package, the InfluxDB 3 Core TOML
configuration file is located at `/etc/influxdb3/influxdb3-core.conf`and contains the following settings:

* [object-store](/influxdb3/core/reference/config-options/#object-store): `file`
* [data-dir](/influxdb3/core/reference/config-options/#data-dir): `/var/lib/influxdb3/data`
* [plugin-dir](/influxdb3/core/reference/config-options/#plugin-dir): `/var/lib/influxdb3/plugins`
* [node-id](/influxdb3/core/reference/config-options/#node-id): `primary-node`

#### Run as a system service (Linux)

InfluxDB 3 Core DEB and RPM installs include service files for running as
a managed system service on Linux:

* **systemd**: For modern Linux distributions
* **SysV init**: For legacy system compatibility

##### Run using systemd

On `systemd` systems, the `influxdb3-core` unit file is`enabled` on install, but the unit is not started in order to allow
configuration.

###### Start, stop, and restart

> [!Note]
> The following examples use `sudo` for systems that require elevated privileges.
> On some systems (such as Amazon Linux or other RHEL-based distributions where you may already be running as root), you can omit `sudo` from the commands.

```bash
# Start the service
sudo systemctl start influxdb3-core

# Stop the service
sudo systemctl stop influxdb3-core

# Restart the service (use after configuration changes)
sudo systemctl restart influxdb3-core
```

###### Check status and logs

```bash
# Check status (sudo to ensure full journal output)
sudo systemctl status influxdb3-core

# Quick state checks (no sudo needed)
systemctl is-enabled influxdb3-core
systemctl is-active  influxdb3-core

# Recent logs
sudo journalctl --unit influxdb3-core -n 200 --no-pager

# Follow logs
sudo journalctl --unit influxdb3-core -f
```

###### Inspect the packaged unit

The packaged unit configures security sandboxing for typical deployments
(see [Manage security](/influxdb3/core/admin/security/)).
To inspect the packaged unit and its resolved properties:

```bash
# Show the unit file
systemctl cat influxdb3-core

# Show all resolved properties (paths, environment, sandboxing options)
systemctl show influxdb3-core
```

###### Apply configuration changes

Edit the TOML configuration file and restart the service to apply
changes:

```bash
sudoedit /etc/influxdb3/influxdb3-core.conf
sudo systemctl restart influxdb3-core
sudo systemctl status  influxdb3-core
sudo journalctl --unit influxdb3-core -n 100 --no-pager
```

`influxdb3 serve` does not support configuration reload; a restart is
required after editing the TOML file or changing environment variables.

The TOML file is read by the systemd launcher and converted to`INFLUXDB3_*` environment variables before `influxdb3 serve` runs;
CLI flags still override values from the TOML file.
For details, see[TOML configuration files](/influxdb3/core/reference/config-options/#toml-configuration-files).

##### Run using SysV

On SysV init systems, `influxdb3-core` is disabled on install
and can be enabled by adjusting `/etc/default/influxdb3-core` to
contain `ENABLED=yes`.

To start the database, enter the following commands:

```bash
# Start the database
/etc/init.d/influxdb3-core start

# View status
/etc/init.d/influxdb3-core status

# View logs
tail -f /var/lib/influxdb3/influxdb3-core.log
```

### Verify the installation

After installing InfluxDB 3 Core, enter the following command to verify
that it installed successfully:

```bash
influxdb3 --version
```

If your system can’t locate `influxdb3` following a [quick install](#quick-install-for-linux-and-macos), `source` the configuration file (for example, `.bashrc`, `.zshrc`) for your shell–for example:

```zsh
source ~/.zshrc
```

[Get started with InfluxDB 3 Core](/influxdb3/core/get-started/)

#### Related

* [Upgrade InfluxDB 3 Core](/influxdb3/core/admin/upgrade/)

[install](/influxdb3/core/tags/install/)


---

## Get started with InfluxDB 3 Core

> [!Note]
> InfluxDB 3 Core is purpose-built for real-time data monitoring and recent data.
> InfluxDB 3 Enterprise builds on top of Core with support for historical data
> analysis and extended features.
> querying, high availability, read replicas, and more.
> Enterprise will soon unlock
> enhanced security, row-level deletions, an administration UI, and more.
> Learn more about [InfluxDB 3 Enterprise](/influxdb3/enterprise/).

This guide walks through the basic steps of getting started with InfluxDB 3 Core,
including the following:

1. [Set up InfluxDB 3 Core](/influxdb3/core/get-started/setup/)
2. [Write data to InfluxDB 3 Core](/influxdb3/core/get-started/write/)
3. [Query data in InfluxDB 3 Core](/influxdb3/core/get-started/query/)
4. [Process data in InfluxDB 3 Core](/influxdb3/core/get-started/process/)
5. [Migrate from InfluxDB v1 or v2](/influxdb3/core/get-started/migrate-from-influxdb-v1-v2/)

#### Find support for InfluxDB 3 Core

The [InfluxDB Discord server](https://discord.gg/9zaNCW2PRT) is the best place to find support for InfluxDB 3 Core and InfluxDB 3 Enterprise.
For other InfluxDB versions, see the [Support and feedback](#bug-reports-and-feedback) options.

## Data model

The InfluxDB 3 Core server contains logical databases; databases contain
tables; and tables are comprised of columns.

Compared to previous versions of InfluxDB, you can think of a database as an
InfluxDB v2 `bucket` in v2 or an InfluxDB v1 `db/retention_policy`.
A `table` is equivalent to an InfluxDB v1 and v2 `measurement`.

Columns in a table represent time, tags, and fields. Columns can be one of the
following types:

* String dictionary (tag)
* `int64` (field)
* `float64` (field)
* `uint64` (field)
* `bool` (field)
* `string` (field)
* `time` (time with nanosecond precision)

In InfluxDB 3 Core, every table has a primary key–the ordered set of tags and the time–for its data.
The primary key uniquely identifies each and determines the sort order for all
Parquet files related to the table. When you create a table, either through an
explicit call or by writing data into a table for the first time, it sets the
primary key to the tags in the order they arrived.
Although InfluxDB is still a *schema-on-write* database, the tag column
definitions for a table are immutable.

Tags should hold unique identifying information like `sensor_id`, `building_id`,
or `trace_id`. All other data should be stored as fields.

## Tools to use

The following table compares tools that you can use to interact with InfluxDB 3 Core.
This tutorial covers many of the recommended tools.

|                                     Tool                                     |Administration|Write|Query|
|------------------------------------------------------------------------------|--------------|-----|-----|
|       **[`influxdb3` CLI](/influxdb3/core/reference/cli/influxdb3/)**        |    **✓**     |**✓**|**✓**|
|           **[InfluxDB HTTP API](/influxdb3/core/reference/api/)**            |    **✓**     |**✓**|**✓**|
|               **[InfluxDB 3 Explorer](/influxdb3/explorer/)**                |    **✓**     |**✓**|**✓**|
|[InfluxDB 3 client libraries](/influxdb3/core/reference/client-libraries/v3/) |      \-      |**✓**|**✓**|
|[InfluxDB v2 client libraries](/influxdb3/core/reference/client-libraries/v2/)|      \-      |**✓**| \-  |
|[InfluxDB v1 client libraries](/influxdb3/core/reference/client-libraries/v1/)|      \-      |**✓**|**✓**|
|           [InfluxDB 3 processing engine](/influxdb3/core/plugins/)           |              |**✓**|**✓**|
|                          [Telegraf](/telegraf/v1/)                           |      \-      |**✓**| \-  |
|                        [Chronograf](/chronograf/v1/)                         |      \-      | \-  | \-  |
|                                 `influx` CLI                                 |      \-      | \-  | \-  |
|                               `influxctl` CLI                                |      \-      | \-  | \-  |
|                         InfluxDB v2.x user interface                         |      \-      | \-  | \-  |
|                            **Third-party tools**                             |              |     |     |
|                              Flight SQL clients                              |      \-      | \-  |**✓**|
|              [Grafana](/influxdb3/core/visualize-data/grafana/)              |      \-      | \-  |**✓**|

[Set up InfluxDB 3 Core](/influxdb3/core/get-started/setup/)

#### Related

* [Query system data](/influxdb3/core/admin/query-system-data/)
* [Write data to InfluxDB 3 Core](/influxdb3/core/write-data/)
* [Query data in InfluxDB 3 Core](/influxdb3/core/query-data/)
| Tool | Administration | Write | Query |
| --- | --- | --- | --- |
| Tool | Administration | Write | Query |
| influxdb3  CLI | ✓ | ✓ | ✓ |
| InfluxDB HTTP API | ✓ | ✓ | ✓ |
| InfluxDB 3 Explorer | ✓ | ✓ | ✓ |
| InfluxDB 3 client libraries | - | ✓ | ✓ |
| InfluxDB v2 client libraries | - | ✓ | - |
| InfluxDB v1 client libraries | - | ✓ | ✓ |
| InfluxDB 3 processing engine |  | ✓ | ✓ |
| Telegraf | - | ✓ | - |
| Chronograf | - | - | - |
| influx  CLI | - | - | - |
| influxctl  CLI | - | - | - |
| InfluxDB v2.x user interface | - | - | - |
| Third-party tools |  |  |  |
| Flight SQL clients | - | - | ✓ |
| Grafana | - | - | ✓ |


---

## InfluxDB HTTP API

[Download InfluxDB 3 Core API Spec](/openapi/influxdb3-core-openapi.yml)

Use the InfluxDB 3 Core HTTP API to write data, query data, and manage databases, tables, and tokens.

### [Quick start](/influxdb3/core/api/quick-start/)

Authenticate, write, and query with the API:

### [Authentication](/influxdb3/core/api/authentication/)

Use one of the following schemes to authenticate to the InfluxDB 3 Core API:

### [Headers and parameters](/influxdb3/core/api/headers-and-parameters/)

Most InfluxDB API endpoints require parameters in the request–for example, specifying the database to use.

### [Migrate from InfluxDB v1 or v2](/influxdb3/core/api/migrate-from-influxdb-v1-or-v2/)

Migrate your existing InfluxDB v1 or v2 workloads to InfluxDB 3 Core.

### [Auth token](/influxdb3/core/api/auth-token/)

Create and manage tokens used for authenticating and authorizing access to InfluxDB 3 Core resources.

### [Cache distinct values](/influxdb3/core/api/cache-distinct-values/)

The Distinct Value Cache (DVC) lets you cache distinct values of one or more columns in a table, improving the performance of queries that return distinct tag and field values.

### [Cache last value](/influxdb3/core/api/cache-last-value/)

The Last Value Cache (LVC) lets you cache the most recent values for specific fields in a table, improving the performance of queries that return the most recent value of a field for specific series…

### [Database](/influxdb3/core/api/database/)

Create, list, and delete databases in InfluxDB 3 Core.

### [Processing engine](/influxdb3/core/api/processing-engine/)

Manage Processing engine triggers, test plugins, and send requests to trigger On Request plugins.

### [Query data](/influxdb3/core/api/query-data/)

Query data stored in InfluxDB 3 Core using SQL or InfluxQL.

### [Server information](/influxdb3/core/api/server-information/)

Retrieve server metrics, health status, and version information for InfluxDB 3 Core.

### [Table](/influxdb3/core/api/table/)

Manage table schemas in an InfluxDB 3 Core database.

### [Write data](/influxdb3/core/api/write-data/)

Write data to InfluxDB 3 Core using line protocol format.


---

## Administer InfluxDB 3 Core

The following articles provide information about managing your
InfluxDB 3 Core resources:

### [Identify InfluxDB 3 Core version](/influxdb3/core/admin/identify-version/)

Learn how to identify your InfluxDB 3 Core version using command-line tools, HTTP endpoints, and other methods.

### [Manage databases](/influxdb3/core/admin/databases/)

An InfluxDB 3 Core database is a named location where time series data is stored. Each database can contain multiple tables.

### [Manage tables](/influxdb3/core/admin/tables/)

Tables in InfluxDB 3 Core are synonymous with measurements and contain time series data. Each table has a defined schema with tag and field columns.

### [Manage tokens](/influxdb3/core/admin/tokens/)

Manage tokens to authenticate and authorize access to server actions, resources, and data in an InfluxDB 3 Core instance.

### [Manage the Last Value Cache](/influxdb3/core/admin/last-value-cache/)

The InfluxDB 3 Core Last Value Cache (LVC) lets you cache the most recent values for specific fields in a table, improving the performance of queries that return the most recent value of a field for specific time series or the last N values of a field.

### [Manage the Distinct Value Cache](/influxdb3/core/admin/distinct-value-cache/)

The InfluxDB 3 Core Distinct Value Cache (DVC) lets you cache distinct values of one or more columns in a table, improving the performance of queries that return distinct tag and field values.

### [Query system data](/influxdb3/core/admin/query-system-data/)

Query system tables to see data related
to the server, queries, and tables in an InfluxDB 3 Core instance.
Use the HTTP SQL query API to retrieve information about your database server
and table schemas.

### [Back up and restore data](/influxdb3/core/admin/backup-restore/)

Back up and restore your InfluxDB 3 Core instance by copying object storage files in the recommended order.

### [Performance tuning](/influxdb3/core/admin/performance-tuning/)

Optimize InfluxDB 3 Core performance by tuning thread allocation, memory settings, and other configuration options for your specific workload.

### [Security](/influxdb3/core/admin/security/)

Tune InfluxDB 3 Core security for local requirements.

### [Upgrade InfluxDB 3 Core](/influxdb3/core/admin/upgrade/)

Learn how to upgrade your InfluxDB 3 Core instance to the latest version.

### [Upgrade to InfluxDB 3 Enterprise](/influxdb3/core/admin/upgrade-to-enterprise/)

Upgrade from InfluxDB 3 Core to InfluxDB 3 Enterprise. Your existing data and plugins are compatible–no data migration is required.

### [Use the InfluxDB 3 MCP server](/influxdb3/core/admin/mcp-server/)

Use the **InfluxDB Model Context Protocol (MCP) server** to interact with and manage InfluxDB 3 Core using natural language with LLM agents to query and analyze data, manage databases and more. Query InfluxDB 3 Core documentation from your IDE using the InfluxDB documentation Model Context Protocol (MCP) server.

---
title: Use the InfluxDB v3 HTTP query API
description: Use SQL or InfluxQL and the InfluxDB v3 HTTP query API to query data in InfluxDB 3 Core.
url: https://docs.influxdata.com/influxdb3/core/query-data/execute-queries/influxdb-v3-api/
estimated_tokens: 2553
product: InfluxDB 3 Core
version: core
publisher: InfluxData
canonical: https://docs.influxdata.com/influxdb3/core/query-data/execute-queries/influxdb-v3-api/
date: '2025-07-07T23:10:37-05:00'
lastmod: '2025-07-07T23:10:37-05:00'
---

* InfluxQL
* SQL

Use the InfluxDB 3 HTTP query API to query data in InfluxDB 3 Core.
The API provides `GET` and `POST` endpoints for querying data and system information using SQL or InfluxQL.

#### Query using gRPC or HTTP

InfluxDB 3 supports HTTP and Flight (gRPC) query APIs.
For more information about using Flight, see the [InfluxDB 3 (`influxdb3-`) client libraries](https://github.com/InfluxCommunity/).

The examples below use **cURL** to send HTTP requests to the InfluxDB 3 HTTP API,
but you can use any HTTP client.

* [Query using SQL and the HTTP API](#query-using-sql-and-the-http-api)
* [Query using InfluxQL and the HTTP API](#query-using-influxql-and-the-http-api)

## Query using SQL and the HTTP API

Use the `/api/v3/query_sql` endpoint with the `GET` or `POST` request methods.

* `GET`: Pass parameters in the URL query string (for simple queries)
* `POST`: Pass parameters in a JSON object (for complex queries and readability in your code)

Include the following parameters:

* `q`: *(Required)* The **SQL** query to execute.
* `db`: *(Required)* The database to execute the query against.
* `params`: A JSON object containing parameters to be used in a *parameterized query*.
* `format`: The format of the response (`json`, `jsonl`, `csv`, `pretty`, or `parquet`).
  JSONL (`jsonl`) is preferred because it streams results back to the client.`pretty` is for human-readable output. Default is `json`.

### Example: Query passing URL-encoded parameters

The following example sends an HTTP `GET` request with a URL-encoded SQL query:

```bash
curl "http://localhost:8181/api/v3/query_sql?db=servers&q=select+*+from+cpu+limit+5" \
  --header "Authorization: Bearer AUTH_TOKEN"
```

### Example: Query passing JSON parameters

The following example sends an HTTP `POST` request with parameters in a JSON payload:

```
curl http://localhost:8181/api/v3/query_sql \
  --header "Authorization: Bearer AUTH_TOKEN"
  --json '{"db": "server", "q": "select * from cpu limit 5"}'
```

### Query system information

Use the HTTP API `/api/v3/query_sql` endpoint to retrieve system information
about your database server and table schemas in InfluxDB 3 Core.

#### Examples

#### system\_ sample data

In examples, tables with `"table_name":"system_` are user-created tables for CPU, memory, disk,
network, and other resource statistics collected and written
by the user–for example, using the `psutil` Python library or[Telegraf](/telegraf/v1/get-started/) to collect
and write system metrics to an InfluxDB 3 database.

##### Show tables

The following example sends a `GET` request that executes a `show tables` query
to retrieve all user-created
tables (`"table_schema":"iox"`), system tables, and information schema tables
for a database:

```bash
curl "http://localhost:8181/api/v3/query_sql?db=mydb&format=jsonl&q=show%20tables" \
  --header "Authorization: Bearer AUTH_TOKEN"
```

The response body contains the following JSONL:

```jsonl
{"table_catalog":"public","table_schema":"iox","table_name":"system_cpu","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_cpu_cores","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_memory","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_memory_faults","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_disk_usage","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_disk_io","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_disk_performance","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_network","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"system","table_name":"distinct_caches","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"system","table_name":"last_caches","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"system","table_name":"parquet_files","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"system","table_name":"processing_engine_plugins","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"system","table_name":"processing_engine_triggers","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"system","table_name":"queries","table_type":"BASE TABLE"}
{"table_catalog":"public","table_schema":"information_schema","table_name":"tables","table_type":"VIEW"}
{"table_catalog":"public","table_schema":"information_schema","table_name":"views","table_type":"VIEW"}
{"table_catalog":"public","table_schema":"information_schema","table_name":"columns","table_type":"VIEW"}
{"table_catalog":"public","table_schema":"information_schema","table_name":"df_settings","table_type":"VIEW"}
{"table_catalog":"public","table_schema":"information_schema","table_name":"schemata","table_type":"VIEW"}
```

A table has one of the following `table_schema` values:

* `iox`: tables created by the user of the database.
* `system`: tables used by the system to show information about the running database server.
  Some of these tables show stored information such as configurations,
  while others, such as the `queries` table, hold ephemeral state in memory.
* `information_schema`: views that show schema information for tables in the database.

#### View column information for a table

The following query sends a `POST` request that executes an SQL query to
retrieve information about columns in the sample `system_swap` table schema:

*Note: when you send a query in JSON, you must escape single quotes
that surround field names.*

```bash
curl "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --json '{
    "db": "mydb",
    "q": "SELECT * FROM information_schema.columns WHERE table_schema = '"'iox'"' AND table_name = '"'system_swap'"'",
    "format": "jsonl"
  }'
```

The output is similar to the following:

```jsonl
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","column_name":"free","ordinal_position":0,"is_nullable":"YES","data_type":"UInt64"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","column_name":"host","ordinal_position":1,"is_nullable":"NO","data_type":"Dictionary(Int32, Utf8)"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","column_name":"percent","ordinal_position":2,"is_nullable":"YES","data_type":"Float64","numeric_precision":24,"numeric_precision_radix":2}
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","column_name":"sin","ordinal_position":3,"is_nullable":"YES","data_type":"UInt64"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","column_name":"sout","ordinal_position":4,"is_nullable":"YES","data_type":"UInt64"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","column_name":"time","ordinal_position":5,"is_nullable":"NO","data_type":"Timestamp(Nanosecond, None)"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","column_name":"total","ordinal_position":6,"is_nullable":"YES","data_type":"UInt64"}
{"table_catalog":"public","table_schema":"iox","table_name":"system_swap","column_name":"used","ordinal_position":7,"is_nullable":"YES","data_type":"UInt64"}
```

#### Recently executed queries

To view recently executed queries, query the `queries` system table:

```bash
curl "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --json '{
    "db": "mydb",
    "q": "SELECT * FROM system.queries LIMIT 2",
    "format": "jsonl"
  }'
```

The output is similar to the following:

```jsonl
{"id":"cdd63409-1822-4e65-8e3a-d274d553dbb3","phase":"success","issue_time":"2025-01-20T17:01:40.690067","query_type":"sql","query_text":"show tables","partitions":0,"parquet_files":0,"plan_duration":"PT0.032689S","permit_duration":"PT0.000202S","execute_duration":"PT0.000223S","end2end_duration":"PT0.033115S","compute_duration":"P0D","max_memory":0,"success":true,"running":false,"cancelled":false}
{"id":"47f8d312-5e75-4db2-837a-6fcf94c09927","phase":"success","issue_time":"2025-01-20T17:02:32.627782","query_type":"sql","query_text":"show tables","partitions":0,"parquet_files":0,"plan_duration":"PT0.000583S","permit_duration":"PT0.000015S","execute_duration":"PT0.000063S","end2end_duration":"PT0.000662S","compute_duration":"P0D","max_memory":0,"success":true,"running":false,"cancelled":false}
```

## Query using InfluxQL and the HTTP API

Use the `/api/v3/query_influxql` endpoint with the `GET` or `POST` request methods.

* `GET`: Pass parameters in the URL query string (for simple queries)
* `POST`: Pass parameters in a JSON object (for complex queries and readability in your code)

Include the following parameters:

* `q`: *(Required)* The **InfluxQL** query to execute.
* `db`: *(Required)* The database to execute the query against.
* `params`: A JSON object containing parameters to be used in a *parameterized query*.
* `format`: The format of the response (`json`, `jsonl`, `csv`, `pretty`, or `parquet`).
  JSONL (`jsonl`) is preferred because it streams results back to the client.`pretty` is for human-readable output. Default is `json`.

### Example: Query passing URL-encoded parameters

The following example sends an HTTP `GET` request with a URL-encoded InfluxQL query:

```bash
curl "http://localhost:8181/api/v3/query_influxql?db=servers&q=select+*+from+cpu+limit+5" \
  --header "Authorization: Bearer AUTH_TOKEN"
```

### Example: Query passing JSON parameters

The following example sends an HTTP `POST` request with parameters in a JSON payload:

```
curl http://localhost:8181/api/v3/query_influxql \
  --header "Authorization: Bearer AUTH_TOKEN" \
  --json '{"db": "server", "q": "select * from cpu limit 5"}'
```

#### Related

[query](/influxdb3/core/tags/query/)[influxql](/influxdb3/core/tags/influxql/)[sql](/influxdb3/core/tags/sql/)[python](/influxdb3/core/tags/python/)
