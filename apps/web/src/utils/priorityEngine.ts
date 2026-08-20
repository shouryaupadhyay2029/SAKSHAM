/**
 * SAKSHAM Priority Engine
 * Explainable deterministic priority scoring for incidents.
 * Operators can see exactly WHY an incident is prioritized.
 */

import type { Incident } from '../types/incident';
import type { DemandRequest } from '../types/request';
import type { ResourceItem } from '../types/resource';

export interface PriorityResult {
  score: number; // 0–100
  reasons: { label: string; points: number; description: string }[];
}

/** Severity → base points */
function severityPoints(severity: string): number {
  switch (severity) {
    case 'CRITICAL': return 40;
    case 'HIGH': return 28;
    case 'MEDIUM': return 14;
    case 'LOW': return 5;
    default: return 0;
  }
}

/** Displaced/affected population → points */
function populationPoints(displaced?: number): number {
  if (!displaced) return 0;
  if (displaced >= 500) return 25;
  if (displaced >= 200) return 18;
  if (displaced >= 100) return 12;
  if (displaced >= 50) return 7;
  return 3;
}

/** Open demands urgency → points */
function demandUrgencyPoints(demands: DemandRequest[], incidentId: string): number {
  const incidentDemands = demands.filter(d => d.incidentId === incidentId);
  const hasCritical = incidentDemands.some(d => d.priority === 'CRITICAL');
  const hasHigh = incidentDemands.some(d => d.priority === 'HIGH');
  if (hasCritical) return 20;
  if (hasHigh) return 12;
  if (incidentDemands.length > 0) return 6;
  return 0;
}

/** Resource scarcity for incident's demand types → points */
function scarcityPoints(demands: DemandRequest[], resources: ResourceItem[], incidentId: string): number {
  const incidentDemands = demands.filter(d => d.incidentId === incidentId);
  if (incidentDemands.length === 0) return 0;

  const categories = incidentDemands.map(d => d.category);
  const anyUnavailable = categories.some(cat => {
    const available = resources.filter(r => r.category === cat && r.status === 'AVAILABLE');
    return available.length === 0;
  });
  return anyUnavailable ? 15 : 5;
}

/** Compute priority for a single incident */
export function computePriority(
  incident: Incident,
  demands: DemandRequest[],
  resources: ResourceItem[]
): PriorityResult {
  const sev = severityPoints(incident.severity);
  const pop = populationPoints(incident.displacedCount);
  const urg = demandUrgencyPoints(demands, incident.id);
  const sca = scarcityPoints(demands, resources, incident.id);

  const raw = sev + pop + urg + sca;
  // Normalize to 100 (max theoretical = 40+25+20+15 = 100)
  const score = Math.min(100, raw);

  const reasons = [
    {
      label: `${incident.severity} severity`,
      points: sev,
      description: 'Incident severity classification',
    },
    {
      label: `${incident.displacedCount ?? 0} affected`,
      points: pop,
      description: 'Displaced or affected population count',
    },
    {
      label: 'Demand urgency',
      points: urg,
      description: 'Based on open demands linked to this incident',
    },
    {
      label: 'Resource scarcity',
      points: sca,
      description: 'Availability of matching resources for demand types',
    },
  ].filter(r => r.points > 0);

  return { score, reasons };
}
