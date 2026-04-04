"""
Train RandomForestClassifier on EEG band-power features.

Outputs:
  models/model.pkl          – trained classifier
  models/scaler.pkl         – StandardScaler
  models/label_encoder.pkl  – LabelEncoder
  models/feature_names.json – feature list + class names + accuracy

Usage:
    python scripts/train_model.py
"""

import os
import sys
import json
import logging
import numpy as np
import pandas as pd
import joblib
import shap
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH   = os.path.join(BASE_DIR, "data", "eeg_features.csv")
MODELS_DIR  = os.path.join(BASE_DIR, "models")

COGNITIVE_STATES = ["Distracted", "Drowsy", "Focused", "Relaxed", "Stressed"]


def load_data() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        logger.error(f"CSV not found: {DATA_PATH}")
        logger.error("Run: python scripts/preprocess_eeg.py")
        sys.exit(1)
    df = pd.read_csv(DATA_PATH, index_col="epoch_id")
    logger.info(f"Loaded {len(df)} epochs, {df.shape[1]} columns")
    logger.info(f"Label distribution:\n{df['label'].value_counts()}")
    return df


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    logger.info("=" * 60)
    logger.info("NeuroInsight 2.0 — Model Training")
    logger.info("=" * 60)

    df = load_data()
    feat_cols = [c for c in df.columns if c not in ("label", "subject")]
    X = df[feat_cols].values
    y = df["label"].values

    logger.info(f"Features ({len(feat_cols)}): {feat_cols}")

    # ── Label encoding ────────────────────────────────────────────────────────
    le = LabelEncoder()
    le.fit(sorted(set(y)))          # fit on actual classes present
    y_enc = le.transform(y)
    logger.info(f"Classes: {list(le.classes_)}")

    # ── Scaling ───────────────────────────────────────────────────────────────
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Train / test split ────────────────────────────────────────────────────
    X_tr, X_te, y_tr, y_te = train_test_split(
        X_scaled, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )
    logger.info(f"Train: {len(X_tr)}  Test: {len(X_te)}")

    # ── RandomForest ──────────────────────────────────────────────────────────
    logger.info("Training RandomForestClassifier(n_estimators=200) …")
    rf = RandomForestClassifier(
        n_estimators    = 200,
        max_depth       = 15,
        min_samples_split = 5,
        min_samples_leaf  = 2,
        max_features    = "sqrt",
        class_weight    = "balanced",
        random_state    = 42,
        n_jobs          = -1,
    )
    rf.fit(X_tr, y_tr)

    train_acc = rf.score(X_tr, y_tr)
    test_acc  = rf.score(X_te, y_te)
    y_pred    = rf.predict(X_te)

    logger.info(f"Train accuracy : {train_acc:.4f}")
    logger.info(f"Test  accuracy : {test_acc:.4f}")
    logger.info(
        f"\nClassification Report:\n"
        f"{classification_report(y_te, y_pred, target_names=le.classes_)}"
    )
    logger.info(f"Confusion Matrix:\n{confusion_matrix(y_te, y_pred)}")

    # ── Cross-validation ──────────────────────────────────────────────────────
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf, X_scaled, y_enc, cv=cv, scoring="accuracy")
    logger.info(
        f"5-Fold CV: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}"
    )

    # ── SHAP validation ───────────────────────────────────────────────────────
    logger.info("Validating SHAP TreeExplainer on 20 test samples …")
    explainer   = shap.TreeExplainer(rf)
    shap_sample = explainer.shap_values(X_te[:20])
    logger.info(f"SHAP values shape: {np.array(shap_sample).shape}  ✓")

    # ── Persist artifacts ─────────────────────────────────────────────────────
    joblib.dump(rf,     os.path.join(MODELS_DIR, "model.pkl"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
    joblib.dump(le,     os.path.join(MODELS_DIR, "label_encoder.pkl"))

    meta = {
        "features":   feat_cols,
        "classes":    list(le.classes_),
        "n_features": len(feat_cols),
        "test_accuracy": round(float(test_acc), 4),
        "cv_accuracy":   round(float(cv_scores.mean()), 4),
    }
    with open(os.path.join(MODELS_DIR, "feature_names.json"), "w") as fh:
        json.dump(meta, fh, indent=2)

    logger.info("\n✓ model.pkl          saved")
    logger.info("✓ scaler.pkl         saved")
    logger.info("✓ label_encoder.pkl  saved")
    logger.info("✓ feature_names.json saved")
    logger.info(f"\nTest accuracy: {test_acc:.2%}")
    logger.info("Next step: uvicorn main:app --reload --port 8000")


if __name__ == "__main__":
    main()
