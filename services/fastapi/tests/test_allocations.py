from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.models import ResourceModel

client = TestClient(app)

def test_allocation_flow():
    # Reset resource availability in DB to ensure quantity check passes
    db = SessionLocal()
    res = db.query(ResourceModel).filter(ResourceModel.resourceId == "RES-MD-001").first()
    if res:
        res.availableQuantity = 200.0
        res.reservedQuantity = 0.0
        db.commit()
    db.close()

    # Login to get token
    op_resp = client.post("/api/v1/auth/login", json={"email": "operator@saksham.demo", "password": "Password@123"})
    token = op_resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Retrieve seeded demand and resource UUIDs dynamically
    demands = client.get("/api/v1/demands", headers=headers).json()
    demand = next(d for d in demands if d["requestId"] == "REQ-DEL-102")
    demand_id = demand["id"]

    resources = client.get("/api/v1/resources", headers=headers).json()
    resource = next(r for r in resources if r["resourceId"] == "RES-MD-001")
    resource_id = resource["id"]

    # 2. Create allocation
    payload = {
        "demandId": demand_id,
        "resourceId": resource_id,
        "quantity": 50.0
    }
    response = client.post("/api/v1/allocations", json=payload, headers=headers)
    assert response.status_code == 201, f"Failed with {response.status_code}: {response.json()}"
    alloc_data = response.json()
    assert alloc_data["status"] == "RECOMMENDED"
    alloc_id = alloc_data["id"]

    # 3. Patch to PENDING_APPROVAL
    res_pending = client.patch(
        f"/api/v1/allocations/{alloc_id}/status",
        json={"status": "PENDING_APPROVAL"},
        headers=headers
    )
    assert res_pending.status_code == 200
    assert res_pending.json()["status"] == "PENDING_APPROVAL"

    # 4. Approve allocation
    res_approve = client.patch(
        f"/api/v1/allocations/{alloc_id}/status",
        json={"status": "APPROVED", "notes": "Approved by Regional Commander"},
        headers=headers
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "APPROVED"
    assert res_approve.json()["approvedById"] is not None

    # 5. Invalid transition APPROVED -> REJECTED
    res_invalid = client.patch(
        f"/api/v1/allocations/{alloc_id}/status",
        json={"status": "REJECTED"},
        headers=headers
    )
    assert res_invalid.status_code == 409
    assert res_invalid.json()["error"]["code"] == "INVALID_STATE_TRANSITION"
