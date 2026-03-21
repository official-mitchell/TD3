/**
 * Debug drawer overlay. Per Implementation Plan Presentation 5.1–5.7.
 * Right-side persistent drawer, 320px, five collapsible sections:
 * Socket Health, Event Rate, Target State (expanded), Engagement State, Event Log (collapsed).
 */
import React, { useRef, useEffect, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import { useUIStore } from '../../store/uiStore';
import { useConnectionStore } from '../../store/connectionStore';
import { useDebugStore } from '../../store/debugStore';
import { useTargetStore } from '../../store/targetStore';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import type { DebugLogEntry, DebugSeverity } from '@td3/shared-types';

const DRAWER_WIDTH = 320;
const FONT_SIZE = 11;
const MONO = { fontFamily: 'JetBrains Mono, monospace', fontSize: FONT_SIZE };
const BG = 'rgba(0, 0, 0, 0.9)';

const EVENT_ORDER = [
  'drone:update',
  'drone:status',
  'drone:hit',
  'drone:missed',
  'drone:destroyed',
  'platform:status',
];

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function getStatusColor(status: string): string {
  if (status === 'Connected') return '#4CAF50';
  if (status === 'Degraded') return '#FF9800';
  return '#f44336';
}

function getSeverityColor(severity: DebugSeverity): string {
  if (severity === 'alert') return '#4CAF50';
  if (severity === 'warn') return '#FF9800';
  return 'rgba(255, 255, 255, 0.7)';
}

function getLatencyColor(ms: number | null): string {
  if (ms === null) return '#fff';
  if (ms > 500) return '#f44336';
  if (ms > 150) return '#FF9800';
  return '#fff';
}

function barChart(rate: number, max: number): string {
  if (max <= 0) return '░░░░░░░░░░';
  const filled = Math.round((rate / max) * 10);
  return '█'.repeat(Math.min(10, filled)) + '░'.repeat(10 - Math.min(10, filled));
}

export const DebugDrawer: React.FC = () => {
  const debugDrawerOpen = useUIStore((s) => s.debugDrawerOpen);
  const setDebugDrawer = useUIStore((s) => s.setDebugDrawer);
  const setMode = useUIStore((s) => s.setMode);

  const connectionStatus = useConnectionStore((s) => s.status);
  const socketId = useDebugStore((s) => s.socketId);
  const reconnectAttempts = useDebugStore((s) => s.reconnectAttempts);
  const lastHeartbeatAt = useDebugStore((s) => s.lastHeartbeatAt);
  const latencyMs = useDebugStore((s) => s.latencyMs);
  const eventRates = useDebugStore((s) => s.eventRates);
  const eventLog = useDebugStore((s) => s.eventLog);
  const clearLog = useDebugStore((s) => s.clearLog);
  const pendingFire = useDebugStore((s) => s.pendingFire);
  const pendingFireSince = useDebugStore((s) => s.pendingFireSince);
  const lastFireAt = useDebugStore((s) => s.lastFireAt);
  const lastOutcome = useDebugStore((s) => s.lastOutcome);

  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const selectionMode = useTargetStore((s) => s.selectionMode);
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isLogPaused, setIsLogPaused] = useState(false);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);

  const handleClose = () => {
    setDebugDrawer(false);
    setMode('operator');
  };

  // Auto-scroll event log when not paused (5.6.4)
  useEffect(() => {
    if (!isLogPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [eventLog, isLogPaused]);

  // LAST UPDATED ms delta on 100ms interval (5.4)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!selectedDroneId) {
        setLastUpdatedMs(null);
        return;
      }
      const drone = drones.get(selectedDroneId);
      if (!drone?.lastUpdated) {
        setLastUpdatedMs(null);
        return;
      }
      setLastUpdatedMs(Date.now() - new Date(drone.lastUpdated).getTime());
    }, 100);
    return () => clearInterval(interval);
  }, [selectedDroneId, drones]);

  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : null;
  const confirmedCount = Array.from(drones.values()).filter(
    (d) => d.status === 'Confirmed' || d.status === 'Engagement Ready'
  ).length;
  const engagementReadyCount = Array.from(drones.values()).filter(
    (d) => d.status === 'Engagement Ready'
  ).length;

  const maxRate = Math.max(1, ...EVENT_ORDER.map((e) => eventRates[e] ?? 0));
  const dronesExist = drones.size > 0;

  // PENDING FIRE red when > 2s (5.5.1)
  const pendingFireStale =
    pendingFire && pendingFireSince && Date.now() - pendingFireSince > 2000;

  const accordionSx = {
    backgroundColor: 'transparent',
    '&:before': { display: 'none' },
    '&.Mui-expanded': { margin: 0 },
  };
  const summarySx = { minHeight: 36, '& .MuiAccordionSummary-content': { margin: 0 } };
  const detailsSx = { pt: 0, pb: 1 };

  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={debugDrawerOpen}
      sx={{
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          backgroundColor: BG,
          ...MONO,
          zIndex: 1300,
          borderLeft: '1px solid #1A3A5C',
        },
      }}
    >
      <div className="flex flex-col h-full p-4 text-[#E8F4FD]" style={MONO} data-testid="debug-drawer">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">DEBUG</span>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: '#7B9BB5' }}
            aria-label="Close debug drawer"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* 5.2 Socket Health */}
          <Accordion defaultExpanded sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#7B9BB5' }} />} sx={summarySx}>
              <span style={MONO}>Socket Health</span>
            </AccordionSummary>
            <AccordionDetails sx={detailsSx}>
              <Box component="pre" sx={{ ...MONO, margin: 0, whiteSpace: 'pre-wrap' }}>
                {[
                  { label: 'STATUS', value: connectionStatus, color: getStatusColor(connectionStatus) },
                  { label: 'SOCKET ID', value: socketId ?? '—', color: '#fff' },
                  { label: 'RECONNECTS', value: String(reconnectAttempts), color: '#fff' },
                  {
                    label: 'LAST HEARTBEAT',
                    value: lastHeartbeatAt ? `${lastHeartbeatAt} (${formatTimeAgo(lastHeartbeatAt)})` : '—',
                    color: '#fff',
                  },
                  {
                    label: 'LATENCY',
                    value: latencyMs !== null ? `${latencyMs}ms` : '—',
                    color: getLatencyColor(latencyMs),
                  },
                ].map((r) => (
                  <div key={r.label}>
                    {r.label}: <span style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 5.3 Event Rate */}
          <Accordion defaultExpanded sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#7B9BB5' }} />} sx={summarySx}>
              <span style={MONO}>Event Rate</span>
            </AccordionSummary>
            <AccordionDetails sx={detailsSx}>
              <Box component="pre" sx={{ ...MONO, margin: 0, whiteSpace: 'pre-wrap' }}>
                {EVENT_ORDER.map((e) => {
                  const rate = eventRates[e] ?? 0;
                  let color = '#fff';
                  if (e === 'drone:update') {
                    color = rate > 0 ? '#4CAF50' : dronesExist ? '#f44336' : '#FF9800';
                  } else if (e === 'drone:hit' || e === 'drone:destroyed') {
                    color = rate > 0 ? '#4CAF50' : '#fff';
                  } else if (e === 'drone:missed') {
                    color = rate > 0 ? '#FF9800' : '#fff';
                  } else if (rate === 0 && dronesExist && e === 'drone:update') {
                    color = '#FF9800';
                  }
                  return (
                    <div key={e} style={{ color }}>
                      {e} {barChart(rate, maxRate)} {rate}/10s
                    </div>
                  );
                })}
                <div style={{ marginTop: 4, color: '#7B9BB5' }}>WINDOW: rolling 10s</div>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 5.4 Target State */}
          <Accordion defaultExpanded sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#7B9BB5' }} />} sx={summarySx}>
              <span style={MONO}>Target State</span>
            </AccordionSummary>
            <AccordionDetails sx={detailsSx}>
              <Box component="pre" sx={{ ...MONO, margin: 0, whiteSpace: 'pre-wrap' }}>
                {[
                  { label: 'SELECTED ID', value: selectedDroneId ?? '—' },
                  { label: 'SELECTION MODE', value: selectionMode === 'manual' ? 'MANUAL' : 'AUTO' },
                  { label: 'SELECTED STATUS', value: selectedDrone?.status ?? '—' },
                  {
                    label: 'LAST UPDATED',
                    value:
                      selectedDrone?.lastUpdated && lastUpdatedMs !== null
                        ? `${selectedDrone.lastUpdated} (${lastUpdatedMs}ms)`
                        : selectedDrone?.lastUpdated ?? '—',
                  },
                  { label: 'CONFIRMED COUNT', value: String(confirmedCount) },
                  { label: 'ENGAGEMENT READY', value: String(engagementReadyCount) },
                  { label: 'DRONE MAP SIZE', value: String(drones.size) },
                ].map((r) => (
                  <div key={r.label}>
                    {r.label}: {r.value}
                  </div>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 5.5 Engagement State */}
          <Accordion defaultExpanded={false} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#7B9BB5' }} />} sx={summarySx}>
              <span style={MONO}>Engagement State</span>
            </AccordionSummary>
            <AccordionDetails sx={detailsSx}>
              <Box component="pre" sx={{ ...MONO, margin: 0, whiteSpace: 'pre-wrap' }}>
                {[
                  {
                    label: 'PENDING FIRE',
                    value: pendingFire ? 'YES' : 'NO',
                    color: pendingFireStale ? '#f44336' : pendingFire ? '#FF9800' : '#fff',
                  },
                  {
                    label: 'LAST FIRE',
                    value: lastFireAt ? `${lastFireAt} (${formatTimeAgo(lastFireAt)})` : '—',
                    color: '#fff',
                  },
                  {
                    label: 'LAST OUTCOME',
                    value: lastOutcome ?? '—',
                    color: lastOutcome === 'Hit' ? '#4CAF50' : lastOutcome === 'Missed' ? '#FF9800' : '#fff',
                  },
                  { label: 'KILL COUNT', value: String(platform?.killCount ?? 0), color: '#fff' },
                  { label: 'AMMO REMAINING', value: String(platform?.ammoCount ?? 0), color: '#fff' },
                ].map((r) => (
                  <div key={r.label}>
                    {r.label}: <span style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 5.6 Event Log */}
          <Accordion defaultExpanded={false} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#7B9BB5' }} />} sx={summarySx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={MONO}>Event Log</span>
                <Box
                  component="span"
                  role="button"
                  tabIndex={0}
                  data-testid="debug-clear-log"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearLog();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      clearLog();
                    }
                  }}
                  sx={{ minWidth: 0, fontSize: 10, py: 0, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  CLEAR
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={detailsSx}>
              <div
                ref={logContainerRef}
                data-testid="debug-event-log"
                onMouseEnter={() => setIsLogPaused(true)}
                onMouseLeave={() => setIsLogPaused(false)}
                style={{
                  height: 240,
                  overflowY: 'auto',
                  ...MONO,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {[...eventLog].reverse().map((entry: DebugLogEntry) => (
                  <div
                    key={entry.id}
                    style={{ color: getSeverityColor(entry.severity) }}
                  >
                    {formatTimeShort(entry.timestamp)} [{entry.event}] {entry.payload}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 4, color: '#7B9BB5', fontSize: 10 }}>
                SHOWING LAST 50 EVENTS
              </div>
            </AccordionDetails>
          </Accordion>
        </Box>
      </div>
    </Drawer>
  );
};
