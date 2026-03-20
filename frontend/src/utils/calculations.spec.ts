/**
 * Unit tests for movement math. Verifies realistic direction and distance.
 * destinationPoint + calculateBearing + calculateDistance must be consistent.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateBearing,
  destinationPoint,
} from './calculations';

describe('calculations — realistic drone movement', () => {
  const RAS_LAFFAN = { lat: 25.905310475056915, lng: 51.543824178558054 };

  it('destinationPoint: moving 100m at 0° (N) increases lat, same lng', () => {
    const end = destinationPoint(RAS_LAFFAN, 0, 100);
    expect(end.lat).toBeGreaterThan(RAS_LAFFAN.lat);
    expect(Math.abs(end.lng - RAS_LAFFAN.lng)).toBeLessThan(0.0001);
    const dist = calculateDistance(RAS_LAFFAN, end);
    expect(dist).toBeCloseTo(100, 0);
  });

  it('destinationPoint: moving 500m at 90° (E) increases lng, same lat', () => {
    const end = destinationPoint(RAS_LAFFAN, 90, 500);
    expect(end.lng).toBeGreaterThan(RAS_LAFFAN.lng);
    expect(Math.abs(end.lat - RAS_LAFFAN.lat)).toBeLessThan(0.0001);
    const dist = calculateDistance(RAS_LAFFAN, end);
    expect(dist).toBeCloseTo(500, 0);
  });

  it('position delta direction matches heading: 100 km/h for 1s ≈ 27.78m', () => {
    const speedKmh = 100;
    const dtSec = 1;
    const moveM = (speedKmh * 1000 * dtSec) / 3600;
    expect(moveM).toBeCloseTo(27.78, 1);

    const heading = 45;
    const end = destinationPoint(RAS_LAFFAN, heading, moveM);
    const dist = calculateDistance(RAS_LAFFAN, end);
    expect(dist).toBeCloseTo(moveM, 0);

    const { degrees: actualBearing } = calculateBearing(RAS_LAFFAN, end);
    expect(Math.abs(actualBearing - heading)).toBeLessThan(1);
  });

  it('trail of positions forms straight line when heading constant', () => {
    const start = { ...RAS_LAFFAN };
    const heading = 180;
    const speedKmh = 120;
    const dtMs = 16;
    const moveM = (speedKmh * 1000 * dtMs) / 3600000;

    const points = [start];
    let current = start;
    for (let i = 0; i < 10; i++) {
      const next = destinationPoint(current, heading, moveM);
      points.push(next);
      current = next;
    }

    for (let i = 1; i < points.length; i++) {
      const { degrees: bearing } = calculateBearing(points[i - 1], points[i]);
      expect(Math.abs(bearing - heading)).toBeLessThan(2);
    }
  });
});
