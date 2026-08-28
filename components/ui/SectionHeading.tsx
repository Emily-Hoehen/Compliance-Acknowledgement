import { ReactNode } from "react";
import styles from "./SectionHeading.module.css";

export type SectionHeadingTheme = "dark" | "light";

export type SectionHeadingProps = {
  theme?: SectionHeadingTheme;
  children: ReactNode;
  /** Optional trailing affordance, e.g. the Communications section's "see all" arrow. */
  action?: ReactNode;
};

/** Shared "People Management" / "Site Performance" / "Communications" row heading. */
export function SectionHeading({ theme = "light", children, action }: SectionHeadingProps) {
  return (
    <h2 className={styles.heading} data-theme={theme}>
      {children}
      {action}
    </h2>
  );
}
