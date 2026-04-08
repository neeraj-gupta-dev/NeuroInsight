import logging
import asyncio
import time
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from services.eeg_streamer import stream

router = APIRouter()
logger = logging.getLogger(__name__)

# Connection Guard: Keeps track of unique client connections to prevent flooding
# Render Free Tier allows limited concurrent connections.
active_connections = set()

@router.get("/api/eeg/stream")
async def eeg_stream(request: Request):
    """
    Render-optimized SSE streaming router.
    Implements:
    - Manual StreamingResponse for zero-buffer transmission.
    - 15s Heartbeat loop to keep Render proxy alive.
    - Connection Guard (1 stream per IP) to prevent 429 throttling.
    """
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    
    if client_ip in active_connections:
        logger.warning(f"[ML STREAM] Connection rejected for {client_ip}: Session already active.")
        return StreamingResponse(
            iter([f"event: fatal\ndata: {{\"error\": \"Concurrency limit reached\", \"ip\": \"{client_ip}\"}}\n\n"]),
            status_code=429,
            media_type="text/event-stream"
        )

    async def event_publisher():
        active_connections.add(client_ip)
        logger.info(f"[ML STREAM] Connection established for {client_ip}. Total active: {len(active_connections)}")
        
        # Core streaming generator
        stream_gen = stream()
        last_heartbeat = time.time()
        
        try:
            while True:
                if await request.is_disconnected():
                    break

                # 15s Heartbeat to bypass proxy timeouts
                if time.time() - last_heartbeat > 15:
                    yield ": heartbeat ping\n\n"
                    last_heartbeat = time.time()

                try:
                    event = await asyncio.wait_for(anext(stream_gen), timeout=1.0)
                    yield f"event: {event.get('event', 'message')}\ndata: {event.get('data', '')}\n\n"
                except asyncio.TimeoutError:
                    continue
                except StopAsyncIteration:
                    break

        except Exception as e:
            logger.error(f"[ML STREAM ERROR] {client_ip}: {str(e)}")
        finally:
            if client_ip in active_connections:
                active_connections.remove(client_ip)
            logger.info(f"[ML STREAM] Connection closed for {client_ip}. Total active: {len(active_connections)}")

    return StreamingResponse(
        event_publisher(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":      "no-cache, no-transform",
            "Connection":         "keep-alive",
            "X-Accel-Buffering":  "no",
            "Transfer-Encoding":  "chunked"
        }
    )
