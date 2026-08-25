interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

const PALETTE = [
  "#075C34", // palengke green
  "#C5211C", // palengke red
  "#0F6B3E", // green light
  "#A31A16", // red dark
  "#4E5C53", // ink soft
  "#E0AC00", // gold dark
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function Avatar({ name, size = 40, className = "" }: AvatarProps) {
  const trimmed = name.trim();
  const initial = trimmed ? trimmed[0].toUpperCase() : "?";
  const color = PALETTE[hashString(trimmed || "?") % PALETTE.length];

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-display text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}