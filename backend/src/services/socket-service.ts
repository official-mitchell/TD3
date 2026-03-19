/**
 * Socket.IO service — telemetry simulation and engagement handling.
 * Phase 2.4: heartbeat:ping → heartbeat:pong. Added engagement:fire handler (Step 2.1).
 * createTestDrones: add-only (no delete of enemies), delete friendlies only, 6 enemy drones per batch.
 * Migrates legacy drones (hitPoints missing or 1) to random 1–10 before creating new batch.
 * refillAmmo: sets ammo to 2000 and broadcasts platform:status.
 * handleEngagementFire: decrement ammo by 3 on BOTH hit and miss (fixes frontend reset bug).
 * broadcastAllDrones: emits drones:replace to all clients after create/clear.
 */
import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import type { IPosition } from '@td3/shared-types';
import Drone, {
  IDrone,
  IDroneDocument,
  DroneType,
} from '../models/drone.model';
import WeaponPlatform, {
  IWeaponPlatform,
} from '../models/weapon-platform.model';
import TelemetryLog from '../models/telemetry-log.model';

interface SimulationConfig {
  movementSpeed: number; // How fast drones move
  updateInterval: number; // How often positions update
  statusChangeProb: number; // Probability of status change
  threatChangeProb: number; // Probability of threat level change
}

type MovementPattern = {
  lat: number;
  lng: number;
  altitude: number;
  hover: boolean;
};

export class SocketService {
  private io: SocketServer;
  private simulationInterval: NodeJS.Timeout | null = null;
  private simulationConfig: SimulationConfig = {
    movementSpeed: 0.001,
    updateInterval: 2000,
    statusChangeProb: 0.2,
    threatChangeProb: 0.1,
  };
  private platform: IWeaponPlatform | null = null;
  private firingInterval: NodeJS.Timeout | null = null;
  private activeFiringDroneId: string | null = null;

