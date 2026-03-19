/**
 * TelemetryOverlay. Mini analysis dashboard over the map.
 * Fixed bottom-left of map when drone selected. Speed, Altitude, Threat, Engagement Probability.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { SpeedGauge } from '@components/gauges/SpeedGauge';
import { ElevationChart } from '@components/gauges/ElevationChart';
import { ThreatMeter } from '@components/gauges/ThreatMeter';
import { EngagementProbability } from '@components/gauges/EngagementProbability';
import { calculateDistance } from '../../utils/calculations';
import type { IDrone } from '@td3/shared-types';

export const TelemetryOverlay: React.FC = () => {
  const map = useMap();
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);

  const drone = selectedDroneId ? drones.get(selectedDroneId) ?? null : null;
  const platformPosition = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };

  if (!drone) return null;

  const distanceMeters = calculateDistance(platformPosition, drone.position);

  const overlay = (
    <div
      data-testid="telemetry-overlay"
      className="absolute bottom-4 left-4 z-[600] pointer-events-auto rounded-lg border border-cyan-500/40 shadow-xl"
      style={{
        width: 320,
        background: 'rgba(15, 25, 41, 0.55)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="p-3">
        <div className="text-xs font-bold text-cyan-400/90 mb-2 uppercase tracking-wider">
          {drone.droneId}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center">
            <SpeedGauge value={drone.speed} />
          </div>
          <div className="flex flex-col items-center">
            <ElevationChart
              platformPosition={platformPosition}
              dronePosition={drone.position}
            />
          </div>
          <div className="flex flex-col items-center">
            <ThreatMeter value={drone.threatLevel ?? 0} />
          </div>
          <div className="flex flex-col items-center">
            <EngagementProbability distanceMeters={distanceMeters} />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, map.getContainer());
};
