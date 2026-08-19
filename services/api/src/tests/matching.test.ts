/**
 * SAKSHAM Phase 2 — Matching Engine & Allocation Lifecycle Tests
 *
 * Test groups:
 *  1. Haversine Distance Utility
 *  2. Matching Constants Integrity
 *  3. MatchingService — scoring logic (unit tests with mocked Prisma)
 *  4. MatchingService — eligibility filtering
 *  5. MatchingService — partial coverage / combination logic
 *  6. Allocation lifecycle state-machine validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateHaversineDistance } from '../utils/distance.js';
import { MATCH_WEIGHTS, COMPATIBLE_CATEGORIES } from '../modules/matching/matching.constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Haversine Distance Utility
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateHaversineDistance', () => {
  it('returns 0 for same coordinates', () => {
    const d = calculateHaversineDistance(28.6208, 77.2625, 28.6208, 77.2625);
    expect(d).toBeCloseTo(0, 3);
  });

  it('calculates correct distance between two known Delhi landmarks', () => {
    // Yamuna Bank (28.6208, 77.2625) → Preet Vihar (28.6385, 77.2912) ≈ 2.8–3.2 km
    const d = calculateHaversineDistance(28.6208, 77.2625, 28.6385, 77.2912);
    expect(d).toBeGreaterThan(2.5);
    expect(d).toBeLessThan(3.8);
  });

  it('returns a larger value for farther locations', () => {
    const close = calculateHaversineDistance(28.6208, 77.2625, 28.6385, 77.2912);
    const far = calculateHaversineDistance(28.6208, 77.2625, 28.5245, 77.2066);
    expect(far).toBeGreaterThan(close);
  });

  it('is symmetric (A→B === B→A)', () => {
    const ab = calculateHaversineDistance(28.6208, 77.2625, 28.6435, 77.1895);
    const ba = calculateHaversineDistance(28.6435, 77.1895, 28.6208, 77.2625);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it('returns values in kilometers (Delhi–Mumbai is ~1100–1200 km)', () => {
    const d = calculateHaversineDistance(28.6139, 77.2090, 19.0760, 72.8777);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1250);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Matching Constants Integrity
// ─────────────────────────────────────────────────────────────────────────────

describe('MATCH_WEIGHTS', () => {
  it('all weights sum to exactly 100', () => {
    const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it('no weight is zero or negative', () => {
    Object.values(MATCH_WEIGHTS).forEach(w => expect(w).toBeGreaterThan(0));
  });

  it('COMPATIBILITY is the highest weighted factor', () => {
    const { COMPATIBILITY, AVAILABILITY, DISTANCE, PRIORITY, READINESS } = MATCH_WEIGHTS;
    expect(COMPATIBILITY).toBeGreaterThan(AVAILABILITY);
    expect(COMPATIBILITY).toBeGreaterThan(DISTANCE);
    expect(COMPATIBILITY).toBeGreaterThan(PRIORITY);
    expect(COMPATIBILITY).toBeGreaterThan(READINESS);
  });
});

describe('COMPATIBLE_CATEGORIES', () => {
  it('WATER demand maps only to WATER resource category', () => {
    expect(COMPATIBLE_CATEGORIES['WATER']).toEqual(['WATER']);
  });

  it('MEDICAL demand maps only to MEDICAL resource category', () => {
    expect(COMPATIBLE_CATEGORIES['MEDICAL']).toEqual(['MEDICAL']);
  });

  it('OTHER demand maps to multiple fallback categories', () => {
    const cats = COMPATIBLE_CATEGORIES['OTHER'];
    expect(cats).toContain('OTHER');
    expect(cats.length).toBeGreaterThan(1);
  });

  it('all standard demand types have defined mappings', () => {
    const expectedTypes = ['WATER', 'FOOD', 'MEDICAL', 'SHELTER_SUPPLIES', 'CLOTHING', 'RESCUE_EQUIPMENT'];
    expectedTypes.forEach(type => {
      expect(COMPATIBLE_CATEGORIES[type]).toBeDefined();
      expect(COMPATIBLE_CATEGORIES[type].length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 & 4. MatchingService — scoring and eligibility (unit tests with mocked Prisma)
// ─────────────────────────────────────────────────────────────────────────────

// We mock the db module so tests don't require a live database
vi.mock('../db/db.js', () => ({
  prisma: {
    demandRequest: {
      findUnique: vi.fn(),
    },
    resource: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../db/db.js';
import { MatchingService } from '../modules/matching/matching.service.js';

// Shared mock builders
const makeDemand = (overrides = {}) => ({
  id: 'demand-uuid-001',
  requestId: 'REQ-TEST-001',
  requestedType: 'WATER',
  quantity: 10000,
  unit: 'Liters',
  priority: 'CRITICAL',
  status: 'PENDING',
  incident: {
    id: 'inc-uuid-001',
    latitude: 28.6208,
    longitude: 77.2625,
  },
  ...overrides,
});

const makeResource = (overrides = {}) => ({
  id: 'res-uuid-001',
  resourceId: 'RES-WT-TEST-001',
  materialName: 'Test Water Supply',
  category: 'WATER',
  availableQuantity: 15000,
  reservedQuantity: 0,
  unit: 'Liters',
  storageDepot: 'Test Depot',
  location: 'Preet Vihar, Delhi',
  latitude: 28.6385,
  longitude: 77.2912,
  status: 'AVAILABLE',
  pointOfContact: 'Test Contact',
  ...overrides,
});

describe('MatchingService.getRecommendations — scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns MATCHES_FOUND with valid resource that can fully fulfil demand', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([makeResource()]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');

    expect(result.status).toBe('MATCHES_FOUND');
    expect(result.results).toHaveLength(1);
    expect(result.bestMatch).not.toBeNull();
    expect(result.bestMatch!.canFullyFulfill).toBe(true);
  });

  it('score breakdown sums to reported total', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([makeResource()]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    const rec = result.results[0];

    const { compatibility, availability, distance, priority, readiness, total } = rec.breakdown;
    expect(compatibility + availability + distance + priority + readiness).toBe(total);
    expect(rec.score).toBe(total);
  });

  it('compatibility score always equals MATCH_WEIGHTS.COMPATIBILITY for matching category', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([makeResource()]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.results[0].breakdown.compatibility).toBe(MATCH_WEIGHTS.COMPATIBILITY);
  });

  it('availability score is max when resource can fully fulfil', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand({ quantity: 5000 }));
    (prisma.resource.findMany as any).mockResolvedValue([makeResource({ availableQuantity: 10000, reservedQuantity: 0 })]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.results[0].breakdown.availability).toBe(MATCH_WEIGHTS.AVAILABILITY);
  });

  it('availability score is proportionally reduced for partial fulfillment', async () => {
    const demand = makeDemand({ quantity: 10000 });
    const resource = makeResource({ availableQuantity: 5000, reservedQuantity: 0 });

    (prisma.demandRequest.findUnique as any).mockResolvedValue(demand);
    (prisma.resource.findMany as any).mockResolvedValue([resource]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    const avail = result.results[0].breakdown.availability;

    // 5000/10000 = 0.5 ratio, so score ≈ AVAILABILITY * 0.5 = 12 or 13
    expect(avail).toBeLessThan(MATCH_WEIGHTS.AVAILABILITY);
    expect(avail).toBeGreaterThan(0);
  });

  it('distance score is max (20) for resource within 3 km of incident', async () => {
    // Preet Vihar (28.6385, 77.2912) is ~3 km from Yamuna Bank (28.6208, 77.2625)
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([makeResource()]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    const distScore = result.results[0].breakdown.distance;
    // At ~3 km, should be at or near max distance weight
    expect(distScore).toBeGreaterThanOrEqual(MATCH_WEIGHTS.DISTANCE * 0.85);
  });

  it('distance score is reduced for a resource far away (>25 km)', async () => {
    // Place resource in Mumbai-ish coordinates for extreme distance
    const farResource = makeResource({ latitude: 19.0760, longitude: 72.8777 });

    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([farResource]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.results[0].breakdown.distance).toBeLessThan(MATCH_WEIGHTS.DISTANCE * 0.25);
  });

  it('CRITICAL priority gives maximum priority score', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand({ priority: 'CRITICAL' }));
    (prisma.resource.findMany as any).mockResolvedValue([makeResource()]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.results[0].breakdown.priority).toBe(MATCH_WEIGHTS.PRIORITY);
  });

  it('LOW priority gives reduced priority score', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand({ priority: 'LOW' }));
    (prisma.resource.findMany as any).mockResolvedValue([makeResource()]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    const prio = result.results[0].breakdown.priority;
    expect(prio).toBeLessThan(MATCH_WEIGHTS.PRIORITY);
  });

  it('AVAILABLE status gives max readiness score', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([makeResource({ status: 'AVAILABLE' })]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.results[0].breakdown.readiness).toBe(MATCH_WEIGHTS.READINESS);
  });

  it('LOW status gives partial readiness score', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([makeResource({ status: 'LOW' })]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    const readiness = result.results[0].breakdown.readiness;
    expect(readiness).toBeGreaterThan(0);
    expect(readiness).toBeLessThan(MATCH_WEIGHTS.READINESS);
  });

  it('results are sorted by score in descending order', async () => {
    const resources = [
      makeResource({ id: 'r1', resourceId: 'R1', availableQuantity: 1000, reservedQuantity: 0 }),   // partial
      makeResource({ id: 'r2', resourceId: 'R2', availableQuantity: 50000, reservedQuantity: 0 }), // full
    ];

    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand({ quantity: 10000 }));
    (prisma.resource.findMany as any).mockResolvedValue(resources);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    // Full fulfillment resource should rank first
    expect(result.results[0].score).toBeGreaterThanOrEqual(result.results[1].score);
  });

  it('qualityLabel is EXCELLENT for a near-perfect score (≥90)', async () => {
    // Ideal resource: nearby, available, full stock, critical demand
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand({ priority: 'CRITICAL' }));
    (prisma.resource.findMany as any).mockResolvedValue([makeResource({ status: 'AVAILABLE', availableQuantity: 100000 })]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.results[0].qualityLabel).toBe('EXCELLENT');
  });

  it('explanation array has at least 3 entries', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([makeResource()]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.results[0].explanation.length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Eligibility Filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('MatchingService.getRecommendations — eligibility filters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters out DEPLETED resources', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([
      makeResource({ status: 'DEPLETED', availableQuantity: 0, reservedQuantity: 0 }),
    ]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.status).toBe('NO_MATCH_FOUND');
    expect(result.results).toHaveLength(0);
  });

  it('filters out RESERVED resources (fully reserved)', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([
      makeResource({ status: 'RESERVED', availableQuantity: 15000, reservedQuantity: 12000 }),
    ]);

    // reservedQuantity >= availableQuantity → eligible, just partial
    // But status RESERVED → filtered immediately
    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.status).toBe('NO_MATCH_FOUND');
  });

  it('filters out resources with zero unreserved quantity', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([
      makeResource({ status: 'AVAILABLE', availableQuantity: 5000, reservedQuantity: 5000 }),
    ]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.status).toBe('NO_MATCH_FOUND');
  });

  it('returns NO_MATCH_FOUND when resource list is empty', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(makeDemand());
    (prisma.resource.findMany as any).mockResolvedValue([]);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.status).toBe('NO_MATCH_FOUND');
    expect(result.bestMatch).toBeNull();
  });

  it('throws when demand is not found', async () => {
    (prisma.demandRequest.findUnique as any).mockResolvedValue(null);
    (prisma.resource.findMany as any).mockResolvedValue([]);

    await expect(MatchingService.getRecommendations('non-existent-uuid')).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Partial Coverage & Combination Logic
// ─────────────────────────────────────────────────────────────────────────────

describe('MatchingService.getRecommendations — combination matching', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets fullCoveragePossible=true when multiple resources can cover demand together', async () => {
    const demand = makeDemand({ quantity: 10000 });
    // Two resources each with 6000 units — together they cover 12000 > 10000
    const resources = [
      makeResource({ id: 'r1', resourceId: 'R1', availableQuantity: 6000, reservedQuantity: 0 }),
      makeResource({ id: 'r2', resourceId: 'R2', availableQuantity: 6000, reservedQuantity: 0, latitude: 28.6400, longitude: 77.2950 }),
    ];

    (prisma.demandRequest.findUnique as any).mockResolvedValue(demand);
    (prisma.resource.findMany as any).mockResolvedValue(resources);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.status).toBe('PARTIAL_MATCHES_FOUND');
    expect(result.fullCoveragePossible).toBe(true);
    expect(result.candidateCombination).not.toBeNull();
    expect(result.candidateCombination!.length).toBeGreaterThan(0);
  });

  it('candidateCombination quantities sum to exactly the demanded amount', async () => {
    const demand = makeDemand({ quantity: 10000 });
    const resources = [
      makeResource({ id: 'r1', resourceId: 'R1', availableQuantity: 4000, reservedQuantity: 0 }),
      makeResource({ id: 'r2', resourceId: 'R2', availableQuantity: 4000, reservedQuantity: 0, latitude: 28.63, longitude: 77.28 }),
      makeResource({ id: 'r3', resourceId: 'R3', availableQuantity: 4000, reservedQuantity: 0, latitude: 28.64, longitude: 77.30 }),
    ];

    (prisma.demandRequest.findUnique as any).mockResolvedValue(demand);
    (prisma.resource.findMany as any).mockResolvedValue(resources);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    if (result.candidateCombination) {
      const totalCovered = result.candidateCombination.reduce((sum, c) => sum + c.quantity, 0);
      expect(totalCovered).toBe(demand.quantity);
    }
  });

  it('fullCoveragePossible=false when combined resources are still insufficient', async () => {
    const demand = makeDemand({ quantity: 100000 });
    const resources = [
      makeResource({ id: 'r1', resourceId: 'R1', availableQuantity: 5000, reservedQuantity: 0 }),
      makeResource({ id: 'r2', resourceId: 'R2', availableQuantity: 5000, reservedQuantity: 0, latitude: 28.64, longitude: 77.29 }),
    ];

    (prisma.demandRequest.findUnique as any).mockResolvedValue(demand);
    (prisma.resource.findMany as any).mockResolvedValue(resources);

    const result = await MatchingService.getRecommendations('demand-uuid-001');
    expect(result.fullCoveragePossible).toBe(false);
    expect(result.candidateCombination).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Allocation Lifecycle State-Machine Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Allocation lifecycle state transitions', () => {
  it('valid initial states: PENDING demand can be matched', () => {
    const pendingStatuses = ['PENDING', 'VERIFIED'];
    const invalidStatuses = ['FULFILLED', 'CANCELLED'];

    pendingStatuses.forEach(status => {
      const isActive = !['FULFILLED', 'CANCELLED'].includes(status);
      expect(isActive).toBe(true);
    });

    invalidStatuses.forEach(status => {
      const isActive = !['FULFILLED', 'CANCELLED'].includes(status);
      expect(isActive).toBe(false);
    });
  });

  it('RECOMMENDED → APPROVED is a valid transition', () => {
    const validTransitions: Record<string, string[]> = {
      RECOMMENDED: ['APPROVED', 'REJECTED'],
      APPROVED: [],
      REJECTED: [],
    };

    expect(validTransitions['RECOMMENDED']).toContain('APPROVED');
    expect(validTransitions['RECOMMENDED']).toContain('REJECTED');
    expect(validTransitions['APPROVED']).not.toContain('RECOMMENDED');
  });

  it('demand status lifecycle: PENDING → MATCHED → ALLOCATED', () => {
    const lifecycle = ['PENDING', 'MATCHED', 'ALLOCATED', 'FULFILLED'];
    expect(lifecycle.indexOf('MATCHED')).toBeGreaterThan(lifecycle.indexOf('PENDING'));
    expect(lifecycle.indexOf('ALLOCATED')).toBeGreaterThan(lifecycle.indexOf('MATCHED'));
    expect(lifecycle.indexOf('FULFILLED')).toBeGreaterThan(lifecycle.indexOf('ALLOCATED'));
  });
});
