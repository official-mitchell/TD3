/**
 * TelemetryGauges. Per Implementation Plan 12.5.
 * Renders SpeedGauge, AltitudeBar, ThreatMeter, EngagementProbability when drone is selected.
 */
import React from 'react';
import { SpeedGauge } from './SpeedGauge';
import { AltitudeBar } from './AltitudeBar';
import { ThreatMeter } from './ThreatMeter';
import { EngagementProbability } from './EngagementProbability';
import { calculateDistance } from '../../utils/calculations';
import type { IDrone } from '@td3/shared-types';

export interface TelemetryGaugesProps {
  drone: IDrone;
  platformPosition: { lat: number; lng: number };
}

export const TelemetryGauges: React.FC<TelemetryGaugesProps> = ({ drone, platformPosition }) => {
  const distanceMeters = calculateDistance(platformPosition, drone.position);

  return (
    <div className="flex flex-col gap-3 mt-2">
      <SpeedGauge value={drone.speed} />
      <AltitudeBar value={drone.position.altitude} />
      <ThreatMeter value={drone.threatLevel ?? 0} />
      <EngagementProbability distanceMeters={distanceMeters} />
    </div>
  );
};
