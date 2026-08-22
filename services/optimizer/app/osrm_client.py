"""
SAKSHAM Optimizer – OSRM Client
────────────────────────────────
Async client for the OpenStreetMap Routing Machine (OSRM) API.
Provides:
  • N×N distance/duration matrix via the Table API
  • Road-following route geometries via the Route API
  • Haversine fallback when OSRM is unreachable
"""

from __future__ import annotations

import math
import logging
from typing import List, Tuple, Optional

import httpx

logger = logging.getLogger("saksham.osrm")

# ── Constants ──────────────────────────────────────────────────────────────────

EARTH_RADIUS_KM = 6_371.0
DEFAULT_SPEED_KMH = 40.0  # Fallback average speed for duration estimates
OSRM_TIMEOUT = 30.0       # Seconds


# ── Haversine Fallback ─────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points in kilometres."""
    to_rad = math.pi / 180.0
    d_lat = (lat2 - lat1) * to_rad
    d_lng = (lng2 - lng1) * to_rad
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1 * to_rad) * math.cos(lat2 * to_rad) * math.sin(d_lng / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_haversine_matrix(
    locations: List[Tuple[float, float]],
) -> Tuple[List[List[float]], List[List[float]]]:
    """
    Build distance (km) and duration (min) matrices using Haversine.
    Duration estimated at DEFAULT_SPEED_KMH.
    """
    n = len(locations)
    dist_matrix: List[List[float]] = [[0.0] * n for _ in range(n)]
    dur_matrix: List[List[float]] = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            d = haversine_km(locations[i][0], locations[i][1], locations[j][0], locations[j][1])
            dist_matrix[i][j] = round(d, 3)
            dur_matrix[i][j] = round((d / DEFAULT_SPEED_KMH) * 60, 2)  # minutes

    return dist_matrix, dur_matrix


# ── OSRM Table API ─────────────────────────────────────────────────────────────

async def get_distance_duration_matrix(
    locations: List[Tuple[float, float]],
    osrm_base_url: str = "https://router.project-osrm.org",
) -> Tuple[List[List[float]], List[List[float]], str]:
    """
    Fetch an N×N distance (km) and duration (min) matrix from OSRM Table API.

    Parameters
    ----------
    locations : list of (lat, lng) tuples
    osrm_base_url : OSRM server URL

    Returns
    -------
    (distance_matrix_km, duration_matrix_min, source)
    source is "OSRM" or "HAVERSINE" (fallback).
    """
    n = len(locations)
    if n < 2:
        return [[0.0]], [[0.0]], "HAVERSINE"

    # OSRM expects lng,lat order
    coords_str = ";".join(f"{lng},{lat}" for lat, lng in locations)
    url = f"{osrm_base_url.rstrip('/')}/table/v1/driving/{coords_str}"

    params = {
        "annotations": "distance,duration",
    }

    try:
        async with httpx.AsyncClient(timeout=OSRM_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("code") != "Ok":
            logger.warning("OSRM Table API returned non-Ok: %s — falling back to Haversine", data.get("code"))
            d, t = build_haversine_matrix(locations)
            return d, t, "HAVERSINE"

        # OSRM returns distances in metres, durations in seconds
        raw_distances = data["distances"]  # metres
        raw_durations = data["durations"]  # seconds

        dist_km = [
            [round((raw_distances[i][j] or 0) / 1000.0, 3) for j in range(n)]
            for i in range(n)
        ]
        dur_min = [
            [round((raw_durations[i][j] or 0) / 60.0, 2) for j in range(n)]
            for i in range(n)
        ]

        logger.info("OSRM Table API: %d×%d matrix fetched successfully", n, n)
        return dist_km, dur_min, "OSRM"

    except Exception as exc:
        logger.warning("OSRM Table API failed (%s) — falling back to Haversine", exc)
        d, t = build_haversine_matrix(locations)
        return d, t, "HAVERSINE"


# ── OSRM Route API ─────────────────────────────────────────────────────────────

async def get_route_geometry(
    waypoints: List[Tuple[float, float]],
    osrm_base_url: str = "https://router.project-osrm.org",
) -> Optional[dict]:
    """
    Fetch a road-following route geometry from OSRM Route API.

    Parameters
    ----------
    waypoints : ordered list of (lat, lng)

    Returns
    -------
    GeoJSON FeatureCollection with a single LineString feature,
    or None on failure.
    """
    if len(waypoints) < 2:
        return None

    coords_str = ";".join(f"{lng},{lat}" for lat, lng in waypoints)
    url = f"{osrm_base_url.rstrip('/')}/route/v1/driving/{coords_str}"

    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
    }

    try:
        async with httpx.AsyncClient(timeout=OSRM_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            logger.warning("OSRM Route API returned non-Ok or empty routes")
            return _straight_line_geojson(waypoints)

        geometry = data["routes"][0]["geometry"]  # GeoJSON LineString

        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "distance_m": data["routes"][0].get("distance", 0),
                        "duration_s": data["routes"][0].get("duration", 0),
                    },
                    "geometry": geometry,
                }
            ],
        }

    except Exception as exc:
        logger.warning("OSRM Route API failed (%s) — returning straight lines", exc)
        return _straight_line_geojson(waypoints)


def _straight_line_geojson(waypoints: List[Tuple[float, float]]) -> dict:
    """Fallback: straight-line GeoJSON between waypoints."""
    coordinates = [[lng, lat] for lat, lng in waypoints]
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"fallback": True},
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates,
                },
            }
        ],
    }
