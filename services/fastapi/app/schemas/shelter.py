from enum import Enum
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class ShelterStatus(str, Enum):
    OPEN = "OPEN"
    NEAR_CAPACITY = "NEAR_CAPACITY"
    FULL = "FULL"
    CLOSED = "CLOSED"

class ShelterBase(BaseModel):
    name: str
    location: str
    region: str
    latitude: float
    longitude: float
    totalCapacity: int
    currentOccupancy: int = 0
    facilities: List[str] = []
    contactPerson: str
    contactInfo: str

class ShelterCreate(ShelterBase):
    pass

class ShelterUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    totalCapacity: Optional[int] = None
    currentOccupancy: Optional[int] = None
    status: Optional[ShelterStatus] = None
    facilities: Optional[List[str]] = None
    contactPerson: Optional[str] = None
    contactInfo: Optional[str] = None

class ShelterResponse(ShelterBase):
    id: str
    shelterId: str
    status: ShelterStatus
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
