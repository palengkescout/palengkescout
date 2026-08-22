import { NavLink } from "react-router-dom";
import { Home, CirclePlus, ClipboardList, UserRound, type LucideIcon } from "lucide-react";
import { useAuth } from "../lib/authContext";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
}

const tabs: Tab[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/report", label: "Report", icon: CirclePlus, requiresAuth: true },
  { to: "/list", label: "My List", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export default function BottomNav() {
  const { user, openAuthModal } = useAuth();

  return (
    <nav
      className="shrink-0 bg-white/95 backdrop-blur border-t border-black/5 shadow-tab"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === "/"}
              onClick={(e) => {
                if (tab.requiresAuth && !user) {
                  e.preventDefault();
                  openAuthModal();
                }
              }}
              className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] min-w-[44px]"
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    size={22}
                    strokeWidth={isActive ? 2.3 : 2}
                    className={isActive ? "text-palengke-green" : "text-ink-faint"}
                  />
                  <span
                    className={`text-[11px] font-medium ${
                      isActive ? "text-palengke-green" : "text-ink-faint"
                    }`}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}