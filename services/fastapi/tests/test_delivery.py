import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.models import VehicleModel, AllocationModel, IncidentModel, DemandRequestModel, ResourceModel, DispatchModel, OfficerModel, DeliveryModel
from app.schemas.delivery import DeliveryStatus

client = TestClient(app)

@pytest.fixture(scope="module")
def tokens():
    # Elevate operator to National jurisdiction to pass regional check
    db = SessionLocal()
    op = db.query(OfficerModel).filter(OfficerModel.email == "operator@saksham.demo").first()
    if op:
        op.region = "National"
    auth = db.query(OfficerModel).filter(OfficerModel.email == "authority@saksham.demo").first()
    if auth:
        auth.region = "East Delhi"
    db.commit()
    db.close()

    # Logins
    op_resp = client.post("/api/v1/auth/login", json={"email": "operator@saksham.demo", "password": "Password@123"})
    auth_resp = client.post("/api/v1/auth/login", json={"email": "authority@saksham.demo", "password": "Password@123"})
    
    return {
        "operator": op_resp.json()["accessToken"],
        "authority": auth_resp.json()["accessToken"]
    }

def test_unauthorized_delivery_operations():
    # Missing JWT
    response = client.get("/api/v1/delivery")
    assert response.status_code == 401
    
    response = client.post("/api/v1/delivery", json={})
    assert response.status_code == 401

