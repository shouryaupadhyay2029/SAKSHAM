import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

async def get_road_route(lat1: float, lon1: float, lat2: float, lon2: float) -> dict:
    """
    Queries OSRM server to fetch the actual road-following path,
    distance (in meters), and duration (in seconds).
    """
    # Coordinates in OSRM must be passed as (longitude, latitude)
    url = f"{settings.OSRM_BASE_URL.rstrip('/')}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code != 200:
                raise RuntimeError(f"OSRM server returned status code {response.status_code}")
            
            data = response.json()
            if "routes" not in data or len(data["routes"]) == 0:
                raise RuntimeError("No routing paths found between points in OSRM response")
            
            route = data["routes"][0]
            return {
                "distance_meters": float(route.get("distance", 0.0)),
                "duration_seconds": float(route.get("duration", 0.0)),
                "geometry": route.get("geometry")  # GeoJSON LineString dict
            }
    except Exception as e:
        logger.error(f"OSRM routing request failed: {str(e)}")
        raise RuntimeError(f"Routing request failed: {str(e)}")
