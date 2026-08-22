"""
API Integration tests for SAKSHAM Route Optimizer FastAPI service.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Verify health check endpoint returns 200 and valid schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "saksham-optimizer"


def test_distance_matrix_endpoint():
    """Verify standalone distance matrix computation."""
    payload = {
        "locations": [
            {"id": "L1", "lat": 28.6139, "lng": 77.2090},
            {"id": "L2", "lat": 28.7041, "lng": 77.1025},
        ]
    }
    response = client.post("/api/distance-matrix", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["distances"]) == 2
    assert len(data["durations"]) == 2
    assert data["distances"][0][0] == 0.0
    assert data["distances"][0][1] > 0.0


def test_optimize_endpoint():
    """Verify full POST /api/optimize pipeline."""
    payload = {
        "depots": [
            {
                "id": "DEPOT-TEST",
                "name": "Test Warehouse",
                "lat": 28.6139,
                "lng": 77.2090,
                "vehicles": [
                    {"id": "VEH-TEST", "name": "Rapid Truck", "type": "TRUCK", "capacity": 1000}
                ]
            }
        ],
        "demandPoints": [
            {
                "id": "DEM-1",
                "name": "Relief Point 1",
                "lat": 28.6300,
                "lng": 77.2150,
                "demand": 250,
                "priority": "HIGH"
            }
        ],
        "config": {
            "maxSolveTimeSeconds": 5,
            "useOsrm": False  # Force Haversine to avoid network calls during fast CI tests
        }
    }
    response = client.post("/api/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["routes"]) == 1
    assert data["routes"][0]["vehicleId"] == "VEH-TEST"
    assert data["routes"][0]["stops"][0]["demandPointId"] == "DEM-1"
    assert data["metadata"]["status"] in ["OPTIMAL", "FEASIBLE"]
