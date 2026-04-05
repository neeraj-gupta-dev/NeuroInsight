import asyncio
import json
import random
import time

async def stream():
    print("[STREAM] EEG streamer started")

    # handshake
    yield {"event": "connected", "data": "ok"}

    idx = 0
    last_heartbeat = time.time()

    while True:
        try:
            # heartbeat every 15s (keeps Render proxy alive)
            if time.time() - last_heartbeat > 15:
                yield {"event": "heartbeat", "data": "keep-alive"}
                print("[STREAM] Heartbeat sent")
                last_heartbeat = time.time()

            packet = {
                "attention": round(random.uniform(40, 90), 2),
                "stress": round(random.uniform(10, 60), 2),
                "relaxation": round(random.uniform(20, 80), 2),
                "engagement": round(random.uniform(30, 85), 2),
                "id": idx
            }

            print(f"[STREAM] Sending EEG packet {idx}")

            yield {
                "event": "eeg",
                "data": json.dumps(packet)
            }

            idx += 1
            await asyncio.sleep(0.4)

        except Exception as e:
            print("[STREAM ERROR]", str(e))
            await asyncio.sleep(1)

# Add a mock object to maintain compatibility with existing router imports
class MockStreamer:
    def stream(self):
        return stream()

streamer = MockStreamer()
