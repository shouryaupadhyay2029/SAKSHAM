"""
test_incidents.py
==================
Basic CRUD and state-transition tests for the /incidents endpoint.

INC-2026-999 is seeded by conftest.py (legacy_seed fixture).
"""
import uuid
import bcrypt as _bcrypt
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.core.models import OfficerModel
from app.core.security import create_access_token

client = TestClient(app)


def _officer_token() -> str:
    db = next(get_db())
    pw_hash = _bcrypt.hashpw(b"test-password", _bcrypt.gensalt()).decode("utf-8")
    officer = OfficerModel(
        id=uuid.uuid4(),
        email=f"inc_test_{uuid.uuid4().hex[:8]}@saksham.test",
        name="Incidents Test Officer",
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


def test_list_incidents():
    """GET /incidents is public and must return at least the seeded INC-2026-999."""
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # INC-2026-999 is seeded via conftest.py legacy_seed fixture
    assert any(inc["incidentId"] == "INC-2026-999" for inc in data), (
        "Expected seeded INC-2026-999 in incident list"
    )


def test_get_incident_by_id_and_ref():
    """Both UUID and reference-ID lookups must return the same incident."""
    res_list = client.get("/api/v1/incidents")
    assert res_list.status_code == 200
    inc_item = next(
        (inc for inc in res_list.json() if inc["incidentId"] == "INC-2026-999"),
        None,
    )
    assert inc_item is not None, "INC-2026-999 must be in the list (seeded by conftest)"
    inc_uuid = inc_item["id"]

    # Get by UUID
    res_uuid = client.get(f"/api/v1/incidents/{inc_uuid}")
    assert res_uuid.status_code == 200
    assert res_uuid.json()["incidentId"] == "INC-2026-999"

    # Get by Reference ID
    res_ref = client.get("/api/v1/incidents/INC-2026-999")
    assert res_ref.status_code == 200
    assert res_ref.json()["id"] == inc_uuid


def test_create_incident():
    """POST /incidents is public (civilian SOS)."""
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
        "displacedPeople": 80,
    }
    response = client.post("/api/v1/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Waterlogging in Block D Lajpat Nagar"
    assert data["incidentId"].startswith("INC-2026-")
    assert data["status"] == "REPORTED"


def test_incident_state_transitions():
    """PATCH /incidents requires an officer JWT."""
    payload = {
        "title": "Incident state transition test",
        "description": "Transition description",
        "type": "ACCIDENT",
        "location": "Location",
        "latitude": 28.5,
        "longitude": 77.2,
        "region": "West Delhi",
        "severity": "LOW",
    }
    created = client.post("/api/v1/incidents", json=payload).json()
    inc_id = created["id"]

    token = _officer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # REPORTED -> VERIFIED is valid
    res_valid = client.patch(f"/api/v1/incidents/{inc_id}", json={"status": "VERIFIED"}, headers=headers)
    assert res_valid.status_code == 200, res_valid.text
    assert res_valid.json()["status"] == "VERIFIED"

    # VERIFIED -> RESOLVED is an invalid skip transition
    res_invalid = client.patch(f"/api/v1/incidents/{inc_id}", json={"status": "RESOLVED"}, headers=headers)
    assert res_invalid.status_code == 409
    assert res_invalid.json()["error"]["code"] == "INVALID_STATE_TRANSITION"
