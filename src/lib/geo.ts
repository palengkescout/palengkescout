/** Great-circle distance in kilometers between two lat/long points. */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface RouteResult {
  /** [lat, lng] pairs in path order — ready to hand straight to a Leaflet Polyline. */
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
}

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

/**
 * Fetches a real road-following route between two points using OSRM's free
 * public demo server — no API key, no billing, consistent with the rest of
 * this app's mapping approach.
 *
 * Note: the public demo only exposes the "driving" profile. Walking/cycling
 * routing would require self-hosting OSRM with those profiles configured —
 * a much bigger piece of infrastructure. Driving distance/time is treated
 * here as a reasonable stand-in even for short palengke trips, not as a
 * claim that this is exactly how someone will travel.
 */
export async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult | null> {
  try {
    const url = `${OSRM_BASE_URL}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const coordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );

    return {
      coordinates,
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
    };
  } catch {
    return null;
  }
}