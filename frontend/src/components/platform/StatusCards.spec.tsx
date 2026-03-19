/**
 * StatusCards tests. Per Implementation Plan 8.6 acceptance criteria.
 */
import { vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StatusCards } from './StatusCards';
import { usePlatformStore } from '../../store/platformStore';
import { useConnectionStore } from '../../store/connectionStore';
import { useDroneStore } from '../../store/droneStore';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import type { IWeaponPlatform, IDrone } from '@td3/shared-types';

const PLATFORM: IWeaponPlatform = {
  position: { lat: 37.7749, lng: -122.4194 },
  heading: 317.8,
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

describe('StatusCards', () => {
  beforeEach(() => {
    usePlatformStore.setState({ platform: null });
    useConnectionStore.setState({ status: 'Offline', lastHeartbeat: null });
    useDroneStore.setState({ drones: new Map() });
    useEngagementLogStore.setState({ log: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('8.6.1: All fields populate with real data', () => {
    it('displays all fields when stores are populated', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      useConnectionStore.setState({ status: 'Connected', lastHeartbeat: Date.now() });
      useDroneStore.setState({
        drones: new Map([
          ['D1', createDrone({ droneId: 'D1', status: 'Detected' })],
          ['D2', createDrone({ droneId: 'D2', status: 'Identified' })],
          ['D3', createDrone({ droneId: 'D3', status: 'Engagement Ready' })],
        ]),
      });
      useEngagementLogStore.setState({
        log: [
          {
            droneId: 'D1',
            droneType: 'Quadcopter',
            timestamp: new Date().toISOString(),
            outcome: 'Hit',
            distanceAtEngagement: 0.5,
          },
        ],
      });

      render(<StatusCards />);

      expect(screen.getByText('XM914E1')).toBeTruthy();
      expect(screen.getByText('3rd Marine Brigade')).toBeTruthy();
      expect(screen.getByText('OPERATIONAL')).toBeTruthy();
      expect(screen.getByText(/37\.7749/)).toBeTruthy();
      expect(screen.getByText(/-122\.4194/)).toBeTruthy();
      expect(screen.getByText(/317\.8/)).toBeTruthy();
      expect(screen.getByText(/DETECTED:/)).toBeTruthy();
      expect(screen.getByText(/IDENTIFIED:/)).toBeTruthy();
      expect(screen.getByText(/CONFIRMED:/)).toBeTruthy();
      expect(screen.getByTestId('kills-count').textContent).toBe('0');
      expect(screen.getByTestId('ammo-count').textContent).toBe('300');
      expect(screen.getByTestId('connection-status').textContent).toBe('Connected');
    });
  });

  describe('8.6.2: Offline status and elapsed counter', () => {
    it('shows Offline when status is Offline', () => {
      useConnectionStore.setState({ status: 'Offline', lastHeartbeat: null });
      render(<StatusCards />);
      expect(screen.getByTestId('connection-status').textContent).toBe('Offline');
    });

    it('shows LAST CONTACT when Offline with lastHeartbeat set and elapsed counter increments', () => {
      const fiveSecondsAgo = Date.now() - 5000;
      useConnectionStore.setState({ status: 'Offline', lastHeartbeat: fiveSecondsAgo });
      vi.useFakeTimers();

      render(<StatusCards />);

      expect(screen.getByTestId('connection-status').textContent).toMatch(/LAST CONTACT: \d+s ago/);

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('connection-status').textContent).toMatch(/LAST CONTACT: 6s ago/);

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByTestId('connection-status').textContent).toMatch(/LAST CONTACT: 8s ago/);
    });
  });

  describe('8.6.3: KILLS and AMMO update after drone:hit', () => {
    it('displays updated killCount and ammoCount when platform is updated', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      render(<StatusCards />);

      expect(screen.getByTestId('kills-count').textContent).toBe('0');
      expect(screen.getByTestId('ammo-count').textContent).toBe('300');

      act(() => {
        usePlatformStore.setState({
          platform: {
            ...PLATFORM,
            killCount: 1,
            ammoCount: 297,
          },
        });
      });

      expect(screen.getByTestId('kills-count').textContent).toBe('1');
      expect(screen.getByTestId('ammo-count').textContent).toBe('297');
    });
  });
});
