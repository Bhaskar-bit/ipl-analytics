from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import os

from app.routers import predict, health, stats
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model on startup."""
    model_path = settings.MODEL_PATH
    if os.path.exists(model_path):
        app.state.model = joblib.load(model_path)
        app.state.model_loaded = True
        print(f"[IPL Predictor] Model loaded from {model_path}")
    else:
        app.state.model = None
        app.state.model_loaded = False
        print(f"[IPL Predictor] WARNING: Model not found at {model_path}. Run scripts/retrain_model.py first.")
    yield
    # Cleanup on shutdown (if needed)


app = FastAPI(
    title="IPL Predictor API",
    description="ML-powered IPL match winner prediction API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow Angular dev server and production URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(predict.router, prefix="/predict", tags=["Prediction"])
app.include_router(health.router, tags=["Health"])
app.include_router(stats.router, prefix="/stats", tags=["Stats"])
