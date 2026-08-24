"""
Strongly typed Pydantic schemas for route candidates and route decisions.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class RouteScoreFactors(BaseModel):
    travel_time_score: float
    distance_score: float
    accessibility_score: float
    priority_score: float


class RouteCandidate(BaseModel):
    id: str
    distance_meters: float
    duration_seconds: float
    geometry: Dict[str, Any]            # GeoJSON LineString
    route_score: float
    selected: bool
    decision_reason: str
    decision_factors: RouteScoreFactors
    summary: Optional[str] = None


class RouteDecision(BaseModel):
    routing_provider: str               # e.g. "OSRM"
    profile: str                        # e.g. "driving"
    selected_route: RouteCandidate
    alternatives: List[RouteCandidate]
    route_score: float
    decision_reason: str
    decision_factors: RouteScoreFactors
    calculated_at: datetime
    policy_name: str
    policy_reason: str
    policy_weights: Dict[str, float]


class RouteRequest(BaseModel):
    """Request schema for POST /api/v1/routing/route"""
    origin: "Coordinate"
    destination: "Coordinate"
    incident_severity: Optional[str] = None
    incident_affected_people: Optional[int] = 0


class Coordinate(BaseModel):
    lat: float
    lng: float


class DeviationCheckRequest(BaseModel):
    """Request schema for POST /api/v1/routing/check-deviation"""
    route_geometry: Dict[str, Any]      # GeoJSON LineString of the active route
    vehicle_lat: float
    vehicle_lng: float
    threshold_meters: float = 150.0     # deviation threshold


class DeviationCheckResponse(BaseModel):
    deviated: bool
    distance_from_route_meters: float
    threshold_meters: float
