/**
 * Dashboard view. Per Implementation Plan 6.1–6.3.
 * Full-viewport flex layout with header, three-zone main row, bottom bar.
 * Responsive: at 768px sidebars become MUI Drawers.
 * Sidebar widths: left 308px (+10%), right 352px (+10%); middle flex-1. overflow-x-hidden on sidebars.
 */
import React, { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ListIcon from '@mui/icons-material/List';
import { Header } from '@components/layout/Header';
import { BottomBar } from '@components/layout/BottomBar';
import { TargetPanel } from '@components/panels/TargetPanel';
import { StatusPanel } from '@components/panels/StatusPanel';
import { MapContainer } from '@components/map/MapContainer';

const SIDEBAR_BORDER = '1px solid #1A3A5C';

export const DashboardView: React.FC = () => {
  const isMobile = useMediaQuery('(max-width:768px)');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

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
      {/* 6.1.2 Header row */}
      <div className="flex items-center gap-2 flex-shrink-0 border-b border-[#1A3A5C]">
        {isMobile && (
          <>
            <IconButton
              onClick={() => setLeftOpen(true)}
              sx={{ color: '#E8F4FD' }}
              aria-label="Open target panel"
            >
              <ListIcon />
            </IconButton>
            <IconButton
              onClick={() => setRightOpen(true)}
              sx={{ color: '#E8F4FD' }}
              aria-label="Open status panel"
            >
              <MenuIcon />
            </IconButton>
          </>
        )}
        <div className="flex-1 min-w-0">
          <Header />
        </div>
      </div>

      {/* 6.1.3 Main row: left | center | right */}
      <div className="flex flex-1 min-h-0">
        {!isMobile && leftSidebar}
        <main className="flex-1 min-w-0 min-h-0">
          <MapContainer />
        </main>
        {!isMobile && rightSidebar}
      </div>

      {/* 6.1.4 Bottom bar */}
      <BottomBar />

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
          <TargetPanel />
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
