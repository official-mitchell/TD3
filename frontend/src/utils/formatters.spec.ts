/**
 * Formatters unit tests. Ensures altitude/speed formatting prevents overflow.
 */
import { describe, it, expect } from 'vitest';
import { formatAltitude, formatSpeed } from './formatters';

describe('formatAltitude', () => {
  it('formats integer altitude', () => {
    expect(formatAltitude(100)).toBe('100m');
  });

  it('rounds to 1 decimal to prevent long floats', () => {
    expect(formatAltitude(119.93774470937251)).toBe('119.9m');
  });

  it('handles zero', () => {
    expect(formatAltitude(0)).toBe('0m');
  });
});

describe('formatSpeed', () => {
  it('formats integer speed', () => {
    expect(formatSpeed(50)).toBe('50 km/h');
  });

  it('rounds to 1 decimal to prevent long floats', () => {
    expect(formatSpeed(0.0482954164347)).toBe('0 km/h');
  });

  it('handles small decimal speed', () => {
    expect(formatSpeed(12.34)).toBe('12.3 km/h');
  });
});
