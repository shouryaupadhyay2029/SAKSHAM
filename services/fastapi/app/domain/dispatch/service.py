from datetime import datetime, timedelta
from typing import List, Optional, Any
from app.repositories.interfaces import (
    DispatchRepositoryInterface, 
    AllocationRepositoryInterface, 
    VehicleRepositoryInterface, 
    ResourceRepositoryInterface, 
    DemandRepositoryInterface,
    IncidentRepositoryInterface
)
from app.schemas.dispatch import DispatchResponse, DispatchCreate, DispatchStatus, VehicleRecommendation, VehicleScoreBreakdown, DispatchActionRequest
from app.domain.dispatch.state_machine import is_valid_dispatch_transition
from app.core.exceptions import EntityNotFoundException, InvalidStateTransitionException, ValidationException, SakshamException
from app.utils.geo import calculate_haversine_distance
from app.utils.events import EventPublisher
from app.schemas.vehicle import VehicleStatus, VehicleUpdate
from app.schemas.allocation import AllocationStatus, AllocationStatusUpdate
from fastapi import status

class DispatchService:
    def __init__(
        self,
        dispatch_repo: DispatchRepositoryInterface,
        allocation_repo: AllocationRepositoryInterface,
        vehicle_repo: VehicleRepositoryInterface,
        resource_repo: ResourceRepositoryInterface,
        demand_repo: DemandRepositoryInterface,
        incident_repo: Optional[IncidentRepositoryInterface] = None
    ):
        self.dispatch_repo = dispatch_repo
        self.allocation_repo = allocation_repo
        self.vehicle_repo = vehicle_repo
        self.resource_repo = resource_repo
        self.demand_repo = demand_repo
        self.incident_repo = incident_repo

    def get_dispatch(self, dispatch_id: str) -> DispatchResponse:
        dsp = self.dispatch_repo.get_by_id(dispatch_id)
        if not dsp:
            dsp = self.dispatch_repo.get_by_ref(dispatch_id)
            if not dsp:
                raise EntityNotFoundException("Dispatch", dispatch_id)
        return dsp

    def list_dispatches(self, status: Optional[str] = None, priority: Optional[str] = None, vehicle_id: Optional[str] = None, search: Optional[str] = None) -> List[DispatchResponse]:
        return self.dispatch_repo.list(status=status, priority=priority, vehicle_id=vehicle_id, search=search)

    def _verify_region(self, officer: Any, incident_id: str):
        if not officer or not officer.region:
            return
        
        region_lower = officer.region.strip().lower()
        if region_lower == "national" or not region_lower:
            return
            
        if self.incident_repo:
            incident = self.incident_repo.get_by_id(incident_id)
            if incident and incident.region.strip().lower() != region_lower:
                raise SakshamException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    code="FORBIDDEN",
                    message=f"Access denied. Operational record belongs to region '{incident.region}' which is outside your jurisdiction '{officer.region}'."
                )

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

        vehicles = self.vehicle_repo.list()
        recommendations: List[VehicleRecommendation] = []

        for veh in vehicles:
            if veh.status != VehicleStatus.AVAILABLE:
                continue

            dist = calculate_haversine_distance(
                veh.currentLatitude, veh.currentLongitude,
                resource.latitude, resource.longitude
            )
            dist_km = round(dist, 1)

            capacity_score = 0.0
            if veh.capacityUnit == demand.unit:
                if veh.capacity >= demand.quantity:
                    capacity_score = 25.0
                else:
                    capacity_score = round(25.0 * (veh.capacity / demand.quantity), 1)

            compat_score = 25.0 if veh.type.lower() in ["boat", "truck", "ambulance"] else 10.0
            dist_score = max(0.0, round(25.0 * (1 - dist / 50.0), 1))
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

    async def create_dispatch(self, dispatch: DispatchCreate, officer: Optional[Any] = None) -> DispatchResponse:
        alloc = self.allocation_repo.get_by_id(dispatch.allocationId)
        if not alloc:
            alloc = self.allocation_repo.get_by_ref(dispatch.allocationId)
            if not alloc:
                raise EntityNotFoundException("Allocation", dispatch.allocationId)

        if alloc.status != AllocationStatus.APPROVED and alloc.status != AllocationStatus.DISPATCHED:
            # Auto-approve allocation
            self.allocation_repo.update_status(alloc.id, AllocationStatus.APPROVED)
            alloc = self.allocation_repo.get_by_id(alloc.id)
            # Sync corresponding demand request status to ALLOCATED
            from app.schemas.demand import DemandUpdate, DemandStatus
            self.demand_repo.update(alloc.demandId, DemandUpdate(status=DemandStatus.ALLOCATED))

        vehicle = self.vehicle_repo.get_by_id(dispatch.vehicleId)
        if not vehicle:
            vehicle = self.vehicle_repo.get_by_ref(dispatch.vehicleId)
            if not vehicle:
                raise EntityNotFoundException("Vehicle", dispatch.vehicleId)

        if vehicle.status != VehicleStatus.AVAILABLE:
            raise SakshamException(
                status_code=status.HTTP_409_CONFLICT,
                code="VEHICLE_UNAVAILABLE",
                message=f"Vehicle '{vehicle.name}' is not available (current status: {vehicle.status.value})."
            )

        resource = self.resource_repo.get_by_id(alloc.resourceId)
        demand = self.demand_repo.get_by_id(alloc.demandId)
        
        if not resource or not demand:
            raise ValidationException("Associated Allocation details are incomplete.")

        # Check regional authorization
        self._verify_region(officer, demand.incidentId)

        # Basic compatibility validation
        if vehicle.capacity < demand.quantity * 0.1: # Allow some partial fits but reject extreme mismatches
            raise ValidationException(f"Vehicle '{vehicle.name}' capacity is too small for the demand quantity.")

        # Resolve incident metadata for OSRM routing and scoring
        incident_severity = "MEDIUM"
        incident_affected_people = 0
        incident_lat = None
        incident_lng = None
        if self.incident_repo:
            try:
                incident = self.incident_repo.get_by_id(demand.incidentId)
                if incident:
                    incident_severity = getattr(incident, "severity", "MEDIUM")
                    incident_affected_people = getattr(incident, "affectedPeople", 0)
                    incident_lat = getattr(incident, "latitude", None)
                    incident_lng = getattr(incident, "longitude", None)
            except Exception as e:
                print(f"⚠️ Failed to get incident for dispatch routing: {e}")

        # Compute route decision & scoring on backend
        route_data = None
        if vehicle and incident_lat is not None and incident_lng is not None:
            try:
                from app.utils.osrm import get_road_route_with_alternatives
                from app.utils.route_scoring import RouteCandidate as ScoringCandidate, score_routes
                import datetime

                osrm_res = await get_road_route_with_alternatives(
                    vehicle.currentLatitude, vehicle.currentLongitude,
                    incident_lat, incident_lng
                )
                primary = osrm_res["primary_route"]
                alternatives_raw = osrm_res.get("alternatives", [])
                all_candidates_raw = [primary] + alternatives_raw
                
                scorer_candidates = [
                    ScoringCandidate(
                        id=r["id"],
                        distance_meters=r["distance_meters"],
                        duration_seconds=r["duration_seconds"],
                        geometry=r["geometry"],
                        legs=r.get("legs", []),
                        summary=r.get("summary")
                    )
                    for r in all_candidates_raw
                ]
                
                decision = score_routes(
                    scorer_candidates,
                    incident_severity=incident_severity,
                    incident_affected_people=incident_affected_people
                )
                
                # Package dynamic weight policy metadata into decision_factors JSON
                decision_factors = {
                    **decision.selected_route.decision_factors,
                    "policy_name": decision.policy_name,
                    "policy_reason": decision.policy_reason,
                    "policy_weights": decision.policy_weights,
                    "summary": decision.selected_route.summary
                }

                route_data = {
                    "routing_provider": "OSRM",
                    "profile": "driving",
                    "distance_meters": decision.selected_route.distance_meters,
                    "duration_seconds": decision.selected_route.duration_seconds,
                    "geometry": decision.selected_route.geometry,
                    "route_score": decision.selected_route.route_score,
                    "decision_reason": decision.selected_route.decision_reason,
                    "decision_factors": decision_factors,
                    "alternatives": [
                        {
                            "id": alt.id,
                            "distance_meters": alt.distance_meters,
                            "duration_seconds": alt.duration_seconds,
                            "geometry": alt.geometry,
                            "route_score": alt.route_score,
                            "decision_reason": alt.decision_reason,
                            "decision_factors": alt.decision_factors,
                            "summary": alt.summary
                        }
                        for alt in decision.alternatives
                    ],
                    "calculated_at": datetime.utcnow()
                }
                
                # Update ETA dynamically based on real road duration
                dispatch.eta = datetime.utcnow() + timedelta(seconds=decision.selected_route.duration_seconds)
                
            except Exception as e:
                print(f"⚠️ Failed to compute OSRM route decision: {e}")

        origin = resource.storageDepot if resource else "Depot"
        destination = demand.affectedZone if demand else "Incident Location"
        quantity = demand.quantity if demand else 0.0
        priority = demand.priority.value if demand else "MEDIUM"
        officer_name = officer.name if officer else "Assigned Officer"

        # Update and save atomically with route_data
        new_dsp = self.dispatch_repo.create(dispatch, origin, destination, quantity, priority, officer_name, route_data=route_data)
        
        self.allocation_repo.update_status(alloc.id, AllocationStatus.DISPATCHED)
        self.vehicle_repo.update(vehicle.id, VehicleUpdate(status=VehicleStatus.DISPATCHED, currentMission=new_dsp.dispatchId))

        # Event publishing
        EventPublisher.publish("DISPATCH_CREATED", {"dispatchId": new_dsp.dispatchId, "allocationId": alloc.id})
        EventPublisher.publish("VEHICLE_ASSIGNED", {"vehicleId": vehicle.id, "dispatchId": new_dsp.id})

        return new_dsp

    def update_dispatch_status(self, dispatch_id: str, next_status: DispatchStatus, action_req: DispatchActionRequest, officer: Optional[Any] = None) -> DispatchResponse:
        existing = self.get_dispatch(dispatch_id)

        if not is_valid_dispatch_transition(existing.status, next_status):
            raise InvalidStateTransitionException(
                f"Dispatch cannot transition from '{existing.status.value}' to '{next_status.value}'."
            )

        # Check regional authorization
        alloc = self.allocation_repo.get_by_id(existing.allocationId)
        if alloc:
            demand = self.demand_repo.get_by_id(alloc.demandId)
            if demand:
                self._verify_region(officer, demand.incidentId)

        actual_departure = None
        actual_arrival = None
        completion_time = None

        if next_status == DispatchStatus.DISPATCHED:
            actual_departure = datetime.utcnow()
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.DISPATCHED))

        elif next_status == DispatchStatus.EN_ROUTE:
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.EN_ROUTE))

        elif next_status == DispatchStatus.ARRIVED:
            actual_arrival = datetime.utcnow()
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.ON_SCENE))

        elif next_status == DispatchStatus.COMPLETED:
            completion_time = datetime.utcnow()
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.AVAILABLE, currentMission=None))
                EventPublisher.publish("VEHICLE_RELEASED", {"vehicleId": existing.vehicleId})
            if alloc:
                self.allocation_repo.update_status(alloc.id, AllocationStatus.COMPLETED)

        elif next_status in [DispatchStatus.CANCELLED, DispatchStatus.FAILED]:
            if existing.vehicleId:
                self.vehicle_repo.update(existing.vehicleId, VehicleUpdate(status=VehicleStatus.AVAILABLE, currentMission=None))
                EventPublisher.publish("VEHICLE_RELEASED", {"vehicleId": existing.vehicleId})

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

        EventPublisher.publish("DISPATCH_STATUS_CHANGED", {"dispatchId": updated.id, "status": updated.status.value})

        return updated

    def update_dispatch_route(self, dispatch_id: str, route_data: dict, deviation_status: str = "DEVIATED") -> DispatchResponse:
        updated = self.dispatch_repo.update_route(dispatch_id, route_data, deviation_status)
        if not updated:
            raise EntityNotFoundException("Dispatch", dispatch_id)
        
        # Publish event for UI live synchronization
        EventPublisher.publish("DISPATCH_ROUTE_UPDATED", {"dispatchId": updated.id, "routeDeviationStatus": deviation_status})
        return updated
