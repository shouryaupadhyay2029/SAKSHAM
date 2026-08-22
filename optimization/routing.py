from ortools.constraint_solver import routing_enums_pb2, pywrapcp
from optimization.matching import haversine_distance

def build_distance_matrix(locations):
    """
    Builds an all-pairs distance matrix (in meters) for a list of (lat, lng) points.
    Uses straight-line distance for now — will be swapped for real OSRM road distance later.
    """
    size = len(locations)
    matrix = [[0] * size for _ in range(size)]
    for i in range(size):
        for j in range(size):
            if i != j:
                matrix[i][j] = int(haversine_distance(locations[i], locations[j]) * 1000)  # km -> m
    return matrix

def solve_routes(matched_pairs, vehicles, demands_by_id):
    """
    Given matched demand-resource pairs and a vehicle fleet, computes the optimal
    delivery order per vehicle, respecting vehicle capacity limits.
    """
    if not matched_pairs:
        return []

    # Safe access to vehicle depot
    depot = vehicles[0]["depot_location"]
    stop_locations = [depot] + [m["demand_location"] for m in matched_pairs]

    # Load (demand) per stop — depot has 0 load, each stop needs people_affected units of capacity
    demands_load = [0] + [demands_by_id[m["demand_id"]]["people_affected"] for m in matched_pairs]

    vehicle_capacities = [v["capacity"] for v in vehicles]
    distance_matrix = build_distance_matrix(stop_locations)
    num_vehicles = len(vehicles)
    depot_index = 0

    manager = pywrapcp.RoutingIndexManager(len(stop_locations), num_vehicles, depot_index)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands_load[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # no slack
        vehicle_capacities,
        True,  # start cumul to zero
        "Capacity",
    )

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        return []

    allocated_routes = []
    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        route = []
        route_distance = 0
        route_load = 0
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            route.append(node)
            route_load += demands_load[node]
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
        route.append(manager.IndexToNode(index))  # back to depot

        # Only add routing results if the vehicle actually visited any demand node
        if len(route) > 2:
            allocated_routes.append({
                "vehicle_id": vehicles[vehicle_id]["id"],
                "route_stops": route,
                "distance_meters": route_distance,
                "total_load": route_load,
                "capacity": vehicles[vehicle_id]["capacity"]
            })
            
    return allocated_routes
