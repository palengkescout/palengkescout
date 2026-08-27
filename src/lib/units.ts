export type UnitFamily = "mass" | "volume" | "count";

export interface UnitOption {
  value: string;
  label: string;
  family: UnitFamily;
}

export const UNIT_OPTIONS: UnitOption[] = [
  { value: "kg", label: "Kg", family: "mass" },
  { value: "g", label: "g", family: "mass" },
  { value: "liter", label: "Liter", family: "volume" },
  { value: "ml", label: "mL", family: "volume" },
  { value: "pack", label: "Pack", family: "count" },
  { value: "piece", label: "Piece", family: "count" },
  { value: "bundle", label: "Bundle", family: "count" },
  { value: "can", label: "Can", family: "count" },
  { value: "box", label: "Box", family: "count" },
  { value: "sack", label: "Sack", family: "count" },
];

// The unit each family normalizes to for comparison purposes.
const BASE_UNIT_OF_FAMILY: Record<UnitFamily, string> = {
  mass: "kg",
  volume: "liter",
  count: "",
};

const UNITS_PER_BASE: Record<string, number> = {
  kg: 1,
  g: 1000,
  liter: 1,
  ml: 1000,
};

export function getUnitFamily(unit: string): UnitFamily {
  return UNIT_OPTIONS.find((u) => u.value === unit)?.family ?? "count";
}

export function isConvertibleUnit(unit: string): boolean {
  return getUnitFamily(unit) !== "count";
}

export interface NormalizedQuantity {
  normalizedUnit: string; 
  normalizedPrice: number;
}

export function normalizeQuantity(price: number, quantity: number, unit: string): NormalizedQuantity {
  const family = getUnitFamily(unit);

  if (family === "count") {
    const normalizedPrice = quantity > 0 ? price / quantity : price;
    return { normalizedUnit: unit, normalizedPrice };
  }

  const baseUnit = BASE_UNIT_OF_FAMILY[family];
  const unitsPerBase = UNITS_PER_BASE[unit] ?? 1;
  const quantityInBaseUnit = quantity / unitsPerBase;
  const normalizedPrice = quantityInBaseUnit > 0 ? price / quantityInBaseUnit : price;
  return { normalizedUnit: baseUnit, normalizedPrice };
}