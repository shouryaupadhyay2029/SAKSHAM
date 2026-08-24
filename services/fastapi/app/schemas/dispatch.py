from enum import Enum
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel
from app.schemas.allocation import AllocationResponse
from app.schemas.vehicle import VehicleResponse

class DispatchStatus(str, Enum):
    PLANNED = "PLANNED"
    READY = "READY"
    DISPATCHED = "DISPATCHED"
    EN_ROUTE = "EN_ROUTE"
    ARRIVED = "ARRIVED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DELAYED = "DELAYED"
    FAILED = "FAILED"

class DispatchBase(BaseModel):
    allocationId: str
    vehicleId: str
    origin: str
    destination: str
    assignedOfficer: Optional[str] = None
    assignedOfficerId: Optional[str] = None
    plannedDeparture: Optional[datetime] = None
    estimatedArrival: Optional[datetime] = None
    actualDeparture: Optional[datetime] = None
    actualArrival: Optional[datetime] = None
    completionTime: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    quantity: Optional[float] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    # Route decision fields — populated at dispatch creation
    routeProvider: Optional[str] = None
    routeProfile: Optional[str] = None
    routeDistanceMeters: Optional[float] = None
    routeDurationSeconds: Optional[float] = None
    routeGeometry: Optional[Dict[str, Any]] = None
    routeScore: Optional[float] = None
    routeDecisionReason: Optional[str] = None
    routeDecisionFactors: Optional[Dict[str, float]] = None
    routeAlternatives: Optional[List[Dict[str, Any]]] = None
    routeCalculatedAt: Optional[datetime] = None
    routeDeviationStatus: Optional[str] = None

class DispatchCreate(BaseModel):
    allocationId: str
    vehicleId: str
    assignedOfficerId: str
    plannedDeparture: datetime
    eta: datetime
    notes: Optional[str] = None

class RoutedDispatchCreate(DispatchCreate):
    """Extended dispatch creation payload that includes routing context."""
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    incident_severity: Optional[str] = None
    incident_affected_people: Optional[int] = 0

class DispatchActionRequest(BaseModel):
    notes: Optional[str] = None
    officerId: Optional[str] = None

class VehicleScoreBreakdown(BaseModel):
    availability: float
    capacity: float
    distance: float
    compatibility: float
    readiness: float

class VehicleRecommendation(BaseModel):
    vehicleId: str
    name: str
    type: str
    score: float
    scoreBreakdown: VehicleScoreBreakdown
    distanceKm: float
    explanation: str
    reasons: List[str]

class DispatchResponse(DispatchBase):
    id: str
    dispatchId: str
    status: DispatchStatus
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
