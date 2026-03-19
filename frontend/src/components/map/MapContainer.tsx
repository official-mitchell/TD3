/**
 * Leaflet map container. Per Implementation Plan 7.
 * Platform marker, drone markers, range circles, line of fire.
 * Loading overlay: 10-segment bar centered over map, fades out at 100%.
 * TelemetryOverlay: floating mini dashboard over map when drone selected.
 */
import React, { useState, useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { PlatformMarker } from './PlatformMarker';
import { DroneMarker } from './DroneMarker';
import { RangeCircles } from './RangeCircles';
import { LineOfFire } from './LineOfFire';
import { TelemetryOverlay } from './TelemetryOverlay';

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
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LOADING_SEGMENTS = 10;

const PlatformLoadingOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [filled, setFilled] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setHide(false);
    setFadeOut(false);
    setFilled(0);
    const interval = setInterval(() => {
      setFilled((f) => {
        if (f >= LOADING_SEGMENTS - 1) {
          clearInterval(interval);
          setFadeOut(true);
          setTimeout(() => setHide(true), 250);
          return LOADING_SEGMENTS;
        }
        return f + 1;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || hide) return null;

  return (
    <div
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

const ChangeCenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);
  return null;
};

const MapContent: React.FC = () => {
  const platform = usePlatformStore((s) => s.platform);
  const drones = useDroneStore((s) => s.drones);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);

  const center: [number, number] = platform
    ? [platform.position.lat, platform.position.lng]
    : DEFAULT_CENTER;

  const droneList = Array.from(drones.values());
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) ?? null : null;

  return (
    <>
      <ChangeCenter center={center} />
      {platform && (
        <>
          <RangeCircles platform={platform} />
          <PlatformMarker platform={platform} targetDrone={selectedDrone} />
        </>
      )}
      {platform && selectedDrone && (
        <LineOfFire platform={platform} targetDrone={selectedDrone} />
      )}
      <TelemetryOverlay />
      {droneList.map((drone) => (
        <DroneMarker
          key={drone.droneId}
          drone={drone}
          isSelected={drone.droneId === selectedDroneId}
        />
      ))}
    </>
  );
};

export const MapContainer: React.FC = () => {
  const platform = usePlatformStore((s) => s.platform);
  const center: [number, number] = platform
    ? [platform.position.lat, platform.position.lng]
    : DEFAULT_CENTER;

  const platformLoading = platform === null;

  return (
    <div className="relative h-full w-full bg-[#0F1929] min-h-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:rounded-none">
      <PlatformLoadingOverlay visible={platformLoading} />
      <LeafletMap
        center={center}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url={TILE_URL} />
        <MapContent />
      </LeafletMap>
    </div>
  );
};
