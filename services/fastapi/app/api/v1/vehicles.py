from fastapi import APIRouter, Depends, status
from typing import List
from app.schemas.vehicle import VehicleResponse, VehicleCreate, VehicleUpdate
from app.domain.vehicles.service import VehicleService
from app.api.dependencies import get_vehicle_service

router = APIRouter()

@router.get("", response_model=List[VehicleResponse], summary="List all fleet vehicles")
async def list_vehicles(service: VehicleService = Depends(get_vehicle_service)):
    return service.list_vehicles()

@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED, summary="Create a new vehicle record")
async def create_vehicle(vehicle: VehicleCreate, service: VehicleService = Depends(get_vehicle_service)):
    return service.create_vehicle(vehicle)

@router.get("/{vehicle_id}", response_model=VehicleResponse, summary="Get vehicle details by ID or Vehicle ID")
async def get_vehicle(vehicle_id: str, service: VehicleService = Depends(get_vehicle_service)):
    return service.get_vehicle(vehicle_id)

@router.patch("/{vehicle_id}", response_model=VehicleResponse, summary="Update vehicle coordinates, speed or status")
async def update_vehicle(vehicle_id: str, update_data: VehicleUpdate, service: VehicleService = Depends(get_vehicle_service)):
    return service.update_vehicle(vehicle_id, update_data)
