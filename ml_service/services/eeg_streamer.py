import os
import json
import logging
import asyncio
import time
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "eeg_features.csv")


class EEGStreamer:
    """Stateful streamer over eeg_features.csv."""

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

    async def stream(self, delay_ms: float = 0.4):
        """
        True infinite streaming generator for SSE.
        Yields events in 'event: <type>\ndata: <json>\n\n' format.
        """
        if not self._loaded:
            yield "event: error\ndata: {\"message\": \"Dataset not loaded\"}\n\n"
            return

        from services.predictor import predictor

        # 1. Immediate Handshake
        yield "event: connected\ndata: ok\n\n"
        logger.info("[STREAM] Client connected — handshake sent")

        idx = 0
        total = len(self.df)

        try:
            while True:
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

                metrics = {
                    "attention":  normalize(attn_r, 1.2, 1.5),
                    "relaxation": normalize(rex_r, 1.5, 1.2),
                    "stress":     normalize(str_r, 1.0, 2.0),
                    "engagement": normalize(eng_r, 0.6, 3.0),
                }

                # Response Payload
                payload = {
                    "epoch_id":  epoch_id,
                    "timestamp": int(time.time() * 1000),
                    "subject":   int(row["subject"]),
                    "bands":     {k.replace("_mean", ""): round(v, 4) for k, v in features.items() if "_mean" in k},
                    **metrics,
                    "prediction": None
                }

                if predictor.is_ready:
                    try:
                        payload["prediction"] = predictor.predict(features)
                    except Exception as e:
                        logger.error(f"[STREAM] Predict error: {e}")

                # Format as SSE event
                yield f"event: eeg\ndata: {json.dumps(payload)}\n\n"
                logger.info(f"[STREAM] Sending EEG packet {idx}")

                idx += 1
                await asyncio.sleep(delay_ms)
        except asyncio.CancelledError:
            logger.info("[STREAM] Client disconnected — stopping stream")
            raise

    @property
    def is_ready(self) -> bool:
        return self._loaded


# ── Module-level singleton ────────────────────────────────────────────────────
streamer = EEGStreamer()
