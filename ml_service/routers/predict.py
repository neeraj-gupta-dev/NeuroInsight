"""
Prediction Router — POST /predict

Accepts a feature vector, returns cognitive state + SHAP explanation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.predictor import predictor

router = APIRouter()


class PredictRequest(BaseModel):
    features: dict[str, float]


class PredictResponse(BaseModel):
    cognitive_state:    str
    confidence:         float
    shap_values:        dict[str, float]
    all_probabilities:  dict[str, float]


@router.post("/predict", response_model=PredictResponse)
async def predict(body: PredictRequest):
    """
    Predict cognitive state from an EEG feature vector.

    Body:
        { "features": { "delta_mean": 0.12, "theta_mean": -0.05, ... } }

    Returns:
        { cognitive_state, confidence, shap_values, all_probabilities }
    """
    if not predictor.is_ready:
        raise HTTPException(
            status_code = 503,
            detail      = "Model not loaded. Run train_model.py first.",
        )

    try:
        result = predictor.predict(body.features)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
