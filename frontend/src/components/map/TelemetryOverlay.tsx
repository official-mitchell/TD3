/**
 * TelemetryOverlay. Target details pinned to top-left of map.
 * Header: drone ID, type, status, distance, bearing. Coordinates in small font below.
 * Speed, Elevation, Compass: square containers. Threat, Engagement: bar containers.
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
import { calculateDistance, calculateBearing } from '../../utils/calculations';
const SQUARE_SIZE = 180;
const BAR_CONTAINER_HEIGHT = 72;

const STATUS_COLORS: Record<string, string> = {
  Detected: '#6B7280',
  Identified: '#EAB308',
  Confirmed: '#F97316',
  'Engagement Ready': '#EF4444',
  Hit: '#374151',
  Destroyed: '#374151',
};

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
  const distKm = distanceMeters / 1000;
  const { degrees, cardinal } = calculateBearing(platformPosition, drone.position);
  const statusColor = STATUS_COLORS[drone.status] ?? '#6B7280';

  const overlay = (
    <div
      data-testid="telemetry-overlay"
      className="absolute top-4 left-4 z-[600] pointer-events-auto flex flex-col gap-2"
    >
      {/* Target header – pinned to top left */}
      <div className="flex flex-col gap-1">
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
          style={{ ...containerStyle, minWidth: SQUARE_SIZE }}
        >
          <span className="font-bold text-[#E8F4FD]">{drone.droneId}</span>
          <span className="text-slate-400">{drone.droneType}</span>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: `${statusColor}33`, color: statusColor }}
          >
            {drone.status}
          </span>
          <span className="text-slate-400">
            {distKm.toFixed(2)}km · {degrees.toFixed(0)}° {cardinal}
          </span>
          {drone.hitPoints != null && (
            <span className="text-amber-400 text-xs font-medium">HP: {drone.hitPoints}</span>
          )}
          {drone.status === 'Engagement Ready' && (
            <span className="text-green-400 text-xs font-medium">✓ IN RANGE</span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 pl-1">
          {drone.position.lat.toFixed(6)}, {drone.position.lng.toFixed(6)}
        </div>
      </div>

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
