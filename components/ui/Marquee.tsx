import { ReactNode } from "react";
import styles from "./Marquee.module.css";

/**
 * Marquee — continuous horizontal auto-scroll for a fixed-width
 * item row (the hero photo collage, the Clocked In avatar stack).
 * Pure CSS: the track renders `children` twice back-to-back and
 * animates by exactly half its width, so the loop point is
 * invisible. Pauses on hover/focus (WCAG 2.2.2 — auto-moving
 * content must be pausable) and honors `prefers-reduced-motion`
 * (see globals.css's reduced-motion override, which this inherits).
 */

export type MarqueeProps = {
  children: ReactNode;
  /** Seconds for one full loop — larger = slower. */
  durationSeconds?: number;
  reverse?: boolean;
  className?: string;
  trackClassName?: string;
};

export function Marquee({
  children,
  durationSeconds = 30,
  reverse = false,
  className,
  trackClassName,
}: MarqueeProps) {
  return (
    <div className={[styles.viewport, className].filter(Boolean).join(" ")}>
      <div
        className={[styles.track, trackClassName].filter(Boolean).join(" ")}
        style={{ animationDuration: `${durationSeconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        <div className={styles.group}>{children}</div>
        <div className={styles.group} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
