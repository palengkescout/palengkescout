import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, type LucideIcon } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: LucideIcon | string; // LucideIcon component OR emoji string
  description?: string;
}

interface DropdownProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

function renderIcon(icon: LucideIcon | string | undefined, className: string) {
  if (!icon) return null;
  if (typeof icon === "string") {
    return (
      <span className={`text-[18px] leading-none shrink-0 ${className}`} role="img" aria-hidden="true">
        {icon}
      </span>
    );
  }
  const Icon = icon;
  return <Icon size={18} className={`shrink-0 ${className}`} />;
}

export default function Dropdown({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  searchable = false,
  searchPlaceholder = "Search...",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      searchInputRef.current?.focus();
    } else if (!open) {
      setQuery("");
    }
  }, [open, searchable]);

  const filteredOptions = useMemo(() => {
    if (!searchable || query.trim() === "") return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-ink mb-2">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 bg-white rounded-card shadow-card px-4 py-3.5 text-[15px] outline-none min-h-[48px] text-left focus-visible:ring-2 focus-visible:ring-palengke-green"
      >
        {renderIcon(selected?.icon, "text-palengke-green")}
        <span className={`flex-1 truncate ${selected ? "text-ink" : "text-ink-faint"}`}>
          {selected ? selected.label : placeholder ?? "Select an option"}
        </span>
        <ChevronDown
          size={18}
          className={`text-ink-faint shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        // z-[1100]: Leaflet's own panes/controls (used by LocationPicker)
        // climb as high as z-index 1000 internally, so this has to clear
        // that — a plain z-20/z-30 was rendering behind an open map.
        <div className="absolute z-[1100] mt-2 w-full bg-white rounded-card shadow-card border border-black/5 overflow-hidden">
          {searchable && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/5">
              <Search size={16} className="text-ink-faint shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 text-[15px] outline-none min-h-[32px]"
              />
            </div>
          )}
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1.5">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-ink-faint text-sm">No matches found.</li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[15px] min-h-[44px] ${
                        isSelected ? "bg-palengke-green/10 text-palengke-green font-medium" : "text-ink"
                      }`}
                    >
                      {renderIcon(option.icon, isSelected ? "text-palengke-green" : "text-ink-faint")}
                      <span className="flex-1 truncate">{option.label}</span>
                      {option.description && (
                        <span className="text-ink-faint text-xs shrink-0">{option.description}</span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}