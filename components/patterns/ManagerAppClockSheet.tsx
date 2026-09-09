"use client";

import { useEffect, useId, useRef } from "react";
import { CircleCheckIcon, LocationDotIcon } from "./icons";
import styles from "./ManagerAppClockSheet.module.css";

export type ManagerAppClockSheetMode = "check-in" | "check-out";

export type ManagerAppClockSheetProps = {
  open: boolean;
  mode: ManagerAppClockSheetMode;
  /** Elapsed-shift summary shown in the check-out copy, e.g. "2h 14m". Ignored for check-in. */
  elapsedLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * ManagerAppClockSheet — bottom sheet for starting/ending a shift.
 * Opens from the shift-clock card on the Manager App home screen;
 * confirming starts or stops the shift timer. Closes on Escape, a
 * backdrop tap, or Cancel. Rendered as position:fixed, but scoped to
 * the phone screen by AndroidPhoneFrame's .screen transform (see that
 * component), not the real browser viewport.
 */
export function ManagerAppClockSheet({ open, mode, elapsedLabel, onConfirm, onCancel }: ManagerAppClockSheetProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const isCheckIn = mode === "check-in";

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.grabber} aria-hidden="true" />

        <h2 id={titleId} className={styles.title}>
          {isCheckIn ? "Check in to start your shift" : "Check out to end your shift"}
        </h2>
        <p className={styles.subtitle}>
          {isCheckIn
            ? "We’ve confirmed your location to help verify your check-in."
            : `You’re about to end your shift after ${elapsedLabel ?? "0m"}.`}
        </p>

        <div className={styles.locationBadge}>
          <CircleCheckIcon className={styles.locationIcon} />
          <span>You&rsquo;re within the service area.</span>
        </div>

        <div className={styles.mapPreview} aria-hidden="true">
          <div className={styles.mapRoads} />
          <div className={`${styles.mapPin} ${styles.mapPinSite}`}>
            <LocationDotIcon className={styles.mapPinIcon} />
            <span className={styles.mapPinLabel}>Site</span>
          </div>
          <div className={`${styles.mapPin} ${styles.mapPinYou}`}>
            <LocationDotIcon className={styles.mapPinIcon} />
            <span className={styles.mapPinLabel}>You</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.confirmButton} onClick={onConfirm}>
            {isCheckIn ? "Check In" : "Check Out"}
          </button>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
