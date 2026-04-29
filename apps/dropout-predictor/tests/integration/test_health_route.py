from fastapi.testclient import TestClient

from dropout_predictor.main import app


client = TestClient(app)


def test_health_route() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
