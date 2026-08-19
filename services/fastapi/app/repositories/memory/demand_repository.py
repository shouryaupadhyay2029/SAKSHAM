import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.repositories.interfaces import DemandRepositoryInterface
from app.repositories.memory.incident_repository import incident_repo
from app.schemas.demand import DemandResponse, DemandCreate, DemandUpdate, DemandStatus, DemandPriority

class InMemoryDemandRepository(DemandRepositoryInterface):
    def __init__(self):
        self._db: Dict[str, DemandResponse] = {}
        
        # Link to seeded incident
        incident = incident_repo.get_by_ref("INC-2026-081")
        incident_id = incident.id if incident else str(uuid.uuid4())
        
        # Seed REQ-DEL-101
        dem_id = str(uuid.uuid4())
        self._db[dem_id] = DemandResponse(
            id=dem_id,
            requestId="REQ-DEL-101",
            incidentId=incident_id,
            affectedZone="Yamuna Bank Metro Station",
            requestedType="WATER",
            description="Clean drinking water for stranded passengers and local shelter point.",
            quantity=12000.0,
            unit="Liters",
            affectedPeople=800,
            priority=DemandPriority.CRITICAL,
            status=DemandStatus.PENDING,
            requiredBy=datetime.now(),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )

        # Seed REQ-DEL-102
        dem_id2 = str(uuid.uuid4())
        self._db[dem_id2] = DemandResponse(
            id=dem_id2,
            requestId="REQ-DEL-102",
            incidentId=incident_id,
            affectedZone="Yamuna Bank Residential Block C",
            requestedType="MEDICAL",
            description="Emergency medical kits and basic trauma supplies for first-aid post.",
            quantity=100.0,
            unit="Kits",
            affectedPeople=350,
            priority=DemandPriority.HIGH,
            status=DemandStatus.PENDING,
            requiredBy=datetime.now(),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )

    def get_by_id(self, demand_id: str) -> Optional[DemandResponse]:
        return self._db.get(demand_id)

    def get_by_ref(self, ref: str) -> Optional[DemandResponse]:
        for dem in self._db.values():
            if dem.requestId == ref:
                return dem
        return None

    def list(self, incident_id: Optional[str] = None) -> List[DemandResponse]:
        results = list(self._db.values())
        if incident_id:
            results = [r for r in results if r.incidentId == incident_id]
        return results

    def create(self, demand: DemandCreate) -> DemandResponse:
        dem_id = str(uuid.uuid4())
        new_dem = DemandResponse(
            id=dem_id,
            requestId=f"REQ-DEL-{len(self._db) + 101:03d}",
            status=DemandStatus.PENDING,
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
            **demand.model_dump()
        )
        self._db[dem_id] = new_dem
        return new_dem

    def update(self, demand_id: str, update_data: DemandUpdate) -> Optional[DemandResponse]:
        if demand_id not in self._db:
            return None
        
        existing = self._db[demand_id]
        updated_dict = existing.model_dump()
        
        for k, v in update_data.model_dump(exclude_unset=True).items():
            updated_dict[k] = v
            
        updated_dict["updatedAt"] = datetime.now()
        updated = DemandResponse(**updated_dict)
        self._db[demand_id] = updated
        return updated

# Global singleton repository
demand_repo = InMemoryDemandRepository()
