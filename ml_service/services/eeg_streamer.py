"""
EEG Data Streamer — reads eeg_features.csv row-by-row.
Each row is a real EEG epoch from the PhysioNet EEGBCI dataset.
"""

import os
import json
import logging
import asyncio
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

    async def stream(self, delay_ms: int = 600):
        """
        Async generator — yields one SSE-formatted event string per epoch.
        Loops the dataset indefinitely so the stream never ends.

        Yields:
            str  formatted as  "data: <json>\\n\\n"
        """
        if not self._loaded:
            yield "data: " + json.dumps({"error": "Dataset not loaded"}) + "\n\n"
            return

        from services.predictor import predictor  # local import to avoid circular

        idx = 0
        total = len(self.df)

        while True:
            row = self.df.iloc[idx % total]
            features = {f: float(row[f]) for f in self.feature_names}

            payload: dict = {
                "epoch_id": int(self.df.index[idx % total]),
                "subject":  int(row["subject"]),
                "features": features,
                "prediction": None,
            }

            # Run inference inline so the client receives everything in one event
            if predictor.is_ready:
                try:
                    payload["prediction"] = predictor.predict(features)
                except Exception as exc:
                    logger.error(f"Prediction error at row {idx}: {exc}")

            event = "data: " + json.dumps(payload) + "\n\n"
            yield event

            idx += 1
            await asyncio.sleep(delay_ms / 1000.0)

    @property
    def is_ready(self) -> bool:
        return self._loaded


# ── Module-level singleton ────────────────────────────────────────────────────
streamer = EEGStreamer()
