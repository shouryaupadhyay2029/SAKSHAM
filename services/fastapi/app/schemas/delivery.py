from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class DeliveryStatus(str, Enum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    ARRIVED = "ARRIVED"
    VERIFIED = "VERIFIED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class DeliveryBase(BaseModel):
    dispatchId: str
    quantity: float
    unit: str
    deliveredAt: Optional[datetime] = None
    receivedBy: Optional[str] = None
    confirmation: Optional[str] = None
    notes: Optional[str] = None

class DeliveryCreate(DeliveryBase):
    pass

class DeliveryResponse(DeliveryBase):
    id: str
    deliveryId: str
    status: DeliveryStatus
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
