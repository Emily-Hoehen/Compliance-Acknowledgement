"use client";

import { ChevronLeftIcon } from "./icons";
import styles from "./ManagerAppScreenHeader.module.css";

export type ManagerAppScreenHeaderProps = {
  title: string;
  onBack: () => void;
};

/** Top app bar for a pushed screen (not the Home tab) — back chevron + title, replacing the Home screen's own "4insite" header while active. */
export function ManagerAppScreenHeader({ title, onBack }: ManagerAppScreenHeaderProps) {
  return (
    <div className={styles.header}>
      <button type="button" className={styles.backButton} onClick={onBack} aria-label="Back">
        <ChevronLeftIcon />
      </button>
      <span className={styles.title}>{title}</span>
    </div>
  );
}
