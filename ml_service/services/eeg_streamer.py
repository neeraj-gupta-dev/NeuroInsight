import asyncio
import json
import random
import time

async def stream():
    """
    BULLETPROOF EEG async generator.
    Cycles through synthetic EEG data if no real data is loaded.
    """
    print("[STREAM] EEG streamer started")

    # 1. Immediate handshake event
    yield {
        "event": "connected",
        "data": "ok"
    }

    # 2. Safety delay to allow proxy sync
    await asyncio.sleep(1)

    idx = 0
    last_heartbeat = time.time()

    while True:
        try:
            now = time.time()
            
            # 3. Heartbeat every 15s to prevent Render/Nginx timeout
            if now - last_heartbeat > 15:
                yield {
                    "event": "heartbeat", 
                    "data": "keep-alive"
                }
                print("[STREAM] Heartbeat sent")
                last_heartbeat = now

            # 4. Generate Packet (Matched to Frontend Schema)
            packet = {
                "epoch_id":   idx,
                "timestamp":  int(now * 1000),
                "attention":  round(random.uniform(40, 90), 2),
                "stress":     round(random.uniform(10, 60), 2),
                "relaxation": round(random.uniform(20, 80), 2),
                "engagement": round(random.uniform(30, 85), 2)
            }

            print(f"[STREAM] Sending EEG packet {idx}")

            # 5. Yield Event
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

# Compatibility wrapper
class MockStreamer:
    def stream(self):
        return stream()

streamer = MockStreamer()
