/**
 * Dashboard view. Per Implementation Plan 6.1–6.3, 14.6.2, 18.2.2.
 * ErrorBoundary wraps MapContainer, TargetPanel, BottomBar per Phase 18.2.
 * Responsive: at 768px sidebars become MUI Drawers; text buttons overlaid on map open panels (not hamburgers).
 * Sidebar widths: left 308px (+10%), right 352px (+10%); middle flex-1. overflow-x-hidden on sidebars.
 * OfflineBanner shown when connectionStore.status is Offline.
 * 6.2.2: On mount, restores preSystemsState.selectedDroneId via targetStore.setSelected.
 *
 * --- Changelog ---
 * 2025-03-23: Mobile: side navs as text buttons ("Priority targets", "Engagement Log") at bottom overlay, not hamburgers.
 */
import React, { useState, useEffect } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import { Header } from '@components/layout/Header';
import { BottomBar } from '@components/layout/BottomBar';
import { OfflineBanner } from '@components/layout/OfflineBanner';
import { useConnectionStore } from '../store/connectionStore';
import { useUIStore } from '../store/uiStore';
import { useTargetStore } from '../store/targetStore';
import { TargetPanel } from '@components/panels/TargetPanel';
import { StatusPanel } from '@components/panels/StatusPanel';
import { MapContainer } from '@components/map/MapContainer';
import { DieselAmbient } from '@components/audio/DieselAmbient';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { DebugDrawer } from '@components/debug/DebugDrawer';

const SIDEBAR_BORDER = '1px solid #1A3A5C';

export const DashboardView: React.FC = () => {
  const isMobile = useMediaQuery('(max-width:768px)');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const status = useConnectionStore((s) => s.status);

  useEffect(() => {
    const pre = useUIStore.getState().preSystemsState;
    if (pre?.selectedDroneId) {
      useTargetStore.getState().setSelected(pre.selectedDroneId);
    }
  }, []);

  const leftSidebar = (
    <div className="w-[308px] flex-shrink-0 h-full overflow-y-auto overflow-x-hidden border-r border-[#1A3A5C]">
      <TargetPanel />
    </div>
  );

  const rightSidebar = (
    <div className="w-[352px] flex-shrink-0 h-full overflow-y-auto overflow-x-hidden border-l border-[#1A3A5C]">
      <StatusPanel />
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0A0E1A] text-[#E8F4FD]">
      {status === 'Offline' && <OfflineBanner />}
      <DieselAmbient />
      {/* 6.1.2 Header row — 11.1–11.3 Header with connection badge and drawer toggles */}
      <div className="flex items-center flex-shrink-0">
        <Header isMobile={isMobile} />
      </div>

      {/* 6.1.3 Main row: left | center | right */}
      <div className="flex flex-1 min-h-0 relative">
        {!isMobile && leftSidebar}
        <main className="flex-1 min-w-0 min-h-0 relative">
          <ErrorBoundary>
            <MapContainer />
          </ErrorBoundary>
          {/* Mobile: text buttons overlaid at bottom (swaps with indicators), not hamburgers */}
          {isMobile && (
            <div className="absolute bottom-0 left-0 right-0 z-[650] flex items-end justify-between px-2 pb-2 pointer-events-none [&>button]:pointer-events-auto">
              <button
                onClick={() => setLeftOpen(true)}
                aria-label="Open priority targets"
                className="px-3 py-2 text-xs font-medium rounded-md bg-[#0F1929]/95 border border-[#1A3A5C] text-[#E8F4FD] hover:bg-[#1A3A5C]"
              >
                Priority targets
              </button>
              <button
                onClick={() => setRightOpen(true)}
                aria-label="Open engagement log"
                className="px-3 py-2 text-xs font-medium rounded-md bg-[#0F1929]/95 border border-[#1A3A5C] text-[#E8F4FD] hover:bg-[#1A3A5C]"
              >
                Engagement Log
              </button>
            </div>
          )}
        </main>
        {!isMobile && rightSidebar}
      </div>

      {/* 6.1.4 Bottom bar */}
      <ErrorBoundary>
        <BottomBar />
      </ErrorBoundary>

      {/* 6.3.1 Mobile drawers */}
      <Drawer
        anchor="left"
        open={isMobile && leftOpen}
        onClose={() => setLeftOpen(false)}
        PaperProps={{
          sx: { width: 308, maxWidth: '85vw', backgroundColor: '#0F1929', borderRight: SIDEBAR_BORDER },
        }}
      >
        <div className="pt-4 h-full overflow-y-auto">
          <ErrorBoundary>
            <TargetPanel />
          </ErrorBoundary>
        </div>
      </Drawer>
      <Drawer
        anchor="right"
        open={isMobile && rightOpen}
        onClose={() => setRightOpen(false)}
        PaperProps={{
          sx: { width: 352, maxWidth: '85vw', backgroundColor: '#0F1929', borderLeft: SIDEBAR_BORDER },
        }}
      >
        <div className="pt-4 h-full overflow-y-auto">
          <StatusPanel />
        </div>
      </Drawer>

      {/* 3.4.3 Debug drawer overlay — stays on /dashboard, overlays operator UI */}
      <DebugDrawer />
    </div>
  );
};
