"""
SSE Streaming Router — GET /stream-eeg

Streams real EEG epoch data from the PhysioNet EEGBCI dataset,
row by row, with inline RandomForest + SHAP predictions.
"""

import os
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from services.eeg_streamer import streamer

router = APIRouter()


@router.get("/stream-eeg")
async def stream_eeg():
    """
    Server-Sent Events stream of real EEG epochs with predictions.
    """
    return EventSourceResponse(streamer.stream())
