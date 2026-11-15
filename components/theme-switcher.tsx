"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type ThemeMode = "light" | "dark" | "system";

const MODES: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSwitcher({
  variant = "segmented",
}: {
  variant?: "segmented" | "compact";
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? ((theme as ThemeMode | undefined) ?? "light") : "light";

  if (variant === "compact") {
    return (
      <div
        role="group"
        aria-label="Theme selection"
        className="inline-flex shrink-0 items-center rounded-full border border-black/10 bg-white/70 p-0.5 dark:border-white/15 dark:bg-white/[0.06]"
      >
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = current === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setTheme(m.value)}
              aria-label={`Switch to ${m.label} theme`}
              aria-pressed={active}
              title={`${m.label} theme`}
              className={`grid size-8 place-items-center rounded-full transition-colors ${
                active
                  ? "bg-[#1D1D1F] text-white dark:bg-[#f4f3ef] dark:text-[#111111]"
                  : "text-[#6E6E73] hover:text-[#1D1D1F] dark:text-white/60 dark:hover:text-white"
              }`}
            >
              <Icon size={14} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme mode"
      className="grid grid-cols-3 gap-1 rounded-xl border border-black/10 bg-black/[0.04] p-1 dark:border-white/10 dark:bg-white/[0.04]"
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = current === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => setTheme(m.value)}
            aria-pressed={active}
            className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
              active
                ? "bg-white text-[#1D1D1F] shadow-sm dark:bg-[#f4f3ef] dark:text-[#111111]"
                : "text-[#6E6E73] hover:text-[#1D1D1F] dark:text-white/60 dark:hover:text-white"
            }`}
          >
            <Icon size={12} aria-hidden="true" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
