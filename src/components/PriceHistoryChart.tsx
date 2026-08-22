import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PriceRowData } from "../types";
import { formatPeso } from "../lib/format";

interface PriceHistoryChartProps {
  rows: PriceRowData[]; // any order — sorted chronologically internally
}

const WIDTH = 320;
const HEIGHT = 96;
const PADDING_X = 8;
const PADDING_Y = 12;

export default function PriceHistoryChart({ rows }: PriceHistoryChartProps) {
  const chronological = useMemo(
    () => [...rows].sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()),
    [rows]
  );

  if (chronological.length < 2) return null;

  const prices = chronological.map((r) => r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const points = chronological.map((r, i) => {
    const x = PADDING_X + (i / (chronological.length - 1)) * (WIDTH - PADDING_X * 2);
    const y = PADDING_Y + (1 - (r.price - minPrice) / range) * (HEIGHT - PADDING_Y * 2);
    return { x, y, price: r.price };
  });

  const first = chronological[0].price;
  const last = chronological[chronological.length - 1].price;
  const overallUp = last > first;
  const overallDown = last < first;
  const percentChange = first === 0 ? 0 : ((last - first) / first) * 100;

  return (
    <div className="bg-white rounded-card shadow-card p-3.5 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-ink-faint text-xs font-medium">Price history</p>
        <div
          className={`flex items-center gap-1 text-xs font-semibold ${
            overallUp ? "text-fresh-red" : overallDown ? "text-fresh-green" : "text-ink-faint"
          }`}
        >
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
        {points.slice(1).map((point, i) => {
          const prev = points[i];
          const segmentUp = point.price > prev.price;
          const segmentDown = point.price < prev.price;
          const strokeClass = segmentUp
            ? "stroke-fresh-red"
            : segmentDown
            ? "stroke-fresh-green"
            : "stroke-ink-faint";
          return (
            <line
              key={i}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              className={strokeClass}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}
        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={2.5}
            fill="white"
            className="stroke-palengke-green"
            strokeWidth={1.5}
          />
        ))}
      </svg>

      <div className="flex items-center justify-between mt-1 text-[11px] text-ink-faint">
        <span>{formatPeso(minPrice)} low</span>
        <span>{formatPeso(maxPrice)} high</span>
      </div>
    </div>
  );
}