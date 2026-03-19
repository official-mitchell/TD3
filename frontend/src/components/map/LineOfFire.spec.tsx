/**
 * LineOfFire tests. Per Implementation Plan 7.8.4.
 * Added: textRotation never returns upside-down rotation (7.6).
 */
import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineOfFire, textRotation } from './LineOfFire';
import type { IWeaponPlatform, IDrone } from '@td3/shared-types';

vi.mock('react-leaflet', () => ({
  Polyline: ({ positions, children }: { positions: [number, number][]; children?: React.ReactNode }) => (
    <div data-testid="line-of-fire" data-positions={JSON.stringify(positions)}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children?: React.ReactNode }) => <span data-testid="line-tooltip">{children}</span>,
}));

const PLATFORM: IWeaponPlatform = {
  position: { lat: 37.7749, lng: -122.4194 },
  heading: 0,
  isActive: true,
  ammoCount: 300,
  killCount: 0,
};

const DRONE: IDrone = {
  droneId: 'DRONE-001',
  droneType: 'Quadcopter',
  status: 'Detected',
  position: { lat: 37.78, lng: -122.42, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 0.5,
  lastUpdated: new Date().toISOString(),
};

describe('LineOfFire', () => {
  it('7.8.4: renders polyline from platform to target when targetDrone exists', () => {
    render(<LineOfFire platform={PLATFORM} targetDrone={DRONE} />);
    const polyline = screen.getByTestId('line-of-fire');
    expect(polyline).toBeTruthy();
    const positions = JSON.parse(polyline.getAttribute('data-positions') ?? '[]');
    expect(positions).toEqual([
      [37.7749, -122.4194],
      [37.78, -122.42],
    ]);
  });

  it('7.6.3: renders nothing when targetDrone is null', () => {
    render(<LineOfFire platform={PLATFORM} targetDrone={null} />);
    expect(screen.queryByTestId('line-of-fire')).toBeNull();
  });

  it('7.6: textRotation parallel to line, never upside down (rotation in [0,90] or [270,360))', () => {
    for (let bearing = 0; bearing < 360; bearing += 15) {
      const rotation = textRotation(bearing);
      expect(rotation).toBeGreaterThanOrEqual(0);
      expect(rotation).toBeLessThan(360);
      const upsideDown = rotation > 90 && rotation < 270;
      expect(upsideDown).toBe(false);
    }
    expect(textRotation(0)).toBe(90);
    expect(textRotation(90)).toBe(0);
    expect(textRotation(180)).toBe(270);
    expect(textRotation(270)).toBe(0);
  });
});
