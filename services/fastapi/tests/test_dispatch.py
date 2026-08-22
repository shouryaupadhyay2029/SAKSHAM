from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.models import ResourceModel, OfficerModel

client = TestClient(app)

def test_dispatch_recommendation_and_creation():
    # Reset resource availability and operator region
    db = SessionLocal()
    res = db.query(ResourceModel).filter(ResourceModel.resourceId == "RES-MD-001").first()
    if res:
        res.availableQuantity = 200.0
        res.reservedQuantity = 0.0
    op = db.query(OfficerModel).filter(OfficerModel.email == "operator@saksham.demo").first()
    if op:
        op.region = "National"
    db.commit()
    db.close()

    # Login to get token
    op_resp = client.post("/api/v1/auth/login", json={"email": "operator@saksham.demo", "password": "Password@123"})
    token = op_resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Prepare approved allocation
    demands = client.get("/api/v1/demands", headers=headers).json()
    demand = next(d for d in demands if d["requestId"] == "REQ-DEL-102")
    demand_id = demand["id"]

    resources = client.get("/api/v1/resources", headers=headers).json()
    resource = next(r for r in resources if r["resourceId"] == "RES-MD-001")
    resource_id = resource["id"]

    alloc_payload = {
        "demandId": demand_id,
        "resourceId": resource_id,
        "quantity": 50.0
    }
    alloc = client.post("/api/v1/allocations", json=alloc_payload, headers=headers).json()
    alloc_id = alloc["id"]

    # Approve the allocation
    client.patch(f"/api/v1/allocations/{alloc_id}/status", json={"status": "PENDING_APPROVAL"}, headers=headers)
    client.patch(f"/api/v1/allocations/{alloc_id}/status", json={"status": "APPROVED"}, headers=headers)

    # 2. Get vehicle recommendations
    veh_recs = client.get(f"/api/v1/dispatch/recommend-vehicles?allocationId={alloc_id}", headers=headers)
    assert veh_recs.status_code == 200
    assert len(veh_recs.json()) >= 1
    vehicle_id = veh_recs.json()[0]["vehicleId"]

    # 3. Create Dispatch
    disp_payload = {
        "allocationId": alloc_id,
        "vehicleId": vehicle_id,
        "assignedOfficerId": "OFF-101",
        "plannedDeparture": "2026-08-19T12:00:00Z",
        "eta": "2026-08-19T13:00:00Z",
        "notes": "FastAPI dispatch test"
    }
    response = client.post("/api/v1/dispatch", json=disp_payload, headers=headers)
    assert response.status_code == 201
    dsp_data = response.json()
    assert dsp_data["status"] == "PLANNED"
    dsp_id = dsp_data["id"]

    # 4. Perform transition check: PLANNED -> READY
    res_ready = client.patch(f"/api/v1/dispatch/{dsp_id}/status?nextStatus=READY", headers=headers)
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "READY"

    # 5. Transition: READY -> DISPATCHED
    res_disp = client.patch(f"/api/v1/dispatch/{dsp_id}/status?nextStatus=DISPATCHED", headers=headers)
    assert res_disp.status_code == 200
    assert res_disp.json()["status"] == "DISPATCHED"
    assert res_disp.json()["actualDeparture"] is not None

    # 6. Invalid transition: DISPATCHED -> COMPLETED (must go through EN_ROUTE, ARRIVED)
    res_invalid = client.patch(f"/api/v1/dispatch/{dsp_id}/status?nextStatus=COMPLETED", headers=headers)
    assert res_invalid.status_code == 409
