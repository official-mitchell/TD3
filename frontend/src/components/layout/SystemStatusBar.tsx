/**
 * System status bar. Per Implementation Plan Presentation 4.1–4.5, 9.3.2.
 * Full-width row of fixed-width chips below nav. useHighlight('connection-indicator') on WS chip.
 */
import React, { useState, useEffect } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useConnectionStore } from '../../store/connectionStore';
import { useHighlight } from '../../hooks/useHighlight';
import { useDroneStore } from '../../store/droneStore';
import { useTargetStore } from '../../store/targetStore';
import { usePlatformStore } from '../../store/platformStore';

const STALE_THRESHOLD_MS = 5000;
const TELEMETRY_GREEN_MS = 3000;
const TELEMETRY_AMBER_MS = 8000;
const TELEMETRY_CAP_S = 30;
const AMMO_AMBER = 100;
const AMMO_RED = 30;

const chipBase =
  'min-w-[120px] h-8 flex items-center justify-center text-xs font-mono px-2 border-r border-white/10 last:border-r-0';

function getWsColor(status: string): string {
  if (status === 'Connected') return 'text-[#4CAF50]';
  if (status === 'Degraded') return 'text-[#FF9800]';
  return 'text-[#f44336]';
}

function getTelemetryColor(ageMs: number): string {
  if (ageMs < TELEMETRY_GREEN_MS) return 'text-[#4CAF50]';
  if (ageMs < TELEMETRY_AMBER_MS) return 'text-[#FF9800]';
  return 'text-[#f44336]';
}

function getStaleColor(count: number): string {
  if (count === 0) return '';
  if (count <= 3) return 'text-[#FF9800]';
  return 'text-[#f44336]';
}

function getAmmoColor(ammo: number): string {
  if (ammo >= AMMO_AMBER) return 'text-white';
  if (ammo >= AMMO_RED) return 'text-[#FF9800]';
  return 'text-[#f44336]';
}

export const SystemStatusBar: React.FC = () => {
  const isNarrow = useMediaQuery('(max-width:768px)');
  const [telemetryAgeMs, setTelemetryAgeMs] = useState(0);

  const connectionStatus = useConnectionStore((s) => s.status);
  const lastUpdateAt = useDroneStore((s) => s.lastUpdateAt);
  const drones = useDroneStore((s) => s.drones);
  const selectionMode = useTargetStore((s) => s.selectionMode);
  const platform = usePlatformStore((s) => s.platform);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryAgeMs(Math.max(0, Date.now() - lastUpdateAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateAt]);

  const now = Date.now();
  const staleCount = Array.from(drones.values()).filter(
    (d) => now - new Date(d.lastUpdated).getTime() > STALE_THRESHOLD_MS
  ).length;
  const activeCount = Array.from(drones.values()).filter((d) => d.status !== 'Destroyed').length;
  const ammo = platform?.ammoCount ?? 0;

  const telemetryLabel =
    telemetryAgeMs >= TELEMETRY_CAP_S * 1000
      ? '>30s ago'
      : `${Math.floor(telemetryAgeMs / 1000)}s ago`;

  const label = (full: string, short: string) => (isNarrow ? short : full);
  const { isHighlighted } = useHighlight('connection-indicator');

  return (
    <div
      className="w-full flex items-stretch bg-black/40 border-t border-white/10"
      style={{ height: 32 }}
      data-testid="system-status-bar"
    >
      <div
        className={`${chipBase} ${getWsColor(connectionStatus)} ${isHighlighted ? 'highlight-pulse rounded' : ''}`}
        style={isHighlighted ? { outline: '2px solid #FFA726', boxShadow: '0 0 12px rgba(255,167,38,0.4)' } : undefined}
        title="WebSocket connection"
        data-testid="connection-indicator"
      >
        {label('WS CONNECTION', 'WS')}
      </div>
      <div className={`${chipBase} ${getTelemetryColor(telemetryAgeMs)}`} title="Telemetry age">
        {label('TELEMETRY AGE', 'TEL')}: {telemetryLabel}
      </div>
      {staleCount > 0 && (
        <div className={`${chipBase} ${getStaleColor(staleCount)}`} title="Stale targets">
          {label('STALE', 'STL')}: {staleCount}
        </div>
      )}
      <div
        className={`${chipBase} ${selectionMode === 'manual' ? 'text-[#FF9800]' : 'text-white'}`}
        title="Tracking mode"
      >
        {selectionMode === 'manual' ? label('MANUAL OVERRIDE', 'MAN') : label('AUTO', 'AUT')}
      </div>
      <div className={`${chipBase} text-white`} title="Active targets">
        {label('ACTIVE', 'ACT')}: {activeCount}
      </div>
      <div className={`${chipBase} ${getAmmoColor(ammo)}`} title="Ammo count">
        {label('AMMO', 'AMM')}: {ammo}
      </div>
    </div>
  );
};
