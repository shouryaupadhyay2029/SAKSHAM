from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import Severity

class IncidentStatus(str, Enum):
    REPORTED = "REPORTED"
    VERIFIED = "VERIFIED"
    AWAITING_MATCH = "AWAITING_MATCH"
    MATCHED = "MATCHED"
    DISPATCHED = "DISPATCHED"
    UNDER_RESPONSE = "UNDER_RESPONSE"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"

class IncidentBase(BaseModel):
    title: str
    description: str
    type: str
    location: str
    latitude: float
    longitude: float
    region: str
    severity: Severity
    affectedPeople: int = 0
    displacedPeople: int = 0
    assignedUnit: Optional[str] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[Severity] = None
    status: Optional[IncidentStatus] = None
    affectedPeople: Optional[int] = None
    displacedPeople: Optional[int] = None
    assignedUnit: Optional[str] = None

class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus

class IncidentResponse(IncidentBase):
    id: str
    incidentId: str
    status: IncidentStatus
    reportedAt: datetime
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
