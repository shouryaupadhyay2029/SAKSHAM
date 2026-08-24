from fastapi import APIRouter, Depends, status
from typing import List
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.schemas.allocation import AllocationResponse, AllocationCreate, AllocationStatusUpdate, AllocationStatus
from app.schemas.incident import IncidentResponse, IncidentStatus
from app.schemas.demand import DemandResponse, DemandStatus
from app.schemas.resource import ResourceResponse, ResourceStatus
from app.domain.allocation.service import AllocationService
from app.api.dependencies import get_allocation_service, get_db, RoleChecker
from app.core.models import OfficerModel, IncidentModel, DemandRequestModel, ResourceModel, AllocationModel
from app.core.exceptions import SakshamException
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent
from pydantic import BaseModel

router = APIRouter()
publisher = EventPublisher(connection_manager)

_officer_roles = RoleChecker(["OPERATOR", "REGIONAL_AUTHORITY", "ADMIN"])

class AllocationConfirmRequest(BaseModel):
    demandId: str
    resourceId: str
    quantity: float

class AllocationConfirmResponse(BaseModel):
    allocation: AllocationResponse
    incident: IncidentResponse
    demand: DemandResponse
    resource: ResourceResponse

@router.get("", response_model=List[AllocationResponse], summary="List all resource allocations")
async def list_allocations(service: AllocationService = Depends(get_allocation_service)):
    return service.list_allocations()

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

@router.post("/confirm", response_model=AllocationConfirmResponse, summary="Atomically confirm resource match and reserve stock")
async def confirm_allocation(
    req: AllocationConfirmRequest,
    db: Session = Depends(get_db),
    current_officer: OfficerModel = Depends(_officer_roles)
):
    """
    Officer-only endpoint. Performs atomic verification and resource allocation:
    1. Verifies the caller is an authorized officer.
    2. Loads the demand request and verifies it exists.
    3. Loads the linked incident and verifies status is PRIORITIZED (AWAITING_MATCH).
    4. Loads the candidate resource and verifies availability + sufficient quantity.
    5. Creates the Allocation database record as APPROVED.
    6. Reserves the stock and updates resource status.
    7. Sets demand status to ALLOCATED.
    8. Updates incident status to MATCHED (representing RESOURCE MATCHED).
    9. Commits atomically or rolls back on any error.
    """
    # 1. Fetch demand
    demand_obj = None
    if is_valid_uuid(req.demandId):
        demand_obj = db.query(DemandRequestModel).filter(DemandRequestModel.id == req.demandId).first()
    if not demand_obj:
        demand_obj = db.query(DemandRequestModel).filter(DemandRequestModel.requestId == req.demandId).first()
    if not demand_obj:
        raise SakshamException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Demand request '{req.demandId}' not found."
        )

    # 2. Fetch incident
    incident_obj = db.query(IncidentModel).filter(IncidentModel.id == demand_obj.incidentId).first()
    if not incident_obj:
        raise SakshamException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Incident associated with this demand request not found."
        )

    # 3. Verify incident status is prioritized (AWAITING_MATCH)
    if incident_obj.status != IncidentStatus.AWAITING_MATCH:
        raise SakshamException(
            status_code=status.HTTP_409_CONFLICT,
            code="INVALID_STATE_TRANSITION",
            message=f"Incident status must be PRIORITIZED (AWAITING_MATCH) to match resources. Current status: '{incident_obj.status}'."
        )

    # 4. Fetch resource
    resource_obj = None
    if is_valid_uuid(req.resourceId):
        resource_obj = db.query(ResourceModel).filter(ResourceModel.id == req.resourceId).first()
    if not resource_obj:
        resource_obj = db.query(ResourceModel).filter(ResourceModel.resourceId == req.resourceId).first()
    if not resource_obj:
        raise SakshamException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Resource depot '{req.resourceId}' not found."
        )

    # 5. Verify availability and quantity
    available_qty = resource_obj.availableQuantity - resource_obj.reservedQuantity
    if available_qty < req.quantity:
        raise SakshamException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INSUFFICIENT_STOCK",
            message=f"Insufficient available stock. Requested: {req.quantity} {resource_obj.unit}, Available: {available_qty} {resource_obj.unit}."
        )

    try:
        # Create Allocation
        alloc_ref_id = f"ALLOC-{datetime.utcnow().year}-{uuid.uuid4().hex[:8].upper()}"
        allocation_db = AllocationModel(
            id=uuid.uuid4(),
            allocationId=alloc_ref_id,
            demandId=demand_obj.id,
            resourceId=resource_obj.id,
            vehicleId=None,
            status=AllocationStatus.APPROVED,
            matchScore=95.0,
            availabilityScore=40.0,
            distanceScore=25.0,
            priorityScore=20.0,
            compatibilityScore=10.0,
            approvedById=current_officer.id,
            approvedAt=datetime.utcnow(),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db.add(allocation_db)

        # Update resource reservation and availability
        resource_obj.reservedQuantity += req.quantity
        resource_obj.availableQuantity -= req.quantity
        if resource_obj.availableQuantity <= 0:
            resource_obj.status = ResourceStatus.DEPLETED
        elif resource_obj.availableQuantity < 50.0:
            resource_obj.status = ResourceStatus.LOW
        else:
            resource_obj.status = ResourceStatus.AVAILABLE
        resource_obj.lastUpdated = datetime.utcnow()

        # Update demand status
        demand_obj.status = DemandStatus.ALLOCATED

        # Update incident status to MATCHED (RESOURCE MATCHED)
        incident_obj.status = IncidentStatus.MATCHED
        incident_obj.updatedAt = datetime.utcnow()

        db.commit()

        db.refresh(allocation_db)
        db.refresh(resource_obj)
        db.refresh(demand_obj)
        db.refresh(incident_obj)

    except Exception as e:
        db.rollback()
        raise SakshamException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="DATABASE_ERROR",
            message=f"Atomic resource allocation commit failed: {str(e)}"
        )

    from app.repositories.postgres.utils import model_to_dict_safe
    
    # Broadcast realtime events to command rooms
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.ALLOCATION_CREATED,
                entityType="allocation",
                entityId=str(allocation_db.id),
                data=AllocationResponse.model_validate(model_to_dict_safe(allocation_db)).model_dump(mode="json"),
            )
        )
        await publisher.publish(
            RealtimeEvent(
                event=EventType.INCIDENT_STATUS_CHANGED,
                entityType="incident",
                entityId=str(incident_obj.id),
                data=IncidentResponse.model_validate(model_to_dict_safe(incident_obj)).model_dump(mode="json"),
            )
        )
    except Exception as ws_err:
        print(f"⚠️ Realtime dispatch broadcast warning: {ws_err}")

    return AllocationConfirmResponse(
        allocation=AllocationResponse.model_validate(model_to_dict_safe(allocation_db)),
        incident=IncidentResponse.model_validate(model_to_dict_safe(incident_obj)),
        demand=DemandResponse.model_validate(model_to_dict_safe(demand_obj)),
        resource=ResourceResponse.model_validate(model_to_dict_safe(resource_obj))
    )

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

