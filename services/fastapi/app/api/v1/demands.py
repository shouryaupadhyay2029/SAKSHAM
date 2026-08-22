from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from app.schemas.demand import DemandResponse, DemandCreate, DemandUpdate
from app.domain.demands.service import DemandService
from app.api.dependencies import get_demand_service
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent

router = APIRouter()
publisher = EventPublisher(connection_manager)

@router.get("", response_model=List[DemandResponse], summary="List all demands")
async def list_demands(
    incidentId: Optional[str] = Query(None, description="Filter demands by associated Incident ID"),
    service: DemandService = Depends(get_demand_service)
):
    return service.list_demands(incident_id=incidentId)

@router.post("", response_model=DemandResponse, status_code=status.HTTP_201_CREATED, summary="Create a new demand request")
async def create_demand(demand: DemandCreate, service: DemandService = Depends(get_demand_service)):
    created = service.create_demand(demand)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.DEMAND_CREATED,
                entityType="demand",
                entityId=str(created.id),
                data=DemandResponse.model_validate(created).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return created

@router.get("/{demand_id}", response_model=DemandResponse, summary="Get demand details by ID or Request ID")
async def get_demand(demand_id: str, service: DemandService = Depends(get_demand_service)):
    return service.get_demand(demand_id)

@router.patch("/{demand_id}", response_model=DemandResponse, summary="Update demand details or status")
async def update_demand(demand_id: str, update_data: DemandUpdate, service: DemandService = Depends(get_demand_service)):
    updated = service.update_demand(demand_id, update_data)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.DEMAND_UPDATED,
                entityType="demand",
                entityId=str(updated.id),
                data=DemandResponse.model_validate(updated).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return updated
