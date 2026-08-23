import { useState } from "react";
import { X, Mail, Lock, UserRound, Eye, EyeOff } from "lucide-react";
import { signIn, signUp } from "../lib/authClient";

interface AuthModalProps {
  onClose: () => void;
}

type Mode = "signin" | "signup";

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
          return;
        }
        onClose();
      } else {
        const result = await signUp(email, password, username);
        if (result.error) {
          setError(result.error);
          return;
        }
        setSignupSuccess(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Hold-to-reveal, not a toggle: the password is only visible while the
  // button is actively pressed, and hides again the instant it's released
  // (mouse up, finger lifted, drag off the button, or key released).
  function revealPassword() {
    setShowPassword(true);
  }
  function hidePassword() {
    setShowPassword(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[400px] bg-white rounded-t-3xl sm:rounded-card shadow-card p-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-ink">
            {signupSuccess ? "Check your email" : mode === "signin" ? "Log in" : "Create account"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-cream-soft"
          >
            <X size={18} className="text-ink-faint" strokeWidth={2.2} />
          </button>
        </div>

        {signupSuccess ? (
          <p className="text-ink-soft text-sm">
            We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Confirm
            it, then come back and log in as <span className="font-medium text-ink">{username}</span>.
          </p>
        ) : (
          <>
            <p className="text-ink-soft text-sm mb-5">
              {mode === "signin"
                ? "Log in to report prices, earn points, and build your profile."
                : "Create an account to start earning points for every price you report."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-username" className="block text-sm font-semibold text-ink mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <UserRound
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                      strokeWidth={2}
                    />
                    <input
                      id="auth-username"
                      type="text"
                      required
                      minLength={3}
                      maxLength={20}
                      pattern="[A-Za-z0-9_]{3,20}"
                      placeholder="e.g. mira_shops"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-cream-soft rounded-card pl-10 pr-4 py-3 text-[15px] outline-none min-h-[46px]"
                    />
                  </div>
                  <p className="text-ink-faint text-xs mt-1.5">
                    3–20 characters: letters, numbers, or underscores. Shown on the leaderboard.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-sm font-semibold text-ink mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                    strokeWidth={2}
                  />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-cream-soft rounded-card pl-10 pr-4 py-3 text-[15px] outline-none min-h-[46px]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-sm font-semibold text-ink mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                    strokeWidth={2}
                  />
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-cream-soft rounded-card pl-10 pr-11 py-3 text-[15px] outline-none min-h-[46px]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Password shown, release to hide" : "Hold to show password"}
                    aria-pressed={showPassword}
                    // Mouse
                    onMouseDown={revealPassword}
                    onMouseUp={hidePassword}
                    onMouseLeave={hidePassword}
                    // Touch — preventDefault stops the iOS/Android long-press
                    // callout (magnifier/copy menu) from popping up mid-hold.
                    onTouchStart={(e) => {
                      e.preventDefault();
                      revealPassword();
                    }}
                    onTouchEnd={hidePassword}
                    onTouchCancel={hidePassword}
                    // Keyboard — holding Enter/Space down reveals it, same as a physical hold.
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") revealPassword();
                    }}
                    onKeyUp={(e) => {
                      if (e.key === "Enter" || e.key === " ") hidePassword();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint active:text-palengke-green select-none"
                    style={{ WebkitTouchCallout: "none", touchAction: "manipulation" }}
                  >
                    {showPassword ? (
                      <EyeOff size={17} strokeWidth={2} />
                    ) : (
                      <Eye size={17} strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-fresh-red text-sm">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 w-full py-3.5 rounded-pill bg-palengke-green text-white font-semibold text-[15px] min-h-[48px] disabled:opacity-50"
              >
                {submitting ? "Please wait..." : mode === "signin" ? "Log in" : "Sign up"}
              </button>
            </form>

            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="w-full text-center text-sm text-ink-soft mt-4"
            >
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <span className="text-palengke-green font-semibold">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="text-palengke-green font-semibold">Log in</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}