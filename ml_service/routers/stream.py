from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
from services.eeg_streamer import stream

router = APIRouter()

@router.get("/api/eeg/stream")
async def eeg_stream(request: Request):
    async def event_generator():
        async for event in stream():
            # stop streaming if client disconnects
            if await request.is_disconnected():
                print("[STREAM] Client disconnected")
                break
            yield event

    return EventSourceResponse(
        event_generator(),
        ping=10,  # CRITICAL: keeps connection alive behind proxies
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # CRITICAL for Render/Nginx
        }
    )
