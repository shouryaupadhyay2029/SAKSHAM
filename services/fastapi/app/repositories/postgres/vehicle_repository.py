import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.interfaces import VehicleRepositoryInterface
from app.core.models import VehicleModel
from app.schemas.vehicle import VehicleResponse, VehicleCreate, VehicleUpdate
from app.repositories.postgres.utils import model_to_dict_safe

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

class SqlAlchemyVehicleRepository(VehicleRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, vehicle_id: str) -> Optional[VehicleResponse]:
        if not is_valid_uuid(vehicle_id):
            return self.get_by_ref(vehicle_id)
        vehicle = self.db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
        if not vehicle:
            return None
        return VehicleResponse.model_validate(model_to_dict_safe(vehicle))

    def get_by_ref(self, ref: str) -> Optional[VehicleResponse]:
        vehicle = self.db.query(VehicleModel).filter(VehicleModel.vehicleId == ref).first()
        if not vehicle:
            return None
        return VehicleResponse.model_validate(model_to_dict_safe(vehicle))

    def list(self) -> List[VehicleResponse]:
        vehicles = self.db.query(VehicleModel).order_by(VehicleModel.vehicleId.asc()).all()
        return [VehicleResponse.model_validate(model_to_dict_safe(v)) for v in vehicles]

    def create(self, vehicle: VehicleCreate) -> VehicleResponse:
        db_obj = VehicleModel(
            vehicleId=vehicle.vehicleId,
            name=vehicle.name,
            type=vehicle.type,
            capacity=vehicle.capacity,
            capacityUnit=vehicle.capacityUnit,
            currentLatitude=vehicle.currentLatitude,
            currentLongitude=vehicle.currentLongitude,
            speed=vehicle.speed or 0.0,
            operatorName=vehicle.operatorName,
            contactRadio=vehicle.contactRadio,
            currentMission=vehicle.currentMission,
            status=vehicle.status.value if vehicle.status else "AVAILABLE"
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return VehicleResponse.model_validate(model_to_dict_safe(db_obj))

    def update(self, vehicle_id: str, update_data: VehicleUpdate) -> Optional[VehicleResponse]:
        db_obj = None
        if is_valid_uuid(vehicle_id):
            db_obj = self.db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
        if not db_obj:
            db_obj = self.db.query(VehicleModel).filter(VehicleModel.vehicleId == vehicle_id).first()
        if not db_obj:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if key == "status" and value:
                setattr(db_obj, key, value.value)
            else:
                setattr(db_obj, key, value)
                
        self.db.commit()
        self.db.refresh(db_obj)
        return VehicleResponse.model_validate(model_to_dict_safe(db_obj))
