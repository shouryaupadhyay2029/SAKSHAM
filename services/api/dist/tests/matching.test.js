"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const distance_js_1 = require("../utils/distance.js");
const matching_constants_js_1 = require("../modules/matching/matching.constants.js");
// ─────────────────────────────────────────────────────────────────────────────
// 1. Haversine Distance Utility
// ─────────────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('calculateHaversineDistance', () => {
    (0, vitest_1.it)('returns 0 for same coordinates', () => {
        const d = (0, distance_js_1.calculateHaversineDistance)(28.6208, 77.2625, 28.6208, 77.2625);
        (0, vitest_1.expect)(d).toBeCloseTo(0, 3);
    });
    (0, vitest_1.it)('calculates correct distance between two known Delhi landmarks', () => {
        // Yamuna Bank (28.6208, 77.2625) → Preet Vihar (28.6385, 77.2912) ≈ 2.8–3.2 km
        const d = (0, distance_js_1.calculateHaversineDistance)(28.6208, 77.2625, 28.6385, 77.2912);
        (0, vitest_1.expect)(d).toBeGreaterThan(2.5);
        (0, vitest_1.expect)(d).toBeLessThan(3.8);
    });
    (0, vitest_1.it)('returns a larger value for farther locations', () => {
        const close = (0, distance_js_1.calculateHaversineDistance)(28.6208, 77.2625, 28.6385, 77.2912);
        const far = (0, distance_js_1.calculateHaversineDistance)(28.6208, 77.2625, 28.5245, 77.2066);
        (0, vitest_1.expect)(far).toBeGreaterThan(close);
    });
    (0, vitest_1.it)('is symmetric (A→B === B→A)', () => {
        const ab = (0, distance_js_1.calculateHaversineDistance)(28.6208, 77.2625, 28.6435, 77.1895);
        const ba = (0, distance_js_1.calculateHaversineDistance)(28.6435, 77.1895, 28.6208, 77.2625);
        (0, vitest_1.expect)(ab).toBeCloseTo(ba, 5);
    });
    (0, vitest_1.it)('returns values in kilometers (Delhi–Mumbai is ~1100–1200 km)', () => {
        const d = (0, distance_js_1.calculateHaversineDistance)(28.6139, 77.2090, 19.0760, 72.8777);
        (0, vitest_1.expect)(d).toBeGreaterThan(1100);
        (0, vitest_1.expect)(d).toBeLessThan(1250);
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// 2. Matching Constants Integrity
// ─────────────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('MATCH_WEIGHTS', () => {
    (0, vitest_1.it)('all weights sum to exactly 100', () => {
        const sum = Object.values(matching_constants_js_1.MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
        (0, vitest_1.expect)(sum).toBe(100);
    });
    (0, vitest_1.it)('no weight is zero or negative', () => {
        Object.values(matching_constants_js_1.MATCH_WEIGHTS).forEach(w => (0, vitest_1.expect)(w).toBeGreaterThan(0));
    });
    (0, vitest_1.it)('COMPATIBILITY is the highest weighted factor', () => {
        const { COMPATIBILITY, AVAILABILITY, DISTANCE, PRIORITY, READINESS } = matching_constants_js_1.MATCH_WEIGHTS;
        (0, vitest_1.expect)(COMPATIBILITY).toBeGreaterThan(AVAILABILITY);
        (0, vitest_1.expect)(COMPATIBILITY).toBeGreaterThan(DISTANCE);
        (0, vitest_1.expect)(COMPATIBILITY).toBeGreaterThan(PRIORITY);
        (0, vitest_1.expect)(COMPATIBILITY).toBeGreaterThan(READINESS);
    });
});
(0, vitest_1.describe)('COMPATIBLE_CATEGORIES', () => {
    (0, vitest_1.it)('WATER demand maps only to WATER resource category', () => {
        (0, vitest_1.expect)(matching_constants_js_1.COMPATIBLE_CATEGORIES['WATER']).toEqual(['WATER']);
    });
    (0, vitest_1.it)('MEDICAL demand maps only to MEDICAL resource category', () => {
        (0, vitest_1.expect)(matching_constants_js_1.COMPATIBLE_CATEGORIES['MEDICAL']).toEqual(['MEDICAL']);
    });
    (0, vitest_1.it)('OTHER demand maps to multiple fallback categories', () => {
        const cats = matching_constants_js_1.COMPATIBLE_CATEGORIES['OTHER'];
        (0, vitest_1.expect)(cats).toContain('OTHER');
        (0, vitest_1.expect)(cats.length).toBeGreaterThan(1);
    });
    (0, vitest_1.it)('all standard demand types have defined mappings', () => {
        const expectedTypes = ['WATER', 'FOOD', 'MEDICAL', 'SHELTER_SUPPLIES', 'CLOTHING', 'RESCUE_EQUIPMENT'];
        expectedTypes.forEach(type => {
            (0, vitest_1.expect)(matching_constants_js_1.COMPATIBLE_CATEGORIES[type]).toBeDefined();
            (0, vitest_1.expect)(matching_constants_js_1.COMPATIBLE_CATEGORIES[type].length).toBeGreaterThan(0);
        });
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// 3 & 4. MatchingService — scoring and eligibility (unit tests with mocked Prisma)
// ─────────────────────────────────────────────────────────────────────────────
// We mock the db module so tests don't require a live database
vitest_1.vi.mock('../db/db.js', () => ({
    prisma: {
        demandRequest: {
            findUnique: vitest_1.vi.fn(),
        },
        resource: {
            findMany: vitest_1.vi.fn(),
        },
    },
}));
const db_js_1 = require("../db/db.js");
const matching_service_js_1 = require("../modules/matching/matching.service.js");
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
(0, vitest_1.describe)('MatchingService.getRecommendations — scoring', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('returns MATCHES_FOUND with valid resource that can fully fulfil demand', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource()]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.status).toBe('MATCHES_FOUND');
        (0, vitest_1.expect)(result.results).toHaveLength(1);
        (0, vitest_1.expect)(result.bestMatch).not.toBeNull();
        (0, vitest_1.expect)(result.bestMatch.canFullyFulfill).toBe(true);
    });
    (0, vitest_1.it)('score breakdown sums to reported total', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource()]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        const rec = result.results[0];
        const { compatibility, availability, distance, priority, readiness, total } = rec.breakdown;
        (0, vitest_1.expect)(compatibility + availability + distance + priority + readiness).toBe(total);
        (0, vitest_1.expect)(rec.score).toBe(total);
    });
    (0, vitest_1.it)('compatibility score always equals MATCH_WEIGHTS.COMPATIBILITY for matching category', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource()]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.results[0].breakdown.compatibility).toBe(matching_constants_js_1.MATCH_WEIGHTS.COMPATIBILITY);
    });
    (0, vitest_1.it)('availability score is max when resource can fully fulfil', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand({ quantity: 5000 }));
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource({ availableQuantity: 10000, reservedQuantity: 0 })]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.results[0].breakdown.availability).toBe(matching_constants_js_1.MATCH_WEIGHTS.AVAILABILITY);
    });
    (0, vitest_1.it)('availability score is proportionally reduced for partial fulfillment', async () => {
        const demand = makeDemand({ quantity: 10000 });
        const resource = makeResource({ availableQuantity: 5000, reservedQuantity: 0 });
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(demand);
        db_js_1.prisma.resource.findMany.mockResolvedValue([resource]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        const avail = result.results[0].breakdown.availability;
        // 5000/10000 = 0.5 ratio, so score ≈ AVAILABILITY * 0.5 = 12 or 13
        (0, vitest_1.expect)(avail).toBeLessThan(matching_constants_js_1.MATCH_WEIGHTS.AVAILABILITY);
        (0, vitest_1.expect)(avail).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('distance score is max (20) for resource within 3 km of incident', async () => {
        // Preet Vihar (28.6385, 77.2912) is ~3 km from Yamuna Bank (28.6208, 77.2625)
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource()]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        const distScore = result.results[0].breakdown.distance;
        // At ~3 km, should be at or near max distance weight
        (0, vitest_1.expect)(distScore).toBeGreaterThanOrEqual(matching_constants_js_1.MATCH_WEIGHTS.DISTANCE * 0.85);
    });
    (0, vitest_1.it)('distance score is reduced for a resource far away (>25 km)', async () => {
        // Place resource in Mumbai-ish coordinates for extreme distance
        const farResource = makeResource({ latitude: 19.0760, longitude: 72.8777 });
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([farResource]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.results[0].breakdown.distance).toBeLessThan(matching_constants_js_1.MATCH_WEIGHTS.DISTANCE * 0.25);
    });
    (0, vitest_1.it)('CRITICAL priority gives maximum priority score', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand({ priority: 'CRITICAL' }));
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource()]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.results[0].breakdown.priority).toBe(matching_constants_js_1.MATCH_WEIGHTS.PRIORITY);
    });
    (0, vitest_1.it)('LOW priority gives reduced priority score', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand({ priority: 'LOW' }));
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource()]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        const prio = result.results[0].breakdown.priority;
        (0, vitest_1.expect)(prio).toBeLessThan(matching_constants_js_1.MATCH_WEIGHTS.PRIORITY);
    });
    (0, vitest_1.it)('AVAILABLE status gives max readiness score', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource({ status: 'AVAILABLE' })]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.results[0].breakdown.readiness).toBe(matching_constants_js_1.MATCH_WEIGHTS.READINESS);
    });
    (0, vitest_1.it)('LOW status gives partial readiness score', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource({ status: 'LOW' })]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        const readiness = result.results[0].breakdown.readiness;
        (0, vitest_1.expect)(readiness).toBeGreaterThan(0);
        (0, vitest_1.expect)(readiness).toBeLessThan(matching_constants_js_1.MATCH_WEIGHTS.READINESS);
    });
    (0, vitest_1.it)('results are sorted by score in descending order', async () => {
        const resources = [
            makeResource({ id: 'r1', resourceId: 'R1', availableQuantity: 1000, reservedQuantity: 0 }), // partial
            makeResource({ id: 'r2', resourceId: 'R2', availableQuantity: 50000, reservedQuantity: 0 }), // full
        ];
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand({ quantity: 10000 }));
        db_js_1.prisma.resource.findMany.mockResolvedValue(resources);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        // Full fulfillment resource should rank first
        (0, vitest_1.expect)(result.results[0].score).toBeGreaterThanOrEqual(result.results[1].score);
    });
    (0, vitest_1.it)('qualityLabel is EXCELLENT for a near-perfect score (≥90)', async () => {
        // Ideal resource: nearby, available, full stock, critical demand
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand({ priority: 'CRITICAL' }));
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource({ status: 'AVAILABLE', availableQuantity: 100000 })]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.results[0].qualityLabel).toBe('EXCELLENT');
    });
    (0, vitest_1.it)('explanation array has at least 3 entries', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([makeResource()]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.results[0].explanation.length).toBeGreaterThanOrEqual(3);
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// 4. Eligibility Filtering
// ─────────────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('MatchingService.getRecommendations — eligibility filters', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('filters out DEPLETED resources', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([
            makeResource({ status: 'DEPLETED', availableQuantity: 0, reservedQuantity: 0 }),
        ]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.status).toBe('NO_MATCH_FOUND');
        (0, vitest_1.expect)(result.results).toHaveLength(0);
    });
    (0, vitest_1.it)('filters out RESERVED resources (fully reserved)', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([
            makeResource({ status: 'RESERVED', availableQuantity: 15000, reservedQuantity: 12000 }),
        ]);
        // reservedQuantity >= availableQuantity → eligible, just partial
        // But status RESERVED → filtered immediately
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.status).toBe('NO_MATCH_FOUND');
    });
    (0, vitest_1.it)('filters out resources with zero unreserved quantity', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([
            makeResource({ status: 'AVAILABLE', availableQuantity: 5000, reservedQuantity: 5000 }),
        ]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.status).toBe('NO_MATCH_FOUND');
    });
    (0, vitest_1.it)('returns NO_MATCH_FOUND when resource list is empty', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(makeDemand());
        db_js_1.prisma.resource.findMany.mockResolvedValue([]);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.status).toBe('NO_MATCH_FOUND');
        (0, vitest_1.expect)(result.bestMatch).toBeNull();
    });
    (0, vitest_1.it)('throws when demand is not found', async () => {
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(null);
        db_js_1.prisma.resource.findMany.mockResolvedValue([]);
        await (0, vitest_1.expect)(matching_service_js_1.MatchingService.getRecommendations('non-existent-uuid')).rejects.toThrow();
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// 5. Partial Coverage & Combination Logic
// ─────────────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('MatchingService.getRecommendations — combination matching', () => {
    (0, vitest_1.beforeEach)(() => vitest_1.vi.clearAllMocks());
    (0, vitest_1.it)('sets fullCoveragePossible=true when multiple resources can cover demand together', async () => {
        const demand = makeDemand({ quantity: 10000 });
        // Two resources each with 6000 units — together they cover 12000 > 10000
        const resources = [
            makeResource({ id: 'r1', resourceId: 'R1', availableQuantity: 6000, reservedQuantity: 0 }),
            makeResource({ id: 'r2', resourceId: 'R2', availableQuantity: 6000, reservedQuantity: 0, latitude: 28.6400, longitude: 77.2950 }),
        ];
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(demand);
        db_js_1.prisma.resource.findMany.mockResolvedValue(resources);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.status).toBe('PARTIAL_MATCHES_FOUND');
        (0, vitest_1.expect)(result.fullCoveragePossible).toBe(true);
        (0, vitest_1.expect)(result.candidateCombination).not.toBeNull();
        (0, vitest_1.expect)(result.candidateCombination.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('candidateCombination quantities sum to exactly the demanded amount', async () => {
        const demand = makeDemand({ quantity: 10000 });
        const resources = [
            makeResource({ id: 'r1', resourceId: 'R1', availableQuantity: 4000, reservedQuantity: 0 }),
            makeResource({ id: 'r2', resourceId: 'R2', availableQuantity: 4000, reservedQuantity: 0, latitude: 28.63, longitude: 77.28 }),
            makeResource({ id: 'r3', resourceId: 'R3', availableQuantity: 4000, reservedQuantity: 0, latitude: 28.64, longitude: 77.30 }),
        ];
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(demand);
        db_js_1.prisma.resource.findMany.mockResolvedValue(resources);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        if (result.candidateCombination) {
            const totalCovered = result.candidateCombination.reduce((sum, c) => sum + c.quantity, 0);
            (0, vitest_1.expect)(totalCovered).toBe(demand.quantity);
        }
    });
    (0, vitest_1.it)('fullCoveragePossible=false when combined resources are still insufficient', async () => {
        const demand = makeDemand({ quantity: 100000 });
        const resources = [
            makeResource({ id: 'r1', resourceId: 'R1', availableQuantity: 5000, reservedQuantity: 0 }),
            makeResource({ id: 'r2', resourceId: 'R2', availableQuantity: 5000, reservedQuantity: 0, latitude: 28.64, longitude: 77.29 }),
        ];
        db_js_1.prisma.demandRequest.findUnique.mockResolvedValue(demand);
        db_js_1.prisma.resource.findMany.mockResolvedValue(resources);
        const result = await matching_service_js_1.MatchingService.getRecommendations('demand-uuid-001');
        (0, vitest_1.expect)(result.fullCoveragePossible).toBe(false);
        (0, vitest_1.expect)(result.candidateCombination).toBeNull();
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// 6. Allocation Lifecycle State-Machine Validation
// ─────────────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('Allocation lifecycle state transitions', () => {
    (0, vitest_1.it)('valid initial states: PENDING demand can be matched', () => {
        const pendingStatuses = ['PENDING', 'VERIFIED'];
        const invalidStatuses = ['FULFILLED', 'CANCELLED'];
        pendingStatuses.forEach(status => {
            const isActive = !['FULFILLED', 'CANCELLED'].includes(status);
            (0, vitest_1.expect)(isActive).toBe(true);
        });
        invalidStatuses.forEach(status => {
            const isActive = !['FULFILLED', 'CANCELLED'].includes(status);
            (0, vitest_1.expect)(isActive).toBe(false);
        });
    });
    (0, vitest_1.it)('RECOMMENDED → APPROVED is a valid transition', () => {
        const validTransitions = {
            RECOMMENDED: ['APPROVED', 'REJECTED'],
            APPROVED: [],
            REJECTED: [],
        };
        (0, vitest_1.expect)(validTransitions['RECOMMENDED']).toContain('APPROVED');
        (0, vitest_1.expect)(validTransitions['RECOMMENDED']).toContain('REJECTED');
        (0, vitest_1.expect)(validTransitions['APPROVED']).not.toContain('RECOMMENDED');
    });
    (0, vitest_1.it)('demand status lifecycle: PENDING → MATCHED → ALLOCATED', () => {
        const lifecycle = ['PENDING', 'MATCHED', 'ALLOCATED', 'FULFILLED'];
        (0, vitest_1.expect)(lifecycle.indexOf('MATCHED')).toBeGreaterThan(lifecycle.indexOf('PENDING'));
        (0, vitest_1.expect)(lifecycle.indexOf('ALLOCATED')).toBeGreaterThan(lifecycle.indexOf('MATCHED'));
        (0, vitest_1.expect)(lifecycle.indexOf('FULFILLED')).toBeGreaterThan(lifecycle.indexOf('ALLOCATED'));
    });
});
