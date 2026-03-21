/**
 * Target store tests. Per Implementation Plan 16.2.3.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTargetStore } from './targetStore';

describe('targetStore', () => {
  beforeEach(() => {
    useTargetStore.setState({ selectedDroneId: null });
  });

  it('setSelected stores the droneId', () => {
    useTargetStore.getState().setSelected('D1');
    expect(useTargetStore.getState().selectedDroneId).toBe('D1');
    useTargetStore.getState().setSelected(null);
    expect(useTargetStore.getState().selectedDroneId).toBe(null);
  });

  it('nextTarget advances correctly through a three-item array', () => {
    const ids = ['D1', 'D2', 'D3'];
    useTargetStore.getState().setSelected('D1');
    useTargetStore.getState().nextTarget(ids);
    expect(useTargetStore.getState().selectedDroneId).toBe('D2');
    useTargetStore.getState().nextTarget(ids);
    expect(useTargetStore.getState().selectedDroneId).toBe('D3');
  });

  it('nextTarget wraps from last item to first', () => {
    const ids = ['D1', 'D2', 'D3'];
    useTargetStore.getState().setSelected('D3');
    useTargetStore.getState().nextTarget(ids);
    expect(useTargetStore.getState().selectedDroneId).toBe('D1');
  });

  it('prevTarget wraps from first item to last', () => {
    const ids = ['D1', 'D2', 'D3'];
    useTargetStore.getState().setSelected('D1');
    useTargetStore.getState().prevTarget(ids);
    expect(useTargetStore.getState().selectedDroneId).toBe('D3');
  });
});
