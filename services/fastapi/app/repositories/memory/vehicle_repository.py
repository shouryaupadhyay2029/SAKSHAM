import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.repositories.interfaces import VehicleRepositoryInterface
from app.schemas.vehicle import VehicleResponse, VehicleCreate, VehicleUpdate, VehicleStatus

class InMemoryVehicleRepository(VehicleRepositoryInterface):
    def __init__(self):
        self._db: Dict[str, VehicleResponse] = {}
        
        # Seed VEH-BT-401 (NDRF Rescue Boat)
        veh_id = str(uuid.uuid4())
        self._db[veh_id] = VehicleResponse(
            id=veh_id,
            vehicleId="VEH-BT-401",
            name="NDRF Rescue Boat 12",
            type="Boat",
            capacity=15000.0,
            capacityUnit="Liters", # Compatible with water cargo
            currentLatitude=28.6369, # Stationed near East Delhi depot
            currentLongitude=77.2912,
            speed=22.5,
            operatorName="Sgt. Ramesh Singh",
            contactRadio="NDRF-CH-16",
            status=VehicleStatus.AVAILABLE,
            currentMission=None,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )

        # Seed VEH-AM-302 (Ambulance)
        veh_id2 = str(uuid.uuid4())
        self._db[veh_id2] = VehicleResponse(
            id=veh_id2,
            vehicleId="VEH-AM-302",
            name="Civil Defence Ambulance 4",
            type="Ambulance",
            capacity=200.0,
            capacityUnit="Kits",
            currentLatitude=28.6304, # Connolly Place Central
            currentLongitude=77.2177,
            speed=45.0,
            operatorName="Paramedic Anil Kumar",
            contactRadio="MED-RED-3",
            status=VehicleStatus.AVAILABLE,
            currentMission=None,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )

    def get_by_id(self, vehicle_id: str) -> Optional[VehicleResponse]:
        return self._db.get(vehicle_id)

    def get_by_ref(self, ref: str) -> Optional[VehicleResponse]:
        for veh in self._db.values():
            if veh.vehicleId == ref:
                return veh
        return None

    def list(self) -> List[VehicleResponse]:
        return list(self._db.values())

    def create(self, vehicle: VehicleCreate) -> VehicleResponse:
        veh_id = str(uuid.uuid4())
        new_veh = VehicleResponse(
            id=veh_id,
            vehicleId=f"VEH-{vehicle.type[:2].upper()}-{len(self._db) + 301:03d}",
            status=VehicleStatus.AVAILABLE,
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
            **vehicle.model_dump()
        )
        self._db[veh_id] = new_veh
        return new_veh

    def update(self, vehicle_id: str, update_data: VehicleUpdate) -> Optional[VehicleResponse]:
        if vehicle_id not in self._db:
            return None
        
        existing = self._db[vehicle_id]
        updated_dict = existing.model_dump()
        
        for k, v in update_data.model_dump(exclude_unset=True).items():
            updated_dict[k] = v
            
        updated_dict["updatedAt"] = datetime.now()
        updated = VehicleResponse(**updated_dict)
        self._db[vehicle_id] = updated
        return updated

# Global singleton repository
vehicle_repo = InMemoryVehicleRepository()
