/**
 * Status cards per Implementation Plan 8.1–8.6.
 * Data bindings: platformStore, connectionStore, droneStore, engagementLogStore.
 * System block, position block, engagement statistics, connection status badge.
 */
import React, { useEffect, useState } from 'react';
import { usePlatformStore } from '../../store/platformStore';
import { useConnectionStore } from '../../store/connectionStore';
import { useDroneStore } from '../../store/droneStore';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import { MINIGUN_STATS } from '../../utils/constants';

const StatusCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 min-w-0 overflow-hidden">
    <div className="flex items-center gap-2 mb-3 min-w-0">
      <span className="text-cyan-400 flex-shrink-0">★</span>
      <span className="text-sm text-slate-400 truncate">{title}</span>
    </div>
    <div className="min-w-0 overflow-hidden break-words">{children}</div>
  </div>
);

const formatLat = (lat: number) => lat.toFixed(4);
const formatLng = (lng: number) => lng.toFixed(4);
const formatHdg = (hdg: number) => `${hdg.toFixed(1)}°`;

export const StatusCards: React.FC = () => {
  const platform = usePlatformStore((s) => s.platform);
  const status = useConnectionStore((s) => s.status);
  const lastHeartbeat = useConnectionStore((s) => s.lastHeartbeat);
  const simulationRate = useConnectionStore((s) => s.simulationRate);
  const drones = useDroneStore((s) => s.drones);
  const log = useEngagementLogStore((s) => s.log);

  const [offlineElapsed, setOfflineElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'Offline' || lastHeartbeat === null) {
      setOfflineElapsed(null);
      return;
    }
    const tick = () => {
      setOfflineElapsed(Math.floor((Date.now() - lastHeartbeat) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, lastHeartbeat]);

  const droneList = Array.from(drones.values());
  const detectedCount = droneList.filter((d) => d.status === 'Detected').length;
  const identifiedCount = droneList.filter((d) => d.status === 'Identified').length;
  const confirmedCount = droneList.filter(
    (d) => d.status === 'Confirmed' || d.status === 'Engagement Ready'
  ).length;

  const turretBadge = (() => {
    if (!platform || !platform.isActive) return { text: 'OFFLINE', color: 'bg-red-500' };
    if (platform.ammoCount < 50) return { text: 'LOW AMMO', color: 'bg-amber-500' };
    return { text: 'OPERATIONAL', color: 'bg-green-500' };
  })();

  const connectionDotColor =
    status === 'Connected' ? '#00C853' : status === 'Degraded' ? '#FFB300' : '#FF1744';

  return (
    <div className="grid grid-cols-2 gap-3 min-w-0">
      <StatusCard title="Weapon System">
        <div className="space-y-1">
          <div className="text-lg font-medium">XM914E1</div>
          <div className="text-sm text-slate-400">3rd Marine Brigade</div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${turretBadge.color}`}
            >
              {turretBadge.text}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-500 space-y-0.5">
            <div>ROF: {MINIGUN_STATS.RATE_OF_FIRE_SHOTS_PER_MIN}/min</div>
            <div>Muzzle: {MINIGUN_STATS.MUZZLE_VELOCITY_M_S} m/s</div>
            <div>Effective: {MINIGUN_STATS.EFFECTIVE_RANGE_M} m</div>
            <div>Max range: {MINIGUN_STATS.MAX_RANGE_M} m</div>
          </div>
        </div>
      </StatusCard>

      <StatusCard title="Position">
        <div className="grid grid-rows-3 gap-1">
          {platform ? (
            <>
              <div className="text-sm">
                LAT: <span className="text-cyan-400">{formatLat(platform.position.lat)}</span>
              </div>
              <div className="text-sm">
                LNG: <span className="text-cyan-400">{formatLng(platform.position.lng)}</span>
              </div>
              <div className="text-sm">
                HDG: <span className="text-cyan-400">{formatHdg(platform.heading)}</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>
      </StatusCard>

      <StatusCard title="Engagement">
        <div className="space-y-1 text-sm">
          {platform ? (
            <>
              <div>
                DETECTED: <span className="text-cyan-400">{detectedCount}</span>
              </div>
              <div>
                IDENTIFIED: <span className="text-cyan-400">{identifiedCount}</span>
              </div>
              <div>
                CONFIRMED: <span className="text-cyan-400">{confirmedCount}</span>
              </div>
              <div>
                KILLS: <span className="text-cyan-400" data-testid="kills-count">{platform.killCount}</span>
              </div>
              <div>
                ENGAGEMENTS: <span className="text-cyan-400">{log.length}</span>
              </div>
              <div>
                AMMO:{' '}
                <span
                  className={
                    platform.ammoCount < 50 ? 'text-amber-400' : 'text-cyan-400'
                  }
                  data-testid="ammo-count"
                >
                  {platform.ammoCount}
                </span>
              </div>
            </>
          ) : (
            <div className="text-slate-500">—</div>
          )}
        </div>
      </StatusCard>

      <StatusCard title="Connection">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: connectionDotColor,
                animation: status === 'Degraded' ? 'connection-blink 1s ease-in-out infinite' : undefined,
              }}
            />
            <span className="text-sm" data-testid="connection-status">
              {status === 'Offline' && lastHeartbeat !== null && offlineElapsed !== null
                ? `LAST CONTACT: ${offlineElapsed}s ago`
                : status}
            </span>
          </div>
          {simulationRate > 0 && (
            <div className="text-xs text-slate-500" data-testid="simulation-rate">
              {simulationRate} drone updates/s
            </div>
          )}
        </div>
      </StatusCard>
    </div>
  );
};
