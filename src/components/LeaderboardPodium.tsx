import { Crown } from "lucide-react";
import Avatar from "./Avatar";
import CountUpNumber from "./CountUpNumber";
import type { LeaderboardEntry } from "../lib/leaderboard";

interface LeaderboardPodiumProps {
  top3: LeaderboardEntry[];
  currentUserId?: string;
}

const PODIUM_HEIGHTS: Record<1 | 2 | 3, number> = { 1: 96, 2: 72, 3: 56 };

const MEDAL_STYLES: Record<1 | 2 | 3, { ring: string; bg: string; text: string }> = {
  1: {
    ring: "ring-palengke-gold",
    bg: "bg-gradient-to-b from-palengke-gold to-palengke-gold-dark",
    text: "text-white",
  },
  2: {
    ring: "ring-ink-faint/40",
    bg: "bg-gradient-to-b from-[#D9DEDA] to-[#B7BFB9]",
    text: "text-ink",
  },
  3: {
    ring: "ring-[#D8A46B]/60",
    bg: "bg-gradient-to-b from-[#E3AE79] to-[#C08A54]",
    text: "text-white",
  },
};

export default function LeaderboardPodium({ top3, currentUserId }: LeaderboardPodiumProps) {
  if (top3.length === 0) return null;

  const rankOf = (entry: LeaderboardEntry) => (top3.findIndex((e) => e.userId === entry.userId) + 1) as 1 | 2 | 3;

  // Visual order: 2nd (left), 1st (center, tallest), 3rd (right).
  // Filtered so a leaderboard with only 1–2 scouts this period still
  // renders cleanly instead of leaving empty gaps.
  const order = [top3[1], top3[0], top3[2]].filter((e): e is LeaderboardEntry => Boolean(e));

  return (
    // pt-6 (24px) — the #1 crown sits 20px above the avatar (-top-5); this
    // gives it room to clear the "Leaderboard / This week" header above
    // instead of overlapping it.
    <div className="flex items-end justify-center gap-3 pt-6 pb-1">
      {order.map((entry, i) => {
        const rank = rankOf(entry);
        const isMe = entry.userId === currentUserId;
        const medal = MEDAL_STYLES[rank];

        return (
          <div
            key={entry.userId}
            className="flex flex-col items-center gap-1.5 animate-podium-rise motion-reduce:animate-none"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {/* mb-3 (12px) — the rank badge below protrudes ~16px past the
                avatar's edge by design; without this margin it overlapped
                the name text right underneath it. */}
            <div className="relative mb-3">
              {rank === 1 && (
                <>
                  <span
                    className="absolute inset-0 rounded-full bg-palengke-gold/40 blur-md animate-podium-glow motion-reduce:animate-none z-0"
                    aria-hidden="true"
                  />
                  <Crown
                    size={18}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 text-palengke-gold-dark animate-crown-bounce motion-reduce:animate-none z-10"
                    strokeWidth={2.4}
                  />
                </>
              )}
              <div className={`relative z-10 rounded-full p-0.5 ${rank === 1 ? "ring-2" : "ring-1"} ${medal.ring}`}>
                <Avatar name={entry.displayName} size={rank === 1 ? 56 : 44} />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 z-20 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${medal.bg} ${medal.text}`}
              >
                {rank}
              </span>
            </div>

            <p
              className={`text-xs font-semibold text-center max-w-[64px] truncate ${
                isMe ? "text-palengke-green" : "text-ink"
              }`}
            >
              {isMe ? "You" : entry.displayName}
            </p>
            <p className="text-[11px] font-semibold text-palengke-gold-dark">
              <CountUpNumber value={entry.points} /> pts
            </p>

            <div className={`w-16 rounded-t-xl ${medal.bg}`} style={{ height: PODIUM_HEIGHTS[rank] }} aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}