import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app import influx
from app.config import Settings, get_settings

router = APIRouter()

class SourceCreate(BaseModel):
    source_id: str
    display_name: str
    source_type: str
    description: Optional[str] = ""
    active: Optional[bool] = True

class SourceUpdate(BaseModel):
    display_name: Optional[str] = None
    source_type: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None

def _get_sources_file() -> Path:
    return Path(__file__).parent.parent.parent / "config" / "sources.json"

@router.get("/sources")
async def get_sources(request: Request, settings: Settings = Depends(get_settings)):
    # Use InfluxQL SHOW TAG VALUES to get all sources without hitting parquet file limits
    try:
        sql = f'SHOW TAG VALUES FROM "{settings.influxdb_measurement}" WITH KEY = "source_id" WHERE time >= now() - 30d'
        res = await influx.query_influxql(sql, settings)
        
        db_source_ids: list[str] = []
        results = res.get("results", [])
        if results:
            series = results[0].get("series", [])
            if series:
                for v in series[0].get("values", []):
                    if len(v) > 1:
                        db_source_ids.append(v[1])
    except Exception:
        db_source_ids = []
    
    # Get latest_at, record_count, and source_type per source via SQL.
    # source_type is stored as a tag in InfluxDB — query it directly.
    stats_map: dict = {}
    try:
        stats_sql = f"""
            SELECT source_id, source_type, MAX(time) AS latest_at, COUNT(*) AS record_count
            FROM {settings.influxdb_measurement}
            WHERE time >= now() - INTERVAL '30 days'
            GROUP BY source_id, source_type
        """
        stats_rows = await influx.query_sql(stats_sql, {}, settings)
        for row in stats_rows:
            sid = row.get("source_id")
            if sid:
                # Keep the most recent entry per source_id (in case of multiple source_type tags)
                existing = stats_map.get(sid)
                row_latest = row.get("latest_at")
                if not existing or (row_latest and row_latest > existing.get("latest_at", "")):
                    stats_map[sid] = {
                        "latest_at": row_latest,
                        "record_count": row.get("record_count", 0),
                        "source_type": row.get("source_type") or "unknown",
                    }
    except Exception:
        pass
    
    # Merge with overrides from sources.json
    overrides = request.app.state.sources
    override_map = {o["source_id"]: o for o in overrides}
    
    result = []
    seen = set()
    # Include all sources from DB
    for sid in db_source_ids:
        seen.add(sid)
        ov = override_map.get(sid, {})
        stats = stats_map.get(sid, {})
        db_source_type = stats.get("source_type", "unknown")

        # Auto-register new DB sources into overrides, using the DB source_type
        if sid not in override_map:
            new_ov = {
                "source_id": sid,
                "display_name": sid,
                "source_type": db_source_type,
                "description": "",
                "active": True
            }
            overrides.append(new_ov)
            override_map[sid] = new_ov

        # Prefer the user-set override if it's meaningful; fall back to what InfluxDB reports
        override_type = ov.get("source_type", "")
        effective_type = override_type if (override_type and override_type != "unknown") else db_source_type

        result.append({
            "source_id": sid,
            "display_name": ov.get("display_name", sid),
            "source_type": effective_type,
            "description": ov.get("description", ""),
            "active": ov.get("active", True),
            "latest_at": stats.get("latest_at"),
            "record_count": stats.get("record_count", 0)
        })
    
    # Include override-only sources not in DB
    for sid, ov in override_map.items():
        if sid not in seen:
            result.append({
                "source_id": sid,
                "display_name": ov.get("display_name", sid),
                "source_type": ov.get("source_type", "unknown"),
                "description": ov.get("description", ""),
                "active": ov.get("active", True),
                "latest_at": None,
                "record_count": 0
            })
    
    # Persist updated sources back to file (auto-sync from InfluxDB)
    try:
        with open(_get_sources_file(), "w") as f:
            json.dump(overrides, f, indent=2)
        request.app.state.sources = overrides
    except Exception:
        pass
    
    return result

@router.post("/sources", status_code=201)
async def create_source(source: SourceCreate, request: Request):
    if not source.source_id or not source.display_name or not source.source_type:
        raise HTTPException(status_code=422, detail="Missing required fields")
        
    sources = request.app.state.sources
    if any(s["source_id"] == source.source_id for s in sources):
        raise HTTPException(status_code=409, detail="Source ID already exists")
        
    new_entry = source.model_dump()
    sources.append(new_entry)
    
    with open(_get_sources_file(), "w") as f:
        json.dump(sources, f, indent=2)
        
    return new_entry

@router.put("/sources/{source_id}")
async def update_source(source_id: str, update: SourceUpdate, request: Request):
    sources = request.app.state.sources
    
    target = next((s for s in sources if s["source_id"] == source_id), None)
    if not target:
        target = {
            "source_id": source_id,
            "display_name": source_id,
            "source_type": "unknown",
            "description": "",
            "active": True
        }
        sources.append(target)
        
    if update.display_name is not None:
        target["display_name"] = update.display_name
    if update.source_type is not None:
        target["source_type"] = update.source_type
    if update.description is not None:
        target["description"] = update.description
    if update.active is not None:
        target["active"] = update.active
        
    with open(_get_sources_file(), "w") as f:
        json.dump(sources, f, indent=2)
        
    return target
