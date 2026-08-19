from app.schemas.allocation import AllocationStatus

VALID_ALLOCATION_TRANSITIONS = {
    AllocationStatus.RECOMMENDED: [AllocationStatus.PENDING_APPROVAL, AllocationStatus.CANCELLED],
    AllocationStatus.PENDING_APPROVAL: [AllocationStatus.APPROVED, AllocationStatus.REJECTED, AllocationStatus.CANCELLED],
    AllocationStatus.APPROVED: [AllocationStatus.DISPATCHED, AllocationStatus.CANCELLED],
    AllocationStatus.REJECTED: [],
    AllocationStatus.DISPATCHED: [AllocationStatus.COMPLETED, AllocationStatus.CANCELLED],
    AllocationStatus.COMPLETED: [],
    AllocationStatus.CANCELLED: []
}

def is_valid_allocation_transition(current_status: AllocationStatus, next_status: AllocationStatus) -> bool:
    if current_status == next_status:
        return True
    return next_status in VALID_ALLOCATION_TRANSITIONS.get(current_status, [])
