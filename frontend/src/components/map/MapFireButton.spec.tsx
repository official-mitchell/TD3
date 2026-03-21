/**
 * MapFireButton tests. Per Frontend Fixes 695–698.
 */
import { vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MapFireButton } from './MapFireButton';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { useTracerStore } from '../../store/tracerStore';
import type { IWeaponPlatform, IDrone } from '@td3/shared-types';

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
vi.mock('../../lib/socketRef', () => ({
  getSocket: vi.fn(() => ({ emit: mockEmit, on: mockOn, off: mockOff })),
}));
vi.mock('../../lib/sounds', () => ({
  playFireSound: vi.fn(),
  playRichochetSounds: vi.fn(),
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

describe('MapFireButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlatformStore.setState({ platform: null, currentTurretHeading: 0 });
    useDroneStore.setState({ drones: new Map() });
    useTargetStore.setState({ selectedDroneId: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders centered at bottom with shortcut label', () => {
    render(<MapFireButton />);
    expect(screen.getByTestId('map-fire-button')).toBeTruthy();
    expect(screen.getByText(/⌘↵|Ctrl\+↵/)).toBeTruthy();
  });

  it('has mobile bottom padding (pb-10) for viewport visibility', () => {
    render(<MapFireButton />);
    const container = screen.getByTestId('map-fire-button');
    expect(container.className).toMatch(/pb-10/);
    expect(container.className).toMatch(/sm:pb-2/);
  });

  it('FIRE disabled and labeled NO TARGET with no Engagement Ready drone', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Detected' })]]),
    });
    render(<MapFireButton />);
    const fireBtn = screen.getByRole('button', { name: /NO TARGET/ });
    expect(fireBtn).toBeTruthy();
    expect((fireBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows explanation when selected drone is not Engagement Ready', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['D1', createDrone({ droneId: 'D1', status: 'Confirmed' })]]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    expect(screen.getByText('Target must be Engagement Ready')).toBeTruthy();
  });

  it('shows altitude too high when drone altitude exceeds max', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([
        ['D1', createDrone({ droneId: 'D1', status: 'Confirmed', position: { lat: 37.78, lng: -122.42, altitude: 600 } })],
      ]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    expect(screen.getByText('Altitude too high')).toBeTruthy();
  });

  it('shows both reasons when altitude too high and friendly', () => {
    const drone = createDrone({
      droneId: 'D1',
      status: 'Confirmed',
      position: { lat: 37.78, lng: -122.42, altitude: 600 },
    });
    (drone as IDrone & { isFriendly?: boolean }).isFriendly = true;
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({ drones: new Map([['D1', drone]]) });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    expect(screen.getByText(/Altitude too high/)).toBeTruthy();
    expect(screen.getByText(/Friendly drone/)).toBeTruthy();
  });

  it('FIRE activates immediately when drone is Engagement Ready', () => {
    usePlatformStore.setState({ platform: PLATFORM, currentTurretHeading: 0 });
    useDroneStore.setState({
      drones: new Map([
        ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready', position: { lat: 37.78, lng: -122.4194, altitude: 100 } })],
      ]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    const fireBtn = screen.getByRole('button', { name: /FIRE/ });
    expect(fireBtn).toBeTruthy();
    expect((fireBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('ENGAGING resets when user changes target (not stuck)', () => {
    usePlatformStore.setState({ platform: PLATFORM, currentTurretHeading: 0 });
    useDroneStore.setState({
      drones: new Map([
        ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready', position: { lat: 37.78, lng: -122.4194, altitude: 100 } })],
        ['D2', createDrone({ droneId: 'D2', status: 'Engagement Ready', position: { lat: 37.79, lng: -122.4194, altitude: 100 } })],
      ]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    const fireBtn = screen.getByRole('button', { name: /FIRE/ });
    fireEvent.click(fireBtn);

    expect(screen.getByText('Firing')).toBeTruthy();

    act(() => {
      useTargetStore.setState({ selectedDroneId: 'D2' });
    });

    expect(screen.queryByText('Firing')).toBeNull();
    expect(screen.getByText(/FIRE|NO TARGET/)).toBeTruthy();
  });

  it('ENGAGING resets after 2 second burst if target not destroyed', () => {
    vi.useFakeTimers();
    usePlatformStore.setState({ platform: PLATFORM, currentTurretHeading: 0 });
    useDroneStore.setState({
      drones: new Map([
        ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready', position: { lat: 37.78, lng: -122.4194, altitude: 100 } })],
      ]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    const fireBtn = screen.getByRole('button', { name: /FIRE/ });
    fireEvent.click(fireBtn);

    expect(screen.getByText('Firing')).toBeTruthy();

    act(() => { vi.advanceTimersByTime(2000); });

    expect(screen.queryByText('Firing')).toBeNull();
    expect(screen.getByText(/FIRE/)).toBeTruthy();
  });

  it('16.3.4: FIRE enabled when target within engagement cone', () => {
    const platformPos = PLATFORM.position;
    usePlatformStore.setState({
      platform: PLATFORM,
      currentTurretHeading: 90,
    });
    // Drone at bearing ~90° (E) — within ±4° cone. Platform 37.77,-122.42; 0.01 lng E ≈ bearing 90
    const droneInCone = createDrone({
      droneId: 'D1',
      status: 'Engagement Ready',
      position: { lat: platformPos.lat, lng: platformPos.lng + 0.01, altitude: 100 },
    });
    useDroneStore.setState({ drones: new Map([['D1', droneInCone]]) });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    const fireBtn = screen.getByRole('button', { name: /FIRE/ });
    expect((fireBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('16.3.4: FIRE disabled when target outside engagement cone', () => {
    usePlatformStore.setState({
      platform: PLATFORM,
      currentTurretHeading: 90,
    });
    // Drone at bearing ~180° (S) — outside ±4° cone
    const droneOutOfCone = createDrone({
      droneId: 'D1',
      status: 'Engagement Ready',
      position: { lat: PLATFORM.position.lat - 0.01, lng: PLATFORM.position.lng, altitude: 100 },
    });
    useDroneStore.setState({ drones: new Map([['D1', droneOutOfCone]]) });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    expect(screen.getByText('Align turret to target')).toBeTruthy();
    const btn = screen.getByRole('button', { name: /NO TARGET/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('16.3.5: bullets/tracers fire immediately on click, engagement:fire emitted synchronously', () => {
    usePlatformStore.setState({
      platform: PLATFORM,
      currentTurretHeading: 0,
    });
    const drone = createDrone({
      droneId: 'D1',
      status: 'Engagement Ready',
      position: { lat: PLATFORM.position.lat + 0.01, lng: PLATFORM.position.lng, altitude: 100 },
    });
    useDroneStore.setState({ drones: new Map([['D1', drone]]) });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    const addTracerSpy = vi.spyOn(useTracerStore.getState(), 'addTracer');
    render(<MapFireButton />);
    const fireBtn = screen.getByRole('button', { name: /FIRE/ });
    fireEvent.click(fireBtn);

    expect(mockEmit).toHaveBeenCalledWith('engagement:fire', expect.objectContaining({ droneId: 'D1' }));
    expect(addTracerSpy).toHaveBeenCalled();
    expect(screen.getByText('Firing')).toBeTruthy();
    addTracerSpy.mockRestore();
  });

  it('pressing FIRE emits engagement:fire and shows Firing until drone:destroyed', () => {
    usePlatformStore.setState({ platform: PLATFORM, currentTurretHeading: 0 });
    useDroneStore.setState({
      drones: new Map([
        ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready', position: { lat: 37.78, lng: -122.4194, altitude: 100 } })],
      ]),
    });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapFireButton />);
    const fireBtn = screen.getByRole('button', { name: /FIRE/ });
    fireEvent.click(fireBtn);

    expect(mockEmit).toHaveBeenCalledWith('engagement:fire', expect.objectContaining({ droneId: 'D1' }));
    expect(screen.getByText('Firing')).toBeTruthy();

    const onDestroyed = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'drone:destroyed')?.[1] as (p: { droneId: string }) => void;
    expect(onDestroyed).toBeDefined();
    act(() => {
      onDestroyed?.({ droneId: 'D1' });
    });
    expect(screen.getByText(/FIRE/)).toBeTruthy();
    expect(screen.queryByText('Firing')).toBeNull();
  });
});
