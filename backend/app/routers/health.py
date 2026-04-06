from fastapi import APIRouter, Request
from pydantic import BaseModel


router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    model_loaded = getattr(request.app.state, "model_loaded", False)
    model = getattr(request.app.state, "model", None)
    version = "unknown"
    if model and hasattr(model, "metadata"):
        version = model.metadata.get("version", "xgb-v2.1")
    elif model_loaded:
        version = "xgb-v2.1"
    return HealthResponse(
        status="ok",
        model_loaded=model_loaded,
        model_version=version,
    )
