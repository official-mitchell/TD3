/**
 * TelemetryOverlay. Vertical layout, one reading per row.
 * No outer background; each reading has its own transparent container.
 * Speed, Elevation, Compass: square containers (same size). Threat, Engagement: bar containers (same size).
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { SpeedGauge } from '@components/gauges/SpeedGauge';
import { ElevationChart } from '@components/gauges/ElevationChart';
import { CompassSpeedGauge } from '@components/gauges/CompassSpeedGauge';
import { ThreatMeter } from '@components/gauges/ThreatMeter';
import { EngagementProbability } from '@components/gauges/EngagementProbability';
import { calculateDistance } from '../../utils/calculations';
import type { IDrone } from '@td3/shared-types';

const SQUARE_SIZE = 180;
const BAR_CONTAINER_HEIGHT = 72;

const containerStyle = {
  background: 'rgba(15, 25, 41, 0.4)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(14, 165, 233, 0.3)',
  borderRadius: 8,
};

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
      className="absolute bottom-4 left-4 z-[600] pointer-events-auto flex flex-col gap-2"
    >
      {/* Speed – square container */}
      <div
        className="flex flex-col items-center justify-center p-2"
        style={{ ...containerStyle, width: SQUARE_SIZE, height: SQUARE_SIZE }}
      >
        <SpeedGauge value={drone.speed} />
      </div>

      {/* Elevation – square container */}
      <div
        className="flex flex-col items-center justify-center p-2"
        style={{ ...containerStyle, width: SQUARE_SIZE, height: SQUARE_SIZE }}
      >
        <ElevationChart
          platformPosition={platformPosition}
          dronePosition={drone.position}
        />
      </div>

      {/* Compass – square container */}
      <div
        className="flex flex-col items-center justify-center p-2"
        style={{ ...containerStyle, width: SQUARE_SIZE, height: SQUARE_SIZE }}
      >
        <CompassSpeedGauge heading={drone.heading} speed={drone.speed} />
      </div>

      {/* Threat – bar container */}
      <div
        className="flex flex-col items-center justify-center p-2"
        style={{ ...containerStyle, width: SQUARE_SIZE, height: BAR_CONTAINER_HEIGHT }}
      >
        <ThreatMeter value={drone.threatLevel ?? 0} />
      </div>

      {/* Engagement Probability – bar container */}
      <div
        className="flex flex-col items-center justify-center p-2"
        style={{ ...containerStyle, width: SQUARE_SIZE, height: BAR_CONTAINER_HEIGHT }}
      >
        <EngagementProbability distanceMeters={distanceMeters} />
      </div>
    </div>
  );

  return createPortal(overlay, map.getContainer());
};
