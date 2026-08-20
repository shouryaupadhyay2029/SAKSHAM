from typing import List, Optional
from app.repositories.interfaces import ResourceRepositoryInterface
from app.schemas.resource import ResourceResponse, ResourceCreate, ResourceUpdate
from app.core.exceptions import EntityNotFoundException

class ResourceService:
    def __init__(self, resource_repo: ResourceRepositoryInterface):
        self.resource_repo = resource_repo

    def get_resource(self, resource_id: str) -> ResourceResponse:
        resource = self.resource_repo.get_by_id(resource_id)
        if not resource:
            resource = self.resource_repo.get_by_ref(resource_id)
            if not resource:
                raise EntityNotFoundException("Resource", resource_id)
        return resource

    def list_resources(self, category: Optional[str] = None) -> List[ResourceResponse]:
        return self.resource_repo.list(category=category)

    def create_resource(self, resource: ResourceCreate) -> ResourceResponse:
        return self.resource_repo.create(resource)

    def update_resource(self, resource_id: str, update_data: ResourceUpdate) -> ResourceResponse:
        existing = self.get_resource(resource_id)
        updated = self.resource_repo.update(existing.id, update_data)
        if not updated:
            raise EntityNotFoundException("Resource", resource_id)
        return updated
