from fastapi import APIRouter, Depends
from app.schemas.matching import MatchRequest, MatchResponse
from app.domain.matching.service import MatchingService
from app.domain.demands.service import DemandService
from app.domain.incidents.service import IncidentService
from app.api.dependencies import get_matching_service, get_demand_service, get_incident_service

router = APIRouter()

@router.post("/recommend", response_model=MatchResponse, summary="Get deterministic match recommendations for a demand")
async def recommend_matches(
    req: MatchRequest,
    matching_service: MatchingService = Depends(get_matching_service),
    demand_service: DemandService = Depends(get_demand_service),
    incident_service: IncidentService = Depends(get_incident_service)
):
    # Fetch demand details
    demand = demand_service.get_demand(req.demandId)
    # Fetch incident details to retrieve coordinates
    incident = incident_service.get_incident(demand.incidentId)
    
    recommendations = matching_service.get_recommendations(
        demand_id=demand.id,
        incident_lat=incident.latitude,
        incident_lng=incident.longitude
    )
    
    status = "MATCHES_FOUND" if recommendations else "NO_MATCHES"
    return MatchResponse(status=status, recommendations=recommendations)
