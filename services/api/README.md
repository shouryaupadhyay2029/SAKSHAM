# SAKSHAM API Service — Database + API Foundation

This is the backend REST API service for SAKSHAM, built with Node.js, Express, TypeScript, and Prisma ORM connecting to a PostgreSQL database.

## Architecture

The backend establishes the database schema, seeds, validation rules, and REST API foundation to support the SAKSHAM emergency response platform:

- **Web Server:** Node/Express with TS
- **Database:** PostgreSQL (with docker-compose setup)
- **ORM:** Prisma
- **Data Validation:** Zod
- **Structure:**
  - `src/config/`: Configuration values & environment variables
  - `src/db/`: Prisma Client initializer
  - `src/routes/`: REST API routing layer
  - `prisma/`: Database schemas and seed scripts

## Database Domain Model

The initial schema contains 13 relational entities:

1. **Officer:** Response personnel with roles (OPERATOR, REGIONAL_AUTHORITY, ADMIN)
2. **Incident:** Disaster events (FLOOD, FIRE, COLLAPSE, SHORTAGE) with statuses (REPORTED, VERIFIED, AWAITING_RESPONSE, UNDER_RESPONSE, RESOLVED)
3. **IncidentTimeline:** Chronological tracking of operational status events
4. **DemandRequest:** Supplies requested by incidents (WATER, FOOD, MEDICAL) with prioritizations
5. **Resource:** Materials available at depots (WATER, FOOD, MEDICAL, SHELTER_SUPPLIES, RESCUE_EQUIPMENT, CLOTHING)
6. **ResourceMovement:** Stock inbound/outbound changes
7. **Vehicle:** Rescue fleet assets (Truck, Ambulance, Helicopter, Boat, Drone)
8. **VehicleLocation:** Historic location coordinates
9. **Shelter:** Evacuation shelters and occupancy numbers
10. **Allocation:** Matches demands to resource depots and transport vehicles
11. **Dispatch:** Deployment tracking for vehicles
12. **Delivery:** Delivery status and receipt info
13. **Notification:** Platform-wide alerts

---

## Local Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL or Docker Desktop (for Compose database container)

### 2. Environment Setup
Copy the environment variables:
```bash
cp .env.example .env
```

### 3. Spin up Database (Docker Compose)
If using Docker:
```bash
docker compose up -d
```
Otherwise, update `DATABASE_URL` in `.env` to point to a native local/cloud PostgreSQL instance.

### 4. Install Dependencies
```bash
npm install
```

### 5. DB Migration & Seed
```bash
# Generate Prisma Client & Migrate Schema
npx prisma migrate dev --name init

# Populate Database with Seed Data
npx prisma db seed
```

### 6. Start Development Server
```bash
npm run dev
```
The server will boot on `http://localhost:4000`.

---

## REST Endpoints

### Incidents
- `GET /api/incidents` — Query parameters: `?status=ACTIVE`, `?severity=CRITICAL`, `?search=Yamuna`
- `GET /api/incidents/:id` — Fetch incident details & timeline
- `POST /api/incidents` — Report a new incident
- `PATCH /api/incidents/:id` — Update incident details
- `PATCH /api/incidents/:id/status` — Transit incident status

### Demands
- `GET /api/demands` — Query parameters: `?status=PENDING`, `?priority=CRITICAL`, `?incidentId=UUID`
- `GET /api/demands/:id` — Fetch demand details & matching resource allocations
- `POST /api/demands` — Request supplies
- `PATCH /api/demands/:id` — Update demand details
- `PATCH /api/demands/:id/status` — Transition demand status

### Resources
- `GET /api/resources` — Query parameters: `?category=WATER`, `?status=AVAILABLE`
- `GET /api/resources/:id` — Fetch resource depot and movements

### Vehicles
- `GET /api/vehicles` — Query parameters: `?status=AVAILABLE`, `?type=Truck`
- `GET /api/vehicles/:id` — Fetch vehicle details and latest coordinates

### Shelters
- `GET /api/shelters` — Query parameters: `?status=OPEN`, `?region=East Delhi`
- `GET /api/shelters/:id` — Fetch shelter info

### Timelines
- `GET /api/incidents/:id/timeline` — Chronological incident logs
- `POST /api/incidents/:id/timeline` — Post new operational event

---

## Standard JSON Response Payload

