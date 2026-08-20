from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from app.schemas.dispatch import DispatchResponse, DispatchCreate, DispatchStatus, DispatchActionRequest, VehicleRecommendation
from app.domain.dispatch.service import DispatchService
from app.api.dependencies import get_dispatch_service

router = APIRouter()

@router.get("", response_model=List[DispatchResponse], summary="List all dispatches")
async def list_dispatches(
    status: Optional[str] = Query(None, description="Filter by dispatch status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    vehicleId: Optional[str] = Query(None, description="Filter by vehicle ID"),
    search: Optional[str] = Query(None, description="Search by origin/destination/ID"),
    service: DispatchService = Depends(get_dispatch_service)
):
    return service.list_dispatches(status=status, priority=priority, vehicle_id=vehicleId, search=search)

@router.post("", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED, summary="Create a new dispatch execution record")
async def create_dispatch(dispatch: DispatchCreate, service: DispatchService = Depends(get_dispatch_service)):
    return service.create_dispatch(dispatch)

@router.get("/recommend-vehicles", response_model=List[VehicleRecommendation], summary="Get suitable vehicle recommendations for an allocation")
async def recommend_vehicles(
    allocationId: str = Query(..., description="Allocation ID to get vehicle recommendations for"),
    service: DispatchService = Depends(get_dispatch_service)
):
    return service.recommend_vehicles(allocationId)

@router.get("/{dispatch_id}", response_model=DispatchResponse, summary="Get dispatch details by ID or Dispatch ID")
async def get_dispatch(dispatch_id: str, service: DispatchService = Depends(get_dispatch_service)):
    return service.get_dispatch(dispatch_id)

@router.patch("/{dispatch_id}/status", response_model=DispatchResponse, summary="Update dispatch execution status (Dispatch, Delay, Fulfill)")
async def update_dispatch_status(
    dispatch_id: str,
    nextStatus: DispatchStatus = Query(..., description="Next status for the dispatch state machine"),
    action_req: DispatchActionRequest = DispatchActionRequest(),
    service: DispatchService = Depends(get_dispatch_service)
):
    return service.update_dispatch_status(dispatch_id, nextStatus, action_req)
