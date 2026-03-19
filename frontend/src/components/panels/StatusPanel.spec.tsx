/**
 * StatusPanel tests. Ensures overflow-prevention classes prevent horizontal scrollbar.
 */
import { render, screen } from '@testing-library/react';
import { StatusPanel } from './StatusPanel';

describe('StatusPanel', () => {
  it('should render without crashing', () => {
    render(<StatusPanel />);
    expect(screen.getByText(/Weapon System/i)).toBeTruthy();
  });

  it('should have overflow-x-hidden on container to prevent horizontal scrollbar', () => {
    const { container } = render(<StatusPanel />);
    const panel = container.querySelector('.overflow-x-hidden');
    expect(panel).toBeTruthy();
  });

  it('should have min-w-0 on flex children to allow shrinking and prevent overflow', () => {
    const { container } = render(<StatusPanel />);
    const minWidthElements = container.querySelectorAll('.min-w-0');
    expect(minWidthElements.length).toBeGreaterThan(0);
  });
});
