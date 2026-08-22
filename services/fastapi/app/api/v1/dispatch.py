from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from app.schemas.dispatch import DispatchResponse, DispatchCreate, DispatchStatus, DispatchActionRequest, VehicleRecommendation
from app.domain.dispatch.service import DispatchService
from app.api.dependencies import get_dispatch_service, get_current_officer
from app.core.models import OfficerModel
from app.core.exceptions import SakshamException
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent

router = APIRouter()
publisher = EventPublisher(connection_manager)

@router.get("", response_model=List[DispatchResponse], summary="List all dispatches")
async def list_dispatches(
    status: Optional[str] = Query(None, description="Filter by dispatch status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    vehicleId: Optional[str] = Query(None, description="Filter by vehicle ID"),
    search: Optional[str] = Query(None, description="Search by origin/destination/ID"),
    service: DispatchService = Depends(get_dispatch_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.list_dispatches(status=status, priority=priority, vehicle_id=vehicleId, search=search)

@router.post("", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED, summary="Create a new dispatch execution record")
async def create_dispatch(
    dispatch: DispatchCreate,
    service: DispatchService = Depends(get_dispatch_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    created = service.create_dispatch(dispatch, officer=current_officer)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.DISPATCH_CREATED,
                entityType="dispatch",
                entityId=str(created.id),
                data=DispatchResponse.model_validate(created).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return created

@router.get("/recommend-vehicles", response_model=List[VehicleRecommendation], summary="Get suitable vehicle recommendations for an allocation")
async def recommend_vehicles(
    allocationId: str = Query(..., description="Allocation ID to get vehicle recommendations for"),
    service: DispatchService = Depends(get_dispatch_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.recommend_vehicles(allocationId)

@router.get("/{dispatch_id}", response_model=DispatchResponse, summary="Get dispatch details by ID or Dispatch ID")
async def get_dispatch(
    dispatch_id: str,
    service: DispatchService = Depends(get_dispatch_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.get_dispatch(dispatch_id)

@router.patch("/{dispatch_id}/status", response_model=DispatchResponse, summary="Update dispatch execution status (Dispatch, Delay, Fulfill)")
async def update_dispatch_status(
    dispatch_id: str,
    nextStatus: DispatchStatus = Query(..., description="Next status for the dispatch state machine"),
    action_req: DispatchActionRequest = DispatchActionRequest(),
    service: DispatchService = Depends(get_dispatch_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    # Enforce CANCELLED authorization check
    if nextStatus == DispatchStatus.CANCELLED:
        if current_officer.role not in ["REGIONAL_AUTHORITY", "ADMIN"]:
            raise SakshamException(
                status_code=status.HTTP_403_FORBIDDEN,
                code="FORBIDDEN",
                message=f"Access denied. Only regional authorities or admins can cancel dispatches."
            )
            
    updated = service.update_dispatch_status(dispatch_id, nextStatus, action_req, officer=current_officer)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.DISPATCH_STATUS_CHANGED,
                entityType="dispatch",
                entityId=str(updated.id),
                data=DispatchResponse.model_validate(updated).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return updated
