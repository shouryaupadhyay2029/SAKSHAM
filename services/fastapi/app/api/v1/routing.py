from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.osrm import get_road_route

router = APIRouter()

class Coordinate(BaseModel):
    lat: float
    lng: float

class RouteRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate

@router.post("/route")
async def calculate_route(payload: RouteRequest):
    """
    POST proxy route accepting origin/destination lat-lng coords
    and returning GeoJSON geometry, duration, and distance.
    """
    try:
        route_data = await get_road_route(
            payload.origin.lat,
            payload.origin.lng,
            payload.destination.lat,
            payload.destination.lng
        )
        return route_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
