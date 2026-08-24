from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime

from app.schemas.incident import IncidentResponse, IncidentCreate, IncidentUpdate
from app.schemas.demand import DemandResponse, DemandCreate, DemandUpdate
from app.schemas.resource import ResourceResponse, ResourceCreate, ResourceUpdate
from app.schemas.vehicle import VehicleResponse, VehicleCreate, VehicleUpdate
from app.schemas.allocation import AllocationResponse, AllocationCreate, AllocationStatus
from app.schemas.dispatch import DispatchResponse, DispatchCreate, DispatchStatus

class IncidentRepositoryInterface(ABC):
    @abstractmethod
    def get_by_id(self, incident_id: str) -> Optional[IncidentResponse]:
        pass

    @abstractmethod
    def get_by_ref(self, ref: str) -> Optional[IncidentResponse]:
        pass

    @abstractmethod
    def list(self) -> List[IncidentResponse]:
        pass

    @abstractmethod
    def create(self, incident: IncidentCreate) -> IncidentResponse:
        pass

    @abstractmethod
    def update(self, incident_id: str, update_data: IncidentUpdate) -> Optional[IncidentResponse]:
        pass


class DemandRepositoryInterface(ABC):
    @abstractmethod
    def get_by_id(self, demand_id: str) -> Optional[DemandResponse]:
        pass

    @abstractmethod
    def get_by_ref(self, ref: str) -> Optional[DemandResponse]:
        pass

    @abstractmethod
    def list(self, incident_id: Optional[str] = None) -> List[DemandResponse]:
        pass

    @abstractmethod
    def create(self, demand: DemandCreate) -> DemandResponse:
        pass

    @abstractmethod
    def update(self, demand_id: str, update_data: DemandUpdate) -> Optional[DemandResponse]:
        pass


class ResourceRepositoryInterface(ABC):
    @abstractmethod
    def get_by_id(self, resource_id: str) -> Optional[ResourceResponse]:
        pass

    @abstractmethod
    def get_by_ref(self, ref: str) -> Optional[ResourceResponse]:
        pass

    @abstractmethod
    def list(self, category: Optional[str] = None) -> List[ResourceResponse]:
        pass

    @abstractmethod
    def create(self, resource: ResourceCreate) -> ResourceResponse:
        pass

    @abstractmethod
    def update(self, resource_id: str, update_data: ResourceUpdate) -> Optional[ResourceResponse]:
        pass


class VehicleRepositoryInterface(ABC):
    @abstractmethod
    def get_by_id(self, vehicle_id: str) -> Optional[VehicleResponse]:
        pass

    @abstractmethod
    def get_by_ref(self, ref: str) -> Optional[VehicleResponse]:
        pass

    @abstractmethod
    def list(self) -> List[VehicleResponse]:
        pass

    @abstractmethod
    def create(self, vehicle: VehicleCreate) -> VehicleResponse:
        pass

    @abstractmethod
    def update(self, vehicle_id: str, update_data: VehicleUpdate) -> Optional[VehicleResponse]:
        pass


class AllocationRepositoryInterface(ABC):
    @abstractmethod
    def get_by_id(self, allocation_id: str) -> Optional[AllocationResponse]:
        pass

    @abstractmethod
    def get_by_ref(self, ref: str) -> Optional[AllocationResponse]:
        pass

    @abstractmethod
    def list(self) -> List[AllocationResponse]:
        pass

    @abstractmethod
    def create(self, demand_id: str, resource_id: str, scores: dict) -> AllocationResponse:
        pass

    @abstractmethod
    def update_status(self, allocation_id: str, status: AllocationStatus, approved_by_id: Optional[str] = None) -> Optional[AllocationResponse]:
        pass


class DispatchRepositoryInterface(ABC):
    @abstractmethod
    def get_by_id(self, dispatch_id: str) -> Optional[DispatchResponse]:
        pass

    @abstractmethod
    def get_by_ref(self, ref: str) -> Optional[DispatchResponse]:
        pass

    @abstractmethod
    def list(self, status: Optional[str] = None, priority: Optional[str] = None, vehicle_id: Optional[str] = None, search: Optional[str] = None) -> List[DispatchResponse]:
        pass

    @abstractmethod
    def create(self, dispatch: DispatchCreate, origin: str, destination: str, quantity: float, priority: str, officer_name: str, route_data: Optional[dict] = None) -> DispatchResponse:
        pass

    @abstractmethod
    def update_status(self, dispatch_id: str, status: DispatchStatus, actual_departure: Optional[datetime] = None, actual_arrival: Optional[datetime] = None, completion_time: Optional[datetime] = None, notes: Optional[str] = None) -> Optional[DispatchResponse]:
        pass

    @abstractmethod
    def update_route(self, dispatch_id: str, route_data: dict, deviation_status: str = "DEVIATED") -> Optional[DispatchResponse]:
        pass


from app.schemas.delivery import DeliveryResponse, DeliveryCreate, DeliveryStatus

class DeliveryRepositoryInterface(ABC):
    @abstractmethod
    def get_by_id(self, delivery_id: str) -> Optional[DeliveryResponse]:
        pass

    @abstractmethod
    def get_by_ref(self, ref: str) -> Optional[DeliveryResponse]:
        pass

    @abstractmethod
    def list(self, status: Optional[str] = None, dispatch_id: Optional[str] = None, allocation_id: Optional[str] = None, incident_id: Optional[str] = None, region: Optional[str] = None, priority: Optional[str] = None) -> List[DeliveryResponse]:
        pass

    @abstractmethod
    def create(self, delivery: DeliveryCreate) -> DeliveryResponse:
        pass

    @abstractmethod
    def update_status(self, delivery_id: str, status: DeliveryStatus, received_by: Optional[str] = None, confirmation: Optional[str] = None, notes: Optional[str] = None, delivered_at: Optional[datetime] = None) -> Optional[DeliveryResponse]:
        pass

from app.schemas.shelter import ShelterResponse, ShelterCreate, ShelterUpdate

class ShelterRepositoryInterface(ABC):
    @abstractmethod
    def get_by_id(self, shelter_id: str) -> Optional[ShelterResponse]:
        pass

    @abstractmethod
    def get_by_ref(self, ref: str) -> Optional[ShelterResponse]:
        pass

    @abstractmethod
    def list(self, status: Optional[str] = None, region: Optional[str] = None) -> List[ShelterResponse]:
        pass

    @abstractmethod
    def create(self, shelter: ShelterCreate) -> ShelterResponse:
        pass

    @abstractmethod
    def update(self, shelter_id: str, update_data: ShelterUpdate) -> Optional[ShelterResponse]:
        pass

