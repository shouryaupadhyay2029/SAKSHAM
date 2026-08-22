"""
SAKSHAM Optimizer – Google OR-Tools Multi-Depot VRP Solver
──────────────────────────────────────────────────────────
Solves the Capacitated Multi-Depot Vehicle Routing Problem (MDVRP)
using Google OR-Tools' routing library.

Key features:
  • Multi-depot: vehicles start and return to their home depot
  • Capacity constraints: each vehicle has a max load
  • Priority-aware: CRITICAL/HIGH demands incur large drop penalties
  • Configurable solver parameters (time limit, strategy, metaheuristic)
  • Returns ordered stops per vehicle with cumulative metrics
"""

from __future__ import annotations

import time
import logging
from typing import List, Tuple, Dict, Optional

from ortools.constraint_solver import routing_enums_pb2, pywrapcp

from app.schemas import (
    Depot,
    DemandPoint,
    SolverConfig,
    DemandPriority,
    OptimizedRoute,
    RouteStop,
    DroppedDemand,
    SolverMetadata,
    SolverStatus,
    FirstSolutionStrategy,
)

logger = logging.getLogger("saksham.solver")


# ── Route Color Palette ────────────────────────────────────────────────────────
ROUTE_COLORS = [
    "#E86F16",  # SAKSHAM orange
    "#2E7D32",  # forest green
    "#1565C0",  # strong blue
    "#C0392B",  # crimson
    "#8E24AA",  # purple
    "#00838F",  # teal
    "#D4A017",  # gold
    "#AD1457",  # magenta
    "#4E342E",  # brown
    "#37474F",  # dark slate
    "#EF6C00",  # deep orange
    "#1B5E20",  # dark green
]


# ── Priority → Drop Penalty Mapping ───────────────────────────────────────────

def _drop_penalty(priority: DemandPriority, multiplier: float) -> int:
    """
    Higher penalty = solver tries harder to serve this node.
    CRITICAL nodes have the highest penalty for being dropped.
    """
    base = {
        DemandPriority.CRITICAL: 10_000,
        DemandPriority.HIGH: 5_000,
        DemandPriority.MEDIUM: 2_000,
        DemandPriority.LOW: 500,
    }
    return int(base.get(priority, 2_000) * multiplier)


# ── First-Solution Strategy Mapping ───────────────────────────────────────────

_STRATEGY_MAP = {
    FirstSolutionStrategy.PATH_CHEAPEST_ARC: routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC,
    FirstSolutionStrategy.SAVINGS: routing_enums_pb2.FirstSolutionStrategy.SAVINGS,
    FirstSolutionStrategy.CHRISTOFIDES: routing_enums_pb2.FirstSolutionStrategy.CHRISTOFIDES,
    FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION: routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION,
    FirstSolutionStrategy.LOCAL_CHEAPEST_INSERTION: routing_enums_pb2.FirstSolutionStrategy.LOCAL_CHEAPEST_INSERTION,
    FirstSolutionStrategy.GLOBAL_CHEAPEST_ARC: routing_enums_pb2.FirstSolutionStrategy.GLOBAL_CHEAPEST_ARC,
}


# ── Solver ─────────────────────────────────────────────────────────────────────

