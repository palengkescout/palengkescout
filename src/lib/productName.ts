export function isValidProductName(rawName: string, itemName?: string): boolean {
  const name = rawName.trim();

  if (name.length < 3) return false;
  if (!/[a-zA-Z]/.test(name)) return false;

  const collapsed = name.replace(/\s+/g, "");
  if (/^(.)\1*$/.test(collapsed)) return false;

  if (itemName && name.toLowerCase() === itemName.trim().toLowerCase()) return false;

  return true;
}