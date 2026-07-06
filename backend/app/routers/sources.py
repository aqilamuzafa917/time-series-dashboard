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
    sql = """
        SELECT source_id, source_type, MAX(time) AS latest_at, COUNT(*) AS record_count 
        FROM device_metrics 
        GROUP BY source_id, source_type
    """
    rows = await influx.query_sql(sql, {}, settings)
    
    # Merge with overrides
    overrides = request.app.state.sources
    override_map = {o["source_id"]: o for o in overrides}
    
    result = []
    # Include all distinct sources from DB
    for row in rows:
        sid = row.get("source_id")
        ov = override_map.get(sid, {})
        result.append({
            "source_id": sid,
            "display_name": ov.get("display_name", sid),
            "source_type": ov.get("source_type", row.get("source_type", "unknown")),
            "description": ov.get("description", ""),
            "active": ov.get("active", True),
            "latest_at": row.get("latest_at"),
            "record_count": row.get("record_count", 0)
        })
        
    # Also include sources from overrides that might not have DB data yet
    db_sources = {r.get("source_id") for r in rows if r.get("source_id")}
    for sid, ov in override_map.items():
        if sid not in db_sources:
            result.append({
                "source_id": sid,
                "display_name": ov.get("display_name", sid),
                "source_type": ov.get("source_type", "unknown"),
                "description": ov.get("description", ""),
                "active": ov.get("active", True),
                "latest_at": None,
                "record_count": 0
            })
            
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
