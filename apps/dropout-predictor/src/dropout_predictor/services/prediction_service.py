from __future__ import annotations

from typing import Any

from dropout_predictor.api.schemas import (
    Features,
    ModelInsights,
    PredictionResponse,
    RiskInfo,
    Signal,
    TopFactor,
)
from dropout_predictor.model.inference import (
    compute_feature_contributions,
    load_model_artifact,
    predict_probability,
)

FEATURE_LABELS = {
    "completion_percentage": "Course progress",
    "avg_quiz_score": "Quiz performance",
    "num_failed_attempts": "Failed quiz attempts",
    "days_since_last_activity": "Recent inactivity",
    "days_since_enrollment": "Time since enrollment",
    "lessons_completed": "Lessons completed",
    "quiz_attempts_count": "Quiz engagement",
}

_MODEL_ARTIFACT: dict[str, Any] | None = None


def _get_artifact() -> dict[str, Any]:
    global _MODEL_ARTIFACT
    if _MODEL_ARTIFACT is None:
        _MODEL_ARTIFACT = load_model_artifact()
    return _MODEL_ARTIFACT


def _risk_level(score: float) -> str:
    if score < 0.35:
        return "low"
    if score < 0.65:
        return "medium"
    return "high"


def _risk_label(level: str) -> str:
    return f"{level.capitalize()} Dropout Risk"


def _impact_bucket(contribution_abs: float) -> str:
    if contribution_abs >= 0.6:
        return "high"
    if contribution_abs >= 0.25:
        return "medium"
    return "low"


def _feature_value(features: Features, feature_name: str) -> float:
    return float(getattr(features, feature_name))


def predict(user_id: str, features: Features) -> PredictionResponse:
    artifact = _get_artifact()

    feature_values = {
        "completion_percentage": _feature_value(features, "completion_percentage"),
        "avg_quiz_score": _feature_value(features, "avg_quiz_score"),
        "num_failed_attempts": _feature_value(features, "num_failed_attempts"),
        "days_since_last_activity": _feature_value(features, "days_since_last_activity"),
        "days_since_enrollment": _feature_value(features, "days_since_enrollment"),
        "lessons_completed": _feature_value(features, "lessons_completed"),
        "quiz_attempts_count": _feature_value(features, "quiz_attempts_count"),
    }

    score = round(predict_probability(feature_values, artifact), 4)
    contributions = compute_feature_contributions(feature_values, artifact)

    risk_increasing = sorted(
        [item for item in contributions if item[3] > 0],
        key=lambda item: abs(item[3]),
        reverse=True,
    )[:3]
    risk_reducing = sorted(
        [item for item in contributions if item[3] < 0],
        key=lambda item: abs(item[3]),
        reverse=True,
    )[:3]

    key_drivers = [
        Signal(
            feature=name,
            label=FEATURE_LABELS[name],
            value=value,
            impact=_impact_bucket(abs(contribution)),
            effect="increases_risk",
        )
        for name, value, _, contribution in risk_increasing
    ]

    protective_signals = [
        Signal(
            feature=name,
            label=FEATURE_LABELS[name],
            value=value,
            impact=_impact_bucket(abs(contribution)),
            effect="reduces_risk",
        )
        for name, value, _, contribution in risk_reducing
    ]

    top_factors = [
        TopFactor(
            feature=name,
            coefficient=coefficient,
            direction="risk_increase" if coefficient > 0 else "risk_decrease",
        )
        for name, _, coefficient, _ in sorted(
            contributions,
            key=lambda item: abs(item[2]),
            reverse=True,
        )
    ]

    level = _risk_level(score)
    return PredictionResponse(
        userId=user_id,
        risk=RiskInfo(score=score, level=level, label=_risk_label(level)),
        keyDrivers=key_drivers,
        protectiveSignals=protective_signals,
        modelInsights=ModelInsights(model=artifact["model_name"], topFactors=top_factors),
    )
