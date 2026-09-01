import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import sharedStyles from "./SowPage.module.css";
import styles from "./AreaCard.module.css";

/**
 * One real area's evidence card — the "Area" granularity card from
 * SowHierarchyPage's evidence grid (Figma fileKey
 * SWFMjlBJ4u9vSrVaomRe12, node 100:21953), pulled out into its own
 * shared component so SowTimeFirstPage's site-wide grid can reuse
 * the exact same card instead of re-deriving its own. Photo + a
 * time-ago badge, then a title/score row, an "N of M Expected
 * Services" progress bar, and a captured-time footer.
 */
export type AreaCardData = {
  key: string;
  photo?: string;
  timeAgo: string;
  title: string;
  /** A secondary line under the title — e.g. the building + area count when this card represents a whole area type rather than one area. */
  subtitle?: string;
  score: number;
  progress: { servicedToday: number; expected: number; percent: number };
  capturedLabel: string;
};

/** Responsive grid wrapper for a list of AreaCards (2/3/4 columns). */
export function AreaCardGrid({ children }: { children: ReactNode }) {
  return <div className={styles.areaCardGrid}>{children}</div>;
}

export function AreaCard({ data }: { data: AreaCardData }) {
  return (
    <Card theme="light" className={styles.areaCard}>
      <div className={styles.areaCardPhotoWrap}>
        {data.photo ? (
          <img src={data.photo} alt="" className={styles.areaCardPhoto} />
        ) : (
          <div className={styles.areaCardPhotoPlaceholder} aria-hidden="true">
            No photo
          </div>
        )}
        <span className={styles.areaCardTimeBadge}>{data.timeAgo}</span>
      </div>
      <div className={styles.areaCardBody}>
        <div className={styles.areaCardHeaderRow}>
          {data.subtitle ? (
            <span className={styles.evidenceCardTitleText}>
              <span className={styles.areaCardTag}>{data.title}</span>
              <span className={styles.evidenceCardSubtitle}>{data.subtitle}</span>
            </span>
          ) : (
            <span className={styles.areaCardTag}>{data.title}</span>
          )}
          <span className={styles.areaCardScore}>{data.score.toFixed(2)}</span>
        </div>

        <div className={styles.areaCardProgressLine}>
          <span className={styles.areaCardProgressLabel}>
            {data.progress.servicedToday.toLocaleString()} of {data.progress.expected.toLocaleString()} Expected Services
          </span>
          <span className={styles.areaCardProgressPercent}>{Math.round(data.progress.percent)}%</span>
        </div>
        <span className={styles.areaCardProgressTrack}>
          <span className={styles.areaCardProgressFill} style={{ width: `${Math.min(100, data.progress.percent)}%` }} />
        </span>

        <span className={styles.areaCardFooterRow}>
          <i className="fa-regular fa-clock" aria-hidden="true" />
          {data.capturedLabel}
        </span>
      </div>
    </Card>
  );
}

/**
 * One real "verification instance" of a specific contracted task — the
 * Scope & Frequency tab's "View Completed Scope" evidence card. Same
 * photo/badge language as AreaCard, but the footer swaps AreaCard's
 * expected-services progress bar for a technician avatar+name row
 * (this evidence is scoped to one task performed by one person, not a
 * whole area's aggregate progress).
 */
export type TaskEvidenceData = {
  key: string;
  photo?: string;
  timeAgo: string;
  taskType: string;
  areaLabel: string;
  score: number;
  techName: string;
  techAvatar: string;
  capturedLabel: string;
};

/** Responsive grid wrapper for a list of TaskEvidenceCards (2/3/4 columns) — same breakpoints as AreaCardGrid. */
export function TaskEvidenceGrid({ children }: { children: ReactNode }) {
  return <div className={styles.areaCardGrid}>{children}</div>;
}

export function TaskEvidenceCard({ data }: { data: TaskEvidenceData }) {
  return (
    <Card theme="light" className={styles.areaCard}>
      <div className={styles.areaCardPhotoWrap}>
        {data.photo ? (
          <img src={data.photo} alt="" className={styles.areaCardPhoto} />
        ) : (
          <div className={styles.areaCardPhotoPlaceholder} aria-hidden="true">
            No photo
          </div>
        )}
        <span className={styles.areaCardTimeBadge}>{data.timeAgo}</span>
      </div>
      <div className={styles.areaCardBody}>
        <div className={styles.evidenceCardHeaderRow}>
          <span className={styles.evidenceCardTitleGroup}>
            <i className="fa-solid fa-broom" aria-hidden="true" />
            <span className={styles.evidenceCardTitleText}>
              <span className={styles.areaCardTag}>{data.taskType}</span>
              <span className={styles.evidenceCardSubtitle}>{data.areaLabel}</span>
            </span>
          </span>
          <span className={styles.areaCardScore}>{data.score.toFixed(1)}</span>
        </div>

        <div className={styles.evidenceCardTechRow}>
          <img src={data.techAvatar} alt="" className={styles.evidenceCardAvatar} />
          <span>{data.techName}</span>
        </div>

        <span className={styles.areaCardFooterRow}>
          <i className="fa-regular fa-clock" aria-hidden="true" />
          {data.capturedLabel}
        </span>
      </div>
    </Card>
  );
}

/** Compact table read on the same area evidence — the "List" alternative to AreaCard's photo grid. */
export function AreaCardList({ items }: { items: AreaCardData[] }) {
  return (
    <Card theme="light" className={sharedStyles.tableWrap}>
      <table className={sharedStyles.table}>
        <thead>
          <tr>
            <th>Area</th>
            <th>Expected services</th>
            <th>Score</th>
            <th>Captured</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <td>
                {item.title}
                {item.subtitle && <span className={styles.evidenceCardSubtitle}> — {item.subtitle}</span>}
              </td>
              <td>
                {item.progress.servicedToday.toLocaleString()} of {item.progress.expected.toLocaleString()} (
                {Math.round(item.progress.percent)}%)
              </td>
              <td>{item.score.toFixed(2)}</td>
              <td>{item.capturedLabel}</td>
              <td>{item.timeAgo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
