import requests

# We will run this against the local FastAPI instance
res = requests.get("http://127.0.0.1:8000/api/v1/incidents")
incidents = res.json()
print("Total incidents:", len(incidents))

reported_incidents = [i for i in incidents if i["status"] == "REPORTED"]
if reported_incidents:
    target = reported_incidents[0]
    print(f"Targeting: {target['incidentId']} (ID: {target['id']})")
    
    # We need a JWT token to do PATCH. Let's get one by logging in.
    login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", json={
        "email": "operator@saksham.demo",
        "password": "demo-op-2026"
    })
    token = login_res.json()["accessToken"]
    print("Logged in successfully. Token generated.")
    
    headers = {"Authorization": f"Bearer {token}"}
    patch_res = requests.patch(
        f"http://127.0.0.1:8000/api/v1/incidents/{target['incidentId']}",
        json={"status": "VERIFIED"},
        headers=headers
    )
    print("PATCH status code:", patch_res.status_code)
    print("PATCH response:", patch_res.json())
    
    # Get again to see if it persisted
    get_res = requests.get(f"http://127.0.0.1:8000/api/v1/incidents/{target['incidentId']}")
    print("GET after PATCH status:", get_res.json()["status"])
else:
    print("No reported incidents found.")
