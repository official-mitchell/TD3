/**
 * Engagement log store tests. Per Implementation Plan 16.2.4.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useEngagementLogStore } from './engagementLogStore';
import type { IEngagementRecord } from '@td3/shared-types';

const createRecord = (overrides: Partial<IEngagementRecord> = {}): IEngagementRecord => ({
  droneId: 'D1',
  droneType: 'Quadcopter',
  timestamp: new Date().toISOString(),
  outcome: 'Hit',
  distanceAtEngagement: 500,
  ...overrides,
});

describe('engagementLogStore', () => {
  beforeEach(() => {
    useEngagementLogStore.setState({ log: [] });
  });

  it('appendLog prepends the entry', () => {
    useEngagementLogStore.getState().appendLog(createRecord({ droneId: 'D1' }));
    useEngagementLogStore.getState().appendLog(createRecord({ droneId: 'D2' }));
    const log = useEngagementLogStore.getState().log;
    expect(log[0].droneId).toBe('D2');
    expect(log[1].droneId).toBe('D1');
  });

  it('log is trimmed to maximum of 200 entries when entries exceed the cap', () => {
    for (let i = 0; i < 250; i++) {
      useEngagementLogStore.getState().appendLog(createRecord({ droneId: `D${i}` }));
    }
    expect(useEngagementLogStore.getState().log.length).toBe(200);
  });
});
