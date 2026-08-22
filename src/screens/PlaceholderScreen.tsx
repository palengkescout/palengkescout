import type { LucideIcon } from "lucide-react";
import TopBar from "../components/TopBar";

interface PlaceholderScreenProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  comingIn: string;
}

export default function PlaceholderScreen({ title, subtitle, icon: Icon, comingIn }: PlaceholderScreenProps) {
  return (
    <div className="app-shell bg-cream">
      <TopBar title={title} subtitle={subtitle} />
      <div className="app-content flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-palengke-gold/15 flex items-center justify-center mb-4">
          <Icon size={28} className="text-palengke-gold-dark" strokeWidth={1.8} />
        </div>
        <p className="font-display text-lg text-ink mb-1.5">Coming soon</p>
        <p className="text-ink-soft text-sm max-w-[28ch]">{comingIn}</p>
      </div>
    </div>
  );
}