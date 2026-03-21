/**
 * Architecture diagram tests. Per Implementation Plan Presentation 7.6, 10.3.
 * 7.6.1–7.6.5: Pulses, paths, node click, degraded overlay.
 * 10.3.1–10.3.2: DEGRADED slows Zone 1→2, stacks amber dots; Zone 2→3 stays normal speed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { td3Theme } from '../../theme';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { useConnectionStore } from '../../store/connectionStore';
import { useDebugStore } from '../../store/debugStore';
import { useUIStore } from '../../store/uiStore';
function renderDiagram() {
  return render(
    <ThemeProvider theme={td3Theme}>
      <div style={{ width: 960, height: 400 }}>
        <ArchitectureDiagram />
      </div>
    </ThemeProvider>
  );
}

describe('ArchitectureDiagram 7.6', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'Connected' });
    useDebugStore.setState({ eventRates: {} });
    useUIStore.setState({ selectedNodeId: null, systemsOverlay: 'normal' });
  });

  it('7.6.1: Pulses are visible and moving when drones are active', () => {
    useDebugStore.setState({
      eventRates: { 'drone:update': 3, 'drone:status': 1 },
    });

    renderDiagram();

    const pulses = document.querySelectorAll('circle[fill="#ffffff"]');
    expect(pulses.length).toBeGreaterThan(0);

    const animateMotions = document.querySelectorAll('animateMotion');
    expect(animateMotions.length).toBeGreaterThan(0);
  });

  it('7.6.2: Pulse rate increases when drone count increases (shorter duration at higher rate)', () => {
    useDebugStore.setState({ eventRates: { 'drone:update': 1 } });
    const { rerender } = renderDiagram();

    const motions1 = document.querySelectorAll('animateMotion');
    const dur1 = motions1[0]?.getAttribute('dur') ?? '';

    act(() => {
      useDebugStore.setState({ eventRates: { 'drone:update': 5 } });
    });
    rerender(
      <ThemeProvider theme={td3Theme}>
        <div style={{ width: 960, height: 400 }}>
          <ArchitectureDiagram />
        </div>
      </ThemeProvider>
    );

    const motions2 = document.querySelectorAll('animateMotion');
    const dur2 = motions2[0]?.getAttribute('dur') ?? '';

    const parseDur = (s: string) => parseFloat(s) || 999;
    expect(parseDur(dur2)).toBeLessThan(parseDur(dur1));
  });

  it('7.6.3: Paths switch to amber dashed when backend is disconnected', () => {
    useConnectionStore.setState({ status: 'Offline' });

    renderDiagram();

    const paths = document.querySelectorAll('svg path[stroke="#FF9800"]');
    expect(paths.length).toBeGreaterThan(0);

    const dashedPath = Array.from(paths).find((p) => p.getAttribute('stroke-dasharray') === '6 4');
    expect(dashedPath).toBeTruthy();
  });

  it('7.6.4: Clicking a node selects it (amber ring) and opens the detail panel', () => {
    renderDiagram();

    const node = screen.getByTestId('node-telemetry-generator');
    expect(node).toBeTruthy();

    fireEvent.click(node);

    expect(useUIStore.getState().selectedNodeId).toBe('telemetry-generator');

    const rect = node.querySelector('rect');
    expect(rect?.getAttribute('stroke')).toBe('#FFA726');
  });

  it('7.6.4: Clicking selected node deselects and closes panel', () => {
    useUIStore.setState({ selectedNodeId: 'telemetry-generator' });

    renderDiagram();

    const node = screen.getByTestId('node-telemetry-generator');
    fireEvent.click(node);

    expect(useUIStore.getState().selectedNodeId).toBeNull();
  });

  it('7.6.5: In DEGRADED overlay mode, normalization-service gets amber fill', () => {
    useUIStore.setState({ systemsOverlay: 'degraded' });

    renderDiagram();

    const normNode = screen.getByTestId('node-normalization-service');
    const rect = normNode.querySelector('rect');
    expect(rect?.getAttribute('fill')).toContain('255,167,38');
  });

  it('7.6.5: In DEGRADED overlay mode, Zone 1→2 paths have longer pulse duration', () => {
    useDebugStore.setState({ eventRates: { 'drone:update': 2 } });
    useUIStore.setState({ systemsOverlay: 'normal' });

    const { rerender } = renderDiagram();

    const motionsNormal = document.querySelectorAll('animateMotion');
    const durNormal = motionsNormal[0]?.getAttribute('dur') ?? '999s';

    act(() => {
      useUIStore.setState({ systemsOverlay: 'degraded' });
    });
    rerender(
      <ThemeProvider theme={td3Theme}>
        <div style={{ width: 960, height: 400 }}>
          <ArchitectureDiagram />
        </div>
      </ThemeProvider>
    );

    const motionsDegraded = document.querySelectorAll('animateMotion');
    const durDegraded = motionsDegraded[0]?.getAttribute('dur') ?? '0s';

    expect(parseFloat(durDegraded)).toBeGreaterThan(parseFloat(durNormal));
  });

  it('10.3.1: Toggling DEGRADED slows Zone 1→2 pulses and stacks amber dots at Normalization Service', () => {
    useDebugStore.setState({ eventRates: { 'drone:update': 2 } });
    useUIStore.setState({ systemsOverlay: 'normal' });

    const { rerender } = renderDiagram();
    const motionsNormal = document.querySelectorAll('animateMotion');
    const durNormal = parseFloat(motionsNormal[0]?.getAttribute('dur') ?? '999');

    act(() => {
      useUIStore.setState({ systemsOverlay: 'degraded' });
    });
    rerender(
      <ThemeProvider theme={td3Theme}>
        <div style={{ width: 960, height: 400 }}>
          <ArchitectureDiagram />
        </div>
      </ThemeProvider>
    );

    const motionsDegraded = document.querySelectorAll('animateMotion');
    const durDegraded = parseFloat(motionsDegraded[0]?.getAttribute('dur') ?? '0');
    expect(durDegraded).toBeGreaterThan(durNormal);

    const amberDots = document.querySelectorAll('circle[fill="#FF9800"]');
    expect(amberDots.length).toBeGreaterThanOrEqual(4);
  });

  it('10.3.2: Zone 2→3 pulses continue at normal speed in DEGRADED mode', () => {
    useDebugStore.setState({ eventRates: { 'drone:update': 2 } });
    useUIStore.setState({ systemsOverlay: 'normal' });

    const { rerender } = renderDiagram();
    const motionsNormal = document.querySelectorAll('animateMotion');
    const durZone2To3Normal = parseFloat(motionsNormal[2]?.getAttribute('dur') ?? '999');

    act(() => {
      useUIStore.setState({ systemsOverlay: 'degraded' });
    });
    rerender(
      <ThemeProvider theme={td3Theme}>
        <div style={{ width: 960, height: 400 }}>
          <ArchitectureDiagram />
        </div>
      </ThemeProvider>
    );

    const motionsDegraded = document.querySelectorAll('animateMotion');
    const durZone2To3Degraded = parseFloat(motionsDegraded[2]?.getAttribute('dur') ?? '0');
    expect(durZone2To3Degraded).toBe(durZone2To3Normal);
  });
});
