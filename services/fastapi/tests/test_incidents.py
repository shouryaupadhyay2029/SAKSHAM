from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_list_incidents():
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert any(inc["incidentId"] == "INC-2026-081" for inc in response.json())

def test_get_incident_by_id_and_ref():
    res_list = client.get("/api/v1/incidents")
    inc_item = next(inc for inc in res_list.json() if inc["incidentId"] == "INC-2026-081")
    inc_uuid = inc_item["id"]
    
    # Get by UUID
    res_uuid = client.get(f"/api/v1/incidents/{inc_uuid}")
    assert res_uuid.status_code == 200
    assert res_uuid.json()["incidentId"] == "INC-2026-081"

    # Get by Reference ID
    res_ref = client.get("/api/v1/incidents/INC-2026-081")
    assert res_ref.status_code == 200
    assert res_ref.json()["id"] == inc_uuid

def test_create_incident():
    payload = {
        "title": "Waterlogging in Block D Lajpat Nagar",
        "description": "Rising water levels blocking street accesses.",
        "type": "FLOOD",
        "location": "Lajpat Nagar Block D, South Delhi",
        "latitude": 28.5678,
        "longitude": 77.2435,
        "region": "South Delhi",
        "severity": "HIGH",
        "affectedPeople": 450,
        "displacedPeople": 80
    }
    response = client.post("/api/v1/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Waterlogging in Block D Lajpat Nagar"
    assert data["incidentId"].startswith("INC-2026-")
    assert data["status"] == "REPORTED"

def test_incident_state_transitions():
    payload = {
        "title": "Incident state transition test",
        "description": "Transition description",
        "type": "ACCIDENT",
        "location": "Location",
        "latitude": 28.5,
        "longitude": 77.2,
        "region": "West Delhi",
        "severity": "LOW"
    }
    created = client.post("/api/v1/incidents", json=payload).json()
    inc_id = created["id"]

    # REPORTED -> VERIFIED is valid
    res_valid = client.patch(f"/api/v1/incidents/{inc_id}", json={"status": "VERIFIED"})
    assert res_valid.status_code == 200
    assert res_valid.json()["status"] == "VERIFIED"

    # VERIFIED -> RESOLVED is invalid
    res_invalid = client.patch(f"/api/v1/incidents/{inc_id}", json={"status": "RESOLVED"})
    assert res_invalid.status_code == 409
    assert res_invalid.json()["error"]["code"] == "INVALID_STATE_TRANSITION"
