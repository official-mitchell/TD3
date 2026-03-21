/**
 * QA metrics routes. POST /qa/metrics records loading times. GET /qa/active-sessions returns count.
 * Phase 18.1.4: logger.error in catch blocks.
 * Sessions identified by sessionId (no IP stored).
 */
import { Router, Request, Response } from 'express';
import QAMetric from '../models/qa-metric.model';
import { sendError } from '../lib/errorHandler';
import { logger } from '../lib/logger';

const router = Router();
const ACTIVE_SESSION_WINDOW_MS = 5 * 60 * 1000;

router.post('/qa/metrics', async (req: Request, res: Response) => {
  try {
    const { sessionId, loadStartMs, loadEndMs, loadingTimeMs } = req.body;
    if (!sessionId || typeof loadStartMs !== 'number' || typeof loadEndMs !== 'number' || typeof loadingTimeMs !== 'number') {
      return sendError(res, 400, 'sessionId, loadStartMs, loadEndMs, loadingTimeMs required');
    }
    const metric = new QAMetric({
      sessionId,
      loadStartMs,
      loadEndMs,
      loadingTimeMs,
      activeAt: new Date(),
    });
    await metric.save();
    return res.status(201).json({ ok: true, id: metric._id });
  } catch (error) {
    logger.error('route.error', { error: (error as Error).message, route: 'qa/metrics' });
    return sendError(res, 500, 'Error saving QA metric', error);
  }
});

router.get('/qa/active-sessions', async (req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - ACTIVE_SESSION_WINDOW_MS);
    const count = await QAMetric.distinct('sessionId', { activeAt: { $gte: since } }).then((ids) => ids.length);
    return res.json({ activeSessions: count, windowMinutes: 5 });
  } catch (error) {
    logger.error('route.error', { error: (error as Error).message, route: 'qa/active-sessions' });
    return sendError(res, 500, 'Error fetching active sessions', error);
  }
});

router.get('/qa/loading-stats', async (req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const metrics = await QAMetric.find({ createdAt: { $gte: since } }).lean();
    const times = metrics.map((m) => m.loadingTimeMs);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    return res.json({
      sampleCount: times.length,
      avgLoadingTimeMs: Math.round(avg),
      p95LoadingTimeMs: p95,
      periodHours: 24,
    });
  } catch (error) {
    logger.error('route.error', { error: (error as Error).message, route: 'qa/loading-stats' });
    return sendError(res, 500, 'Error fetching loading stats', error);
  }
});

export default router;
