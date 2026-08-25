import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.interfaces import IncidentRepositoryInterface
from app.core.models import IncidentModel
from app.schemas.incident import IncidentResponse, IncidentCreate, IncidentUpdate
from app.repositories.postgres.utils import model_to_dict_safe

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

DB_STATUS_MAP = {
    "AWAITING_MATCH": "AWAITING_RESPONSE",
    "AWAITING_RESPONSE": "AWAITING_RESPONSE",
    "MATCHED": "AWAITING_RESPONSE",
    "DISPATCHED": "UNDER_RESPONSE",
    "UNDER_RESPONSE": "UNDER_RESPONSE",
    "RESOLVED": "RESOLVED",
    "REPORTED": "REPORTED",
    "VERIFIED": "VERIFIED",
    "CANCELLED": "RESOLVED"
}

class SqlAlchemyIncidentRepository(IncidentRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, incident_id: str) -> Optional[IncidentResponse]:
        if not is_valid_uuid(incident_id):
            return self.get_by_ref(incident_id)
        incident = self.db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
        if not incident:
            return None
        return IncidentResponse.model_validate(model_to_dict_safe(incident))

    def get_by_ref(self, ref: str) -> Optional[IncidentResponse]:
        incident = self.db.query(IncidentModel).filter(IncidentModel.incidentId == ref).first()
        if not incident:
            return None
        return IncidentResponse.model_validate(model_to_dict_safe(incident))

    def list(self) -> List[IncidentResponse]:
        incidents = self.db.query(IncidentModel).order_by(IncidentModel.incidentId.asc()).all()
        return [IncidentResponse.model_validate(model_to_dict_safe(inc)) for inc in incidents]

    def create(self, incident: IncidentCreate) -> IncidentResponse:
        count = self.db.query(IncidentModel).count()
        ref_id = f"INC-2026-{count + 1:03d}"
        
        status_val = getattr(incident, "status", None)
        status_str = status_val.value if status_val else "REPORTED"
        db_status = DB_STATUS_MAP.get(status_str, "REPORTED")

        db_obj = IncidentModel(
            incidentId=ref_id,
            type=incident.type,
            title=incident.title,
            description=incident.description,
            location=incident.location,
            latitude=incident.latitude,
            longitude=incident.longitude,
            region=incident.region,
            severity=incident.severity.value,
            status=db_status,
            affectedPeople=incident.affectedPeople or 0,
            displacedPeople=incident.displacedPeople or 0,
            assignedUnit=incident.assignedUnit
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return IncidentResponse.model_validate(model_to_dict_safe(db_obj))

    def update(self, incident_id: str, update_data: IncidentUpdate) -> Optional[IncidentResponse]:
        db_obj = None
        if is_valid_uuid(incident_id):
            db_obj = self.db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
        if not db_obj:
            db_obj = self.db.query(IncidentModel).filter(IncidentModel.incidentId == incident_id).first()
        if not db_obj:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if value is not None:
                if key == "status":
                    status_str = value.value if hasattr(value, "value") else str(value)
                    db_status = DB_STATUS_MAP.get(status_str, "REPORTED")
                    setattr(db_obj, key, db_status)
                elif hasattr(value, "value"):
                    setattr(db_obj, key, value.value)
                else:
                    setattr(db_obj, key, value)
                
        self.db.commit()
        self.db.refresh(db_obj)
        return IncidentResponse.model_validate(model_to_dict_safe(db_obj))
