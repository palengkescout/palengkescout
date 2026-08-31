import { Crown } from "lucide-react";
import Avatar from "./Avatar";
import type { PeriodWinner } from "../lib/leaderboard";

export default function HallOfFameList({ entries }: { entries: PeriodWinner[] }) {
  let dividerShown = false;

  return (
    <ul className="flex flex-col gap-0.5">
      {entries.map((entry) => {
        const showDivider = !entry.winner && !dividerShown;
        if (showDivider) dividerShown = true;

        return (
          <li key={entry.label}>
            {showDivider && (
              <div className="flex items-center gap-2 pt-2 pb-1 px-2.5">
                <div className="flex-1 border-t border-dashed border-black/10" />
                <span className="text-ink-faint text-[10px] font-medium">No reports</span>
                <div className="flex-1 border-t border-dashed border-black/10" />
              </div>
            )}

            {entry.winner ? (
              <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl">
                <div className="relative shrink-0">
                  <Avatar name={entry.winner.displayName} size={32} />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-palengke-gold flex items-center justify-center">
                    <Crown size={9} className="text-white" strokeWidth={2.6} />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-ink-faint text-[11px]">{entry.label}</p>
                  <p className="text-sm truncate font-semibold text-ink">{entry.winner.displayName}</p>
                </div>

                <span className="text-xs font-semibold text-palengke-gold-dark shrink-0">
                  {entry.winner.points} pts
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2.5 py-1">
                <span className="text-ink-faint text-xs">{entry.label}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}