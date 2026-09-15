"use client";

import { ManagerAppScreenHeader } from "./ManagerAppScreenHeader";
import { CURRENT_MANAGER_ID, getManagerShiftTimeInfo, type ShiftManager, type ShiftReportState } from "../../lib/managerShiftReportData";
import styles from "./ManagerAppShiftManagers.module.css";

export type ManagerAppShiftManagersProps = {
  shift: ShiftReportState;
  onBack: () => void;
  /** The logged-in manager's own live clock state from ManagerAppHome's Home-screen toggle — overrides that one manager's row instead of the clockOut-time-based guess getManagerShiftTimeInfo makes for everyone else, since the app already knows their real status. */
  currentManagerLiveStatus: { onShift: boolean; elapsedLabel: string };
  /** True while ManagerAppHome renders this screen's header itself (outside the slide-transition layer, so the header bar never slides — only the content beneath it does). */
  hideHeader?: boolean;
};

/**
 * ManagerAppShiftManagers — full-screen detail pushed from the Day
 * Shift Report's own Shift Managers row (matches Figma fileKey
 * 0UJDRcrFiXkn16yfc2MUEW, node 148:30165). One card per manager:
 * name/role, a live Checked In/Checked Out status derived from
 * their own clock-out time (see getManagerShiftTimeInfo), and either
 * a live elapsed "Shift Time" (still on shift) or their fixed
 * "Total Shift Time" (already clocked out).
 */
export function ManagerAppShiftManagers({ shift, onBack, currentManagerLiveStatus, hideHeader }: ManagerAppShiftManagersProps) {
  return (
    <div className={styles.screen}>
      {!hideHeader && <ManagerAppScreenHeader title="Shift Managers" onBack={onBack} />}
      <div className={styles.main}>
        {shift.managers.map((manager) => (
          <ManagerCard key={manager.id} manager={manager} currentManagerLiveStatus={currentManagerLiveStatus} />
        ))}
      </div>
    </div>
  );
}

function ManagerCard({ manager, currentManagerLiveStatus }: { manager: ShiftManager; currentManagerLiveStatus: ManagerAppShiftManagersProps["currentManagerLiveStatus"] }) {
  const isSelf = manager.id === CURRENT_MANAGER_ID;
  const info =
    isSelf && currentManagerLiveStatus.onShift
      ? {
          checkedIn: true,
          rangeLabel: `${manager.clockIn} – Current`,
          durationLabel: currentManagerLiveStatus.elapsedLabel,
          sectionLabel: "Shift Time",
        }
      : getManagerShiftTimeInfo(manager);

  return (
    <div className={styles.card}>
      <div className={styles.cardTopRow}>
        <div className={styles.associateTile}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={manager.avatar} alt="" className={styles.avatar} />
          <div className={styles.nameDetails}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{manager.name}</span>
            </div>
            <span className={styles.role}>{manager.role}</span>
          </div>
        </div>
        <span className={styles.statusLabel} data-checked-in={info.checkedIn}>
          {info.checkedIn ? "Checked In" : "Checked Out"}
        </span>
      </div>

      <div className={styles.timeSection}>
        <span className={styles.timeLabel}>{info.sectionLabel}</span>
        <div className={styles.timeRow}>
          <span>{info.rangeLabel}</span>
          <span>{info.durationLabel}</span>
        </div>
      </div>
    </div>
  );
}
