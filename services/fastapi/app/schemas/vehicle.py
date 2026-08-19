from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class VehicleStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    DISPATCHED = "DISPATCHED"
    EN_ROUTE = "EN_ROUTE"
    ON_SCENE = "ON_SCENE"
    RETURNING = "RETURNING"
    MAINTENANCE = "MAINTENANCE"

class VehicleBase(BaseModel):
    name: str
    type: str
    capacity: float
    capacityUnit: str
    currentLatitude: float
    currentLongitude: float
    speed: float = 0.0
    operatorName: str
    contactRadio: str
    currentMission: Optional[str] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    currentLatitude: Optional[float] = None
    currentLongitude: Optional[float] = None
    speed: Optional[float] = None
    status: Optional[VehicleStatus] = None
    currentMission: Optional[str] = None

class VehicleResponse(VehicleBase):
    id: str
    vehicleId: str
    status: VehicleStatus
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
