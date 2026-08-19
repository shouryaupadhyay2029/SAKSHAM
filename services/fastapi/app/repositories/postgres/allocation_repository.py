import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.interfaces import AllocationRepositoryInterface
from app.core.models import AllocationModel
from app.schemas.allocation import AllocationResponse, AllocationStatus
from app.repositories.postgres.utils import model_to_dict_safe

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

class SqlAlchemyAllocationRepository(AllocationRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, allocation_id: str) -> Optional[AllocationResponse]:
        if not is_valid_uuid(allocation_id):
            return self.get_by_ref(allocation_id)
        alloc = self.db.query(AllocationModel).filter(AllocationModel.id == allocation_id).first()
        if not alloc:
            return None
        return AllocationResponse.model_validate(model_to_dict_safe(alloc))

    def get_by_ref(self, ref: str) -> Optional[AllocationResponse]:
        alloc = self.db.query(AllocationModel).filter(AllocationModel.allocationId == ref).first()
        if not alloc:
            return None
        return AllocationResponse.model_validate(model_to_dict_safe(alloc))

    def list(self) -> List[AllocationResponse]:
        allocs = self.db.query(AllocationModel).order_by(AllocationModel.allocationId.asc()).all()
        return [AllocationResponse.model_validate(model_to_dict_safe(a)) for a in allocs]

    def create(self, demand_id: str, resource_id: str, scores: dict) -> AllocationResponse:
        count = self.db.query(AllocationModel).count()
        ref_id = f"ALL-2026-{count + 1:03d}"
        
        resolved_demand_id = demand_id
        resolved_resource_id = resource_id
        
        if not is_valid_uuid(demand_id):
            from app.core.models import DemandRequestModel
            d = self.db.query(DemandRequestModel).filter(DemandRequestModel.requestId == demand_id).first()
            if d:
                resolved_demand_id = str(d.id)
                
        if not is_valid_uuid(resource_id):
            from app.core.models import ResourceModel
            r = self.db.query(ResourceModel).filter(ResourceModel.resourceId == resource_id).first()
            if r:
                resolved_resource_id = str(r.id)

        db_obj = AllocationModel(
            demandId=resolved_demand_id,
            resourceId=resolved_resource_id,
            allocationId=ref_id,
            matchScore=scores.get("matchScore", 1.0),
            availabilityScore=scores.get("availabilityScore", 1.0),
            distanceScore=scores.get("distanceScore", 1.0),
            priorityScore=scores.get("priorityScore", 1.0),
            compatibilityScore=scores.get("compatibilityScore", 1.0),
            status="RECOMMENDED"
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return AllocationResponse.model_validate(model_to_dict_safe(db_obj))

    def update_status(self, allocation_id: str, status: AllocationStatus, approved_by_id: Optional[str] = None) -> Optional[AllocationResponse]:
        from app.core.models import OfficerModel
        db_obj = None
        if is_valid_uuid(allocation_id):
            db_obj = self.db.query(AllocationModel).filter(AllocationModel.id == allocation_id).first()
        if not db_obj:
            db_obj = self.db.query(AllocationModel).filter(AllocationModel.allocationId == allocation_id).first()
        if not db_obj:
            return None
        
        db_obj.status = status.value
        if status == AllocationStatus.APPROVED:
            db_obj.approvedById = approved_by_id or str(self.db.query(OfficerModel).first().id)
            db_obj.approvedAt = datetime.utcnow()
            
        db_obj.updatedAt = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_obj)
        return AllocationResponse.model_validate(model_to_dict_safe(db_obj))
