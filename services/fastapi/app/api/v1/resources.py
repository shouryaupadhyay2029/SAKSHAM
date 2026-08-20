from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from app.schemas.resource import ResourceResponse, ResourceCreate, ResourceUpdate
from app.domain.resources.service import ResourceService
from app.api.dependencies import get_resource_service
from app.realtime.connection_manager import connection_manager
from app.realtime.publisher import EventPublisher
from app.realtime.events import EventType, RealtimeEvent

router = APIRouter()
publisher = EventPublisher(connection_manager)

@router.get("", response_model=List[ResourceResponse], summary="List all resources")
async def list_resources(
    category: Optional[str] = Query(None, description="Filter resources by category"),
    service: ResourceService = Depends(get_resource_service)
):
    return service.list_resources(category=category)

@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED, summary="Create a new resource record")
async def create_resource(resource: ResourceCreate, service: ResourceService = Depends(get_resource_service)):
    return service.create_resource(resource)

@router.get("/{resource_id}", response_model=ResourceResponse, summary="Get resource details by ID or Resource ID")
async def get_resource(resource_id: str, service: ResourceService = Depends(get_resource_service)):
    return service.get_resource(resource_id)

@router.patch("/{resource_id}", response_model=ResourceResponse, summary="Update resource stock details or status")
async def update_resource(resource_id: str, update_data: ResourceUpdate, service: ResourceService = Depends(get_resource_service)):
    updated = service.update_resource(resource_id, update_data)
    try:
        await publisher.publish(
            RealtimeEvent(
                event=EventType.RESOURCE_UPDATED,
                entityType="resource",
                entityId=str(updated.id),
                data=ResourceResponse.model_validate(updated).model_dump(mode="json"),
            )
        )
    except Exception as e:
        print(f"⚠️ WebSocket publish failed: {e}")
    return updated
