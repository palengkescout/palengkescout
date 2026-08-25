import { Crown } from "lucide-react";
import Avatar from "./Avatar";
import type { PeriodWinner } from "../lib/leaderboard";

export default function HallOfFameList({ entries }: { entries: PeriodWinner[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {entries.map((entry) => (
        <li key={entry.label} className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl">
          {entry.winner ? (
            <div className="relative shrink-0">
              <Avatar name={entry.winner.displayName} size={32} />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-palengke-gold flex items-center justify-center">
                <Crown size={9} className="text-white" strokeWidth={2.6} />
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-cream-soft shrink-0" aria-hidden="true" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-ink-faint text-[11px]">{entry.label}</p>
            <p className={`text-sm truncate ${entry.winner ? "font-semibold text-ink" : "text-ink-faint"}`}>
              {entry.winner ? entry.winner.displayName : "No reports"}
            </p>
          </div>

          {entry.winner && (
            <span className="text-xs font-semibold text-palengke-gold-dark shrink-0">{entry.winner.points} pts</span>
          )}
        </li>
      ))}
    </ul>
  );
}