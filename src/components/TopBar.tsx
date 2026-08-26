interface TopBarProps {
  title?: string;
  subtitle?: string;
  showWordmark?: boolean;
}

export default function TopBar({ title, subtitle, showWordmark }: TopBarProps) {
  return (
    <header
      className="shrink-0 bg-palengke-green px-5 pt-3 pb-5 rounded-b-[32px] shadow-[0_14px_30px_-10px_rgba(26,77,46,0.5)]"
      style={{ paddingTop: "max(0.875rem, env(safe-area-inset-top))" }}
    >
      {showWordmark ? (
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-11 h-11 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-white text-[19px] font-bold leading-none tracking-tight">
              Palengke<span className="text-palengke-gold">Scout</span>
            </p>
            {subtitle && <p className="text-white/65 text-[13px] mt-1.5 leading-none">{subtitle}</p>}
          </div>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-white text-[26px] font-bold leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="text-white/65 text-sm mt-1">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}