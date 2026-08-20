from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_allocation_flow():
    # 1. Retrieve seeded demand and resource UUIDs
    demand_id = client.get("/api/v1/demands").json()[0]["id"]
    resource_id = client.get("/api/v1/resources").json()[0]["id"]

    # 2. Create allocation
    payload = {
        "demandId": demand_id,
        "resourceId": resource_id,
        "quantity": 1000.0
    }
    response = client.post("/api/v1/allocations", json=payload)
    assert response.status_code == 201
    alloc_data = response.json()
    assert alloc_data["status"] == "RECOMMENDED"
    alloc_id = alloc_data["id"]

    # 3. Patch to PENDING_APPROVAL
    res_pending = client.patch(
        f"/api/v1/allocations/{alloc_id}/status",
        json={"status": "PENDING_APPROVAL"}
    )
    assert res_pending.status_code == 200
    assert res_pending.json()["status"] == "PENDING_APPROVAL"

    # 4. Approve allocation
    res_approve = client.patch(
        f"/api/v1/allocations/{alloc_id}/status",
        json={"status": "APPROVED", "notes": "Approved by Regional Commander"}
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "APPROVED"
    assert res_approve.json()["approvedById"] is not None

    # 5. Invalid transition APPROVED -> REJECTED
    res_invalid = client.patch(
        f"/api/v1/allocations/{alloc_id}/status",
        json={"status": "REJECTED"}
    )
    assert res_invalid.status_code == 409
    assert res_invalid.json()["error"]["code"] == "INVALID_STATE_TRANSITION"
