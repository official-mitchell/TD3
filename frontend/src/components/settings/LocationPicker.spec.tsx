/**
 * LocationPicker tests. Ensures modal renders in front of Leaflet map (z-index above 700).
 */
import { vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocationPicker } from './LocationPicker';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="location-picker-leaflet-map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  useMap: () => ({ setView: vi.fn(), getZoom: vi.fn(() => 12) }),
  useMapEvents: () => null,
}));

vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
  },
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));

describe('LocationPicker', () => {
  const onClose = vi.fn();
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) }))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when closed', () => {
    render(<LocationPicker open={false} onClose={onClose} onSelect={onSelect} />);
    expect(screen.queryByTestId('location-picker-overlay')).toBeNull();
  });

  it('renders overlay and modal when open', () => {
    render(<LocationPicker open={true} onClose={onClose} onSelect={onSelect} />);
    expect(screen.getByTestId('location-picker-overlay')).toBeTruthy();
    expect(screen.getByTestId('location-picker-modal')).toBeTruthy();
    expect(screen.getByText('Change Location')).toBeTruthy();
  });

  it('overlay has z-index 9999 to render above Leaflet map (max z ~800)', () => {
    render(<LocationPicker open={true} onClose={onClose} onSelect={onSelect} />);
    const overlay = screen.getByTestId('location-picker-overlay');
    const zIndex = window.getComputedStyle(overlay).zIndex;
    expect(Number(zIndex)).toBeGreaterThanOrEqual(9999);
  });

  it('renders in document.body via portal', () => {
    render(<LocationPicker open={true} onClose={onClose} onSelect={onSelect} />);
    const overlay = screen.getByTestId('location-picker-overlay');
    expect(overlay.parentElement).toBe(document.body);
  });

  it('clicking overlay backdrop calls onClose', () => {
    render(<LocationPicker open={true} onClose={onClose} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('location-picker-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking modal content does not call onClose', () => {
    render(<LocationPicker open={true} onClose={onClose} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('location-picker-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Cancel button calls onClose', () => {
    render(<LocationPicker open={true} onClose={onClose} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Apply Location calls onSelect with current position and onClose', () => {
    render(<LocationPicker open={true} onClose={onClose} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Apply Location'));
    expect(onSelect).toHaveBeenCalledWith(25.905310475056915, 51.543824178558054);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
