# Mentingo: AI-Powered Dropout Prediction for LMS

## 1. Project Overview

Mentingo is a modern Learning Management System enhanced with **Machine Learning** to proactively predict student dropout risk.

At the core of this hackathon solution is a **Logistic Regression** model that analyzes student learning behavior and estimates the probability of dropout in real time. The platform combines:

- behavior tracking signals from the learning journey,
- explainable risk scoring,
- actionable analytics for admins.

This creates an **AI-driven retention cockpit** that helps teams move from reactive reporting to predictive intervention.

## 2. Problem We Solve

- Online education platforms often detect disengagement too late.
- By the time teams react, many learners have already dropped off.
- Decisions are frequently based on intuition instead of measurable signals.
- Mentingo identifies early warning signs (low progress, quiz struggles, inactivity) in time to act.
- Admins can run a data-driven education management process, not guessing, and launch targeted interventions before churn happens.

### Goal

**Discover dropout risk early to improve course completion and maximize learning ROI.**

## 3. Business Impact

Mentingo’s dropout prediction capability delivers measurable value for education businesses and training teams:

- **Higher completion rates:** early intervention increases the chance learners finish courses.
- **Better ROI on content production:** more learners complete programs built with significant content investment.
- **Revenue protection:** reducing learner churn lowers lost subscription and course income.
- **Smarter operations:** instructors and admins focus support where it has highest impact.
- **Executive-ready insights:** human-friendly analytics turn ML output into clear business decisions.

In short, Mentingo transforms raw learner activity into an **actionable retention strategy** powered by explainable AI.

## 4. How to Run

- Install dependencies and complete setup:
  - `pnpm setup:unix` (macOS/Linux) or `pnpm setup:win` (Windows)
- Start the full development environment:
  - `pnpm dev`
- `pnpm dev` is updated to run all required apps, including the new `dropout-predictor` service, so web, API, and ML prediction are available together.

## 5. Model Details

### Dropout Predictor Structure

- **Feature tracking layer (Web):** captures learner behavior signals (progress, quiz performance, activity, lesson completion).
- **Prediction API layer (apps/api):** standard endpoint that receives features and forwards prediction requests.
- **ML service layer (apps/dropout-predictor):** runs inference and returns explainable risk output (`risk`, `keyDrivers`, `protectiveSignals`, `modelInsights`).

### Model Used

- **Algorithm:** Logistic Regression
- **Why this model:** fast, reliable, and explainable for binary classification (dropout vs non-dropout)
- **Input features (7):**
  - `completion_percentage`
  - `avg_quiz_score`
  - `num_failed_attempts`
  - `days_since_last_activity`
  - `days_since_enrollment`
  - `lessons_completed`
  - `quiz_attempts_count`

### Regularization and Training Setup

- **Scaling:** `StandardScaler` is applied before model training.
- **Regularization:** ElasticNet-style regularization using `solver="saga"` and `l1_ratio=0.5`.
- **Hyperparameter search:** `C` tested on `[0.01, 0.1, 1.0, 10.0, 100.0]`.
- **Model selection priority:** highest **F2** (recall-focused), then **Recall**, then **ROC-AUC**.
- **Recommended C:** `0.01`.

### Evaluation Metrics

| C      | F2 Score | Recall | ROC-AUC |
| ------ | -------: | -----: | ------: |
| 0.01   |   0.7890 | 0.7963 |  0.8254 |
| 0.10   |   0.7821 | 0.7778 |  0.8406 |
| 1.00   |   0.7807 | 0.7778 |  0.8416 |
| 10.00  |   0.7821 | 0.7778 |  0.8412 |
| 100.00 |   0.7821 | 0.7778 |  0.8410 |

- **Interpretation for business users:**
  - **F2 Score:** prioritizes catching at-risk learners early.
  - **Recall:** measures how many actual dropouts we correctly identify.
  - **ROC-AUC:** measures overall ranking quality of risk scores.

### Confusion Matrix (Best Model, C=0.01)

| Actual \\ Predicted | No Dropout (0) | Dropout (1) |
| ------------------- | -------------: | ----------: |
| No Dropout (0)      |        65 (TN) |     27 (FP) |
| Dropout (1)         |        22 (FN) |     86 (TP) |

- The model catches most at-risk learners (**TP=86**), with some false alarms (**FP=27**), which is acceptable for early-intervention scenarios.
