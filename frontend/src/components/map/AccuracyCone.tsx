/**
 * Range accuracy cone. Per Implementation Plan 12a.3.
 * Semi-transparent cone from platform aligned with turret heading.
 * Always follows currentTurretHeading so it swivels in sync with the turret (no flicker).
 */
import React, { useMemo } from 'react';
import { Polygon } from 'react-leaflet';
import { usePlatformStore } from '../../store/platformStore';
import { destinationPoint } from '../../utils/calculations';
import { MINIGUN_STATS } from '../../utils/constants';

const CONE_HALF_ANGLE_DEG = 4;
const INNER_RANGE_M = MINIGUN_STATS.EFFECTIVE_RANGE_M;
const OUTER_RANGE_M = MINIGUN_STATS.MAX_RANGE_M;

export const AccuracyCone: React.FC = () => {
  const platform = usePlatformStore((s) => s.platform);
  const currentTurretHeading = usePlatformStore((s) => s.currentTurretHeading);

  const polygonPositions = useMemo(() => {
    if (!platform?.position) return null;

    const center = platform.position;
    const bearing = currentTurretHeading;

    const leftInner = destinationPoint(center, bearing - CONE_HALF_ANGLE_DEG, INNER_RANGE_M);
    const rightInner = destinationPoint(center, bearing + CONE_HALF_ANGLE_DEG, INNER_RANGE_M);
    const leftOuter = destinationPoint(center, bearing - CONE_HALF_ANGLE_DEG * 2, OUTER_RANGE_M);
    const rightOuter = destinationPoint(center, bearing + CONE_HALF_ANGLE_DEG * 2, OUTER_RANGE_M);

    return [
      [center.lat, center.lng],
      [leftInner.lat, leftInner.lng],
      [leftOuter.lat, leftOuter.lng],
      [rightOuter.lat, rightOuter.lng],
      [rightInner.lat, rightInner.lng],
      [center.lat, center.lng],
    ] as [number, number][];
  }, [platform?.position, currentTurretHeading]);

  if (!polygonPositions || !platform?.position) return null;

  return (
    <Polygon
      positions={polygonPositions}
      pathOptions={{
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.12,
        weight: 1,
        opacity: 0.4,
      }}
    />
  );
};
