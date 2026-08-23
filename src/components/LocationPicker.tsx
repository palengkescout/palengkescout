import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

// Default view centers on Metro Manila when no pin has been placed yet.
const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];
const DEFAULT_ZOOM = 12;
const PINNED_ZOOM = 16;

// Custom pin in brand green — avoids Leaflet's default marker, which also
// has a well-known broken-image-path issue when bundled with Vite.
const pinIcon = L.divIcon({
  className: "",
  html: `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z"
        fill="#075C34"
      />
      <circle cx="16" cy="16" r="6.5" fill="#FEC502" />
    </svg>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42], // tip of the pin points at the exact coordinate
});

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const hasPin = latitude !== null && longitude !== null;

  // Only computed once per mount so the map doesn't recenter itself and
  // fight the user while they're actively panning/zooming around.
  const initialCenter = useMemo<[number, number]>(
    () => (hasPin ? [latitude, longitude] : DEFAULT_CENTER),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const initialZoom = hasPin ? PINNED_ZOOM : DEFAULT_ZOOM;

  return (
    <div>
      {/* isolate + z-0 pins Leaflet's internal stacking (map panes, zoom
          controls, etc. use z-index values up to 1000) to this box only —
          nothing inside can ever climb above sibling UI outside it, like
          the Dropdown menu that was rendering behind the map. */}
      <div
        className="relative isolate z-0 rounded-card overflow-hidden shadow-card"
        style={{ height: 220 }}
      >
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          {hasPin && <Marker position={[latitude, longitude]} icon={pinIcon} />}
        </MapContainer>
      </div>

      <p className="text-ink-faint text-xs mt-2">
        {hasPin
          ? `Pinned: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          : "Tap anywhere on the map to drop a pin at the market's location."}
      </p>
    </div>
  );
}