/**
 * Flight trail overlay. Dotted line showing selected drone's position history.
 * Renders from first recorded position to most recent when drone is selected.
 */
import React from 'react';
import { Polyline } from 'react-leaflet';
import { useDroneStore } from '../../store/droneStore';
import { useTargetStore } from '../../store/targetStore';

const TRAIL_COLOR = '#60a5fa';
const TRAIL_WEIGHT = 2;

export const FlightTrailOverlay: React.FC = () => {
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const droneTrails = useDroneStore((s) => s.droneTrails);

  const trail = selectedDroneId ? (droneTrails.get(selectedDroneId) ?? []) : [];
  if (trail.length < 2) return null;

  const positions: [number, number][] = trail.map((p) => [p.lat, p.lng]);

  return (
    <div data-testid="flight-trail">
      <Polyline
        key={`trail-${selectedDroneId}`}
        positions={positions}
        pathOptions={{
          color: TRAIL_COLOR,
          weight: TRAIL_WEIGHT,
          dashArray: '6 8',
          opacity: 0.8,
        }}
      />
    </div>
  );
};
