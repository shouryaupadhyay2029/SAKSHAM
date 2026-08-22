import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.interfaces import DeliveryRepositoryInterface
from app.core.models import DeliveryModel, DispatchModel, AllocationModel, IncidentModel, DemandRequestModel
from app.schemas.delivery import DeliveryResponse, DeliveryCreate, DeliveryStatus
from app.repositories.postgres.utils import model_to_dict_safe

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

# Map rich status to Postgres enum values
COERCION_MAP = {
    DeliveryStatus.PENDING: "PENDING",
    DeliveryStatus.IN_TRANSIT: "IN_TRANSIT",
    DeliveryStatus.ARRIVED: "DELIVERED",
    DeliveryStatus.DELIVERED: "DELIVERED",
    DeliveryStatus.VERIFIED: "DELIVERED",
    DeliveryStatus.COMPLETED: "DELIVERED",
    DeliveryStatus.PARTIAL: "PARTIAL",
    DeliveryStatus.FAILED: "FAILED",
    DeliveryStatus.CANCELLED: "FAILED",
}

def delivery_to_dict_safe(delv) -> dict:
    d = model_to_dict_safe(delv)
    if d.get("confirmation") and d["confirmation"].startswith("RICH_STATUS:"):
        parts = d["confirmation"].split("|", 1)
        d["status"] = parts[0].replace("RICH_STATUS:", "")
        if len(parts) > 1:
            d["confirmation"] = parts[1]
        else:
            d["confirmation"] = None
    return d

class SqlAlchemyDeliveryRepository(DeliveryRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, delivery_id: str) -> Optional[DeliveryResponse]:
        if not is_valid_uuid(delivery_id):
            return self.get_by_ref(delivery_id)
        delv = self.db.query(DeliveryModel).filter(DeliveryModel.id == delivery_id).first()
        if not delv:
            return None
        return DeliveryResponse.model_validate(delivery_to_dict_safe(delv))

    def get_by_ref(self, ref: str) -> Optional[DeliveryResponse]:
        delv = self.db.query(DeliveryModel).filter(DeliveryModel.deliveryId == ref).first()
        if not delv:
            return None
        return DeliveryResponse.model_validate(delivery_to_dict_safe(delv))

    def list(self, status: Optional[str] = None, dispatch_id: Optional[str] = None, allocation_id: Optional[str] = None, incident_id: Optional[str] = None, region: Optional[str] = None, priority: Optional[str] = None) -> List[DeliveryResponse]:
        query = self.db.query(DeliveryModel).join(DispatchModel)
        
        # Filter by database coerced status
        db_status = None
        if status:
            try:
                rich_enum = DeliveryStatus(status)
                db_status = COERCION_MAP.get(rich_enum)
            except ValueError:
                db_status = status
            query = query.filter(DeliveryModel.status == db_status)
            
        if dispatch_id:
            if is_valid_uuid(dispatch_id):
                query = query.filter(DeliveryModel.dispatchId == dispatch_id)
            else:
                query = query.filter(DispatchModel.dispatchId == dispatch_id)
                
        if allocation_id or incident_id or region or priority:
            query = query.join(AllocationModel, DispatchModel.allocationId == AllocationModel.id)
            
        if allocation_id:
            if is_valid_uuid(allocation_id):
                query = query.filter(AllocationModel.id == allocation_id)
            else:
                query = query.filter(AllocationModel.allocationId == allocation_id)
                
        if incident_id or region or priority:
            query = query.join(DemandRequestModel, AllocationModel.demandId == DemandRequestModel.id)
            
        if incident_id:
            if is_valid_uuid(incident_id):
                query = query.filter(DemandRequestModel.incidentId == incident_id)
            else:
                query = query.join(IncidentModel, DemandRequestModel.incidentId == IncidentModel.id).filter(IncidentModel.incidentId == incident_id)
                
        if region:
            if not any(mapper.class_ == IncidentModel for mapper in query._compile_state()._entities):
                query = query.join(IncidentModel, DemandRequestModel.incidentId == IncidentModel.id)
            query = query.filter(IncidentModel.region.ilike(f"%{region}%"))
            
        if priority:
            query = query.filter(DemandRequestModel.priority == priority)

        deliveries = query.order_by(DeliveryModel.deliveryId.asc()).all()
        results = [DeliveryResponse.model_validate(delivery_to_dict_safe(d)) for d in deliveries]
        
        if status:
            results = [r for r in results if r.status.value == status]
            
        return results

    def create(self, delivery: DeliveryCreate) -> DeliveryResponse:
        count = self.db.query(DeliveryModel).count()
        ref_id = f"DEL-2026-{count + 1:03d}"
        
        resolved_dispatch_id = delivery.dispatchId
        if not is_valid_uuid(delivery.dispatchId):
            d = self.db.query(DispatchModel).filter(DispatchModel.dispatchId == delivery.dispatchId).first()
            if d:
                resolved_dispatch_id = str(d.id)

        db_status = COERCION_MAP.get(DeliveryStatus.PENDING, "PENDING")
        rich_confirmation = f"RICH_STATUS:{DeliveryStatus.PENDING.value}"

        # If confirmation is passed initially
        if delivery.confirmation:
            rich_confirmation = f"{rich_confirmation}|{delivery.confirmation}"

        db_obj = DeliveryModel(
            deliveryId=ref_id,
            dispatchId=resolved_dispatch_id,
            quantity=delivery.quantity,
            unit=delivery.unit,
            status=db_status,
            notes=delivery.notes,
            receivedBy=delivery.receivedBy,
            confirmation=rich_confirmation
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return DeliveryResponse.model_validate(delivery_to_dict_safe(db_obj))

    def update_status(self, delivery_id: str, status: DeliveryStatus, received_by: Optional[str] = None, confirmation: Optional[str] = None, notes: Optional[str] = None, delivered_at: Optional[datetime] = None) -> Optional[DeliveryResponse]:
        db_obj = None
        if is_valid_uuid(delivery_id):
            db_obj = self.db.query(DeliveryModel).filter(DeliveryModel.id == delivery_id).first()
        if not db_obj:
            db_obj = self.db.query(DeliveryModel).filter(DeliveryModel.deliveryId == delivery_id).first()
        if not db_obj:
            return None

        # Coerce status value for DB
        db_status = COERCION_MAP.get(status, "DELIVERED")
        db_obj.status = db_status

        rich_prefix = f"RICH_STATUS:{status.value}"
        if confirmation is not None:
            db_obj.confirmation = f"{rich_prefix}|{confirmation}"
        else:
            db_obj.confirmation = rich_prefix

        if received_by is not None:
            db_obj.receivedBy = received_by
        if notes is not None:
            db_obj.notes = notes
        if delivered_at is not None:
            db_obj.deliveredAt = delivered_at
            
        db_obj.updatedAt = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_obj)
        return DeliveryResponse.model_validate(delivery_to_dict_safe(db_obj))
