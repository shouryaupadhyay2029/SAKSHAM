from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_translation_endpoint_same_language():
    payload = {
        "text": "Emergency Response",
        "sourceLanguage": "en",
        "targetLanguage": "en"
    }
    response = client.post("/api/v1/translation/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["translatedText"] == "Emergency Response"
    assert data["provider"] == "identity"

def test_translation_endpoint_fallback():
    payload = {
        "text": "Evacuation required for affected residents.",
        "sourceLanguage": "en",
        "targetLanguage": "hi"
    }
    response = client.post("/api/v1/translation/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "translatedText" in data
    assert data["sourceLanguage"] == "en"
    assert data["targetLanguage"] == "hi"

def test_translation_endpoint_empty_text():
    payload = {
        "text": "   ",
        "sourceLanguage": "en",
        "targetLanguage": "hi"
    }
    response = client.post("/api/v1/translation/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["translatedText"] == ""
