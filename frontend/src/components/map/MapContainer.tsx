/**
 * Leaflet map container. Per Implementation Plan 7.
 * Platform marker (IFV + minigun turret), drone markers, range circles (2km/5km), line of fire.
 * Fallback platform ensures IFV, turret, range circles always visible before socket connects.
 * Loading overlay: 10-segment bar centered over map, fades only when priority targets have loaded
 *   (platform + socket connected). TelemetryOverlay: floating mini dashboard over map when drone selected.
 * MapFireButton: centered at bottom, Cmd/Ctrl+Enter, glowing + recoil animation.
 * TracerOverlay: dotted lines + hit/miss markers. AccuracyCone: range cone aligned with turret.
 * DyingDroneOverlay: shown when showDyingDrones (uiStore, default true).
 * SelectTargetHint: single message when no target selected (create targets or select from map/list).
 * Loading overlay now waits for sounds + platform + socket (loadingStore). QA metrics reported to backend.
 * Loading overlay: 8s session, approximate % progress during load, anticipates longer loads.
 *
 * --- Changelog ---
 * 2025-03-23: Longer load session (8s), time-based progress, approximate % display during load.
 * 2025-03-23: Looping shimmer bar that fills to progress %, total % over top.
 * 2025-03-23: Larger load bar; singular loading log beneath (architecture layer names).
 */
import React, { useState, useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, ZoomControl, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { useUIStore } from '../../store/uiStore';
import { useLoadingStore } from '../../store/loadingStore';
import { useHighlight } from '../../hooks/useHighlight';
import { PlatformMarker } from './PlatformMarker';
import { DroneMarker } from './DroneMarker';
import { RangeCircles } from './RangeCircles';
import { LineOfFire } from './LineOfFire';
import { TelemetryOverlay } from './TelemetryOverlay';
import { MapFireButton } from './MapFireButton';
import { SelectTargetHint } from './SelectTargetHint';
import { AmmoOverlay } from './AmmoOverlay';
import { DyingDroneOverlay } from './DyingDroneOverlay';
import { TracerOverlay } from './TracerOverlay';
import { AccuracyCone } from './AccuracyCone';
import { FlightTrailOverlay } from './FlightTrailOverlay';

// 7.1.2 Vite pitfall: fix Leaflet default marker icon 404s
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Ras Laffan Industrial City, Qatar */
const DEFAULT_CENTER: [number, number] = [25.905310475056915, 51.543824178558054];
const DEFAULT_ZOOM = 14;

/** Fallback platform so IFV, turret, range circles always visible even before socket connects */
const FALLBACK_PLATFORM = {
  position: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] },
  heading: 0,
  isActive: false,
  ammoCount: 0,
  killCount: 0,
};
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

/** Expected max load duration; bar reaches ~95% over this session to anticipate longer loads */
const EXPECTED_LOAD_SESSION_MS = 8000;
const PROGRESS_CAP_PERCENT = 95;
const TICK_MS = 80;

function computeProgressPercent(
  loadStartMs: number | null,
  allReady: boolean,
  now: number
): number {
  if (allReady) return 100;
  const start = loadStartMs ?? now;
  const elapsed = Math.max(0, now - start);
  const raw = (elapsed / EXPECTED_LOAD_SESSION_MS) * 100;
  return Math.min(PROGRESS_CAP_PERCENT, Math.round(raw));
}

const PlatformLoadingOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  const loadStartMs = useLoadingStore((s) => s.loadStartMs);
  const allReady = useLoadingStore((s) => s.allReady());
  const soundsReady = useLoadingStore((s) => s.soundsReady);
  const platformReady = useLoadingStore((s) => s.platformReady);
  const socketReady = useLoadingStore((s) => s.socketReady);
  const [progressPercent, setProgressPercent] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [hide, setHide] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasBeenVisible(true);
      setHide(false);
      setFadeOut(false);
      setProgressPercent(0);

      const interval = setInterval(() => {
        const now = performance.now();
        const pct = computeProgressPercent(loadStartMs, allReady, now);
        setProgressPercent(pct);
      }, TICK_MS);
      return () => clearInterval(interval);
    } else if (hasBeenVisible) {
      setProgressPercent(100);
      setFadeOut(true);
      const t = setTimeout(() => setHide(true), 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible, hasBeenVisible, loadStartMs, allReady]);

  if (!hasBeenVisible && !visible) return null;
  if (hide) return null;
  if (!visible && !fadeOut) return null;

  // Per-resource loading log, mapped to architecture layers (Systems View). First pending item shown.
  const pendingLog =
    !platformReady ? 'Loading database…' : !socketReady ? 'Connecting Socket.IO Gateway…' : !soundsReady ? 'Loading audio…' : null;

  return (
    <div
      data-testid="platform-loading-overlay"
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]"
      aria-hidden
    >
      <div
        className={`relative flex flex-col items-center gap-4 px-6 py-5 rounded-lg bg-[#0F1929]/90 border border-[#1A3A5C] transition-opacity duration-200 min-w-[280px] ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Total load percentage over top */}
        <div
          className="text-center text-lg font-semibold text-slate-200 tabular-nums z-10"
          data-testid="loading-percent"
        >
          Loading {progressPercent}%
        </div>
        {/* Bar that fills up to progress % with looping shimmer — larger */}
        <div className="relative w-full h-5 rounded-full bg-[#1A3A5C] overflow-hidden min-w-[240px]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#1E90FF] transition-[width] duration-150 ease-out loading-bar-shimmer"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Singular loading log item — architecture layer we're awaiting */}
        {pendingLog && (
          <div className="text-center text-xs text-slate-400 font-medium" data-testid="loading-log">
            {pendingLog}
          </div>
        )}
      </div>
    </div>
  );
};

/** Listens for td3:capture-map-state, captures Leaflet center/zoom, calls setMode. Per Implementation Plan Presentation 3.1.3. */
const MapCaptureHandler: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      useUIStore.getState().setMode('systems-view', {
        mapCenter: [center.lat, center.lng],
        zoom,
      });
    };
    window.addEventListener('td3:capture-map-state', handler);
    return () => window.removeEventListener('td3:capture-map-state', handler);
  }, [map]);
  return null;
};

/** Click on map (not on drone) deselects target. Per Frontend Fix 708. */
const MapClickToDeselect: React.FC = () => {
  const setSelected = useTargetStore((s) => s.setSelected);

  useMapEvents({
    click: (e) => {
      const target = e.originalEvent?.target as HTMLElement | undefined;
      if (target?.closest?.('.td3-drone-marker')) return;
      setSelected(null);
    },
  });
  return null;
};

const MapContent: React.FC = () => {
  const platform = usePlatformStore((s) => s.platform);
  const drones = useDroneStore((s) => s.drones);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const showDyingDrones = useUIStore((s) => s.showDyingDrones);

  const effectivePlatform = platform ?? FALLBACK_PLATFORM;

  const droneList = Array.from(drones.values()).filter(
    (d) => d.status !== 'Hit' && d.status !== 'Destroyed'
  );
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) ?? null : null;

  return (
    <>
      <MapCaptureHandler />
      <MapClickToDeselect />
      <RangeCircles platform={effectivePlatform} />
      <AccuracyCone />
      <PlatformMarker platform={effectivePlatform} targetDrone={selectedDrone} />
      {platform && selectedDrone && (
        <LineOfFire platform={effectivePlatform} targetDrone={selectedDrone} />
      )}
      <TelemetryOverlay />
      <TracerOverlay />
      <FlightTrailOverlay />
      {droneList.map((drone) => (
        <DroneMarker
          key={drone.droneId}
          drone={drone}
          isSelected={drone.droneId === selectedDroneId}
          isDying={false}
        />
      ))}
      {showDyingDrones && <DyingDroneOverlay />}
    </>
  );
};

export const MapContainer: React.FC = () => {
  const allReady = useLoadingStore((s) => s.soundsReady && s.platformReady && s.socketReady);
  const loading = !allReady;
  const preSystemsState = useUIStore((s) => s.preSystemsState);
  const { isHighlighted: droneIconsHighlighted } = useHighlight('drone-icons');

  const initialCenter = preSystemsState?.mapCenter ?? DEFAULT_CENTER;
  const initialZoom = preSystemsState?.zoom ?? DEFAULT_ZOOM;

  return (
    <div
      className={`relative h-full w-full bg-[#0F1929] min-h-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:rounded-none ${
        droneIconsHighlighted ? 'drone-icons-highlighted' : ''
      }`}
    >
      <PlatformLoadingOverlay visible={loading} />
      <AmmoOverlay />
      <SelectTargetHint />
      <MapFireButton />
      <LeafletMap
        center={initialCenter}
        zoom={initialZoom}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url={TILE_URL} />
        <ZoomControl position="bottomright" />
        <MapContent />
      </LeafletMap>
    </div>
  );
};
