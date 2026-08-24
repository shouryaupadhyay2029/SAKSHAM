import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.models import OfficerModel
import bcrypt as _bcrypt
import datetime

client = TestClient(app)

def _get_auth_headers(role: str = None) -> dict:
    if not role:
        return {}
    
    db = next(get_db())
    pw_hash = _bcrypt.hashpw(b"test-password", _bcrypt.gensalt()).decode("utf-8")
    
    # If role is CIVILIAN, we can forge a token with role = CIVILIAN
    # since civilian does not exist in the Officer DB table (which is restricted to Officer enum)
    if role == "CIVILIAN":
        token = create_access_token(subject=str(uuid.uuid4()), role="CIVILIAN")
    else:
        # DB-backed officer
        officer = OfficerModel(
            id=uuid.uuid4(),
            email=f"test_auth_{uuid.uuid4().hex[:8]}@saksham.test",
            name="Test Auth Officer",
            role=role,
            region="EAST DELHI",
            passwordHash=pw_hash,
            verificationStatus="VERIFIED",
            accountStatus="ACTIVE",
            createdAt=datetime.datetime.utcnow(),
            updatedAt=datetime.datetime.utcnow(),
        )
        db.add(officer)
        db.commit()
        token = create_access_token(subject=str(officer.id), role=officer.role, region=officer.region)
    
    db.close()
    return {"Authorization": f"Bearer {token}"}

# Test 1: Unauthenticated user -> POST /vehicles -> 401
def test_unauthenticated_post_vehicles():
    res = client.post("/api/v1/vehicles", json={})
    assert res.status_code == 401

# Test 2: Authenticated CIVILIAN -> POST /vehicles -> 403
def test_civilian_post_vehicles():
    headers = _get_auth_headers("CIVILIAN")
    res = client.post("/api/v1/vehicles", json={}, headers=headers)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"

# Test 3: Authenticated CIVILIAN -> POST /resources -> 403
def test_civilian_post_resources():
    headers = _get_auth_headers("CIVILIAN")
    res = client.post("/api/v1/resources", json={}, headers=headers)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"

# Test 4: Authenticated CIVILIAN -> POST /shelters -> 403
def test_civilian_post_shelters():
    headers = _get_auth_headers("CIVILIAN")
    res = client.post("/api/v1/shelters", json={}, headers=headers)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"

# Test 5: Authenticated OFFICER -> POST /vehicles -> success (validation error is ok as long as auth passes)
def test_officer_post_vehicles():
    headers = _get_auth_headers("OPERATOR")
    # Send empty payload to see if we get validation error (422) or forbidden (403)
    # 422 means authentication & authorization passed successfully!
    res = client.post("/api/v1/vehicles", json={}, headers=headers)
    assert res.status_code == 422

# Test 6: Authenticated OFFICER -> POST /resources -> success
def test_officer_post_resources():
    headers = _get_auth_headers("OPERATOR")
    res = client.post("/api/v1/resources", json={}, headers=headers)
    assert res.status_code == 422

# Test 7: Authenticated OFFICER -> POST /shelters -> success
def test_officer_post_shelters():
    headers = _get_auth_headers("OPERATOR")
    res = client.post("/api/v1/shelters", json={}, headers=headers)
    assert res.status_code == 422
