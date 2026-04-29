from dropout_predictor.main import app


def test_app_title() -> None:
    assert app.title == "dropout-predictor"
