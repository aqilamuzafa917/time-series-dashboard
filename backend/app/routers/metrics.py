from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app import influx
from app.config import Settings, get_settings

router = APIRouter()

# Safe whitelist for interval values passed to DATE_BIN.
# InfluxDB 3 Core's parameterized query engine may not support the
# $interval::INTERVAL cast syntax, so we validate against a known-good
# set and interpolate the literal string directly into the SQL.
VALID_INTERVALS = {"1m", "5m", "15m", "30m", "1h", "6h", "12h", "1d"}


def compute_status(value: float, thresholds: dict) -> str:
    """Compute status by checking critical bounds before warning bounds."""
    if thresholds.get("critical_high") is not None and value > thresholds["critical_high"]:
        return "critical"
    if thresholds.get("critical_low") is not None and value < thresholds["critical_low"]:
        return "critical"
    if thresholds.get("warning_high") is not None and value > thresholds["warning_high"]:
        return "warning"
    if thresholds.get("warning_low") is not None and value < thresholds["warning_low"]:
        return "warning"
    return "ok"


def _thresholds_by_metric(request: Request) -> dict[str, dict]:
    """Return a dict mapping metric name → threshold config dict."""
    return {t["metric"]: t for t in request.app.state.thresholds}


@router.get("/metrics/summary")
async def metrics_summary(
    request: Request,
    source_id: list[str] = Query(default=[]),
    metric: list[str] = Query(default=[]),
    start: Optional[str] = Query(default=None),
    end: Optional[str] = Query(default=None),
    settings: Settings = Depends(get_settings),
):
    # Build parameterized WHERE clause
    conditions = []
    params: dict = {}

    if start:
        conditions.append("time >= $start")
        params["start"] = start
    if end:
        conditions.append("time < $end")
        params["end"] = end

    # Parameterize IN lists with individual $sN / $mN placeholders
    if source_id:
        placeholders = ", ".join(f"$s{i}" for i in range(len(source_id)))
        conditions.append(f"source_id IN ({placeholders})")
        for i, sid in enumerate(source_id):
            params[f"s{i}"] = sid

    if metric:
        placeholders = ", ".join(f"$m{i}" for i in range(len(metric)))
        conditions.append(f"metric IN ({placeholders})")
        for i, m in enumerate(metric):
            params[f"m{i}"] = m

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    sql = f"""
        SELECT
            source_id,
            metric,
            selector_last(value, time)['value'] AS current,
            AVG(value)   AS avg,
            MIN(value)   AS min,
            MAX(value)   AS max,
            COUNT(*)     AS count
        FROM {settings.influxdb_measurement}
        {where_clause}
        GROUP BY source_id, metric
    """


    rows = await influx.query_sql(sql, params, settings)

    thresholds_map = _thresholds_by_metric(request)
    result = []
    for row in rows:
        metric_name = row.get("metric", "")
        current = row.get("current") or 0.0
        avg_val = row.get("avg") or 0.0
        min_val = row.get("min") or 0.0
        max_val = row.get("max") or 0.0
        t = thresholds_map.get(metric_name, {})
        result.append({
            "source_id": row.get("source_id"),
            "metric": metric_name,
            "current": current,
            "avg": avg_val,
            "min": min_val,
            "max": max_val,
            "count": row.get("count"),
            "status": compute_status(current, t),
            "status_avg": compute_status(avg_val, t),
            "status_min": compute_status(min_val, t),
            "status_max": compute_status(max_val, t),
        })

    return result


