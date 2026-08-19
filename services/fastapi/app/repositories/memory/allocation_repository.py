import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.repositories.interfaces import AllocationRepositoryInterface
from app.schemas.allocation import AllocationResponse, AllocationStatus

class InMemoryAllocationRepository(AllocationRepositoryInterface):
    def __init__(self):
        self._db: Dict[str, AllocationResponse] = {}

    def get_by_id(self, allocation_id: str) -> Optional[AllocationResponse]:
        return self._db.get(allocation_id)

    def get_by_ref(self, ref: str) -> Optional[AllocationResponse]:
        for alloc in self._db.values():
            if alloc.allocationId == ref:
                return alloc
        return None

    def list(self) -> List[AllocationResponse]:
        return list(self._db.values())

    def create(self, demand_id: str, resource_id: str, scores: dict) -> AllocationResponse:
        alloc_id = str(uuid.uuid4())
        ref_id = f"ALL-2026-{len(self._db) + 1:03d}"
        
        new_alloc = AllocationResponse(
            id=alloc_id,
            allocationId=ref_id,
            demandId=demand_id,
            resourceId=resource_id,
            vehicleId=None,
            matchScore=scores.get("matchScore", 1.0),
            availabilityScore=scores.get("availabilityScore", 1.0),
            distanceScore=scores.get("distanceScore", 1.0),
            priorityScore=scores.get("priorityScore", 1.0),
            compatibilityScore=scores.get("compatibilityScore", 1.0),
            status=AllocationStatus.RECOMMENDED,
            approvedById=None,
            approvedAt=None,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        self._db[alloc_id] = new_alloc
        return new_alloc

    def update_status(self, allocation_id: str, status: AllocationStatus, approved_by_id: Optional[str] = None) -> Optional[AllocationResponse]:
        if allocation_id not in self._db:
            return None
        
        alloc = self._db[allocation_id]
        updated_dict = alloc.model_dump()
        updated_dict["status"] = status
        
        if status == AllocationStatus.APPROVED:
            updated_dict["approvedById"] = approved_by_id or str(uuid.uuid4())
            updated_dict["approvedAt"] = datetime.now()
            
        updated_dict["updatedAt"] = datetime.now()
        updated = AllocationResponse(**updated_dict)
        self._db[allocation_id] = updated
        return updated

# Global singleton repository
allocation_repo = InMemoryAllocationRepository()
