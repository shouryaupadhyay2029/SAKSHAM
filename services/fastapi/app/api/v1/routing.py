"""
Routing API endpoints for SAKSHAM.

Routing engine: OSRM (Open Source Routing Machine)
Route selection: Deterministic weighted multi-criteria scoring
                 (see app/utils/route_scoring.py)

ETA labelling: All durations are labelled as
    "road_network_duration_seconds"
    NEVER as "traffic-aware" — OSRM does not have live traffic data.
"""
import json
import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.utils.osrm import get_road_route_with_alternatives
from app.utils.route_scoring import (
    RouteCandidate as ScoringCandidate,
    score_routes,
)
from app.schemas.route import (
    Coordinate,
    RouteRequest,
    RouteDecision as RouteDecisionSchema,
    RouteCandidate as RouteCandidateSchema,
    RouteScoreFactors,
    DeviationCheckRequest,
    DeviationCheckResponse,
)

router = APIRouter()


def _to_schema_candidate(cand: ScoringCandidate) -> RouteCandidateSchema:
    """Convert internal scoring dataclass to Pydantic schema."""
    return RouteCandidateSchema(
        id=cand.id,
        distance_meters=cand.distance_meters,
        duration_seconds=cand.duration_seconds,
        geometry=cand.geometry,
        route_score=cand.route_score,
        selected=cand.selected,
        decision_reason=cand.decision_reason,
        decision_factors=RouteScoreFactors(**cand.decision_factors),
        summary=cand.summary,
    )


@router.post("/route", response_model=RouteDecisionSchema)
async def calculate_route(payload: RouteRequest):
    """
    Calculate the best road-following route between two coordinates.

    Uses OSRM for road-network geometry, distance, and duration.
    Applies deterministic weighted multi-criteria scoring to select
    the best candidate from all routes returned by OSRM.

    Duration is road-network travel time only.
    Live traffic data is NOT available.
    """
    try:
        osrm_result = await get_road_route_with_alternatives(
            payload.origin.lat,
            payload.origin.lng,
            payload.destination.lat,
            payload.destination.lng,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Build scorer candidates from OSRM results
    primary = osrm_result["primary_route"]
    alternatives_raw = osrm_result.get("alternatives", [])

    all_candidates_raw = [primary] + alternatives_raw
    scorer_candidates = [
        ScoringCandidate(
            id=r["id"],
            distance_meters=r["distance_meters"],
            duration_seconds=r["duration_seconds"],
            geometry=r["geometry"],
            legs=r.get("legs", []),
        )
        for r in all_candidates_raw
    ]

    # Score all candidates deterministically
    decision = score_routes(
        scorer_candidates,
        incident_severity=payload.incident_severity,
        incident_affected_people=payload.incident_affected_people or 0,
    )

    now = datetime.now(timezone.utc)

    return RouteDecisionSchema(
        routing_provider="OSRM",
        profile="driving",
        selected_route=_to_schema_candidate(decision.selected_route),
        alternatives=[_to_schema_candidate(a) for a in decision.alternatives],
        route_score=decision.route_score,
        decision_reason=decision.decision_reason,
        decision_factors=RouteScoreFactors(**decision.decision_factors),
        calculated_at=now,
        policy_name=decision.policy_name,
        policy_reason=decision.policy_reason,
        policy_weights=decision.policy_weights,
    )


@router.post("/check-deviation", response_model=DeviationCheckResponse)
async def check_route_deviation(payload: DeviationCheckRequest):
    """
    Check whether a vehicle's current GPS position has deviated materially
    from its active route geometry.

    Uses closest-point-on-polyline computation against the stored GeoJSON
    LineString to find the perpendicular distance from the vehicle to the route.

    Returns deviated=True if distance_from_route_meters > threshold_meters.
    Does NOT call OSRM — purely geometric computation on the stored geometry.
    """
    coords = payload.route_geometry.get("coordinates", [])
    if len(coords) < 2:
        raise HTTPException(status_code=400, detail="Route geometry must have at least 2 coordinates")

    min_dist = _min_distance_to_polyline(
        payload.vehicle_lat,
        payload.vehicle_lng,
        coords,
    )

    return DeviationCheckResponse(
        deviated=min_dist > payload.threshold_meters,
        distance_from_route_meters=round(min_dist, 2),
        threshold_meters=payload.threshold_meters,
    )


def _min_distance_to_polyline(
    veh_lat: float, veh_lng: float, coords: list
) -> float:
    """
    Find the minimum perpendicular distance (in metres) from a point
    to a sequence of line segments (polyline).

    Each coord in `coords` is [lng, lat] (GeoJSON convention).
    Uses Haversine for final distance measurement.
    """
    R = 6_371_000.0   # Earth radius metres

    def haversine(lat1, lon1, lat2, lon2) -> float:
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2
             + math.cos(math.radians(lat1))
             * math.cos(math.radians(lat2))
             * math.sin(dlon / 2) ** 2)
        return 2 * R * math.asin(math.sqrt(a))

    def closest_point_on_segment(px, py, ax, ay, bx, by):
        """
        Closest point on segment AB to point P (in flat lat/lng degrees).
        Returns the closest (x, y) pair on the segment.
        """
        abx, aby = bx - ax, by - ay
        apx, apy = px - ax, py - ay
        ab2 = abx * abx + aby * aby
        if ab2 == 0:
            return ax, ay
        t = max(0.0, min(1.0, (apx * abx + apy * aby) / ab2))
        return ax + t * abx, ay + t * aby

    min_dist = float("inf")

    for i in range(len(coords) - 1):
        # GeoJSON coords are [lng, lat]
        a_lng, a_lat = coords[i]
        b_lng, b_lat = coords[i + 1]
        cx, cy = closest_point_on_segment(
            veh_lng, veh_lat,
            a_lng, a_lat,
            b_lng, b_lat
        )
        d = haversine(veh_lat, veh_lng, cy, cx)
        if d < min_dist:
            min_dist = d

    return min_dist
