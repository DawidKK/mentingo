# AGENTS.md — dropout-predictor

## Goal

Build a hackathon-ready ML microservice that predicts learner dropout risk for Mentingo.

Use:

- Python
- scikit-learn
- Logistic Regression
- FastAPI

Do not over-engineer. Prioritize working end-to-end demo.

---

## Project Structure

```text
apps/dropout-predictor/
  AGENTS.md
  README.md
  requirements.txt
  Dockerfile
  model.pkl
  train.py
  src/dropout_predictor/
    main.py
    api/
      routes.py
      schemas.py
    model/
      inference.py
    services/
      prediction_service.py
```

## Existing monorepo apps

```text
apps/api   # NestJS backend, calls predictor
apps/web   # UI, displays prediction
```

## Data Flow

apps/api

- builds learner feature vector
- sends POST /v1/predict
- receives dropout probability + risk band
- exposes result to apps/web

apps/dropout-predictor

- validates request
- loads model.pkl
- runs Logistic Regression inference
- returns prediction

## API Contract

### Endpoint

```text
POST /v1/predict
```

### Request

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

### Response

```json
{
  "userId": "user-123",
  "risk": {
    "score": 0.63,
    "level": "medium",
    "label": "Medium Dropout Risk"
  },
  "keyDrivers": [
    {
      "feature": "days_since_last_activity",
      "label": "Recent inactivity",
      "value": 4,
      "impact": "high",
      "effect": "increases_risk"
    },
    {
      "feature": "completion_percentage",
      "label": "Course progress",
      "value": 0.42,
      "impact": "medium",
      "effect": "increases_risk"
    },
    {
      "feature": "num_failed_attempts",
      "label": "Failed quiz attempts",
      "value": 2,
      "impact": "medium",
      "effect": "increases_risk"
    }
  ],
  "protectiveSignals": [
    {
      "feature": "avg_quiz_score",
      "label": "Quiz performance",
      "value": 0.71,
      "impact": "medium",
      "effect": "reduces_risk"
    },
    {
      "feature": "quiz_attempts_count",
      "label": "Quiz engagement",
      "value": 5,
      "impact": "low",
      "effect": "reduces_risk"
    }
  ],
  "modelInsights": {
    "model": "Logistic Regression",
    "topFactors": [
      {
        "feature": "days_since_last_activity",
        "coefficient": 0.82,
        "direction": "risk_increase"
      },
      {
        "feature": "completion_percentage",
        "coefficient": -1.21,
        "direction": "risk_decrease"
      },
      {
        "feature": "avg_quiz_score",
        "coefficient": -0.74,
        "direction": "risk_decrease"
      },
      {
        "feature": "num_failed_attempts",
        "coefficient": 0.56,
        "direction": "risk_increase"
      },
      {
        "feature": "lessons_completed",
        "coefficient": -0.63,
        "direction": "risk_decrease"
      },
      {
        "feature": "days_since_enrollment",
        "coefficient": 0.44,
        "direction": "risk_increase"
      },
      {
        "feature": "quiz_attempts_count",
        "coefficient": -0.38,
        "direction": "risk_decrease"
      }
    ]
  }
}
```

## ML Rules

- Use `LogisticRegression` from scikit-learn
- Train offline in `train.py`
- Save model as `model.pkl`
- Load `model.pkl` once at startup
- Use `predict_proba()` for dropout probability
- Expose coefficients for dashboard/explainability

### Feature Order

Always use this exact order:

1. completion_percentage
2. avg_quiz_score
3. num_failed_attempts
4. days_since_last_activity
5. days_since_enrollment
6. lessons_completed
7. quiz_attempts_count

### Hackathon Constraints

Do:

- keep code simple
- make demo work end-to-end
- use synthetic data if real data is missing
- return useful dashboard-ready output

Do not:

- build feature stores
- add complex auth
- add model registry
- build production observability
- add unnecessary abstractions
- use deep learning or GenAI

## Definition of Done

Done means:

- `train.py` creates `model.pkl`
- FastAPI service starts
- `POST /v1/predict` returns probability + risk band
- apps/api can call predictor
- apps/web can display result
- README explains ML approach and business value
