from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from app.schemas.demand import DemandResponse, DemandCreate, DemandUpdate
from app.domain.demands.service import DemandService
from app.api.dependencies import get_demand_service

router = APIRouter()

@router.get("", response_model=List[DemandResponse], summary="List all demands")
async def list_demands(
    incidentId: Optional[str] = Query(None, description="Filter demands by associated Incident ID"),
    service: DemandService = Depends(get_demand_service)
):
    return service.list_demands(incident_id=incidentId)

@router.post("", response_model=DemandResponse, status_code=status.HTTP_201_CREATED, summary="Create a new demand request")
async def create_demand(demand: DemandCreate, service: DemandService = Depends(get_demand_service)):
    return service.create_demand(demand)

@router.get("/{demand_id}", response_model=DemandResponse, summary="Get demand details by ID or Request ID")
async def get_demand(demand_id: str, service: DemandService = Depends(get_demand_service)):
    return service.get_demand(demand_id)

@router.patch("/{demand_id}", response_model=DemandResponse, summary="Update demand details or status")
async def update_demand(demand_id: str, update_data: DemandUpdate, service: DemandService = Depends(get_demand_service)):
    return service.update_demand(demand_id, update_data)
