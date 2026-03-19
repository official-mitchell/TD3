/**
 * Leaflet map container. Per Implementation Plan 7.
 * Platform marker, drone markers, range circles, line of fire.
 * Vite icon fix applied for default Leaflet markers.
 */
import React from 'react';
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

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194];
const DEFAULT_ZOOM = 14;
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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
          <PlatformMarker platform={platform} />
        </>
      )}
      {platform && selectedDrone && (
        <LineOfFire platform={platform} targetDrone={selectedDrone} />
      )}
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

  return (
    <div className="h-full w-full bg-[#0F1929] min-h-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:rounded-none">
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
