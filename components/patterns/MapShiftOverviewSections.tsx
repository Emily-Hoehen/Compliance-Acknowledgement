"use client";

import type { ShiftReport } from "../../lib/mapShiftReportData";
import styles from "./MapShiftOverviewSections.module.css";

export type MapShiftOverviewSectionsProps = {
  report: ShiftReport;
  onViewFullReport: () => void;
};

/**
 * MapShiftOverviewSections — the Shift Notes + Managers sections at
 * the top of the shift-filtered left sidebar, matching Figma fileKey
 * SWFMjlBJ4u9vSrVaomRe12, node 182:13906 (font sizes/colors/spacing
 * per that frame). Sits between MapStatsPanel's shift-filter chip and
 * its (now shift-scoped) Services Completed/Hours Captured/Quality
 * Scores block — "View Full Shift Report" swaps that whole body for
 * MapShiftReportSections' deeper drill-down.
 *
 * The Shift Notes card (node 183:14426) is its own bespoke layout —
 * multi-line 14px/22px body copy with no tag chip — rather than a
 * reuse of MapShiftReportSections' NoteCallout (12px, tag chip,
 * single sentence), since this card's design and content genuinely
 * differ from that shared component.
 */
export function MapShiftOverviewSections({ report, onViewFullReport }: MapShiftOverviewSectionsProps) {
  return (
    <>
      <div className={styles.section}>
        <button type="button" className={styles.viewFullReportLink} onClick={onViewFullReport}>
          View Full Shift Report
        </button>
      </div>

      <div className={styles.hairline} />

      <div className={styles.section}>
        <span className={styles.sectionHeading}>Managers</span>
        <div className={styles.managerStack}>
          {report.managers.map((manager) => {
            const clockTimes = report.managerClockTimes[manager.name];
            return (
              <div key={manager.name} className={styles.managerRow}>
                <img src={manager.avatar} alt="" className={styles.managerAvatar} />
                <div className={styles.managerInfo}>
                  <span className={styles.managerName}>{manager.name}</span>
                  <span className={styles.managerPosition}>
                    {manager.position} | {report.label}
                  </span>
                </div>
                <div className={styles.managerTimeWrap} tabIndex={0}>
                  <div className={styles.managerTime}>
                    <span className={styles.managerTimeValue}>{clockTimes?.totalTimeLabel}</span>
                    <span className={styles.managerTimeCaption}>Total Time</span>
                  </div>
                  {clockTimes && (
                    <div className={styles.managerClockTooltip} role="tooltip">
                      <div className={styles.managerClockTooltipRow}>
                        <span className={styles.managerClockTooltipLabel}>Clocked In</span>
                        <span className={styles.managerClockTooltipValue}>{clockTimes.clockIn}</span>
                      </div>
                      <div className={styles.managerClockTooltipRow}>
                        <span className={styles.managerClockTooltipLabel}>Clocked Out</span>
                        <span className={styles.managerClockTooltipValue}>{clockTimes.clockOut}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
