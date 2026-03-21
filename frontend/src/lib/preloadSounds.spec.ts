/**
 * preloadSounds tests. Validates sound preloading resolves.
 * Uses vi.stubGlobal to mock Audio for fast resolution in test env.
 */
import { vi, beforeEach } from 'vitest';
import { preloadSounds } from './preloadSounds';

describe('preloadSounds', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(() => {
        const listeners: Record<string, () => void> = {};
        return {
          addEventListener: vi.fn((ev: string, cb: () => void) => {
            listeners[ev] = cb;
            if (ev === 'canplaythrough') queueMicrotask(() => cb());
          }),
          removeEventListener: vi.fn((ev: string) => delete listeners[ev]),
          load: vi.fn(),
        };
      })
    );
  });

  it('resolves without error', async () => {
    await expect(preloadSounds()).resolves.toBeUndefined();
  });
});
