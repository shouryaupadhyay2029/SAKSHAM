import sys
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

# Add SAKSHAM root to sys.path so we can import the optimization package cleanly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../")))

from app.api.dependencies import get_demand_service, get_resource_service, get_vehicle_service, get_incident_service
from app.domain.demands.service import DemandService
from app.domain.resources.service import ResourceService
from app.domain.vehicles.service import VehicleService
from app.domain.incidents.service import IncidentService
from app.utils.osrm import get_road_route

from optimization.adapter import normalize_demand, normalize_vehicle, normalize_resource
from optimization.matching import match_demands_to_resources
from optimization.routing import solve_routes

router = APIRouter()

class DispatchPlanRequest(BaseModel):
    demandId: str

class DispatchPlanResponse(BaseModel):
    demandId: str
    resourceId: str
    vehicleId: str
    distance_meters: float
    duration_seconds: float
    geometry: dict

@router.post("/dispatch-plan", response_model=DispatchPlanResponse)
async def get_dispatch_plan(
    payload: DispatchPlanRequest,
    demand_service: DemandService = Depends(get_demand_service),
    resource_service: ResourceService = Depends(get_resource_service),
    vehicle_service: VehicleService = Depends(get_vehicle_service),
    incident_service: IncidentService = Depends(get_incident_service)
):
    # 1. Fetch real demand request
    db_demand = demand_service.get_demand(payload.demandId)
    if not db_demand:
        raise HTTPException(status_code=404, detail=f"DemandRequest {payload.demandId} not found")
        
    # Get associated incident coordinates
    db_incident = incident_service.get_incident(db_demand.incidentId)
    if not db_incident:
        raise HTTPException(status_code=404, detail=f"Incident {db_demand.incidentId} not found")

    # Combine incident attributes into demand object for the adapter to normalize
    db_demand_dict = db_demand.__dict__ if hasattr(db_demand, "__dict__") else dict(db_demand)
    db_demand_dict["latitude"] = db_incident.latitude
    db_demand_dict["longitude"] = db_incident.longitude

    # Normalize demand
    norm_demand = normalize_demand(db_demand_dict)

    # 2. Fetch available compatible resources
    all_resources = resource_service.list_resources()
    compatible_resources = [
        res for res in all_resources 
        if res.category == db_demand.requestedType and res.status == "AVAILABLE"
    ]
    if not compatible_resources:
        raise HTTPException(status_code=400, detail=f"No compatible AVAILABLE resources for requested category {db_demand.requestedType}")

    norm_resources = [normalize_resource(r) for r in compatible_resources]

    # 3. Match resource using SciPy bipartite matching
    matches = match_demands_to_resources([norm_demand], norm_resources)
    if not matches:
        raise HTTPException(status_code=400, detail="SciPy matching could not establish a feasible assignment path.")
    
    selected_match = matches[0]
    matched_resource_id = selected_match["resource_id"]
    matched_resource = next(r for r in compatible_resources if str(r.id) == matched_resource_id or r.resourceId == matched_resource_id)

    # 4. Fetch available vehicles
    all_vehicles = vehicle_service.list_vehicles()
    available_vehicles = [v for v in all_vehicles if v.status == "AVAILABLE"]
    if not available_vehicles:
        raise HTTPException(status_code=400, detail="No AVAILABLE logistics vehicles found to dispatch matching resource.")

    norm_vehicles = [normalize_vehicle(v) for v in available_vehicles]

    # 5. Run OR-Tools routing solver
    demands_by_id = {norm_demand["id"]: norm_demand}
    routes = solve_routes(matches, norm_vehicles, demands_by_id)
    
    # Select the vehicle recommended by OR-Tools (or fall back to the closest vehicle if route is not resolved)
    selected_vehicle_id = None
    if routes:
        selected_vehicle_id = routes[0]["vehicle_id"]
    else:
        # Fallback to closest available vehicle using distance to depot
        selected_vehicle_id = min(
            available_vehicles,
            key=lambda v: (v.currentLatitude - matched_resource.latitude)**2 + (v.currentLongitude - matched_resource.longitude)**2
        ).id

    selected_vehicle = next(v for v in available_vehicles if str(v.id) == str(selected_vehicle_id) or v.vehicleId == str(selected_vehicle_id))

    # 6. Query OSRM for real road-following route
    try:
        route_details = await get_road_route(
            selected_vehicle.currentLatitude,
            selected_vehicle.currentLongitude,
            db_incident.latitude,
            db_incident.longitude
        )
    except Exception as e:
        # Fallback to straight line coordinate array
        route_details = {
            "distance_meters": selected_match["distance_km"] * 1000,
            "duration_seconds": selected_match["distance_km"] * 120, # rough estimate
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [selected_vehicle.currentLongitude, selected_vehicle.currentLatitude],
                    [db_incident.longitude, db_incident.latitude]
                ]
            }
        }

    return DispatchPlanResponse(
        demandId=str(db_demand.id),
        resourceId=str(matched_resource.id),
        vehicleId=str(selected_vehicle.id),
        distance_meters=route_details["distance_meters"],
        duration_seconds=route_details["duration_seconds"],
        geometry=route_details["geometry"]
    )
