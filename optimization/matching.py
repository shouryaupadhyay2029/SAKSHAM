import math
from scipy.optimize import linear_sum_assignment
from sample_data import demands, resources


def haversine_distance(coord1, coord2):
    """Straight-line distance in km between two (lat, lng) points."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371  # Earth radius in km

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def build_cost_matrix(demands, resources):
    """
    Build a cost matrix: rows = demands, columns = resources.
    Lower cost = better match. Incompatible type = very high cost (effectively blocked).
    Cost factors in distance and inversely weights severity (more severe = should cost less to match).
    """
    n_demands = len(demands)
    n_resources = len(resources)
    cost_matrix = [[0.0] * n_resources for _ in range(n_demands)]

    for i, d in enumerate(demands):
        for j, r in enumerate(resources):
            if d["resource_type"] != r["resource_type"]:
                cost_matrix[i][j] = 1e6  # effectively disallow mismatched types
                continue

            distance_km = haversine_distance(d["location"], r["location"])
            severity_weight = 1 / d["severity"]  # higher severity -> lower cost -> prioritized
            cost_matrix[i][j] = distance_km * severity_weight

    return cost_matrix


def match_demands_to_resources(demands, resources):
    """
    Runs the assignment problem solver and returns matched pairs.
    """
    cost_matrix = build_cost_matrix(demands, resources)
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    matches = []
    for i, j in zip(row_ind, col_ind):
        if cost_matrix[i][j] >= 1e6:
            continue  # skip invalid/mismatched pairs
        matches.append({
            "demand_id": demands[i]["id"],
            "resource_id": resources[j]["id"],
            "resource_type": demands[i]["resource_type"],
            "distance_km": round(haversine_distance(demands[i]["location"], resources[j]["location"]), 2),
            "demand_location": demands[i]["location"],
            "resource_location": resources[j]["location"],
        })
    return matches


if __name__ == "__main__":
    result = match_demands_to_resources(demands, resources)
    for m in result:
        print(m)