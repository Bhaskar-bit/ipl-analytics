from pydantic import BaseModel, Field
from typing import Literal, Dict, List, Optional
from enum import Enum


class MatchStage(str, Enum):
    group = "group"
    qualifier1 = "qualifier1"
    eliminator = "eliminator"
    qualifier2 = "qualifier2"
    final = "final"


class PredictionRequest(BaseModel):
    team_a_id: str = Field(..., description="UUID of team A")
    team_b_id: str = Field(..., description="UUID of team B")
    venue_id: str = Field(..., description="UUID of the venue")
    toss_winner: Literal["team_a", "team_b"] = Field(..., description="Who won the toss")
    toss_decision: Literal["bat", "field"] = Field(..., description="Toss decision")
    season: int = Field(..., ge=2008, le=2030, description="IPL season year")
    stage: MatchStage = Field(MatchStage.group, description="Match stage")


class TeamProbability(BaseModel):
    id: str
    short_name: str
    full_name: str
    win_probability: float = Field(..., ge=0.0, le=1.0)
    brand_color: str


class FeatureContribution(BaseModel):
    name: str
    label: str
    value: float


class HistoricalContext(BaseModel):
    h2h_total_matches: int
    team_a_h2h_wins: int
    team_b_h2h_wins: int


class PredictionResult(BaseModel):
    team_a: TeamProbability
    team_b: TeamProbability
    confidence: Literal["low", "medium", "high"]
    model_version: str
    feature_contributions: List[FeatureContribution]
    historical_context: HistoricalContext


class FeatureImportanceItem(BaseModel):
    name: str
    label: str
    importance: float


class FeatureImportanceResponse(BaseModel):
    model_version: str
    features: List[FeatureImportanceItem]
