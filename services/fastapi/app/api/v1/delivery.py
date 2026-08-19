from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from app.schemas.delivery import DeliveryResponse, DeliveryCreate, DeliveryStatus
from app.domain.delivery.service import DeliveryService
from app.api.dependencies import get_delivery_service

router = APIRouter()

@router.get("", response_model=List[DeliveryResponse], summary="List all deliveries")
async def list_deliveries(service: DeliveryService = Depends(get_delivery_service)):
    return service.list_deliveries()

@router.post("", response_model=DeliveryResponse, status_code=status.HTTP_201_CREATED, summary="Create a new delivery verification")
async def create_delivery(delivery: DeliveryCreate, service: DeliveryService = Depends(get_delivery_service)):
    return service.create_delivery(delivery)

@router.get("/{delivery_id}", response_model=DeliveryResponse, summary="Get delivery details by ID or reference")
async def get_delivery(delivery_id: str, service: DeliveryService = Depends(get_delivery_service)):
    return service.get_delivery(delivery_id)

@router.patch("/{delivery_id}/status", response_model=DeliveryResponse, summary="Update delivery status verification")
async def update_delivery_status(
    delivery_id: str,
    status: DeliveryStatus = Query(..., description="Next status for the delivery verification"),
    notes: Optional[str] = Query(None, description="Optional delivery notes"),
    service: DeliveryService = Depends(get_delivery_service)
):
    return service.update_delivery_status(delivery_id, status, notes=notes)
