from fastapi import APIRouter, Depends, status
from typing import List
from app.schemas.incident import IncidentResponse, IncidentCreate, IncidentUpdate
from app.domain.incidents.service import IncidentService
from app.api.dependencies import get_incident_service, RoleChecker
from app.core.models import OfficerModel
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent

router = APIRouter()
publisher = EventPublisher(connection_manager)

# Reusable dependency: only active, verified officers with operational roles may
# perform status mutations on incidents.
_officer_roles = RoleChecker(["OPERATOR", "REGIONAL_AUTHORITY", "ADMIN"])

@router.get("", response_model=List[IncidentResponse], summary="List all incidents")
async def list_incidents(service: IncidentService = Depends(get_incident_service)):
    return service.list_incidents()

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED, summary="Create a new incident")
async def create_incident(incident: IncidentCreate, service: IncidentService = Depends(get_incident_service)):
    """Public endpoint — civilians and automated systems may create (SOS) incidents."""
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
    """Public read — anyone may view incident details."""
    return service.get_incident(incident_id)

@router.patch(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Update incident fields or status — Officer Access Required",
    responses={
        401: {"description": "Invalid or missing access token"},
        403: {"description": "Officer Access Required: insufficient role"},
        409: {"description": "Invalid state machine transition"},
    }
)
async def update_incident(
    incident_id: str,
    update_data: IncidentUpdate,
    service: IncidentService = Depends(get_incident_service),
    current_officer: OfficerModel = Depends(_officer_roles),
):
    """
    Officer-only endpoint.

    Advancing an incident through its lifecycle (REPORTED → VERIFIED → AWAITING_MATCH
    → MATCHED → DISPATCHED → UNDER_RESPONSE → RESOLVED) requires an authenticated
    officer with role OPERATOR, REGIONAL_AUTHORITY, or ADMIN.

    Civilians receive a clear 403 OFFICER_ACCESS_REQUIRED response.
    Invalid state machine transitions receive 409 INVALID_STATE_TRANSITION.
    """
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
