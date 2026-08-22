from typing import List, Optional, Any
from datetime import datetime
from app.repositories.interfaces import (
    DeliveryRepositoryInterface,
    DispatchRepositoryInterface,
    AllocationRepositoryInterface,
    VehicleRepositoryInterface,
    ResourceRepositoryInterface,
    DemandRepositoryInterface,
    IncidentRepositoryInterface
)
from app.schemas.delivery import DeliveryResponse, DeliveryCreate, DeliveryStatus
from app.domain.delivery.state_machine import is_valid_delivery_transition
from app.core.exceptions import EntityNotFoundException, InvalidStateTransitionException, ValidationException, SakshamException
from app.utils.events import EventPublisher
from app.schemas.resource import ResourceUpdate
from app.schemas.demand import DemandUpdate, DemandStatus
from app.schemas.allocation import AllocationStatus
from app.schemas.dispatch import DispatchStatus
from fastapi import status

class DeliveryService:
    def __init__(
        self,
        delivery_repo: DeliveryRepositoryInterface,
        dispatch_repo: DispatchRepositoryInterface,
        allocation_repo: AllocationRepositoryInterface,
        vehicle_repo: VehicleRepositoryInterface,
        resource_repo: ResourceRepositoryInterface,
        demand_repo: DemandRepositoryInterface,
        incident_repo: Optional[IncidentRepositoryInterface] = None
    ):
        self.delivery_repo = delivery_repo
        self.dispatch_repo = dispatch_repo
        self.allocation_repo = allocation_repo
        self.vehicle_repo = vehicle_repo
        self.resource_repo = resource_repo
        self.demand_repo = demand_repo
        self.incident_repo = incident_repo

    def get_delivery(self, delivery_id: str) -> DeliveryResponse:
        delv = self.delivery_repo.get_by_id(delivery_id)
        if not delv:
            delv = self.delivery_repo.get_by_ref(delivery_id)
            if not delv:
                raise EntityNotFoundException("Delivery", delivery_id)
        return delv

    def list_deliveries(self, status: Optional[str] = None, dispatch_id: Optional[str] = None, allocation_id: Optional[str] = None, incident_id: Optional[str] = None, region: Optional[str] = None, priority: Optional[str] = None) -> List[DeliveryResponse]:
        return self.delivery_repo.list(
            status=status, 
            dispatch_id=dispatch_id, 
            allocation_id=allocation_id, 
            incident_id=incident_id, 
            region=region, 
            priority=priority
        )

    def _verify_region(self, officer: Any, incident_id: str):
        if not officer or not officer.region:
            return
        
        region_lower = officer.region.strip().lower()
        if region_lower == "national" or not region_lower:
            return
            
        if self.incident_repo:
            incident = self.incident_repo.get_by_id(incident_id)
            if incident and incident.region.strip().lower() != region_lower:
                raise SakshamException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    code="FORBIDDEN",
                    message=f"Access denied. Operational record belongs to region '{incident.region}' which is outside your jurisdiction '{officer.region}'."
                )

    def create_delivery(self, delivery: DeliveryCreate, officer: Optional[Any] = None) -> DeliveryResponse:
        # 1. Validate Dispatch exists
        dispatch = self.dispatch_repo.get_by_id(delivery.dispatchId)
        if not dispatch:
            dispatch = self.dispatch_repo.get_by_ref(delivery.dispatchId)
            if not dispatch:
                raise EntityNotFoundException("Dispatch", delivery.dispatchId)

        # 2. Dispatch status must be valid (must have arrived/completed or dispatched to create)
        if dispatch.status not in [DispatchStatus.ARRIVED, DispatchStatus.COMPLETED, DispatchStatus.DISPATCHED]:
            raise ValidationException(f"Cannot start delivery execution for dispatch in status '{dispatch.status.value}'.")

        # 3. Retrieve and validate Allocation
        alloc = self.allocation_repo.get_by_id(dispatch.allocationId)
        if not alloc:
            raise ValidationException("Associated Allocation details are incomplete.")

        # 4. Retrieve and validate Demand and Resource
        demand = self.demand_repo.get_by_id(alloc.demandId)
        resource = self.resource_repo.get_by_id(alloc.resourceId)
        if not demand or not resource:
            raise ValidationException("Associated Demand or Resource details are incomplete.")

        # 5. Check regional authorization
        self._verify_region(officer, demand.incidentId)

        # 6. Validate quantities: delivered quantity cannot exceed dispatched quantity
        dispatch_qty = dispatch.quantity if dispatch.quantity is not None else alloc.quantity
        if delivery.quantity > dispatch_qty:
            raise ValidationException(f"Delivery quantity ({delivery.quantity}) cannot exceed dispatched quantity ({dispatch_qty}).")

        # 7. Create delivery record
        new_delv = self.delivery_repo.create(delivery)
        
        EventPublisher.publish("DELIVERY_CREATED", {"deliveryId": new_delv.deliveryId, "dispatchId": dispatch.id})
        return new_delv

    def update_delivery_status(self, delivery_id: str, next_status: DeliveryStatus, officer: Optional[Any] = None, received_by: Optional[str] = None, confirmation: Optional[str] = None, notes: Optional[str] = None) -> DeliveryResponse:
        existing = self.get_delivery(delivery_id)

        # Check state transitions
        if not is_valid_delivery_transition(existing.status, next_status):
            raise InvalidStateTransitionException(
                f"Delivery cannot transition from '{existing.status.value}' to '{next_status.value}'."
            )

        # Retrieve incident region for authorization check
        dispatch = self.dispatch_repo.get_by_id(existing.dispatchId)
        if dispatch:
            alloc = self.allocation_repo.get_by_id(dispatch.allocationId)
            if alloc:
                demand = self.demand_repo.get_by_id(alloc.demandId)
                if demand:
                    self._verify_region(officer, demand.incidentId)

        # Update status
        delivered_at = datetime.utcnow() if next_status == DeliveryStatus.DELIVERED else None
        updated = self.delivery_repo.update_status(
            existing.id, 
            next_status, 
            received_by=received_by, 
            confirmation=confirmation, 
            notes=notes,
            delivered_at=delivered_at
        )
        if not updated:
            raise EntityNotFoundException("Delivery", delivery_id)

        EventPublisher.publish("DELIVERY_STATUS_CHANGED", {"deliveryId": updated.deliveryId, "status": next_status.value})
        
        if next_status == DeliveryStatus.CANCELLED:
            EventPublisher.publish("DELIVERY_CANCELLED", {"deliveryId": updated.deliveryId})
        elif next_status == DeliveryStatus.FAILED:
            EventPublisher.publish("DELIVERY_FAILED", {"deliveryId": updated.deliveryId})

        return updated

    def verify_delivery(self, delivery_id: str, quantity: float, notes: Optional[str] = None, recipient_name: Optional[str] = None, officer: Optional[Any] = None) -> DeliveryResponse:
        existing = self.get_delivery(delivery_id)

        # Can verify if state is ARRIVED, DELIVERED or VERIFIED
        if existing.status not in [DeliveryStatus.ARRIVED, DeliveryStatus.DELIVERED, DeliveryStatus.PENDING, DeliveryStatus.VERIFIED]:
            raise ValidationException(f"Cannot verify delivery in status '{existing.status.value}'.")

        # Validate quantities: verified quantity cannot exceed dispatch quantity
        dispatch = self.dispatch_repo.get_by_id(existing.dispatchId)
        if not dispatch:
            raise ValidationException("Associated Dispatch not found.")

        alloc = self.allocation_repo.get_by_id(dispatch.allocationId)
        dispatch_qty = dispatch.quantity
        if dispatch_qty is None:
            if alloc:
                demand = self.demand_repo.get_by_id(alloc.demandId)
                dispatch_qty = demand.quantity if demand else None

        if dispatch_qty is not None and quantity > dispatch_qty:
            raise ValidationException(f"Verified quantity ({quantity}) cannot exceed dispatched quantity ({dispatch_qty}).")

        # Check regional authorization
        alloc = self.allocation_repo.get_by_id(dispatch.allocationId)
        if alloc:
            demand = self.demand_repo.get_by_id(alloc.demandId)
            if demand:
                self._verify_region(officer, demand.incidentId)

        # Save verification details and transition status to VERIFIED
        self.delivery_repo.update_status(
            existing.id,
            DeliveryStatus.VERIFIED,
            received_by=recipient_name or existing.receivedBy,
            confirmation=f"VERIFIED_BY_{officer.name.upper() if officer else 'OFFICER'}",
            notes=notes or existing.notes
        )
        # Update quantity in db directly
        db_session = self.delivery_repo.db
        from app.core.models import DeliveryModel
        db_obj = db_session.query(DeliveryModel).filter(DeliveryModel.id == existing.id).first()
        if db_obj:
            db_obj.quantity = quantity
            db_session.commit()

        updated = self.get_delivery(existing.id)
        EventPublisher.publish("DELIVERY_VERIFIED", {"deliveryId": updated.deliveryId, "verifiedQuantity": quantity})
        return updated

    def complete_delivery(self, delivery_id: str, officer: Optional[Any] = None) -> DeliveryResponse:
        existing = self.get_delivery(delivery_id)

        # 1. Must be verified first
        if existing.status != DeliveryStatus.VERIFIED:
            raise ValidationException("Delivery must be verified before completion.")

        db_session = self.delivery_repo.db
        
        # Start transactional block
        try:
            # 2. Retrieve all operational records
            dispatch = self.dispatch_repo.get_by_id(existing.dispatchId)
            if not dispatch:
                raise ValidationException("Associated Dispatch not found.")

            alloc = self.allocation_repo.get_by_id(dispatch.allocationId)
            if not alloc:
                raise ValidationException("Associated Allocation not found.")

            demand = self.demand_repo.get_by_id(alloc.demandId)
            resource = self.resource_repo.get_by_id(alloc.resourceId)
            if not demand or not resource:
                raise ValidationException("Associated Demand or Resource details are incomplete.")

            # 3. Check regional authorization
            self._verify_region(officer, demand.incidentId)

            import uuid
            # 4. Atomically update resource inventory / reservation quantities
            from app.core.models import ResourceModel
            db_res = db_session.query(ResourceModel).filter(ResourceModel.id == uuid.UUID(resource.id)).first()
            if db_res:
                delivered_qty = existing.quantity
                
                # Reduce inventory availability by delivered quantity
                db_res.availableQuantity = max(0.0, db_res.availableQuantity - delivered_qty)
                # Reduce reserved quantity by allocated quantity to release the reservation
                db_res.reservedQuantity = max(0.0, db_res.reservedQuantity - demand.quantity)
                db_res.lastUpdated = datetime.utcnow()

            # 5. Update demand status (FULFILLED if fully delivered, otherwise stays ALLOCATED)
            from app.core.models import DemandRequestModel
            db_dem = db_session.query(DemandRequestModel).filter(DemandRequestModel.id == uuid.UUID(demand.id)).first()
            if db_dem:
                if existing.quantity >= demand.quantity * 0.95: # 95% threshold for full fulfillment
                    db_dem.status = "FULFILLED"
                else:
                    db_dem.status = "PENDING" # Return back to pending if partially delivered

            # 6. Update vehicle status to AVAILABLE and release mission
            from app.core.models import VehicleModel
            if dispatch.vehicleId:
                db_veh = db_session.query(VehicleModel).filter(VehicleModel.id == uuid.UUID(dispatch.vehicleId)).first()
                if db_veh:
                    db_veh.status = "AVAILABLE"
                    db_veh.currentMission = None

            # 7. Update status columns
            from app.core.models import AllocationModel, DispatchModel, DeliveryModel
            db_alloc = db_session.query(AllocationModel).filter(AllocationModel.id == uuid.UUID(alloc.id)).first()
            if db_alloc:
                db_alloc.status = "COMPLETED"
                
            db_disp = db_session.query(DispatchModel).filter(DispatchModel.id == uuid.UUID(dispatch.id)).first()
            if db_disp:
                db_disp.status = "COMPLETED"
                db_disp.completionTime = datetime.utcnow()

            db_delv = db_session.query(DeliveryModel).filter(DeliveryModel.id == uuid.UUID(existing.id)).first()
            if db_delv:
                from app.repositories.postgres.delivery_repository import COERCION_MAP
                db_delv.status = COERCION_MAP.get(DeliveryStatus.COMPLETED, "DELIVERED")
                db_delv.confirmation = f"RICH_STATUS:{DeliveryStatus.COMPLETED.value}"
                db_delv.deliveredAt = datetime.utcnow()

            db_session.commit()
            
            updated = self.get_delivery(existing.id)
            EventPublisher.publish("DELIVERY_COMPLETED", {"deliveryId": updated.deliveryId})
            return updated

        except Exception as e:
            db_session.rollback()
            raise e
