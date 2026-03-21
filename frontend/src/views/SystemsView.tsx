/**
 * Systems View — full-page architecture diagram. Per Implementation Plan Presentation 6.1–6.3, 8.1, 10.1.
 * Full viewport dark panel. Layout: top bar (scenario toggle + label) | main area (ArchitectureDiagram, NodeDetailPanel).
 * NodeDetailPanel 340px, slides in from right when node selected. 10.1: NORMAL FLOW | DEGRADED FLOW toggle.
 */
import React, { useEffect, useRef } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { Header } from '@components/layout/Header';
import { ArchitectureDiagram } from '@components/systems/ArchitectureDiagram';
import { NodeDetailPanel } from '@components/systems/NodeDetailPanel';
import { useUIStore } from '../store/uiStore';
import type { PreSystemsState } from '../store/uiStore';

export const SystemsView: React.FC = () => {
  const setSelectedNode = useUIStore((s) => s.setSelectedNode);
  const setSystemsOverlay = useUIStore((s) => s.setSystemsOverlay);
  const systemsOverlay = useUIStore((s) => s.systemsOverlay);
  const preSystemsState = useUIStore((s) => s.preSystemsState);

  const preSystemsStateRef = useRef<PreSystemsState | null>(null);

  useEffect(() => {
    preSystemsStateRef.current = preSystemsState;
  }, [preSystemsState]);

  useEffect(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleOverlayChange = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (value && (value === 'normal' || value === 'degraded')) {
      setSystemsOverlay(value);
    }
  };

  return (
    <div
      className="flex flex-col overflow-hidden text-[#E8F4FD]"
      style={{ width: '100vw', height: '100vh', background: '#0a0e14' }}
      data-testid="systems-view"
    >
      <div className="flex-shrink-0">
        <Header isMobile={false} />
      </div>

      {/* 10.1 Top bar: scenario toggle + banner */}
      <div className="flex-shrink-0 flex flex-col border-b border-[#1A3A5C]">
        <div className="flex items-center gap-4 px-4 py-2">
          <ToggleButtonGroup
            value={systemsOverlay}
            exclusive
            onChange={handleOverlayChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#7B9BB5',
                borderColor: '#1A3A5C',
                fontSize: '0.75rem',
                py: 0.5,
                px: 1.5,
                '&.Mui-selected': { color: '#E8F4FD', bgcolor: '#1A3A5C' },
              },
            }}
          >
            <ToggleButton value="normal" data-testid="overlay-normal">
              NORMAL FLOW
            </ToggleButton>
            <ToggleButton value="degraded" data-testid="overlay-degraded">
              DEGRADED FLOW
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        {systemsOverlay === 'degraded' && (
          <div className="px-4 pb-2 text-xs text-[#FF9800]" data-testid="degraded-banner">
            SIMULATED DEGRADED STATE — live data unaffected
          </div>
        )}
      </div>

      {/* 6.1.3 Main area: ArchitectureDiagram (flex:1) | NodeDetailPanel (340px, slides in) */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        <main className="flex-1 min-w-0 min-h-0 p-4 flex">
          <div className="flex-1 min-w-0 min-h-0">
            <ArchitectureDiagram />
          </div>
        </main>
        <NodeDetailPanel />
      </div>
    </div>
  );
};
