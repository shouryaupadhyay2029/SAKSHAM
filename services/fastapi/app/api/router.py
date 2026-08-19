from fastapi import APIRouter
from app.api.v1 import (
    health,
    incidents,
    demands,
    resources,
    vehicles,
    matching,
    allocations,
    dispatch,
    delivery
)

api_router = APIRouter()

# Mount health
api_router.include_router(health.router, prefix="/health", tags=["Health"])

# Mount domain resource routes
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(demands.router, prefix="/demands", tags=["Demands"])
api_router.include_router(resources.router, prefix="/resources", tags=["Resources"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["Vehicles"])
api_router.include_router(matching.router, prefix="/matching", tags=["Matching"])
api_router.include_router(allocations.router, prefix="/allocations", tags=["Allocations"])
api_router.include_router(dispatch.router, prefix="/dispatch", tags=["Dispatch"])
api_router.include_router(delivery.router, prefix="/delivery", tags=["Delivery"])