def solve_mdvrp(
    depots: List[Depot],
    demand_points: List[DemandPoint],
    distance_matrix_km: List[List[float]],
    duration_matrix_min: List[List[float]],
    config: SolverConfig,
) -> Tuple[List[OptimizedRoute], List[DroppedDemand], SolverMetadata]:
    """
    Solve the Multi-Depot Capacitated VRP.

    Node layout in the routing model:
      [0 .. D-1]        → depot nodes   (D = total depot count)
      [D .. D+N-1]      → demand nodes  (N = demand point count)

    Vehicle layout:
      Vehicles are numbered 0..V-1 across all depots.
      Each vehicle has a start/end index pointing to its home depot node.

    Parameters
    ----------
    depots : list of Depot (each with vehicles)
    demand_points : list of DemandPoint
    distance_matrix_km : (D+N) × (D+N) distance matrix
    duration_matrix_min : (D+N) × (D+N) duration matrix
    config : solver configuration

    Returns
    -------
    (routes, dropped_demands, metadata)
    """
    t_start = time.perf_counter()

    num_depots = len(depots)
    num_demands = len(demand_points)
    num_nodes = num_depots + num_demands

    # Build vehicle list across all depots
    all_vehicles: List[Tuple[VehicleInfo, int]] = []  # (vehicle_info, depot_index)
    for depot_idx, depot in enumerate(depots):
        for veh in depot.vehicles:
            all_vehicles.append((VehicleInfo(veh.id, veh.name, veh.type, veh.capacity), depot_idx))

    num_vehicles = len(all_vehicles)

    if num_vehicles == 0:
        return [], [], SolverMetadata(
            status=SolverStatus.ERROR,
            solveTimeMs=0,
            totalNodes=num_nodes,
            totalVehicles=0,
            usedVehicles=0,
            droppedNodes=num_demands,
            objectiveValue=0,
            distanceSource="N/A",
            message="No vehicles provided.",
        )

    # ── Create Routing Index Manager ───────────────────────────────────────────
    # starts[i] = depot node index for vehicle i
    # ends[i]   = same (vehicle returns to its depot)
    starts = [depot_idx for _, depot_idx in all_vehicles]
    ends = [depot_idx for _, depot_idx in all_vehicles]

    manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    # ── Distance Callback ──────────────────────────────────────────────────────
    # Convert km to integer metres for OR-Tools (integer arithmetic)
    int_dist = [
        [int(distance_matrix_km[i][j] * 1000) for j in range(num_nodes)]
        for i in range(num_nodes)
    ]

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int_dist[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # ── Duration Dimension (for tracking cumulative time) ─────────────────────
    int_dur = [
        [int(duration_matrix_min[i][j] * 100) for j in range(num_nodes)]  # centiseconds precision
        for i in range(num_nodes)
    ]
    service_time = int(config.serviceTimeMins * 100)  # Add service time at each demand node

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        travel = int_dur[from_node][to_node]
        # Add service time if arriving at a demand node (not a depot)
        if to_node >= num_depots:
            travel += service_time
        return travel

    time_callback_index = routing.RegisterTransitCallback(time_callback)

    routing.AddDimension(
        time_callback_index,
        30 * 100,    # 30 min slack (wait time allowed)
        480 * 100,   # 8-hour max route duration
        False,       # Don't force start cumul to zero (depot can have different start times)
        "Time",
    )

    # ── Capacity Dimension ─────────────────────────────────────────────────────
    demands_list = [0] * num_depots + [int(dp.demand * 100) for dp in demand_points]

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands_list[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)

    vehicle_capacities = [int(veh_info.capacity * 100) for veh_info, _ in all_vehicles]

    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,                  # null capacity slack
        vehicle_capacities,
        True,               # start cumul to zero
        "Capacity",
    )

    # ── Allow Dropping Nodes (with priority-based penalties) ──────────────────
    for demand_idx, dp in enumerate(demand_points):
        node_index = manager.NodeToIndex(num_depots + demand_idx)
        penalty = _drop_penalty(dp.priority, config.priorityPenaltyMultiplier)
        routing.AddDisjunction([node_index], penalty)

    # ── Time Windows (optional) ────────────────────────────────────────────────
    time_dimension = routing.GetDimensionOrDie("Time")
    for demand_idx, dp in enumerate(demand_points):
        index = manager.NodeToIndex(num_depots + demand_idx)
        if dp.timeWindowStart is not None and dp.timeWindowEnd is not None:
            time_dimension.CumulVar(index).SetRange(
                int(dp.timeWindowStart * 100),
                int(dp.timeWindowEnd * 100),
            )

    # ── Solver Parameters ──────────────────────────────────────────────────────
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = _STRATEGY_MAP.get(
        config.firstSolutionStrategy,
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC,
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.FromSeconds(config.maxSolveTimeSeconds)
    search_params.log_search = False

    # ── Solve ──────────────────────────────────────────────────────────────────
    solution = routing.SolveWithParameters(search_params)
    solve_time_ms = int((time.perf_counter() - t_start) * 1000)

    if not solution:
        status_code = routing.status()
        status_map = {
            1: SolverStatus.FEASIBLE,
            2: SolverStatus.INFEASIBLE,
            3: SolverStatus.TIMEOUT,
        }
        return [], [
            DroppedDemand(
                demandPointId=dp.id,
                demandPointName=dp.name,
                reason="Solver found no solution",
            )
            for dp in demand_points
        ], SolverMetadata(
            status=status_map.get(status_code, SolverStatus.ERROR),
            solveTimeMs=solve_time_ms,
            totalNodes=num_nodes,
            totalVehicles=num_vehicles,
            usedVehicles=0,
            droppedNodes=num_demands,
            objectiveValue=0,
            distanceSource="N/A",
            message=f"Solver returned status code {status_code}. No feasible solution found.",
        )

    # ── Extract Routes ─────────────────────────────────────────────────────────
    routes: List[OptimizedRoute] = []
    all_served_demand_ids: set = set()
    total_distance = 0.0
    total_duration = 0.0
    used_vehicles = 0

    for vehicle_idx in range(num_vehicles):
        veh_info, depot_idx = all_vehicles[vehicle_idx]
        depot = depots[depot_idx]

        # Collect the ordered node indices for this vehicle
        stops: List[RouteStop] = []
        index = routing.Start(vehicle_idx)
        cumulative_dist_km = 0.0
        cumulative_dur_min = 0.0
        route_load = 0.0
        prev_node = manager.IndexToNode(index)
        order = 0

        while not routing.IsEnd(index):
            next_index = solution.Value(routing.NextVar(index))
            next_node = manager.IndexToNode(next_index)

            # Track distance/duration
            leg_dist = distance_matrix_km[prev_node][next_node]
            leg_dur = duration_matrix_min[prev_node][next_node]
            cumulative_dist_km += leg_dist
            cumulative_dur_min += leg_dur

            # If next node is a demand node, record it as a stop
            if next_node >= num_depots and not routing.IsEnd(next_index):
                demand_idx = next_node - num_depots
                dp = demand_points[demand_idx]
                route_load += dp.demand
                order += 1
                cumulative_dur_min += config.serviceTimeMins

                stops.append(RouteStop(
                    demandPointId=dp.id,
                    demandPointName=dp.name,
                    arrivalOrder=order,
                    lat=dp.lat,
                    lng=dp.lng,
                    demand=dp.demand,
                    cumulativeDistanceKm=round(cumulative_dist_km, 2),
                    cumulativeDurationMin=round(cumulative_dur_min, 1),
                    loadAfterStop=round(route_load, 2),
                ))
                all_served_demand_ids.add(dp.id)

            prev_node = next_node
            index = next_index

        # Add return-to-depot leg distance
        # (already included in cumulative since we walk to the end node)

        if stops:
            used_vehicles += 1
            color = ROUTE_COLORS[vehicle_idx % len(ROUTE_COLORS)]
            utilization = (route_load / veh_info.capacity * 100) if veh_info.capacity > 0 else 0

            routes.append(OptimizedRoute(
                vehicleId=veh_info.id,
                vehicleName=veh_info.name,
                vehicleType=veh_info.type,
                depotId=depot.id,
                depotName=depot.name,
                depotLat=depot.lat,
                depotLng=depot.lng,
                stops=stops,
                routeGeometry=None,  # Filled in by the API layer after solving
                totalDistanceKm=round(cumulative_dist_km, 2),
                totalDurationMin=round(cumulative_dur_min, 1),
                totalLoad=round(route_load, 2),
                vehicleCapacity=veh_info.capacity,
                utilizationPct=round(utilization, 1),
                color=color,
            ))
            total_distance += cumulative_dist_km
            total_duration += cumulative_dur_min

    # ── Identify Dropped Demands ───────────────────────────────────────────────
    dropped: List[DroppedDemand] = []
    for dp in demand_points:
        if dp.id not in all_served_demand_ids:
            dropped.append(DroppedDemand(
                demandPointId=dp.id,
                demandPointName=dp.name,
                reason="Could not be served within vehicle capacity/time constraints",
            ))

    # ── Build Metadata ─────────────────────────────────────────────────────────
    metadata = SolverMetadata(
        status=SolverStatus.OPTIMAL if routing.status() == 1 else SolverStatus.FEASIBLE,
        solveTimeMs=solve_time_ms,
        totalNodes=num_nodes,
        totalVehicles=num_vehicles,
        usedVehicles=used_vehicles,
        droppedNodes=len(dropped),
        objectiveValue=int(solution.ObjectiveValue()),
        distanceSource="",  # Filled by API layer
        message=f"Solved in {solve_time_ms}ms. {used_vehicles}/{num_vehicles} vehicles used, {len(dropped)} demands unserved.",
    )

    return routes, dropped, metadata


# ── Helper ─────────────────────────────────────────────────────────────────────

class VehicleInfo:
    """Lightweight vehicle data holder (avoids Pydantic overhead in hot loop)."""
    __slots__ = ("id", "name", "type", "capacity")

    def __init__(self, id: str, name: str, type: str, capacity: float):
        self.id = id
        self.name = name
        self.type = type
        self.capacity = capacity
