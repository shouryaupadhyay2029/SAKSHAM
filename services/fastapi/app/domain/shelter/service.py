from typing import List, Optional
from app.repositories.interfaces import ShelterRepositoryInterface
from app.schemas.shelter import ShelterResponse, ShelterCreate, ShelterUpdate
from app.core.exceptions import EntityNotFoundException

class ShelterService:
    def __init__(self, shelter_repo: ShelterRepositoryInterface):
        self.shelter_repo = shelter_repo

    def get_shelter(self, shelter_id: str) -> ShelterResponse:
        shelter = self.shelter_repo.get_by_id(shelter_id)
        if not shelter:
            shelter = self.shelter_repo.get_by_ref(shelter_id)
            if not shelter:
                raise EntityNotFoundException("Shelter", shelter_id)
        return shelter

    def list_shelters(self, status: Optional[str] = None, region: Optional[str] = None) -> List[ShelterResponse]:
        return self.shelter_repo.list(status=status, region=region)

    def create_shelter(self, shelter: ShelterCreate) -> ShelterResponse:
        return self.shelter_repo.create(shelter)

    def update_shelter(self, shelter_id: str, update_data: ShelterUpdate) -> ShelterResponse:
        existing = self.get_shelter(shelter_id)
        updated = self.shelter_repo.update(existing.id, update_data)
        if not updated:
            raise EntityNotFoundException("Shelter", shelter_id)
        return updated
