from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class EventType(str, Enum):
    INCIDENT_CREATED = "INCIDENT_CREATED"
    INCIDENT_UPDATED = "INCIDENT_UPDATED"
    INCIDENT_STATUS_CHANGED = "INCIDENT_STATUS_CHANGED"

    DEMAND_CREATED = "DEMAND_CREATED"
    DEMAND_UPDATED = "DEMAND_UPDATED"

    MATCH_CREATED = "MATCH_CREATED"
    MATCH_UPDATED = "MATCH_UPDATED"

    ALLOCATION_CREATED = "ALLOCATION_CREATED"
    ALLOCATION_APPROVED = "ALLOCATION_APPROVED"
    ALLOCATION_REJECTED = "ALLOCATION_REJECTED"

    DISPATCH_CREATED = "DISPATCH_CREATED"
    DISPATCH_STATUS_CHANGED = "DISPATCH_STATUS_CHANGED"

    DELIVERY_CREATED = "DELIVERY_CREATED"
    DELIVERY_STATUS_CHANGED = "DELIVERY_STATUS_CHANGED"

    VEHICLE_STATUS_CHANGED = "VEHICLE_STATUS_CHANGED"

    RESOURCE_UPDATED = "RESOURCE_UPDATED"
    SHELTER_UPDATED = "SHELTER_UPDATED"

    NOTIFICATION_CREATED = "NOTIFICATION_CREATED"
    SYSTEM_ALERT = "SYSTEM_ALERT"


class RealtimeEvent(BaseModel):
    event: EventType
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    entityType: str
    entityId: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
