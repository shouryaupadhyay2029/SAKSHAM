from app.repositories.memory.incident_repository import incident_repo
from app.repositories.memory.demand_repository import demand_repo
from app.repositories.memory.resource_repository import resource_repo
from app.repositories.memory.vehicle_repository import vehicle_repo
from app.repositories.memory.allocation_repository import allocation_repo
from app.repositories.memory.dispatch_repository import dispatch_repo

from app.domain.incidents.service import IncidentService
from app.domain.demands.service import DemandService
from app.domain.resources.service import ResourceService
from app.domain.vehicles.service import VehicleService
from app.domain.matching.service import MatchingService
from app.domain.allocation.service import AllocationService
from app.domain.dispatch.service import DispatchService
from app.domain.delivery.service import DeliveryService

def get_incident_service() -> IncidentService:
    return IncidentService(incident_repo)

def get_demand_service() -> DemandService:
    return DemandService(demand_repo)

def get_resource_service() -> ResourceService:
    return ResourceService(resource_repo)

def get_vehicle_service() -> VehicleService:
    return VehicleService(vehicle_repo)

def get_matching_service() -> MatchingService:
    return MatchingService(demand_repo, resource_repo)

def get_allocation_service() -> AllocationService:
    return AllocationService(allocation_repo, demand_repo, resource_repo)

def get_dispatch_service() -> DispatchService:
    return DispatchService(dispatch_repo, allocation_repo, vehicle_repo, resource_repo, demand_repo)

def get_delivery_service() -> DeliveryService:
    return DeliveryService(dispatch_repo)
