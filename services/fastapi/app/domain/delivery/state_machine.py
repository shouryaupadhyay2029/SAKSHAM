from app.schemas.delivery import DeliveryStatus

VALID_DELIVERY_TRANSITIONS = {
    DeliveryStatus.PENDING: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.CANCELLED],
    DeliveryStatus.IN_TRANSIT: [DeliveryStatus.ARRIVED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
    DeliveryStatus.ARRIVED: [DeliveryStatus.VERIFIED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
    DeliveryStatus.VERIFIED: [DeliveryStatus.COMPLETED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
    DeliveryStatus.COMPLETED: [],
    DeliveryStatus.FAILED: [],
    DeliveryStatus.CANCELLED: []
}

def is_valid_delivery_transition(current_status: DeliveryStatus, next_status: DeliveryStatus) -> bool:
    if current_status == next_status:
        return True
    return next_status in VALID_DELIVERY_TRANSITIONS.get(current_status, [])
