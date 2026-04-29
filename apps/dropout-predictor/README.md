# dropout-predictor

Hackathon-ready dropout prediction microservice for Mentingo.

## Requirements

- Python 3.11
- uv

## Setup

```bash
cd apps/dropout-predictor
uv sync
```

## Runbook (ML flow)

1. Generate synthetic training data:

```bash
uv run python generate_data.py
```

2. Train Logistic Regression (ElasticNet) and save artifact:

```bash
uv run python train.py
```

This creates `model.pkl` with metadata and the trained pipeline.

3. Start API server:

```bash
uv run uvicorn dropout_predictor.main:app --reload
```

## API

### Endpoint

`POST /v1/predict`

### Request example

```json
{
  "userId": "user-123",
  "features": {
    "completion_percentage": 0.42,
    "avg_quiz_score": 0.71,
    "num_failed_attempts": 2,
    "days_since_last_activity": 4,
    "days_since_enrollment": 24,
    "lessons_completed": 11,
    "quiz_attempts_count": 16
  }
}
```

### Response example

```json
{
  "userId": "user-123",
  "risk": {
    "score": 0.63,
    "level": "medium",
    "label": "Medium Dropout Risk"
  },
  "keyDrivers": [],
  "protectiveSignals": [],
  "modelInsights": {
    "model": "Logistic Regression",
    "topFactors": []
  }
}
```

## apps/api integration notes

- API uses:
  - `DROPOUT_PREDICTOR_URL` (default `http://localhost:8000`)
  - `DROPOUT_PREDICTOR_TIMEOUT_MS` (default `2000`)
- `DropoutPredictorService.predict(...)` returns fallback-safe output:
  - `{ prediction: <data>, fallback: false }` on success
  - `{ prediction: null, fallback: true }` on failure/timeout

## Test

```bash
uv run pytest
```

## Lint

```bash
uv run ruff check .
```
