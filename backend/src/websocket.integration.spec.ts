/**
 * WebSocket integration tests. Per Implementation Plan 16.5.
 * Socket.IO client connected to locally running backend (started in test).
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import http from 'http';
import { io as ioClient, Socket } from 'socket.io-client';
import { createApp } from './app';
import SocketService from './services/socket-service';
import Drone from './models/drone.model';
import WeaponPlatform from './models/weapon-platform.model';

let mongod: MongoMemoryServer;
let server: http.Server;
let clientSocket: Socket;
let serverUrl: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = createApp();
  server = http.createServer(app);
  const socketService = new SocketService(server);
  app.set('socketService', socketService);

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3333;
      serverUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  clientSocket = ioClient(serverUrl, { transports: ['websocket'] });
  await new Promise<void>((resolve) => {
    clientSocket.on('connect', () => resolve());
  });
}, 30000);

afterAll(async () => {
  if (clientSocket) clientSocket.close();
  if (server) server.close();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 10000);

beforeEach(async () => {
  await Drone.deleteMany({});
  await WeaponPlatform.deleteMany({});
});

describe('16.5 WebSocket integration', () => {
  it('16.5.2: server emits drone:update within 5 seconds of client connecting', async () => {
    const drone = await Drone.create({
      droneId: 'WS-D1',
      droneType: 'Quadcopter',
      status: 'Detected',
      position: { lat: 25.9, lng: 51.5, altitude: 100 },
      speed: 50,
      heading: 90,
      threatLevel: 0.5,
      lastUpdated: new Date(),
    });

    const updatePromise = new Promise<unknown>((resolve) => {
      const t = setTimeout(() => resolve(null), 5000);
      clientSocket.on('droneUpdate', (payload) => {
        clearTimeout(t);
        resolve(payload);
      });
    });

    const result = await updatePromise;
    expect(result).toBeTruthy();
    if (result && typeof result === 'object' && 'droneId' in result) {
      expect((result as { droneId: string }).droneId).toBeDefined();
    }
  }, 6000);

  it('16.5.3: heartbeat:ping causes heartbeat:pong within 100ms', async () => {
    const pongPromise = new Promise<unknown>((resolve) => {
      clientSocket.once('heartbeat:pong', resolve);
      clientSocket.emit('heartbeat:ping');
    });

    const start = Date.now();
    await pongPromise;
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('16.5.4: full engagement cycle - engagement:fire yields drone:hit or drone:missed within 1s', async () => {
    await WeaponPlatform.create({
      position: { lat: 25.905, lng: 51.543 },
      heading: 0,
      isActive: true,
      ammoCount: 2000,
      killCount: 0,
    });
    await Drone.create({
      droneId: 'ENG-D1',
      droneType: 'Quadcopter',
      status: 'Engagement Ready',
      position: { lat: 25.91, lng: 51.543, altitude: 100 },
      speed: 50,
      heading: 90,
      threatLevel: 0.8,
      hitPoints: 1,
      lastUpdated: new Date(),
    });

    const resultPromise = new Promise<{ event: string }>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout')), 1000);
      const onHit = () => {
        clearTimeout(t);
        resolve({ event: 'drone:hit' });
      };
      const onMissed = () => {
        clearTimeout(t);
        resolve({ event: 'drone:missed' });
      };
      const onDestroyed = () => {
        clearTimeout(t);
        resolve({ event: 'drone:destroyed' });
      };
      clientSocket.once('drone:hit', onHit);
      clientSocket.once('drone:missed', onMissed);
      clientSocket.once('drone:destroyed', onDestroyed);
      clientSocket.emit('engagement:fire', { droneId: 'ENG-D1', timestamp: new Date().toISOString() });
    });

    const result = await resultPromise;
    expect(['drone:hit', 'drone:missed', 'drone:destroyed']).toContain(result.event);
  }, 2000);

  it('16.5.5: first drone:hit or drone:missed received within 500ms of engagement:fire', async () => {
    await WeaponPlatform.create({
      position: { lat: 25.905, lng: 51.543 },
      heading: 0,
      isActive: true,
      ammoCount: 2000,
      killCount: 0,
    });
    await Drone.create({
      droneId: 'LAG-D1',
      droneType: 'Quadcopter',
      status: 'Engagement Ready',
      position: { lat: 25.91, lng: 51.543, altitude: 100 },
      speed: 50,
      heading: 90,
      threatLevel: 0.8,
      hitPoints: 1,
      lastUpdated: new Date(),
    });

    const start = Date.now();
    const resultPromise = new Promise<{ event: string }>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout')), 1000);
      const handler = (event: string) => () => {
        clearTimeout(t);
        resolve({ event });
      };
      clientSocket.once('drone:hit', handler('drone:hit'));
      clientSocket.once('drone:missed', handler('drone:missed'));
      clientSocket.once('drone:destroyed', handler('drone:destroyed'));
      clientSocket.emit('engagement:fire', { droneId: 'LAG-D1', timestamp: new Date().toISOString() });
    });

    await resultPromise;
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  }, 2000);
});
