from typing import List, Optional
from app.repositories.interfaces import VehicleRepositoryInterface
from app.schemas.vehicle import VehicleResponse, VehicleCreate, VehicleUpdate
from app.core.exceptions import EntityNotFoundException

class VehicleService:
    def __init__(self, vehicle_repo: VehicleRepositoryInterface):
        self.vehicle_repo = vehicle_repo

    def get_vehicle(self, vehicle_id: str) -> VehicleResponse:
        vehicle = self.vehicle_repo.get_by_id(vehicle_id)
        if not vehicle:
            vehicle = self.vehicle_repo.get_by_ref(vehicle_id)
            if not vehicle:
                raise EntityNotFoundException("Vehicle", vehicle_id)
        return vehicle

    def list_vehicles(self) -> List[VehicleResponse]:
        return self.vehicle_repo.list()

    def create_vehicle(self, vehicle: VehicleCreate) -> VehicleResponse:
        return self.vehicle_repo.create(vehicle)

    def update_vehicle(self, vehicle_id: str, update_data: VehicleUpdate) -> VehicleResponse:
        existing = self.get_vehicle(vehicle_id)
        updated = self.vehicle_repo.update(existing.id, update_data)
        if not updated:
            raise EntityNotFoundException("Vehicle", vehicle_id)
        return updated
