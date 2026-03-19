/**
 * TelemetryGauges. Per Implementation Plan 12.5.
 * Renders SpeedGauge, AltitudeBar, ThreatMeter, EngagementProbability when drone is selected.
 * Wrapped in card for consistent layout; gauges sized to prevent label truncation.
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
    <div
      className="bg-slate-800/80 rounded-lg p-4 border border-slate-700 min-w-0 overflow-hidden flex-shrink-0"
      data-testid="telemetry-gauges"
    >
      <h3 className="text-sm font-bold mb-3 text-slate-200">Telemetry</h3>
      <div className="flex flex-col gap-4">
        <SpeedGauge value={drone.speed} />
        <AltitudeBar value={drone.position.altitude} />
        <ThreatMeter value={drone.threatLevel ?? 0} />
        <EngagementProbability distanceMeters={distanceMeters} />
      </div>
    </div>
  );
};
