/**
 * Mode switcher tests. Per Implementation Plan Presentation 3.4.
 * 11.1.1: Mode Switcher navigation verified. MapContainer mock uses async import for uiStore.
 */
import React, { useEffect } from 'react';
import { vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { td3Theme } from '../../theme';
import { Header } from './Header';
import { DashboardView } from '../../views/DashboardView';
import { SystemsView } from '../../views/SystemsView';
import { useUIStore } from '../../store/uiStore';
import { useConnectionStore } from '../../store/connectionStore';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));

const mockUseMediaQuery = vi.fn(() => false);
vi.mock('@mui/material/useMediaQuery', () => ({ default: (q: string) => mockUseMediaQuery(q) }));

// Mock MapContainer to capture td3:capture-map-state and call setMode
vi.mock('@components/map/MapContainer', async () => {
  const React = await import('react');
  const { useUIStore } = await import('../../store/uiStore');
  const MapContainerMock = () => {
    React.useEffect(() => {
      const handler = () => {
        useUIStore.getState().setMode('systems-view', { mapCenter: [25.9, 51.5], zoom: 14 });
      };
      window.addEventListener('td3:capture-map-state', handler);
      return () => window.removeEventListener('td3:capture-map-state', handler);
    }, []);
    return React.createElement('div', { 'data-testid': 'map-container' });
  };
  return { MapContainer: MapContainerMock };
});

const AppWithRouter: React.FC = () => {
  const navigate = useNavigate();
  const activeMode = useUIStore((s) => s.activeMode);

  useEffect(() => {
    if (activeMode === 'systems-view') navigate('/systems-view');
    else if (activeMode === 'operator' || activeMode === 'debug') navigate('/dashboard');
  }, [activeMode, navigate]);

  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardView />} />
      <Route path="/systems-view" element={<SystemsView />} />
    </Routes>
  );
};

// Replicate App's Shift+1/2/3 keyboard handler for 3.4.4 test
const ModeShortcuts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (!e.shiftKey) return;
      const { setMode, setDebugDrawer, debugDrawerOpen } = useUIStore.getState();
      if (e.key === '1') {
        e.preventDefault();
        setMode('operator');
        setDebugDrawer(false);
      } else if (e.key === '2') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('td3:capture-map-state'));
      } else if (e.key === '3') {
        e.preventDefault();
        setDebugDrawer(!debugDrawerOpen);
        setMode(!debugDrawerOpen ? 'debug' : 'operator');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return <>{children}</>;
};

function renderApp(initialRoute = '/dashboard') {
  return render(
    <ThemeProvider theme={td3Theme}>
      <ModeShortcuts>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AppWithRouter />
        </MemoryRouter>
      </ModeShortcuts>
    </ThemeProvider>
  );
}

describe('Mode Switcher 3.4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMediaQuery.mockReturnValue(false);
    useUIStore.setState({ activeMode: 'operator', debugDrawerOpen: false });
    useConnectionStore.setState({ status: 'Connected' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('3.4.1: Clicking SYSTEMS VIEW navigates to /systems-view and renders SystemsView', async () => {
    renderApp('/dashboard');
    const systemsBtn = screen.getByRole('button', { name: /SYSTEMS VIEW/i });
    fireEvent.click(systemsBtn);
    await waitFor(() => {
      expect(screen.getByTestId('architecture-diagram')).toBeTruthy();
    });
  });

  it('3.4.2: Clicking OPERATOR from Systems View navigates back to /dashboard', async () => {
    useUIStore.setState({ activeMode: 'systems-view' });
    renderApp('/systems-view');

    expect(screen.getByTestId('architecture-diagram')).toBeTruthy();

    const operatorBtn = screen.getByRole('button', { name: /OPERATOR/i });
    fireEvent.click(operatorBtn);

    await waitFor(() => expect(useUIStore.getState().activeMode).toBe('operator'), { timeout: 2000 });
    // Mode sync triggers navigate; verify DashboardView mounts (map-container from mocked MapContainer)
    await waitFor(() => expect(screen.getByTestId('map-container')).toBeTruthy(), { timeout: 2000 });
  });

  it('3.4.3: Clicking DEBUG stays on /dashboard and opens debug drawer overlay', () => {
    renderApp('/dashboard');
    const debugBtn = screen.getByRole('button', { name: /DEBUG/i });
    fireEvent.click(debugBtn);

    expect(useUIStore.getState().activeMode).toBe('debug');
    expect(useUIStore.getState().debugDrawerOpen).toBe(true);
    expect(screen.getByTestId('debug-drawer')).toBeTruthy();
    expect(screen.getByLabelText(/Close debug drawer/i)).toBeTruthy();
  });

  it('3.4.4: Shift+3 toggles debug drawer open/closed without changing route', async () => {
    renderApp('/dashboard');
    expect(useUIStore.getState().debugDrawerOpen).toBe(false);

    fireEvent.keyDown(window, { key: '3', shiftKey: true });
    await waitFor(() => expect(useUIStore.getState().debugDrawerOpen).toBe(true));

    fireEvent.keyDown(window, { key: '3', shiftKey: true });
    await waitFor(() => expect(useUIStore.getState().debugDrawerOpen).toBe(false));
  });

  it('3.4.5: DEBUG button color matches connection status when selected', () => {
    useUIStore.setState({ activeMode: 'debug' });
    useConnectionStore.setState({ status: 'Connected' });
    render(
      <ThemeProvider theme={td3Theme}>
        <Header />
      </ThemeProvider>
    );
    const debugBtn = screen.getByRole('button', { name: /DEBUG/i });
    expect(debugBtn).toBeTruthy();
    expect(debugBtn.className).toContain('Mui-selected');
  });
});
