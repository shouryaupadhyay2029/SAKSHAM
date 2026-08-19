from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from app.schemas.delivery import DeliveryResponse, DeliveryCreate, DeliveryStatus, DeliveryStatusUpdate, DeliveryVerifyRequest
from app.domain.delivery.service import DeliveryService
from app.api.dependencies import get_delivery_service, get_current_officer
from app.core.models import OfficerModel

router = APIRouter()

@router.get("", response_model=List[DeliveryResponse], summary="List all deliveries")
async def list_deliveries(
    status: Optional[str] = Query(None, description="Filter by delivery status"),
    dispatchId: Optional[str] = Query(None, description="Filter by dispatch ID"),
    allocationId: Optional[str] = Query(None, description="Filter by allocation ID"),
    incidentId: Optional[str] = Query(None, description="Filter by incident ID"),
    region: Optional[str] = Query(None, description="Filter by region"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    service: DeliveryService = Depends(get_delivery_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.list_deliveries(
        status=status, 
        dispatch_id=dispatchId, 
        allocation_id=allocationId, 
        incident_id=incidentId, 
        region=region, 
        priority=priority
    )

@router.get("/{delivery_id}", response_model=DeliveryResponse, summary="Get delivery details by ID or reference code")
async def get_delivery(
    delivery_id: str,
    service: DeliveryService = Depends(get_delivery_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.get_delivery(delivery_id)

@router.post("", response_model=DeliveryResponse, status_code=status.HTTP_201_CREATED, summary="Create a new delivery operational record")
async def create_delivery(
    delivery: DeliveryCreate,
    service: DeliveryService = Depends(get_delivery_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.create_delivery(delivery, officer=current_officer)

@router.patch("/{delivery_id}/status", response_model=DeliveryResponse, summary="Update delivery status via transition check")
async def update_delivery_status(
    delivery_id: str,
    status_update: DeliveryStatusUpdate,
    service: DeliveryService = Depends(get_delivery_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.update_delivery_status(
        delivery_id, 
        status_update.status, 
        officer=current_officer, 
        received_by=status_update.receivedBy, 
        confirmation=status_update.confirmation, 
        notes=status_update.notes
    )

@router.post("/{delivery_id}/verify", response_model=DeliveryResponse, summary="Record verification details and quantity for a delivery")
async def verify_delivery(
    delivery_id: str,
    verify_req: DeliveryVerifyRequest,
    service: DeliveryService = Depends(get_delivery_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.verify_delivery(
        delivery_id, 
        verify_req.verifiedQuantity, 
        notes=verify_req.notes, 
        recipient_name=verify_req.recipientName, 
        officer=current_officer
    )

@router.post("/{delivery_id}/complete", response_model=DeliveryResponse, summary="Complete the delivery and update resource inventory atomically")
async def complete_delivery(
    delivery_id: str,
    service: DeliveryService = Depends(get_delivery_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.complete_delivery(delivery_id, officer=current_officer)

@router.post("/{delivery_id}/cancel", response_model=DeliveryResponse, summary="Cancel the delivery operation")
async def cancel_delivery(
    delivery_id: str,
    service: DeliveryService = Depends(get_delivery_service),
    current_officer: OfficerModel = Depends(get_current_officer)
):
    return service.update_delivery_status(delivery_id, DeliveryStatus.CANCELLED, officer=current_officer)
