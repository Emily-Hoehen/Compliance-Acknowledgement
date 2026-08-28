"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import {
  siteContractStats,
  facilitySummary,
  performanceStats,
  buildings,
  areaTypeCoverage,
  allAreaVerifications,
  allAreaAudits,
  verificationToActivity,
  auditToActivity,
  type ActivityItem,
  type ActivityKind,
} from "../../lib/sowData";
import type { SowTab } from "./SowPage";
import sharedStyles from "./SowPage.module.css";
import styles from "./SowAudienceOverviewTab.module.css";

export type SowAudienceOverviewTabProps = {
  onNavigateTab: (tab: SowTab) => void;
};

const ALL = "all";
type ViewMode = "grid" | "slideshow";
type AreaActivityItem = ActivityItem & { areaName: string; building: string };

const ACTIVITY_FILTERS: { id: ActivityKind | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "fa-check-double" },
  { id: "verification", label: "Verifications", icon: "fa-circle-check" },
  { id: "audit", label: "Audits", icon: "fa-clipboard-check" },
];

/**
 * SowAudienceOverviewTab — SowAudiencePage's Executive Overview.
 * Forked from SowOverviewTab (still reused as-is on SowPage's own
 * Overview tab) because this exploration's Recent Activity needed
 * more than that shared version offers: an area-type filter, and a
 * Grid/Slideshow toggle instead of one fixed small-photo layout.
 * "What's promised" is new here too — the contract scope (same
 * siteContractStats numbers SowContractTab and Plan vs Evidence's
 * "Promised" box lead with) that a customer-facing Executive
 * Overview shouldn't be missing. SOW compliance health is unchanged
 * from SowOverviewTab.
 *
 * Recent activity here draws from the full site-wide verification +
 * audit pool (allAreaVerifications/allAreaAudits) instead of the
 * small five-item recent feed, since an area-type filter only means
 * something with a real pool behind it to narrow. Slideshow is the
 * same big-photo-plus-thumbnail-strip pattern used elsewhere in this
 * exploration, just scoped to whichever activity the toolbar above
 * it narrows down to.
 */
