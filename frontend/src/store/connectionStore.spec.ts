/**
 * Connection store tests. Per Implementation Plan 16.2.5.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from './connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'Offline', lastHeartbeat: null });
  });

  it('recordHeartbeat sets lastHeartbeat to a number and sets status to Connected', () => {
    useConnectionStore.getState().recordHeartbeat();
    const state = useConnectionStore.getState();
    expect(typeof state.lastHeartbeat).toBe('number');
    expect(state.status).toBe('Connected');
  });

  it('setStatus updates the status', () => {
    useConnectionStore.getState().setStatus('Offline');
    expect(useConnectionStore.getState().status).toBe('Offline');
    useConnectionStore.getState().setStatus('Degraded');
    expect(useConnectionStore.getState().status).toBe('Degraded');
  });
});
