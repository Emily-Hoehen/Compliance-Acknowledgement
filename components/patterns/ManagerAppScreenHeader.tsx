"use client";

import { ArrowLeftIcon } from "./icons";
import styles from "./ManagerAppScreenHeader.module.css";

export type ManagerAppScreenHeaderProps = {
  title: string;
  onBack: () => void;
};

/** Top app bar for a pushed screen (not the Home tab) — back arrow + title, replacing the Home screen's own "4insite" header while active. The trailing spacer balances the leading icon's width so the title sits centered against the bar as a whole, matching Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 134:26580. */
export function ManagerAppScreenHeader({ title, onBack }: ManagerAppScreenHeaderProps) {
  return (
    <div className={styles.header}>
      <button type="button" className={styles.iconButton} onClick={onBack} aria-label="Back">
        <ArrowLeftIcon />
      </button>
      <span className={styles.title}>{title}</span>
      <span className={styles.iconButton} aria-hidden="true" />
    </div>
  );
}