All successful list requests use the envelope:
```json
{
  "data": [...],
  "meta": {
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

Single records:
```json
{
  "data": {...}
}
```

---

## Phase 2 — Deterministic Matching + Resource Allocation Engine

### Overview

The matching engine implements a **fully deterministic, explainable scoring system** — no ML, no black boxes. Every recommendation score is computed from five weighted factors and can be audited field by field.

> **Authorized officers** review all recommendations and must manually approve or reject each allocation. There is no automatic dispatch.

---

### Matching Weights Formula

| Factor | Weight | Description |
|---|---|---|
| **Compatibility** | 35% | Does the resource category match the demand type? |
| **Availability** | 25% | Is sufficient unreserved stock available? |
| **Distance** | 20% | How far is the resource depot from the incident? |
| **Priority** | 10% | How critical is the demand request? |
| **Readiness** | 10% | What is the resource depot's operational status? |

Score bands: `EXCELLENT ≥ 90` · `GOOD ≥ 75` · `PARTIAL ≥ 50` · `POOR ≥ 20` · `INCOMPATIBLE < 20`

---

### Matching API

#### `GET /api/matching/demands/:demandId/recommendations`

Returns ranked resource recommendations for a specific demand.

**Response schema:**
```json
{
  "data": {
    "status": "MATCHES_FOUND | PARTIAL_MATCHES_FOUND | NO_MATCH_FOUND",
    "results": [
      {
        "resourceId": "uuid",
        "name": "Clean Drinking Water",
        "category": "WATER",
        "storageDepot": "East Delhi Relief Depot",
        "availableQuantity": 15000,
        "requestedQuantity": 12000,
        "canFullyFulfill": true,
        "distanceKm": 2.9,
        "score": 96,
        "breakdown": {
          "compatibility": 35,
          "availability": 25,
          "distance": 20,
          "priority": 10,
          "readiness": 10,
          "total": 100
        },
        "qualityLabel": "EXCELLENT",
        "explanation": [
          "Resource type matches the request (WATER)",
          "Sufficient quantity available: 15,000 L (requires 12,000 L)",
          "Resource is 2.9 km from the affected area",
          "Resource depot readiness status is AVAILABLE"
        ]
      }
    ],
    "bestMatch": { "..." : "..." },
    "fullCoveragePossible": false,
    "candidateCombination": [
      { "resourceId": "uuid-r1", "quantity": 7000 },
      { "resourceId": "uuid-r2", "quantity": 5000 }
    ]
  }
}
```

**Eligibility filters** (resources automatically excluded if any apply):
- Status is `DEPLETED` or `RESERVED`
- `availableQuantity - reservedQuantity <= 0`

---

### Allocation Lifecycle

```
DEMAND (PENDING)
       ↓
GET /matching/demands/:id/recommendations
       ↓ Officer reviews ranked list
POST /api/allocations          → status: RECOMMENDED  | demand: MATCHED
       ↓
POST /api/allocations/:id/approve  → status: APPROVED   | demand: ALLOCATED
   OR
POST /api/allocations/:id/reject   → status: REJECTED   | demand: PENDING (reverted)
```

Every state transition automatically:
- Updates resource `reservedQuantity` (or unreserves on rejection)
- Updates demand request `status`
- Creates a timestamped `IncidentTimeline` event for full audit trail

---

### Allocation Endpoints

#### `GET /api/allocations`
Query params: `?status=RECOMMENDED`, `?demandId=UUID`, `?resourceId=UUID`

#### `GET /api/allocations/:id`
Accepts UUID or custom `ALL-2026-XXX` format.

#### `POST /api/allocations`
```json
{
  "demandId": "uuid",
  "resourceId": "uuid",
  "quantity": 12000,
  "vehicleId": "uuid"   // optional
}
```
Requires `x-officer-email` header for officer attribution.
Uses `SELECT … FOR UPDATE` row-locking to prevent double allocation.

#### `POST /api/allocations/:id/approve`
Header: `x-officer-email: authority@saksham.demo`

#### `POST /api/allocations/:id/reject`
```json
{ "reason": "Resource re-routed to higher priority incident INC-2026-090" }
```

---

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch
```

The test suite (`src/tests/matching.test.ts`) covers **37 test cases** across:
- Haversine distance utility correctness
- Matching weight constants integrity (weights sum = 100)
- Scoring logic for each factor (compatibility, availability, distance, priority, readiness)
- Eligibility filtering (DEPLETED, RESERVED, zero-stock)
- Multi-resource combination matching
- Allocation lifecycle state-machine validation

---

### Seed Data Scenarios

The extended seed (`prisma/seed.ts`) includes scenarios for:

| Scenario | Demand | Resources |
|---|---|---|
| Full match | REQ-DEL-101 (WATER, 12k L) | RES-WT-001 (15k L, close) |
| Partial match | REQ-DEL-104 (WATER, 100k L) | RES-WT-002 (5k L) + RES-WT-003 (50k L) |
| Medical match | REQ-DEL-102 (MEDICAL, 100 kits) | RES-MD-001 (200 kits) |
| No match (depleted) | REQ-DEL-103 (FOOD, 1k packs) | RES-FD-001 (DEPLETED) |
| Exact match | REQ-DEL-105 (RESCUE, 5 sets) | RES-RC-001 (10 sets) |
