/**
 * Socket.IO service — telemetry simulation and engagement handling.
 * CORS: uses getCorsConfig() (normalized, same as Express). Socket.IO expects origin as array.
 * Phase 2.4: heartbeat:ping → heartbeat:pong. Added engagement:fire handler (Step 2.1).
 * Phase 18.1.3: structured logging for socket.connected, socket.disconnected, engagement.*, drone.statusChange, db.error.
 * createTestDrones: add-only (no delete of enemies), delete friendlies only, 6 enemy drones per batch.
 * Migrates legacy drones (hitPoints missing or 1) to random 1–3. HP capped at 3.
 * refillAmmo: sets ammo to 2000 and broadcasts platform:status.
 * handleEngagementFire: decrement ammo by 3 on BOTH hit and miss (fixes frontend reset bug).
 * broadcastAllDrones: emits drones:replace to all clients after create/clear.
 * 60fps: updateInterval 16ms. Throttle drone.save() to 500ms or on status change.
 * Time-based: speed escalation (+5 km/h/s), status (msWithin5km>=6000), evading (10s), heading nudge scaled.
 * simulation:rate emitted every second for droneUpdate events/sec monitoring.
 * Stable drone movement: all drones move via destinationPoint (heading + speed). Approach: nudge 8 deg/s. Cruise: arc turn ~30s.
 */
import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import type { IPosition } from '@td3/shared-types';
import { getCorsConfig } from '../lib/cors';
import { logger } from '../lib/logger';
import { calculateHitProbability } from '../utils/engagementProbability';
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

export class SocketService {
  private io: SocketServer;
  private simulationInterval: NodeJS.Timeout | null = null;
  private simulationConfig: SimulationConfig = {
    movementSpeed: 0.001,
    updateInterval: 16, /* 60 fps */
    statusChangeProb: 0.2,
    threatChangeProb: 0.1,
  };
  private platform: IWeaponPlatform | null = null;
  private firingInterval: NodeJS.Timeout | null = null;
  private activeFiringDroneId: string | null = null;

  /** 13.4: Milliseconds each drone has been within 5km (for Identified progression) */
  private droneMsWithin5km = new Map<string, number>();

  /** 13.5: Evading drones — ms remaining before resuming normal approach */
  private evadingMsRemaining = new Map<string, number>();

  /** Throttle DB writes: last save timestamp per drone */
  private lastDroneSaveAt = new Map<string, number>();

  /** Per-drone base speed when >= 3km (avoids jitter from random each tick) */
  private droneBaseSpeed = new Map<string, number>();

  /** Cruise drones: target heading for arc turn (smooth interpolation) */
  private droneTargetHeading = new Map<string, number>();

  /** Cruise drones: ms when next turn decision is due (~30s) */
  private droneNextTurnAt = new Map<string, number>();

  /** Per-drone: true = approach platform, false = cruise (assigned once) */
  private droneUseApproach = new Map<string, boolean>();

  /** Emit rate monitoring: count of droneUpdate emits in current second */
  private droneUpdateEmitCount = 0;
  private droneUpdateEmitCountResetAt = 0;

  /** 200 shots/min = 1 round every 300ms */
  private static readonly ROUND_INTERVAL_MS = 300;

