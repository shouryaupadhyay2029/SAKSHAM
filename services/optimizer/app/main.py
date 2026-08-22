"""
SAKSHAM Optimizer – FastAPI Application
───────────────────────────────────────
Multi-Depot Vehicle Routing Problem optimizer service.
Uses Google OR-Tools for solving and OSRM for real road distances.

Endpoints:
  POST /api/optimize          — Run the MDVRP optimizer
  POST /api/distance-matrix   — Get a distance/duration matrix for locations
  GET  /api/health            — Health check
"""

from __future__ import annotations

import logging
from typing import List, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    OptimizeRequest,
    OptimizeResponse,
    DistanceMatrixRequest,
    DistanceMatrixResponse,
)
from app.osrm_client import (
    get_distance_duration_matrix,
    get_route_geometry,
    build_haversine_matrix,
)
from app.solver import solve_mdvrp

# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-24s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger("saksham.optimizer")

# ── FastAPI App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SAKSHAM Route Optimizer",
    version="1.0.0",
    description="Multi-Depot Vehicle Routing Problem optimizer using Google OR-Tools and OpenStreetMap (OSRM).",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "saksham-optimizer", "version": "1.0.0"}


# ── Distance Matrix Endpoint ──────────────────────────────────────────────────

@app.post("/api/distance-matrix", response_model=DistanceMatrixResponse, tags=["Utilities"])
async def distance_matrix(req: DistanceMatrixRequest):
    """
    Get an N×N distance/duration matrix for a set of locations.
    Useful for testing or inspecting OSRM results.
    """
    locations = [(loc.lat, loc.lng) for loc in req.locations]
    dists, durs, source = await get_distance_duration_matrix(locations)
    return DistanceMatrixResponse(distances=dists, durations=durs, source=source)


# ── Main Optimization Endpoint ────────────────────────────────────────────────

@app.post("/api/optimize", response_model=OptimizeResponse, tags=["Optimizer"])
async def optimize(req: OptimizeRequest):
    """
    Solve the Multi-Depot Capacitated Vehicle Routing Problem.

    Flow:
    1. Gather all locations (depots + demand points)
    2. Fetch N×N distance/duration matrix from OSRM (or Haversine fallback)
    3. Run OR-Tools solver
    4. Fetch road geometries for each solved route
    5. Return optimized routes with GeoJSON geometries
    """
    logger.info(
        "Optimization request: %d depots, %d demand points, %d total vehicles",
        len(req.depots),
        len(req.demandPoints),
        sum(len(d.vehicles) for d in req.depots),
    )

    # ── 1. Build location list: depots first, then demands ─────────────────────
    locations: List[Tuple[float, float]] = []

    for depot in req.depots:
        locations.append((depot.lat, depot.lng))

    for dp in req.demandPoints:
        locations.append((dp.lat, dp.lng))

    num_depots = len(req.depots)

    # ── 2. Get distance/duration matrix ────────────────────────────────────────
    if req.config.useOsrm:
        dist_matrix, dur_matrix, source = await get_distance_duration_matrix(
            locations, req.config.osrmBaseUrl
        )
    else:
        dist_matrix, dur_matrix = build_haversine_matrix(locations)
        source = "HAVERSINE"

    logger.info("Distance matrix source: %s (%d×%d)", source, len(locations), len(locations))

    # ── 3. Run OR-Tools solver ─────────────────────────────────────────────────
    try:
        routes, dropped, metadata = solve_mdvrp(
            depots=req.depots,
            demand_points=req.demandPoints,
            distance_matrix_km=dist_matrix,
            duration_matrix_min=dur_matrix,
            config=req.config,
        )
    except Exception as exc:
        logger.exception("Solver error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Solver error: {exc}")

    metadata.distanceSource = source

    # ── 4. Fetch road geometries for each route ────────────────────────────────
    if req.config.useOsrm and routes:
        for route in routes:
            # Build waypoint list: depot → stops in order → depot
            waypoints: List[Tuple[float, float]] = [(route.depotLat, route.depotLng)]
            for stop in route.stops:
                waypoints.append((stop.lat, stop.lng))
            waypoints.append((route.depotLat, route.depotLng))  # Return to depot

            geometry = await get_route_geometry(waypoints, req.config.osrmBaseUrl)
            route.routeGeometry = geometry

    # ── 5. Compute totals and return ───────────────────────────────────────────
    total_dist = sum(r.totalDistanceKm for r in routes)
    total_dur = sum(r.totalDurationMin for r in routes)

    logger.info(
        "Optimization complete: %d routes, %.1f km total, %d dropped demands",
        len(routes), total_dist, len(dropped),
    )

    return OptimizeResponse(
        routes=routes,
        droppedDemands=dropped,
        totalDistanceKm=round(total_dist, 2),
        totalDurationMin=round(total_dur, 1),
        metadata=metadata,
    )


# ── Entry Point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
