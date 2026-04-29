from fastapi import FastAPI

from dropout_predictor.api.routes import router as prediction_router

app = FastAPI(title="dropout-predictor")
app.include_router(prediction_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
