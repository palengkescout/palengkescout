import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icon paths don't resolve correctly under Vite's
// bundler out of the box — rebuilding the icon from the package's own
// bundled images is the standard fix, otherwise the pin renders as a
// broken image.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const pinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Center shown before the user has picked a point (defaults to Calamba, PH). */
  defaultCenter?: [number, number];
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  defaultCenter = [14.2117, 121.1653],
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    latitude !== null && longitude !== null ? [latitude, longitude] : null
  );

  function handlePick(lat: number, lng: number) {
    setPosition([lat, lng]);
    onChange(lat, lng);
  }

  return (
    <div className="rounded-xl overflow-hidden border border-black/5" style={{ height: 220 }}>
      <MapContainer
        center={position ?? defaultCenter}
        zoom={position ? 15 : 13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={handlePick} />
        {position && <Marker position={position} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}