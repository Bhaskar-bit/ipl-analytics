from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    MODEL_PATH: str = "app/ml/models/xgb_win_predictor.joblib"
    LABEL_ENCODERS_PATH: str = "app/ml/models/label_encoders.joblib"
    CORS_ORIGINS: List[str] = ["http://localhost:4200", "http://localhost:3000"]
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
