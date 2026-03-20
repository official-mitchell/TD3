/**
 * LogPanel tests. Downed drone UX: skull, auto-collapse, darker container, red drone name.
 */
import { describe, beforeEach, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogPanel } from './LogPanel';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import type { IEngagementRecord } from '@td3/shared-types';

const createRecord = (overrides: Partial<IEngagementRecord> = {}): IEngagementRecord => ({
  droneId: 'DRONE-001',
  droneType: 'Quadcopter',
  timestamp: new Date().toISOString(),
  outcome: 'Hit',
  distanceAtEngagement: 0,
  hitPointsRemaining: 2,
  ...overrides,
});

describe('LogPanel', () => {
  beforeEach(() => {
    useEngagementLogStore.setState({ log: [] });
  });

  it('shows skull icon next to drone title when drone is destroyed', () => {
    useEngagementLogStore.setState({
      log: [
        createRecord({ droneId: 'D1', outcome: 'Destroyed', hitPointsRemaining: 0 }),
      ],
    });
    render(<LogPanel />);
    expect(screen.getByText('D1')).toBeTruthy();
    expect(screen.getByTitle('Destroyed')).toBeTruthy();
    expect(screen.getByText('☠️')).toBeTruthy();
  });

  it('defeated drone section has darker background (bg-slate-900)', () => {
    useEngagementLogStore.setState({
      log: [
        createRecord({ droneId: 'D1', outcome: 'Destroyed', hitPointsRemaining: 0 }),
      ],
    });
    render(<LogPanel />);
    const container = screen.getByText('D1').closest('.rounded-lg');
    expect(container?.className).toContain('bg-slate-900');
  });

  it('defeated drone name has red text', () => {
    useEngagementLogStore.setState({
      log: [
        createRecord({ droneId: 'D1', outcome: 'Destroyed', hitPointsRemaining: 0 }),
      ],
    });
    render(<LogPanel />);
    const nameEl = screen.getByText('D1');
    expect(nameEl.className).toContain('text-red-500');
  });

  it('defeated drone section is collapsed by default', () => {
    useEngagementLogStore.setState({
      log: [
        createRecord({ droneId: 'D1', outcome: 'Destroyed', hitPointsRemaining: 0 }),
      ],
    });
    render(<LogPanel />);
    expect(screen.getByText('Destroyed')).toBeTruthy();
    expect(screen.queryByText('No rounds yet')).toBeNull();
    const expandIcon = screen.getByText('▶');
    expect(expandIcon).toBeTruthy();
  });

  it('shows round count and Destroyed row in engagement list when drone is downed (after expand)', async () => {
    useEngagementLogStore.setState({
      log: [
        createRecord({ droneId: 'D1', outcome: 'Hit', hitPointsRemaining: 1, timestamp: '2024-01-01T10:00:00Z' }),
        createRecord({ droneId: 'D1', outcome: 'Destroyed', hitPointsRemaining: 0, timestamp: '2024-01-01T10:00:01Z' }),
      ],
    });
    render(<LogPanel />);
    fireEvent.click(screen.getByText('D1'));
    expect(screen.getByText(/1 Hit/)).toBeTruthy();
    expect(screen.getByText(/2 ☠️ Destroyed/)).toBeTruthy();
  });

  it('non-defeated drone has no skull and lighter background', () => {
    useEngagementLogStore.setState({
      log: [
        createRecord({ droneId: 'D2', outcome: 'Hit', hitPointsRemaining: 2 }),
      ],
    });
    render(<LogPanel />);
    expect(screen.getByText('D2')).toBeTruthy();
    expect(screen.queryByTitle('Destroyed')).toBeNull();
    const container = screen.getByText('D2').closest('.rounded-lg');
    expect(container?.className).toContain('bg-slate-700');
  });
});
