from fastapi import APIRouter, Depends, status
from typing import List
from app.schemas.allocation import AllocationResponse, AllocationCreate, AllocationStatusUpdate
from app.domain.allocation.service import AllocationService
from app.api.dependencies import get_allocation_service
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent

router = APIRouter()
publisher = EventPublisher(connection_manager)

@router.get("", response_model=List[AllocationResponse], summary="List all resource allocations")
async def list_allocations(service: AllocationService = Depends(get_allocation_service)):
    return service.list_allocations()

@router.post("", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED, summary="Create a new resource allocation request")
async def create_allocation(allocation: AllocationCreate, service: AllocationService = Depends(get_allocation_service)):
    created = service.create_allocation(allocation)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.ALLOCATION_CREATED,
                entityType="allocation",
                entityId=str(created.id),
                data=AllocationResponse.model_validate(created).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return created

@router.get("/{allocation_id}", response_model=AllocationResponse, summary="Get allocation details by ID or Allocation ID")
async def get_allocation(allocation_id: str, service: AllocationService = Depends(get_allocation_service)):
    return service.get_allocation(allocation_id)

@router.patch("/{allocation_id}/status", response_model=AllocationResponse, summary="Update allocation status (Approve/Reject)")
async def update_allocation_status(
    allocation_id: str,
    update_data: AllocationStatusUpdate,
    service: AllocationService = Depends(get_allocation_service)
):
    updated = service.update_allocation_status(allocation_id, update_data)
    event_type = EventType.ALLOCATION_APPROVED if str(updated.status).upper() == "APPROVED" else EventType.ALLOCATION_REJECTED
    try:
        await publisher.publish(
            RealtimeEvent(
                event=event_type,
                entityType="allocation",
                entityId=str(updated.id),
                data=AllocationResponse.model_validate(updated).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return updated
