"""
SAKSHAM Optimizer – Pydantic Schemas
────────────────────────────────────
Request / response models for the Multi-Depot Vehicle Routing Problem optimizer.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────────────────────

class DemandPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class SolverStatus(str, Enum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    TIMEOUT = "TIMEOUT"
    ERROR = "ERROR"


class FirstSolutionStrategy(str, Enum):
    PATH_CHEAPEST_ARC = "PATH_CHEAPEST_ARC"
    SAVINGS = "SAVINGS"
    CHRISTOFIDES = "CHRISTOFIDES"
    PARALLEL_CHEAPEST_INSERTION = "PARALLEL_CHEAPEST_INSERTION"
    LOCAL_CHEAPEST_INSERTION = "LOCAL_CHEAPEST_INSERTION"
    GLOBAL_CHEAPEST_ARC = "GLOBAL_CHEAPEST_ARC"


# ── Request Models ─────────────────────────────────────────────────────────────

class VehicleSpec(BaseModel):
    """A vehicle attached to a depot."""
    id: str
    name: str = ""
    type: str = "TRUCK"
    capacity: float = Field(gt=0, description="Max load the vehicle can carry")


class Depot(BaseModel):
    """A resource warehouse / depot where vehicles are based."""
    id: str
    name: str = ""
    lat: float
    lng: float
    vehicles: List[VehicleSpec] = Field(min_length=1)


class DemandPoint(BaseModel):
    """A demand location that needs to be served."""
    id: str
    name: str = ""
    lat: float
    lng: float
    demand: float = Field(gt=0, description="Quantity of resource demanded")
    priority: DemandPriority = DemandPriority.MEDIUM
    timeWindowStart: Optional[int] = Field(
        None, description="Earliest service time in minutes from T0"
    )
    timeWindowEnd: Optional[int] = Field(
        None, description="Latest service time in minutes from T0"
    )


class SolverConfig(BaseModel):
    """Tuneable solver parameters."""
    maxSolveTimeSeconds: int = Field(default=30, ge=1, le=300)
    firstSolutionStrategy: FirstSolutionStrategy = FirstSolutionStrategy.PATH_CHEAPEST_ARC
    useOsrm: bool = Field(default=True, description="Use OSRM for real road distances; falls back to Haversine if False or OSRM unreachable")
    osrmBaseUrl: str = "https://router.project-osrm.org"
    serviceTimeMins: float = Field(default=10.0, ge=0, description="Service/unloading time at each demand point (minutes)")
    priorityPenaltyMultiplier: float = Field(default=1000.0, description="Penalty multiplier for dropping high-priority nodes")


class OptimizeRequest(BaseModel):
    """Top-level optimization request."""
    depots: List[Depot] = Field(min_length=1)
    demandPoints: List[DemandPoint] = Field(min_length=1)
    config: SolverConfig = Field(default_factory=SolverConfig)


# ── Response Models ────────────────────────────────────────────────────────────

class RouteStop(BaseModel):
    """A single stop on a vehicle's route."""
    demandPointId: str
    demandPointName: str = ""
    arrivalOrder: int
    lat: float
    lng: float
    demand: float
    cumulativeDistanceKm: float
    cumulativeDurationMin: float
    loadAfterStop: float


class OptimizedRoute(BaseModel):
    """An optimized route assigned to a single vehicle."""
    vehicleId: str
    vehicleName: str = ""
    vehicleType: str = "TRUCK"
    depotId: str
    depotName: str = ""
    depotLat: float
    depotLng: float
    stops: List[RouteStop]
    routeGeometry: Optional[dict] = Field(
        None, description="GeoJSON FeatureCollection of the road-following route"
    )
    totalDistanceKm: float
    totalDurationMin: float
    totalLoad: float
    vehicleCapacity: float
    utilizationPct: float = Field(description="Load / Capacity * 100")
    color: str = Field(default="#E86F16", description="Hex color for map rendering")


class DroppedDemand(BaseModel):
    """A demand point that could not be served."""
    demandPointId: str
    demandPointName: str = ""
    reason: str = "Capacity or distance constraint"


class SolverMetadata(BaseModel):
    """Metadata about the solver run."""
    status: SolverStatus
    solveTimeMs: int
    totalNodes: int
    totalVehicles: int
    usedVehicles: int
    droppedNodes: int
    objectiveValue: int
    distanceSource: str = Field(description="'OSRM' or 'HAVERSINE'")
    message: str = ""


class OptimizeResponse(BaseModel):
    """Top-level optimization response."""
    routes: List[OptimizedRoute]
    droppedDemands: List[DroppedDemand] = []
    totalDistanceKm: float
    totalDurationMin: float
    metadata: SolverMetadata


# ── Distance Matrix Request (utility endpoint) ────────────────────────────────

class LocationPoint(BaseModel):
    lat: float
    lng: float
    id: str = ""

class DistanceMatrixRequest(BaseModel):
    locations: List[LocationPoint] = Field(min_length=2)

class DistanceMatrixResponse(BaseModel):
    distances: List[List[float]]  # km
    durations: List[List[float]]  # minutes
    source: str  # "OSRM" or "HAVERSINE"
