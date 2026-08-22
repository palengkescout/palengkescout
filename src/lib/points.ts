const POINTS_KEY = "palengkescout_points_v1";

export const POINTS_FOR_REPORT = 5;
export const POINTS_FOR_PHOTO = 10;

export function getTotalPoints(): number {
  const raw = localStorage.getItem(POINTS_KEY);
  return raw ? Number(raw) || 0 : 0;
}

export function addPoints(amount: number): number {
  const total = getTotalPoints() + amount;
  localStorage.setItem(POINTS_KEY, String(total));
  return total;
}