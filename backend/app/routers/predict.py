from fastapi import APIRouter, Request, HTTPException, Depends
from supabase import Client
from app.schemas.prediction import (
    PredictionRequest, PredictionResult, FeatureImportanceResponse
)
from app.services.prediction_service import PredictionService
from app.dependencies import get_supabase_client

router = APIRouter()


@router.post("/match-winner", response_model=PredictionResult)
async def predict_match_winner(
    request_data: PredictionRequest,
    request: Request,
    sb: Client = Depends(get_supabase_client),
):
    model = getattr(request.app.state, "model", None)
    if not model:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Please run the training script first.",
        )
    service = PredictionService(model=model, supabase=sb)
    try:
        result = await service.predict(request_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/feature-importance", response_model=FeatureImportanceResponse)
async def get_feature_importance(request: Request):
    model = getattr(request.app.state, "model", None)
    if not model:
        raise HTTPException(status_code=503, detail="ML model not loaded.")

    from app.ml.feature_config import FEATURE_LABELS
    from app.services.prediction_service import _get_feature_importances

    importances = _get_feature_importances(model)
    features = [
        {"name": name, "label": FEATURE_LABELS.get(name, name), "importance": float(imp)}
        for name, imp in zip(FEATURE_LABELS.keys(), importances)
    ]
    features.sort(key=lambda x: x["importance"], reverse=True)

    return FeatureImportanceResponse(model_version="xgb-v2.1", features=features)
