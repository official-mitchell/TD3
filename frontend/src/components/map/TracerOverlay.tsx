/**
 * Tracer rounds overlay. Per Implementation Plan 12a.1–12a.2.
 * Reads from tracerStore (populated by useSocket on drone:hit/drone:missed).
 * Hits: "+" in bright red. Misses: "×" in muted color. Fade out 1s after firing.
 */
import React, { useEffect } from 'react';
import L from 'leaflet';
import { Polyline, Marker } from 'react-leaflet';
import { useTracerStore } from '../../store/tracerStore';

const HIT_COLOR = '#ef4444';
const MISS_COLOR = '#6b7280';

export const TracerOverlay: React.FC = () => {
  const tracers = useTracerStore((s) => s.tracers);
  const pruneExpired = useTracerStore((s) => s.pruneExpired);

  useEffect(() => {
    const interval = setInterval(pruneExpired, 100);
    return () => clearInterval(interval);
  }, [pruneExpired]);

  if (tracers.length === 0) return null;

  return (
    <>
      {tracers.map((t) => (
        <React.Fragment key={t.id}>
          <Polyline
            positions={[
              [t.startLat, t.startLng],
              [t.endLat, t.endLng],
            ]}
            pathOptions={{
              color: t.outcome === 'Hit' ? HIT_COLOR : MISS_COLOR,
              weight: 2,
              dashArray: '4 6',
              opacity: 0.9,
            }}
          />
          <Marker
            position={[t.endLat, t.endLng]}
            icon={L.divIcon({
              className: 'td3-tracer-marker',
              html: `<div style="
                width:20px;height:20px;display:flex;align-items:center;justify-content:center;
                background:transparent;color:${t.outcome === 'Hit' ? HIT_COLOR : MISS_COLOR};
                font-size:18px;font-weight:bold;text-shadow:0 0 2px rgba(0,0,0,0.8);
              ">${t.outcome === 'Hit' ? '+' : '×'}</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
            zIndexOffset={500}
          />
        </React.Fragment>
      ))}
    </>
  );
};
