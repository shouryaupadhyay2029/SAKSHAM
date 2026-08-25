from app.schemas.incident import IncidentStatus

VALID_INCIDENT_TRANSITIONS = {
    IncidentStatus.REPORTED: [IncidentStatus.VERIFIED, IncidentStatus.CANCELLED],
    IncidentStatus.VERIFIED: [IncidentStatus.AWAITING_MATCH, IncidentStatus.AWAITING_RESPONSE, IncidentStatus.CANCELLED],
    IncidentStatus.AWAITING_MATCH: [IncidentStatus.MATCHED, IncidentStatus.CANCELLED],
    IncidentStatus.AWAITING_RESPONSE: [IncidentStatus.MATCHED, IncidentStatus.CANCELLED],
    IncidentStatus.MATCHED: [IncidentStatus.DISPATCHED, IncidentStatus.CANCELLED],
    IncidentStatus.DISPATCHED: [IncidentStatus.UNDER_RESPONSE, IncidentStatus.CANCELLED],
    IncidentStatus.UNDER_RESPONSE: [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED],
    IncidentStatus.RESOLVED: [],
    IncidentStatus.CANCELLED: []
}

def is_valid_incident_transition(current_status: IncidentStatus, next_status: IncidentStatus) -> bool:
    if current_status == next_status:
        return True
    return next_status in VALID_INCIDENT_TRANSITIONS.get(current_status, [])
