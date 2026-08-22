import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.interfaces import DemandRepositoryInterface
from app.core.models import DemandRequestModel
from app.schemas.demand import DemandResponse, DemandCreate, DemandUpdate
from app.repositories.postgres.utils import model_to_dict_safe

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

class SqlAlchemyDemandRepository(DemandRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, demand_id: str) -> Optional[DemandResponse]:
        if not is_valid_uuid(demand_id):
            return self.get_by_ref(demand_id)
        demand = self.db.query(DemandRequestModel).filter(DemandRequestModel.id == demand_id).first()
        if not demand:
            return None
        return DemandResponse.model_validate(model_to_dict_safe(demand))

    def get_by_ref(self, ref: str) -> Optional[DemandResponse]:
        demand = self.db.query(DemandRequestModel).filter(DemandRequestModel.requestId == ref).first()
        if not demand:
            return None
        return DemandResponse.model_validate(model_to_dict_safe(demand))

    def list(self, incident_id: Optional[str] = None) -> List[DemandResponse]:
        query = self.db.query(DemandRequestModel)
        if incident_id:
            if is_valid_uuid(incident_id):
                query = query.filter(DemandRequestModel.incidentId == incident_id)
            else:
                from app.core.models import IncidentModel
                query = query.join(IncidentModel).filter(IncidentModel.incidentId == incident_id)
        demands = query.order_by(DemandRequestModel.requestId.asc()).all()
        return [DemandResponse.model_validate(model_to_dict_safe(d)) for d in demands]

    def create(self, demand: DemandCreate) -> DemandResponse:
        count = self.db.query(DemandRequestModel).count()
        ref_id = f"REQ-DEL-{count + 101:03d}"
        
        resolved_incident_id = demand.incidentId
        if not is_valid_uuid(demand.incidentId):
            from app.core.models import IncidentModel
            inc = self.db.query(IncidentModel).filter(IncidentModel.incidentId == demand.incidentId).first()
            if inc:
                resolved_incident_id = str(inc.id)
                
        db_obj = DemandRequestModel(
            requestId=ref_id,
            incidentId=resolved_incident_id,
            affectedZone=demand.affectedZone,
            requestedType=demand.requestedType,
            description=demand.description,
            quantity=demand.quantity,
            unit=demand.unit,
            affectedPeople=demand.affectedPeople or 0,
            priority=demand.priority.value,
            status=getattr(demand, "status").value if getattr(demand, "status", None) else "PENDING",
            requiredBy=demand.requiredBy
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return DemandResponse.model_validate(model_to_dict_safe(db_obj))

    def update(self, demand_id: str, update_data: DemandUpdate) -> Optional[DemandResponse]:
        db_obj = None
        if is_valid_uuid(demand_id):
            db_obj = self.db.query(DemandRequestModel).filter(DemandRequestModel.id == demand_id).first()
        if not db_obj:
            db_obj = self.db.query(DemandRequestModel).filter(DemandRequestModel.requestId == demand_id).first()
        if not db_obj:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if value is not None:
                if hasattr(value, "value"):
                    setattr(db_obj, key, value.value)
                else:
                    setattr(db_obj, key, value)
                
        self.db.commit()
        self.db.refresh(db_obj)
        return DemandResponse.model_validate(model_to_dict_safe(db_obj))
