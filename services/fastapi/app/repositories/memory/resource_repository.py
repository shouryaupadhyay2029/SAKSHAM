import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.repositories.interfaces import ResourceRepositoryInterface
from app.schemas.resource import ResourceResponse, ResourceCreate, ResourceUpdate, ResourceStatus

class InMemoryResourceRepository(ResourceRepositoryInterface):
    def __init__(self):
        self._db: Dict[str, ResourceResponse] = {}
        
        # Seed RES-WT-001 (Water Depot East Delhi)
        res_id = str(uuid.uuid4())
        self._db[res_id] = ResourceResponse(
            id=res_id,
            resourceId="RES-WT-001",
            materialName="Clean Drinking Water",
            description="Emergency drinking water tanks for direct regional dispatch.",
            category="WATER",
            availableQuantity=15000.0,
            reservedQuantity=0.0,
            unit="Liters",
            storageDepot="East Delhi Relief Depot",
            location="Preet Vihar, East Delhi",
            latitude=28.6369,
            longitude=77.2912,
            status=ResourceStatus.AVAILABLE,
            pointOfContact="Inspector A. K. Sharma (NDRF)",
            lastUpdated=datetime.now(),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )

        # Seed RES-MD-001 (Medical Supply Central)
        res_id2 = str(uuid.uuid4())
        self._db[res_id2] = ResourceResponse(
            id=res_id2,
            resourceId="RES-MD-001",
            materialName="Emergency Trauma Kits",
            description="First aid and trauma survival supply kits.",
            category="MEDICAL",
            availableQuantity=120.0,
            reservedQuantity=0.0,
            unit="Kits",
            storageDepot="Central Delhi Health Hub",
            location="Connaught Place, Central Delhi",
            latitude=28.6304,
            longitude=77.2177,
            status=ResourceStatus.AVAILABLE,
            pointOfContact="Dr. Neha Gupta (Civil Defence)",
            lastUpdated=datetime.now(),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )

    def get_by_id(self, resource_id: str) -> Optional[ResourceResponse]:
        return self._db.get(resource_id)

    def get_by_ref(self, ref: str) -> Optional[ResourceResponse]:
        for res in self._db.values():
            if res.resourceId == ref:
                return res
        return None

    def list(self, category: Optional[str] = None) -> List[ResourceResponse]:
        results = list(self._db.values())
        if category:
            results = [r for r in results if r.category == category]
        return results

    def create(self, resource: ResourceCreate) -> ResourceResponse:
        res_id = str(uuid.uuid4())
        new_res = ResourceResponse(
            id=res_id,
            resourceId=f"RES-{resource.category[:2].upper()}-{len(self._db) + 1:03d}",
            status=ResourceStatus.AVAILABLE,
            lastUpdated=datetime.now(),
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
            **resource.model_dump()
        )
        self._db[res_id] = new_res
        return new_res

    def update(self, resource_id: str, update_data: ResourceUpdate) -> Optional[ResourceResponse]:
        if resource_id not in self._db:
            return None
        
        existing = self._db[resource_id]
        updated_dict = existing.model_dump()
        
        for k, v in update_data.model_dump(exclude_unset=True).items():
            updated_dict[k] = v
            
        # Recalculate status based on quantities
        avail = updated_dict["availableQuantity"]
        res = updated_dict["reservedQuantity"]
        if avail - res <= 0:
            updated_dict["status"] = ResourceStatus.DEPLETED
        elif res > 0 and avail - res > 0:
            updated_dict["status"] = ResourceStatus.LOW
        else:
            updated_dict["status"] = ResourceStatus.AVAILABLE

        updated_dict["lastUpdated"] = datetime.now()
        updated_dict["updatedAt"] = datetime.now()
        updated = ResourceResponse(**updated_dict)
        self._db[resource_id] = updated
        return updated

# Global singleton repository
resource_repo = InMemoryResourceRepository()
