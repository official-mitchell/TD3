/**
 * FlightTrailOverlay tests. Trail renders when drone selected, hidden otherwise.
 */
import { vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlightTrailOverlay } from './FlightTrailOverlay';
import { useDroneStore } from '../../store/droneStore';
import { useTargetStore } from '../../store/targetStore';
import type { TrailPoint } from '../../store/droneStore';

vi.mock('react-leaflet', () => ({
  Polyline: ({ positions }: { positions: [number, number][] }) => (
    <div data-positions={JSON.stringify(positions)} />
  ),
}));

describe('FlightTrailOverlay', () => {
  beforeEach(() => {
    useTargetStore.setState({ selectedDroneId: null });
    useDroneStore.setState({ drones: new Map(), droneTrails: new Map() });
  });

  it('renders nothing when no drone selected', () => {
    render(<FlightTrailOverlay />);
    expect(screen.queryByTestId('flight-trail')).toBeNull();
  });

  it('renders nothing when trail has fewer than 2 points', () => {
    useTargetStore.setState({ selectedDroneId: 'D1' });
    useDroneStore.setState({
      droneTrails: new Map([['D1', [{ lat: 25.9, lng: 51.54 }]]]),
    });
    render(<FlightTrailOverlay />);
    expect(screen.queryByTestId('flight-trail')).toBeNull();
  });

  it('renders dotted trail when drone selected and trail has 2+ points', () => {
    const trail: TrailPoint[] = [
      { lat: 25.90, lng: 51.54 },
      { lat: 25.905, lng: 51.542 },
      { lat: 25.91, lng: 51.545 },
    ];
    useTargetStore.setState({ selectedDroneId: 'D1' });
    useDroneStore.setState({
      droneTrails: new Map([['D1', trail]]),
    });
    render(<FlightTrailOverlay />);
    const wrapper = screen.getByTestId('flight-trail');
    expect(wrapper).toBeTruthy();
    const polyline = wrapper.querySelector('[data-positions]');
    expect(polyline).toBeTruthy();
    const positions = JSON.parse(polyline?.getAttribute('data-positions') ?? '[]');
    expect(positions).toHaveLength(3);
    expect(positions[0]).toEqual([25.90, 51.54]);
    expect(positions[2]).toEqual([25.91, 51.545]);
  });
});
