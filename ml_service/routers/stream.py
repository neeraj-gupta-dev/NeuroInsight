"""
SSE Streaming Router — GET /stream-eeg

Streams real EEG epoch data from the PhysioNet EEGBCI dataset,
row by row, with inline RandomForest + SHAP predictions.
"""

import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from services.eeg_streamer import streamer

router = APIRouter()


@router.get("/stream-eeg")
async def stream_eeg():
    """
    Server-Sent Events stream of real EEG epochs with predictions.

    Each event payload:
    {
      epoch_id: int,
      subject:  int,
      features: { delta_mean: float, ... },
      prediction: {
        cognitive_state: str,
        confidence: float,
        shap_values: { feature: float },
        all_probabilities: { state: float }
      }
    }
    """
    delay_ms = int(os.getenv("STREAM_DELAY_MS", "600"))

    return StreamingResponse(
        streamer.stream(delay_ms=delay_ms),
        media_type = "text/event-stream",
        headers    = {
            "Cache-Control":  "no-cache",
            "Connection":     "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
