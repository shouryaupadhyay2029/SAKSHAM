from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_valid_officer_login():
    payload = {
        "email": "operator@saksham.demo",
        "password": "Password@123"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "accessToken" in data
    assert data["officer"]["email"] == "operator@saksham.demo"
    assert data["officer"]["role"] == "OPERATOR"

def test_invalid_password_login():
    payload = {
        "email": "operator@saksham.demo",
        "password": "WrongPassword"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"

def test_unknown_officer_login():
    payload = {
        "email": "nonexistent@saksham.demo",
        "password": "Password@123"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"

def test_auth_me_valid_jwt():
    # 1. Login to get token
    login_payload = {
        "email": "operator@saksham.demo",
        "password": "Password@123"
    }
    token = client.post("/api/v1/auth/login", json=login_payload).json()["accessToken"]

    # 2. Get profile with valid token
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "operator@saksham.demo"

def test_auth_me_invalid_jwt():
    headers = {"Authorization": "Bearer InvalidTokenStuff"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"

def test_auth_me_missing_jwt():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
