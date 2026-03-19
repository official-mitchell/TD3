/**
 * RangeCircles tests. Per Implementation Plan 7.8.5.
 */
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RangeCircles } from './RangeCircles';
import type { IWeaponPlatform } from '@td3/shared-types';

vi.mock('react-leaflet', () => ({
  Circle: ({
    center,
    radius,
    pathOptions,
  }: {
    center: [number, number];
    radius: number;
    pathOptions?: { color?: string; fillColor?: string; fillOpacity?: number; weight?: number; dashArray?: string };
  }) => (
    <div
      data-testid="range-circle"
      data-radius={radius}
      data-lat={center[0]}
      data-lng={center[1]}
      data-color={pathOptions?.color}
      data-fill-opacity={pathOptions?.fillOpacity}
      data-dash-array={pathOptions?.dashArray}
    />
  ),
}));

const PLATFORM: IWeaponPlatform = {
  position: { lat: 37.7749, lng: -122.4194 },
  heading: 0,
  isActive: true,
  ammoCount: 300,
  killCount: 0,
};

describe('RangeCircles', () => {
  it('7.8.5: renders inner 2km circle at platform center', () => {
    render(<RangeCircles platform={PLATFORM} />);
    const circles = screen.getAllByTestId('range-circle');
    const inner = circles.find((c) => c.getAttribute('data-radius') === '2000');
    expect(inner).toBeTruthy();
    expect(inner?.getAttribute('data-lat')).toBe('37.7749');
    expect(inner?.getAttribute('data-lng')).toBe('-122.4194');
    expect(inner?.getAttribute('data-color')).toBe('#00C853');
    expect(inner?.getAttribute('data-fill-opacity')).toBe('0.04');
  });

  it('7.8.5: renders outer 5km circle at platform center', () => {
    render(<RangeCircles platform={PLATFORM} />);
    const circles = screen.getAllByTestId('range-circle');
    const outer = circles.find((c) => c.getAttribute('data-radius') === '5000');
    expect(outer).toBeTruthy();
    expect(outer?.getAttribute('data-lat')).toBe('37.7749');
    expect(outer?.getAttribute('data-lng')).toBe('-122.4194');
    expect(outer?.getAttribute('data-color')).toBe('#FFB300');
    expect(outer?.getAttribute('data-dash-array')).toBe('6 4');
  });
});
