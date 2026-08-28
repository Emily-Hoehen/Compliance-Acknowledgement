import { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

/**
 * Card — shared surface primitive for the Front Page dashboard
 * (fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:694). Every "Hours" /
 * "Complaints" / "Live View" tile in that design is the same
 * flat, rounded, drop-shadowed surface with different content
 * inside — this owns that shared shell so section components only
 * describe their own content.
 */

export type CardTheme = "dark" | "light";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  theme?: CardTheme;
  /** Fills the card with a semantic opacity wash instead of the flat surface color — see `--wash-*` tokens. */
  tint?: string;
  children?: ReactNode;
};

export function Card({ theme = "light", tint, className, style, children, ...rest }: CardProps) {
  return (
    <div
      className={[styles.card, className].filter(Boolean).join(" ")}
      data-theme={theme}
      style={tint ? { ...style, backgroundColor: tint } : style}
      {...rest}
    >
      {children}
    </div>
  );
}
