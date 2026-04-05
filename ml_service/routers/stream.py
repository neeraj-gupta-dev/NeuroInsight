import logging
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
from services.eeg_streamer import stream

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/api/eeg/stream")
async def eeg_stream(request: Request):
    """
    Production-safe SSE router.
    Uses sse-starlette to handle pings and keep-alives automatically.
    """
    return EventSourceResponse(
        stream(),
        ping=15,  # Send a :ping\n\n every 15 seconds
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Critical for Render/Nginx to prevent buffering
        }
    )
