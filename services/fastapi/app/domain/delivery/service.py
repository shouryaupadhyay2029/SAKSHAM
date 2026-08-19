import uuid
from datetime import datetime
from typing import List, Optional, Dict
from app.schemas.delivery import DeliveryResponse, DeliveryCreate, DeliveryStatus
from app.domain.delivery.state_machine import is_valid_delivery_transition
from app.core.exceptions import EntityNotFoundException, InvalidStateTransitionException
from app.repositories.interfaces import DispatchRepositoryInterface

class DeliveryService:
    def __init__(self, dispatch_repo: DispatchRepositoryInterface):
        self.dispatch_repo = dispatch_repo
        self._db: Dict[str, DeliveryResponse] = {}

    def get_delivery(self, delivery_id: str) -> DeliveryResponse:
        delivery = self._db.get(delivery_id)
        if not delivery:
            # Look up by dispatchId
            for d in self._db.values():
                if d.dispatchId == delivery_id:
                    return d
            raise EntityNotFoundException("Delivery", delivery_id)
        return delivery

    def list_deliveries(self) -> List[DeliveryResponse]:
        return list(self._db.values())

    def create_delivery(self, delivery: DeliveryCreate) -> DeliveryResponse:
        # Check dispatch exists
        dispatch = self.dispatch_repo.get_by_id(delivery.dispatchId)
        if not dispatch:
            dispatch = self.dispatch_repo.get_by_ref(delivery.dispatchId)
            if not dispatch:
                raise EntityNotFoundException("Dispatch", delivery.dispatchId)

        del_id = str(uuid.uuid4())
        ref_id = f"DEL-2026-{len(self._db) + 1:03d}"
        
        new_del = DeliveryResponse(
            id=del_id,
            deliveryId=ref_id,
            dispatchId=dispatch.id,
            quantity=delivery.quantity,
            unit=delivery.unit,
            status=DeliveryStatus.PENDING,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        self._db[del_id] = new_del
        return new_del

    def update_delivery_status(self, delivery_id: str, next_status: DeliveryStatus, notes: Optional[str] = None) -> DeliveryResponse:
        existing = self.get_delivery(delivery_id)

        if not is_valid_delivery_transition(existing.status, next_status):
            raise InvalidStateTransitionException(
                f"Delivery cannot transition from '{existing.status.value}' to '{next_status.value}'."
            )

        updated_dict = existing.model_dump()
        updated_dict["status"] = next_status
        if notes:
            updated_dict["notes"] = notes
        if next_status == DeliveryStatus.COMPLETED:
            updated_dict["deliveredAt"] = datetime.now()
            
        updated_dict["updatedAt"] = datetime.now()
        updated = DeliveryResponse(**updated_dict)
        self._db[existing.id] = updated
        return updated
