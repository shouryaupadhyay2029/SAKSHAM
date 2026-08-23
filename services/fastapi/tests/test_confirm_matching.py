import pytest
import uuid
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.models import IncidentModel, DemandRequestModel, ResourceModel, AllocationModel, OfficerModel
from app.core.security import hash_password, create_access_token
from app.schemas.incident import IncidentStatus
from app.schemas.demand import DemandStatus, DemandPriority
from app.schemas.resource import ResourceStatus

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def seed_test_data(db_session):
    # Create test officer
    officer_id = uuid.uuid4()
    officer = OfficerModel(
        id=officer_id,
        email=f"confirm_officer_{uuid.uuid4().hex[:6]}@saksham.test",
        name="Test Confirm Officer",
        role="OPERATOR",
        region="Delhi NCR",
        passwordHash=hash_password("Password@123"),
        verificationStatus="VERIFIED",
        accountStatus="ACTIVE"
    )
    db_session.add(officer)

    # Create test prioritized incident
    inc_id = uuid.uuid4()
    inc_ref = f"INC-{uuid.uuid4().hex[:6].upper()}"
    incident = IncidentModel(
        id=inc_id,
        incidentId=inc_ref,
        type="WATER_SHORTAGE",
        title="Test Match Incident",
        description="Description",
        location="Delhi",
        latitude=28.6139,
        longitude=77.2090,
        region="WEST DELHI",
        severity="HIGH",
        status="AWAITING_MATCH", # PRIORITIZED
        affectedPeople=100,
        displacedPeople=10
    )
    db_session.add(incident)

    # Create test demand linked to incident
    dem_id = uuid.uuid4()
    dem_ref = f"DEM-{uuid.uuid4().hex[:6].upper()}"
    demand = DemandRequestModel(
        id=dem_id,
        requestId=dem_ref,
        incidentId=inc_id,
        affectedZone="West Delhi",
        requestedType="WATER",
        description="Emergency water",
        quantity=200.0,
        unit="L",
        affectedPeople=100,
        priority="HIGH",
        status="PENDING"
    )
    db_session.add(demand)

    # Create test resource depot
    res_id = uuid.uuid4()
    res_ref = f"RES-{uuid.uuid4().hex[:6].upper()}"
    resource = ResourceModel(
        id=res_id,
        resourceId=res_ref,
        materialName="WATER",
        description="Depot stocks",
        category="WATER",
        availableQuantity=500.0,
        reservedQuantity=0.0,
        unit="L",
        storageDepot="West Depot",
        location="Delhi Depot",
        latitude=28.6139,
        longitude=77.2090,
        status="AVAILABLE",
        pointOfContact="Manager"
    )
    db_session.add(resource)
    db_session.commit()

    token = create_access_token(subject=str(officer_id), role="OPERATOR", region="Delhi NCR")

    yield {
        "token": token,
        "incident": incident,
        "demand": demand,
        "resource": resource,
        "officer": officer
    }

    # Cleanup
    db_session.query(AllocationModel).filter(AllocationModel.demandId == dem_id).delete()
    db_session.query(DemandRequestModel).filter(DemandRequestModel.id == dem_id).delete()
    db_session.query(IncidentModel).filter(IncidentModel.id == inc_id).delete()
    db_session.query(ResourceModel).filter(ResourceModel.id == res_id).delete()
    db_session.query(OfficerModel).filter(OfficerModel.id == officer_id).delete()
    db_session.commit()

def test_matching_flow_authorized_officer(seed_test_data, db_session):
    # A. Authorized officer confirms match -> Success 200
    headers = {"Authorization": f"Bearer {seed_test_data['token']}"}
    payload = {
        "demandId": str(seed_test_data["demand"].id),
        "resourceId": str(seed_test_data["resource"].id),
        "quantity": 200.0
    }
    res = client.post("/api/v1/allocations/confirm", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["allocation"]["status"] == "APPROVED"
    assert data["incident"]["status"] == "MATCHED"
    assert data["demand"]["status"] == "ALLOCATED"
    assert data["resource"]["availableQuantity"] == 300.0
    assert data["resource"]["reservedQuantity"] == 200.0

def test_matching_flow_unauthorized_civilian(seed_test_data, db_session):
    # B. Unauthorized civilian -> 401/403
    # No Auth Header
    payload = {
        "demandId": str(seed_test_data["demand"].id),
        "resourceId": str(seed_test_data["resource"].id),
        "quantity": 200.0
    }
    res = client.post("/api/v1/allocations/confirm", json=payload)
    assert res.status_code == 401

    # Incident status should remain AWAITING_MATCH
    db_session.refresh(seed_test_data["incident"])
    assert seed_test_data["incident"].status == "AWAITING_MATCH"

def test_matching_flow_insufficient_quantity(seed_test_data, db_session):
    # E. Insufficient stock -> 400
    headers = {"Authorization": f"Bearer {seed_test_data['token']}"}
    payload = {
        "demandId": str(seed_test_data["demand"].id),
        "resourceId": str(seed_test_data["resource"].id),
        "quantity": 600.0 # Exceeds 500.0
    }
    res = client.post("/api/v1/allocations/confirm", json=payload, headers=headers)
    assert res.status_code == 400
    
    # Verify no partial updates happened
    db_session.refresh(seed_test_data["incident"])
    db_session.refresh(seed_test_data["resource"])
    assert seed_test_data["incident"].status == "AWAITING_MATCH"
    assert seed_test_data["resource"].availableQuantity == 500.0
    assert seed_test_data["resource"].reservedQuantity == 0.0
