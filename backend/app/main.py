import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load thresholds once at startup
    thresholds_path = Path(__file__).parent.parent / "config" / "thresholds.json"
    with open(thresholds_path, "r") as f:
        app.state.thresholds = json.load(f)
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
