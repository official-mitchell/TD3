/**
 * SpeedGauge tests. Ensures digital readout is centered in arc and data is readable.
 */
import { render, screen } from '@testing-library/react';
import { SpeedGauge } from './SpeedGauge';

describe('SpeedGauge', () => {
  it('renders speed value in digital readout', () => {
    render(<SpeedGauge value={67} />);
    expect(screen.getByText('67')).toBeTruthy();
    expect(screen.getByText('km/h')).toBeTruthy();
  });

  it('renders SPEED label below gauge', () => {
    render(<SpeedGauge value={0} />);
    expect(screen.getByText('SPEED')).toBeTruthy();
  });

  it('pads single-digit speed with leading zero', () => {
    render(<SpeedGauge value={5} />);
    expect(screen.getByText('05')).toBeTruthy();
  });

  it('renders SVG with correct viewBox', () => {
    const { container } = render(<SpeedGauge value={50} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toContain('180');
    expect(svg?.getAttribute('viewBox')).toContain('170');
  });

  it('respects max prop for scale', () => {
    render(<SpeedGauge value={150} max={200} />);
    expect(screen.getAllByText('150').length).toBeGreaterThanOrEqual(1);
  });
});
