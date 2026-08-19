import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.repositories.interfaces import IncidentRepositoryInterface
from app.schemas.incident import IncidentResponse, IncidentCreate, IncidentUpdate, IncidentStatus
from app.schemas.common import Severity

class InMemoryIncidentRepository(IncidentRepositoryInterface):
    def __init__(self):
        # Seed with initial SAKSHAM incident data
        self._db: Dict[str, IncidentResponse] = {}
        
        # Seed INC-2026-081
        inc_id = str(uuid.uuid4())
        self._db[inc_id] = IncidentResponse(
            id=inc_id,
            incidentId="INC-2026-081",
            title="Yamuna Bank Water Logging",
            description="Severe water logging reported at Yamuna Bank metro station and low-lying residential areas.",
            type="FLOOD",
            location="Yamuna Bank, East Delhi",
            latitude=28.6212,
            longitude=77.2684,
            region="East Delhi",
            severity=Severity.CRITICAL,
            status=IncidentStatus.REPORTED,
            affectedPeople=1200,
            displacedPeople=350,
            assignedUnit="NDRF Team 4",
            reportedAt=datetime.now(),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )

    def get_by_id(self, incident_id: str) -> Optional[IncidentResponse]:
        return self._db.get(incident_id)

    def get_by_ref(self, ref: str) -> Optional[IncidentResponse]:
        for inc in self._db.values():
            if inc.incidentId == ref:
                return inc
        return None

    def list(self) -> List[IncidentResponse]:
        return list(self._db.values())

    def create(self, incident: IncidentCreate) -> IncidentResponse:
        inc_id = str(uuid.uuid4())
        new_inc = IncidentResponse(
            id=inc_id,
            incidentId=f"INC-2026-{len(self._db) + 81:03d}",
            status=IncidentStatus.REPORTED,
            reportedAt=datetime.now(),
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
            **incident.model_dump()
        )
        self._db[inc_id] = new_inc
        return new_inc

    def update(self, incident_id: str, update_data: IncidentUpdate) -> Optional[IncidentResponse]:
        if incident_id not in self._db:
            return None
        
        existing = self._db[incident_id]
        updated_dict = existing.model_dump()
        
        for k, v in update_data.model_dump(exclude_unset=True).items():
            updated_dict[k] = v
            
        updated_dict["updatedAt"] = datetime.now()
        updated = IncidentResponse(**updated_dict)
        self._db[incident_id] = updated
        return updated

# Global singleton repository for in-memory use
incident_repo = InMemoryIncidentRepository()
