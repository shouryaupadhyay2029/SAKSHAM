import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.models import VehicleModel, AllocationModel, IncidentModel, DemandRequestModel, OfficerModel
from app.schemas.dispatch import DispatchStatus

client = TestClient(app)

@pytest.fixture(scope="module")
def tokens():
    # Elevate operator to National jurisdiction to pass regional check
    db = SessionLocal()
    op = db.query(OfficerModel).filter(OfficerModel.email == "operator@saksham.demo").first()
    if op:
        op.region = "National"
        db.commit()
    db.close()

    # Login as operator
    op_resp = client.post("/api/v1/auth/login", json={"email": "operator@saksham.demo", "password": "Password@123"})
    # Login as regional authority
    auth_resp = client.post("/api/v1/auth/login", json={"email": "authority@saksham.demo", "password": "Password@123"})
    
    return {
        "operator": op_resp.json()["accessToken"],
        "authority": auth_resp.json()["accessToken"]
    }

def test_unauthorized_dispatch_operations():
    # Missing JWT
    response = client.get("/api/v1/dispatch")
    assert response.status_code == 401
    
    # Create with missing JWT
    response = client.post("/api/v1/dispatch", json={})
    assert response.status_code == 401

def test_dispatch_execution_flow(tokens):
    db = SessionLocal()
    try:
        # 1. Fetch seeded vehicle and allocation
        # VEH-TR-102 is Heavy Duty Cargo Truck B (AVAILABLE)
        vehicle = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        assert vehicle is not None
        
        allocation = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()
        assert allocation is not None

        # Reset states for testing
        vehicle.status = "AVAILABLE"
        allocation.status = "APPROVED"
        db.commit()

        # 2. Create dispatch from approved allocation (Operator role has access)
        headers = {"Authorization": f"Bearer {tokens['operator']}"}
        payload = {
            "allocationId": str(allocation.id),
            "vehicleId": str(vehicle.id),
            "assignedOfficerId": "OFF-101",
            "plannedDeparture": "2026-08-19T12:00:00Z",
            "eta": "2026-08-19T13:00:00Z",
            "notes": "Emergency relief delivery"
        }
        
        response = client.post("/api/v1/dispatch", json=payload, headers=headers)
        assert response.status_code == 201
        dispatch_data = response.json()
        assert dispatch_data["status"] == "PLANNED"
        dispatch_id = dispatch_data["id"]

        # Verify vehicle status is DISPATCHED
        db.refresh(vehicle)
        assert vehicle.status == "DISPATCHED"

        # Verify allocation status is DISPATCHED
        db.refresh(allocation)
        assert allocation.status == "DISPATCHED"

        # 3. Prevent duplicate active vehicle assignment
        # Reset allocation status temporarily back to APPROVED to check vehicle status constraint
        allocation.status = "APPROVED"
        db.commit()
        
        # Try to create another dispatch with the same vehicle
        response2 = client.post("/api/v1/dispatch", json=payload, headers=headers)
        assert response2.status_code == 409
        assert response2.json()["error"]["code"] == "VEHICLE_UNAVAILABLE"

        # Restore allocation status back to DISPATCHED for rest of state machine
        allocation.status = "DISPATCHED"
        db.commit()

        # 4. State transitions: PLANNED -> READY
        resp_ready = client.patch(
            f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=READY", 
            headers=headers
        )
        assert resp_ready.status_code == 200
        assert resp_ready.json()["status"] == "READY"

        # 5. State transitions: READY -> DISPATCHED
        resp_disp = client.patch(
            f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=DISPATCHED", 
            headers=headers
        )
        assert resp_disp.status_code == 200
        assert resp_disp.json()["status"] == "DISPATCHED"
        assert resp_disp.json()["actualDeparture"] is not None

        # 6. State transitions: DISPATCHED -> EN_ROUTE
        resp_route = client.patch(
            f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=EN_ROUTE", 
            headers=headers
        )
        assert resp_route.status_code == 200
        assert resp_route.json()["status"] == "EN_ROUTE"

        # 7. State transitions: EN_ROUTE -> ARRIVED
        resp_arr = client.patch(
            f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=ARRIVED", 
            headers=headers
        )
        assert resp_arr.status_code == 200
        assert resp_arr.json()["status"] == "ARRIVED"
        assert resp_arr.json()["actualArrival"] is not None

        # 8. State transitions: ARRIVED -> COMPLETED
        resp_comp = client.patch(
            f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=COMPLETED", 
            headers=headers
        )
        assert resp_comp.status_code == 200
        assert resp_comp.json()["status"] == "COMPLETED"
        assert resp_comp.json()["completionTime"] is not None

        # Verify vehicle status is released back to AVAILABLE
        db.refresh(vehicle)
        assert vehicle.status == "AVAILABLE"

    finally:
        db.close()

def test_invalid_state_transition(tokens):
    db = SessionLocal()
    try:
        # VEH-TR-102 is Heavy Duty Cargo Truck B (AVAILABLE)
        vehicle = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        allocation = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()
        
        vehicle.status = "AVAILABLE"
        allocation.status = "APPROVED"
        db.commit()

        headers = {"Authorization": f"Bearer {tokens['operator']}"}
        payload = {
            "allocationId": str(allocation.id),
            "vehicleId": str(vehicle.id),
            "assignedOfficerId": "OFF-101",
            "plannedDeparture": "2026-08-19T12:00:00Z",
            "eta": "2026-08-19T13:00:00Z",
            "notes": "Invalid transition test"
        }
        
        response = client.post("/api/v1/dispatch", json=payload, headers=headers)
        dispatch_id = response.json()["id"]

        # Try invalid direct transition: PLANNED -> COMPLETED
        resp_invalid = client.patch(
            f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=COMPLETED",
            headers=headers
        )
        assert resp_invalid.status_code == 409
        assert resp_invalid.json()["error"]["code"] == "INVALID_STATE_TRANSITION"

    finally:
        db.close()

def test_regional_authorization_enforced(tokens):
    db = SessionLocal()
    try:
        # Let's check regional verification
        # Rajesh (operator) belongs to "Delhi NCR" which doesn't match East Delhi or other regions
        # authority belongs to "East Delhi"
        # We will create an incident that belongs to "West Delhi"
        # The authority@saksham.demo (East Delhi) should be blocked from creating dispatch
        vehicle = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        allocation = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()
        
        # Verify region of incident for allocation
        demand = db.query(DemandRequestModel).filter(DemandRequestModel.id == allocation.demandId).first()
        incident = db.query(IncidentModel).filter(IncidentModel.id == demand.incidentId).first()
        
        # Change incident region to "West Delhi"
        incident.region = "West Delhi"
        vehicle.status = "AVAILABLE"
        allocation.status = "APPROVED"
        db.commit()

        # Let's request from authority (who belongs to "East Delhi")
        headers = {"Authorization": f"Bearer {tokens['authority']}"}
        payload = {
            "allocationId": str(allocation.id),
            "vehicleId": str(vehicle.id),
            "assignedOfficerId": "OFF-101",
            "plannedDeparture": "2026-08-19T12:00:00Z",
            "eta": "2026-08-19T13:00:00Z",
            "notes": "Cross region request"
        }
        
        response = client.post("/api/v1/dispatch", json=payload, headers=headers)
        # Should be forbidden (403)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"

    finally:
        db.close()
