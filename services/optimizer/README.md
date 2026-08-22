# SAKSHAM Route Optimizer Service

Multi-Depot Vehicle Routing Problem (MDVRP) optimizer using **Google OR-Tools** with real road-network distances from **OSRM (OpenStreetMap)**.

## Architecture

```
services/optimizer/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application & endpoints
│   ├── schemas.py       # Pydantic request/response models
│   ├── solver.py        # Google OR-Tools MDVRP solver
│   └── osrm_client.py   # OSRM Table & Route API client
├── requirements.txt
└── README.md
```

## Quick Start

```bash
# Install dependencies
cd services/optimizer
pip install -r requirements.txt

# Start the optimizer service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

The API docs are available at `http://localhost:8001/docs`.

## API Reference

### `POST /api/optimize`

Solve the Multi-Depot Capacitated Vehicle Routing Problem.

**Request Body:**
```json
{
  "depots": [
    {
      "id": "DEPOT-1",
      "name": "Central Warehouse",
      "lat": 28.6139,
      "lng": 77.2090,
      "vehicles": [
        { "id": "VEH-001", "name": "Truck Alpha", "type": "TRUCK", "capacity": 500 }
      ]
    }
  ],
  "demandPoints": [
    {
      "id": "DEM-001",
      "name": "Rohini Shelter",
      "lat": 28.7041,
      "lng": 77.1025,
      "demand": 200,
      "priority": "CRITICAL"
    }
  ],
  "config": {
    "maxSolveTimeSeconds": 30,
    "useOsrm": true,
    "serviceTimeMins": 10
  }
}
```

**Response:** Optimized routes with road-following GeoJSON geometries, per-vehicle stop orders, cumulative metrics, and solver metadata.

### `POST /api/distance-matrix`

Get an N×N distance/duration matrix for a set of locations (utility endpoint).

### `GET /api/health`

Health check.

## Key Features

- **Multi-depot support**: Vehicles start and return to their home depot
- **Capacity constraints**: Respects vehicle load limits
- **Priority-aware**: CRITICAL/HIGH demands get priority through drop penalties
- **OSRM integration**: Real road distances and route geometries from OpenStreetMap
- **Haversine fallback**: Graceful degradation when OSRM is unreachable
- **Configurable**: Solver time limit, first-solution strategy, service times

## Configuration

The solver can be configured per-request via the `config` field:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxSolveTimeSeconds` | 30 | Maximum solver runtime |
| `firstSolutionStrategy` | `PATH_CHEAPEST_ARC` | Initial solution heuristic |
| `useOsrm` | `true` | Use OSRM for real road distances |
| `osrmBaseUrl` | `https://router.project-osrm.org` | OSRM server URL |
| `serviceTimeMins` | 10.0 | Unloading time at each stop |
| `priorityPenaltyMultiplier` | 1000.0 | Scale factor for drop penalties |

## Production Notes

The default OSRM URL (`router.project-osrm.org`) is a demo server with rate limits. For production, run a local OSRM instance:

```bash
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/india-latest.osrm
docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/india-latest.osrm
```

Then set `osrmBaseUrl` to `http://localhost:5000` in the request config.
