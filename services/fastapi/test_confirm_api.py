import requests

# 1. Log in as officer
login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", json={
    "email": "operator@saksham.demo",
    "password": "demo-op-2026"
})
assert login_res.status_code == 200, f"Login failed: {login_res.text}"
token = login_res.json()["accessToken"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Get list of incidents to find one we can use or we can create a new one
inc_res = requests.post("http://127.0.0.1:8000/api/v1/incidents", json={
    "type": "WATER_SHORTAGE",
    "title": "UAT Match Test Incident",
    "description": "Test description",
    "location": "Vasant Kunj, Delhi",
    "latitude": 28.5244,
    "longitude": 77.1554,
    "region": "SOUTH DELHI",
    "severity": "HIGH",
    "status": "REPORTED",
    "affectedPeople": 100,
    "displacedPeople": 10
})
assert inc_res.status_code == 201, f"Failed to create incident: {inc_res.text}"
inc_id = inc_res.json()["id"]
inc_ref = inc_res.json()["incidentId"]
print(f"Created incident: {inc_ref} ({inc_id})")

# Transition: REPORTED -> VERIFIED
patch_verify = requests.patch(f"http://127.0.0.1:8000/api/v1/incidents/{inc_ref}", json={"status": "VERIFIED"}, headers=headers)
assert patch_verify.status_code == 200, f"Verify failed: {patch_verify.text}"
print("Transitioned incident to VERIFIED")

# Transition: VERIFIED -> AWAITING_MATCH (PRIORITIZED)
patch_prioritize = requests.patch(f"http://127.0.0.1:8000/api/v1/incidents/{inc_ref}", json={"status": "AWAITING_MATCH"}, headers=headers)
assert patch_prioritize.status_code == 200, f"Prioritize failed: {patch_prioritize.text}"
print("Transitioned incident to AWAITING_MATCH")

# 3. Create a demand linked to this incident
dem_res = requests.post("http://127.0.0.1:8000/api/v1/demands", json={
    "incidentId": inc_id,
    "affectedZone": "Vasant Kunj",
    "requestedType": "WATER",
    "description": "Drinking water needed",
    "quantity": 150.0,
    "unit": "L",
    "affectedPeople": 100,
    "priority": "HIGH"
})
assert dem_res.status_code == 201, f"Failed to create demand: {dem_res.text}"
dem_id = dem_res.json()["id"]
dem_ref = dem_res.json()["requestId"]
print(f"Created demand: {dem_ref} ({dem_id})")

# 4. Get a resource to allocate
res_list_res = requests.get("http://127.0.0.1:8000/api/v1/resources")
assert res_list_res.status_code == 200, f"Failed to list resources: {res_list_res.text}"
resources = res_list_res.json()
# Find Dilshad Garden depot (RES-DEMO-UAT-001) or any depot with enough water
water_resources = [r for r in resources if r["category"] == "WATER" and (r["availableQuantity"] - r["reservedQuantity"]) >= 150.0]
assert len(water_resources) > 0, "No compatible water resource with >= 150L available quantity found!"
selected_resource = water_resources[0]
res_id = selected_resource["id"]
res_ref = selected_resource["resourceId"]
print(f"Selected resource: {res_ref} ({res_id}) with availableQty: {selected_resource['availableQuantity']}")

# 5. Confirm matching allocation atomically!
confirm_res = requests.post("http://127.0.0.1:8000/api/v1/allocations/confirm", json={
    "demandId": dem_id,
    "resourceId": res_id,
    "quantity": 150.0
}, headers=headers)
assert confirm_res.status_code == 200, f"Allocation confirm failed: {confirm_res.text}"
confirm_data = confirm_res.json()
print("Atomic allocation confirm succeeded!")
print("Updated incident status:", confirm_data["incident"]["status"])
print("Updated demand status:", confirm_data["demand"]["status"])
print("Updated resource availableQuantity:", confirm_data["resource"]["availableQuantity"])
print("Updated resource reservedQuantity:", confirm_data["resource"]["reservedQuantity"])

# Double-check constraints:
# Try to allocate again with same demand - should fail (incident not in AWAITING_MATCH anymore, now MATCHED)
confirm_fail_res = requests.post("http://127.0.0.1:8000/api/v1/allocations/confirm", json={
    "demandId": dem_id,
    "resourceId": res_id,
    "quantity": 50.0
}, headers=headers)
print("Second allocation attempt status (expected 409):", confirm_fail_res.status_code)
assert confirm_fail_res.status_code == 409

print("ALL BACKEND ATOMIC WORKFLOW TESTS PASSED SUCCESSFULLY!")
