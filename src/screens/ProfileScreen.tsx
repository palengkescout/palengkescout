import { useEffect, useState } from "react";
import { LogIn, LogOut, Trophy, Award, CircleCheck, CircleAlert, Clock, Flame, Crown } from "lucide-react";
import TopBar from "../components/TopBar";
import ProfileSkeleton from "../components/ProfileSkeleton";
import { useAuth } from "../lib/authContext";
import { signOut } from "../lib/authClient";
import { getTotalPoints } from "../lib/points";
import { getReporterStats, tierLabel, type ReporterStats } from "../lib/reputation";
import {
  getLeaderboard,
  getHallOfFame,
  isEligibleForMultiplier,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type PeriodWinner,
} from "../lib/leaderboard";
import { supabase } from "../lib/supabaseClient";

export default function ProfileScreen() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");
  const [points, setPoints] = useState<number | null>(null);
  const [stats, setStats] = useState<ReporterStats | null>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [multiplierEligible, setMultiplierEligible] = useState(false);
  const [hofPeriod, setHofPeriod] = useState<LeaderboardPeriod>("week");
  const [hallOfFame, setHallOfFame] = useState<PeriodWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [total, reporterStats, profileRow, eligible] = await Promise.all([
        getTotalPoints(user.id),
        getReporterStats(user.id),
        supabase
          ? supabase.from("profiles").select("display_name").eq("id", user.id).single()
          : Promise.resolve({ data: null }),
        isEligibleForMultiplier(user.id),
      ]);
      if (!cancelled) {
        setPoints(total);
        setStats(reporterStats);
        setDisplayName((profileRow as any)?.data?.display_name ?? user.email ?? "Scout");
        setMultiplierEligible(eligible);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getLeaderboard(period).then(setLeaderboard);
  }, [user, period]);

  useEffect(() => {
    if (!user) return;
    getHallOfFame(hofPeriod, 8).then(setHallOfFame);
  }, [user, hofPeriod]);

  if (!authLoading && !user) {
    return (
      <div className="app-shell bg-cream">
        <TopBar title="Profile" subtitle="Your contributions to PalengkeScout" />
        <div className="app-content flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-palengke-green/10 flex items-center justify-center mb-4">
            <LogIn size={26} className="text-palengke-green" strokeWidth={2} />
          </div>
          <p className="font-display text-lg text-ink mb-1.5">Log in to see your profile</p>
          <p className="text-ink-soft text-sm max-w-[30ch] mb-6">
            Track your points, reputation, and see how you rank against other reporters this week.
          </p>
          <button
            onClick={openAuthModal}
            className="w-full py-3.5 rounded-pill bg-palengke-green text-white font-semibold text-[15px] min-h-[48px]"
          >
            Log in / Sign up
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="app-shell bg-cream">
        <TopBar title="Profile" subtitle="Your contributions to PalengkeScout" />
        <div className="app-content px-5 pt-4 pb-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  const myRank = leaderboard.findIndex((e) => e.userId === user?.id);
  const topTen = leaderboard.slice(0, 10);

  return (
    <div className="app-shell bg-cream">
      <TopBar title="Profile" subtitle="Your contributions to PalengkeScout" />

      <div className="app-content px-5 pt-4 pb-8 flex flex-col gap-5">
        <div className="bg-white rounded-card shadow-card p-4">
          <p className="font-display text-lg text-ink mb-0.5">{displayName}</p>
          <p className="text-ink-faint text-xs mb-3">{user?.email}</p>

          <div className="flex items-center gap-2 bg-palengke-gold/15 text-palengke-gold-dark rounded-pill px-4 py-2 w-fit mb-3">
            <Award size={18} strokeWidth={2} />
            <span className="text-sm font-semibold">{points} points total</span>
          </div>

          {multiplierEligible && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-palengke-green rounded-pill px-3 py-1.5 w-fit mb-3">
              <Flame size={13} strokeWidth={2.4} />
              1.5x points active this week — you were Top 3 last week!
            </div>
          )}

          {stats && (
            <div className="mt-1">
              <p className="text-sm font-semibold text-ink mb-1">{tierLabel(stats.tier)}</p>
              <p className="text-ink-faint text-xs">
                {stats.nextTier
                  ? `${stats.nextTier.verifiedNeeded} more verified report${
                      stats.nextTier.verifiedNeeded === 1 ? "" : "s"
                    } to reach ${tierLabel(stats.nextTier.tier)}`
                  : "You've reached the highest tier — thank you for keeping prices honest."}
              </p>
            </div>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white rounded-card shadow-card p-3 flex flex-col items-center gap-1">
              <CircleCheck size={18} className="text-fresh-green" strokeWidth={2} />
              <span className="font-display text-base text-ink">{stats.verifiedCount}</span>
              <span className="text-ink-faint text-[11px]">Verified</span>
            </div>
            <div className="bg-white rounded-card shadow-card p-3 flex flex-col items-center gap-1">
              <Clock size={18} className="text-ink-faint" strokeWidth={2} />
              <span className="font-display text-base text-ink">{stats.pendingCount}</span>
              <span className="text-ink-faint text-[11px]">Pending</span>
            </div>
            <div className="bg-white rounded-card shadow-card p-3 flex flex-col items-center gap-1">
              <CircleAlert size={18} className="text-fresh-red" strokeWidth={2} />
              <span className="font-display text-base text-ink">{stats.flaggedCount}</span>
              <span className="text-ink-faint text-[11px]">Flagged</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Trophy size={16} className="text-palengke-gold-dark" strokeWidth={2.2} />
              <p className="font-semibold text-ink text-sm">Leaderboard</p>
            </div>
            <div className="flex gap-1">
              {(["week", "month"] as LeaderboardPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-pill text-xs font-semibold min-h-[28px] ${
                    period === p ? "bg-palengke-green text-white" : "bg-cream-soft text-ink-faint"
                  }`}
                >
                  {p === "week" ? "This week" : "This month"}
                </button>
              ))}
            </div>
          </div>

          {topTen.length === 0 ? (
            <p className="text-ink-faint text-xs py-4 text-center">
              No points logged yet for this period — be the first!
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {topTen.map((entry, i) => {
                const isMe = entry.userId === user?.id;
                return (
                  <li
                    key={entry.userId}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-xl ${
                      isMe ? "bg-palengke-green/10" : ""
                    }`}
                  >
                    <span
                      className={`w-6 text-center text-xs font-bold ${
                        i === 0 ? "text-palengke-gold-dark" : i < 3 ? "text-ink-soft" : "text-ink-faint"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`flex-1 text-sm truncate ${isMe ? "font-semibold text-ink" : "text-ink-soft"}`}>
                      {entry.displayName}
                      {isMe && " (you)"}
                    </span>
                    <span className="text-sm font-semibold text-palengke-green">{entry.points} pts</span>
                  </li>
                );
              })}
            </ul>
          )}

          {myRank >= 10 && (
            <p className="text-ink-faint text-xs text-center mt-3 pt-3 border-t border-black/5">
              You're #{myRank + 1} this {period}
            </p>
          )}
        </div>

        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Crown size={16} className="text-palengke-gold-dark" strokeWidth={2.2} />
              <p className="font-semibold text-ink text-sm">Hall of Fame</p>
            </div>
            <div className="flex gap-1">
              {(["week", "month"] as LeaderboardPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setHofPeriod(p)}
                  className={`px-3 py-1.5 rounded-pill text-xs font-semibold min-h-[28px] ${
                    hofPeriod === p ? "bg-palengke-green text-white" : "bg-cream-soft text-ink-faint"
                  }`}
                >
                  {p === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          <ul className="flex flex-col gap-1">
            {hallOfFame.map((entry) => (
              <li key={entry.label} className="flex items-center justify-between px-2.5 py-2">
                <span className="text-ink-faint text-xs">{entry.label}</span>
                <span className="text-sm font-medium text-ink">
                  {entry.winner ? `👑 ${entry.winner.displayName}` : "No reports"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => signOut()}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-pill bg-white shadow-card text-fresh-red font-medium text-sm min-h-[48px]"
        >
          <LogOut size={16} strokeWidth={2.2} />
          Sign out
        </button>
      </div>
    </div>
  );
}