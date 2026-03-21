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
const LOADING_SEGMENTS = 10;

const PlatformLoadingOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [filled, setFilled] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [hide, setHide] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasBeenVisible(true);
      setHide(false);
      setFadeOut(false);
      setFilled(0);
      const interval = setInterval(() => {
        setFilled((f) => {
          if (f >= LOADING_SEGMENTS - 1) {
            clearInterval(interval);
            return LOADING_SEGMENTS;
          }
          return f + 1;
        });
      }, 120);
      return () => clearInterval(interval);
    } else if (hasBeenVisible) {
      // Priority targets loaded — complete fill and fade out
      setFilled(LOADING_SEGMENTS);
      setFadeOut(true);
      const t = setTimeout(() => setHide(true), 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible, hasBeenVisible]);

  if (!hasBeenVisible && !visible) return null;
  if (hide) return null;
  if (!visible && !fadeOut) return null;

  return (
    <div
      data-testid="platform-loading-overlay"
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]"
      aria-hidden
    >
      <div
        className={`flex gap-0.5 px-4 py-3 rounded-lg bg-[#0F1929]/90 border border-[#1A3A5C] transition-opacity duration-200 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {Array.from({ length: LOADING_SEGMENTS }, (_, i) => (
          <div
            key={i}
            className="w-3 h-5 rounded-sm transition-colors duration-100"
            style={{ backgroundColor: i < filled ? '#1E90FF' : '#1A3A5C' }}
          />
        ))}
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
