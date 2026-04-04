"""
EEG Prediction Service — model inference + SHAP explanation.
Singleton loaded once at FastAPI startup.
"""

import os
import json
import logging
import numpy as np
import joblib
import shap

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

class EEGPredictor:
    """Wraps RandomForest + StandardScaler + SHAP TreeExplainer."""

    def __init__(self):
        self.model         = None
        self.scaler        = None
        self.label_encoder = None
        self.feature_names: list[str] = []
        self.classes:       list[str] = []
        self.explainer     = None
        self._loaded       = False

    # ── Startup ───────────────────────────────────────────────────────────────
    def load(self) -> bool:
        model_path   = os.path.join(MODELS_DIR, "model.pkl")
        scaler_path  = os.path.join(MODELS_DIR, "scaler.pkl")
        le_path      = os.path.join(MODELS_DIR, "label_encoder.pkl")
        meta_path    = os.path.join(MODELS_DIR, "feature_names.json")

        if not os.path.exists(model_path):
            logger.warning(
                "model.pkl not found — run `python scripts/train_model.py` first."
            )
            return False

        try:
            self.model         = joblib.load(model_path)
            self.scaler        = joblib.load(scaler_path)
            self.label_encoder = joblib.load(le_path)

            with open(meta_path) as fh:
                meta = json.load(fh)

            self.feature_names = meta["features"]
            self.classes       = meta["classes"]
            self.explainer     = shap.TreeExplainer(self.model)
            self._loaded       = True

            logger.info(
                f"[predictor] Loaded — "
                f"{len(self.feature_names)} features, "
                f"{len(self.classes)} classes: {self.classes}"
            )
            return True

        except Exception as exc:
            logger.error(f"[predictor] Load failed: {exc}")
            return False

    # ── Inference ─────────────────────────────────────────────────────────────
    def predict(self, features: dict) -> dict:
        """
        Return cognitive state prediction + SHAP explanation.
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded.")

        # Step 2 — Prediction pipeline
        # Build ordered feature vector
        X = np.array([[features.get(f, 0.0) for f in self.feature_names]])
        X_scaled = self.scaler.transform(X)

        # Probabilistic prediction
        proba          = self.model.predict_proba(X_scaled)[0]
        predicted_index = int(np.argmax(proba))
        predicted_label = self.label_encoder.inverse_transform([predicted_index])[0]
        confidence     = float(proba[predicted_index])

        # Step 3 — FIX SHAP for multiclass
        shap_dict = {}

        def to_float(x):
            import numpy as np
            if isinstance(x, (list, tuple)):
                x = x[0]
            if isinstance(x, np.ndarray):
                x = x.flatten()[0]
            return float(x)

        try:
            shap_values = self.explainer.shap_values(X_scaled)

            if isinstance(shap_values, list):
                # multiclass → select predicted class
                shap_for_class = shap_values[predicted_index][0]
            else:
                # binary fallback
                shap_for_class = shap_values[0]
            
            # Step 4 — Convert to dictionary (Safely convert numpy scalar → float)
            for i, fname in enumerate(self.feature_names):
                shap_dict[fname] = to_float(shap_for_class[i])
                
        except Exception as e:
            logger.error(f"SHAP explanation failed: {e}")
            shap_dict = {} # Return empty on error
            # Step 5 — return prediction with empty shap_values on error

        # Step 5 — Return response
        return {
            "cognitive_state": predicted_label,
            "confidence": round(confidence, 4),
            "shap_values": shap_dict
        }

    @property
    def is_ready(self) -> bool:
        return self._loaded

# ── Module-level singleton ────────────────────────────────────────────────────
predictor = EEGPredictor()
