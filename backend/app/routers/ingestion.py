from fastapi import APIRouter, Depends

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

@router.get("/ingestion/errors")
async def ingestion_errors(settings: Settings = Depends(get_settings)):
    sql = """
        SELECT time, source_id, method, records_rejected, error_message 
        FROM ingestion_log 
        WHERE error_message IS NOT NULL AND error_message != '' 
        ORDER BY time DESC 
        LIMIT 20
    """
    rows = await influx.query_sql(sql, {}, settings)
    return rows
