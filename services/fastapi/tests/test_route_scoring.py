import pytest
from app.utils.route_scoring import (
    RouteCandidate,
    score_routes,
)

def test_route_selection_is_deterministic():
    # Setup candidates
    c1 = RouteCandidate(
        id="route-1",
        distance_meters=5000,
        duration_seconds=600,
        geometry={"type": "LineString", "coordinates": [[77.2, 28.6], [77.21, 28.61]]}
    )
    c2 = RouteCandidate(
        id="route-2",
        distance_meters=5500,
        duration_seconds=500,  # faster but longer distance
        geometry={"type": "LineString", "coordinates": [[77.2, 28.6], [77.22, 28.61]]}
    )
    
    # Running multiple times must yield exact same scores & winner
    res1 = score_routes([c1, c2], incident_severity="HIGH", incident_affected_people=100)
    res2 = score_routes([c1, c2], incident_severity="HIGH", incident_affected_people=100)
    
    assert res1.selected_route.id == res2.selected_route.id
    assert res1.route_score == res2.route_score
    assert res1.selected_route.route_score == res2.selected_route.route_score

def test_route_score_weights_sum_to_one():
    res = score_routes([RouteCandidate(id="route-1", distance_meters=1000, duration_seconds=100, geometry={"type": "LineString", "coordinates": [[0,0], [1,1]]})], incident_severity="HIGH")
    total_weight = sum(res.policy_weights.values())
    assert abs(total_weight - 1.0) < 1e-9

def test_shorter_duration_wins_travel_time_factor():
    c1 = RouteCandidate(
        id="route-slow",
        distance_meters=5000,
        duration_seconds=900,
        geometry={"type": "LineString", "coordinates": [[77.2, 28.6], [77.21, 28.61]]}
    )
    c2 = RouteCandidate(
        id="route-fast",
        distance_meters=5000,
        duration_seconds=450,  # half the duration
        geometry={"type": "LineString", "coordinates": [[77.2, 28.6], [77.21, 28.61]]}
    )
    
    res = score_routes([c1, c2], incident_severity="MEDIUM", incident_affected_people=0)
    
    # The fast route must score 100 on travel time score, and the slow route must score 0
    fast_factors = res.selected_route.decision_factors if res.selected_route.id == "route-fast" else res.alternatives[0].decision_factors
    slow_factors = res.alternatives[0].decision_factors if res.selected_route.id == "route-fast" else res.selected_route.decision_factors
    
    # Ratio-based normalization: score = (min_duration / candidate_duration) * 100
    # fast: 450/450 * 100 = 100.0
    # slow: 450/900 * 100 = 50.0
    assert fast_factors["travel_time_score"] == 100.0
    assert slow_factors["travel_time_score"] == 50.0   # ratio-based: half duration → half score
    assert res.selected_route.id == "route-fast"

def test_severity_policy_weight_assignment():
    c = [RouteCandidate(id="route-1", distance_meters=1000, duration_seconds=100, geometry={"type": "LineString", "coordinates": [[0,0], [1,1]]})]
    
    res_high = score_routes(c, incident_severity="HIGH")
    assert res_high.policy_name == "HIGH-PRIORITY ARRIVAL"
    assert res_high.policy_weights["travel_time"] == 0.70
    
    res_low = score_routes(c, incident_severity="LOW")
    assert res_low.policy_name == "RESOURCE CONSERVATION & EFFICIENCY"
    assert res_low.policy_weights["travel_time"] == 0.45
