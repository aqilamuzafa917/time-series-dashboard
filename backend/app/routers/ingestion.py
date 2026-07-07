from typing import Optional

from fastapi import APIRouter, Depends, Query

from app import influx
from app.config import Settings, get_settings

router = APIRouter()

@router.get("/ingestion/summary")
async def ingestion_summary(settings: Settings = Depends(get_settings)):
    sql = """
        SELECT time, source_id, method, records_ingested 
        FROM ingestion_log 
        WHERE records_ingested > 0 
        ORDER BY time DESC 
        LIMIT 1
    """
    rows = await influx.query_sql(sql, {}, settings)
    
    if not rows:
        return {
            "latest_success_at": None,
            "last_batch_records": None,
            "last_batch_source": None,
            "last_batch_method": None
        }
        
    row = rows[0]
    return {
        "latest_success_at": row.get("time"),
        "last_batch_records": row.get("records_ingested"),
        "last_batch_source": row.get("source_id"),
        "last_batch_method": row.get("method")
    }

@router.get("/ingestion/log")
async def ingestion_log(
    start: Optional[str] = Query(default=None),
    end: Optional[str] = Query(default=None),
    settings: Settings = Depends(get_settings),
):
    conditions = []
    params: dict = {}

    if start:
        conditions.append("time >= $start")
        params["start"] = start
    else:
        conditions.append("time >= now() - INTERVAL '6 hours'")

    if end:
        conditions.append("time < $end")
        params["end"] = end

    where_clause = f"WHERE {' AND '.join(conditions)}"

    sql = f"""
        SELECT time, source_id, method, records_ingested, records_rejected
        FROM ingestion_log
        {where_clause}
        ORDER BY time DESC
        LIMIT 500
    """
    try:
        rows = await influx.query_sql(sql, params, settings)
        return rows
    except Exception as e:
        error_detail = str(getattr(e, "detail", e))
        if "Schema error" in error_detail or "No field named" in error_detail:
            return []
        raise


@router.get("/ingestion/errors")
async def ingestion_errors(settings: Settings = Depends(get_settings)):
    sql = """
        SELECT time, source_id, method, records_rejected, error_message 
        FROM ingestion_log 
        WHERE error_message IS NOT NULL AND error_message != '' 
        ORDER BY time DESC 
        LIMIT 20
    """
    try:
        rows = await influx.query_sql(sql, {}, settings)
        return rows
    except Exception as e:
        # If the error_message column doesn't exist yet (because no errors have ever happened),
        # InfluxDB DataFusion will throw a Schema error. We can safely return an empty list.
        error_detail = str(getattr(e, "detail", e))
        if "Schema error" in error_detail or "No field named error_message" in error_detail:
            return []
        raise
