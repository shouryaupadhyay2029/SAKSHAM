from fastapi import APIRouter, Depends, status
from typing import List
from app.schemas.incident import IncidentResponse, IncidentCreate, IncidentUpdate
from app.domain.incidents.service import IncidentService
from app.api.dependencies import get_incident_service
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent

router = APIRouter()
publisher = EventPublisher(connection_manager)

@router.get("", response_model=List[IncidentResponse], summary="List all incidents")
async def list_incidents(service: IncidentService = Depends(get_incident_service)):
    return service.list_incidents()

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED, summary="Create a new incident")
async def create_incident(incident: IncidentCreate, service: IncidentService = Depends(get_incident_service)):
    created = service.create_incident(incident)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.INCIDENT_CREATED,
                entityType="incident",
                entityId=str(created.id),
                data=IncidentResponse.model_validate(created).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return created

@router.get("/{incident_id}", response_model=IncidentResponse, summary="Get incident details by ID or Reference")
async def get_incident(incident_id: str, service: IncidentService = Depends(get_incident_service)):
    return service.get_incident(incident_id)

@router.patch("/{incident_id}", response_model=IncidentResponse, summary="Update incident fields or status")
async def update_incident(incident_id: str, update_data: IncidentUpdate, service: IncidentService = Depends(get_incident_service)):
    existing = service.get_incident(incident_id)
    updated = service.update_incident(incident_id, update_data)
    
    if update_data.status and update_data.status != existing.status:
        event_type = EventType.INCIDENT_STATUS_CHANGED
    else:
        event_type = EventType.INCIDENT_UPDATED
        
    try:
        await publisher.publish(
            RealtimeEvent(
                event=event_type,
                entityType="incident",
                entityId=str(updated.id),
                data=IncidentResponse.model_validate(updated).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return updated
