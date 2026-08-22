/**
 * SAKSHAM Route Optimizer Service
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript API client for the Google OR-Tools + OpenStreetMap MDVRP optimizer.
 */

export interface VehicleSpec {
  id: string;
  name?: string;
  type?: string;
  capacity: number;
}

export interface Depot {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  vehicles: VehicleSpec[];
}

export type DemandPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DemandPoint {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  demand: number;
  priority?: DemandPriority;
  timeWindowStart?: number;
  timeWindowEnd?: number;
}

export type FirstSolutionStrategy =
  | 'PATH_CHEAPEST_ARC'
  | 'SAVINGS'
  | 'CHRISTOFIDES'
  | 'PARALLEL_CHEAPEST_INSERTION'
  | 'LOCAL_CHEAPEST_INSERTION'
  | 'GLOBAL_CHEAPEST_ARC';

export interface SolverConfig {
  maxSolveTimeSeconds?: number;
  firstSolutionStrategy?: FirstSolutionStrategy;
  useOsrm?: boolean;
  osrmBaseUrl?: string;
  serviceTimeMins?: number;
  priorityPenaltyMultiplier?: number;
}

export interface OptimizeRequest {
  depots: Depot[];
  demandPoints: DemandPoint[];
  config?: SolverConfig;
}

export interface RouteStop {
  demandPointId: string;
  demandPointName: string;
  arrivalOrder: number;
  lat: number;
  lng: number;
  demand: number;
  cumulativeDistanceKm: number;
  cumulativeDurationMin: number;
  loadAfterStop: number;
}

export interface OptimizedRoute {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  depotId: string;
  depotName: string;
  depotLat: number;
  depotLng: number;
  stops: RouteStop[];
  routeGeometry?: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties?: Record<string, any>;
      geometry: {
        type: 'LineString';
        coordinates: [number, number][]; // [lng, lat]
      };
    }>;
  } | null;
  totalDistanceKm: number;
  totalDurationMin: number;
  totalLoad: number;
  vehicleCapacity: number;
  utilizationPct: number;
  color: string;
}

export interface DroppedDemand {
  demandPointId: string;
  demandPointName: string;
  reason: string;
}

export interface SolverMetadata {
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT' | 'ERROR';
  solveTimeMs: number;
  totalNodes: number;
  totalVehicles: number;
  usedVehicles: number;
  droppedNodes: number;
  objectiveValue: number;
  distanceSource: string;
  message: string;
}

export interface OptimizeResponse {
  routes: OptimizedRoute[];
  droppedDemands: DroppedDemand[];
  totalDistanceKm: number;
  totalDurationMin: number;
  metadata: SolverMetadata;
}

const OPTIMIZER_API_URL = import.meta.env.VITE_OPTIMIZER_API_URL || 'http://localhost:8001';

/**
 * Run Multi-Depot Vehicle Routing Optimization
 */
export async function runOptimization(req: OptimizeRequest): Promise<OptimizeResponse> {
  const url = `${OPTIMIZER_API_URL}/api/optimize`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        depots: req.depots,
        demandPoints: req.demandPoints,
        config: {
          maxSolveTimeSeconds: req.config?.maxSolveTimeSeconds ?? 30,
          firstSolutionStrategy: req.config?.firstSolutionStrategy ?? 'PATH_CHEAPEST_ARC',
          useOsrm: req.config?.useOsrm ?? true,
          osrmBaseUrl: req.config?.osrmBaseUrl ?? 'https://router.project-osrm.org',
          serviceTimeMins: req.config?.serviceTimeMins ?? 10,
          priorityPenaltyMultiplier: req.config?.priorityPenaltyMultiplier ?? 1000,
        },
      }),
    });

    if (!response.ok) {
      let errDetail = 'Failed to execute route optimization';
      try {
        const errJson = await response.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch (_) {}
      throw new Error(`Optimizer Service Error (${response.status}): ${errDetail}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Offline / Local fallback client-side solver or clear error message
      throw new Error(
        `Unable to reach Optimizer backend at ${OPTIMIZER_API_URL}. Ensure the service is running (python -m uvicorn app.main:app --port 8001) or check your network connection.`
      );
    }
    throw error;
  }
}

/**
 * Check if the optimizer microservice is live
 */
export async function checkOptimizerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OPTIMIZER_API_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
