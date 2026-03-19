/**
 * TargetPanel tests. Per Implementation Plan 9.1–9.3, 12.6.
 */
import { beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TargetPanel } from './TargetPanel';
import { useDroneStore } from '../../store/droneStore';
import { calculateDistance } from '../../utils/calculations';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import type { IWeaponPlatform, IDrone } from '@td3/shared-types';

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
  status: 'Engagement Ready',
  position: { lat: 37.78, lng: -122.42, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 0.5,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

describe('TargetPanel', () => {
  beforeEach(() => {
    usePlatformStore.setState({ platform: null });
    useDroneStore.setState({ drones: new Map() });
    useTargetStore.setState({ selectedDroneId: null });
  });

  it('9.2.2: shows select-a-target hint when targets exist but none selected', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })]]),
    });
    render(<TargetPanel />);
    expect(screen.getByText(/Select a target from the list above/)).toBeTruthy();
  });

  it('9.1.1: renders empty list when platform is null', () => {
    render(<TargetPanel />);
    expect(screen.getByText(/No targets/)).toBeTruthy();
  });

  it('9.1.2: clicking a card selects it and hides select hint', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })]]),
    });
    render(<TargetPanel />);

    expect(screen.getByText('D1')).toBeTruthy();
    fireEvent.click(screen.getByText('D1'));

    expect(useTargetStore.getState().selectedDroneId).toBe('D1');
    expect(screen.queryByText(/Select a target from the list above/)).toBeNull();
  });

  it('9.2.3: select hint hidden when target selected (detail in TelemetryOverlay on map)', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })]]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<TargetPanel />);

    expect(screen.queryByText(/Select a target from the list above/)).toBeNull();
  });

  describe('9.3 Acceptance criteria', () => {
    it('9.3.1: target list shows only Confirmed and Engagement Ready drones', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      useDroneStore.setState({
        drones: new Map([
          ['D1', createDrone({ droneId: 'D1', status: 'Detected' })],
          ['D2', createDrone({ droneId: 'D2', status: 'Identified' })],
          ['D3', createDrone({ droneId: 'D3', status: 'Confirmed' })],
          ['D4', createDrone({ droneId: 'D4', status: 'Engagement Ready' })],
        ]),
      });
      render(<TargetPanel />);

      expect(screen.queryByText('D1')).toBeNull();
      expect(screen.queryByText('D2')).toBeNull();
      expect(screen.getByText('D3')).toBeTruthy();
      expect(screen.getByText('D4')).toBeTruthy();
    });

    it('9.3.2: cards are sorted by distance and numbered correctly', () => {
      const platformPos = PLATFORM.position;
      usePlatformStore.setState({ platform: PLATFORM });
      useDroneStore.setState({
        drones: new Map([
          ['FAR', createDrone({ droneId: 'FAR', status: 'Engagement Ready', position: { lat: 37.9, lng: -122.5, altitude: 100 } })],
          ['NEAR', createDrone({ droneId: 'NEAR', status: 'Engagement Ready', position: { lat: 37.775, lng: -122.42, altitude: 100 } })],
        ]),
      });
      render(<TargetPanel />);

      const nearDist = calculateDistance(platformPos, { lat: 37.775, lng: -122.42 });
      const farDist = calculateDistance(platformPos, { lat: 37.9, lng: -122.5 });
      expect(nearDist).toBeLessThan(farDist);

      const cards = screen.getAllByText(/NEAR|FAR/);
      const nearIdx = cards.findIndex((el) => el.textContent === 'NEAR');
      const farIdx = cards.findIndex((el) => el.textContent === 'FAR');
      expect(nearIdx).toBeGreaterThanOrEqual(0);
      expect(farIdx).toBeGreaterThanOrEqual(0);
      expect(nearIdx).toBeLessThan(farIdx);
    });

    it('9.3.3: clicking a card highlights it with blue border and selects target', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      useDroneStore.setState({
        drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })]]),
      });
      render(<TargetPanel />);

      const card = screen.getByText('D1').closest('div[class*="cursor-pointer"]');
      expect(card).toBeTruthy();
      fireEvent.click(card!);

      expect(card?.className).toContain('border-[#1E90FF]');
      expect(useTargetStore.getState().selectedDroneId).toBe('D1');
    });

    it('9.3.4: selection persists when drone data updates in real-time', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      useDroneStore.setState({
        drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready', speed: 50, position: { lat: 37.78, lng: -122.42, altitude: 100 } })]]),
      });
      useTargetStore.setState({ selectedDroneId: 'D1' });
      const { rerender } = render(<TargetPanel />);

      act(() => {
        useDroneStore.getState().updateDrone(
          createDrone({ droneId: 'D1', status: 'Engagement Ready', speed: 120, position: { lat: 37.78, lng: -122.42, altitude: 200 } })
        );
      });
      rerender(<TargetPanel />);

      expect(useTargetStore.getState().selectedDroneId).toBe('D1');
      expect(screen.queryByText(/Select a target from the list above/)).toBeNull();
    });

    it('9.3.5: when selected drone destroyed, shows select hint (target lost)', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      useDroneStore.setState({
        drones: new Map([
          ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })],
          ['D2', createDrone({ droneId: 'D2', status: 'Engagement Ready', position: { lat: 37.79, lng: -122.43, altitude: 100 } })],
        ]),
      });
      useTargetStore.setState({ selectedDroneId: 'D1' });
      render(<TargetPanel />);

      act(() => {
        useDroneStore.getState().removeDrone('D1');
      });

      expect(screen.getByText(/Select a target from the list above/)).toBeTruthy();
      expect(useTargetStore.getState().selectedDroneId).toBe('D1');
    });
  });

  describe('Layout and formatting', () => {
    it('PriorityTargetList cards format altitude and speed (gauges in TelemetryOverlay)', () => {
      usePlatformStore.setState({ platform: PLATFORM });
      useDroneStore.setState({
        drones: new Map([
          [
            'D1',
            createDrone({
              droneId: 'D1',
              status: 'Engagement Ready',
              speed: 0.0482954164347,
              position: { lat: 37.78, lng: -122.42, altitude: 119.93774470937251 },
            }),
          ],
        ]),
      });
      render(<TargetPanel />);
      expect(screen.getByText(/119\.9m/)).toBeTruthy();
      expect(screen.getByText(/0 km\/h/)).toBeTruthy();
    });
  });
});
