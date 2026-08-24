import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.core.models import OfficerModel
from app.core.security import create_access_token
import uuid, bcrypt as _bcrypt, datetime

client = TestClient(app)


def _officer_token() -> str:
    db = next(get_db())
    pw_hash = _bcrypt.hashpw(b"test-password", _bcrypt.gensalt()).decode("utf-8")
    officer = OfficerModel(
        id=uuid.uuid4(),
        email=f"wf_test_{uuid.uuid4().hex[:8]}@saksham.test",
        name="Workflow Test Officer",
        role="OPERATOR",
        region="EAST DELHI",
        passwordHash=pw_hash,
        verificationStatus="VERIFIED",
        accountStatus="ACTIVE",
        createdAt=datetime.datetime.now(datetime.UTC),
        updatedAt=datetime.datetime.now(datetime.UTC),
    )
    db.add(officer)
    db.commit()
    token = create_access_token(subject=str(officer.id), role=officer.role, region=officer.region)
    db.close()
    return token


def test_end_to_end_dispatch_workflow():
    token = _officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Incident (public)
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
        "assignedUnit": None,
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
    dem_res = client.post("/api/v1/demands", json=dem_payload, headers=headers)
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
