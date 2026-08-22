"""
Unit tests for the Google OR-Tools Multi-Depot VRP solver.
"""

import pytest
from app.schemas import (
    Depot,
    VehicleSpec,
    DemandPoint,
    DemandPriority,
    SolverConfig,
    SolverStatus,
)
from app.solver import solve_mdvrp
from app.osrm_client import build_haversine_matrix


def test_single_depot_single_vehicle_routing():
    """Test basic routing with 1 depot, 1 vehicle, and 2 demand points."""
    depots = [
        Depot(
            id="DEPOT-1",
            name="Main Depot",
            lat=28.6139,
            lng=77.2090,
            vehicles=[
                VehicleSpec(id="VEH-1", name="Truck 1", type="TRUCK", capacity=1000)
            ],
        )
    ]

    demand_points = [
        DemandPoint(id="D1", name="Stop A", lat=28.6300, lng=77.2150, demand=200, priority=DemandPriority.HIGH),
        DemandPoint(id="D2", name="Stop B", lat=28.6450, lng=77.2200, demand=300, priority=DemandPriority.MEDIUM),
    ]

    locations = [(depots[0].lat, depots[0].lng)] + [(dp.lat, dp.lng) for dp in demand_points]
    dist_matrix, dur_matrix = build_haversine_matrix(locations)

    config = SolverConfig(maxSolveTimeSeconds=5, serviceTimeMins=5.0)

    routes, dropped, metadata = solve_mdvrp(
        depots=depots,
        demand_points=demand_points,
        distance_matrix_km=dist_matrix,
        duration_matrix_min=dur_matrix,
        config=config,
    )

    assert metadata.status in [SolverStatus.OPTIMAL, SolverStatus.FEASIBLE]
    assert len(routes) == 1
    assert len(dropped) == 0

    route = routes[0]
    assert route.vehicleId == "VEH-1"
    assert len(route.stops) == 2
    assert route.totalLoad == 500
    assert route.utilizationPct == 50.0
    assert route.totalDistanceKm > 0


def test_capacity_exceeded_drops_nodes_gracefully():
    """Test that when demand exceeds vehicle capacity, low priority nodes are dropped."""
    depots = [
        Depot(
            id="DEPOT-1",
            lat=28.6139,
            lng=77.2090,
            vehicles=[
                VehicleSpec(id="VEH-1", capacity=300)  # Capacity only 300
            ],
        )
    ]

    demand_points = [
        DemandPoint(id="D1", lat=28.6300, lng=77.2150, demand=250, priority=DemandPriority.CRITICAL),
        DemandPoint(id="D2", lat=28.6450, lng=77.2200, demand=250, priority=DemandPriority.LOW),  # Total 500 > 300
    ]

    locations = [(depots[0].lat, depots[0].lng)] + [(dp.lat, dp.lng) for dp in demand_points]
    dist_matrix, dur_matrix = build_haversine_matrix(locations)

    config = SolverConfig(maxSolveTimeSeconds=5, priorityPenaltyMultiplier=1000)

    routes, dropped, metadata = solve_mdvrp(
        depots=depots,
        demand_points=demand_points,
        distance_matrix_km=dist_matrix,
        duration_matrix_min=dur_matrix,
        config=config,
    )

    assert len(routes) == 1
    assert len(dropped) == 1
    # Critical demand D1 should be served, Low demand D2 should be dropped
    assert routes[0].stops[0].demandPointId == "D1"
    assert dropped[0].demandPointId == "D2"


def test_multi_depot_allocation():
    """Test that vehicles return to their respective home depots."""
    depots = [
        Depot(
            id="DEPOT-NORTH",
            name="North Depot",
            lat=28.7000,
            lng=77.2000,
            vehicles=[VehicleSpec(id="VEH-NORTH", capacity=1000)],
        ),
        Depot(
            id="DEPOT-SOUTH",
            name="South Depot",
            lat=28.5000,
            lng=77.2000,
            vehicles=[VehicleSpec(id="VEH-SOUTH", capacity=1000)],
        ),
    ]

    demand_points = [
        DemandPoint(id="D-NORTH", lat=28.6900, lng=77.2050, demand=200),
        DemandPoint(id="D-SOUTH", lat=28.5100, lng=77.2050, demand=200),
    ]

    locations = [(d.lat, d.lng) for d in depots] + [(dp.lat, dp.lng) for dp in demand_points]
    dist_matrix, dur_matrix = build_haversine_matrix(locations)

    config = SolverConfig(maxSolveTimeSeconds=5)

    routes, dropped, metadata = solve_mdvrp(
        depots=depots,
        demand_points=demand_points,
        distance_matrix_km=dist_matrix,
        duration_matrix_min=dur_matrix,
        config=config,
    )

    assert len(routes) == 2
    assert len(dropped) == 0

    route_depots = {r.vehicleId: r.depotId for r in routes}
    assert route_depots["VEH-NORTH"] == "DEPOT-NORTH"
    assert route_depots["VEH-SOUTH"] == "DEPOT-SOUTH"
