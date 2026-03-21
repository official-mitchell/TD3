import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './app';

vi.mock('@components/map/MapContainer', () => ({
  MapContainer: () => <div data-testid="map-container" />,
}));
vi.mock('@mui/material/useMediaQuery', () => ({ default: () => false }));
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should render dashboard with CREATE TARGETS', () => {
    render(<App />);
    expect(screen.getByText(/CREATE TARGETS/i)).toBeTruthy();
  });
});