@router.get("/metrics/timeseries")
async def metrics_timeseries(
    request: Request,
    start: str = Query(...),
    end: str = Query(...),
    interval: str = Query(...),
    source_id: list[str] = Query(default=[]),
    metric: list[str] = Query(default=[]),
    settings: Settings = Depends(get_settings),
):
    # Validate interval against whitelist before interpolating into SQL.
    # InfluxDB 3 Core's parameterized query engine does not reliably support
    # the $interval::INTERVAL cast, so we interpolate the literal directly.
    # The whitelist ensures this is safe despite not using a $param.
    if interval not in VALID_INTERVALS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid interval '{interval}'. Must be one of: {sorted(VALID_INTERVALS)}",
        )

    conditions = [
        "time >= $start",
        "time < $end",
    ]
    params: dict = {"start": start, "end": end}

    if source_id:
        placeholders = ", ".join(f"$s{i}" for i in range(len(source_id)))
        conditions.append(f"source_id IN ({placeholders})")
        for i, sid in enumerate(source_id):
            params[f"s{i}"] = sid

    if metric:
        placeholders = ", ".join(f"$m{i}" for i in range(len(metric)))
        conditions.append(f"metric IN ({placeholders})")
        for i, m in enumerate(metric):
            params[f"m{i}"] = m

    where_clause = f"WHERE {' AND '.join(conditions)}"

    # interval is safe to interpolate — validated against VALID_INTERVALS above
    sql = f"""
        SELECT
            DATE_BIN(INTERVAL '{interval}', time, TIMESTAMP '1970-01-01') AS time,
            source_id,
            source_type,
            metric,
            AVG(value) AS avg,
            MIN(value) AS min,
            MAX(value) AS max,
            COUNT(*)   AS count
        FROM {settings.influxdb_measurement}
        {where_clause}
        GROUP BY 1, source_id, source_type, metric
        ORDER BY 1
    """

    rows = await influx.query_sql(sql, params, settings)

    unit_sql = f"""
        SELECT
            DATE_BIN(INTERVAL '{interval}', time, TIMESTAMP '1970-01-01') AS time,
            source_id,
            source_type,
            metric,
            selector_last(unit, time)['value'] AS unit
        FROM {settings.influxdb_measurement}
        {where_clause}
        GROUP BY 1, source_id, source_type, metric
    """
    unit_rows = await influx.query_sql(unit_sql, params, settings)
    unit_map = { (r.get("time"), r.get("source_id"), r.get("source_type"), r.get("metric")): r.get("unit") for r in unit_rows }

    thresholds_map = _thresholds_by_metric(request)
    for row in rows:
        key = (row.get("time"), row.get("source_id"), row.get("source_type"), row.get("metric"))
        row["unit"] = unit_map.get(key)
        
        avg_val = row.get("avg")
        if avg_val is not None:
            metric_name = row.get("metric", "")
            t = thresholds_map.get(metric_name, {})
            row["status"] = compute_status(avg_val, t)

    return rows


@router.get("/metrics/latest")
async def metrics_latest(
    source_id: list[str] = Query(default=[]),
    limit: int = Query(default=10, ge=1),
    settings: Settings = Depends(get_settings),
):
    # Cap at 100 silently
    capped_limit = min(limit, 100)
    params: dict = {"limit": capped_limit}

    conditions = ["time >= now() - INTERVAL '6 hours'"]

    if source_id:
        placeholders = ", ".join(f"$s{i}" for i in range(len(source_id)))
        conditions.append(f"source_id IN ({placeholders})")
        for i, sid in enumerate(source_id):
            params[f"s{i}"] = sid

    where_clause = f"WHERE {' AND '.join(conditions)}"

    sql = f"""
        SELECT time, source_id, source_type, metric, value, unit
        FROM {settings.influxdb_measurement}
        {where_clause}
        ORDER BY time DESC
        LIMIT $limit
    """

    rows = await influx.query_sql(sql, params, settings)
    return rows


