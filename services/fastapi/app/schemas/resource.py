from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class ResourceStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    LOW = "LOW"
    RESERVED = "RESERVED"
    DEPLETED = "DEPLETED"
    IN_TRANSIT = "IN_TRANSIT"

class ResourceBase(BaseModel):
    materialName: str
    description: str
    category: str
    availableQuantity: float
    reservedQuantity: float = 0.0
    unit: str
    storageDepot: str
    location: str
    latitude: float
    longitude: float
    pointOfContact: str

class ResourceCreate(ResourceBase):
    pass

class ResourceUpdate(BaseModel):
    availableQuantity: Optional[float] = None
    reservedQuantity: Optional[float] = None
    status: Optional[ResourceStatus] = None

class ResourceResponse(ResourceBase):
    id: str
    resourceId: str
    status: ResourceStatus
    lastUpdated: datetime
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
