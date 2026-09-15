"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheckIcon, ChevronRightIcon, CircleCheckIcon, LockIcon, NoteStickyIcon } from "./icons";
import { ManagerAppScreenHeader } from "./ManagerAppScreenHeader";
import {
  CURRENT_MANAGER_ID,
  SECTION_ORDER,
  SECTION_TITLES,
  getManager,
  getResponsibleManager,
  getSectionNoteCount,
  getSectionPreview,
  type SectionKey,
  type ShiftReportState,
} from "../../lib/managerShiftReportData";
import styles from "./ManagerAppShiftReportList.module.css";

export type ManagerAppShiftReportListProps = {
  shift: ShiftReportState;
  onBack: () => void;
  onOpenSection: (key: SectionKey) => void;
  onComplete: () => void;
};

const CONFIRM_EXIT_DURATION_MS = 260;

/**
 * ManagerAppShiftReportList — the Day Shift Report section list.
 * Reached from Home's "End of Shift Report" tile. Shows who was on
 * shift (with the Responsible Manager flagged), then one row per
 * report section with a preview stat and note count; tapping a row
 * pushes ManagerAppShiftReportSection. The Complete Shift Report
 * action at the bottom only fires for the Responsible Manager —
 * everyone else sees the same slot as a locked, informational state.
 */
export function ManagerAppShiftReportList({ shift, onBack, onOpenSection, onComplete }: ManagerAppShiftReportListProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const currentManager = getManager(shift, CURRENT_MANAGER_ID);
  const responsibleManager = getResponsibleManager(shift);
  const isCurrentResponsible = currentManager?.isResponsible ?? false;

  function handleConfirmComplete() {
    setConfirmOpen(false);
    onComplete();
  }

  return (
    <div className={styles.screen}>
      <ManagerAppScreenHeader title="Day Shift Report" onBack={onBack} />

      <div className={styles.main}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Shift Managers</span>
          <div className={styles.managersCard}>
            {shift.managers.map((manager) => (
              <div key={manager.id} className={styles.managerRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={manager.avatar} alt="" className={styles.managerAvatar} />
                <div className={styles.managerInfo}>
                  <div className={styles.managerNameRow}>
                    <span className={styles.managerName}>{manager.name}</span>
                    {manager.isResponsible && (
                      <span className={styles.responsibleBadge}>
                        <BadgeCheckIcon />
                        Responsible Manager
                      </span>
                    )}
                  </div>
                  <span className={styles.managerRole}>{manager.role}</span>
                  <span className={styles.managerTimes}>
                    {manager.clockIn} – {manager.clockOut} · {manager.totalTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Report Sections</span>
          <div className={styles.sectionsCard}>
            {SECTION_ORDER.map((key) => (
              <button key={key} type="button" className={styles.sectionRow} onClick={() => onOpenSection(key)}>
                <div className={styles.sectionRowMain}>
                  <span className={styles.sectionRowTitle}>{SECTION_TITLES[key]}</span>
                  <span className={styles.sectionRowPreview}>{getSectionPreview(shift, key)}</span>
                </div>
                <div className={styles.sectionRowMeta}>
                  <span className={styles.noteBadge}>
                    <NoteStickyIcon />
                    {getSectionNoteCount(shift, key)}
                  </span>
                  <ChevronRightIcon className={styles.chevron} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Complete Shift Report</span>
          {shift.completedBy ? (
            <div className={styles.completeCard}>
              <CircleCheckIcon className={styles.completeIconDone} />
              <div className={styles.completeText}>
                <span className={styles.completeTitle}>Report completed</span>
                <span className={styles.completeCaption}>
                  By {getManager(shift, shift.completedBy)?.name ?? "a manager"} at {shift.completedAt}
                </span>
              </div>
            </div>
          ) : isCurrentResponsible ? (
            <button type="button" className={styles.completeButton} onClick={() => setConfirmOpen(true)}>
              Complete Shift Report
            </button>
          ) : (
            <div className={styles.completeCard}>
              <LockIcon className={styles.completeIconLocked} />
              <div className={styles.completeText}>
                <span className={styles.completeTitle}>Locked</span>
                <span className={styles.completeCaption}>
                  Only {responsibleManager?.name ?? "the Responsible Manager"} can complete this shift report.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <CompleteConfirmSheet open={confirmOpen} onConfirm={handleConfirmComplete} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
}

function CompleteConfirmSheet({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timeout = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CONFIRM_EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!mounted || closing) return;
    dialogRef.current?.focus({ preventScroll: true });
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, closing, onCancel]);

  if (!mounted) return null;

  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={[styles.confirmSheet, closing ? styles.confirmSheetClosing : ""].filter(Boolean).join(" ")}
        role="alertdialog"
        aria-modal="true"
        aria-label="Complete shift report"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.confirmGrabber} aria-hidden="true" />
        <h2 className={styles.confirmTitle}>Complete this shift report?</h2>
        <p className={styles.confirmSubtitle}>
          Every section locks once completed. Other managers can still be viewed, but no further notes can be added.
        </p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmButton} onClick={onConfirm}>
            Complete Shift Report
          </button>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