@router.get("/metrics/list")
async def metrics_list(
    request: Request,
    active_only: bool = Query(default=False),
    settings: Settings = Depends(get_settings),
):
    # Fetch from InfluxDB metadata catalog using InfluxQL to avoid Parquet file scans
    try:
        sql_sources = f'SHOW TAG VALUES FROM "{settings.influxdb_measurement}" WITH KEY = "source_id"'
        sources_res = await influx.query_influxql(sql_sources, settings)

        sql_metrics = f'SHOW TAG VALUES FROM "{settings.influxdb_measurement}" WITH KEY = "metric"'
        metrics_res = await influx.query_influxql(sql_metrics, settings)

        def extract_values(res: dict) -> list[str]:
            results = res.get("results", [])
            if not results: return []
            series = results[0].get("series", [])
            if not series: return []
            values = series[0].get("values", [])
            return [v[1] for v in values if len(v) > 1]

        sources = extract_values(sources_res)
        metrics = extract_values(metrics_res)
    except Exception as e:
        print(f"Error fetching metadata: {e}")
        sources = []
        metrics = []

    # Filter sources to only active ones when requested
    if active_only:
        overrides = getattr(request.app.state, "sources", [])
        # Build a set of source_ids that are explicitly marked inactive
        inactive_ids = {o["source_id"] for o in overrides if not o.get("active", True)}
        sources = [s for s in sources if s not in inactive_ids]

    return {"sources": sources, "metrics": metrics}


@router.get("/metrics/detail")
async def metrics_detail(
    request: Request,
    source_id: str = Query(...),
    metric: str = Query(...),
    start: Optional[str] = Query(default=None),
    end: Optional[str] = Query(default=None),
    interval: str = Query(default="5m"),
    settings: Settings = Depends(get_settings),
):
    if interval not in VALID_INTERVALS:
        raise HTTPException(status_code=422, detail="Invalid interval")
        
    conditions = ["source_id = $sid", "metric = $met"]
    params: dict = {"sid": source_id, "met": metric}
    
    if start:
        conditions.append("time >= $start")
        params["start"] = start
    if end:
        conditions.append("time < $end")
        params["end"] = end
        
    where_clause = f"WHERE {' AND '.join(conditions)}"
    
    # 1. Summary
    sql_summary = f"""
        SELECT
            selector_last(value, time)['value'] AS current,
            AVG(value)   AS avg,
            MIN(value)   AS min,
            MAX(value)   AS max,
            COUNT(*)     AS count
        FROM {settings.influxdb_measurement}
        {where_clause}
    """
    summary_rows = await influx.query_sql(sql_summary, params, settings)
    
    thresholds_map = _thresholds_by_metric(request)
    t = thresholds_map.get(metric, {})
    
    summary_item = None
    if summary_rows:
        r = summary_rows[0]
        current = r.get("current") or 0.0
        summary_item = {
            "source_id": source_id,
            "metric": metric,
            "current": current,
            "avg": r.get("avg"),
            "min": r.get("min"),
            "max": r.get("max"),
            "count": r.get("count"),
            "status": compute_status(current, t)
        }
        
    # 2. Timeseries
    sql_ts = f"""
        SELECT
            DATE_BIN(INTERVAL '{interval}', time, TIMESTAMP '1970-01-01') AS time,
            AVG(value) AS avg,
            MIN(value) AS min,
            MAX(value) AS max,
            COUNT(*)   AS count
        FROM {settings.influxdb_measurement}
        {where_clause}
        GROUP BY 1
        ORDER BY 1
    """
    ts_rows = await influx.query_sql(sql_ts, params, settings)
    
    # 3. Unit for timeseries
    sql_unit = f"""
        SELECT
            DATE_BIN(INTERVAL '{interval}', time, TIMESTAMP '1970-01-01') AS time,
            selector_last(unit, time)['value'] AS unit
        FROM {settings.influxdb_measurement}
        {where_clause}
        GROUP BY 1
    """
    unit_rows = await influx.query_sql(sql_unit, params, settings)
    unit_map = {r.get("time"): r.get("unit") for r in unit_rows}
    
    for row in ts_rows:
        row["source_id"] = source_id
        row["metric"] = metric
        row["unit"] = unit_map.get(row.get("time"))
        avg_val = row.get("avg")
        if avg_val is not None:
            row["status"] = compute_status(avg_val, t)
            
    return {
        "summary": summary_item,
        "timeseries": ts_rows
    }
