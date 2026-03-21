/**
 * Engagement probability formula. Extracted from socket-service for unit testing.
 * Per Implementation Plan 16.1.2.
 * Formula: baseHitProbability = 0.85 * rangeFactor * (1 - speedPenalty * 0.3)
 * where rangeFactor = max(0, 1 - distanceM/2000), speedPenalty = speed/500.
 * Final hitProbability = baseHitProbability * 0.55.
 */
export function calculateHitProbability(distanceM: number, speedKmh: number): number {
  const rangeFactor = Math.max(0, 1 - distanceM / 2000);
  const speedPenalty = speedKmh / 500;
  const baseHitProbability = Math.min(
    1,
    Math.max(0, 0.85 * rangeFactor * (1 - speedPenalty * 0.3))
  );
  return baseHitProbability * 0.55;
}
