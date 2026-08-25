import Avatar from "./Avatar";
import type { LeaderboardEntry } from "../lib/leaderboard";

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  startRank: number; 
  currentUserId?: string;
}

export default function LeaderboardList({ entries, startRank, currentUserId }: LeaderboardListProps) {
  if (entries.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1 mt-4 pt-4 border-t border-black/5">
      {entries.map((entry, i) => {
        const rank = startRank + i;
        const isMe = entry.userId === currentUserId;
        return (
          <li
            key={entry.userId}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl ${isMe ? "bg-palengke-green/10" : ""}`}
          >
            <span className="w-5 text-center text-xs font-bold text-ink-faint shrink-0">{rank}</span>
            <Avatar name={entry.displayName} size={28} />
            <span className={`flex-1 text-sm truncate ${isMe ? "font-semibold text-ink" : "text-ink-soft"}`}>
              {entry.displayName}
              {isMe && " (you)"}
            </span>
            <span className="text-sm font-semibold text-palengke-green shrink-0">{entry.points} pts</span>
          </li>
        );
      })}
    </ul>
  );
}