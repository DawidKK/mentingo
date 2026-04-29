from __future__ import annotations

from pathlib import Path

import pytest

from dropout_predictor.model.inference import load_model_artifact, predict_probability
from dropout_predictor.services.prediction_service import predict
from dropout_predictor.api.schemas import Features

EXPECTED_FEATURE_ORDER = [
    "completion_percentage",
    "avg_quiz_score",
    "num_failed_attempts",
    "days_since_last_activity",
    "days_since_enrollment",
    "lessons_completed",
    "quiz_attempts_count",
]


def test_load_model_artifact_success() -> None:
    artifact = load_model_artifact()
    assert "pipeline" in artifact
    assert artifact["feature_order"] == EXPECTED_FEATURE_ORDER
    assert artifact["model_name"] == "Logistic Regression"


def test_load_model_artifact_missing_file() -> None:
    missing_path = Path(__file__).resolve().parent / "missing-model.pkl"
    with pytest.raises(FileNotFoundError):
        load_model_artifact(missing_path)


def test_predict_probability_uses_feature_order() -> None:
    artifact = load_model_artifact()
    features = {
        "completion_percentage": 0.41,
        "avg_quiz_score": 0.68,
        "num_failed_attempts": 2,
        "days_since_last_activity": 6,
        "days_since_enrollment": 20,
        "lessons_completed": 7,
        "quiz_attempts_count": 4,
    }
    score = predict_probability(features, artifact)
    assert 0.0 <= score <= 1.0


def test_service_prediction_uses_trained_model_name() -> None:
    response = predict(
        user_id="user-42",
        features=Features(
            completion_percentage=0.41,
            avg_quiz_score=0.68,
            num_failed_attempts=2,
            days_since_last_activity=6,
            days_since_enrollment=20,
            lessons_completed=7,
            quiz_attempts_count=4,
        ),
    )
    assert response.modelInsights.model == "Logistic Regression"
    assert 0.0 <= response.risk.score <= 1.0
