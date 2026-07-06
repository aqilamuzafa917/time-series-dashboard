from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app import influx
from app.config import Settings, get_settings

router = APIRouter()


@router.get("/health")
async def health(settings: Settings = Depends(get_settings)):
    connected = await influx.ping(settings)
    
    latest_ingested_at = None
    if connected:
        try:
            sql = f"SELECT MAX(time) AS latest FROM {settings.influxdb_measurement}"
            rows = await influx.query_sql(sql, {}, settings)
            if rows and rows[0].get("latest"):
                latest_ingested_at = rows[0]["latest"]
        except Exception:
            pass

    return {
        "status": "ok" if connected else "degraded",
        "influxdb_connected": connected,
        "database": settings.influxdb_database,
        "latest_ingested_at": latest_ingested_at,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
