"""
Preprocess PhysioNet EEGBCI Dataset → eeg_features.csv

Pipeline:
  1. Load EDF files (subjects 1-5, runs 6/10/14) via MNE
  2. Bandpass filter 0.5-50 Hz
  3. Slice into 1-second epochs
  4. Compute Welch PSD → 5 band-power features (mean + std per band, + 2 ratio features)
  5. Map annotations:
       T0 (rest) → KMeans(3) → Relaxed / Drowsy / Distracted
       T1 (left imagery)  → Focused
       T2 (right imagery) → Stressed
  6. Save to data/eeg_features.csv

Usage:
    python scripts/preprocess_eeg.py
"""

import os
import sys
import logging
import numpy as np
import pandas as pd
from scipy.signal import welch
import mne
from mne.datasets import eegbci
from mne.io import concatenate_raws, read_raw_edf
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# np.trapz was removed in NumPy 2.0 (renamed to np.trapezoid).
# This shim makes the code work on both NumPy 1.x and 2.x.
try:
    _trapz = np.trapezoid          # NumPy >= 2.0
except AttributeError:
    _trapz = np.trapz              # NumPy < 2.0

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
SUBJECTS   = list(range(1, 6))
RUNS       = [6, 10, 14]
L_FREQ     = 0.5
H_FREQ     = 50.0
SFREQ      = 160          # Hz – original dataset sfreq
EPOCH_DUR  = 1.0          # seconds
BANDS      = {
    "delta": (0.5, 4.0),
    "theta": (4.0, 8.0),
    "alpha": (8.0, 13.0),
    "beta":  (13.0, 30.0),
    "gamma": (30.0, 50.0),
}

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "eeg_features.csv")


# ── Feature extraction ────────────────────────────────────────────────────────
def band_power_features(data: np.ndarray, sfreq: float) -> dict:
    """
    Compute log band-power statistics across all channels for one epoch.

    Args:
        data:  (n_channels, n_times) float array
        sfreq: sampling frequency in Hz

    Returns:
        dict with keys: {band}_mean, {band}_std, theta_alpha_ratio, beta_alpha_ratio
    """
    nperseg = min(int(sfreq), data.shape[1])
    features: dict = {}
    raw_means: dict = {}

    for band, (fmin, fmax) in BANDS.items():
        ch_powers = []
        for ch in data:
            freqs, psd = welch(ch, fs=sfreq, nperseg=nperseg)
            mask = (freqs >= fmin) & (freqs <= fmax)
            pwr = _trapz(psd[mask], freqs[mask]) if mask.any() else 1e-12
            ch_powers.append(max(pwr, 1e-12))

        log_p = np.log10(ch_powers)
        features[f"{band}_mean"] = float(np.mean(log_p))
        features[f"{band}_std"]  = float(np.std(log_p))
        raw_means[band]          = float(np.mean(ch_powers))

    alpha_raw = max(raw_means["alpha"], 1e-12)
    features["theta_alpha_ratio"] = float(
        np.log10(max(raw_means["theta"], 1e-12) / alpha_raw)
    )
    features["beta_alpha_ratio"] = float(
        np.log10(max(raw_means["beta"], 1e-12) / alpha_raw)
    )
    return features


# ── Subject loading ───────────────────────────────────────────────────────────
def load_subject(subject: int):
    """Load, filter, and return concatenated Raw object for one subject."""
    logger.info(f"  Loading subject {subject} ...")
    fnames = eegbci.load_data(subject, RUNS, verbose=False)
    raws   = [read_raw_edf(f, preload=True, verbose=False) for f in fnames]
    raw    = concatenate_raws(raws)
    eegbci.standardize(raw)
    raw.pick_types(eeg=True, verbose=False)
    raw.filter(L_FREQ, H_FREQ, method="iir", verbose=False)
    if raw.info["sfreq"] != SFREQ:
        raw.resample(SFREQ, verbose=False)
    return raw


