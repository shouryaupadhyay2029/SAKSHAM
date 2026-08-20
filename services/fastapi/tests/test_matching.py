from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_matching_recommendation_flow():
    # 1. Post request with REQ-DEL-101
    payload = {"demandId": "REQ-DEL-101"}
    response = client.post("/api/v1/matching/recommend", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "MATCHES_FOUND"
    assert len(data["recommendations"]) >= 1

    # Verify matching attributes
    best_match = data["recommendations"][0]
    assert best_match["category"] == "WATER"
    assert best_match["score"] > 0
    assert best_match["distanceKm"] > 0
    assert "compatibility" in best_match["scoreBreakdown"]
    assert "explanation" in best_match
