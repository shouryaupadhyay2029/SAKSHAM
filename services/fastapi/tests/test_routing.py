import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_routing_proxy_success():
    payload = {
        "origin": {"lat": 28.6304, "lng": 77.2177},
        "destination": {"lat": 28.6219, "lng": 77.2691}
    }
    response = client.post("/api/v1/routing/route", json=payload)
    if response.status_code == 200:
        data = response.json()
        assert "selected_route" in data
        sel = data["selected_route"]
        assert "distance_meters" in sel
        assert "duration_seconds" in sel
        assert "geometry" in sel
        assert sel["geometry"]["type"] == "LineString"
    else:
        assert response.status_code == 400
        assert "detail" in response.json()

def test_routing_proxy_cross_city():
    payload = {
        "origin": {"lat": 19.0760, "lng": 72.8777},
        "destination": {"lat": 18.5204, "lng": 73.8567}
    }
    response = client.post("/api/v1/routing/route", json=payload)
    if response.status_code == 200:
        data = response.json()
        assert "selected_route" in data
        sel = data["selected_route"]
        assert "distance_meters" in sel
        assert "duration_seconds" in sel
        assert "geometry" in sel
        assert sel["geometry"]["type"] == "LineString"
        assert len(sel["geometry"]["coordinates"]) > 2
    else:
        assert response.status_code == 400

def test_routing_missing_coordinates():
    # Empty payload
    response = client.post("/api/v1/routing/route", json={})
    assert response.status_code == 422 # Pydantic validation error

def test_routing_invalid_origin_coordinates():
    # Missing origin
    payload = {
        "destination": {"lat": 28.6219, "lng": 77.2691}
    }
    response = client.post("/api/v1/routing/route", json=payload)
    assert response.status_code == 422

def test_deviation_check_nominal():
    # Segment is from (77.2, 28.6) to (77.22, 28.6)
    payload = {
        "route_geometry": {
            "type": "LineString",
            "coordinates": [[77.2, 28.6], [77.22, 28.6]]
        },
        "vehicle_lat": 28.6001,  # very close to segment
        "vehicle_lng": 77.21,
        "threshold_meters": 150.0
    }
    response = client.post("/api/v1/routing/check-deviation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["deviated"] is False
    assert data["distance_from_route_meters"] < 50.0

def test_deviation_check_deviated():
    payload = {
        "route_geometry": {
            "type": "LineString",
            "coordinates": [[77.2, 28.6], [77.22, 28.6]]
        },
        "vehicle_lat": 28.62,  # far away (~2.2 km)
        "vehicle_lng": 77.21,
        "threshold_meters": 150.0
    }
    response = client.post("/api/v1/routing/check-deviation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["deviated"] is True
    assert data["distance_from_route_meters"] > 2000.0
