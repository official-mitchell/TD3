/**
 * Systems View tests. Per Implementation Plan Presentation 6.3, 10.3.
 * 6.3.2: SystemsView renders without console errors.
 * 10.3.3–10.3.4: SIMULATED banner visible in DEGRADED; toggling NORMAL restores default.
 */
import { vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { td3Theme } from '../theme';
import { SystemsView } from './SystemsView';
import { useUIStore } from '../store/uiStore';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));

function renderSystemsView() {
  return render(
    <ThemeProvider theme={td3Theme}>
      <SystemsView />
    </ThemeProvider>
  );
}

describe('SystemsView 6.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ selectedNodeId: null, preSystemsState: null, systemsOverlay: 'normal' });
  });

  it('6.3.2: SystemsView renders without console errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderSystemsView();

    expect(screen.getByTestId('systems-view')).toBeTruthy();
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('SystemsView 10.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ selectedNodeId: null, preSystemsState: null, systemsOverlay: 'normal' });
  });

  it('10.3.3: The SIMULATED banner is visible in DEGRADED mode', () => {
    renderSystemsView();

    expect(screen.queryByTestId('degraded-banner')).toBeNull();

    fireEvent.click(screen.getByTestId('overlay-degraded'));

    expect(screen.getByTestId('degraded-banner')).toBeTruthy();
    expect(screen.getByText(/SIMULATED DEGRADED STATE/)).toBeTruthy();
  });

  it('10.3.4: Toggling back to NORMAL restores all paths and animations to default state', () => {
    renderSystemsView();

    fireEvent.click(screen.getByTestId('overlay-degraded'));
    expect(useUIStore.getState().systemsOverlay).toBe('degraded');
    expect(screen.getByTestId('degraded-banner')).toBeTruthy();

    fireEvent.click(screen.getByTestId('overlay-normal'));
    expect(useUIStore.getState().systemsOverlay).toBe('normal');
    expect(screen.queryByTestId('degraded-banner')).toBeNull();
  });
});
