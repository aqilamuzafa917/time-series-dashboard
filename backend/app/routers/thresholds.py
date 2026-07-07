import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter()

class ThresholdCreate(BaseModel):
    metric: str
    warning_high: float
    critical_high: float
    active: Optional[bool] = True

class ThresholdUpdate(BaseModel):
    warning_high: Optional[float] = None
    critical_high: Optional[float] = None
    active: Optional[bool] = None

def _get_thresholds_file() -> Path:
    return Path(__file__).parent.parent.parent / "config" / "thresholds.json"

@router.get("/thresholds")
async def get_thresholds(request: Request):
    # Ensure active defaults to True for older items
    thresholds = request.app.state.thresholds
    for t in thresholds:
        if "active" not in t:
            t["active"] = True
    return thresholds

@router.post("/thresholds", status_code=201)
async def create_threshold(threshold: ThresholdCreate, request: Request):
    if threshold.warning_high >= threshold.critical_high:
        raise HTTPException(
            status_code=422, 
            detail="warning_high must be strictly less than critical_high"
        )
        
    thresholds = request.app.state.thresholds
    if any(t["metric"] == threshold.metric for t in thresholds):
        raise HTTPException(status_code=409, detail="Threshold for metric already exists")
        
    new_entry = threshold.model_dump()
    thresholds.append(new_entry)
    
    with open(_get_thresholds_file(), "w") as f:
        json.dump(thresholds, f, indent=2)
        
    return new_entry

@router.put("/thresholds/{metric}")
async def update_threshold(metric: str, update: ThresholdUpdate, request: Request):
    thresholds = request.app.state.thresholds
    
    target = next((t for t in thresholds if t["metric"] == metric), None)
    if not target:
        raise HTTPException(status_code=404, detail="Metric not found in thresholds")
        
    new_warn = update.warning_high if update.warning_high is not None else target.get("warning_high", 0)
    new_crit = update.critical_high if update.critical_high is not None else target.get("critical_high", 0)
    
    if new_warn >= new_crit:
        raise HTTPException(
            status_code=422, 
            detail="warning_high must be strictly less than critical_high"
        )
        
    if update.warning_high is not None:
        target["warning_high"] = update.warning_high
    if update.critical_high is not None:
        target["critical_high"] = update.critical_high
    if update.active is not None:
        target["active"] = update.active
        
    with open(_get_thresholds_file(), "w") as f:
        json.dump(thresholds, f, indent=2)
        
    return target
