from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import fbeta_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURE_ORDER = [
    "completion_percentage",
    "avg_quiz_score",
    "num_failed_attempts",
    "days_since_last_activity",
    "days_since_enrollment",
    "lessons_completed",
    "quiz_attempts_count",
]

TARGET_COL = "dropout"
C_VALUES = [0.01, 0.1, 1.0, 10.0, 100.0]
L1_RATIO = 0.5
RANDOM_STATE = 42
TEST_SIZE = 0.2
THRESHOLD = 0.5
MODEL_NAME = "Logistic Regression"


def load_data(csv_path: Path) -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(csv_path)
    x = df[FEATURE_ORDER]
    y = df[TARGET_COL]
    return x, y


def build_pipeline(c_value: float) -> Pipeline:
    return Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "model",
                LogisticRegression(
                    solver="saga",
                    l1_ratio=L1_RATIO,
                    C=c_value,
                    random_state=RANDOM_STATE,
                    max_iter=5000,
                ),
            ),
        ]
    )


def evaluate_model(model: Pipeline, x_test: pd.DataFrame, y_test: pd.Series) -> dict[str, float]:
    proba = model.predict_proba(x_test)[:, 1]
    pred = (proba >= THRESHOLD).astype(int)

    f2 = fbeta_score(y_test, pred, beta=2)
    recall = recall_score(y_test, pred)
    roc_auc = roc_auc_score(y_test, proba)

    return {
        "f2": float(f2),
        "recall": float(recall),
        "roc_auc": float(roc_auc),
    }


def print_metrics_table(results: list[dict[str, float]]) -> None:
    print("\nModel evaluation (ElasticNet Logistic Regression):")
    print("C\tF2\tRecall\tROC-AUC")
    for row in results:
        print(f"{row['C']:.2f}\t{row['f2']:.4f}\t{row['recall']:.4f}\t{row['roc_auc']:.4f}")


def main() -> None:
    project_dir = Path(__file__).resolve().parent
    data_path = project_dir / "data" / "dropout_training_data.csv"

    if not data_path.exists():
        raise FileNotFoundError(
            f"Training data not found at {data_path}. Run generate_data.py first."
        )

    x, y = load_data(data_path)

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    results: list[dict[str, float]] = []
    best: dict[str, object] | None = None

    for c_value in C_VALUES:
        pipeline = build_pipeline(c_value)
        pipeline.fit(x_train, y_train)

        metrics = evaluate_model(pipeline, x_test, y_test)
        row = {"C": c_value, **metrics}
        results.append(row)

        if best is None:
            best = {"C": c_value, "pipeline": pipeline, **metrics}
            continue

        # Primary metric: F2 (recall-focused), tie-breakers: recall, then ROC-AUC.
        if (
            metrics["f2"] > best["f2"]
            or (
                metrics["f2"] == best["f2"]
                and metrics["recall"] > best["recall"]
            )
            or (
                metrics["f2"] == best["f2"]
                and metrics["recall"] == best["recall"]
                and metrics["roc_auc"] > best["roc_auc"]
            )
        ):
            best = {"C": c_value, "pipeline": pipeline, **metrics}

    assert best is not None

    print_metrics_table(results)
    print("\nRecommended C value:", best["C"])
    print(
        "Reason: highest F2, then recall, then ROC-AUC tie-breaker "
        f"(F2={best['f2']:.4f}, Recall={best['recall']:.4f}, ROC-AUC={best['roc_auc']:.4f})."
    )

    model_path = project_dir / "model.pkl"
    artifact = {
        "pipeline": best["pipeline"],
        "feature_order": FEATURE_ORDER,
        "recommended_c": best["C"],
        "l1_ratio": L1_RATIO,
        "threshold": THRESHOLD,
        "model_name": MODEL_NAME,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    joblib.dump(artifact, model_path)
    print(f"\nSaved best model artifact to: {model_path}")


if __name__ == "__main__":
    main()
