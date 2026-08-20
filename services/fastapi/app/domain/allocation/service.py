from typing import List, Optional
from app.repositories.interfaces import AllocationRepositoryInterface, DemandRepositoryInterface, ResourceRepositoryInterface
from app.schemas.allocation import AllocationResponse, AllocationCreate, AllocationStatus, AllocationStatusUpdate
from app.domain.allocation.state_machine import is_valid_allocation_transition
from app.core.exceptions import EntityNotFoundException, InvalidStateTransitionException, ValidationException
from app.schemas.resource import ResourceUpdate
from app.schemas.demand import DemandUpdate, DemandStatus

class AllocationService:
    def __init__(
        self,
        allocation_repo: AllocationRepositoryInterface,
        demand_repo: DemandRepositoryInterface,
        resource_repo: ResourceRepositoryInterface
    ):
        self.allocation_repo = allocation_repo
        self.demand_repo = demand_repo
        self.resource_repo = resource_repo

    def get_allocation(self, allocation_id: str) -> AllocationResponse:
        alloc = self.allocation_repo.get_by_id(allocation_id)
        if not alloc:
            alloc = self.allocation_repo.get_by_ref(allocation_id)
            if not alloc:
                raise EntityNotFoundException("Allocation", allocation_id)
        return alloc

    def list_allocations(self) -> List[AllocationResponse]:
        return self.allocation_repo.list()

    def create_allocation(self, allocation: AllocationCreate) -> AllocationResponse:
        # Check demand and resource exist
        demand = self.demand_repo.get_by_id(allocation.demandId)
        if not demand:
            demand = self.demand_repo.get_by_ref(allocation.demandId)
            if not demand:
                raise EntityNotFoundException("DemandRequest", allocation.demandId)
                
        resource = self.resource_repo.get_by_id(allocation.resourceId)
        if not resource:
            resource = self.resource_repo.get_by_ref(allocation.resourceId)
            if not resource:
                raise EntityNotFoundException("Resource", allocation.resourceId)

        # Check availability
        available = resource.availableQuantity - resource.reservedQuantity
        if available < allocation.quantity:
            raise ValidationException(
                f"Insufficient resource quantity. Requested: {allocation.quantity}, Available: {available}."
            )

        # Default placeholder scores (matching will fill real ones or we use defaults)
        scores = {
            "matchScore": 85.0,
            "availabilityScore": 25.0,
            "distanceScore": 15.0,
            "priorityScore": 10.0,
            "compatibilityScore": 35.0
        }

        # Create allocation in memory
        new_alloc = self.allocation_repo.create(demand.id, resource.id, scores)
        
        # Reserve the quantity (transition PENDING_APPROVAL / RECOMMENDED)
        self.resource_repo.update(
            resource.id, 
            ResourceUpdate(reservedQuantity=resource.reservedQuantity + allocation.quantity)
        )
        
        # Update demand state
        self.demand_repo.update(
            demand.id,
            DemandUpdate(status=DemandStatus.AWAITING_MATCH)
        )

        return new_alloc

    def update_allocation_status(self, allocation_id: str, update_data: AllocationStatusUpdate) -> AllocationResponse:
        existing = self.get_allocation(allocation_id)
        new_status = update_data.status

        if not is_valid_allocation_transition(existing.status, new_status):
            raise InvalidStateTransitionException(
                f"Allocation cannot transition from '{existing.status.value}' to '{new_status.value}'."
            )

        # Handle side effects of status transitions
        # APPROVED: keep reservation, update demand status to ALLOCATED
        # REJECTED or CANCELLED: release reservation, update demand status back to PENDING/AWAITING_MATCH
        demand = self.demand_repo.get_by_id(existing.demandId)
        resource = self.resource_repo.get_by_id(existing.resourceId)

        if new_status == AllocationStatus.APPROVED:
            if demand:
                self.demand_repo.update(demand.id, DemandUpdate(status=DemandStatus.ALLOCATED))
        elif new_status in [AllocationStatus.REJECTED, AllocationStatus.CANCELLED]:
            # Release reservation if it was reserved
            if resource:
                # Find demand to subtract correct quantity
                qty_to_release = demand.quantity if demand else 0.0
                new_reserved = max(0.0, resource.reservedQuantity - qty_to_release)
                self.resource_repo.update(resource.id, ResourceUpdate(reservedQuantity=new_reserved))
            if demand and new_status == AllocationStatus.CANCELLED:
                self.demand_repo.update(demand.id, DemandUpdate(status=DemandStatus.PENDING))

        updated = self.allocation_repo.update_status(existing.id, new_status)
        if not updated:
            raise EntityNotFoundException("Allocation", allocation_id)
        return updated
