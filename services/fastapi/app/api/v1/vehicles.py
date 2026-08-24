from fastapi import APIRouter, Depends, status
from typing import List
from app.schemas.vehicle import VehicleResponse, VehicleCreate, VehicleUpdate
from app.domain.vehicles.service import VehicleService
from app.api.dependencies import get_vehicle_service, get_current_officer
from app.core.models import OfficerModel
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent

router = APIRouter()
publisher = EventPublisher(connection_manager)

@router.get("", response_model=List[VehicleResponse], summary="List all fleet vehicles")
async def list_vehicles(service: VehicleService = Depends(get_vehicle_service)):
    return service.list_vehicles()

@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED, summary="Create a new vehicle record")
async def create_vehicle(
    vehicle: VehicleCreate,
    service: VehicleService = Depends(get_vehicle_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.create_vehicle(vehicle)

@router.get("/{vehicle_id}", response_model=VehicleResponse, summary="Get vehicle details by ID or Vehicle ID")
async def get_vehicle(vehicle_id: str, service: VehicleService = Depends(get_vehicle_service)):
    return service.get_vehicle(vehicle_id)

@router.patch("/{vehicle_id}", response_model=VehicleResponse, summary="Update vehicle coordinates, speed or status")
async def update_vehicle(
    vehicle_id: str,
    update_data: VehicleUpdate,
    service: VehicleService = Depends(get_vehicle_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    updated = service.update_vehicle(vehicle_id, update_data)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.VEHICLE_STATUS_CHANGED,
                entityType="vehicle",
                entityId=str(updated.id),
                data=VehicleResponse.model_validate(updated).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return updated
