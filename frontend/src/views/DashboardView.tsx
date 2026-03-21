/**
 * Dashboard view. Per Implementation Plan 6.1–6.3, 14.6.2, 18.2.2.
 * ErrorBoundary wraps MapContainer, TargetPanel, BottomBar per Phase 18.2.
 * Responsive: at 768px sidebars become MUI Drawers; floating carets on map edges open panels.
 * Sidebar widths: left 308px (+10%), right 352px (+10%); middle flex-1. overflow-x-hidden on sidebars.
 * OfflineBanner shown when connectionStore.status is Offline.
 */
import React, { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Header } from '@components/layout/Header';
import { BottomBar } from '@components/layout/BottomBar';
import { OfflineBanner } from '@components/layout/OfflineBanner';
import { useConnectionStore } from '../store/connectionStore';
import { TargetPanel } from '@components/panels/TargetPanel';
import { StatusPanel } from '@components/panels/StatusPanel';
import { MapContainer } from '@components/map/MapContainer';
import { DieselAmbient } from '@components/audio/DieselAmbient';
import { ErrorBoundary } from '@components/ErrorBoundary';

const SIDEBAR_BORDER = '1px solid #1A3A5C';

export const DashboardView: React.FC = () => {
  const isMobile = useMediaQuery('(max-width:768px)');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const status = useConnectionStore((s) => s.status);

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
          {/* Mobile: floating carets to open panels */}
          {isMobile && (
            <>
              <IconButton
                onClick={() => setLeftOpen(true)}
                aria-label="Open priority targets"
                className="!absolute left-0 top-1/2 !-translate-y-1/2 z-[700] !bg-[#0F1929]/90 !border !border-r-0 !border-[#1A3A5C] !rounded-r-md hover:!bg-[#1A3A5C] !text-[#E8F4FD] !py-2 !px-1"
                sx={{ minWidth: 36 }}
              >
                <FormatListBulletedIcon fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => setRightOpen(true)}
                aria-label="Open engagement log"
                className="!absolute right-0 top-1/2 !-translate-y-1/2 z-[700] !bg-[#0F1929]/90 !border !border-l-0 !border-[#1A3A5C] !rounded-l-md hover:!bg-[#1A3A5C] !text-[#E8F4FD] !py-2 !px-1"
                sx={{ minWidth: 36 }}
              >
                <AssignmentIcon fontSize="small" />
              </IconButton>
            </>
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
    </div>
  );
};
