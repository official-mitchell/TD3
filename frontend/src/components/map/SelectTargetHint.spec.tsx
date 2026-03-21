/**
 * SelectTargetHint tests. Validates single message when no target selected.
 */
import { beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SelectTargetHint } from './SelectTargetHint';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import type { IWeaponPlatform, IDrone } from '@td3/shared-types';

const createDrone = (overrides: Partial<IDrone> = {}): IDrone => ({
  droneId: 'D1',
  droneType: 'Quadcopter',
  status: 'Engagement Ready',
  position: { lat: 37.78, lng: -122.42, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 0.5,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

const PLATFORM: IWeaponPlatform = {
  position: { lat: 37.7749, lng: -122.4194 },
  heading: 0,
  isActive: true,
  ammoCount: 100,
  killCount: 0,
};

describe('SelectTargetHint', () => {
  beforeEach(() => {
    useTargetStore.setState({ selectedDroneId: null });
    usePlatformStore.setState({ platform: null });
    useDroneStore.setState({ drones: new Map() });
  });

  it('shows create-targets message when no targets exist', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    render(<SelectTargetHint />);
    expect(screen.getByTestId('select-target-hint')).toBeTruthy();
    expect(screen.getByText(/Tap Create Targets to spawn test drones/)).toBeTruthy();
  });

  it('shows select-target message when targets exist but none selected', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })]]),
    });
    render(<SelectTargetHint />);
    expect(screen.getByTestId('select-target-hint')).toBeTruthy();
    expect(screen.getByText(/Select a target: tap a drone on the map/)).toBeTruthy();
  });

  it('hides when target is selected', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })]]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<SelectTargetHint />);
    expect(screen.queryByTestId('select-target-hint')).toBeNull();
  });
});
