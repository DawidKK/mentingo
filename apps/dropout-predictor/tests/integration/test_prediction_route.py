from fastapi.testclient import TestClient

from dropout_predictor.main import app


client = TestClient(app)


def test_predict_route_returns_expected_shape() -> None:
    payload = {
        "userId": "user-123",
        "features": {
            "completion_percentage": 0.42,
            "avg_quiz_score": 0.71,
            "num_failed_attempts": 2,
            "days_since_last_activity": 4,
            "days_since_enrollment": 24,
            "lessons_completed": 11,
            "quiz_attempts_count": 16,
        },
    }

    response = client.post("/v1/predict", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["userId"] == "user-123"
    assert 0.0 <= body["risk"]["score"] <= 1.0
    assert body["risk"]["level"] in {"low", "medium", "high"}
    assert isinstance(body["keyDrivers"], list)
    assert isinstance(body["protectiveSignals"], list)
    assert body["modelInsights"]["model"] == "Logistic Regression"
    assert len(body["modelInsights"]["topFactors"]) == 7


def test_predict_route_rejects_missing_feature() -> None:
    payload = {
        "userId": "user-123",
        "features": {
            "completion_percentage": 0.42,
            "avg_quiz_score": 0.71,
            "num_failed_attempts": 2,
            "days_since_last_activity": 4,
            "days_since_enrollment": 24,
            "lessons_completed": 11,
        },
    }

    response = client.post("/v1/predict", json=payload)
    assert response.status_code == 422


def test_predict_route_is_model_based_not_hardcoded() -> None:
    low_risk = {
        "userId": "user-low",
        "features": {
            "completion_percentage": 0.95,
            "avg_quiz_score": 0.95,
            "num_failed_attempts": 0,
            "days_since_last_activity": 0,
            "days_since_enrollment": 5,
            "lessons_completed": 20,
            "quiz_attempts_count": 10,
        },
    }
    high_risk = {
        "userId": "user-high",
        "features": {
            "completion_percentage": 0.05,
            "avg_quiz_score": 0.2,
            "num_failed_attempts": 5,
            "days_since_last_activity": 14,
            "days_since_enrollment": 40,
            "lessons_completed": 0,
            "quiz_attempts_count": 0,
        },
    }

    low_response = client.post("/v1/predict", json=low_risk)
    high_response = client.post("/v1/predict", json=high_risk)

    assert low_response.status_code == 200
    assert high_response.status_code == 200

    low_score = low_response.json()["risk"]["score"]
    high_score = high_response.json()["risk"]["score"]

    assert high_score > low_score
