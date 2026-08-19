import { Router, Request, Response } from 'express';
import { MatchingService } from './matching.service.js';

const router = Router();

// GET /api/matching/demands/:demandId/recommendations
router.get('/demands/:demandId/recommendations', async (req: Request, res: Response) => {
  try {
    const { demandId } = req.params;
    const result = await MatchingService.getRecommendations(demandId);
    return res.json({ data: result });
  } catch (error: any) {
    console.error('Error calculating matching recommendations:', error);
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: error.message || 'Matching analysis could not be completed.',
      },
    });
  }
});

export { router as matchingRouter };
