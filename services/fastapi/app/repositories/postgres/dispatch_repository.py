import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.interfaces import DispatchRepositoryInterface
from app.core.models import DispatchModel
from app.schemas.dispatch import DispatchResponse, DispatchCreate, DispatchStatus
from app.repositories.postgres.utils import model_to_dict_safe

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

class SqlAlchemyDispatchRepository(DispatchRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, dispatch_id: str) -> Optional[DispatchResponse]:
        if not is_valid_uuid(dispatch_id):
            return self.get_by_ref(dispatch_id)
        dsp = self.db.query(DispatchModel).filter(DispatchModel.id == dispatch_id).first()
        if not dsp:
            return None
        return DispatchResponse.model_validate(model_to_dict_safe(dsp))

    def get_by_ref(self, ref: str) -> Optional[DispatchResponse]:
        dsp = self.db.query(DispatchModel).filter(DispatchModel.dispatchId == ref).first()
        if not dsp:
            return None
        return DispatchResponse.model_validate(model_to_dict_safe(dsp))

    def list(self, status: Optional[str] = None, priority: Optional[str] = None, vehicle_id: Optional[str] = None, search: Optional[str] = None) -> List[DispatchResponse]:
        query = self.db.query(DispatchModel)
        if status:
            query = query.filter(DispatchModel.status == status)
        if priority:
            query = query.filter(DispatchModel.priority == priority)
        if vehicle_id:
            query = query.filter(DispatchModel.vehicleId == vehicle_id)
        if search:
            search_lower = f"%{search.lower()}%"
            query = query.filter(
                (DispatchModel.origin.ilike(search_lower)) |
                (DispatchModel.destination.ilike(search_lower)) |
                (DispatchModel.dispatchId.ilike(search_lower))
            )
        dispatches = query.order_by(DispatchModel.dispatchId.asc()).all()
        return [DispatchResponse.model_validate(model_to_dict_safe(d)) for d in dispatches]

    def create(self, dispatch: DispatchCreate, origin: str, destination: str, quantity: float, priority: str, officer_name: str) -> DispatchResponse:
        count = self.db.query(DispatchModel).count()
        ref_id = f"DSP-2026-{count + 1:03d}"
        
        resolved_alloc_id = dispatch.allocationId
        resolved_veh_id = dispatch.vehicleId
        
        if not is_valid_uuid(dispatch.allocationId):
            from app.core.models import AllocationModel
            a = self.db.query(AllocationModel).filter(AllocationModel.allocationId == dispatch.allocationId).first()
            if a:
                resolved_alloc_id = str(a.id)
                
        if not is_valid_uuid(dispatch.vehicleId):
            from app.core.models import VehicleModel
            v = self.db.query(VehicleModel).filter(VehicleModel.vehicleId == dispatch.vehicleId).first()
            if v:
                resolved_veh_id = str(v.id)

        resolved_officer_id = dispatch.assignedOfficerId
        if dispatch.assignedOfficerId and not is_valid_uuid(dispatch.assignedOfficerId):
            from app.core.models import OfficerModel
            off = self.db.query(OfficerModel).filter(OfficerModel.email == dispatch.assignedOfficerId).first()
            if off:
                resolved_officer_id = str(off.id)
            else:
                first_off = self.db.query(OfficerModel).first()
                resolved_officer_id = str(first_off.id) if first_off else None

        # Resolve destination coordinates from Incident for the OSRM route pathing
        lat_coord = None
        lng_coord = None
        try:
            from app.core.models import AllocationModel, DemandRequestModel, IncidentModel
            alloc_record = self.db.query(AllocationModel).filter(AllocationModel.id == resolved_alloc_id).first()
            if alloc_record:
                demand_record = self.db.query(DemandRequestModel).filter(DemandRequestModel.id == alloc_record.demandId).first()
                if demand_record:
                    inc_record = self.db.query(IncidentModel).filter(IncidentModel.id == demand_record.incidentId).first()
                    if inc_record:
                        lat_coord = inc_record.latitude
                        lng_coord = inc_record.longitude
        except Exception as e:
            print(f"⚠️ Failed to resolve incident coordinates for dispatch: {e}")

        db_obj = DispatchModel(
            dispatchId=ref_id,
            allocationId=resolved_alloc_id,
            vehicleId=resolved_veh_id,
            origin=origin,
            destination=destination,
            assignedOfficer=officer_name,
            assignedOfficerId=resolved_officer_id,
            plannedDeparture=dispatch.plannedDeparture,
            estimatedArrival=dispatch.eta,
            quantity=quantity,
            priority=priority,
            status="PLANNED",
            notes=dispatch.notes,
            latitude=lat_coord,
            longitude=lng_coord
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return DispatchResponse.model_validate(model_to_dict_safe(db_obj))

    def update_status(self, dispatch_id: str, status: DispatchStatus, actual_departure: Optional[datetime] = None, actual_arrival: Optional[datetime] = None, completion_time: Optional[datetime] = None, notes: Optional[str] = None) -> Optional[DispatchResponse]:
        db_obj = None
        if is_valid_uuid(dispatch_id):
            db_obj = self.db.query(DispatchModel).filter(DispatchModel.id == dispatch_id).first()
        if not db_obj:
            db_obj = self.db.query(DispatchModel).filter(DispatchModel.dispatchId == dispatch_id).first()
        if not db_obj:
            return None
        
        db_obj.status = status.value
        if actual_departure:
            db_obj.actualDeparture = actual_departure
        if actual_arrival:
            db_obj.actualArrival = actual_arrival
        if completion_time:
            db_obj.completionTime = completion_time
        if notes:
            db_obj.notes = notes
            
        db_obj.updatedAt = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_obj)
        return DispatchResponse.model_validate(model_to_dict_safe(db_obj))
