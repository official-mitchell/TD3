/**
 * Status progression logic tests. Per Implementation Plan 16.1.3.
 * Logic: Detected + distance<5km + ms>=6000 -> Identified;
 *        Identified + threat>0.5 + distance<3km -> Confirmed;
 *        Confirmed + distance<2km -> Engagement Ready.
 * Drone at 4000m never advances past Identified.
 */
import type { DroneStatus } from '@td3/shared-types';

function getNextStatus(
  current: DroneStatus,
  distanceM: number,
  msWithin5km: number,
  threatLevel: number
): DroneStatus {
  if (current === 'Detected' && distanceM < 5000 && msWithin5km >= 6000) {
    return 'Identified';
  }
  if (current === 'Identified' && threatLevel > 0.5 && distanceM < 3000) {
    return 'Confirmed';
  }
  if (current === 'Confirmed' && distanceM < 2000) {
    return 'Engagement Ready';
  }
  return current;
}

describe('status progression logic', () => {
  it('drone at 1500m with threatLevel > 0.5 and Confirmed status advances to Engagement Ready', () => {
    const next = getNextStatus('Confirmed', 1500, 10000, 0.6);
    expect(next).toBe('Engagement Ready');
  });

  it('drone at 4000m does not advance past Identified regardless of elapsed ticks', () => {
    const next = getNextStatus('Identified', 4000, 10000, 0.8);
    expect(next).toBe('Identified');
  });

  it('Detected at 4000m stays Detected (outside 5km)', () => {
    const next = getNextStatus('Detected', 4000, 10000, 0.5);
    expect(next).toBe('Detected');
  });

  it('Detected at 3000m with msWithin5km 6000 advances to Identified', () => {
    const next = getNextStatus('Detected', 3000, 6000, 0.5);
    expect(next).toBe('Identified');
  });

  it('Identified at 2500m with threat 0.6 advances to Confirmed', () => {
    const next = getNextStatus('Identified', 2500, 10000, 0.6);
    expect(next).toBe('Confirmed');
  });
});
