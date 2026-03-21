/**
 * Engagement probability formula tests. Per Implementation Plan 16.1.2.
 */
import { calculateHitProbability } from './engagementProbability';

describe('engagement probability formula', () => {
  it('drone at 0m distance returns probability close to 0.85 * 0.55', () => {
    const p = calculateHitProbability(0, 50);
    expect(p).toBeCloseTo(0.85 * 0.55 * (1 - (50 / 500) * 0.3), 5);
    expect(p).toBeGreaterThan(0.4);
    expect(p).toBeLessThan(0.5);
  });

  it('drone at exactly 2000m distance returns probability of 0', () => {
    const p = calculateHitProbability(2000, 50);
    expect(p).toBe(0);
  });

  it('fast drone (250 km/h) returns lower probability than slow drone (50 km/h) at same distance', () => {
    const distance = 500;
    const pSlow = calculateHitProbability(distance, 50);
    const pFast = calculateHitProbability(distance, 250);
    expect(pFast).toBeLessThan(pSlow);
  });

  it('probability never exceeds 1.0', () => {
    const p = calculateHitProbability(0, 0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('probability never drops below 0.0', () => {
    const p = calculateHitProbability(3000, 500);
    expect(p).toBeGreaterThanOrEqual(0);
  });
});
