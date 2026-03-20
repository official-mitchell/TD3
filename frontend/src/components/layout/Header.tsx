/**
 * Header bar. Left: TD3 logo + title. Right: Create Targets, hamburger menu (settings), drawer toggles (mobile).
 * Create Targets: only targettable drones (Engagement Ready, in range). Settings: Create drones, Clear drones, etc.
 */
import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import MenuIcon from '@mui/icons-material/Menu';
import ListIcon from '@mui/icons-material/List';
import { TD3Logo } from '@components/ui/TD3Logo';
import { HamburgerButton } from '@components/ui/HamburgerButton';
import { LocationPicker } from '@components/settings/LocationPicker';
import { useUIStore } from '../../store/uiStore';
import { useDroneStore } from '../../store/droneStore';
import { useTargetStore } from '../../store/targetStore';

const API_BASE = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3333';

export interface HeaderProps {
  onOpenLeftPanel?: () => void;
  onOpenRightPanel?: () => void;
  isMobile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLeftPanel,
  onOpenRightPanel,
  isMobile = false,
}) => {
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const weaponSize = useUIStore((s) => s.weaponSize);
  const droneSize = useUIStore((s) => s.droneSize);
  const soundVolume = useUIStore((s) => s.soundVolume);
  const showDyingDrones = useUIStore((s) => s.showDyingDrones);
  const setShowDyingDrones = useUIStore((s) => s.setShowDyingDrones);
  const setWeaponSize = useUIStore((s) => s.setWeaponSize);
  const setDroneSize = useUIStore((s) => s.setDroneSize);
  const setSoundVolume = useUIStore((s) => s.setSoundVolume);

  const handleMenuClose = () => setMenuAnchor(null);

  const handleLocationSelect = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/platform/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      if (!res.ok) throw new Error('Failed to update location');
    } catch (err) {
      console.error('Update location failed:', err);
    }
  };

  const handleRefillAmmo = async () => {
    handleMenuClose();
    try {
      const res = await fetch(`${API_BASE}/api/platform/refill`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to refill ammo');
    } catch (err) {
      console.error('Refill ammo failed:', err);
    }
  };

  const handleCreateTargets = async () => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch(`${API_BASE}/api/drones/test-targets`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? res.statusText);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create targets');
      console.error('Create targets failed:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateDrones = async () => {
    handleMenuClose();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch(`${API_BASE}/api/drones/test-types`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? res.statusText);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create drones');
      console.error('Create drones failed:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleClearDrones = async () => {
    handleMenuClose();
    try {
      const res = await fetch(`${API_BASE}/api/drones/clear`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear drones');
      useDroneStore.getState().clearDrones();
      useTargetStore.getState().setSelected(null);
    } catch (err) {
      console.error('Clear drones failed:', err);
    }
  };

  return (
    <header className="h-14 flex-shrink-0 w-full flex items-center justify-between px-4 bg-[#0F1929] border-b border-[#1A3A5C]">
      {/* 11.1.1 Left zone: TD3 logo + full title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          <TD3Logo />
        </div>
        <span
          className="text-sm text-[#7B9BB5] uppercase tracking-wider truncate"
          style={{ fontVariant: 'small-caps' }}
        >
          TACTICAL DRONE DEFENSE DASHBOARD
        </span>
      </div>

      {/* Right zone: Create Targets, drawer toggles (mobile), hamburger menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleCreateTargets}
          disabled={createLoading}
          className="px-3 py-1.5 bg-[#1E90FF] hover:bg-[#1a7de8] disabled:opacity-50 rounded text-xs font-mono font-medium text-white"
          title="Create targettable drones (Engagement Ready, in range) for testing"
        >
          {createLoading ? 'Creating…' : 'CREATE TARGETS'}
        </button>
        {createError && (
          <span className="text-xs text-red-400 max-w-[120px] truncate" title={createError}>
            {createError}
          </span>
        )}
        {isMobile && onOpenLeftPanel && onOpenRightPanel && (
          <>
            <IconButton
              onClick={onOpenLeftPanel}
              sx={{ color: '#E8F4FD' }}
              aria-label="Open target panel"
              size="small"
            >
              <ListIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={onOpenRightPanel}
              sx={{ color: '#E8F4FD' }}
              aria-label="Open status panel"
              size="small"
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </>
        )}
        <HamburgerButton
          open={menuOpen}
          onClick={(e) => setMenuAnchor(menuAnchor ? null : (e.currentTarget as HTMLElement))}
          aria-label="Settings"
          className="text-[#E8F4FD] hover:bg-[#1A3A5C] rounded"
        />
        <Menu
          open={menuOpen}
          onClose={handleMenuClose}
          anchorEl={menuAnchor}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              bgcolor: '#0F1929',
              border: '1px solid #1A3A5C',
              color: '#E8F4FD',
              minWidth: 260,
            },
          }}
        >
          <MenuItem
            onClick={() => {
              setLocationPickerOpen(true);
              handleMenuClose();
            }}
          >
            Change location…
          </MenuItem>
          <MenuItem onClick={handleRefillAmmo}>Refill ammo</MenuItem>
          <MenuItem onClick={handleCreateDrones} disabled={createLoading}>
            Create drones
          </MenuItem>
          <MenuItem onClick={handleClearDrones}>Clear drones</MenuItem>
          <div className="px-4 py-2 border-t border-[#1A3A5C]">
            <div className="text-xs text-[#7B9BB5] mb-1">Weapon system size</div>
            <Slider
              value={weaponSize}
              onChange={(_, v) => setWeaponSize(v as number)}
              min={0.5}
              max={2}
              step={0.1}
              size="small"
              sx={{ color: '#1E90FF' }}
            />
          </div>
          <div className="px-4 py-2 border-t border-[#1A3A5C]">
            <div className="text-xs text-[#7B9BB5] mb-1">Drone size</div>
            <Slider
              value={droneSize}
              onChange={(_, v) => setDroneSize(v as number)}
              min={0.5}
              max={2}
              step={0.1}
              size="small"
              sx={{ color: '#1E90FF' }}
            />
          </div>
          <div className="px-4 py-2 border-t border-[#1A3A5C] flex items-center justify-between gap-2">
            <span className="text-xs text-[#7B9BB5]">Show downed drones</span>
            <input
              type="checkbox"
              checked={showDyingDrones}
              onChange={(e) => setShowDyingDrones(e.target.checked)}
              className="rounded"
            />
          </div>
          <div className="px-4 py-2 border-t border-[#1A3A5C]">
            <div className="text-xs text-[#7B9BB5] mb-1">Sound volume</div>
            <Slider
              value={soundVolume}
              onChange={(_, v) => setSoundVolume(v as number)}
              min={0}
              max={1}
              step={0.1}
              size="small"
              sx={{ color: '#1E90FF' }}
            />
          </div>
        </Menu>

        <LocationPicker
          open={locationPickerOpen}
          onClose={() => setLocationPickerOpen(false)}
          onSelect={handleLocationSelect}
        />
      </div>
    </header>
  );
};
