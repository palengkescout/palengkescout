export const PRICE_WEIGHT = 0.65;
export const DISTANCE_WEIGHT = 0.35;

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

export function computeSmartScore(
  price: number,
  minPrice: number,
  maxPrice: number,
  distanceKm: number | null,
  minDistance: number,
  maxDistance: number
): number {
  const priceScore = normalize(price, minPrice, maxPrice);
  const distanceScore = distanceKm !== null ? normalize(distanceKm, minDistance, maxDistance) : 0.5;
  return priceScore * PRICE_WEIGHT + distanceScore * DISTANCE_WEIGHT;
}