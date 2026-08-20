from datetime import datetime
from typing import List, Optional
from app.repositories.interfaces import DispatchRepositoryInterface, AllocationRepositoryInterface, VehicleRepositoryInterface, ResourceRepositoryInterface, DemandRepositoryInterface
from app.schemas.dispatch import DispatchResponse, DispatchCreate, DispatchStatus, VehicleRecommendation, VehicleScoreBreakdown, DispatchActionRequest
from app.domain.dispatch.state_machine import is_valid_dispatch_transition
from app.core.exceptions import EntityNotFoundException, InvalidStateTransitionException, ValidationException
from app.utils.geo import calculate_haversine_distance
from app.schemas.vehicle import VehicleStatus, VehicleUpdate
from app.schemas.allocation import AllocationStatus, AllocationStatusUpdate

class DispatchService:
    def __init__(
        self,
        dispatch_repo: DispatchRepositoryInterface,
        allocation_repo: AllocationRepositoryInterface,
        vehicle_repo: VehicleRepositoryInterface,
        resource_repo: ResourceRepositoryInterface,
        demand_repo: DemandRepositoryInterface
    ):
        self.dispatch_repo = dispatch_repo
        self.allocation_repo = allocation_repo
        self.vehicle_repo = vehicle_repo
        self.resource_repo = resource_repo
        self.demand_repo = demand_repo

    def get_dispatch(self, dispatch_id: str) -> DispatchResponse:
        dsp = self.dispatch_repo.get_by_id(dispatch_id)
        if not dsp:
            dsp = self.dispatch_repo.get_by_ref(dispatch_id)
            if not dsp:
                raise EntityNotFoundException("Dispatch", dispatch_id)
        return dsp

    def list_dispatches(self, status: Optional[str] = None, priority: Optional[str] = None, vehicle_id: Optional[str] = None, search: Optional[str] = None) -> List[DispatchResponse]:
        return self.dispatch_repo.list(status=status, priority=priority, vehicle_id=vehicle_id, search=search)

    def recommend_vehicles(self, allocation_id: str) -> List[VehicleRecommendation]:
        alloc = self.allocation_repo.get_by_id(allocation_id)
        if not alloc:
            alloc = self.allocation_repo.get_by_ref(allocation_id)
            if not alloc:
                raise EntityNotFoundException("Allocation", allocation_id)

        resource = self.resource_repo.get_by_id(alloc.resourceId)
        demand = self.demand_repo.get_by_id(alloc.demandId)
        
        if not resource or not demand:
            raise ValidationException("Associated Allocation details are incomplete.")

        # Find matching/suitable vehicles in memory
        vehicles = self.vehicle_repo.list()
        recommendations: List[VehicleRecommendation] = []

        for veh in vehicles:
            if veh.status != VehicleStatus.AVAILABLE:
                continue

            # Distance from vehicle to resource depot
            dist = calculate_haversine_distance(
                veh.currentLatitude, veh.currentLongitude,
                resource.latitude, resource.longitude
            )
            dist_km = round(dist, 1)

            # Capacity compatibility ratio
            capacity_score = 0.0
            if veh.capacityUnit == demand.unit:
                if veh.capacity >= demand.quantity:
                    capacity_score = 25.0
                else:
                    capacity_score = round(25.0 * (veh.capacity / demand.quantity), 1)

            # Compatibility
            compat_score = 25.0 if veh.type.lower() in ["boat", "truck", "ambulance"] else 10.0

            # Distance score
            dist_score = max(0.0, round(25.0 * (1 - dist / 50.0), 1))

            # Readiness
            read_score = 25.0

            total_score = round(capacity_score + compat_score + dist_score + read_score, 1)

            recommendations.append(
                VehicleRecommendation(
                    vehicleId=veh.id,
                    name=veh.name,
                    type=veh.type,
                    score=total_score,
                    scoreBreakdown=VehicleScoreBreakdown(
                        availability=25.0,
                        capacity=capacity_score,
                        distance=dist_score,
                        compatibility=compat_score,
                        readiness=read_score
                    ),
                    distanceKm=dist_km,
                    explanation=f"Vehicle '{veh.name}' is {dist_km} km away from the resource depot.",
                    reasons=["Operational", "Available"]
                )
            )

        recommendations.sort(key=lambda x: -x.score)
        return recommendations

    def create_dispatch(self, dispatch: DispatchCreate) -> DispatchResponse:
        alloc = self.allocation_repo.get_by_id(dispatch.allocationId)
        if not alloc:
            alloc = self.allocation_repo.get_by_ref(dispatch.allocationId)
            if not alloc:
                raise EntityNotFoundException("Allocation", dispatch.allocationId)

        if alloc.status != AllocationStatus.APPROVED:
            raise ValidationException("Cannot create dispatch for unapproved allocation.")

        vehicle = self.vehicle_repo.get_by_id(dispatch.vehicleId)
        if not vehicle:
            vehicle = self.vehicle_repo.get_by_ref(dispatch.vehicleId)
            if not vehicle:
                raise EntityNotFoundException("Vehicle", dispatch.vehicleId)

        resource = self.resource_repo.get_by_id(alloc.resourceId)
        demand = self.demand_repo.get_by_id(alloc.demandId)
        
        origin = resource.storageDepot if resource else "Depot"
        destination = demand.affectedZone if demand else "Incident Location"
        quantity = demand.quantity if demand else 0.0
        priority = demand.priority.value if demand else "MEDIUM"
        officer_name = "Officer in Charge"

        new_dsp = self.dispatch_repo.create(dispatch, origin, destination, quantity, priority, officer_name)
        
        # Mark allocation as DISPATCHED
        self.allocation_repo.update_status(alloc.id, AllocationStatus.DISPATCHED)
        
        # Update vehicle status
        self.vehicle_repo.update(vehicle.id, VehicleUpdate(status=VehicleStatus.DISPATCHED, currentMission=new_dsp.dispatchId))

        return new_dsp

    def update_dispatch_status(self, dispatch_id: str, next_status: DispatchStatus, action_req: DispatchActionRequest) -> DispatchResponse:
        existing = self.get_dispatch(dispatch_id)

        if not is_valid_dispatch_transition(existing.status, next_status):
            raise InvalidStateTransitionException(
                f"Dispatch cannot transition from '{existing.status.value}' to '{next_status.value}'."
            )

        actual_departure = None
        actual_arrival = None
        completion_time = None

        if next_status == DispatchStatus.DISPATCHED:
            actual_departure = datetime.now()
            # update vehicle mission status
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.EN_ROUTE))

        elif next_status == DispatchStatus.ARRIVED:
            actual_arrival = datetime.now()
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.ON_SCENE))

        elif next_status == DispatchStatus.COMPLETED:
            completion_time = datetime.now()
            # Release vehicle
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.AVAILABLE, currentMission=None))
            # Complete allocation
            alloc = self.allocation_repo.get_by_id(existing.allocationId)
            if alloc:
                self.allocation_repo.update_status(alloc.id, AllocationStatus.COMPLETED)

        elif next_status in [DispatchStatus.CANCELLED, DispatchStatus.FAILED]:
            # Release vehicle
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.AVAILABLE, currentMission=None))

        updated = self.dispatch_repo.update_status(
            existing.id,
            next_status,
            actual_departure=actual_departure,
            actual_arrival=actual_arrival,
            completion_time=completion_time,
            notes=action_req.notes
        )
        if not updated:
            raise EntityNotFoundException("Dispatch", dispatch_id)
        return updated
