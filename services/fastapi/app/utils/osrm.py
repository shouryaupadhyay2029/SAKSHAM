import httpx
import logging
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


async def get_road_route(lat1: float, lon1: float, lat2: float, lon2: float) -> dict:
    """
    Queries OSRM server to fetch the actual road-following path,
    distance (in meters), and duration (in seconds).

    Returns only the primary/best single route (legacy compatibility).
    """
    result = await get_road_route_with_alternatives(lat1, lon1, lat2, lon2)
    # Return only the primary route in the original shape for backward compatibility
    primary = result["primary_route"]
    return {
        "distance_meters": primary["distance_meters"],
        "duration_seconds": primary["duration_seconds"],
        "geometry": primary["geometry"]
    }


async def get_road_route_with_alternatives(
    lat1: float, lon1: float, lat2: float, lon2: float,
    max_alternatives: int = 3
) -> dict:
    """
    Queries OSRM to fetch up to (max_alternatives) road-following candidate routes.

    OSRM coordinate format: (longitude, latitude)

    Returns:
        {
            "primary_route": { id, geometry, distance_meters, duration_seconds },
            "alternatives": [ ... same shape ... ],
            "routing_provider": "OSRM",
            "profile": "driving"
        }
    """
    base = settings.OSRM_BASE_URL.rstrip("/")
    # OSRM uses (lng, lat) order
    url = (
        f"{base}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}"
        f"?overview=full&geometries=geojson&alternatives=true"
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=8.0)
            if response.status_code != 200:
                raise RuntimeError(
                    f"OSRM server returned status {response.status_code}"
                )

            data = response.json()
            routes = data.get("routes", [])
            if not routes:
                raise RuntimeError("No routing paths found between the given coordinates")

            def parse_route(r: dict, idx: int) -> dict:
                legs = r.get("legs", [])
                summary_str = ""
                if legs:
                    summary_str = ", ".join([leg.get("summary", "") for leg in legs if leg.get("summary")])
                return {
                    "id": f"osrm-route-{idx}",
                    "distance_meters": float(r.get("distance", 0.0)),
                    "duration_seconds": float(r.get("duration", 0.0)),
                    "geometry": r.get("geometry"),   # GeoJSON LineString
                    "summary": summary_str,
                    "legs": [
                        {
                            "distance": leg.get("distance"),
                            "duration": leg.get("duration"),
                            "summary": leg.get("summary", ""),
                            "steps_count": len(leg.get("steps", []))
                        }
                        for leg in legs
                    ]
                }

            primary = parse_route(routes[0], 0)
            alternatives = [parse_route(routes[i], i) for i in range(1, len(routes))]

            return {
                "primary_route": primary,
                "alternatives": alternatives,
                "routing_provider": "OSRM",
                "profile": "driving"
            }

    except Exception as e:
        logger.error(f"OSRM routing request failed: {str(e)}")
        raise RuntimeError(f"Routing request failed: {str(e)}")
