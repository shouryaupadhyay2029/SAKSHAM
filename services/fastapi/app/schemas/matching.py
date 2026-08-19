from pydantic import BaseModel
from typing import List, Optional

class MatchRequest(BaseModel):
    demandId: str

class ScoreBreakdown(BaseModel):
    compatibility: float
    availability: float
    distance: float
    priority: float
    readiness: float

class MatchRecommendation(BaseModel):
    resourceId: str
    resourceName: str
    category: str
    score: float
    scoreBreakdown: ScoreBreakdown
    distanceKm: float
    explanation: str
    matchType: str  # e.g., "EXACT_MATCH", "PARTIAL_MATCH", etc.

class MatchResponse(BaseModel):
    status: str
    recommendations: List[MatchRecommendation]
