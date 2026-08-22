"""
SAKSHAM Routing API Gateway
───────────────────────────
Central FastAPI endpoint for Multi-Depot Vehicle Routing (OR-Tools)
and OpenStreetMap (OSRM) road network queries.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List
import httpx
from app.core.config import settings

router = APIRouter()


@router.get("/status", summary="Check status of OR-Tools optimizer and OSRM services")
async def routing_status():
    """Check connectivity to the OR-Tools microservice and OSRM demo server."""
    status: Dict[str, Any] = {
        "gateway": "online",
        "optimizer_service": "offline",
        "osrm_routing": "offline",
        "optimizer_url": settings.OPTIMIZER_SERVICE_URL,
    }

    # Check optimizer microservice
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            resp = await client.get(f"{settings.OPTIMIZER_SERVICE_URL}/api/health")
            if resp.status_code == 200:
                status["optimizer_service"] = "online"
    except Exception:
        status["optimizer_service"] = "unreachable"

    # Check OSRM
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            resp = await client.get("https://router.project-osrm.org/table/v1/driving/77.2090,28.6139;77.2150,28.6300")
            if resp.status_code == 200:
                status["osrm_routing"] = "online"
    except Exception:
        status["osrm_routing"] = "unreachable"

    return status


@router.post("/optimize", summary="Execute Multi-Depot Vehicle Routing Optimization (OR-Tools)")
async def optimize_routes(payload: Dict[str, Any]):
    """
    Proxy optimization request to the Google OR-Tools optimizer microservice.
    """
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{settings.OPTIMIZER_SERVICE_URL}/api/optimize",
                json=payload,
            )
            if resp.status_code == 200:
                return resp.json()
            else:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Optimizer service unreachable at {settings.OPTIMIZER_SERVICE_URL}. Please start services/optimizer.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/distance-matrix", summary="Get road distance and duration matrix")
async def distance_matrix(payload: Dict[str, Any]):
    """
    Fetch an N×N road distance & duration matrix from OSRM or the optimizer service.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{settings.OPTIMIZER_SERVICE_URL}/api/distance-matrix",
                json=payload,
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass

    # Fallback to direct OSRM Table API
    locations = payload.get("locations", [])
    if len(locations) < 2:
        return {"distances": [[0.0]], "durations": [[0.0]], "source": "FALLBACK"}

    coords_str = ";".join(f"{loc['lng']},{loc['lat']}" for loc in locations)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"https://router.project-osrm.org/table/v1/driving/{coords_str}?annotations=distance,duration")
            if resp.status_code == 200:
                data = resp.json()
                n = len(locations)
                dist_km = [[round((data["distances"][i][j] or 0) / 1000.0, 2) for j in range(n)] for i in range(n)]
                dur_min = [[round((data["durations"][i][j] or 0) / 60.0, 1) for j in range(n)] for i in range(n)]
                return {"distances": dist_km, "durations": dur_min, "source": "OSRM"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch distance matrix: {e}")


@router.get("/osrm-route", summary="Get road-following geometry between two points")
async def osrm_route(
    start_lat: float = Query(..., description="Start latitude"),
    start_lng: float = Query(..., description="Start longitude"),
    end_lat: float = Query(..., description="End latitude"),
    end_lng: float = Query(..., description="End longitude"),
):
    """
    Retrieve turn-by-turn road polyline GeoJSON from OpenStreetMap (OSRM).
    """
    url = f"https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.json()
            else:
                raise HTTPException(status_code=resp.status_code, detail="OSRM query failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
