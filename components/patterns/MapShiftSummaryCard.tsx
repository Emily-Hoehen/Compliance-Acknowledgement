"use client";

import { DonutRing } from "../ui/Charts";
import type { DailyReportShift } from "../../lib/mapPageData";
import styles from "./MapShiftSummaryCard.module.css";

export type MapShiftSummaryCardProps = {
  shift: DailyReportShift;
};

/**
 * MapShiftSummaryCard — one shift's name/time + manager avatar stack
 * + Services%/Hours% read. Shown as a read-only hover popover over
 * MapShiftTimeline's Day/Swing/Graveyard band labels.
 */
export function MapShiftSummaryCard({ shift }: MapShiftSummaryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerText}>
          <span className={styles.shiftName}>{shift.label}</span>
          <span className={styles.shiftTime}>{shift.timeRange}</span>
        </div>
        <div className={styles.managerStack} onClick={(e) => e.stopPropagation()}>
          {shift.managers.map((manager) => (
            <div key={manager.name} className={styles.managerAvatarWrap} tabIndex={0}>
              <img src={manager.avatar} alt={manager.name} className={styles.managerAvatar} />
              <div className={styles.managerTooltip} role="tooltip">
                <span className={styles.managerTooltipName}>{manager.name}</span>
                <span className={styles.managerTooltipRole}>{manager.position}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.metricRow}>
          <DonutRing percent={shift.servicePercent} color="var(--color-datavis-purple-100)" trackColor="var(--color-neutral-700)" size={32} strokeWidth={4} />
          <div className={styles.metricText}>
            <span className={styles.metricHeadline}>{shift.servicePercent}% Services</span>
            <span className={styles.metricCaption}>{shift.missedServicesLabel}</span>
          </div>
        </div>

        <div className={styles.metricRow}>
          <DonutRing percent={shift.hoursPercent} color="var(--color-datavis-yellow-100)" trackColor="var(--color-neutral-700)" size={32} strokeWidth={4} />
          <div className={styles.metricText}>
            <span className={styles.metricHeadline}>{shift.hoursPercent}% Hours</span>
          </div>
        </div>
      </div>
    </div>
  );
}
