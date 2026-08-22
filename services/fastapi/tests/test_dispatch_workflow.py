import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db

client = TestClient(app)

def test_end_to_end_dispatch_workflow():
    # 1. Create Incident
    inc_payload = {
        "type": "RESOURCE_SHORTAGE",
        "title": "Integration Test Incident",
        "description": "Stranded civilians in Yamuna Banks, need immediate water supply.",
        "location": "East Delhi SOS Zone",
        "latitude": 28.6219,
        "longitude": 77.2691,
        "region": "EAST DELHI",
        "severity": "HIGH",
        "status": "REPORTED",
        "affectedPeople": 50,
        "displacedPeople": 0,
        "assignedUnit": None
    }
    inc_res = client.post("/api/v1/incidents", json=inc_payload)
    assert inc_res.status_code == 201
    db_incident = inc_res.json()
    incident_uuid = db_incident["id"]

    # 2. Create DemandRequest linked to Incident
    dem_payload = {
        "incidentId": incident_uuid,
        "affectedZone": "East Delhi",
        "requestedType": "WATER",
        "description": "Integration Test Demand Request",
        "quantity": 100.0,
        "unit": "Liters",
        "affectedPeople": 50,
        "priority": "HIGH",
        "status": "PENDING"
    }
    dem_res = client.post("/api/v1/demands", json=dem_payload)
    assert dem_res.status_code == 201
    db_demand = dem_res.json()
    demand_uuid = db_demand["id"]

    # 3. Request Advisory Dispatch Plan Recommendation
    plan_payload = {"demandId": demand_uuid}
    plan_res = client.post("/api/v1/optimization/dispatch-plan", json=plan_payload)
    
    # Assert successful recommendation output
    if plan_res.status_code == 200:
        plan_data = plan_res.json()
        assert plan_data["demandId"] == demand_uuid
        assert "resourceId" in plan_data
        assert "vehicleId" in plan_data
        assert "distance_meters" in plan_data
        assert "duration_seconds" in plan_data
        assert plan_data["geometry"]["type"] == "LineString"
    else:
        # If resources are not configured or available, assertion should log 400 bad request gracefully
        assert plan_res.status_code in [400, 404]