def test_delivery_execution_flow(tokens):
    db = SessionLocal()
    try:
        # 1. Setup matching approved allocation and vehicle
        vehicle = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        allocation = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()

        # Reset resource availability dynamically from the allocation
        res = db.query(ResourceModel).filter(ResourceModel.id == allocation.resourceId).first()
        if res:
            res.availableQuantity = 200.0
            res.reservedQuantity = 0.0
            db.commit()
        
        vehicle.status = "AVAILABLE"
        allocation.status = "APPROVED"
        db.commit()

        # 2. Create Dispatch
        headers = {"Authorization": f"Bearer {tokens['operator']}"}
        payload_dispatch = {
            "allocationId": str(allocation.id),
            "vehicleId": str(vehicle.id),
            "assignedOfficerId": "OFF-101",
            "plannedDeparture": "2026-08-19T12:00:00Z",
            "eta": "2026-08-19T13:00:00Z",
            "notes": "Relief dispatch for delivery tests"
        }
        
        dispatch_resp = client.post("/api/v1/dispatch", json=payload_dispatch, headers=headers)
        assert dispatch_resp.status_code == 201
        dispatch_id = dispatch_resp.json()["id"]

        # Transition dispatch to ARRIVED so it's ready for delivery
        client.patch(f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=READY", headers=headers)
        client.patch(f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=DISPATCHED", headers=headers)
        client.patch(f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=EN_ROUTE", headers=headers)
        client.patch(f"/api/v1/dispatch/{dispatch_id}/status?nextStatus=ARRIVED", headers=headers)

        # 3. Create Delivery (from operator with National scope)
        payload_delivery = {
            "dispatchId": dispatch_id,
            "quantity": 50.0,
            "unit": "Kits",
            "notes": "Primary delivery test case"
        }
        
        response = client.post("/api/v1/delivery", json=payload_delivery, headers=headers)
        assert response.status_code == 201
        delivery_data = response.json()
        assert delivery_data["status"] == "PENDING"
        delivery_id = delivery_data["id"]

        # 4. State transitions: PENDING -> IN_TRANSIT
        resp_transit = client.patch(
            f"/api/v1/delivery/{delivery_id}/status",
            json={"status": "IN_TRANSIT"},
            headers=headers
        )
        assert resp_transit.status_code == 200
        assert resp_transit.json()["status"] == "IN_TRANSIT"

        # 5. State transitions: IN_TRANSIT -> ARRIVED
        resp_arrived = client.patch(
            f"/api/v1/delivery/{delivery_id}/status",
            json={"status": "ARRIVED"},
            headers=headers
        )
        assert resp_arrived.status_code == 200
        assert resp_arrived.json()["status"] == "ARRIVED"

        # 6. Verify Delivery (record verified quantities and notes)
        verify_payload = {
            "verifiedQuantity": 50.0,
            "notes": "Verified all 50 medical kits in good condition",
            "recipientName": "Dr. Aditi Sharma"
        }
        resp_verify = client.post(
            f"/api/v1/delivery/{delivery_id}/verify",
            json=verify_payload,
            headers=headers
        )
        assert resp_verify.status_code == 200
        assert resp_verify.json()["status"] == "VERIFIED"
        assert resp_verify.json()["receivedBy"] == "Dr. Aditi Sharma"

        # Fetch actual dispatch quantity to ensure overlimit check exceeds it
        disp_obj = db.query(DispatchModel).filter(DispatchModel.id == dispatch_id).first()
        disp_qty = disp_obj.quantity if disp_obj.quantity is not None else 50.0

        # Verify quantities consistency: should prevent exceeding verified quantities
        overlimit_verify_payload = {
            "verifiedQuantity": disp_qty + 50.0,
            "notes": "Illegal count"
        }
        resp_overlimit = client.post(
            f"/api/v1/delivery/{delivery_id}/verify",
            json=overlimit_verify_payload,
            headers=headers
        )
        assert resp_overlimit.status_code == 400

        # 7. Complete Delivery (updates resource inventories atomically)
        # Check initial resource counts
        db.refresh(res)
        initial_avail = res.availableQuantity
        
        resp_complete = client.post(
            f"/api/v1/delivery/{delivery_id}/complete",
            headers=headers
        )
        assert resp_complete.status_code == 200
        assert resp_complete.json()["status"] == "COMPLETED"

        # Verify inventory consistency updates
        db.commit() # End current transaction snapshot to read committed changes
        db.refresh(res)
        assert res.availableQuantity == initial_avail - 50.0

    finally:
        # Tear down created entities to restore database consistency
        db.query(DeliveryModel).delete()
        db.query(DispatchModel).delete()
        
        alloc = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()
        if alloc:
            alloc.status = "APPROVED"
            
        veh = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        if veh:
            veh.status = "AVAILABLE"
            veh.currentMission = None
            
        if alloc:
            res = db.query(ResourceModel).filter(ResourceModel.id == alloc.resourceId).first()
            if res:
                res.availableQuantity = 200.0
                res.reservedQuantity = 0.0
            
        db.commit()
        db.close()

def test_wrong_region_creation(tokens):
    db = SessionLocal()
    try:
        # Create incident in West Delhi
        incident = db.query(IncidentModel).filter(IncidentModel.incidentId == "INC-2026-081").first()
        incident.region = "West Delhi"
        db.commit()

        # Setup vehicle and allocation
        vehicle = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        allocation = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()
        vehicle.status = "AVAILABLE"
        allocation.status = "APPROVED"
        db.commit()

        # Create dispatch and set status to ARRIVED
        headers_op = {"Authorization": f"Bearer {tokens['operator']}"}
        payload_dispatch = {
            "allocationId": str(allocation.id),
            "vehicleId": str(vehicle.id),
            "assignedOfficerId": "OFF-101",
            "plannedDeparture": "2026-08-19T12:00:00Z",
            "eta": "2026-08-19T13:00:00Z",
            "notes": "Relief dispatch for delivery tests"
        }
        dispatch_resp = client.post("/api/v1/dispatch", json=payload_dispatch, headers=headers_op)
        assert dispatch_resp.status_code == 201
        dispatch_id = dispatch_resp.json()["id"]

        db_disp = db.query(DispatchModel).filter(DispatchModel.id == dispatch_id).first()
        db_disp.status = "ARRIVED"
        db.commit()

        # Authority token has region "East Delhi", which mismatch West Delhi!
        headers = {"Authorization": f"Bearer {tokens['authority']}"}
        payload = {
            "dispatchId": str(dispatch_id),
            "quantity": 10.0,
            "unit": "Kits",
            "notes": "Unauthorized region test"
        }
        
        response = client.post("/api/v1/delivery", json=payload, headers=headers)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"

    finally:
        # Tear down created dispatch to restore DB state
        db.query(DeliveryModel).delete()
        db.query(DispatchModel).delete()
        
        alloc = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()
        if alloc:
            alloc.status = "APPROVED"
            
        veh = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        if veh:
            veh.status = "AVAILABLE"
            veh.currentMission = None
            
        db.commit()
        db.close()

def test_invalid_state_transition(tokens):
    db = SessionLocal()
    try:
        # Setup matching approved allocation and vehicle
        vehicle = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        allocation = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()
        
        vehicle.status = "AVAILABLE"
        allocation.status = "APPROVED"
        db.commit()

        # Create dispatch and set status to ARRIVED
        headers_op = {"Authorization": f"Bearer {tokens['operator']}"}
        payload_dispatch = {
            "allocationId": str(allocation.id),
            "vehicleId": str(vehicle.id),
            "assignedOfficerId": "OFF-101",
            "plannedDeparture": "2026-08-19T12:00:00Z",
            "eta": "2026-08-19T13:00:00Z",
            "notes": "Relief dispatch for delivery tests"
        }
        dispatch_resp = client.post("/api/v1/dispatch", json=payload_dispatch, headers=headers_op)
        assert dispatch_resp.status_code == 201
        dispatch_id = dispatch_resp.json()["id"]

        db_disp = db.query(DispatchModel).filter(DispatchModel.id == dispatch_id).first()
        db_disp.status = "ARRIVED"
        db.commit()
        
        # Operator has access
        headers = {"Authorization": f"Bearer {tokens['operator']}"}
        payload = {
            "dispatchId": str(dispatch_id),
            "quantity": 1.0,
            "unit": "Units",
            "notes": "Invalid transition checking delivery"
        }
        response = client.post("/api/v1/delivery", json=payload, headers=headers)
        assert response.status_code == 201
        delivery_id = response.json()["id"]

        # Attempt direct illegal transition PENDING -> COMPLETED
        resp_invalid = client.patch(
            f"/api/v1/delivery/{delivery_id}/status",
            json={"status": "COMPLETED"},
            headers=headers
        )
        assert resp_invalid.status_code == 409
        assert resp_invalid.json()["error"]["code"] == "INVALID_STATE_TRANSITION"

        # Cancel the delivery
        resp_cancel = client.post(
            f"/api/v1/delivery/{delivery_id}/cancel",
            headers=headers
        )
        assert resp_cancel.status_code == 200
        assert resp_cancel.json()["status"] == "CANCELLED"

    finally:
        # Tear down created dispatch and delivery to restore DB state
        db.query(DeliveryModel).delete()
        db.query(DispatchModel).delete()
        
        alloc = db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first()
        if alloc:
            alloc.status = "APPROVED"
            
        veh = db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first()
        if veh:
            veh.status = "AVAILABLE"
            veh.currentMission = None
            
        db.commit()
        db.close()
