/**
 * Node detail panel tests. Per Implementation Plan Presentation 8.3.
 * 8.3.1: Clicking each of 12 nodes renders correct WHAT/DATA/FAILURE content.
 * 8.3.2: Panel slides in when selected, slides out when deselected.
 * 8.3.3: All 12 nodes clickable and display distinct content.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { td3Theme } from '../../theme';
import { NodeDetailPanel } from './NodeDetailPanel';
import { SystemsView } from '../../views/SystemsView';
import { useUIStore } from '../../store/uiStore';
import { useConnectionStore } from '../../store/connectionStore';
import { useDebugStore } from '../../store/debugStore';
import type { SystemNodeId } from '@td3/shared-types';

const ALL_NODE_IDS: SystemNodeId[] = [
  'telemetry-generator',
  'drone-state-machine',
  'engagement-engine',
  'express-api',
  'socketio-gateway',
  'normalization-service',
  'zustand-store',
  'websocket-hook',
  'map-ui-panels',
  'mongodb-atlas',
  'telemetry-log-model',
  'engagement-history',
];

/** Unique substring from each node's whatItDoes for content verification */
const NODE_SIGNATURE: Record<SystemNodeId, string> = {
  'telemetry-generator': 'origin of all live data',
  'drone-state-machine': 'drone lifecycle',
  'engagement-engine': 'probability of a hit',
  'express-api': 'REST endpoints',
  'socketio-gateway': 'real-time event bus',
  'normalization-service': 'consistent shape',
  'zustand-store': 'single source of truth',
  'websocket-hook': 'bridge between the Socket.IO',
  'map-ui-panels': 'operator-facing surface',
  'mongodb-atlas': 'Stores every engagement outcome',
  'telemetry-log-model': 'Mongoose schema',
  'engagement-history': 'historical record',
};

function renderPanel() {
  return render(
    <ThemeProvider theme={td3Theme}>
      <div style={{ width: 800, height: 400, position: 'relative' }}>
        <NodeDetailPanel />
      </div>
    </ThemeProvider>
  );
}

function renderFullSystemsView() {
  return render(
    <ThemeProvider theme={td3Theme}>
      <SystemsView />
    </ThemeProvider>
  );
}

describe('NodeDetailPanel 8.3', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUIStore.setState({ selectedNodeId: null });
    useConnectionStore.setState({ status: 'Connected' });
    useDebugStore.setState({ eventRates: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('8.3.1: Clicking each of the 12 nodes renders the correct WHAT/DATA/FAILURE content', () => {
    for (const nodeId of ALL_NODE_IDS) {
      act(() => {
        useUIStore.setState({ selectedNodeId: nodeId });
      });

      const { unmount } = renderPanel();

      expect(screen.getByTestId('node-detail-panel')).toBeTruthy();
      expect(screen.getByText('WHAT IT DOES')).toBeTruthy();
      expect(screen.getByText('DATA IN / DATA OUT')).toBeTruthy();
      expect(screen.getByText('FAILURE MODE')).toBeTruthy();
      expect(screen.getByText(NODE_SIGNATURE[nodeId], { exact: false })).toBeTruthy();

      unmount();
      act(() => {
        useUIStore.setState({ selectedNodeId: null });
      });
    }
  });

  it('8.3.2: Panel slides in when a node is selected; slides out when deselected', () => {
    act(() => {
      useUIStore.setState({ selectedNodeId: 'telemetry-generator' });
    });

    renderPanel();

    const panel = screen.getByTestId('node-detail-panel');
    expect(panel).toBeTruthy();
    const style = (panel as HTMLElement).style;
    expect(style.transform).toContain('translateX(0)');
    expect(style.transitionDuration).toBe('300ms');

    act(() => {
      useUIStore.setState({ selectedNodeId: null });
    });

    expect(style.transform).toContain('translateX(340px)');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByTestId('node-detail-panel')).toBeNull();
  });

  it('8.3.3: All 12 nodes are clickable and display distinct content', () => {
    renderFullSystemsView();

    const seenContent = new Set<string>();

    for (const nodeId of ALL_NODE_IDS) {
      const node = screen.getByTestId(`node-${nodeId}`);
      expect(node).toBeTruthy();

      fireEvent.click(node);

      const panel = screen.getByTestId('node-detail-panel');
      expect(panel).toBeTruthy();

      const signature = NODE_SIGNATURE[nodeId];
      const contentEl = screen.getByText(signature, { exact: false });
      expect(contentEl).toBeTruthy();

      expect(seenContent.has(signature)).toBe(false);
      seenContent.add(signature);
    }

    expect(seenContent.size).toBe(12);
  });
});
