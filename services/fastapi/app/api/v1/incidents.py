from fastapi import APIRouter, Depends, status
from typing import List
from app.schemas.incident import IncidentResponse, IncidentCreate, IncidentUpdate
from app.domain.incidents.service import IncidentService
from app.api.dependencies import get_incident_service

router = APIRouter()

@router.get("", response_model=List[IncidentResponse], summary="List all incidents")
async def list_incidents(service: IncidentService = Depends(get_incident_service)):
    return service.list_incidents()

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED, summary="Create a new incident")
async def create_incident(incident: IncidentCreate, service: IncidentService = Depends(get_incident_service)):
    return service.create_incident(incident)

@router.get("/{incident_id}", response_model=IncidentResponse, summary="Get incident details by ID or Reference")
async def get_incident(incident_id: str, service: IncidentService = Depends(get_incident_service)):
    return service.get_incident(incident_id)

@router.patch("/{incident_id}", response_model=IncidentResponse, summary="Update incident fields or status")
async def update_incident(incident_id: str, update_data: IncidentUpdate, service: IncidentService = Depends(get_incident_service)):
    return service.update_incident(incident_id, update_data)
