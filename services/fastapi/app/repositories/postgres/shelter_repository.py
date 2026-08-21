import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.interfaces import ShelterRepositoryInterface
from app.core.models import ShelterModel
from app.schemas.shelter import ShelterResponse, ShelterCreate, ShelterUpdate
from app.repositories.postgres.utils import model_to_dict_safe

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

class SqlAlchemyShelterRepository(ShelterRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, shelter_id: str) -> Optional[ShelterResponse]:
        if not is_valid_uuid(shelter_id):
            return self.get_by_ref(shelter_id)
        shelter = self.db.query(ShelterModel).filter(ShelterModel.id == shelter_id).first()
        if not shelter:
            return None
        return ShelterResponse.model_validate(model_to_dict_safe(shelter))

    def get_by_ref(self, ref: str) -> Optional[ShelterResponse]:
        shelter = self.db.query(ShelterModel).filter(ShelterModel.shelterId == ref).first()
        if not shelter:
            return None
        return ShelterResponse.model_validate(model_to_dict_safe(shelter))

    def list(self, status: Optional[str] = None, region: Optional[str] = None) -> List[ShelterResponse]:
        query = self.db.query(ShelterModel)
        if status:
            query = query.filter(ShelterModel.status == status)
        if region:
            query = query.filter(ShelterModel.region == region)
        shelters = query.order_by(ShelterModel.shelterId.asc()).all()
        return [ShelterResponse.model_validate(model_to_dict_safe(s)) for s in shelters]

    def create(self, shelter: ShelterCreate) -> ShelterResponse:
        count = self.db.query(ShelterModel).count()
        ref_id = f"SHL-DEL-{count + 1:03d}"
        db_obj = ShelterModel(
            shelterId=ref_id,
            name=shelter.name,
            location=shelter.location,
            region=shelter.region,
            latitude=shelter.latitude,
            longitude=shelter.longitude,
            totalCapacity=shelter.totalCapacity,
            currentOccupancy=shelter.currentOccupancy,
            status="OPEN",
            facilities=shelter.facilities or [],
            contactPerson=shelter.contactPerson,
            contactInfo=shelter.contactInfo
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return ShelterResponse.model_validate(model_to_dict_safe(db_obj))

    def update(self, shelter_id: str, update_data: ShelterUpdate) -> Optional[ShelterResponse]:
        db_obj = None
        if is_valid_uuid(shelter_id):
            db_obj = self.db.query(ShelterModel).filter(ShelterModel.id == shelter_id).first()
        if not db_obj:
            db_obj = self.db.query(ShelterModel).filter(ShelterModel.shelterId == shelter_id).first()
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
        return ShelterResponse.model_validate(model_to_dict_safe(db_obj))
