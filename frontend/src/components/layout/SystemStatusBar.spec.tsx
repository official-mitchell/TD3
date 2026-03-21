/**
 * System status bar tests. Per Implementation Plan Presentation 4.6.
 * 4.6.1: TELEMETRY AGE amber/red with fake timers. 4.6.2: TRACKING MODE AUTO→MANUAL on nextTarget.
 * 4.6.3: ACTIVE TARGETS decrements on removeDrone. 4.6.4: Status bar visible in SystemsView.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { td3Theme } from '../../theme';
import { SystemStatusBar } from './SystemStatusBar';
import { useConnectionStore } from '../../store/connectionStore';
import { useDroneStore } from '../../store/droneStore';
import { useTargetStore } from '../../store/targetStore';
import { usePlatformStore } from '../../store/platformStore';
import type { IDrone } from '@td3/shared-types';
import { SystemsView } from '../../views/SystemsView';

const mockUseMediaQuery = vi.fn(() => false);
vi.mock('@mui/material/useMediaQuery', () => ({ default: (q: string) => mockUseMediaQuery(q) }));
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));

function renderBar() {
  return render(
    <ThemeProvider theme={td3Theme}>
      <SystemStatusBar />
    </ThemeProvider>
  );
}

const mockDrone = (id: string, status: IDrone['status'] = 'Engagement Ready'): IDrone => ({
  droneId: id,
  droneType: 'Quadcopter',
  status,
  position: { lat: 25.9, lng: 51.5, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 5,
  lastUpdated: new Date().toISOString(),
});

describe('SystemStatusBar 4.6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMediaQuery.mockReturnValue(false);
    useConnectionStore.setState({ status: 'Connected' });
    useDroneStore.setState({ drones: new Map(), lastUpdateAt: Date.now() });
    useTargetStore.setState({ selectionMode: 'auto', selectedDroneId: null });
    usePlatformStore.setState({ platform: { position: { lat: 25.9, lng: 51.5 }, heading: 0, isActive: true, ammoCount: 300, killCount: 0 } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('4.6.1: TELEMETRY AGE turns amber after 3s, red after 8s when lastUpdateAt is stale', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    useDroneStore.setState({ lastUpdateAt: now - 4000 });

    renderBar();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    const bar = screen.getByTestId('system-status-bar');
    const telemetryChip = bar.querySelector('[title="Telemetry age"]');
    expect(telemetryChip).toBeTruthy();
    expect(telemetryChip?.className).toContain('text-[#FF9800]');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    const barAfter = screen.getByTestId('system-status-bar');
    const telemetryAfter = barAfter.querySelector('[title="Telemetry age"]');
    expect(telemetryAfter?.className).toContain('text-[#f44336]');
  });

  it('4.6.2: TRACKING MODE chip changes from AUTO to MANUAL OVERRIDE on nextTarget', () => {
    useDroneStore.setState({
      drones: new Map([
        ['D1', mockDrone('D1')],
        ['D2', mockDrone('D2')],
      ]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });

    renderBar();
    expect(screen.getByText(/AUTO/i)).toBeTruthy();

    act(() => {
      useTargetStore.getState().nextTarget(['D1', 'D2']);
    });
    expect(screen.getByText(/MANUAL OVERRIDE/i)).toBeTruthy();
  });

  it('4.6.3: ACTIVE TARGETS count decrements when drone is destroyed', () => {
    const drones = new Map<string, IDrone>([
      ['D1', mockDrone('D1')],
      ['D2', mockDrone('D2')],
      ['D3', mockDrone('D3')],
    ]);
    useDroneStore.setState({ drones });

    renderBar();
    expect(screen.getByTitle('Active targets').textContent).toMatch(/3/);

    act(() => {
      useDroneStore.getState().removeDrone('D2');
    });
    expect(screen.getByTitle('Active targets').textContent).toMatch(/2/);
  });

  it('4.6.4: Status bar is visible and correct while in Systems View mode', () => {
    render(
      <ThemeProvider theme={td3Theme}>
        <SystemsView />
      </ThemeProvider>
    );
    const bar = screen.getByTestId('system-status-bar');
    expect(bar).toBeTruthy();
    expect(bar.textContent).toMatch(/WS CONNECTION|WS/);
    expect(bar.textContent).toMatch(/TELEMETRY AGE|TEL/);
    expect(bar.textContent).toMatch(/AUTO|MANUAL/);
    expect(bar.textContent).toMatch(/ACTIVE/);
    expect(bar.textContent).toMatch(/AMMO/);
  });
});
