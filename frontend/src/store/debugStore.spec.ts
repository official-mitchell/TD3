/**
 * Debug store tests. Per Implementation Plan Presentation 2.5.
 * 2.5.2: Uses vi.resetModules + dynamic import so setInterval is created under fake timers.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDebugStore, __resetDebugStoreTimestamps } from './debugStore';

describe('debugStore', () => {
  beforeEach(() => {
    useDebugStore.setState({
      eventLog: [],
      eventRates: {},
      pendingFire: false,
      lastOutcome: null,
    });
    __resetDebugStoreTimestamps();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('2.5.1: After 5 drone:update events in 10 seconds, eventRates[drone:update] equals 5', () => {
    vi.useFakeTimers();

    const { recordEvent } = useDebugStore.getState();
    for (let i = 0; i < 5; i++) {
      recordEvent('drone:update', { droneId: `D${i}` });
    }

    expect(useDebugStore.getState().eventRates['drone:update']).toBe(5);
  });

  it('2.5.2: After 11 seconds with no new events, interval prunes rate back toward 0', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const { useDebugStore: store, __resetDebugStoreTimestamps: reset } = await import('./debugStore');
    reset();
    store.setState({ eventLog: [], eventRates: {}, pendingFire: false, lastOutcome: null });

    const { recordEvent } = store.getState();
    recordEvent('drone:update', { droneId: 'D1' });
    recordEvent('drone:update', { droneId: 'D2' });
    expect(store.getState().eventRates['drone:update']).toBe(2);

    await vi.advanceTimersByTimeAsync(11_000);

    expect(store.getState().eventRates['drone:update']).toBe(0);
  });

  it('2.5.3: eventLog never exceeds 50 entries under rapid emission', () => {
    const { recordEvent } = useDebugStore.getState();

    for (let i = 0; i < 60; i++) {
      recordEvent('drone:update', { droneId: `D${i}` });
    }

    expect(useDebugStore.getState().eventLog.length).toBe(50);
  });

  it('2.5.4: pendingFire is true between FIRE emit and drone:hit/drone:missed receipt', () => {
    const { setPendingFire, setLastOutcome } = useDebugStore.getState();

    setPendingFire(true);
    expect(useDebugStore.getState().pendingFire).toBe(true);

    setPendingFire(false);
    setLastOutcome('Hit');
    expect(useDebugStore.getState().pendingFire).toBe(false);
    expect(useDebugStore.getState().lastOutcome).toBe('Hit');
    expect(useDebugStore.getState().lastFireAt).toBeTruthy();

    setPendingFire(true);
    setPendingFire(false);
    setLastOutcome('Missed');
    expect(useDebugStore.getState().pendingFire).toBe(false);
    expect(useDebugStore.getState().lastOutcome).toBe('Missed');
  });
});
