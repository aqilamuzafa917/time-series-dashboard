import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, metrics, ingestion, sources, thresholds, ingest


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load thresholds and sources once at startup
    config_dir = Path(__file__).parent.parent / "config"
    
    thresholds_path = config_dir / "thresholds.json"
    with open(thresholds_path, "r") as f:
        app.state.thresholds = json.load(f)
        
    sources_path = config_dir / "sources.json"
    with open(sources_path, "r") as f:
        app.state.sources = json.load(f)
    yield


app = FastAPI(title="InfluxDB Monitoring Dashboard", lifespan=lifespan)

# Allow all origins — prototype only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(ingestion.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(thresholds.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
