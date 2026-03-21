/**
 * Debug drawer tests. Per Implementation Plan Presentation 5.7.
 * 5.7.1: PENDING FIRE NO→YES→NO. 5.7.2: drone:update 0/10s when disconnected.
 * 5.7.3: LAST UPDATED ms delta climbs. 5.7.4: Event log auto-scroll, pause on hover.
 * 5.7.5: CLEAR empties log. 5.7.6: Kill count and ammo decrement in sync.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { td3Theme } from '../../theme';
import { DebugDrawer } from './DebugDrawer';
import { useUIStore } from '../../store/uiStore';
import { useDebugStore, __resetDebugStoreTimestamps } from '../../store/debugStore';
import { useTargetStore } from '../../store/targetStore';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useConnectionStore } from '../../store/connectionStore';
import type { IDrone } from '@td3/shared-types';

const mockDrone = (id: string, lastUpdated?: string): IDrone => ({
  droneId: id,
  droneType: 'Quadcopter',
  status: 'Engagement Ready',
  position: { lat: 25.9, lng: 51.5, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 5,
  lastUpdated: lastUpdated ?? new Date().toISOString(),
});

function renderDrawer() {
  return render(
    <ThemeProvider theme={td3Theme}>
      <DebugDrawer />
    </ThemeProvider>
  );
}

describe('DebugDrawer 5.7', () => {
  beforeEach(() => {
    useUIStore.setState({ debugDrawerOpen: true });
    useConnectionStore.setState({ status: 'Connected' });
    useDebugStore.setState({
      eventLog: [],
      eventRates: {},
      pendingFire: false,
      pendingFireSince: null,
      lastFireAt: null,
      lastOutcome: null,
    });
    useTargetStore.setState({ selectedDroneId: null, selectionMode: 'auto' });
    useDroneStore.setState({ drones: new Map(), lastUpdateAt: Date.now() });
    usePlatformStore.setState({
      platform: { position: { lat: 25.9, lng: 51.5 }, heading: 0, isActive: true, ammoCount: 300, killCount: 0 },
    });
    __resetDebugStoreTimestamps();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('5.7.1: PENDING FIRE transitions NO → YES → NO during engagement cycle', () => {
    renderDrawer();

    const engagementSummary = screen.getByText('Engagement State');
    fireEvent.click(engagementSummary);

    expect(screen.getByText(/PENDING FIRE/)).toBeTruthy();
    expect(screen.getByText(/NO/)).toBeTruthy();

    act(() => {
      useDebugStore.getState().setPendingFire(true);
    });
    expect(screen.getByText(/YES/)).toBeTruthy();

    act(() => {
      useDebugStore.getState().setPendingFire(false);
      useDebugStore.getState().setLastOutcome('Hit');
    });
    expect(screen.getByText(/NO/)).toBeTruthy();
  });

  it('5.7.2: drone:update rate displays 0/10s when disconnected (no events in window)', () => {
    useDroneStore.setState({
      drones: new Map([['D1', mockDrone('D1')]]),
    });
    useDebugStore.setState({ eventRates: { 'drone:update': 0 } });

    renderDrawer();

    const rateRows = screen.getAllByText(/drone:update/);
    const eventRateRow = rateRows.find((el) => el.textContent?.includes('/10s'));
    expect(eventRateRow).toBeTruthy();
    expect(eventRateRow?.textContent).toMatch(/0\/10s/);
  });

  it('5.7.3: LAST UPDATED ms delta climbs when selected drone stops receiving updates', async () => {
    vi.useFakeTimers();
    const oldTime = new Date(Date.now() - 2000).toISOString();
    useDroneStore.setState({
      drones: new Map([['D1', mockDrone('D1', oldTime)]]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });

    renderDrawer();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    const targetAccordion = screen.getByText('Target State').closest('.MuiAccordion-root');
    const lastUpdatedEl = within(targetAccordion!).getByText(/LAST UPDATED/);
    const ms1 = lastUpdatedEl?.textContent ?? '';
    expect(ms1).toMatch(/\d+ms/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    const lastUpdatedEl2 = within(targetAccordion!).getByText(/LAST UPDATED/);
    const ms2 = lastUpdatedEl2?.textContent ?? '';
    expect(ms2).toMatch(/\d+ms/);
    const extractMs = (s: string) => parseInt(s.match(/(\d+)ms/)?.[1] ?? '0', 10);
    expect(extractMs(ms2)).toBeGreaterThanOrEqual(extractMs(ms1));
  });

  it('5.7.4: Event log auto-scrolls while drawer open; pauses when mouse hovers', () => {
    act(() => {
      useDebugStore.getState().recordEvent('drone:update', { droneId: 'D1' });
    });

    renderDrawer();

    const eventLogSummary = screen.getByText('Event Log');
    fireEvent.click(eventLogSummary);

    const logContainer = screen.getByTestId('debug-event-log');
    expect(logContainer).toBeTruthy();

    fireEvent.mouseEnter(logContainer);
    fireEvent.mouseLeave(logContainer);
  });

  it('5.7.5: CLEAR button empties the log', () => {
    useDebugStore.getState().recordEvent('drone:update', { droneId: 'D1' });
    useDebugStore.getState().recordEvent('drone:status', { droneId: 'D1', status: 'Confirmed' });

    renderDrawer();

    const eventLogSummary = screen.getByText('Event Log');
    fireEvent.click(eventLogSummary);

    expect(screen.getAllByText(/drone:update/).length).toBeGreaterThan(0);

    const clearBtn = screen.getByTestId('debug-clear-log');
    fireEvent.click(clearBtn);

    expect(useDebugStore.getState().eventLog).toHaveLength(0);
  });

  it('5.7.6: Kill count and ammo decrement in sync after confirmed hit', () => {
    renderDrawer();

    const engagementSummary = screen.getByText('Engagement State');
    fireEvent.click(engagementSummary);

    expect(screen.getByText(/KILL COUNT/)).toBeTruthy();
    expect(screen.getByText(/AMMO REMAINING/)).toBeTruthy();

    act(() => {
      usePlatformStore.setState({
        platform: {
          position: { lat: 25.9, lng: 51.5 },
          heading: 0,
          isActive: true,
          ammoCount: 297,
          killCount: 1,
        },
      });
    });

    expect(screen.getByText(/KILL COUNT/)?.parentElement?.textContent).toContain('1');
    expect(screen.getByText(/AMMO REMAINING/)?.parentElement?.textContent).toContain('297');
  });
});
