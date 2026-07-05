from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app import influx
from app.config import Settings, get_settings

router = APIRouter()


@router.get("/health")
async def health(settings: Settings = Depends(get_settings)):
    connected = await influx.ping(settings)
    if connected:
        return {
            "status": "ok",
            "influxdb_connected": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    return {
        "status": "degraded",
        "influxdb_connected": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
