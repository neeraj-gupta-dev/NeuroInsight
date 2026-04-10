import logging
import asyncio
import time
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from services.eeg_streamer import stream

router = APIRouter()
logger = logging.getLogger(__name__)

# Connection Guard: per-IP counter to prevent connection flooding.
from collections import defaultdict
active_connections = defaultdict(int)

@router.get("/api/eeg/stream")
async def eeg_stream(request: Request):
    """
    Render-hardened SSE streaming endpoint.
    
    Key design decisions:
    - NO request.is_disconnected() — unreliable behind Render's reverse proxy,
      can return True prematurely and kill the stream. Instead, we rely on
      exception handling when writes fail to a closed socket.
    - NO manual Transfer-Encoding header — Starlette handles chunked encoding
      automatically. Setting it manually causes double-encoding corruption.
    - Heartbeat every 3 seconds — Render's proxy kills connections after ~10s
      of silence. 3s gives a 3x safety margin.
    """
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    
    if active_connections[client_ip] >= 5:
        logger.warning(f"[ML STREAM] Rejected {client_ip}: {active_connections[client_ip]} active")
        return StreamingResponse(
            iter([f"event: fatal\ndata: {{\"error\": \"Concurrency limit\"}}\n\n"]),
            status_code=429,
            media_type="text/event-stream"
        )

    async def event_publisher():
        active_connections[client_ip] += 1
        logger.info(f"[ML STREAM] Connected: {client_ip} (active: {active_connections[client_ip]})")
        
        stream_gen = stream()
        last_yield = time.time()
        
        try:
            while True:
                now = time.time()
                
                # Heartbeat every 3 seconds of silence.
                # This keeps Render's proxy from killing the connection.
                if now - last_yield > 3:
                    yield "event: heartbeat\ndata: ping\n\n"
                    last_yield = time.time()

                try:
                    # Pull next event from the core EEG generator.
                    # 1s timeout so we can loop back to check heartbeat.
                    event = await asyncio.wait_for(anext(stream_gen), timeout=1.0)
                    
                    event_name = event.get("event", "message")
                    event_data = event.get("data", "")
                    yield f"event: {event_name}\ndata: {event_data}\n\n"
                    last_yield = time.time()
                    
                except asyncio.TimeoutError:
                    # No data ready — loop back to heartbeat check
                    continue
                except StopAsyncIteration:
                    logger.info(f"[ML STREAM] Generator exhausted for {client_ip}")
                    break

        except asyncio.CancelledError:
            # Client disconnected — ASGI server cancelled the task
            logger.info(f"[ML STREAM] Client disconnect (cancelled): {client_ip}")
        except Exception as e:
            logger.error(f"[ML STREAM ERROR] {client_ip}: {e}")
        finally:
            active_connections[client_ip] -= 1
            if active_connections[client_ip] <= 0:
                del active_connections[client_ip]
            logger.info(f"[ML STREAM] Closed: {client_ip} (remaining: {active_connections.get(client_ip, 0)})")

    return StreamingResponse(
        event_publisher(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":          "no-cache, no-store, no-transform",
            "Connection":             "keep-alive",
            "X-Accel-Buffering":      "no",
            "X-Content-Type-Options": "nosniff",
            # DO NOT set Transfer-Encoding — Starlette handles it automatically.
            # Setting it manually causes double-chunked encoding corruption.
        }
    )
