from app.schemas.dispatch import DispatchStatus

VALID_DISPATCH_TRANSITIONS = {
    DispatchStatus.PLANNED: [DispatchStatus.READY, DispatchStatus.CANCELLED],
    DispatchStatus.READY: [DispatchStatus.DISPATCHED, DispatchStatus.DELAYED, DispatchStatus.FAILED, DispatchStatus.CANCELLED],
    DispatchStatus.DISPATCHED: [DispatchStatus.EN_ROUTE, DispatchStatus.DELAYED, DispatchStatus.FAILED, DispatchStatus.CANCELLED],
    DispatchStatus.EN_ROUTE: [DispatchStatus.ARRIVED, DispatchStatus.DELAYED, DispatchStatus.FAILED, DispatchStatus.CANCELLED],
    DispatchStatus.ARRIVED: [DispatchStatus.COMPLETED, DispatchStatus.FAILED, DispatchStatus.CANCELLED],
    DispatchStatus.COMPLETED: [],
    DispatchStatus.CANCELLED: [],
    DispatchStatus.DELAYED: [DispatchStatus.READY, DispatchStatus.DISPATCHED, DispatchStatus.EN_ROUTE, DispatchStatus.FAILED, DispatchStatus.CANCELLED],
    DispatchStatus.FAILED: []
}

def is_valid_dispatch_transition(current_status: DispatchStatus, next_status: DispatchStatus) -> bool:
    if current_status == next_status:
        return True
    return next_status in VALID_DISPATCH_TRANSITIONS.get(current_status, [])
