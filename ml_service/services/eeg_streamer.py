import asyncio
import json
import random
import time

async def stream():
    """
    Core streaming generator. 
    Yields events as dictionaries for EventSourceResponse.
    """
    print("[STREAM] EEG streamer started")

    # 1. Immediate handshake
    yield {
        "event": "connected",
        "data": "ok"
    }

    # 2. Delay to prevent race conditions with proxy buffers
    await asyncio.sleep(1)

    idx = 0
    while True:
        try:
            # 3. Generate packet exactly as frontend expects
            packet = {
                "epoch_id":   idx,
                "timestamp":  int(time.time() * 1000),
                "attention":  round(random.uniform(40, 90), 2),
                "stress":     round(random.uniform(10, 60), 2),
                "relaxation": round(random.uniform(20, 80), 2),
                "engagement": round(random.uniform(30, 85), 2),
                "prediction": {"cognitive_state": "Neutral", "confidence": 0.85}
            }

            # print(f"[STREAM] Sent packet {idx}") # Disabled for production clarity

            yield {
                "event": "eeg",
                "data": json.dumps(packet)
            }

            idx += 1
            await asyncio.sleep(0.4)

        except asyncio.CancelledError:
            print("[STREAM] Client disconnected")
            break
        except Exception as e:
            print(f"[STREAM ERROR] {str(e)}")
            await asyncio.sleep(1)

class Streamer:
    """Singleton to maintain compatibility with main.py lifespan."""
    def __init__(self):
        self._ready = False

    def load(self):
        print("[STREAMER] Simulator loaded")
        self._ready = True
        return True

    @property
    def is_ready(self):
        return self._ready

    def stream(self):
        return stream()

# Module-level singleton
streamer = Streamer()
