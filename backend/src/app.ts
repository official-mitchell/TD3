/**
 * Express app factory. Exported for integration tests (16.4).
 * main.ts uses this and adds server/socket.
 * QA routes: /api/qa/metrics (POST), /api/qa/active-sessions (GET), /api/qa/loading-stats (GET).
 * Phase 18.1.1: Morgan combined in prod, dev in dev. 18.4.1: GET /health.
 */
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import * as path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import droneRoutes from './routes/drone.routes';
import qaRoutes from './routes/qa.routes';
import { getCorsConfig } from './lib/cors';

export function createApp() {
  const app = express();

  const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat));
  app.use(helmet());
  app.use(cors({ origin: getCorsConfig() }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/assets', express.static(path.join(__dirname, 'assets')));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      message: 'Something went wrong!',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  app.use('/api', droneRoutes);
  app.use('/api', qaRoutes);

  /** Phase 18.4.1: Health check for Render. Outside /api. */
  app.get('/health', async (req: Request, res: Response) => {
    try {
      const socketService = req.app.get('socketService') as { getActiveDroneCount?: () => Promise<number> } | undefined;
      const activeDrones = socketService?.getActiveDroneCount
        ? await socketService.getActiveDroneCount()
        : 0;
      const mongoConnected = mongoose.connection.readyState === 1;
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeDrones,
        mongoConnected,
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        activeDrones: 0,
        mongoConnected: mongoose.connection.readyState === 1,
      });
    }
  });
  app.get('/api', (_req: Request, res: Response) => {
    res.json({ message: 'Welcome to backend!' });
  });

  return app;
}
