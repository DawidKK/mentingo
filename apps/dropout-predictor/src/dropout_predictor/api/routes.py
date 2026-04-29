from fastapi import APIRouter

from dropout_predictor.api.schemas import PredictionRequest, PredictionResponse
from dropout_predictor.services.prediction_service import predict

router = APIRouter(prefix="/v1", tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse)
def predict_dropout(payload: PredictionRequest) -> PredictionResponse:
    return predict(user_id=payload.userId, features=payload.features)
