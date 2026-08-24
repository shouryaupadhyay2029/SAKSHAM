export interface RouteCandidate {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  routeScore: number;
  selected: boolean;
  decisionReason: string;
  decisionFactors: {
    travelTimeScore: number;
    distanceScore: number;
    accessibilityScore: number;
    priorityScore: number;
  };
  summary?: string;
}

export interface RouteDecision {
  routingProvider: string; // e.g. "OSRM"
  profile: string; // e.g. "driving"
  selectedRoute: RouteCandidate;
  alternatives: RouteCandidate[];
  routeScore: number;
  decisionReason: string;
  decisionFactors: {
    travelTimeScore: number;
    distanceScore: number;
    accessibilityScore: number;
    priorityScore: number;
  };
  calculatedAt: string; // ISO timestamp
  eta: string; // ISO string representing arrival time
  policyName?: string;
  policyReason?: string;
  policyWeights?: Record<string, number>;
}

export interface DeviationCheckResult {
  deviated: boolean;
  distanceFromRouteMeters: number;
  thresholdMeters: number;
}

export async function calculateRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  incidentSeverity?: string,
  incidentAffectedPeople?: number
): Promise<RouteDecision> {
  // Validate coordinates exist
  if (!origin || origin.lat === undefined || origin.lng === undefined || origin.lat === 0 || origin.lng === 0) {
    throw new Error('ORIGIN COORDINATES UNAVAILABLE');
  }
  if (!destination || destination.lat === undefined || destination.lng === undefined || destination.lat === 0 || destination.lng === 0) {
    throw new Error('DESTINATION COORDINATES UNAVAILABLE');
  }

  const getRoutingApiBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL;
    if (url) {
      return url.endsWith('/api') ? url : `${url}/api`;
    }
    return '/api/v1';
  };
  const apiBaseUrl = getRoutingApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}/routing/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      incident_severity: incidentSeverity || null,
      incident_affected_people: incidentAffectedPeople || 0
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Routing request failed: ${errText || res.statusText}`);
  }

  const data = await res.json();
  if (!data || !data.selected_route) {
    throw new Error('No routing paths found between points');
  }

  // Map backend response snake_case to camelCase
  const mapCandidate = (c: any): RouteCandidate => ({
    id: c.id,
    distanceMeters: c.distance_meters,
    durationSeconds: c.duration_seconds,
    geometry: c.geometry,
    routeScore: c.route_score,
    selected: c.selected,
    decisionReason: c.decision_reason,
    decisionFactors: {
      travelTimeScore: c.decision_factors?.travel_time_score || 0,
      distanceScore: c.decision_factors?.distance_score || 0,
      accessibilityScore: c.decision_factors?.accessibility_score || 0,
      priorityScore: c.decision_factors?.priority_score || 0
    },
    summary: c.summary
  });

  const selectedRoute = mapCandidate(data.selected_route);
  const etaDate = new Date(Date.now() + selectedRoute.durationSeconds * 1000);

  return {
    routingProvider: data.routing_provider,
    profile: data.profile,
    selectedRoute,
    alternatives: (data.alternatives || []).map(mapCandidate),
    routeScore: data.route_score,
    decisionReason: data.decision_reason,
    decisionFactors: {
      travelTimeScore: data.decision_factors?.travel_time_score || 0,
      distanceScore: data.decision_factors?.distance_score || 0,
      accessibilityScore: data.decision_factors?.accessibility_score || 0,
      priorityScore: data.decision_factors?.priority_score || 0
    },
    calculatedAt: data.calculated_at,
    eta: etaDate.toISOString(),
    policyName: data.policy_name,
    policyReason: data.policy_reason,
    policyWeights: data.policy_weights
  };
}

export async function checkRouteDeviation(
  routeGeometry: any,
  vehicleLat: number,
  vehicleLng: number,
  thresholdMeters: number = 150.0
): Promise<DeviationCheckResult> {
  const getRoutingApiBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL;
    if (url) {
      return url.endsWith('/api') ? url : `${url}/api`;
    }
    return '/api/v1';
  };
  const apiBaseUrl = getRoutingApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}/routing/check-deviation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      route_geometry: routeGeometry,
      vehicle_lat: vehicleLat,
      vehicle_lng: vehicleLng,
      threshold_meters: thresholdMeters
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Deviation check failed: ${errText || res.statusText}`);
  }

  const data = await res.json();
  return {
    deviated: data.deviated,
    distanceFromRouteMeters: data.distance_from_route_meters,
    thresholdMeters: data.threshold_meters
  };
}
