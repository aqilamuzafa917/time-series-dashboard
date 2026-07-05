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
            LAST(value)  AS current,
            AVG(value)   AS avg,
            MIN(value)   AS min,
            MAX(value)   AS max,
            COUNT(*)     AS count
        FROM device_metrics
        {where_clause}
        GROUP BY source_id, metric
    """

    rows = await influx.query_sql(sql, params, settings)

    thresholds_map = _thresholds_by_metric(request)
    result = []
    for row in rows:
        metric_name = row.get("metric", "")
        current = row.get("current") or 0.0
        t = thresholds_map.get(metric_name, {})
        result.append({
            "source_id": row.get("source_id"),
            "metric": metric_name,
            "current": current,
            "avg": row.get("avg"),
            "min": row.get("min"),
            "max": row.get("max"),
            "count": row.get("count"),
            "status": compute_status(current, t),
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
            metric,
            AVG(value) AS avg,
            MIN(value) AS min,
            MAX(value) AS max,
            COUNT(*)   AS count
        FROM device_metrics
        {where_clause}
        GROUP BY 1, source_id, metric
        ORDER BY 1
    """

    rows = await influx.query_sql(sql, params, settings)
    return rows


@router.get("/metrics/latest")
async def metrics_latest(
    limit: int = Query(default=10, ge=1),
    settings: Settings = Depends(get_settings),
):
    # Cap at 100 silently
    capped_limit = min(limit, 100)
    params = {"limit": capped_limit}

    sql = """
        SELECT time, source_id, source_type, metric, value, unit
        FROM device_metrics
        ORDER BY time DESC
        LIMIT $limit
    """

    rows = await influx.query_sql(sql, params, settings)
    return rows
