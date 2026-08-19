from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AllocationStatus(str, Enum):
    RECOMMENDED = "RECOMMENDED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DISPATCHED = "DISPATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class AllocationBase(BaseModel):
    demandId: str
    resourceId: str
    vehicleId: Optional[str] = None
    matchScore: float = 1.0
    availabilityScore: float = 1.0
    distanceScore: float = 1.0
    priorityScore: float = 1.0
    compatibilityScore: float = 1.0

class AllocationCreate(BaseModel):
    demandId: str
    resourceId: str
    quantity: float

class AllocationStatusUpdate(BaseModel):
    status: AllocationStatus
    notes: Optional[str] = None

class AllocationResponse(AllocationBase):
    id: str
    allocationId: str
    status: AllocationStatus
    approvedById: Optional[str] = None
    approvedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