export function SowAudienceOverviewTab({ onNavigateTab }: SowAudienceOverviewTabProps) {
  const [areaTypeFilter, setAreaTypeFilter] = useState(ALL);
  const [activityFilter, setActivityFilter] = useState<ActivityKind | "all">("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [index, setIndex] = useState(0);

  const filteredVerifications = useMemo(
    () => allAreaVerifications.filter((v) => areaTypeFilter === ALL || v.areaName === areaTypeFilter),
    [areaTypeFilter]
  );
  const filteredAudits = useMemo(
    () => allAreaAudits.filter((a) => areaTypeFilter === ALL || a.areaName === areaTypeFilter),
    [areaTypeFilter]
  );

  const activity: AreaActivityItem[] = useMemo(() => {
    const verificationItems = filteredVerifications.map((v) => ({
      ...verificationToActivity(v),
      areaName: v.areaName,
      building: v.building,
    }));
    const auditItems = filteredAudits.map((a) => ({
      ...auditToActivity(a),
      areaName: a.areaName,
      building: a.building,
    }));
    return activityFilter === "verification"
      ? verificationItems
      : activityFilter === "audit"
        ? auditItems
        : [...verificationItems, ...auditItems];
  }, [filteredVerifications, filteredAudits, activityFilter]);

  // Whenever a filter narrows (or widens) the pool, land back on the
  // first slide rather than an index that may no longer exist.
  useEffect(() => {
    setIndex(0);
  }, [areaTypeFilter, activityFilter]);

  const current = activity[Math.min(index, Math.max(0, activity.length - 1))];

  function goPrev() {
    setIndex((i) => (activity.length === 0 ? 0 : (i - 1 + activity.length) % activity.length));
  }
  function goNext() {
    setIndex((i) => (activity.length === 0 ? 0 : (i + 1) % activity.length));
  }

  return (
    <div className={sharedStyles.sectionStack}>
      <div className={styles.kpiBoxRowTrio}>
        <Card theme="light" className={sharedStyles.kpiBox}>
          <h2 className={sharedStyles.kpiBoxTitle}>What&rsquo;s promised</h2>
          <div className={sharedStyles.kpiList}>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{siteContractStats.sowCoveragePercent}%</span>
              <span className={sharedStyles.kpiLabel}>SOW coverage contracted</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{siteContractStats.areaTypes}</span>
              <span className={sharedStyles.kpiLabel}>Area types across {siteContractStats.buildings} buildings</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{siteContractStats.expectedAnnualTasks}</span>
              <span className={sharedStyles.kpiLabel}>Expected annual tasks</span>
            </div>
          </div>
        </Card>

        <Card theme="light" className={sharedStyles.kpiBox}>
          <h2 className={sharedStyles.kpiBoxTitle}>Doing the work</h2>
          <div className={sharedStyles.kpiList}>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>
                {facilitySummary.verificationsCompleted.toLocaleString()}
                <span className={sharedStyles.kpiValueMuted}> / {facilitySummary.verificationsExpected.toLocaleString()}</span>
              </span>
              <span className={sharedStyles.kpiLabel}>Expected vs. completed services</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{facilitySummary.hoursCapturedPercent}%</span>
              <span className={sharedStyles.kpiLabel}>Time captured</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{facilitySummary.teamMembers}</span>
              <span className={sharedStyles.kpiLabel}>Active team members</span>
            </div>
          </div>
        </Card>

        <Card theme="light" className={sharedStyles.kpiBox}>
          <h2 className={sharedStyles.kpiBoxTitle}>Doing it well</h2>
          <div className={sharedStyles.kpiList}>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{performanceStats.verifications.avgScore}</span>
              <span className={sharedStyles.kpiLabel}>Average verification score</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{performanceStats.avgAuditScore}</span>
              <span className={sharedStyles.kpiLabel}>Average audit score</span>
            </div>
          </div>
        </Card>
      </div>

      <div className={sharedStyles.section}>
        <div className={sharedStyles.sectionHeaderRow}>
          <h2 className={sharedStyles.sectionTitle}>Recent activity</h2>
          <button type="button" className={sharedStyles.textLink} onClick={() => onNavigateTab("facility")}>
            View full live coverage
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.activityToolbar}>
          <select
            className={sharedStyles.filterSelect}
            value={areaTypeFilter}
            onChange={(e) => setAreaTypeFilter(e.target.value)}
            aria-label="Filter by area type"
          >
            <option value={ALL}>All area types</option>
            {areaTypeCoverage.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <div className={sharedStyles.viewToggleGroup}>
            <button
              type="button"
              className={[sharedStyles.viewToggleButton, view === "grid" ? sharedStyles.viewToggleButtonActive : ""]
                .filter(Boolean)
                .join(" ")}
              data-theme="light"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <i className="fa-solid fa-table-cells-large" aria-hidden="true" /> Grid
            </button>
            <button
              type="button"
              className={[sharedStyles.viewToggleButton, view === "slideshow" ? sharedStyles.viewToggleButtonActive : ""]
                .filter(Boolean)
                .join(" ")}
              data-theme="light"
              aria-pressed={view === "slideshow"}
              onClick={() => setView("slideshow")}
            >
              <i className="fa-solid fa-images" aria-hidden="true" /> Slideshow
            </button>
          </div>
        </div>

        <div className={sharedStyles.chipRow}>
          {ACTIVITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={[sharedStyles.chip, activityFilter === f.id ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
              data-theme="light"
              aria-pressed={activityFilter === f.id}
              onClick={() => setActivityFilter(f.id)}
            >
              <i className={`fa-solid ${f.icon}`} aria-hidden="true" /> {f.label}
            </button>
          ))}
        </div>

        {activity.length === 0 ? (
          <p className={styles.emptyNote}>No activity matches these filters.</p>
        ) : view === "grid" ? (
          <div className={sharedStyles.activityGrid}>
            {activity.map((item, i) => (
              <Card
                key={`${item.areaName}-${item.location}-${i}`}
                theme="light"
                className={[sharedStyles.activityCard, i === 0 ? sharedStyles.activityHero : ""].filter(Boolean).join(" ")}
              >
                <div className={sharedStyles.activityPhoto} aria-hidden="true">
                  PHOTO
                </div>
                <div className={sharedStyles.photoBody}>
                  <span className={sharedStyles.photoMeta}>
                    <span className={sharedStyles.typeTag}>{item.tag}</span>
                    <span className={sharedStyles.photoScore}>{item.score.toFixed(1)}</span>
                  </span>
                  <span className={sharedStyles.photoArea}>{item.location}</span>
                  <span className={sharedStyles.photoMeta}>
                    <span className={sharedStyles.activityPerson}>
                      <img src={item.personAvatar} alt="" className={sharedStyles.avatarSmall} />
                      {item.personName}
                    </span>
                  </span>
                  <span className={sharedStyles.photoMeta}>
                    <span>{item.timeAgo}</span>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className={styles.slideshow}>
            <div className={styles.slideStage}>
              <button type="button" className={styles.slideArrowLeft} onClick={goPrev} aria-label="Previous photo">
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>
              <div className={styles.slidePhoto} aria-hidden="true">
                PHOTO
              </div>
              <button type="button" className={styles.slideArrowRight} onClick={goNext} aria-label="Next photo">
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
              <div className={styles.slideCaption}>
                <span className={styles.slideTopRow}>
                  <span className={styles.slideTag}>{current.tag}</span>
                  <span className={styles.slideScore}>{current.score.toFixed(2)}</span>
                </span>
                <span className={styles.slidePerson}>
                  <img src={current.personAvatar} alt="" className={sharedStyles.avatar} />
                  {current.personName}
                </span>
                <span className={styles.slideLocation}>
                  {current.areaName} · {current.building} · {current.timeAgo}
                </span>
                <span className={styles.slideIndex}>
                  {index + 1} / {activity.length}
                </span>
              </div>
            </div>
            <div className={styles.thumbStrip}>
              {activity.map((item, i) => (
                <button
                  key={`${item.location}-${i}`}
                  type="button"
                  className={[styles.thumb, i === index ? styles.thumbActive : ""].filter(Boolean).join(" ")}
                  aria-current={i === index}
                  aria-label={`View photo ${i + 1}: ${item.location}`}
                  onClick={() => setIndex(i)}
                >
                  <span aria-hidden="true">PHOTO</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={sharedStyles.section}>
        <h2 className={sharedStyles.sectionTitle}>SOW compliance health</h2>
        <Card theme="light" className={sharedStyles.paddedCard}>
          <h3 className={sharedStyles.subheading}>Service plan adherence, by building</h3>
          <div className={sharedStyles.scoreList}>
            {buildings.map((b) => (
              <div key={b.name} className={sharedStyles.scoreRow}>
                <span className={sharedStyles.scoreName}>{b.name}</span>
                <span className={sharedStyles.scoreTrack}>
                  <span className={sharedStyles.scoreFill} style={{ width: `${b.coveragePercent}%` }} />
                </span>
                <span className={sharedStyles.scoreValue}>{b.coveragePercent}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card theme="light" className={sharedStyles.paddedCard}>
          <h3 className={sharedStyles.subheading}>Service gaps</h3>
          <p className={sharedStyles.gapPositive}>✓ No incomplete routes in the last 7 days.</p>
        </Card>
      </div>
    </div>
  );
}
