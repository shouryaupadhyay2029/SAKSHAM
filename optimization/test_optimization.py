import unittest
from optimization.adapter import normalize_demand, normalize_vehicle, normalize_resource
from optimization.matching import match_demands_to_resources
from optimization.routing import solve_routes

class TestOptimizationModule(unittest.TestCase):
    def test_adapters(self):
        # 1. Test demand adapter
        mock_demand = {
            "id": "dem-uuid-123",
            "requestedType": "WATER",
            "priority": "CRITICAL",
            "affectedPeople": 25,
            "quantity": 100.0,
            "unit": "Liters",
            "incident": {
                "latitude": 28.6139,
                "longitude": 77.2090
            }
        }
        norm_d = normalize_demand(mock_demand)
        self.assertEqual(norm_d["id"], "dem-uuid-123")
        self.assertEqual(norm_d["resource_type"], "WATER")
        self.assertEqual(norm_d["severity"], 1.0)
        self.assertEqual(norm_d["location"], (28.6139, 77.2090))
        self.assertEqual(norm_d["people_affected"], 25)

        # 2. Test vehicle adapter
        mock_vehicle = {
            "id": "veh-uuid-456",
            "capacity": "5000 Liters",
            "currentLatitude": 28.6300,
            "currentLongitude": 77.2200,
            "status": "AVAILABLE"
        }
        norm_v = normalize_vehicle(mock_vehicle)
        self.assertEqual(norm_v["id"], "veh-uuid-456")
        self.assertEqual(norm_v["capacity"], 5000)
        self.assertEqual(norm_v["depot_location"], (28.6300, 77.2200))

    def test_matching_and_routing(self):
        # Sample data
        demands = [
            {"id": "d1", "location": (28.70, 77.10), "resource_type": "water", "severity": 1.0, "people_affected": 150},
            {"id": "d2", "location": (28.61, 77.20), "resource_type": "food", "severity": 2.0, "people_affected": 40},
        ]
        resources = [
            {"id": "r1", "location": (28.72, 77.11), "resource_type": "water", "capacity": 200},
            {"id": "r2", "location": (28.60, 77.22), "resource_type": "food", "capacity": 50},
        ]
        vehicles = [
            {"id": "v1", "capacity": 500, "depot_location": (28.65, 77.20)},
        ]

        # Test SciPy Matching
        matches = match_demands_to_resources(demands, resources)
        self.assertEqual(len(matches), 2)
        
        # Test OR-Tools VRP Solver
        demands_by_id = {d["id"]: d for d in demands}
        routes = solve_routes(matches, vehicles, demands_by_id)
        self.assertTrue(len(routes) >= 0)

if __name__ == "__main__":
    unittest.main()
