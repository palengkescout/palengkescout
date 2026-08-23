export const REPORT_COOLDOWN_MINUTES = 60;

export class RateLimitError extends Error {
  retryAfterMinutes: number;

  constructor(retryAfterMinutes: number) {
    super(
      `You can report this item at this market again in ${retryAfterMinutes} minute${
        retryAfterMinutes === 1 ? "" : "s"
      }.`
    );
    this.name = "RateLimitError";
    this.retryAfterMinutes = retryAfterMinutes;
  }
}

export function enforceReportCooldown(lastReportedAt: string | null): void {
  if (!lastReportedAt) return;
  const elapsedMs = Date.now() - new Date(lastReportedAt).getTime();
  const cooldownMs = REPORT_COOLDOWN_MINUTES * 60 * 1000;
  if (elapsedMs < cooldownMs) {
    const retryAfterMinutes = Math.ceil((cooldownMs - elapsedMs) / 60000);
    throw new RateLimitError(retryAfterMinutes);
  }
}