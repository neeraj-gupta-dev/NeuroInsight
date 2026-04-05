"""
FastAPI ML Service — NeuroInsight 2.2
"""

import os
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers.stream import router as stream_router
from routers import predict
# from services.predictor import predictor # Disable predictor if not needed
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
    # predictor.load() 
    streamer.load()
    logger.info("ML service ready.")
    yield
    logger.info("ML service shutting down.")


app = FastAPI(
    title       = "NeuroInsight ML Service",
    description = "Real-time EEG cognitive state prediction + SHAP explainability",
    version     = "2.2.0",
    lifespan    = lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Explicitly allowing common frontend domains for the symposium demo
# If allow_credentials=True, we MUST specify the origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins     = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://neuroinsight.vercel.app",
        "https://neuro-insight.vercel.app"
    ],
    allow_origin_regex = r"https://neuroinsight-.*\.vercel\.app",
    allow_credentials  = True,
    allow_methods      = ["*"],
    allow_headers      = ["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(stream_router, tags=["EEG Stream"])
app.include_router(predict.router, tags=["Prediction"])


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status":  "ml service running",
        "version": "2.2.0"
    }

@app.get("/health")
async def health():
    return {
        "status":          "ok",
        "service":         "NeuroInsight ML Service v2.2",
        # "model_loaded":    predictor.is_ready,
        "dataset_loaded":  streamer.is_ready,
    }
