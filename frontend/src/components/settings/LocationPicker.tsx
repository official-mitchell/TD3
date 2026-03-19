/**
 * Location picker modal. Uses Nominatim (OpenStreetMap) for fuzzy location search.
 * Predefined list (Ras Laffan default, Gulf cities, etc.). Expandable Leaflet map with click-to-place pin.
 * Renders via portal at document.body with z-index 9999 to ensure it appears above Leaflet map (z ~700).
 */
import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons for Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const RAS_LAFFAN = { lat: 25.905310475056915, lng: 51.543824178558054, name: 'Ras Laffan Industrial City, Qatar' };

const PREDEFINED: Array<{ lat: number; lng: number; name: string }> = [
  RAS_LAFFAN,
  { lat: 25.2854, lng: 51.5310, name: 'Doha, Qatar' },
  { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi, UAE' },
  { lat: 25.2048, lng: 55.2708, name: 'Dubai, UAE' },
  { lat: 29.3759, lng: 47.9774, name: 'Kuwait City, Kuwait' },
  { lat: 26.4207, lng: 50.0888, name: 'Dhahran, Saudi Arabia' },
  { lat: 21.4225, lng: 39.8262, name: 'Jeddah, Saudi Arabia' },
  { lat: 37.7749, lng: -122.4194, name: 'San Francisco, USA' },
  { lat: 51.5074, lng: -0.1278, name: 'London, UK' },
];

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const SEARCH_DELAY_MS = 400;

interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

function MapClickHandler({ onPositionChange }: { onPositionChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);
  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ open, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Array<{ lat: number; lng: number; name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [position, setPosition] = useState<[number, number]>([RAS_LAFFAN.lat, RAS_LAFFAN.lng]);
  const [mapExpanded, setMapExpanded] = useState(false);

  const searchNominatim = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        format: 'json',
        limit: '8',
      });
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { 'User-Agent': 'TD3-Tactical-Dashboard/1.0' },
      });
      const data: NominatimResult[] = await res.json();
      setResults(
        data.map((r) => ({
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          name: r.display_name,
        }))
      );
    } catch (err) {
      console.error('Nominatim search failed:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  React.useEffect(() => {
    const t = setTimeout(() => searchNominatim(search), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [search, searchNominatim]);

  const handleSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
  };

  const handleApply = () => {
    onSelect(position[0], position[1]);
    onClose();
  };

  const displayResults = search.trim()
    ? results
    : PREDEFINED;

  if (!open) return null;

  const overlay = (
    <div
      data-testid="location-picker-overlay"
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        data-testid="location-picker-modal"
        className="bg-[#0F1929] border border-[#1A3A5C] rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#1A3A5C]">
          <h2 className="text-lg font-bold text-[#E8F4FD] mb-3">Change Location</h2>
          <input
            type="text"
            placeholder="Search city, address, or place…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-[#0A0E1A] border border-[#1A3A5C] rounded text-[#E8F4FD] placeholder-[#7B9BB5] text-sm font-mono"
          />
          {searching && <p className="text-xs text-[#7B9BB5] mt-1">Searching…</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[120px]">
          {displayResults.map((r) => (
            <button
              key={`${r.lat}-${r.lng}-${r.name}`}
              onClick={() => handleSelect(r.lat, r.lng)}
              className={`w-full text-left px-3 py-2 rounded text-sm font-mono transition-colors ${
                position[0] === r.lat && position[1] === r.lng
                  ? 'bg-[#1E90FF]/30 border border-[#1E90FF] text-[#E8F4FD]'
                  : 'bg-[#0A0E1A] border border-[#1A3A5C] text-[#E8F4FD] hover:border-[#1E90FF]/50'
              }`}
            >
              <span className="text-[#7B9BB5]">{r.name}</span>
              <span className="ml-2 text-xs text-[#7B9BB5]">
                {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#1A3A5C] space-y-3">
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className="text-sm text-[#1E90FF] hover:underline font-mono"
          >
            {mapExpanded ? '▲ Collapse map' : '▼ Expand map (click to place pin)'}
          </button>
          {mapExpanded && (
            <div className="h-64 rounded overflow-hidden border border-[#1A3A5C]">
              <MapContainer
                center={position}
                zoom={12}
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <Marker position={position} />
                <MapCenterUpdater center={position} />
                <MapClickHandler onPositionChange={(lat, lng) => setPosition([lat, lng])} />
              </MapContainer>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm font-mono text-[#7B9BB5] hover:bg-[#1A3A5C]"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded text-sm font-mono bg-[#1E90FF] text-white hover:bg-[#1a7de8]"
            >
              Apply Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
