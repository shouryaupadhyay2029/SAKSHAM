from typing import List, Optional
from app.repositories.interfaces import DemandRepositoryInterface
from app.schemas.demand import DemandResponse, DemandCreate, DemandUpdate
from app.core.exceptions import EntityNotFoundException

class DemandService:
    def __init__(self, demand_repo: DemandRepositoryInterface):
        self.demand_repo = demand_repo

    def get_demand(self, demand_id: str) -> DemandResponse:
        demand = self.demand_repo.get_by_id(demand_id)
        if not demand:
            demand = self.demand_repo.get_by_ref(demand_id)
            if not demand:
                raise EntityNotFoundException("DemandRequest", demand_id)
        return demand

    def list_demands(self, incident_id: Optional[str] = None) -> List[DemandResponse]:
        return self.demand_repo.list(incident_id=incident_id)

    def create_demand(self, demand: DemandCreate) -> DemandResponse:
        return self.demand_repo.create(demand)

    def update_demand(self, demand_id: str, update_data: DemandUpdate) -> DemandResponse:
        existing = self.get_demand(demand_id)
        updated = self.demand_repo.update(existing.id, update_data)
        if not updated:
            raise EntityNotFoundException("DemandRequest", demand_id)
        return updated
