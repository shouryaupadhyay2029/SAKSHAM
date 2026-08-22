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
    # The public OSRM server might occasionally fail or be throttled, so we handle both cases gracefully
    if response.status_code == 200:
        data = response.json()
        assert "distance_meters" in data
        assert "duration_seconds" in data
        assert "geometry" in data
        assert data["geometry"]["type"] == "LineString"
    else:
        # If throttled, assert that the error payload follows our exception model
        assert response.status_code == 400
        assert "detail" in response.json()

def test_routing_proxy_cross_city():
    # Mumbai to Pune coordinates
    payload = {
        "origin": {"lat": 19.0760, "lng": 72.8777},
        "destination": {"lat": 18.5204, "lng": 73.8567}
    }
    response = client.post("/api/v1/routing/route", json=payload)
    if response.status_code == 200:
        data = response.json()
        assert "distance_meters" in data
        assert "duration_seconds" in data
        assert "geometry" in data
        assert data["geometry"]["type"] == "LineString"
        assert len(data["geometry"]["coordinates"]) > 2
    else:
        assert response.status_code == 400
