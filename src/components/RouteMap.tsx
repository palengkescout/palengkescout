import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRoute, type RouteResult } from "../lib/geo";

interface RouteMapProps {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  marketName: string;
}

function makePin(color: string) {
  return L.divIcon({
    className: "",
    html: `
      <svg width="28" height="37" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z"
          fill="${color}"
        />
        <circle cx="16" cy="16" r="6.5" fill="#FFFFFF" />
      </svg>
    `,
    iconSize: [28, 37],
    iconAnchor: [14, 37],
  });
}

// Green matches the user's own pin elsewhere in the app (LocationPicker);
// gold marks the destination so the two are never confused at a glance.
const userPinIcon = makePin("#075C34");
const marketPinIcon = makePin("#075C34");

/** Fits the map view to show both pins (and the route, once it loads) without the person needing to pan/zoom manually. */
function FitToBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [points, map]);
  return null;
}

export default function RouteMap({ fromLat, fromLng, toLat, toLng, marketName }: RouteMapProps) {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeFailed, setRouteFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRouteFailed(false);
    setRoute(null);
    fetchRoute(fromLat, fromLng, toLat, toLng).then((result) => {
      if (cancelled) return;
      if (!result) {
        setRouteFailed(true);
      } else {
        setRoute(result);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fromLat, fromLng, toLat, toLng]);

  const boundsPoints: [number, number][] = route
    ? route.coordinates
    : [
        [fromLat, fromLng],
        [toLat, toLng],
      ];

  return (
    <div>
      <div className="relative isolate z-0 rounded-card overflow-hidden shadow-card" style={{ height: 200 }}>
        <MapContainer
          center={[fromLat, fromLng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[fromLat, fromLng]} icon={userPinIcon} />
          <Marker position={[toLat, toLng]} icon={marketPinIcon} />
          {route && (
            <Polyline positions={route.coordinates} pathOptions={{ color: "#075C34", weight: 4 }} />
          )}
          <FitToBounds points={boundsPoints} />
        </MapContainer>
      </div>

      <div className="flex items-center justify-between mt-2 px-0.5 gap-2">
        <p className="text-ink-faint text-xs">
          {loading
            ? "Finding the route..."
            : routeFailed
            ? "Couldn't load a driving route — showing pins only."
            : `Route to ${marketName}`}
        </p>
        {route && (
          <p className="text-ink text-xs font-semibold shrink-0">
            {route.distanceKm.toFixed(1)} km · {Math.round(route.durationMinutes)} min
          </p>
        )}
      </div>
    </div>
  );
}