interface TopBarProps {
  title?: string;
  subtitle?: string;
  showWordmark?: boolean;
}

export default function TopBar({ title, subtitle, showWordmark }: TopBarProps) {
  return (
    <header
      className="shrink-0 bg-palengke-green px-5 pt-3 pb-4 rounded-b-[28px] shadow-card"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      {showWordmark ? (
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-9 h-9 object-contain" />
          <div>
            <p className="font-display text-white text-lg leading-none">
              Palengke<span className="text-palengke-gold">Scout</span>
            </p>
            {subtitle && <p className="text-cream/70 text-xs mt-1">{subtitle}</p>}
          </div>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-white text-xl">{title}</h1>
          {subtitle && <p className="text-cream/70 text-sm mt-0.5">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}
