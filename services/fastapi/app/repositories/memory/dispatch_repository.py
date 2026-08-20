import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.repositories.interfaces import DispatchRepositoryInterface
from app.schemas.dispatch import DispatchResponse, DispatchCreate, DispatchStatus

class InMemoryDispatchRepository(DispatchRepositoryInterface):
    def __init__(self):
        self._db: Dict[str, DispatchResponse] = {}

    def get_by_id(self, dispatch_id: str) -> Optional[DispatchResponse]:
        return self._db.get(dispatch_id)

    def get_by_ref(self, ref: str) -> Optional[DispatchResponse]:
        for dsp in self._db.values():
            if dsp.dispatchId == ref:
                return dsp
        return None

    def list(self, status: Optional[str] = None, priority: Optional[str] = None, vehicle_id: Optional[str] = None, search: Optional[str] = None) -> List[DispatchResponse]:
        results = list(self._db.values())
        if status:
            results = [r for r in results if r.status == status]
        if priority:
            results = [r for r in results if r.priority == priority]
        if vehicle_id:
            results = [r for r in results if r.vehicleId == vehicle_id]
        if search:
            search_lower = search.lower()
            results = [
                r for r in results 
                if (r.origin and search_lower in r.origin.lower()) or 
                   (r.destination and search_lower in r.destination.lower()) or
                   (r.dispatchId and search_lower in r.dispatchId.lower())
            ]
        return results

    def create(self, dispatch: DispatchCreate, origin: str, destination: str, quantity: float, priority: str, officer_name: str) -> DispatchResponse:
        dsp_id = str(uuid.uuid4())
        ref_id = f"DSP-2026-{len(self._db) + 1:03d}"
        
        new_dsp = DispatchResponse(
            id=dsp_id,
            dispatchId=ref_id,
            allocationId=dispatch.allocationId,
            vehicleId=dispatch.vehicleId,
            origin=origin,
            destination=destination,
            assignedOfficer=officer_name,
            assignedOfficerId=dispatch.assignedOfficerId,
            plannedDeparture=dispatch.plannedDeparture,
            estimatedArrival=dispatch.eta,
            actualDeparture=None,
            actualArrival=None,
            completionTime=None,
            latitude=None,
            longitude=None,
            quantity=quantity,
            priority=priority,
            status=DispatchStatus.PLANNED,
            notes=dispatch.notes,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        self._db[dsp_id] = new_dsp
        return new_dsp

    def update_status(self, dispatch_id: str, status: DispatchStatus, actual_departure: Optional[datetime] = None, actual_arrival: Optional[datetime] = None, completion_time: Optional[datetime] = None, notes: Optional[str] = None) -> Optional[DispatchResponse]:
        if dispatch_id not in self._db:
            return None
        
        dsp = self._db[dispatch_id]
        updated_dict = dsp.model_dump()
        updated_dict["status"] = status
        
        if actual_departure:
            updated_dict["actualDeparture"] = actual_departure
        if actual_arrival:
            updated_dict["actualArrival"] = actual_arrival
        if completion_time:
            updated_dict["completionTime"] = completion_time
        if notes:
            updated_dict["notes"] = notes
            
        updated_dict["updatedAt"] = datetime.now()
        updated = DispatchResponse(**updated_dict)
        self._db[dispatch_id] = updated
        return updated

# Global singleton repository
dispatch_repo = InMemoryDispatchRepository()
