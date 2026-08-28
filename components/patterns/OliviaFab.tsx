"use client";

import styles from "./OliviaFab.module.css";

/**
 * OliviaFab — Olivia, 4Insite's AI assistant, as a floating action
 * button pinned to the bottom-right of the viewport.
 * Source: Figma fileKey I7TFV5MGgQwMlRjKlwJlBT ("Olivia"), node
 * 2197:16145's Navbar drops Olivia from the bar entirely in favor
 * of this pattern — exact FAB node wasn't addressable in that file.
 * Just the avatar photo on a drop shadow, no gradient halo.
 */

export type OliviaFabTheme = "dark" | "light";

export type OliviaFabProps = {
  theme?: OliviaFabTheme;
  avatarSrc: string;
  onClick?: () => void;
};

export function OliviaFab({ theme = "light", avatarSrc, onClick }: OliviaFabProps) {
  return (
    <button
      type="button"
      className={styles.fab}
      data-theme={theme}
      onClick={onClick}
      aria-label="Ask Olivia"
    >
      <span className={styles.ring}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc} alt="" className={styles.avatar} />
      </span>
    </button>
  );
}
