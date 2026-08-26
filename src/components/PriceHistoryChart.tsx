import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PriceRowData } from "../types";
import { formatPeso } from "../lib/format";

interface PriceHistoryChartProps {
  rows: PriceRowData[]; // any order — grouped and aggregated by day internally
}

const WIDTH = 320;
const HEIGHT = 96;
const PADDING_X = 8;
const PADDING_Y = 12;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function manilaDateKey(iso: string): string {
  return new Date(new Date(iso).getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Every day from this Manila week's Monday through today (inclusive) —
 * this is what makes the chart "reset" each week: next Monday, this list
 * starts over at a single slot instead of continuing to grow. */
function currentWeekSlots(): { key: string; label: string }[] {
  const manilaNow = new Date(Date.now() + MANILA_OFFSET_MS);
  const day = manilaNow.getUTCDay(); // 0 Sun .. 6 Sat, on the shifted clock
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(manilaNow);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(manilaNow.getUTCDate() - diffToMonday);

  const todayKey = manilaNow.toISOString().slice(0, 10);
  const slots: { key: string; label: string }[] = [];
  const cursor = new Date(monday);
  while (cursor.toISOString().slice(0, 10) <= todayKey) {
    slots.push({ key: cursor.toISOString().slice(0, 10), label: WEEKDAY_LABELS[cursor.getUTCDay()] });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return slots;
}

export default function PriceHistoryChart({ rows }: PriceHistoryChartProps) {
  const { slots, dayValues } = useMemo(() => {
    const slots = currentWeekSlots();
    const slotKeys = new Set(slots.map((s) => s.key));

    const byDay = new Map<string, number[]>();
    for (const r of rows) {
      if (r.status === "flagged") continue; // don't let an unverified outlier shape the trend
      const key = manilaDateKey(r.reportedAt);
      if (!slotKeys.has(key)) continue; // only this Manila week
      const list = byDay.get(key) ?? [];
      list.push(r.price);
      byDay.set(key, list);
    }

    const dayValues = slots.map((s) => {
      const prices = byDay.get(s.key);
      return prices && prices.length > 0 ? median(prices) : null;
    });

    return { slots, dayValues };
  }, [rows]);

  const daysWithData = dayValues.filter((v): v is number => v !== null);
  if (daysWithData.length < 2) return null;

  const minPrice = Math.min(...daysWithData);
  const maxPrice = Math.max(...daysWithData);
  const range = maxPrice - minPrice || 1;

  const points = dayValues.map((price, i) => {
    if (price === null) return null;
    const x = slots.length > 1 ? PADDING_X + (i / (slots.length - 1)) * (WIDTH - PADDING_X * 2) : WIDTH / 2;
    const y = PADDING_Y + (1 - (price - minPrice) / range) * (HEIGHT - PADDING_Y * 2);
    return { x, y, price };
  });

  // Only connect adjacent days that BOTH have data — a gap (a day with no
  // reports) breaks the line rather than pretending to interpolate through
  // missing data.
  const segments: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a && b) segments.push({ a, b });
  }

  const first = daysWithData[0];
  const last = daysWithData[daysWithData.length - 1];
  const overallUp = last > first;
  const overallDown = last < first;
  const percentChange = first === 0 ? 0 : ((last - first) / first) * 100;
  const trendColorClass = overallUp ? "text-fresh-red" : overallDown ? "text-fresh-green" : "text-ink-faint";
  const lineColorClass = overallUp ? "stroke-fresh-red" : overallDown ? "stroke-fresh-green" : "stroke-ink-faint";

  return (
    <div className="bg-white rounded-card shadow-card p-3.5 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-ink-faint text-xs font-medium">Price history · this week</p>
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendColorClass}`}>
          {overallUp ? (
            <TrendingUp size={14} strokeWidth={2.4} />
          ) : overallDown ? (
            <TrendingDown size={14} strokeWidth={2.4} />
          ) : (
            <Minus size={14} strokeWidth={2.4} />
          )}
          {percentChange === 0 ? "No change" : `${percentChange > 0 ? "+" : ""}${percentChange.toFixed(1)}%`}
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-24" preserveAspectRatio="none">
        {segments.map((seg, i) => (
          <line
            key={i}
            x1={seg.a.x}
            y1={seg.a.y}
            x2={seg.b.x}
            y2={seg.b.y}
            className={lineColorClass}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}
        {points.map(
          (point, i) =>
            point && (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={2.5}
                fill="white"
                className="stroke-palengke-green"
                strokeWidth={1.5}
              />
            )
        )}
      </svg>

      {/* Weekday tick labels — every day of the current week gets a label,
          even ones with no report, so a gap in the line reads as "no data
          that day" rather than looking like a rendering glitch. */}
      <div className="flex justify-between px-1 mt-0.5">
        {slots.map((s) => (
          <span key={s.key} className="text-[10px] text-ink-faint">
            {s.label}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-1.5 text-[11px] text-ink-faint">
        <span>{formatPeso(minPrice)} low</span>
        <span>{formatPeso(maxPrice)} high</span>
      </div>
    </div>
  );
}