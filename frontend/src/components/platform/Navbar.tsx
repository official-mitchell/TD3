/**
 * Navbar with TD3 logo, action buttons, and connection/drone debug display (4.5 acceptance).
 * Status tooltips, UPDATE PLATFORM fetches /api/platform/status, CREATE TESTS spawns test drones.
 */
import React, { useState } from 'react';
import { TD3Logo } from '../ui/TD3Logo';
import { useConnectionStore } from '../../store/connectionStore';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { getApiBaseUrl } from '../../utils/constants';
import { error as logError } from '../../lib/logger';

const API_BASE = getApiBaseUrl();

const STATUS_TOOLTIPS: Record<string, string> = {
  Connected: 'WebSocket connected; heartbeat OK',
  Degraded: 'Connection unstable: heartbeat not responding or connection error',
  Offline: 'Disconnected from server',
};

export const Navbar: React.FC = () => {
  const status = useConnectionStore((s) => s.status);
  const droneCount = useDroneStore((s) => s.drones.size);
  const updatePlatform = usePlatformStore((s) => s.updatePlatform);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleUpdatePlatform = async () => {
    setUpdateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/platform/status`);
      if (!res.ok) throw new Error(res.statusText);
      const platform = await res.json();
      updatePlatform(platform);
    } catch (err) {
      logError('Update platform failed:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCreateTests = async () => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch(`${API_BASE}/api/drones/test-types`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? res.statusText);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create test drones');
      logError('create.test.drones.failed', { error: (err as Error).message });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-slate-800/50">
      <TD3Logo />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 text-xs font-mono">
          <span
            title={STATUS_TOOLTIPS[status] ?? status}
            className={`px-2 py-1 rounded cursor-help ${
              status === 'Connected'
                ? 'bg-green-600/80 text-white'
                : status === 'Offline'
                  ? 'bg-red-600/80 text-white'
                  : 'bg-amber-600/80 text-white'
            }`}
          >
            {status}
          </span>
          <span className="text-slate-400">Drones: {droneCount}</span>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={handleUpdatePlatform}
            disabled={updateLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm"
            title="Fetch latest weapon platform status from server"
          >
            {updateLoading ? 'Updating…' : 'UPDATE PLATFORM'}
          </button>
          <button
            onClick={handleCreateTests}
            disabled={createLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm"
            title="Spawn test drones for simulation"
          >
            {createLoading ? 'Creating…' : 'CREATE TESTS'}
          </button>
          {createError && (
            <span className="text-xs text-red-400" title={createError}>
              {createError}
            </span>
          )}
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">
            CLEAR UPDATES
          </button>
        </div>
      </div>
    </nav>
  );
};
