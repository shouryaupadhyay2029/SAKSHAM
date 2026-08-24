from fastapi import APIRouter, Depends, status
from typing import List, Optional
from app.schemas.shelter import ShelterResponse, ShelterCreate, ShelterUpdate
from app.domain.shelter.service import ShelterService
from app.api.dependencies import get_shelter_service, get_current_officer
from app.core.models import OfficerModel
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent

router = APIRouter()
publisher = EventPublisher(connection_manager)

@router.get("", response_model=List[ShelterResponse], summary="List all shelters")
async def list_shelters(
    status: Optional[str] = None,
    region: Optional[str] = None,
    service: ShelterService = Depends(get_shelter_service)
):
    return service.list_shelters(status=status, region=region)

@router.post("", response_model=ShelterResponse, status_code=status.HTTP_201_CREATED, summary="Create a new shelter")
async def create_shelter(
    shelter: ShelterCreate,
    service: ShelterService = Depends(get_shelter_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.create_shelter(shelter)

@router.get("/{shelter_id}", response_model=ShelterResponse, summary="Get shelter details by ID or Reference")
async def get_shelter(shelter_id: str, service: ShelterService = Depends(get_shelter_service)):
    return service.get_shelter(shelter_id)

@router.patch("/{shelter_id}", response_model=ShelterResponse, summary="Update shelter fields or status")
async def update_shelter(
    shelter_id: str,
    update_data: ShelterUpdate,
    service: ShelterService = Depends(get_shelter_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    updated = service.update_shelter(shelter_id, update_data)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.SHELTER_UPDATED,
                entityType="shelter",
                entityId=str(updated.id),
                data=ShelterResponse.model_validate(updated).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return updated
