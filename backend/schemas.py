from pydantic import BaseModel
from typing import Optional

class ResourceCreate(BaseModel):
    name: str
    resource_type: str
    capacity: Optional[int] = None
    status: Optional[str] = "available"
    agency_name: Optional[str] = None
    latitude: float
    longitude: float

class ResourceOut(BaseModel):
    id: int
    name: str
    resource_type: str
    capacity: Optional[int]
    status: str
    agency_name: Optional[str]
    latitude: float
    longitude: float

    class Config:
        from_attributes = True