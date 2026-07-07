import csv
import io
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from app import influx
from app.config import Settings, get_settings

router = APIRouter()

class MetricEntry(BaseModel):
    metric: str
    value: float
    unit: str

class ManualIngest(BaseModel):
    source_id: str
    source_type: Optional[str] = "unknown"
    timestamp: Optional[str] = None
    metrics: List[MetricEntry]

@router.post("/ingest/manual")
async def ingest_manual(payload: ManualIngest, settings: Settings = Depends(get_settings)):
    if len(payload.metrics) < 2:
        raise HTTPException(status_code=422, detail="At least two metric entries are required")
        
    ts = payload.timestamp or datetime.now(timezone.utc).isoformat()
    
    lp_lines = []
    for m in payload.metrics:
        if not m.metric or not m.unit:
            raise HTTPException(status_code=422, detail="Metric name and unit cannot be empty")
            
        try:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            ns = int(dt.timestamp() * 1e9)
            
            line = f'{settings.influxdb_measurement},source_id={payload.source_id},source_type={payload.source_type},metric={m.metric} value={m.value},unit="{m.unit}" {ns}'
            lp_lines.append(line)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid timestamp format")
            
    # Write to {settings.influxdb_measurement}
    lp_data = "\n".join(lp_lines)
    await influx.write_lp(lp_data, settings)
    
    # Write to ingestion_log
    log_ns = int(datetime.now(timezone.utc).timestamp() * 1e9)
    log_line = f'ingestion_log,source_id={payload.source_id},method=manual records_ingested={len(lp_lines)}i,records_rejected=0i {log_ns}'
    await influx.write_lp(log_line, settings)
    
    return {"ok": True, "records_ingested": len(lp_lines)}

@router.post("/ingest/batch")
async def ingest_batch(file: UploadFile = File(...), settings: Settings = Depends(get_settings)):
    content = await file.read()
    text = content.decode("utf-8-sig")
    
    reader = csv.DictReader(io.StringIO(text))
    
    valid_lines = []
    errors = []
    
    row_num = 1
    for row in reader:
        row_num += 1
        try:
            # Normalize keys: strip whitespace and lowercase
            normalized_row = {k.strip().lower(): v for k, v in row.items() if k is not None}
            
            ts_str = normalized_row.get("timestamp")
            sid = normalized_row.get("source_id")
            metric = normalized_row.get("metric")
            val_str = normalized_row.get("value")
            unit = normalized_row.get("unit")
            source_type = normalized_row.get("source_type") or "unknown"
            
            if not ts_str or not sid or not metric or not val_str or not unit:
                errors.append({"row": row_num, "reason": "Missing required column (expected: timestamp, source_id, metric, value, unit)"})
                continue
                
            val = float(val_str)
            dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            ns = int(dt.timestamp() * 1e9)
            
            line = f'{settings.influxdb_measurement},source_id={sid},source_type={source_type},metric={metric} value={val},unit="{unit}" {ns}'
            valid_lines.append(line)
            
        except Exception as e:
            errors.append({"row": row_num, "reason": str(e)})
            
    if valid_lines:
        lp_data = "\n".join(valid_lines)
        await influx.write_lp(lp_data, settings)
        
    log_ns = int(datetime.now(timezone.utc).timestamp() * 1e9)
    log_line = f'ingestion_log,source_id=batch,method=batch records_ingested={len(valid_lines)}i,records_rejected={len(errors)}i {log_ns}'
    await influx.write_lp(log_line, settings)
    
    return {
        "records_ingested": len(valid_lines),
        "records_rejected": len(errors),
        "errors": errors
    }
