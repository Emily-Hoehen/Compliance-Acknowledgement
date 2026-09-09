"use client";

import { DonutRing } from "../ui/Charts";
import { SparklesIcon } from "./icons";
import type { DailyReportShift, DailyReportPerson } from "../../lib/mapPageData";
import styles from "./MapDailyReportPanel.module.css";

export type MapDailyReportPanelProps = {
  siteManager: DailyReportPerson;
  siteManagerSignOff: string;
  aiOverview: string;
  shifts: DailyReportShift[];
  onSelectShift: (key: DailyReportShift["key"]) => void;
};

/**
 * MapDailyReportPanel — the Map feature's right overlay card: who
 * ran the site, who co-managed each shift, and a per-shift
 * Hours%/Service% read. Loosely follows Figma fileKey
 * SWFMjlBJ4u9vSrVaomRe12, node 180:11047 (site manager grouped into
 * the sticky header; each shift card has its avatar stack in the
 * header row, name/time stacked on the left, avatars on the right)
 * with a few explicit deviations: no divider between a card's
 * header and its metrics, the missed-services caption stays neutral
 * grey, and the Services ring is a flat purple
 * (`--color-datavis-purple-100`) matching MapStatsPanel's own
 * Services Completed ring rather than varying by outcome. The AI
 * overview (aggregated from the three shifts, see
 * lib/mapPageData.ts's buildAiOverview) and the site manager's
 * sign-off timestamp are this component's own additions, not in the
 * source frame.
 */
export function MapDailyReportPanel({ siteManager, siteManagerSignOff, aiOverview, shifts, onSelectShift }: MapDailyReportPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Daily Report</span>
        <div className={styles.aiRow}>
          <SparklesIcon className={styles.aiIcon} />
          <p className={styles.aiText}>{aiOverview}</p>
        </div>
        <div className={styles.siteManagerRow}>
          <img src={siteManager.avatar} alt="" className={styles.siteManagerAvatar} />
          <div className={styles.siteManagerText}>
            <span className={styles.siteManagerName}>{siteManager.name}</span>
            <span className={styles.siteManagerRole}>Site Manager</span>
            <span className={styles.siteManagerSignOff}>{siteManagerSignOff}</span>
          </div>
        </div>
      </div>

      <div className={styles.scrollBody}>
        <div className={styles.shiftList}>
          {shifts.map((shift) => (
            <div
              key={shift.key}
              className={styles.shiftCard}
              role="button"
              tabIndex={0}
              onClick={() => onSelectShift(shift.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectShift(shift.key);
                }
              }}
              aria-label={`View ${shift.label} shift report`}
            >
              <div className={styles.shiftCardHeader}>
                <div className={styles.shiftHeaderText}>
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

              <div className={styles.shiftBody}>
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
          ))}
        </div>
      </div>
    </div>
  );
}
