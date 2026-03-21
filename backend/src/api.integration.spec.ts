/**
 * Backend API integration tests. Per Implementation Plan 16.4.
 * Uses Supertest + mongodb-memory-server.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import http from 'http';
import request from 'supertest';
import { createApp } from './app';
import SocketService from './services/socket-service';
import Drone from './models/drone.model';
import WeaponPlatform from './models/weapon-platform.model';
import TelemetryLog from './models/telemetry-log.model';
import QAMetric from './models/qa-metric.model';

let mongod: MongoMemoryServer;
let app: ReturnType<typeof createApp>;
let server: http.Server;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  app = createApp();
  server = http.createServer(app);
  const socketService = new SocketService(server);
  app.set('socketService', socketService);
}, 30000);

afterAll(async () => {
  if (server) server.close();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 10000);

beforeEach(async () => {
  await Drone.deleteMany({});
  await WeaponPlatform.deleteMany({});
  await TelemetryLog.deleteMany({});
  await QAMetric.deleteMany({});
});

describe('16.4 API integration', () => {
  it('16.4.2: GET /api/drones returns array of drones', async () => {
    await Drone.create([
      { droneId: 'D1', droneType: 'Quadcopter', status: 'Detected', position: { lat: 25.9, lng: 51.5, altitude: 100 }, speed: 50, heading: 90, threatLevel: 0.5, lastUpdated: new Date() },
      { droneId: 'D2', droneType: 'VTOL', status: 'Identified', position: { lat: 25.91, lng: 51.51, altitude: 150 }, speed: 60, heading: 180, threatLevel: 0.6, lastUpdated: new Date() },
    ]);

    const res = await request(app).get('/api/drones');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('droneId');
    expect(res.body[1]).toHaveProperty('droneId');
  });

  it('16.4.3: GET /api/platform/status returns platform fields', async () => {
    await WeaponPlatform.create({
      position: { lat: 25.905, lng: 51.543 },
      heading: 90,
      isActive: true,
      ammoCount: 300,
      killCount: 0,
    });

    const res = await request(app).get('/api/platform/status');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('heading');
    expect(res.body).toHaveProperty('isActive');
    expect(res.body).toHaveProperty('ammoCount');
    expect(res.body).toHaveProperty('killCount');
  });

  it('16.4.4: GET /api/drones/:droneId/history returns logs sorted by timestamp desc', async () => {
    const droneId = 'D1';
    await Drone.create({ droneId, droneType: 'Quadcopter', status: 'Detected', position: { lat: 25.9, lng: 51.5, altitude: 100 }, speed: 50, heading: 90, threatLevel: 0.5, lastUpdated: new Date() });
    await TelemetryLog.create([
      { droneId, timestamp: '2025-03-20T10:00:00Z', position: { lat: 25.9, lng: 51.5, altitude: 100 }, status: 'Hit', engagementOutcome: 'Hit' },
      { droneId, timestamp: '2025-03-20T11:00:00Z', position: { lat: 25.9, lng: 51.5, altitude: 100 }, status: 'Hit', engagementOutcome: 'Hit' },
      { droneId, timestamp: '2025-03-20T12:00:00Z', position: { lat: 25.9, lng: 51.5, altitude: 100 }, status: 'Hit', engagementOutcome: 'Hit' },
    ]);

    const res = await request(app).get(`/api/drones/${droneId}/history`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    expect(res.body[0].timestamp).toBe('2025-03-20T12:00:00Z');
    expect(res.body[2].timestamp).toBe('2025-03-20T10:00:00Z');
  });

  it('16.4.5: POST /api/drones/test-types returns success and GET /api/drones returns non-empty', async () => {
    const postRes = await request(app).post('/api/drones/test-types');
    expect(postRes.status).toBe(200);
    expect(postRes.body).toBeDefined();

    const getRes = await request(app).get('/api/drones');
    expect(getRes.status).toBe(200);
    expect(getRes.body.length).toBeGreaterThan(0);
  });

  describe('QA metrics', () => {
    it('POST /api/qa/metrics accepts valid payload', async () => {
      const res = await request(app)
        .post('/api/qa/metrics')
        .send({
          sessionId: 'sess-123',
          loadStartMs: 1000,
          loadEndMs: 2500,
          loadingTimeMs: 1500,
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.id).toBeTruthy();
    });

    it('POST /api/qa/metrics rejects invalid payload', async () => {
      const res = await request(app)
        .post('/api/qa/metrics')
        .send({ sessionId: 'sess-123' });
      expect(res.status).toBe(400);
    });

    it('GET /api/qa/active-sessions returns count', async () => {
      await QAMetric.create({
        sessionId: 's1',
        loadStartMs: 0,
        loadEndMs: 100,
        loadingTimeMs: 100,
        activeAt: new Date(),
      });
      const res = await request(app).get('/api/qa/active-sessions');
      expect(res.status).toBe(200);
      expect(res.body.activeSessions).toBe(1);
      expect(res.body.windowMinutes).toBe(5);
    });

    it('GET /api/qa/loading-stats returns stats', async () => {
      await QAMetric.create({
        sessionId: 's1',
        loadStartMs: 0,
        loadEndMs: 1000,
        loadingTimeMs: 1000,
        activeAt: new Date(),
      });
      await QAMetric.create({
        sessionId: 's2',
        loadStartMs: 0,
        loadEndMs: 2000,
        loadingTimeMs: 2000,
        activeAt: new Date(),
      });
      const res = await request(app).get('/api/qa/loading-stats');
      expect(res.status).toBe(200);
      expect(res.body.sampleCount).toBe(2);
      expect(res.body.avgLoadingTimeMs).toBe(1500);
      expect(res.body.periodHours).toBe(24);
    });
  });
});
