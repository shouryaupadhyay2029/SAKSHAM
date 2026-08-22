import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.interfaces import ResourceRepositoryInterface
from app.core.models import ResourceModel
from app.schemas.resource import ResourceResponse, ResourceCreate, ResourceUpdate
from app.repositories.postgres.utils import model_to_dict_safe

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

class SqlAlchemyResourceRepository(ResourceRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, resource_id: str) -> Optional[ResourceResponse]:
        if not is_valid_uuid(resource_id):
            return self.get_by_ref(resource_id)
        resource = self.db.query(ResourceModel).filter(ResourceModel.id == resource_id).first()
        if not resource:
            return None
        return ResourceResponse.model_validate(model_to_dict_safe(resource))

    def get_by_ref(self, ref: str) -> Optional[ResourceResponse]:
        resource = self.db.query(ResourceModel).filter(ResourceModel.resourceId == ref).first()
        if not resource:
            return None
        return ResourceResponse.model_validate(model_to_dict_safe(resource))

    def list(self, category: Optional[str] = None) -> List[ResourceResponse]:
        query = self.db.query(ResourceModel)
        if category:
            query = query.filter(ResourceModel.category == category)
        resources = query.order_by(ResourceModel.resourceId.asc()).all()
        return [ResourceResponse.model_validate(model_to_dict_safe(r)) for r in resources]

    def create(self, resource: ResourceCreate) -> ResourceResponse:
        db_obj = ResourceModel(
            resourceId=resource.resourceId,
            materialName=resource.materialName,
            description=resource.description,
            category=resource.category,
            availableQuantity=resource.availableQuantity,
            reservedQuantity=resource.reservedQuantity or 0.0,
            unit=resource.unit,
            storageDepot=resource.storageDepot,
            location=resource.location,
            latitude=resource.latitude,
            longitude=resource.longitude,
            status=resource.status.value if resource.status else "AVAILABLE",
            pointOfContact=resource.pointOfContact
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return ResourceResponse.model_validate(model_to_dict_safe(db_obj))

    def update(self, resource_id: str, update_data: ResourceUpdate) -> Optional[ResourceResponse]:
        db_obj = None
        if is_valid_uuid(resource_id):
            db_obj = self.db.query(ResourceModel).filter(ResourceModel.id == resource_id).first()
        if not db_obj:
            db_obj = self.db.query(ResourceModel).filter(ResourceModel.resourceId == resource_id).first()
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
        return ResourceResponse.model_validate(model_to_dict_safe(db_obj))