# ── Epoch extraction ──────────────────────────────────────────────────────────
def extract_records(raw, subject_id: int) -> list[dict]:
    """Slice raw EEG into 1-second epochs and extract features."""
    events, event_id = mne.events_from_annotations(raw, verbose=False)
    logger.info(f"    event_id map: {event_id}")

    sfreq          = raw.info["sfreq"]
    epoch_samples  = int(EPOCH_DUR * sfreq)
    records: list[dict] = []

    ann_to_label = {"T0": "rest", "T1": "Focused", "T2": "Stressed"}

    for event in events:
        onset   = event[0]
        code    = event[2]
        ann_key = None

        # MNE maps annotation text to integer codes
        for ann, eid in event_id.items():
            if eid == code:
                ann_key = ann
                break

        if ann_key not in ann_to_label:
            continue

        end = onset + epoch_samples
        if end > raw.n_times:
            continue

        data, _ = raw[:, onset:end]          # (n_ch, n_times)
        feats    = band_power_features(data, sfreq)
        feats["label"]   = ann_to_label[ann_key]
        feats["subject"] = subject_id
        records.append(feats)

    return records


# ── KMeans clustering of rest epochs ─────────────────────────────────────────
def cluster_rest_states(df: pd.DataFrame) -> pd.DataFrame:
    """
    Split T0 (rest) epochs into Relaxed / Drowsy / Distracted.

    Heuristic:
      - Highest theta − alpha  → Drowsy       (slow-wave dominance)
      - Highest beta           → Distracted   (high-frequency, unfocused)
      - Remainder              → Relaxed
    """
    feat_cols = [c for c in df.columns if c not in ("label", "subject")]
    rest_mask = df["label"] == "rest"

    if rest_mask.sum() < 3:
        df.loc[rest_mask, "label"] = "Relaxed"
        return df

    X_rest = df.loc[rest_mask, feat_cols].values
    X_scaled = StandardScaler().fit_transform(X_rest)

    km = KMeans(n_clusters=3, random_state=42, n_init=10)
    cluster_ids = km.fit_predict(X_scaled)

    b_idx = feat_cols.index("beta_mean")
    t_idx = feat_cols.index("theta_mean")
    a_idx = feat_cols.index("alpha_mean")

    chars: dict[int, dict] = {}
    for c in range(3):
        m = cluster_ids == c
        chars[c] = {
            "beta":        X_rest[m, b_idx].mean() if m.any() else 0.0,
            "theta_minus_alpha": (
                X_rest[m, t_idx].mean() - X_rest[m, a_idx].mean()
            ) if m.any() else 0.0,
        }

    distracted = max(range(3), key=lambda c: chars[c]["beta"])
    drowsy_candidates = [c for c in range(3) if c != distracted]
    drowsy     = max(drowsy_candidates, key=lambda c: chars[c]["theta_minus_alpha"])
    relaxed    = [c for c in range(3) if c not in (distracted, drowsy)][0]

    mapping = {distracted: "Distracted", drowsy: "Drowsy", relaxed: "Relaxed"}

    rest_indices = df.index[rest_mask].tolist()
    for i, orig_idx in enumerate(rest_indices):
        df.at[orig_idx, "label"] = mapping[cluster_ids[i]]

    return df


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    logger.info("=" * 60)
    logger.info("NeuroInsight 2.0 — EEG Feature Extraction")
    logger.info("=" * 60)

    all_records: list[dict] = []

    for subject in SUBJECTS:
        try:
            raw     = load_subject(subject)
            records = extract_records(raw, subject)
            all_records.extend(records)
            logger.info(f"    → {len(records)} epochs extracted")
        except Exception as exc:
            logger.error(f"  Subject {subject} failed: {exc}")

    if not all_records:
        logger.error("No records extracted. Run download_dataset.py first.")
        sys.exit(1)

    df = pd.DataFrame(all_records)
    logger.info(f"\nTotal epochs : {len(df)}")
    logger.info(f"Label counts (before clustering):\n{df['label'].value_counts()}")

    logger.info("\nClustering T0 rest epochs → Relaxed / Drowsy / Distracted …")
    df = cluster_rest_states(df)

    logger.info(f"\nFinal label distribution:\n{df['label'].value_counts()}")

    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    df.index.name = "epoch_id"
    df.to_csv(OUTPUT_CSV, index=True)

    logger.info(f"\n✓ Saved: {OUTPUT_CSV}  shape={df.shape}")
    logger.info("Next step: python scripts/train_model.py")


if __name__ == "__main__":
    main()
