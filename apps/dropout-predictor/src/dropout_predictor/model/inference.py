from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd


def load_model_artifact(model_path: Path | None = None) -> dict[str, Any]:
    if model_path is None:
        model_path = Path(__file__).resolve().parents[3] / "model.pkl"

    if not model_path.exists():
        raise FileNotFoundError(f"Model artifact not found at {model_path}")

    artifact = joblib.load(model_path)
    required = {
        "pipeline",
        "feature_order",
        "recommended_c",
        "l1_ratio",
        "threshold",
        "model_name",
        "trained_at",
    }
    missing = required.difference(artifact.keys())
    if missing:
        raise ValueError(f"Invalid model artifact format. Missing keys: {sorted(missing)}")

    return artifact


def predict_probability(features: dict[str, float], artifact: dict[str, Any]) -> float:
    feature_order = artifact["feature_order"]
    pipeline = artifact["pipeline"]
    frame = pd.DataFrame([{name: features[name] for name in feature_order}])
    proba = pipeline.predict_proba(frame)[:, 1][0]
    return float(proba)


def compute_feature_contributions(
    features: dict[str, float], artifact: dict[str, Any]
) -> list[tuple[str, float, float, float]]:
    """
    Return tuples: (feature_name, original_value, coefficient, contribution)
    contribution is computed in scaled feature space to reflect the trained model behavior.
    """
    feature_order = artifact["feature_order"]
    pipeline = artifact["pipeline"]

    frame = pd.DataFrame([{name: features[name] for name in feature_order}])
    scaler = pipeline.named_steps["scaler"]
    model = pipeline.named_steps["model"]

    scaled = scaler.transform(frame)[0]
    coefs = model.coef_[0]

    results: list[tuple[str, float, float, float]] = []
    for idx, feature in enumerate(feature_order):
        original_value = float(frame.iloc[0, idx])
        coef = float(coefs[idx])
        contribution = float(scaled[idx] * coef)
        results.append((feature, original_value, coef, contribution))

    return results
