from typing import Literal

from pydantic import BaseModel, Field


class Features(BaseModel):
    completion_percentage: float = Field(ge=0.0, le=1.0)
    avg_quiz_score: float = Field(ge=0.0, le=1.0)
    num_failed_attempts: int = Field(ge=0)
    days_since_last_activity: int = Field(ge=0)
    days_since_enrollment: int = Field(ge=0)
    lessons_completed: int = Field(ge=0)
    quiz_attempts_count: int = Field(ge=0)


class PredictionRequest(BaseModel):
    userId: str = Field(min_length=1)
    features: Features


class RiskInfo(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    level: Literal["low", "medium", "high"]
    label: str


class Signal(BaseModel):
    feature: str
    label: str
    value: float
    impact: Literal["low", "medium", "high"]
    effect: Literal["increases_risk", "reduces_risk"]


class TopFactor(BaseModel):
    feature: str
    coefficient: float
    direction: Literal["risk_increase", "risk_decrease"]


class ModelInsights(BaseModel):
    model: str
    topFactors: list[TopFactor]


class PredictionResponse(BaseModel):
    userId: str
    risk: RiskInfo
    keyDrivers: list[Signal]
    protectiveSignals: list[Signal]
    modelInsights: ModelInsights
