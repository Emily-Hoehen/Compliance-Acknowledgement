"use client";

import { SunIcon, MoonIcon } from "../patterns/icons";
import styles from "./ThemeToggle.module.css";

export type ThemeToggleTheme = "dark" | "light";

export type ThemeToggleProps = {
  theme: ThemeToggleTheme;
  onChange: (theme: ThemeToggleTheme) => void;
};

/**
 * Light/dark switch for the Front Page dashboard. Not itself a
 * pulled Figma component — the source design only shows a light
 * theme (see HomeDashboard.tsx header comment) — built to match
 * the pill-toggle shape already established by Tabs/Toggles-style
 * controls elsewhere in DS2.
 */
export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={styles.toggle}
      data-theme={theme}
      onClick={() => onChange(isDark ? "light" : "dark")}
    >
      <span className={styles.track}>
        <SunIcon className={styles.icon} />
        <MoonIcon className={styles.icon} />
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
