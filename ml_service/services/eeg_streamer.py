import os
import json
import logging
import asyncio
import time
import random
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "eeg_features.csv")


class EEGStreamer:
    """Stateful streamer over eeg_features.csv with synthetic fallback."""

    def __init__(self):
        self.df: pd.DataFrame | None = None
        self.feature_names: list[str] = []
        self._loaded = False

    def load(self) -> bool:
        if not os.path.exists(DATA_PATH):
            logger.warning(
                "eeg_features.csv not found — run preprocess_eeg.py first."
            )
            return False
        try:
            self.df = pd.read_csv(DATA_PATH, index_col="epoch_id")
            self.feature_names = [
                c for c in self.df.columns if c not in ("label", "subject")
            ]
            self._loaded = True
            logger.info(
                f"[streamer] Loaded {len(self.df)} epochs, "
                f"{len(self.feature_names)} features"
            )
            return True
        except Exception as exc:
            logger.error(f"[streamer] Load failed: {exc}")
            return False

    async def stream(self):
        """
        BULLETPROOF async generator for SSE.
        Yields dictionaries for EventSourceResponse.
        """
        print("[STREAM] EEG streamer started")
        
        from services.predictor import predictor

        # 1. Immediate Handshake
        yield {
            "event": "connected",
            "data": "ok"
        }
        
        # 2. Safety delay
        await asyncio.sleep(1)

        idx = 0
        total = len(self.df) if self._loaded else 0

        while True:
            try:
                if self._loaded and total > 0:
                    # Dataset Logic
                    row = self.df.iloc[idx % total]
                    epoch_id = int(self.df.index[idx % total])
                    features = {f: float(row[f]) for f in self.feature_names}
                    
                    # --- Cognitive Metric Calculation (Normalized 0-100) ---
                    p = {k.replace("_mean", ""): 10**v for k, v in features.items() if "_mean" in k}
                    
                    # Ratios
                    attn_r = p["beta"] / p["theta"] if p["theta"] > 0 else 1.0
                    rex_r  = p["alpha"] / p["beta"] if p["beta"] > 0 else 1.0
                    str_r  = p["beta"] / p["alpha"] if p["alpha"] > 0 else 1.0
                    eng_r  = p["beta"] / (p["alpha"] + p["theta"]) if (p["alpha"] + p["theta"]) > 0 else 1.0

                    # Normalization (0-100)
                    def normalize(val, mid, sensitivity=2.0):
                        return round(100 / (1 + np.exp(-sensitivity * (val - mid))), 1)

                    packet = {
                        "epoch_id":  epoch_id,
                        "timestamp": int(time.time() * 1000),
                        "subject":   int(row["subject"]),
                        "bands":     {k.replace("_mean", ""): round(v, 4) for k, v in features.items() if "_mean" in k},
                        "attention":  normalize(attn_r, 1.2, 1.5),
                        "relaxation": normalize(rex_r, 1.5, 1.2),
                        "stress":     normalize(str_r, 1.0, 2.0),
                        "engagement": normalize(eng_r, 0.6, 3.0),
                        "prediction": None
                    }

                    if predictor.is_ready:
                        try:
                            packet["prediction"] = predictor.predict(features)
                        except:
                            pass
                else:
                    # 4. Synthetic Fallback Logic
                    packet = {
                        "epoch_id": idx,
                        "timestamp": int(time.time() * 1000),
                        "subject": 0,
                        "bands": {"alpha": 0.5, "beta": 0.5, "delta": 0.5, "gamma": 0.5, "theta": 0.5},
                        "attention":  random.uniform(40, 90),
                        "stress":     random.uniform(10, 60),
                        "relaxation": random.uniform(20, 80),
                        "engagement": random.uniform(30, 85),
                        "prediction": {"cognitive_state": "Neutral", "confidence": 0.5}
                    }

                # 5. Yield using dict format for EventSourceResponse
                print(f"[STREAM] Sending EEG packet {idx}")
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
                # 5. Bulletproof error handling
                print(f"[STREAM ERROR] {str(e)}")
                await asyncio.sleep(1)

    @property
    def is_ready(self) -> bool:
        return self._loaded


# ── Module-level singleton ────────────────────────────────────────────────────
streamer = EEGStreamer()
