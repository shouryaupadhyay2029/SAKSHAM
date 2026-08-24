"""
route_scoring.py
================
Deterministic, explainable multi-criteria route scoring for SAKSHAM.

Routing engine: OSRM (Open Source Routing Machine)
Algorithm: Normalized weighted multi-criteria scoring
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional, Dict

# Sanity guard incident priority boosts
INCIDENT_PRIORITY_BOOSTS = {
    "CRITICAL": 100.0,
    "HIGH":     75.0,
    "MEDIUM":   50.0,
    "LOW":      25.0,
    None:       50.0,
}

@dataclass
class RouteCandidate:
    id: str
    distance_meters: float
    duration_seconds: float
    geometry: dict                        # GeoJSON LineString
    legs: List[dict] = field(default_factory=list)
    summary: Optional[str] = None

    # Filled in by scorer
    route_score: float = 0.0
    decision_reason: str = ""
    decision_factors: dict = field(default_factory=dict)
    selected: bool = False

@dataclass
class RouteDecision:
    selected_route: RouteCandidate
    alternatives: List[RouteCandidate]
    route_score: float
    decision_reason: str
    decision_factors: dict
    policy_name: str = "DEFAULT"
    policy_reason: str = ""
    policy_weights: Dict[str, float] = field(default_factory=dict)
    routing_provider: str = "OSRM"
    profile: str = "driving"
    calculated_at: Optional[str] = None

def _geometry_directness(geometry: dict, distance_meters: float) -> float:
    coords = geometry.get("coordinates", [])
    if len(coords) < 2 or distance_meters <= 0:
        return 50.0
    start = coords[0]
    end = coords[-1]
    R = 6_371_000
    lat1, lon1 = math.radians(start[1]), math.radians(start[0])
    lat2, lon2 = math.radians(end[1]),   math.radians(end[0])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    straight_distance = 2 * R * math.asin(math.sqrt(a))
    if straight_distance <= 0:
        return 50.0
    directness_ratio = straight_distance / distance_meters
    return min(100.0, max(0.0, directness_ratio * 100.0))

def _normalize_inverse(value: float, all_values: List[float]) -> float:
    min_v = min(all_values)
    if not value or min_v <= 0:
        return 100.0
    # Use ratio-based scaling (e.g. 10% longer time results in ~90% score, not 0%)
    score = (min_v / value) * 100.0
    return round(max(0.0, min(100.0, score)), 2)

def score_routes(
    candidates: List[RouteCandidate],
    incident_severity: Optional[str] = None,
    incident_affected_people: int = 0,
) -> RouteDecision:
    if not candidates:
        raise ValueError("Cannot score an empty list of route candidates")

    # Dynamic Weight Assignment policy depending on Incident Severity
    severity_upper = str(incident_severity).upper() if incident_severity else "MEDIUM"
    if severity_upper in ["CRITICAL", "HIGH"]:
        policy_name = "HIGH-PRIORITY ARRIVAL"
        policy_reason = "Because this incident is high severity, the routing policy prioritizes rapid arrival."
        weights = {
            "travel_time": 0.70,
            "distance": 0.10,
            "accessibility": 0.15,
            "priority": 0.05
        }
    else:
        policy_name = "RESOURCE CONSERVATION & EFFICIENCY"
        policy_reason = "Because this incident is lower severity, the routing policy balances travel duration and route efficiency."
        weights = {
            "travel_time": 0.45,
            "distance": 0.30,
            "accessibility": 0.15,
            "priority": 0.10
        }

    all_durations = [c.duration_seconds for c in candidates]
    all_distances = [c.distance_meters for c in candidates]

    base_priority_score = INCIDENT_PRIORITY_BOOSTS.get(incident_severity, 50.0)
    population_boost = min(10.0, incident_affected_people / 1000.0)
    priority_score = min(100.0, base_priority_score + population_boost)

    for cand in candidates:
        travel_time_score   = _normalize_inverse(cand.duration_seconds, all_durations)
        distance_score      = _normalize_inverse(cand.distance_meters,  all_distances)
        accessibility_score = _geometry_directness(cand.geometry, cand.distance_meters)

        composite = round(
            weights["travel_time"]      * travel_time_score
            + weights["distance"]       * distance_score
            + weights["accessibility"]  * accessibility_score
            + weights["priority"]       * priority_score,
            2
        )

        cand.route_score = composite
        cand.decision_factors = {
            "travel_time_score":    round(travel_time_score, 2),
            "distance_score":       round(distance_score, 2),
            "accessibility_score":  round(accessibility_score, 2),
            "priority_score":       round(priority_score, 2),
        }

    candidates.sort(key=lambda c: -c.route_score)
    winner = candidates[0]
    winner.selected = True

    # Build human-readable reason
    winner.decision_reason = _build_decision_reason(winner, candidates)

    # For alternative candidates, generate human-readable rejected reasons
    for alt in candidates[1:]:
        reasons = []
        if alt.duration_seconds > winner.duration_seconds:
            reasons.append("higher estimated travel time")
        if alt.distance_meters > winner.distance_meters:
            reasons.append("longer physical distance")
        if alt.decision_factors.get("accessibility_score", 0) < winner.decision_factors.get("accessibility_score", 0):
            reasons.append("less accessible road geometry")
        
        alt.decision_reason = f"Rejected primarily due to {', and '.join(reasons)} compared to the recommended path." if reasons else "Lower composite weighted operational score."

    return RouteDecision(
        selected_route=winner,
        alternatives=candidates[1:],
        route_score=winner.route_score,
        decision_reason=winner.decision_reason,
        decision_factors=winner.decision_factors,
        policy_name=policy_name,
        policy_reason=policy_reason,
        policy_weights=weights
    )

def _build_decision_reason(winner: RouteCandidate, all_candidates: List[RouteCandidate]) -> str:
    reasons = []
    factors = winner.decision_factors
    best_durations = min(c.duration_seconds for c in all_candidates)
    best_distances = min(c.distance_meters for c in all_candidates)

    if winner.duration_seconds == best_durations:
        reasons.append("lower estimated travel time")
    if winner.distance_meters == best_distances:
        reasons.append("shorter physical distance")
    if factors.get("accessibility_score", 0) >= 80:
        reasons.append("strong road accessibility")

    if len(all_candidates) == 1:
        return "Only viable road-network route between origin and destination"
    
    return f"Achieved the highest weighted operational score among the available candidate routes, primarily due to its {', and '.join(reasons)}." if reasons else "Best composite weighted score across all evaluated criteria."
