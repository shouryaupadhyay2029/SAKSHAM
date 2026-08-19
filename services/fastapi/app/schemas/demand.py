from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class DemandPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class DemandStatus(str, Enum):
    PENDING = "PENDING"
    AWAITING_MATCH = "AWAITING_MATCH"
    MATCHED = "MATCHED"
    ALLOCATED = "ALLOCATED"
    DISPATCHED = "DISPATCHED"
    FULFILLED = "FULFILLED"
    CANCELLED = "CANCELLED"

class DemandBase(BaseModel):
    incidentId: str
    affectedZone: str
    requestedType: str
    description: str
    quantity: float
    unit: str
    affectedPeople: int = 0
    priority: DemandPriority
    requiredBy: Optional[datetime] = None

class DemandCreate(DemandBase):
    pass

class DemandUpdate(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    priority: Optional[DemandPriority] = None
    status: Optional[DemandStatus] = None

class DemandResponse(DemandBase):
    id: str
    requestId: str
    status: DemandStatus
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
