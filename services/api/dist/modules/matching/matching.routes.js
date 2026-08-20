"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingRouter = void 0;
const express_1 = require("express");
const matching_service_js_1 = require("./matching.service.js");
const router = (0, express_1.Router)();
exports.matchingRouter = router;
// GET /api/matching/demands/:demandId/recommendations
router.get('/demands/:demandId/recommendations', async (req, res) => {
    try {
        const { demandId } = req.params;
        const result = await matching_service_js_1.MatchingService.getRecommendations(demandId);
        return res.json({ data: result });
    }
    catch (error) {
        console.error('Error calculating matching recommendations:', error);
        return res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: error.message || 'Matching analysis could not be completed.',
            },
        });
    }
});