  constructor(server: HttpServer) {
    const corsConfig = getCorsConfig();
    // Socket.IO: "*" as string for allow-all; single origin as array per docs
    const corsOrigin =
      corsConfig === '*' ? '*' : typeof corsConfig === 'string' ? [corsConfig] : corsConfig;
    this.io = new SocketServer(server, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
      },
    });
    this.setupSocketHandlers();
    this.startSimulation();
    this.initializePlatform();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('socket.connected', { socketId: socket.id });

      try {
        this.emitInitialDroneData(socket);
        if (this.platform) {
          socket.emit('platform:status', this.platform);
        }
      } catch (err) {
        logger.error('db.error', { error: (err as Error).message, operation: 'emitInitialDroneData' });
      }

      socket.on('requestDroneUpdate', async (droneId: string) => {
        try {
          await this.updateDrone(droneId);
        } catch (err) {
          logger.error('db.error', { error: (err as Error).message, operation: 'requestDroneUpdate' });
        }
      });

      socket.on('heartbeat:ping', () => {
        socket.emit('heartbeat:pong');
      });

      socket.on('engagement:fire', async (payload: { droneId: string; timestamp?: string }) => {
        try {
          await this.handleEngagementFire(payload.droneId, payload.timestamp ?? new Date().toISOString());
        } catch (err) {
          logger.error('engagement.fired', { error: (err as Error).message });
        }
      });

      socket.on('engagement:destroy', async (payload: { droneId: string; position?: { lat: number; lng: number; altitude: number } }) => {
        try {
          await this.handleEngagementDestroy(payload.droneId, payload.position);
        } catch (err) {
          logger.error('db.error', { error: (err as Error).message, operation: 'engagement:destroy' });
        }
      });

      socket.on('disconnect', (reason) => {
        logger.info('socket.disconnected', { socketId: socket.id, reason });
      });
    });
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
          logger.info('platform.migrated', { from: 'SF', to: 'Ras Laffan' });
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
      logger.info('platform.initialized', { ammoCount: this.platform.ammoCount });
      this.io.emit('platform:status', this.platform);
    } catch (error) {
      logger.error('db.error', { error: (error as Error).message, operation: 'initializePlatform' });
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
      logger.error('db.error', { error: (err as Error).message, operation: 'refillAmmo' });
      return false;
    }
  }

  /** Throttle DB writes: save only on status change or every 500ms */
  private async maybeSaveDrone(drone: IDroneDocument, droneId: string, statusChanged: boolean): Promise<void> {
    const now = Date.now();
    const lastSave = this.lastDroneSaveAt.get(droneId) ?? 0;
    if (statusChanged || now - lastSave >= 500) {
      await drone.save();
      this.lastDroneSaveAt.set(droneId, now);
    }
  }

  /** Emit droneUpdate and track rate for monitoring */
  private emitDroneUpdate(drone: IDroneDocument): void {
    this.io.emit('droneUpdate', drone);
    const now = Date.now();
    if (now >= this.droneUpdateEmitCountResetAt) {
      if (this.droneUpdateEmitCountResetAt > 0) {
        this.io.emit('simulation:rate', { eventsPerSec: this.droneUpdateEmitCount });
      }
      this.droneUpdateEmitCount = 0;
      this.droneUpdateEmitCountResetAt = now + 1000;
    }
    this.droneUpdateEmitCount += 1;
  }

  private async updateDrone(droneId: string, activeDroneIds?: string[]) {
    try {
      const drone = (await Drone.findOne({ droneId })) as IDroneDocument;

      if (drone && this.platform) {
        const distanceM = this.calculateDistance(
          drone.position as { lat: number; lng: number },
          this.platform.position
        );

        /* 13.5: Evasive maneuver on miss (time-based). Reduced jink for smoother evasion. */
        const evadingMs = this.evadingMsRemaining.get(droneId);
        if (evadingMs !== undefined && evadingMs > 0) {
          const jink = (Math.random() - 0.5) * 30; /* ±15° per tick for consistent evasion */
          drone.heading = ((drone.heading ?? 0) + jink + 360) % 360;
          const dtSec = this.simulationConfig.updateInterval / 1000;
          drone.speed = Math.min(250, (drone.speed ?? 100) + 30 * dtSec); /* 13.5.2: +30 km/h per second */
          const moveM = (drone.speed * 1000 * this.simulationConfig.updateInterval) / 3600000;
          const next = this.destinationPoint(
            drone.position as { lat: number; lng: number },
            drone.heading,
            moveM
          );
          drone.position.lat = next.lat;
          drone.position.lng = next.lng;
          drone.threatLevel = Math.max(0, Math.min(1, 1 - distanceM / 5000));
          const dt = this.simulationConfig.updateInterval;
          const nextMs = evadingMs - dt;
          if (nextMs <= 0) {
            this.evadingMsRemaining.delete(droneId); /* 13.5.3: clear after evading duration */
          } else {
            this.evadingMsRemaining.set(droneId, nextMs);
          }
          drone.lastUpdated = new Date();
          await this.maybeSaveDrone(drone, droneId, false);
          this.emitDroneUpdate(drone);
          return;
        }

        /* 13.3: Threat level from distance */
        drone.threatLevel = Math.max(0, Math.min(1, 1 - distanceM / 5000));

        /* 13.2: Speed escalation (time-based). Use stable base speed when >= 3km to avoid jitter. */
        const dt = this.simulationConfig.updateInterval;
        const dtSec = dt / 1000;
        if (distanceM < 3000) {
          drone.speed = Math.min(250, (drone.speed ?? 100) + 5 * dtSec);
        } else {
          let base = this.droneBaseSpeed.get(droneId);
          if (base == null) {
            const ranges: Record<DroneType, [number, number]> = {
              Quadcopter: [90, 110],
              FixedWing: [105, 125],
              VTOL: [95, 120],
              Unknown: [95, 115],
            };
            const [lo, hi] = ranges[drone.droneType] ?? [95, 115];
            base = lo + Math.random() * (hi - lo);
            this.droneBaseSpeed.set(droneId, base);
          }
          drone.speed = base;
        }

        /* All drones move in heading direction (no random lat/lng). Straight lines, arc turns. */
        let useApproachVector = this.droneUseApproach.get(droneId);
        if (useApproachVector === undefined) {
          useApproachVector = Math.random() < 0.7; /* 70% fly toward turret (13.1), assigned once */
          this.droneUseApproach.set(droneId, useApproachVector);
        }
        const now = Date.now();

        if (useApproachVector) {
          /* 13.6: Swarm formation — 3+ drones: space approach bearings 120° apart */
          let targetBearing: number;
          if (activeDroneIds && activeDroneIds.length >= 3) {
            const slotIndex = activeDroneIds.indexOf(droneId);
            const slotBearing = (slotIndex * 360) / activeDroneIds.length;
            const targetPoint = this.destinationPoint(
              this.platform.position,
              slotBearing,
              distanceM
            );
            targetBearing = this.calculateBearing(
              drone.position as { lat: number; lng: number },
              targetPoint
            );
          } else {
            targetBearing = this.calculateBearing(
              drone.position as { lat: number; lng: number },
              this.platform.position
            );
          }
          const currentHeading = (drone.heading ?? 0) % 360;
          let angleDiff = (targetBearing - currentHeading + 360) % 360;
          if (angleDiff > 180) angleDiff -= 360;
          const nudgeDeg = 8 * dtSec; /* 8 deg/s smooth turn */
          const nudge = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), nudgeDeg);
          drone.heading = (currentHeading + nudge + 360) % 360;
        } else {
          /* Cruise: fly straight, arc turn every ~30s */
          let nextTurn = this.droneNextTurnAt.get(droneId) ?? now + 30000;
          if (now >= nextTurn) {
            const currentHdg = (drone.heading ?? 0) % 360;
            const turnDeg = (Math.random() - 0.5) * 60; /* ±30° new heading */
            this.droneTargetHeading.set(droneId, (currentHdg + turnDeg + 360) % 360);
            this.droneNextTurnAt.set(droneId, now + 25000 + Math.random() * 15000); /* 25–40s */
          }
          const targetHdg = this.droneTargetHeading.get(droneId);
          if (targetHdg != null) {
            let curHdg = (drone.heading ?? 0) % 360;
            let diff = (targetHdg - curHdg + 360) % 360;
            if (diff > 180) diff -= 360;
            const maxTurn = 3 * dtSec; /* 3 deg/s arc */
            const turn = Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
            curHdg = (curHdg + turn + 360) % 360;
            drone.heading = curHdg;
            if (Math.abs(diff) < 1) this.droneTargetHeading.delete(droneId);
          }
        }

        /* All drones: move forward in heading direction (physics-based) */
        const moveM = (drone.speed * 1000 * dt) / 3600000;
        const next = this.destinationPoint(
          drone.position as { lat: number; lng: number },
          drone.heading,
          moveM
        );
        drone.position.lat = next.lat;
        drone.position.lng = next.lng;

        /* 13.4: Automatic status progression (time-based: msWithin5km >= 6000 for Identified) */
        const ms = this.droneMsWithin5km.get(droneId) ?? 0;
        if (distanceM < 5000) {
          this.droneMsWithin5km.set(droneId, ms + dt);
        } else {
          this.droneMsWithin5km.set(droneId, 0);
        }

        const prevStatus = drone.status;
        if (drone.status === 'Detected' && distanceM < 5000 && ms + dt >= 6000) {
          drone.status = 'Identified';
        } else if (drone.status === 'Identified' && drone.threatLevel > 0.5 && distanceM < 3000) {
          drone.status = 'Confirmed';
        } else if (drone.status === 'Confirmed' && distanceM < 2000) {
          drone.status = 'Engagement Ready';
        }

        if (drone.status !== prevStatus) {
          logger.info('drone.statusChange', {
            droneId,
            fromStatus: prevStatus,
            toStatus: drone.status,
            distanceMeters: distanceM,
          });
          this.io.emit('drone:status', { droneId, status: drone.status });
        }

        drone.lastUpdated = new Date();
        await this.maybeSaveDrone(drone, droneId, drone.status !== prevStatus);
        this.emitDroneUpdate(drone);
      } else if (drone) {
        /* Fallback when platform not yet initialized: fly straight in heading direction */
        const dt = this.simulationConfig.updateInterval;
        const moveM = ((drone.speed ?? 100) * 1000 * dt) / 3600000;
        const next = this.destinationPoint(
          drone.position as { lat: number; lng: number },
          drone.heading ?? 0,
          moveM
        );
        drone.position.lat = next.lat;
        drone.position.lng = next.lng;
        drone.lastUpdated = new Date();
        await this.maybeSaveDrone(drone, droneId, false);
        this.emitDroneUpdate(drone);
      }
    } catch (error) {
      logger.error('db.error', { error: (error as Error).message, operation: 'updateDrone', droneId });
    }
  }

  private calculateDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    const R = 6371e3;
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

  /** Bearing from pos1 to pos2 in degrees (0–360). */
  private calculateBearing(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    const φ1 = (pos1.lat * Math.PI) / 180;
    const φ2 = (pos2.lat * Math.PI) / 180;
    const λ1 = (pos1.lng * Math.PI) / 180;
    const λ2 = (pos2.lng * Math.PI) / 180;

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);

    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  /** Destination point given start, bearing (deg), and distance (m). */
  private destinationPoint(
    start: { lat: number; lng: number },
    bearingDeg: number,
    distanceM: number
  ): { lat: number; lng: number } {
    const R = 6371e3;
    const φ1 = (start.lat * Math.PI) / 180;
    const λ1 = (start.lng * Math.PI) / 180;
    const θ = (bearingDeg * Math.PI) / 180;
    const δ = distanceM / R;
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
      );
    return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
  }

  private stopFiring() {
    if (this.firingInterval) {
      clearInterval(this.firingInterval);
      this.firingInterval = null;
    }
    this.activeFiringDroneId = null;
  }

  /** Dev/test: instantly destroy selected drone (D key). Uses client position when provided for finer accuracy. */
  private async handleEngagementDestroy(droneId: string, clientPosition?: { lat: number; lng: number; altitude: number }) {
    try {
      const drone = await Drone.findOne({ droneId });
      if (!drone || drone.status === 'Hit' || drone.status === 'Destroyed') return;
      drone.status = 'Destroyed';
      await drone.save();
      this.droneMsWithin5km.delete(droneId);
      this.evadingMsRemaining.delete(droneId);
      this.lastDroneSaveAt.delete(droneId);
      this.droneBaseSpeed.delete(droneId);
      this.droneUseApproach.delete(droneId);
      this.droneTargetHeading.delete(droneId);
      this.droneNextTurnAt.delete(droneId);
      const pos = clientPosition ?? (drone.position as { lat: number; lng: number; altitude: number });
      this.io.emit('drone:destroyed', {
        droneId,
        position: { lat: pos.lat, lng: pos.lng, altitude: pos.altitude },
        droneType: drone.droneType,
      });
      const platformDoc = await WeaponPlatform.findOne({ isActive: true });
      if (platformDoc) {
        platformDoc.killCount += 1;
        await platformDoc.save();
        this.platform = { ...this.platform!, killCount: platformDoc.killCount };
        this.io.emit('platform:status', this.platform);
      }
    } catch (err) {
      logger.error('db.error', { error: (err as Error).message, operation: 'engagement:destroy' });
    }
  }

  private async handleEngagementFire(droneId: string, timestamp: string) {
    try {
      const drone = await Drone.findOne({ droneId });
      if (!drone || drone.status !== 'Engagement Ready' || !this.platform) {
        return;
      }
      const distanceM = this.calculateDistance(drone.position, this.platform.position);
      const hitProbability = calculateHitProbability(distanceM, drone.speed ?? 0);
      logger.info('engagement.fired', { droneId, distanceMeters: distanceM, hitProbability });

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
        const hitProbability = calculateHitProbability(distanceM, freshDrone.speed ?? 0);
        const roll = Math.random();
        const isHit = roll <= hitProbability;

        const bearingToDrone = this.calculateBearing(this.platform.position, freshDrone.position);
        const landingPosition = isHit
          ? { lat: freshDrone.position.lat, lng: freshDrone.position.lng }
          : (() => {
              const coneAngleDeg = Math.min(6, 0.5 + (distanceM / 1000) * 2);
              const angleOffset = (Math.random() - 0.5) * 2.5 * coneAngleDeg;
              const overshootM = 30 + Math.random() * 220;
              const missBearing = (bearingToDrone + angleOffset + 360) % 360;
              const missDistance = distanceM + overshootM;
              return this.destinationPoint(this.platform.position, missBearing, missDistance);
            })();

        if (isHit) {
          const doc = freshDrone as IDroneDocument & { hitPoints?: number };
          const hp = doc.hitPoints ?? 1;
          const newHP = Math.max(0, hp - 1);
          (doc as any).hitPoints = newHP;
          await freshDrone.save();

          const engagementOutcome: 'Hit' | 'Destroyed' = newHP <= 0 ? 'Destroyed' : 'Hit';
          await TelemetryLog.create({
            timestamp: new Date().toISOString(),
            droneId,
            position: freshDrone.position,
            status: freshDrone.status,
            engagementOutcome,
          });

          if (newHP <= 0) {
            logger.info('engagement.hit', { droneId, timestamp: new Date().toISOString() });
            this.stopFiring();
            freshDrone.status = 'Hit';
            await freshDrone.save();
            this.io.emit('drone:hit', {
              droneId,
              timestamp: new Date().toISOString(),
              hitPointsRemaining: 0,
              landingPosition: { lat: landingPosition.lat, lng: landingPosition.lng },
            });
            await new Promise((r) => setTimeout(r, 300));
            freshDrone.status = 'Destroyed';
            await freshDrone.save();
            const fp = freshDrone.position as { lat: number; lng: number; altitude: number };
            this.droneMsWithin5km.delete(droneId);
            this.evadingMsRemaining.delete(droneId);
            this.lastDroneSaveAt.delete(droneId);
            this.droneBaseSpeed.delete(droneId);
            this.droneUseApproach.delete(droneId);
            this.droneTargetHeading.delete(droneId);
            this.droneNextTurnAt.delete(droneId);
            this.io.emit('drone:destroyed', {
              droneId,
              position: { lat: fp.lat, lng: fp.lng, altitude: fp.altitude },
              droneType: freshDrone.droneType,
            });
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
            this.io.emit('drone:hit', {
              droneId,
              timestamp: new Date().toISOString(),
              hitPointsRemaining: newHP,
              landingPosition: { lat: landingPosition.lat, lng: landingPosition.lng },
            });
          }
        } else {
          logger.info('engagement.missed', { droneId, timestamp: new Date().toISOString() });
          await TelemetryLog.create({
            timestamp: new Date().toISOString(),
            droneId,
            position: freshDrone.position,
            status: freshDrone.status,
            engagementOutcome: 'Missed',
          });
          this.evadingMsRemaining.set(droneId, 10000); /* 13.5.1: evading for 10s (was 5 ticks × 2s) */
          this.io.emit('drone:missed', {
            droneId,
            outcome: 'Missed',
            timestamp: new Date().toISOString(),
            landingPosition: { lat: landingPosition.lat, lng: landingPosition.lng },
          });
        }
      };

      await fireOneRound();
      this.firingInterval = setInterval(async () => {
        if (this.activeFiringDroneId !== droneId) return;
        await fireOneRound();
      }, SocketService.ROUND_INTERVAL_MS);
    } catch (error) {
      logger.error('engagement.fired', { error: (error as Error).message });
      this.stopFiring();
    }
  }

  private startSimulation() {
    this.simulationInterval = setInterval(async () => {
      try {
        const drones = await Drone.find({ status: { $nin: ['Hit', 'Destroyed'] } });
        const activeIds = drones.map((d) => d.droneId).sort();
        for (const drone of drones) {
          await this.updateDrone(drone.droneId, activeIds);
        }
      } catch (error) {
        logger.error('db.error', { error: (error as Error).message, operation: 'simulation' });
      }
    }, this.simulationConfig.updateInterval);
  }

  private async emitInitialDroneData(socket: Socket) {
    try {
      // Import your Drone model at the top of the file
      const drones = await Drone.find().sort({ lastUpdated: -1 });
      socket.emit('initialDroneData', { drones });
    } catch (error) {
      logger.error('db.error', { error: (error as Error).message, operation: 'emitInitialDroneData' });
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
      logger.error('db.error', { error: (err as Error).message, operation: 'broadcastAllDrones' });
    }
  }

  /** Phase 18.4.1: Active drone count for health endpoint. */
  public async getActiveDroneCount(): Promise<number> {
    try {
      return await Drone.countDocuments({ status: { $nin: ['Hit', 'Destroyed'] } });
    } catch {
      return 0;
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
      logger.info('drone.createTest', { operation: 'createTestDrones' });
      // Migrate legacy drones: set hitPoints 1–3 for any with missing, 1, or >3
      const randHP = () => Math.floor(Math.random() * 3) + 1;
      const legacy = await Drone.find({
        $or: [
          { hitPoints: { $exists: false } },
          { hitPoints: 1 },
          { hitPoints: { $gt: 3 } },
        ],
      });
      for (const d of legacy) {
        d.hitPoints = randHP();
        await d.save();
      }
      if (legacy.length > 0) {
        logger.info('drone.migrated', { count: legacy.length });
      }
      // Delete only friendly drones; keep all enemy drones
      const deleted = await Drone.deleteMany({ isFriendly: true });
      if (deleted.deletedCount > 0) {
        logger.info('drone.cleared', { count: deleted.deletedCount });
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

      for (const droneData of testDrones) {
        const drone = new Drone(droneData);
        await drone.save();
      }

      await this.broadcastAllDrones();
      return {
        message: 'Test drones created successfully',
        count: testDrones.length,
      };
    } catch (error) {
      logger.error('db.error', { error: (error as Error).message, operation: 'createTestDrones' });
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
    const randHP = () => Math.floor(Math.random() * 3) + 1;
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
