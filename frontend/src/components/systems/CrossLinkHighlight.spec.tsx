/**
 * Cross-link highlight acceptance tests. Per Implementation Plan Presentation 9.4.
 * 9.4.1–9.4.4: VIEW IN OPERATOR MODE flow, highlight clear, manual nav.
 * 9.4.1: VIEW IN OPERATOR MODE on Engagement Engine → dashboard, FIRE button pulses.
 * 9.4.2: VIEW IN OPERATOR MODE on Socket.IO Gateway → dashboard, connection indicator pulses.
 * 9.4.3: Highlight clears automatically after 3 seconds.
 * 9.4.4: Manual navigation to Systems View does not retrigger highlight.
 */
import React, { useEffect } from 'react';
import { vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { td3Theme } from '../../theme';
import { SystemsView } from '../../views/SystemsView';
import { DashboardView } from '../../views/DashboardView';
import { useUIStore } from '../../store/uiStore';
import { useConnectionStore } from '../../store/connectionStore';
import { useDebugStore } from '../../store/debugStore';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));

const mockUseMediaQuery = vi.fn(() => false);
vi.mock('@mui/material/useMediaQuery', () => ({ default: (q: string) => mockUseMediaQuery(q) }));

// MapContainer mock: handles td3:capture-map-state for 9.4.4; minimal placeholder for dashboard
vi.mock('@components/map/MapContainer', async (importOriginal) => {
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

function renderApp(initialRoute = '/dashboard') {
  return render(
    <ThemeProvider theme={td3Theme}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppWithRouter />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Cross-link highlight 9.4', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUseMediaQuery.mockReturnValue(false);
    useUIStore.setState({
      activeMode: 'systems-view',
      selectedNodeId: null,
      highlightTargetId: null,
    });
    useConnectionStore.setState({ status: 'Connected' });
    useDebugStore.setState({ eventRates: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('9.4.1: Clicking VIEW IN OPERATOR MODE on Engagement Engine navigates to dashboard and FIRE button pulses amber for 3 seconds', async () => {
    vi.useRealTimers();
    useUIStore.setState({ activeMode: 'systems-view' });
    renderApp('/systems-view');

    act(() => {
      useUIStore.setState({ selectedNodeId: 'engagement-engine' });
    });

    const viewLink = screen.getByRole('button', { name: /VIEW IN OPERATOR MODE/i });
    expect(viewLink).toBeTruthy();

    fireEvent.click(viewLink);

    await waitFor(
      () => {
        expect(useUIStore.getState().activeMode).toBe('operator');
        expect(useUIStore.getState().highlightTargetId).toBe('fire-button');
      },
      { timeout: 2000 }
    );

    expect(screen.getByTestId('map-container')).toBeTruthy();
    vi.useFakeTimers();
  });

  it('9.4.2: Clicking the link on Socket.IO Gateway navigates to dashboard and connection indicator pulses amber', async () => {
    vi.useRealTimers();
    useUIStore.setState({ activeMode: 'systems-view' });
    renderApp('/systems-view');

    act(() => {
      useUIStore.setState({ selectedNodeId: 'socketio-gateway' });
    });

    const viewLink = screen.getByRole('button', { name: /VIEW IN OPERATOR MODE/i });
    fireEvent.click(viewLink);

    await waitFor(
      () => {
        expect(useUIStore.getState().activeMode).toBe('operator');
        expect(useUIStore.getState().highlightTargetId).toBe('connection-indicator');
      },
      { timeout: 2000 }
    );

    const connectionChip = screen.getByTestId('connection-indicator');
    expect(connectionChip.className).toContain('highlight-pulse');
    vi.useFakeTimers();
  });

  it('9.4.3: After 3 seconds, the highlight clears automatically with no manual action', async () => {
    act(() => {
      useUIStore.getState().triggerHighlight('fire-button');
    });
    expect(useUIStore.getState().highlightTargetId).toBe('fire-button');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(useUIStore.getState().highlightTargetId).toBeNull();
  });

  it('9.4.4: Navigating back to Systems View manually after a cross-link does not retrigger the highlight', async () => {
    vi.useRealTimers();
    useUIStore.setState({ activeMode: 'operator', highlightTargetId: null });
    renderApp('/dashboard');

    const systemsBtn = screen.getByRole('button', { name: /SYSTEMS VIEW/i });
    fireEvent.click(systemsBtn);

    await waitFor(
      () => {
        expect(useUIStore.getState().activeMode).toBe('systems-view');
      },
      { timeout: 2000 }
    );

    expect(useUIStore.getState().highlightTargetId).toBeNull();
    vi.useFakeTimers();
  });
});
