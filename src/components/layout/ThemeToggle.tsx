"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-9 w-16 items-center justify-center rounded-full border border-border/60 bg-background/70",
          className
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={cn(
        "relative inline-flex h-9 w-16 items-center justify-between rounded-full border border-border/60 bg-background/70 px-2 text-muted-foreground shadow-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      <span
        className={cn(
          "absolute left-1 top-1 h-7 w-7 rounded-full bg-primary/15 shadow-sm transition-transform",
          isDark ? "translate-x-7" : "translate-x-0"
        )}
      />
      <Sun
        className={cn(
          "relative z-10 h-4 w-4 transition-colors",
          isDark ? "text-muted-foreground" : "text-primary"
        )}
      />
      <Moon
        className={cn(
          "relative z-10 h-4 w-4 transition-colors",
          isDark ? "text-primary" : "text-muted-foreground"
        )}
      />
    </button>
  );
}
