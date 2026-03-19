/**
 * Drone and platform REST routes. Phase 2.3: cleaned routes, standardized error handlers.
 */
import { Router, Request, Response } from 'express';
import Drone from '../models/drone.model';
import TelemetryLog from '../models/telemetry-log.model';
import WeaponPlatform from '../models/weapon-platform.model';
import { sendError } from '../lib/errorHandler';
import type { DroneStatus } from '@td3/shared-types';

const VALID_DRONE_STATUSES: DroneStatus[] = [
  'Detected',
  'Identified',
  'Confirmed',
  'Engagement Ready',
  'Hit',
  'Destroyed',
];

const router = Router();

router.post('/drones/test-types', async (req: Request, res: Response) => {
  try {
    const socketService = req.app.get('socketService');
    if (!socketService) {
      return sendError(res, 500, 'Socket service not found');
    }
    const result = await socketService.createTestDrones();
    return res.json(result);
  } catch (error) {
    console.error('Error in test-types endpoint:', error);
    return sendError(res, 500, 'Error creating test drones', error);
  }
});

router.get('/drones', async (req: Request, res: Response) => {
  try {
    const drones = await Drone.find().sort({ lastUpdated: -1 });
    return res.json(drones);
  } catch (error) {
    return sendError(res, 500, 'Error fetching drones', error);
  }
});

router.get('/drones/status', async (req: Request, res: Response) => {
  try {
    const drones = await Drone.find();
    return res.json({
      count: drones.length,
      drones: drones.map((d) => ({ id: d.droneId, status: d.status })),
    });
  } catch (error) {
    return sendError(res, 500, 'Error fetching drone status', error);
  }
});

router.post('/drones/clear', async (req: Request, res: Response) => {
  try {
    await Drone.deleteMany({});
    return res.json({ message: 'All drones cleared' });
  } catch (error) {
    return sendError(res, 500, 'Error clearing drones', error);
  }
});

router.get('/drones/:droneId', async (req: Request, res: Response) => {
  try {
    const drone = await Drone.findOne({ droneId: req.params.droneId });
    if (!drone) {
      return sendError(res, 404, 'Drone not found');
    }
    return res.json(drone);
  } catch (error) {
    return sendError(res, 500, 'Error fetching drone', error);
  }
});

router.get('/drones/:droneId/history', async (req: Request, res: Response) => {
  try {
    const logs = await TelemetryLog.find({ droneId: req.params.droneId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    return res.json(logs);
  } catch (error) {
    return sendError(res, 500, 'Error fetching drone history', error);
  }
});

router.post('/drones/test', async (req: Request, res: Response) => {
  try {
    const testDrone = new Drone({
      droneId: 'TEST001',
      status: 'Detected',
      position: { lat: 25.905310475056915, lng: 51.543824178558054, altitude: 100 }, // Ras Laffan, Qatar
      speed: 15.5,
      heading: 180,
      threatLevel: 0.5,
    });
    await testDrone.save();
    return res.json({ message: 'Test drone created', drone: testDrone });
  } catch (error) {
    return sendError(res, 500, 'Error creating test drone', error);
  }
});

router.put('/drones/:droneId/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_DRONE_STATUSES.includes(status)) {
      return sendError(res, 400, 'Invalid status. Valid values: ' + VALID_DRONE_STATUSES.join(', '));
    }
    const drone = await Drone.findOne({ droneId: req.params.droneId });
    if (!drone) {
      return sendError(res, 404, 'Drone not found');
    }
    drone.status = status;
    await drone.save();
    return res.json(drone);
  } catch (error) {
    return sendError(res, 500, 'Error updating drone status', error);
  }
});

router.delete('/drones/:droneId', async (req: Request, res: Response) => {
  try {
    const result = await Drone.deleteOne({ droneId: req.params.droneId });
    if (result.deletedCount === 0) {
      return sendError(res, 404, 'Drone not found');
    }
    return res.json({ message: 'Drone deleted successfully' });
  } catch (error) {
    return sendError(res, 500, 'Error deleting drone', error);
  }
});

router.post('/drones', async (req: Request, res: Response) => {
  try {
    const drone = new Drone(req.body);
    await drone.save();
    return res.status(201).json(drone);
  } catch (error) {
    return sendError(res, 500, 'Error creating drone', error);
  }
});

router.post('/platform/init', async (req: Request, res: Response) => {
  try {
    await WeaponPlatform.deleteMany({});
    const platform = new WeaponPlatform({
      position: { lat: 25.905310475056915, lng: 51.543824178558054 }, // Ras Laffan, Qatar
      heading: 0,
      isActive: true,
      ammoCount: 300,
      killCount: 0,
    });
    await platform.save();
    return res.json(platform);
  } catch (error) {
    return sendError(res, 500, 'Error initializing platform', error);
  }
});

router.put('/platform/position', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return sendError(res, 400, 'lat and lng must be numbers');
    }
    const platform = await WeaponPlatform.findOne({ isActive: true });
    if (!platform) {
      return sendError(res, 404, 'No active weapon platform found');
    }
    platform.position = { lat, lng };
    await platform.save();
    const socketService = req.app.get('socketService');
    if (socketService?.updatePlatformPosition) {
      socketService.updatePlatformPosition({ lat, lng });
    }
    return res.json(platform);
  } catch (error) {
    return sendError(res, 500, 'Error updating platform position', error);
  }
});

router.get('/platform/status', async (req: Request, res: Response) => {
  try {
    const platform = await WeaponPlatform.findOne({ isActive: true });
    if (!platform) {
      return sendError(res, 404, 'No active weapon platform found');
    }
    return res.json(platform);
  } catch (error) {
    return sendError(res, 500, 'Error fetching platform status', error);
  }
});

router.get('/platform/test', async (req: Request, res: Response) => {
  try {
    const platform = await WeaponPlatform.findOne({ isActive: true });
    const drones = await Drone.find();
    return res.json({
      platform,
      droneCount: drones.length,
      platformStatus: platform ? 'active' : 'not initialized',
    });
  } catch (error) {
    return sendError(res, 500, 'Error fetching platform test data', error);
  }
});

export default router;
