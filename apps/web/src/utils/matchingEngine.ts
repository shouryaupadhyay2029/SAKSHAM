/**
 * SAKSHAM Matching Engine
 * Deterministic weighted scoring system for resource-demand matching.
 * Weights are configurable below.
 */

import type { ResourceItem } from '../types/resource';
import type { DemandRequest } from '../types/request';

// Configurable scoring weights — sum should = 1.0
const WEIGHTS = {
  distance: 0.35,
  availability: 0.25,
  capacity: 0.20,
  urgencyCompatibility: 0.20,
};

export interface MatchResult {
  resource: ResourceItem;
  score: number; // 0–100
  distanceKm: number;
  reasons: { label: string; points: number; description: string }[];
}

/** Haversine distance between two lat/lng points in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance score: ≤2km = 100, 2–5km = 80, 5–10km = 55, 10–20km = 30, >20km = 10 */
function distanceScore(km: number): number {
  if (km <= 2) return 100;
  if (km <= 5) return 80;
  if (km <= 10) return 55;
  if (km <= 20) return 30;
  return 10;
}

/** Availability score based on resource status */
function availabilityScore(status: string): number {
  switch (status) {
    case 'AVAILABLE': return 100;
    case 'LOW': return 55;
    case 'RESERVED': return 20;
    case 'IN_TRANSIT': return 10;
    default: return 0;
  }
}

/** Capacity score: whether quantity can satisfy the demand */
function capacityScore(available: number, needed: number): number {
  if (available >= needed * 1.5) return 100;
  if (available >= needed) return 85;
  if (available >= needed * 0.5) return 50;
  return 15;
}

/** Urgency compatibility: are category and priority aligned */
function urgencyScore(
  resourceCategory: string,
  demandCategory: string,
  priority: string
): number {
  const categoryMatch = resourceCategory === demandCategory;
  const priorityBonus = priority === 'CRITICAL' ? 20 : priority === 'HIGH' ? 15 : 5;
  return categoryMatch ? 100 : 100 - priorityBonus;
}

/** Run matching engine. Returns top resources ranked by score descending. */
export function matchResourcesToDemand(
  demand: DemandRequest,
  resources: ResourceItem[],
  topN = 5
): MatchResult[] {
  const eligible = resources.filter(
    r => r.status !== 'DEPLETED' && r.status !== 'DEPLOYED'
  );

  const results: MatchResult[] = eligible.map(resource => {
    const distKm = haversineKm(
      demand.coordinates.lat,
      demand.coordinates.lng,
      resource.coordinates.lat,
      resource.coordinates.lng
    );

    const dScore = distanceScore(distKm);
    const aScore = availabilityScore(resource.status);
    const cScore = capacityScore(resource.quantity, demand.quantity);
    const uScore = urgencyScore(resource.category, demand.category, demand.priority);

    const rawScore =
      dScore * WEIGHTS.distance +
      aScore * WEIGHTS.availability +
      cScore * WEIGHTS.capacity +
      uScore * WEIGHTS.urgencyCompatibility;

    const score = Math.round(rawScore);

    const reasons: MatchResult['reasons'] = [
      {
        label: 'Distance',
        points: Math.round(dScore * WEIGHTS.distance),
        description: `${distKm.toFixed(1)} km away — ${dScore >= 80 ? 'excellent' : dScore >= 55 ? 'acceptable' : 'distant'}`,
      },
      {
        label: 'Availability',
        points: Math.round(aScore * WEIGHTS.availability),
        description: `Status: ${resource.status}`,
      },
      {
        label: 'Capacity',
        points: Math.round(cScore * WEIGHTS.capacity),
        description: `${resource.quantity} ${resource.unit} vs ${demand.quantity} needed`,
      },
      {
        label: 'Urgency fit',
        points: Math.round(uScore * WEIGHTS.urgencyCompatibility),
        description: `Category match: ${resource.category === demand.category ? 'yes' : 'partial'}`,
      },
    ];

    return { resource, score, distanceKm: distKm, reasons };
  });

  return results.sort((a, b) => b.score - a.score).slice(0, topN);
}
