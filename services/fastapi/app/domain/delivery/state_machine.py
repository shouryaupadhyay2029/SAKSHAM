from app.schemas.delivery import DeliveryStatus

# Maps each DeliveryStatus to the set of statuses it is allowed to transition to.
VALID_TRANSITIONS = {
    DeliveryStatus.PENDING: {
        DeliveryStatus.IN_TRANSIT, 
        DeliveryStatus.CANCELLED, 
        DeliveryStatus.FAILED
    },
    DeliveryStatus.IN_TRANSIT: {
        DeliveryStatus.ARRIVED, 
        DeliveryStatus.FAILED, 
        DeliveryStatus.CANCELLED
    },
    DeliveryStatus.ARRIVED: {
        DeliveryStatus.VERIFIED, 
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED, 
        DeliveryStatus.CANCELLED
    },
    DeliveryStatus.DELIVERED: {
        DeliveryStatus.VERIFIED,
        DeliveryStatus.COMPLETED,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED
    },
    DeliveryStatus.VERIFIED: {
        DeliveryStatus.COMPLETED, 
        DeliveryStatus.PARTIAL,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED
    },
    DeliveryStatus.PARTIAL: {
        DeliveryStatus.COMPLETED, 
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED
    },
    DeliveryStatus.COMPLETED: set(),
    DeliveryStatus.FAILED: set(),
    DeliveryStatus.CANCELLED: set()
}

def is_valid_delivery_transition(current_status: DeliveryStatus, next_status: DeliveryStatus) -> bool:
    if current_status == next_status:
        return True
    allowed = VALID_TRANSITIONS.get(current_status, set())
    return next_status in allowed
