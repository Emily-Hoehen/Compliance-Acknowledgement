"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import styles from "./Modal.module.css";

export type ModalTheme = "dark" | "light";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  theme?: ModalTheme;
  children?: ReactNode;
};

/**
 * Modal — a focused overlay dialog: dimmed backdrop behind a
 * centered card-style panel with a title/close header and a
 * scrollable body. Closes on Escape, a backdrop click, or the close
 * button. Locks page scroll while open.
 */
export function Modal({ open, onClose, title, theme = "light", children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} data-theme={theme} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
