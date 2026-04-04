"""
FastAPI ML Service — NeuroInsight 2.0

Startup:
    uvicorn main:app --reload --port 8000
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import stream, predict
from services.predictor import predictor
from services.eeg_streamer import streamer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model artifacts once at startup."""
    logger.info("Loading ML artifacts …")
    predictor.load()
    streamer.load()
    logger.info("ML service ready.")
    yield
    logger.info("ML service shutting down.")


app = FastAPI(
    title       = "NeuroInsight ML Service",
    description = "Real-time EEG cognitive state prediction + SHAP explainability",
    version     = "2.0.0",
    lifespan    = lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_origins_raw = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5000,http://localhost:5173"
)
origins = [o.strip() for o in _origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins     = origins,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(stream.router,  tags=["Streaming"])
app.include_router(predict.router, tags=["Prediction"])


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status":  "ml service running",
        "version": "2.0.0"
    }

@app.get("/health")
async def health():
    return {
        "status":          "ok",
        "service":         "NeuroInsight ML Service v2.0",
        "model_loaded":    predictor.is_ready,
        "dataset_loaded":  streamer.is_ready,
    }
