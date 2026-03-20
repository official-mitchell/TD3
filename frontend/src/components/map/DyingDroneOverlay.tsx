/**
 * Renders ☠️ at exact lat/lng using map pixel coordinates.
 * Uses useMap + latLngToContainerPoint for pixel-accurate placement (avoids Marker/divIcon drift).
 */
import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useDroneStore } from '../../store/droneStore';
const SKULL_SIZE = 48;

export const DyingDroneOverlay: React.FC = () => {
  const map = useMap();
  const dyingDrones = useDroneStore((s) => s.dyingDrones);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const updatePositions = () => {
      const next = new Map<string, { x: number; y: number }>();
      for (const drone of dyingDrones.values()) {
        const { lat, lng } = drone.position;
        if (typeof lat !== 'number' || typeof lng !== 'number') continue;
        const point = map.latLngToContainerPoint([lat, lng]);
        next.set(drone.droneId, { x: point.x, y: point.y });
      }
      setPositions(next);
    };

    updatePositions();
    map.on('moveend zoomend resize', updatePositions);
    return () => {
      map.off('moveend zoomend resize', updatePositions);
    };
  }, [map, dyingDrones]);

  const list = Array.from(dyingDrones.values());

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000]" aria-hidden>
      {list.map((drone) => {
        const px = positions.get(drone.droneId);
        if (!px) return null;
        return (
          <div
            key={`dying-${drone.droneId}`}
            className="dying-skull-overlay absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: px.x,
              top: px.y,
              width: SKULL_SIZE,
              height: SKULL_SIZE,
              fontSize: SKULL_SIZE,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
              animation: 'drone-float-to-heaven 3s ease-out forwards',
            }}
          >
            ☠️
          </div>
        );
      })}
    </div>
  );
};
