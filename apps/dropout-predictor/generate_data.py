from __future__ import annotations

import random
from pathlib import Path

import numpy as np
import pandas as pd


N_ROWS = 1000
NOISE_RATIO = 0.10
SEED = 42


def build_dataset(n_rows: int = N_ROWS) -> pd.DataFrame:
    np.random.seed(SEED)
    random.seed(SEED)

    user_id = [f"user-{i}" for i in range(1, n_rows + 1)]

    completion_percentage = np.random.beta(a=2.0, b=5.0, size=n_rows)
    completion_percentage = np.clip(completion_percentage, 0.0, 1.0)

    avg_quiz_score = np.random.normal(loc=0.72, scale=0.15, size=n_rows)
    avg_quiz_score = np.clip(avg_quiz_score, 0.0, 1.0)

    num_failed_attempts = np.random.poisson(lam=1.6, size=n_rows)
    num_failed_attempts = np.clip(num_failed_attempts, 0, 5)

    days_since_last_activity = np.random.randint(0, 15, size=n_rows)
    days_since_enrollment = np.random.randint(1, 46, size=n_rows)

    lessons_noise = np.random.normal(loc=0.0, scale=2.0, size=n_rows)
    lessons_completed = np.round(completion_percentage * 20 + lessons_noise).astype(int)
    lessons_completed = np.clip(lessons_completed, 0, 20)

    quiz_attempts_count = np.random.randint(0, 13, size=n_rows)

    score = np.zeros(n_rows, dtype=int)
    score += (days_since_last_activity > 5).astype(int) * 2
    score += (completion_percentage < 0.3).astype(int) * 2
    score += (avg_quiz_score < 0.6).astype(int)
    score += (num_failed_attempts >= 3).astype(int)
    score += (lessons_completed < 3).astype(int)

    dropout = (score >= 3).astype(int)

    n_flip = int(NOISE_RATIO * n_rows)
    flip_indices = random.sample(range(n_rows), n_flip)
    dropout[flip_indices] = 1 - dropout[flip_indices]

    df = pd.DataFrame(
        {
            "user_id": user_id,
            "completion_percentage": completion_percentage,
            "avg_quiz_score": avg_quiz_score,
            "num_failed_attempts": num_failed_attempts,
            "days_since_last_activity": days_since_last_activity,
            "days_since_enrollment": days_since_enrollment,
            "lessons_completed": lessons_completed,
            "quiz_attempts_count": quiz_attempts_count,
            "dropout": dropout,
        }
    )

    return df[
        [
            "user_id",
            "completion_percentage",
            "avg_quiz_score",
            "num_failed_attempts",
            "days_since_last_activity",
            "days_since_enrollment",
            "lessons_completed",
            "quiz_attempts_count",
            "dropout",
        ]
    ]


def main() -> None:
    df = build_dataset()

    output_dir = Path(__file__).resolve().parent / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "dropout_training_data.csv"

    df.to_csv(output_path, index=False)

    print("First 5 rows:")
    print(df.head())
    print("\nLabel distribution (ratio):")
    distribution = df["dropout"].value_counts(normalize=True).sort_index()
    print(distribution)
    print(f"\nSaved dataset to: {output_path}")


if __name__ == "__main__":
    main()
