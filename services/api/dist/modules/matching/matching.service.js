"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = void 0;
const db_js_1 = require("../../db/db.js");
const distance_js_1 = require("../../utils/distance.js");
const matching_constants_js_1 = require("./matching.constants.js");
const client_1 = require("@prisma/client");
class MatchingService {
    /**
     * Generates ranked recommendations for a given demand request.
     */
    static async getRecommendations(demandId) {
        // 1. Fetch demand details along with incident coordinates
        const demand = await db_js_1.prisma.demandRequest.findUnique({
            where: { id: demandId },
            include: { incident: true },
        });
        if (!demand) {
            throw new Error(`Demand request ${demandId} not found.`);
        }
        // Determine compatible resource categories
        const compatibleCats = matching_constants_js_1.COMPATIBLE_CATEGORIES[demand.requestedType] ?? [demand.requestedType];
        // 2. Fetch candidate resources matching the categories
        const resources = await db_js_1.prisma.resource.findMany({
            where: {
                category: { in: compatibleCats },
            },
        });
        const recommendations = [];
        for (const res of resources) {
            // 3. Eligibility filters
            // A resource is considered INELIGIBLE if:
            // - status is DEPLETED or RESERVED
            // - availableQuantity is <= 0
            // - categories do not match
            const ineligibleStatuses = [client_1.ResourceStatus.DEPLETED, client_1.ResourceStatus.RESERVED];
            const isStatusIneligible = ineligibleStatuses.includes(res.status);
            const isQuantityIneligible = res.availableQuantity - res.reservedQuantity <= 0;
            if (isStatusIneligible || isQuantityIneligible) {
                continue;
            }
            // Calculate availability parameters
            const unreservedQty = res.availableQuantity - res.reservedQuantity;
            const canFullyFulfill = unreservedQty >= demand.quantity;
            // Distance calculation
            const dist = (0, distance_js_1.calculateHaversineDistance)(demand.incident.latitude, demand.incident.longitude, res.latitude, res.longitude);
            const distKm = Math.round(dist * 10) / 10;
            // Compatibility Score (35%)
            const compatScore = matching_constants_js_1.MATCH_WEIGHTS.COMPATIBILITY; // 100% compatible if passed through DB filter
            // Availability Score (25%)
            let availScore = 0;
            let availReason = '';
            if (canFullyFulfill) {
                availScore = matching_constants_js_1.MATCH_WEIGHTS.AVAILABILITY;
                availReason = `Sufficient quantity is available: ${unreservedQty.toLocaleString()} ${res.unit} (requires ${demand.quantity.toLocaleString()}).`;
            }
            else {
                const ratio = unreservedQty / demand.quantity;
                availScore = Math.round(matching_constants_js_1.MATCH_WEIGHTS.AVAILABILITY * ratio);
                availReason = `Partial stock: ${unreservedQty.toLocaleString()} of ${demand.quantity.toLocaleString()} ${res.unit} available (${Math.round(ratio * 100)}% of demand).`;
            }
            // Distance Score (20%)
            let distScore = 0;
            const wDist = matching_constants_js_1.MATCH_WEIGHTS.DISTANCE;
            if (dist <= 3)
                distScore = wDist;
            else if (dist <= 7)
                distScore = Math.round(wDist * 0.88);
            else if (dist <= 12)
                distScore = Math.round(wDist * 0.72);
            else if (dist <= 18)
                distScore = Math.round(wDist * 0.56);
            else if (dist <= 25)
                distScore = Math.round(wDist * 0.36);
            else if (dist <= 40)
                distScore = Math.round(wDist * 0.20);
            else
                distScore = Math.max(0, Math.round(wDist * (1 - dist / 80)));
            // Priority Score (10%)
            let prioScore = 0;
            const wPrio = matching_constants_js_1.MATCH_WEIGHTS.PRIORITY;
            if (demand.priority === 'CRITICAL')
                prioScore = wPrio;
            else if (demand.priority === 'HIGH')
                prioScore = Math.round(wPrio * 0.85);
            else if (demand.priority === 'MEDIUM')
                prioScore = Math.round(wPrio * 0.65);
            else
                prioScore = Math.round(wPrio * 0.45);
            // Readiness Score (10%)
            let readScore = 0;
            const wRead = matching_constants_js_1.MATCH_WEIGHTS.READINESS;
            if (res.status === client_1.ResourceStatus.AVAILABLE)
                readScore = wRead;
            else if (res.status === client_1.ResourceStatus.LOW)
                readScore = Math.round(wRead * 0.7);
            else if (res.status === client_1.ResourceStatus.IN_TRANSIT)
                readScore = Math.round(wRead * 0.4);
            // Final Score
            const finalScore = compatScore + availScore + distScore + prioScore + readScore;
            // Quality Label
            let qualityLabel;
            if (finalScore >= 90)
                qualityLabel = 'EXCELLENT';
            else if (finalScore >= 75)
                qualityLabel = 'GOOD';
            else if (finalScore >= 50)
                qualityLabel = 'PARTIAL';
            else if (finalScore >= 20)
                qualityLabel = 'POOR';
            else
                qualityLabel = 'INCOMPATIBLE';
            // Explanation components
            const explanation = [
                `Resource type matches the request (${res.category})`,
                availReason,
                `Resource is ${distKm} km from the affected area`,
                `Resource depot readiness status is ${res.status}`,
            ];
            recommendations.push({
                resourceId: res.id,
                name: res.materialName,
                category: res.category,
                storageDepot: res.storageDepot,
                availableQuantity: unreservedQty,
                requestedQuantity: demand.quantity,
                canFullyFulfill,
                distanceKm: distKm,
                score: finalScore,
                breakdown: {
                    compatibility: compatScore,
                    availability: availScore,
                    distance: distScore,
                    priority: prioScore,
                    readiness: readScore,
                    total: finalScore,
                },
                qualityLabel,
                explanation,
            });
        }
        // Sort by score descending
        recommendations.sort((a, b) => b.score - a.score);
        const bestMatch = recommendations.length > 0 ? recommendations[0] : null;
        // Determine overall result status
        let status = 'NO_MATCH_FOUND';
        if (recommendations.length > 0) {
            status = recommendations.some(r => r.canFullyFulfill) ? 'MATCHES_FOUND' : 'PARTIAL_MATCHES_FOUND';
        }
        // Combination logic for partial coverage (if best match cannot satisfy)
        let fullCoveragePossible = false;
        let candidateCombination = null;
        if (bestMatch && !bestMatch.canFullyFulfill) {
            let accumulated = 0;
            const combo = [];
            for (const rec of recommendations) {
                if (accumulated >= demand.quantity)
                    break;
                const take = Math.min(rec.availableQuantity, demand.quantity - accumulated);
                if (take > 0) {
                    combo.push({ resourceId: rec.resourceId, quantity: take });
                    accumulated += take;
                }
            }
            if (accumulated >= demand.quantity) {
                fullCoveragePossible = true;
                candidateCombination = combo;
            }
        }
        return {
            status,
            results: recommendations,
            bestMatch,
            fullCoveragePossible,
            candidateCombination,
        };
    }
}
exports.MatchingService = MatchingService;
