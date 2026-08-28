"use client";

import { useMemo, useState } from "react";
import { Card } from "../ui/Card";
import {
  facilitySummary,
  performanceStats,
  buildings,
  recentVerifications,
  recentAudits,
  verificationToActivity,
  auditToActivity,
  type ActivityKind,
} from "../../lib/sowData";
import type { SowTab } from "./SowPage";
import styles from "./SowPage.module.css";

export type SowOverviewTabProps = {
  onNavigateTab: (tab: SowTab) => void;
};

const ACTIVITY_FILTERS: { id: ActivityKind | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "fa-check-double" },
  { id: "verification", label: "Verifications", icon: "fa-circle-check" },
  { id: "audit", label: "Audits", icon: "fa-clipboard-check" },
];

export function SowOverviewTab({ onNavigateTab }: SowOverviewTabProps) {
  const [activityFilter, setActivityFilter] = useState<ActivityKind | "all">("all");

  const activity = useMemo(() => {
    const combined = [...recentVerifications.map(verificationToActivity), ...recentAudits.map(auditToActivity)];
    return activityFilter === "all" ? combined : combined.filter((item) => item.kind === activityFilter);
  }, [activityFilter]);

  return (
    <div className={styles.sectionStack}>
      <div className={styles.kpiBoxRow}>
        <Card theme="light" className={styles.kpiBox}>
          <h2 className={styles.kpiBoxTitle}>Doing the work</h2>
          <div className={styles.kpiList}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>
                {facilitySummary.verificationsCompleted.toLocaleString()}
                <span className={styles.kpiValueMuted}> / {facilitySummary.verificationsExpected.toLocaleString()}</span>
              </span>
              <span className={styles.kpiLabel}>Expected vs. completed services</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{facilitySummary.hoursCapturedPercent}%</span>
              <span className={styles.kpiLabel}>Time captured</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{facilitySummary.teamMembers}</span>
              <span className={styles.kpiLabel}>Active team members</span>
            </div>
          </div>
        </Card>

        <Card theme="light" className={styles.kpiBox}>
          <h2 className={styles.kpiBoxTitle}>Doing it well</h2>
          <div className={styles.kpiList}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{performanceStats.verifications.avgScore}</span>
              <span className={styles.kpiLabel}>Average verification score</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{performanceStats.avgAuditScore}</span>
              <span className={styles.kpiLabel}>Average audit score</span>
            </div>
          </div>
        </Card>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Recent activity</h2>
          <button type="button" className={styles.textLink} onClick={() => onNavigateTab("facility")}>
            View full live coverage
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>
        </div>
        <div className={styles.chipRow}>
          {ACTIVITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={[styles.chip, activityFilter === f.id ? styles.chipActive : ""].filter(Boolean).join(" ")}
              data-theme="light"
              aria-pressed={activityFilter === f.id}
              onClick={() => setActivityFilter(f.id)}
            >
              <i className={`fa-solid ${f.icon}`} aria-hidden="true" /> {f.label}
            </button>
          ))}
        </div>
        <div className={styles.activityGrid}>
          {activity.map((item, i) => (
            <Card
              key={item.location}
              theme="light"
              className={[styles.activityCard, i === 0 ? styles.activityHero : ""].filter(Boolean).join(" ")}
            >
              <div className={styles.activityPhoto} aria-hidden="true">
                PHOTO
              </div>
              <div className={styles.photoBody}>
                <span className={styles.photoMeta}>
                  <span className={styles.typeTag}>{item.tag}</span>
                  <span className={styles.photoScore}>{item.score.toFixed(1)}</span>
                </span>
                <span className={styles.photoArea}>{item.location}</span>
                <span className={styles.photoMeta}>
                  <span className={styles.activityPerson}>
                    <img src={item.personAvatar} alt="" className={styles.avatarSmall} />
                    {item.personName}
                  </span>
                </span>
                <span className={styles.photoMeta}>
                  <span>{item.timeAgo}</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>SOW compliance health</h2>
        <Card theme="light" className={styles.paddedCard}>
          <h3 className={styles.subheading}>Service plan adherence, by building</h3>
          <div className={styles.scoreList}>
            {buildings.map((b) => (
              <div key={b.name} className={styles.scoreRow}>
                <span className={styles.scoreName}>{b.name}</span>
                <span className={styles.scoreTrack}>
                  <span className={styles.scoreFill} style={{ width: `${b.coveragePercent}%` }} />
                </span>
                <span className={styles.scoreValue}>{b.coveragePercent}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card theme="light" className={styles.paddedCard}>
          <h3 className={styles.subheading}>Service gaps</h3>
          <p className={styles.gapPositive}>✓ No incomplete routes in the last 7 days.</p>
        </Card>
      </div>
    </div>
  );
}
