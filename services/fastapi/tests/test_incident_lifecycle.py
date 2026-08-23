import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_incident_status_verification_persistence_workflow():
    # 1. Create Incident in REPORTED status
    inc_payload = {
        "type": "FLOOD",
        "title": "UAT Lifecycle Test Incident",
        "description": "Test incident for verification status transition and database persistence.",
        "location": "Yamuna Banks, East Delhi",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "region": "EAST DELHI",
        "severity": "HIGH",
        "status": "REPORTED",
        "affectedPeople": 10,
        "displacedPeople": 0,
        "assignedUnit": None
    }
    
    create_res = client.post("/api/v1/incidents", json=inc_payload)
    assert create_res.status_code == 201
    db_incident = create_res.json()
    incident_uuid = db_incident["id"]
    assert db_incident["status"] == "REPORTED"

    # 2. Transition from REPORTED to VERIFIED via PATCH
    update_payload = {"status": "VERIFIED"}
    update_res = client.patch(f"/api/v1/incidents/{incident_uuid}", json=update_payload)
    assert update_res.status_code == 200
    updated_incident = update_res.json()
    assert updated_incident["status"] == "VERIFIED"

    # 3. Retrieve incident again to verify database persistence
    get_res = client.get(f"/api/v1/incidents/{incident_uuid}")
    assert get_res.status_code == 200
    persisted_incident = get_res.json()
    assert persisted_incident["status"] == "VERIFIED"

    # 4. Verify that an invalid transition fails (e.g. going from VERIFIED back to REPORTED)
    invalid_payload = {"status": "REPORTED"}
    invalid_res = client.patch(f"/api/v1/incidents/{incident_uuid}", json=invalid_payload)
    # The API should reject this invalid state machine transition with 409 Conflict
    assert invalid_res.status_code == 409
