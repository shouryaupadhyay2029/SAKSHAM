from typing import List, Optional
from app.repositories.interfaces import IncidentRepositoryInterface
from app.schemas.incident import IncidentResponse, IncidentCreate, IncidentUpdate, IncidentStatus
from app.domain.incidents.state_machine import is_valid_incident_transition
from app.core.exceptions import EntityNotFoundException, InvalidStateTransitionException

class IncidentService:
    def __init__(self, incident_repo: IncidentRepositoryInterface):
        self.incident_repo = incident_repo

    def get_incident(self, incident_id: str) -> IncidentResponse:
        incident = self.incident_repo.get_by_id(incident_id)
        if not incident:
            # Try to lookup by reference string (e.g. INC-2026-081)
            incident = self.incident_repo.get_by_ref(incident_id)
            if not incident:
                raise EntityNotFoundException("Incident", incident_id)
        return incident

    def list_incidents(self) -> List[IncidentResponse]:
        return self.incident_repo.list()

    def create_incident(self, incident: IncidentCreate) -> IncidentResponse:
        return self.incident_repo.create(incident)

    def update_incident(self, incident_id: str, update_data: IncidentUpdate) -> IncidentResponse:
        # Check exists
        existing = self.get_incident(incident_id)
        
        # State machine transition checks
        new_status = update_data.status
        if new_status and new_status != existing.status:
            if not is_valid_incident_transition(existing.status, new_status):
                raise InvalidStateTransitionException(
                    f"Incident cannot transition from status '{existing.status.value}' to '{new_status.value}'."
                )

        updated = self.incident_repo.update(existing.id, update_data)
        if not updated:
            raise EntityNotFoundException("Incident", incident_id)
        return updated
