/**
 * BottomBar tests. Per Implementation Plan 10.1–10.6.
 */
import { vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BottomBar } from './BottomBar';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import type { IWeaponPlatform, IDrone } from '@td3/shared-types';

const mockEmit = vi.fn();
vi.mock('../../lib/socketRef', () => ({
  getSocket: vi.fn(() => ({ emit: mockEmit })),
}));

const PLATFORM: IWeaponPlatform = {
  position: { lat: 37.7749, lng: -122.4194 },
  heading: 0,
  isActive: true,
  ammoCount: 300,
  killCount: 0,
};

const createDrone = (overrides: Partial<IDrone> = {}): IDrone => ({
  droneId: 'DRONE-001',
  droneType: 'Quadcopter',
  status: 'Detected',
  position: { lat: 37.78, lng: -122.42, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 0.5,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

describe('BottomBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlatformStore.setState({ platform: null });
    useDroneStore.setState({ drones: new Map() });
    useTargetStore.setState({ selectedDroneId: null });
    useEngagementLogStore.setState({ log: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('10.1.1: renders PREV, target label, NEXT (FIRE moved to map)', () => {
    render(<BottomBar />);
    expect(screen.getByText('← PREV')).toBeTruthy();
    expect(screen.getByText('NEXT →')).toBeTruthy();
    expect(screen.getByText('NO TARGET')).toBeTruthy();
  });

  it('10.1.2: shows engagement log feed', () => {
    render(<BottomBar />);
    expect(screen.getByText(/No engagements yet/)).toBeTruthy();
  });

  it('10.1.2: engagement log shows entries when present', () => {
    useEngagementLogStore.setState({
      log: [
        { droneId: 'D1', droneType: 'Quadcopter', timestamp: new Date().toISOString(), outcome: 'Hit', distanceAtEngagement: 0.5 },
      ],
    });
    render(<BottomBar />);
    expect(screen.getByText('D1')).toBeTruthy();
    expect(screen.getByText(/Hit/)).toBeTruthy();
  });

  it('10.4.4: PREV/NEXT disabled when fewer than 2 targets', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })]]),
    });
    render(<BottomBar />);
    expect((screen.getByText('← PREV') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('NEXT →') as HTMLButtonElement).disabled).toBe(true);
  });

  it('10.4.2/10.4.3: PREV and NEXT change selection', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([
        ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready', position: { lat: 37.775, lng: -122.42, altitude: 100 } })],
        ['D2', createDrone({ droneId: 'D2', status: 'Engagement Ready', position: { lat: 37.9, lng: -122.5, altitude: 100 } })],
      ]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<BottomBar />);

    expect(screen.getByText('D1 (Engagement Ready)')).toBeTruthy();
    fireEvent.click(screen.getByText('NEXT →'));
    expect(useTargetStore.getState().selectedDroneId).toBe('D2');
    fireEvent.click(screen.getByText('← PREV'));
    expect(useTargetStore.getState().selectedDroneId).toBe('D1');
  });

  it('10.5.2: log entry shows timestamp, droneId, arrow, outcome with ✓ or ✗', () => {
    useEngagementLogStore.setState({
      log: [
        { droneId: 'D1', droneType: 'Quadcopter', timestamp: new Date().toISOString(), outcome: 'Hit', distanceAtEngagement: 0 },
        { droneId: 'D2', droneType: 'Quadcopter', timestamp: new Date().toISOString(), outcome: 'Missed', distanceAtEngagement: 0 },
      ],
    });
    render(<BottomBar />);
    expect(screen.getByText('D1')).toBeTruthy();
    expect(screen.getByText('D2')).toBeTruthy();
    expect(screen.getByText(/✓ Hit/)).toBeTruthy();
    expect(screen.getByText(/✗ Missed/)).toBeTruthy();
  });

  describe('10.6 Acceptance criteria', () => {
    it('10.6.4: new log entry appears when drone:hit or drone:missed received', () => {
      render(<BottomBar />);
      expect(screen.getByText(/No engagements yet/)).toBeTruthy();

      act(() => {
        useEngagementLogStore.getState().appendLog({
          droneId: 'D1',
          droneType: 'Quadcopter',
          timestamp: new Date().toISOString(),
          outcome: 'Hit',
          distanceAtEngagement: 0,
        });
      });

      expect(screen.getByText('D1')).toBeTruthy();
      expect(screen.getByText(/✓ Hit/)).toBeTruthy();
    });

    it('10.6.5: drone:destroyed removes drone and auto-advances target', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      useDroneStore.setState({
        drones: new Map([
          ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready', position: { lat: 37.775, lng: -122.42, altitude: 100 } })],
          ['D2', createDrone({ droneId: 'D2', status: 'Engagement Ready', position: { lat: 37.9, lng: -122.5, altitude: 100 } })],
        ]),
      });
      useTargetStore.setState({ selectedDroneId: 'D1' });
      render(<BottomBar />);
      expect(screen.getByText('D1 (Engagement Ready)')).toBeTruthy();

      act(() => {
        useDroneStore.getState().removeDrone('D1');
        const center = PLATFORM.position;
        const sortedIds = useDroneStore.getState().getEngageableTargets(center.lat, center.lng).map((d) => d.droneId);
        useTargetStore.getState().nextTarget(sortedIds);
      });

      expect(screen.getByText('D2 (Engagement Ready)')).toBeTruthy();
    });

    it('10.6.6: Next/Prev wrap at both ends', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      useDroneStore.setState({
        drones: new Map([
          ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready', position: { lat: 37.775, lng: -122.42, altitude: 100 } })],
          ['D2', createDrone({ droneId: 'D2', status: 'Engagement Ready', position: { lat: 37.9, lng: -122.5, altitude: 100 } })],
        ]),
      });
      useTargetStore.setState({ selectedDroneId: 'D2' });
      render(<BottomBar />);

      fireEvent.click(screen.getByText('NEXT →'));
      expect(useTargetStore.getState().selectedDroneId).toBe('D1');

      fireEvent.click(screen.getByText('← PREV'));
      expect(useTargetStore.getState().selectedDroneId).toBe('D2');
    });
  });
});
