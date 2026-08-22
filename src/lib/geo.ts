import type { Market } from "../types";

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

/**
 * Approximates "where the user is" from their chosen barangay, using the
 * average coordinates of markets already in that barangay as a stand-in
 * reference point. This is a simplification — we don't have real geocoding
 * for arbitrary addresses — but it lets us rank market distance without
 * requiring GPS permission.
 */
export function getBarangayReferencePoint(
  barangay: string,
  markets: Market[]
): { latitude: number; longitude: number } | null {
  const inBarangay = markets.filter((m) => m.barangay === barangay);
  if (inBarangay.length === 0) return null;
  const latitude = inBarangay.reduce((sum, m) => sum + m.latitude, 0) / inBarangay.length;
  const longitude = inBarangay.reduce((sum, m) => sum + m.longitude, 0) / inBarangay.length;
  return { latitude, longitude };
}