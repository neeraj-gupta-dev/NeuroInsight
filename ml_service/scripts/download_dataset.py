"""
Download PhysioNet EEG Motor Movement/Imagery Dataset via MNE-Python.

Dataset: https://physionet.org/content/eegmmidb/1.0.0/
- 109 subjects, 64-channel EEG, 160 Hz
- Runs 6, 10, 14 = Motor Imagery (left hand / right hand / rest)

Usage:
    python scripts/download_dataset.py
"""

import os
import sys
import logging
import mne
from mne.datasets import eegbci
from mne.io import read_raw_edf, concatenate_raws

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SUBJECTS = list(range(1, 6))  # Subjects 1-5 (~500 MB total)
RUNS = [6, 10, 14]            # Motor Imagery runs


def download_dataset() -> list[str]:
    """Download PhysioNet EEGBCI via MNE auto-download."""
    logger.info("=" * 60)
    logger.info("NeuroInsight 2.0 — Dataset Download")
    logger.info("=" * 60)
    logger.info(f"Subjects  : {SUBJECTS}")
    logger.info(f"Runs      : {RUNS}  (Motor Imagery)")
    logger.info("Storage   : ~/mne_data/MNE-eegbci-data/")
    logger.info("=" * 60)

    all_files: list[str] = []

    for subject in SUBJECTS:
        logger.info(f"Fetching subject {subject} ...")
        try:
            fnames = eegbci.load_data(subject, RUNS, update_path=True, verbose=False)
            all_files.extend(fnames)
            logger.info(f"  ✓ Subject {subject}: {len(fnames)} EDF files")
        except Exception as exc:
            logger.error(f"  ✗ Subject {subject} failed: {exc}")
            sys.exit(1)

    logger.info(f"\nDownload complete — {len(all_files)} files total.")
    return all_files


def verify_files(files: list[str]) -> None:
    """Spot-check the first two downloaded files."""
    logger.info("Verifying file integrity (spot-check) ...")
    for fpath in files[:2]:
        try:
            raw = read_raw_edf(fpath, preload=False, verbose=False)
            logger.info(
                f"  ✓ {os.path.basename(fpath)}: "
                f"{raw.n_times} samples, "
                f"{len(raw.ch_names)} channels, "
                f"{raw.info['sfreq']} Hz"
            )
        except Exception as exc:
            logger.error(f"  ✗ {os.path.basename(fpath)}: {exc}")


if __name__ == "__main__":
    files = download_dataset()
    verify_files(files)
    logger.info("\nNext step: python scripts/preprocess_eeg.py")