  /** 200 shots/min = 1 round every 300ms */
  private static readonly ROUND_INTERVAL_MS = 300;

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:4200', 'http://localhost:5173', 'http://localhost:8000'],
        methods: ['GET', 'POST'],
      },
    });
    this.setupSocketHandlers();
    this.startSimulation();
    this.initializePlatform();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected');

      this.emitInitialDroneData(socket);
      if (this.platform) {
        socket.emit('platform:status', this.platform);
      }

      socket.on('requestDroneUpdate', async (droneId: string) => {
        await this.updateDrone(droneId);
      });

      socket.on('heartbeat:ping', () => {
        socket.emit('heartbeat:pong');
      });

      socket.on('engagement:fire', async (payload: { droneId: string; timestamp?: string }) => {
        await this.handleEngagementFire(payload.droneId, payload.timestamp ?? new Date().toISOString());
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }

  private calculateMovement(droneType: DroneType): MovementPattern {
    const patterns: Record<DroneType, MovementPattern> = {
      Quadcopter: {
        // More erratic, can hover, smaller movements
        lat: (Math.random() - 0.5) * this.simulationConfig.movementSpeed,
        lng: (Math.random() - 0.5) * this.simulationConfig.movementSpeed,
        altitude:
          (Math.random() - 0.5) * (this.simulationConfig.movementSpeed * 5000),
        // Can hover (sometimes no movement)
        hover: Math.random() < 0.2,
      },
      FixedWing: {
        // More linear, constant forward movement, gradual turns
        lat: Math.random() * this.simulationConfig.movementSpeed * 2,
        lng: Math.random() * this.simulationConfig.movementSpeed * 2,
        // Less altitude variation
        altitude:
          (Math.random() - 0.5) * (this.simulationConfig.movementSpeed * 2000),
        // Cannot hover
        hover: false,
      },
      VTOL: {
        // Combination of both patterns
        lat: (Math.random() - 0.5) * this.simulationConfig.movementSpeed * 1.5,
        lng: (Math.random() - 0.5) * this.simulationConfig.movementSpeed * 1.5,
        altitude:
          (Math.random() - 0.5) * (this.simulationConfig.movementSpeed * 3000),
        // Can hover occasionally
        hover: Math.random() < 0.1,
      },
      Unknown: {
        // Default random movement
        lat: (Math.random() - 0.5) * this.simulationConfig.movementSpeed,
        lng: (Math.random() - 0.5) * this.simulationConfig.movementSpeed,
        altitude:
          (Math.random() - 0.5) * (this.simulationConfig.movementSpeed * 1000),
        hover: false,
      },
    };

    return patterns[droneType] || patterns.Unknown;
  }

  /** Ras Laffan Industrial City, Qatar — default map center */
  private static readonly RAS_LAFFAN = { lat: 25.905310475056915, lng: 51.543824178558054 };
  private static readonly OLD_SF = { lat: 37.7749, lng: -122.4194 };

  private async initializePlatform() {
    try {
      // Get or create platform (ammoCount, killCount per IWeaponPlatform spec)
      let platform = await WeaponPlatform.findOne({ isActive: true });
      if (!platform) {
        platform = await WeaponPlatform.create({
          position: SocketService.RAS_LAFFAN,
          heading: 0,
          isActive: true,
          ammoCount: 2000,
          killCount: 0,
        });
      } else {
        // Migrate legacy SF position to Ras Laffan
        const pos = platform.position as { lat: number; lng: number };
        const isOldSf =
          Math.abs(pos.lat - SocketService.OLD_SF.lat) < 0.001 &&
          Math.abs(pos.lng - SocketService.OLD_SF.lng) < 0.001;
        if (isOldSf) {
          platform.position = SocketService.RAS_LAFFAN;
          await platform.save();
          console.log('Migrated platform position from SF to Ras Laffan, Qatar');
        }
      }
      // Ensure IWeaponPlatform shape (legacy docs may lack ammoCount/killCount)
      this.platform = {
        position: platform.position as { lat: number; lng: number },
        heading: platform.heading,
        isActive: platform.isActive,
        ammoCount: platform.ammoCount ?? 2000,
        killCount: platform.killCount ?? 0,
      };
      console.log('Weapon platform initialized:', this.platform);
      this.io.emit('platform:status', this.platform);
    } catch (error) {
      console.error('Error initializing weapon platform:', error);
    }
  }

  /** Public: update platform position and broadcast to all clients */
  updatePlatformPosition(position: { lat: number; lng: number }) {
    if (!this.platform) return;
    this.platform = { ...this.platform, position };
    this.io.emit('platform:status', this.platform);
  }

  /** Public: refill ammo to max (2000) and broadcast to all clients */
  async refillAmmo(): Promise<boolean> {
    try {
      const platformDoc = await WeaponPlatform.findOne({ isActive: true });
      if (!platformDoc) return false;
      const MAX_AMMO = 2000;
      platformDoc.ammoCount = MAX_AMMO;
      await platformDoc.save();
      this.platform = {
        ...this.platform!,
        ammoCount: MAX_AMMO,
      };
      this.io.emit('platform:status', this.platform);
      return true;
    } catch (err) {
      console.error('Refill ammo failed:', err);
      return false;
    }
  }

  private async updateDrone(droneId: string) {
    try {
      const drone = (await Drone.findOne({ droneId })) as IDroneDocument;

      // Rest of the update logic
      if (drone) {
        // Get movement pattern based on drone type
        const movement = this.calculateMovement(drone.droneType);

        // Apply movement if not hovering
        if (!movement.hover) {
          drone.position.lat += movement.lat;
          drone.position.lng += movement.lng;
          drone.position.altitude += movement.altitude;

          // Update heading based on movement
          if (drone.droneType === 'FixedWing') {
            // Fixed wing aircraft make wider turns
            const currentHeading = drone.heading || 0;
            const headingChange = (Math.random() - 0.5) * 20; // Max 20 degree turn
            drone.heading = (currentHeading + headingChange) % 360;
          } else {
            // Other types can make sharper turns
            drone.heading = Math.random() * 360;
          }
        }

        // Update speed based on type
        switch (drone.droneType) {
          case 'FixedWing':
            // Must maintain minimum speed
            drone.speed = Math.max(
              100,
              drone.speed + (Math.random() - 0.5) * 10
            );
            break;
          case 'Quadcopter':
            // Can hover or move slowly
            drone.speed = movement.hover
              ? 0
              : Math.max(0, drone.speed + (Math.random() - 0.5) * 15);
            break;
          case 'VTOL':
            // Can hover or move at variable speeds
            drone.speed = movement.hover
              ? 0
              : Math.max(0, drone.speed + (Math.random() - 0.5) * 20);
            break;
          default:
            drone.speed = Math.max(0, drone.speed + (Math.random() - 0.5) * 5);
        }

        // Use config probabilities
        if (Math.random() < this.simulationConfig.statusChangeProb) {
          const statuses: Array<IDrone['status']> = [
            'Detected',
            'Identified',
            'Confirmed',
            'Engagement Ready',
          ];
          drone.status = statuses[Math.floor(Math.random() * statuses.length)];
        }

        // Randomly update threat level (0.0–1.0 per IDrone spec)
        if (Math.random() < this.simulationConfig.threatChangeProb) {
          drone.threatLevel = Math.random();
        }

        drone.lastUpdated = new Date();
        await drone.save();

        this.io.emit('droneUpdate', drone);
      }
    } catch (error) {
      console.error('Error updating drone:', error);
    }
  }

  private calculateDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    // Simple distance calculation (can be enhanced with proper geospatial calculation)
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (pos1.lat * Math.PI) / 180;
    const φ2 = (pos2.lat * Math.PI) / 180;
    const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private stopFiring() {
    if (this.firingInterval) {
      clearInterval(this.firingInterval);
      this.firingInterval = null;
    }
    this.activeFiringDroneId = null;
  }

  private async handleEngagementFire(droneId: string, timestamp: string) {
    try {
      const drone = await Drone.findOne({ droneId });
      if (!drone || drone.status !== 'Engagement Ready' || !this.platform) {
        return;
      }
      this.stopFiring();
      this.activeFiringDroneId = droneId;

      const fireOneRound = async (): Promise<void> => {
        if (this.activeFiringDroneId !== droneId) return;

        const freshDrone = await Drone.findOne({ droneId });
        if (!freshDrone || freshDrone.status !== 'Engagement Ready') {
          this.stopFiring();
          return;
        }

        const platformDoc = await WeaponPlatform.findOne({ isActive: true });
        if (!platformDoc || platformDoc.ammoCount <= 0) {
          this.stopFiring();
          return;
        }

        platformDoc.ammoCount = Math.max(0, platformDoc.ammoCount - 1);
        await platformDoc.save();
        this.platform = {
          position: platformDoc.position,
          heading: platformDoc.heading,
          isActive: platformDoc.isActive,
          ammoCount: platformDoc.ammoCount,
          killCount: platformDoc.killCount,
        };
        this.io.emit('platform:status', this.platform);

        const distanceM = this.calculateDistance(freshDrone.position, this.platform.position);
        const rangeFactor = Math.max(0, 1 - distanceM / 2000);
        const speedPenalty = freshDrone.speed / 500;
        const baseHitProbability = Math.min(1, Math.max(0,
          0.85 * rangeFactor * (1 - speedPenalty * 0.3)
        ));
        const hitProbability = baseHitProbability * 0.15;
        const roll = Math.random();
        const isHit = roll <= hitProbability;

        await TelemetryLog.create({
          timestamp: new Date().toISOString(),
          droneId,
          position: freshDrone.position,
          status: freshDrone.status,
          engagementOutcome: isHit ? 'Destroyed' : 'Missed',
        });

        if (isHit) {
          const doc = freshDrone as IDroneDocument & { hitPoints?: number };
          const hp = doc.hitPoints ?? 1;
          const newHP = Math.max(0, hp - 1);
          (doc as any).hitPoints = newHP;
          await freshDrone.save();

          if (newHP <= 0) {
            this.stopFiring();
            freshDrone.status = 'Hit';
            await freshDrone.save();
            this.io.emit('drone:hit', { droneId, timestamp: new Date().toISOString(), hitPointsRemaining: 0 });
            await new Promise((r) => setTimeout(r, 300));
            freshDrone.status = 'Destroyed';
            await freshDrone.save();
            this.io.emit('drone:destroyed', { droneId });
            const platformDoc = await WeaponPlatform.findOne({ isActive: true });
            if (platformDoc) {
              platformDoc.killCount += 1;
              await platformDoc.save();
              this.platform = { ...this.platform!, killCount: platformDoc.killCount };
              this.io.emit('platform:status', this.platform);
            }
          } else {
            const obj = freshDrone.toObject() as unknown as Record<string, unknown>;
            const payload: IDrone = {
              droneId: obj.droneId as string,
              droneType: obj.droneType as IDrone['droneType'],
              status: obj.status as IDrone['status'],
              position: obj.position as IPosition,
              speed: obj.speed as number,
              heading: obj.heading as number,
              threatLevel: obj.threatLevel as number,
              lastUpdated: new Date().toISOString(),
              hitPoints: newHP,
            };
            this.io.emit('drone:update', payload);
            this.io.emit('drone:hit', { droneId, timestamp: new Date().toISOString(), hitPointsRemaining: newHP });
          }
        } else {
          this.io.emit('drone:missed', { droneId, outcome: 'Missed', timestamp: new Date().toISOString() });
        }
      };

      await fireOneRound();
      this.firingInterval = setInterval(async () => {
        if (this.activeFiringDroneId !== droneId) return;
        await fireOneRound();
      }, SocketService.ROUND_INTERVAL_MS);
    } catch (error) {
      console.error('Engagement fire error:', error);
      this.stopFiring();
    }
  }

  private startSimulation() {
    // Update all drones every 2 seconds (exclude Hit/Destroyed)
    this.simulationInterval = setInterval(async () => {
      try {
        const drones = await Drone.find({ status: { $nin: ['Hit', 'Destroyed'] } });
        for (const drone of drones) {
          await this.updateDrone(drone.droneId);
        }
      } catch (error) {
        console.error('Simulation error:', error);
      }
    }, this.simulationConfig.updateInterval);
  }

  private async emitInitialDroneData(socket: any) {
    try {
      // Import your Drone model at the top of the file
      const drones = await Drone.find().sort({ lastUpdated: -1 });
      socket.emit('initialDroneData', { drones });
    } catch (error) {
      console.error('Error sending initial drone data:', error);
      socket.emit('error', { message: 'Error fetching drone data' });
    }
  }

  public broadcastDroneUpdate(droneData: IDrone) {
    this.io.emit('droneUpdate', droneData);
  }

  /** Broadcast all drones to all connected clients (e.g. after create/clear). */
  public async broadcastAllDrones() {
    try {
      const drones = await Drone.find({ status: { $nin: ['Hit', 'Destroyed'] } })
        .sort({ lastUpdated: -1 })
        .lean();
      this.io.emit('drones:replace', { drones });
    } catch (err) {
      console.error('broadcastAllDrones error:', err);
    }
  }

  public stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  public async createTestDrones() {
    try {
      console.log('Starting drone creation...');
      // Migrate legacy drones: set hitPoints 1–10 for any with missing or default 1
      const randHP = () => Math.floor(Math.random() * 10) + 1;
      const legacy = await Drone.find({
        $or: [{ hitPoints: { $exists: false } }, { hitPoints: 1 }],
      });
      for (const d of legacy) {
        d.hitPoints = randHP();
        await d.save();
      }
      if (legacy.length > 0) {
        console.log(`Migrated ${legacy.length} drone(s) to random hitPoints 1–10`);
      }
      // Delete only friendly drones; keep all enemy drones
      const deleted = await Drone.deleteMany({ isFriendly: true });
      if (deleted.deletedCount > 0) {
        console.log(`Cleared ${deleted.deletedCount} friendly drone(s)`);
      }

      // Generate unique IDs per batch (add-only, never replace enemies)
      const base = Date.now().toString(36).toUpperCase();
      const testDrones = [
        {
          droneId: `QUAD-${base}-1`,
          droneType: 'Quadcopter',
          status: 'Detected',
          position: this.generateRandomPosition(this.platform!.position, 2000),
          speed: 15,
          heading: Math.random() * 360,
          threatLevel: 0.4,
          isFriendly: false,
          hitPoints: randHP(),
        },
        {
          droneId: `QUAD-${base}-2`,
          droneType: 'Quadcopter',
          status: 'Detected',
          position: this.generateRandomPosition(this.platform!.position, 2000),
          speed: 18,
          heading: Math.random() * 360,
          threatLevel: 0.35,
          isFriendly: false,
          hitPoints: randHP(),
        },
        {
          droneId: `FIXED-${base}-1`,
          droneType: 'FixedWing',
          status: 'Detected',
          position: this.generateRandomPosition(this.platform!.position, 2000),
          speed: 100,
          heading: Math.random() * 360,
          threatLevel: 0.6,
          isFriendly: false,
          hitPoints: randHP(),
        },
        {
          droneId: `FIXED-${base}-2`,
          droneType: 'FixedWing',
          status: 'Detected',
          position: this.generateRandomPosition(this.platform!.position, 2000),
          speed: 95,
          heading: Math.random() * 360,
          threatLevel: 0.55,
          isFriendly: false,
          hitPoints: randHP(),
        },
        {
          droneId: `VTOL-${base}-1`,
          droneType: 'VTOL',
          status: 'Detected',
          position: this.generateRandomPosition(this.platform!.position, 2000),
          speed: 50,
          heading: Math.random() * 360,
          threatLevel: 0.5,
          isFriendly: false,
          hitPoints: randHP(),
        },
        {
          droneId: `VTOL-${base}-2`,
          droneType: 'VTOL',
          status: 'Detected',
          position: this.generateRandomPosition(this.platform!.position, 2000),
          speed: 45,
          heading: Math.random() * 360,
          threatLevel: 0.45,
          isFriendly: false,
          hitPoints: randHP(),
        },
      ];

      console.log(
        'About to create drones:',
        JSON.stringify(testDrones, null, 2)
      );

      for (const droneData of testDrones) {
        console.log(
          `Creating drone: ${droneData.droneId} of type ${droneData.droneType}`
        );
        const drone = new Drone(droneData);
        const savedDrone = await drone.save();
        console.log('Saved drone:', JSON.stringify(savedDrone, null, 2));
      }

      // Verify what's in the database
      const allDrones = await Drone.find();
      console.log(
        'All drones in database:',
        JSON.stringify(allDrones, null, 2)
      );

      await this.broadcastAllDrones();
      return {
        message: 'Test drones created successfully',
        count: testDrones.length,
      };
    } catch (error) {
      console.error('Error creating test drones:', error);
      throw error;
    }
  }

  private generateRandomPosition(
    platformPos: { lat: number; lng: number },
    maxRange: number = 2000
  ) {
    // maxRange in meters
    const r = Math.random() * maxRange;
    const theta = Math.random() * 2 * Math.PI;

    // Convert to lat/lng (approximate conversion)
    const lat = platformPos.lat + (r * Math.cos(theta)) / 111320; // 1 degree lat ≈ 111.32km
    const lng =
      platformPos.lng +
      (r * Math.sin(theta)) /
        (111320 * Math.cos((platformPos.lat * Math.PI) / 180));

    return {
      lat,
      lng,
      altitude: 100 + Math.random() * 400, // Random altitude between 100-500m
    };
  }

  /** Create only targettable drones (Engagement Ready, altitude ≤500m, within range) for testing. */
  public async createTargettableDrones() {
    if (!this.platform) {
      throw new Error('Platform not initialized');
    }
    const randHP = () => Math.floor(Math.random() * 10) + 1;
    const base = Date.now().toString(36).toUpperCase();
    const types: Array<{ type: string; speed: number; threat: number }> = [
      { type: 'Quadcopter', speed: 15, threat: 0.5 },
      { type: 'Quadcopter', speed: 18, threat: 0.45 },
      { type: 'FixedWing', speed: 100, threat: 0.6 },
      { type: 'VTOL', speed: 50, threat: 0.55 },
    ];
    const drones = types.map((t, i) => ({
      droneId: `TGT-${base}-${i + 1}`,
      droneType: t.type as DroneType,
      status: 'Engagement Ready' as const,
      position: this.generateRandomPosition(this.platform!.position, 1500),
      speed: t.speed,
      heading: Math.random() * 360,
      threatLevel: t.threat,
      isFriendly: false,
      hitPoints: randHP(),
    }));
    for (const d of drones) {
      await new Drone(d).save();
    }
    await this.broadcastAllDrones();
    return { message: 'Targettable drones created', count: drones.length };
  }

}

export default SocketService;
