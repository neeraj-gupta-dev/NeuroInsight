import os
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from services.eeg_streamer import streamer

router = APIRouter()


@router.get("/stream-eeg")
async def stream_eeg():
    """
    True SSE streaming endpoint using sse-starlette.
    Returns an infinite generator that cycles EEG dataset every 0.4s.
    """
    return EventSourceResponse(streamer.stream())
