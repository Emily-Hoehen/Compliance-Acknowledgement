"use client";

import { Fragment, useMemo, useState } from "react";
import { SowNav } from "./SowNav";
import { Card } from "../ui/Card";
import { Sparkline } from "../ui/Charts";
import {
  facilitySummary,
  scoreForDay,
  scaleForDay,
  trendSeries,
  serviceGapsForPeriod,
  SERVICE_GAP_SPACES,
  teamForNode,
  areaTypeCoverage,
  concourseDAreaTypes,
  statusForAreaType,
  allAreaVerifications,
  allAreaAudits,
  verificationToActivity,
  auditToActivity,
  applyPeriodVariationToActivity,
  type TeamMember,
  type AreaTypeStatus,
  type ActivityItem,
  type ActivityKind,
} from "../../lib/sowData";
import type { RosterPerson } from "../../lib/csv";
import sharedStyles from "./SowPage.module.css";
import styles from "./SowTimeFirstPage.module.css";

type PeriodId = "today" | "yesterday" | "week" | "month" | "ytd";

const PERIODS: { id: PeriodId; label: string; days: number; points: number; gapCount: number; teamCount: number }[] = [
  { id: "today", label: "Today", days: 1, points: 7, gapCount: 1, teamCount: 6 },
  { id: "yesterday", label: "Yesterday", days: 1, points: 7, gapCount: 2, teamCount: 6 },
  { id: "week", label: "This week", days: 7, points: 7, gapCount: 3, teamCount: 8 },
  { id: "month", label: "This month", days: 30, points: 6, gapCount: 5, teamCount: 10 },
  { id: "ytd", label: "YTD", days: 240, points: 8, gapCount: 8, teamCount: 12 },
];

const ALL_SPACES = "All spaces";

/**
 * Every space this page can filter by, across all three space-scoped
 * sections (Site performance, Evidence, Service gaps) — the union of
 * areaTypeCoverage's live-coverage spaces and the service-gap log's
 * own space list, since the two sample datasets don't name identical
 * spaces. A space that only exists in one dataset still filters, it
 * just yields an empty state in the section that doesn't model it.
 */
const SPACE_OPTIONS = [
  ALL_SPACES,
  ...Array.from(new Set([...areaTypeCoverage.map((a) => a.name), ...SERVICE_GAP_SPACES])),
];

const EVIDENCE_FILTERS: { id: ActivityKind | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "fa-check-double" },
  { id: "verification", label: "Verifications", icon: "fa-circle-check" },
  { id: "audit", label: "Audits", icon: "fa-clipboard-check" },
];

const EVIDENCE_PAGE_SIZE = 8;

function formatGapDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type SowTimeFirstPageProps = {
  associates?: RosterPerson[];
};

/**
 * SowTimeFirstPage — seventh Scope of Work exploration: the period
 * is the primary nav, not site hierarchy or a flat tab bar. Pick
 * Yesterday / This week / This month / YTD and everything on the
 * page — the headline numbers, the trend, the team, the evidence,
 * the per-space breakdown, the gap log — recomputes for that window;
 * "Filter by space" narrows several of those sections at once, but
 * stays a secondary control you reach for, not the thing you land on.
 *
 * There's no per-day date nav here the way the other explorations
 * have one — the period itself is the time control. Each period's
 * numbers are deterministic (same scoreForDay/scaleForDay/hashSeed
 * generators as everywhere else in this project) rather than a real
 * historical rollup, so switching back to a period you already
 * viewed reproduces the same numbers.
 *
 * Team reuses the same roster-rotation generator (teamForNode) as
 * the hierarchy explorations, just seeded by period instead of a
 * single day. Evidence reuses the same verification/audit pool as
 * every other exploration, re-scored per period via
 * applyPeriodVariationToActivity. Site performance by space is new
 * to this page — the same areaTypeCoverage rows the Facility tab
 * uses, re-derived per period and filterable down to one space, so
 * "Filter by space" can answer "how did this space do this period,"
 * not just "were there gaps here." Each row also expands to that
 * space's contracted task list (the same concourseDAreaTypes tasks
 * SowContractTab/SowFacilityTab use) — the work to be done, attached
 * to the space it's promised for rather than living in its own
 * separate section. Only Concourse D's spaces carry a modeled task
 * list (same limitation as those two tabs); expanding any other
 * space says so plainly rather than showing nothing.
 *
 * Reuses SowPage.module.css for every primitive that carries over
 * (page shell, chips, stat tiles, tables) — SowTimeFirstPage.module.css
 * only holds what's new: the period/filter row, the trend header, the
 * evidence showcase grid, status badges, completion bars, and the
 * service-gap status colors.
 */
export function SowTimeFirstPage({ associates = [] }: SowTimeFirstPageProps) {
  const [period, setPeriod] = useState<PeriodId>("week");
  const [spaceFilter, setSpaceFilter] = useState(ALL_SPACES);
  const [evidenceKind, setEvidenceKind] = useState<ActivityKind | "all">("all");
  const [evidenceShown, setEvidenceShown] = useState(EVIDENCE_PAGE_SIZE);

  const periodConfig = PERIODS.find((p) => p.id === period)!;

  const completed = Math.round(
    facilitySummary.verificationsCompleted * periodConfig.days * scaleForDay(`period-${period}-completed`, 0, 0.94, 1.02)
  );
  const expected = Math.round(facilitySummary.verificationsExpected * periodConfig.days);
  const timeCapturedPercent = Math.min(
    100,
    Math.round(facilitySummary.hoursCapturedPercent * scaleForDay(`period-${period}-captured`, 0, 0.94, 1.04))
  );
  const avgScore = scoreForDay(`period-${period}-score`, 0);

  const trend = useMemo(() => trendSeries(`period-${period}`, periodConfig.points, 0), [period, periodConfig.points]);
  const trendLast = trend[trend.length - 1];

  const gaps = useMemo(() => serviceGapsForPeriod(period, periodConfig.gapCount), [period, periodConfig.gapCount]);
  const openGapsTotal = gaps.filter((g) => g.status === "Open").length;
  const filteredGaps = spaceFilter === ALL_SPACES ? gaps : gaps.filter((g) => g.space === spaceFilter);

  // Team — who worked this period. Reuses the roster-rotation
  // generator the hierarchy explorations use for "who worked here
  // today", just seeded by period instead of a single day offset.
  const team = useMemo(
    () => teamForNode(`period-${period}-team`, associates, 0, periodConfig.teamCount),
    [period, associates, periodConfig.teamCount]
  );

  // Evidence — every verification + audit, site-wide, re-scored and
  // re-timed for the selected period (same idea as Plan vs Evidence's
  // per-day re-scoring, just keyed by period instead of day offset),
  // then narrowed by kind and by the shared space filter.
  const evidenceAll = useMemo(
    () => [...allAreaVerifications.map(verificationToActivity), ...allAreaAudits.map(auditToActivity)],
    []
  );
  const periodEvidence = useMemo(
    () => evidenceAll.map((item) => applyPeriodVariationToActivity(item, period)),
    [evidenceAll, period]
  );
  const filteredEvidence = useMemo(() => {
    let items = periodEvidence;
    if (evidenceKind !== "all") items = items.filter((item) => item.kind === evidenceKind);
    if (spaceFilter !== ALL_SPACES) items = items.filter((item) => item.location.startsWith(spaceFilter));
    return items;
  }, [periodEvidence, evidenceKind, spaceFilter]);
  const visibleEvidence = filteredEvidence.slice(0, evidenceShown);

  // Site performance by space — every modeled space's live coverage,
  // re-derived per period the same way the stat tiles above are, just
  // per space instead of site-wide, so "Filter by space" can narrow
  // all the way down to one space's full performance, not only its
  // gap log.
  const spacePerformance = useMemo(
    () =>
      areaTypeCoverage
        .map((a) => {
          const percent = Math.min(
            100,
            Math.round(a.percent * scaleForDay(`${a.name}-period-${period}`, 0, 0.85, 1.1))
          );
          const score = scoreForDay(`${a.name}-period-${period}-score`, 0);
          return { ...a, periodPercent: percent, periodScore: score, status: statusForAreaType({ percent, score }) };
        })
        .filter((a) => spaceFilter === ALL_SPACES || a.name === spaceFilter),
    [period, spaceFilter]
  );

  function handleSpaceChange(value: string) {
    setSpaceFilter(value);
    setEvidenceShown(EVIDENCE_PAGE_SIZE);
  }

  // Work to be done, attached to the space it's promised for: expand
  // a row in Site performance by space to see its contracted task
  // list. Only Concourse D's spaces have one modeled (same limitation
  // as SowContractTab/SowFacilityTab) — everything else expands to an
  // honest "not modeled" note instead of nothing.
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({});
  function toggleSpace(name: string) {
    setExpandedSpaces((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div className={sharedStyles.page} data-theme="light">
      <SowNav current="timeFirst" />

      <main className={sharedStyles.main}>
        <div className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.pageTitle}>Scope of Work — Performance</h1>
        </div>

        <div className={styles.controlBar}>
          <div className={sharedStyles.chipRow}>
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={[sharedStyles.chip, period === p.id ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
                data-theme="light"
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div
            className={[styles.spaceFilterControl, spaceFilter !== ALL_SPACES ? styles.spaceFilterControlActive : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <label htmlFor="time-first-space-filter" className={styles.spaceFilterLabel}>
              <i className="fa-solid fa-location-dot" aria-hidden="true" />
              Filter by space
            </label>
            <select
              id="time-first-space-filter"
              className={sharedStyles.filterSelect}
              value={spaceFilter}
              onChange={(e) => handleSpaceChange(e.target.value)}
              aria-label="Filter by space"
            >
              {SPACE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === ALL_SPACES ? "All spaces" : s}
                </option>
              ))}
            </select>
            {spaceFilter !== ALL_SPACES && (
              <button
                type="button"
                className={styles.spaceFilterClear}
                onClick={() => handleSpaceChange(ALL_SPACES)}
                aria-label="Clear space filter"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <p className={styles.viewingBanner}>
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          Viewing <strong>{periodConfig.label}</strong> performance
          {spaceFilter === ALL_SPACES ? (
            " across all spaces."
          ) : (
            <>
              {" "}
              for <strong>{spaceFilter}</strong> only.{" "}
              <button type="button" className={sharedStyles.textLink} onClick={() => handleSpaceChange(ALL_SPACES)}>
                Clear filter
              </button>
            </>
          )}
        </p>

        <div className={sharedStyles.statGrid}>
          <Card theme="light" className={sharedStyles.statTile}>
            <span className={sharedStyles.statTileLabel}>Expected vs. completed</span>
            <span className={sharedStyles.statTileValue}>
              {completed.toLocaleString()}
              <span className={sharedStyles.kpiValueMuted}> / {expected.toLocaleString()}</span>
            </span>
          </Card>
          <Card theme="light" className={sharedStyles.statTile}>
            <span className={sharedStyles.statTileLabel}>Time captured</span>
            <span className={sharedStyles.statTileValue}>{timeCapturedPercent}%</span>
          </Card>
          <Card theme="light" className={sharedStyles.statTile}>
            <span className={sharedStyles.statTileLabel}>Avg. score</span>
            <span className={sharedStyles.statTileValue}>{avgScore.toFixed(2)}</span>
          </Card>
          <Card theme="light" className={sharedStyles.statTile}>
            <span className={sharedStyles.statTileLabel}>Open gaps</span>
            <span className={sharedStyles.statTileValue}>{openGapsTotal}</span>
          </Card>
        </div>

        <div className={sharedStyles.section}>
          <h2 className={sharedStyles.sectionTitle}>Score trend — {periodConfig.label.toLowerCase()}</h2>
          <Card theme="light" className={sharedStyles.paddedCard}>
            <div className={styles.trendHeaderRow}>
              <span className={styles.trendValue}>{trendLast.toFixed(2)}</span>
              <span className={styles.trendCaption}>avg. score</span>
            </div>
            <Sparkline values={trend} color="var(--color-primary-500)" height={90} />
          </Card>
        </div>

        <div className={sharedStyles.section}>
          <h2 className={sharedStyles.sectionTitle}>Team — {periodConfig.label.toLowerCase()}</h2>
          <TeamTable team={team} />
        </div>

        <div className={sharedStyles.section}>
          <div className={sharedStyles.sectionHeaderRow}>
            <h2 className={sharedStyles.sectionTitle}>Evidence — {periodConfig.label.toLowerCase()}</h2>
          </div>
          <div className={sharedStyles.chipRow}>
            {EVIDENCE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={[sharedStyles.chip, evidenceKind === f.id ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
                data-theme="light"
                aria-pressed={evidenceKind === f.id}
                onClick={() => setEvidenceKind(f.id)}
              >
                <i className={`fa-solid ${f.icon}`} aria-hidden="true" /> {f.label}
              </button>
            ))}
          </div>
          {filteredEvidence.length === 0 ? (
            <p className={styles.emptyNote}>
              No evidence logged for this period{spaceFilter !== ALL_SPACES ? ` in ${spaceFilter}` : ""}.
            </p>
          ) : (
            <>
              <div className={styles.showcaseGrid}>
                {visibleEvidence.map((item, i) => (
                  <div key={`${item.location}-${i}`} className={styles.showcaseCard}>
                    <div className={styles.showcasePhoto} aria-hidden="true">
                      PHOTO
                    </div>
                    <div className={styles.showcaseCaption}>
                      <span className={styles.showcaseTopRow}>
                        <span className={styles.showcaseTag}>{item.tag}</span>
                        <span className={styles.showcaseScore}>{item.score.toFixed(1)}</span>
                      </span>
                      <span className={styles.showcasePerson}>
                        <img src={item.personAvatar} alt="" className={sharedStyles.avatarSmall} />
                        {item.personName}
                      </span>
                      <span className={styles.showcaseLocation}>
                        {item.location} · {item.timeAgo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className={styles.emptyNote}>
                Showing {visibleEvidence.length} of {filteredEvidence.length} evidence records for this period.
                {filteredEvidence.length > visibleEvidence.length && (
                  <button type="button" className={sharedStyles.textLink} onClick={() => setEvidenceShown((n) => n + EVIDENCE_PAGE_SIZE)}>
                    Show more
                  </button>
                )}
              </p>
            </>
          )}
        </div>

        <div className={sharedStyles.section}>
          <h2 className={sharedStyles.sectionTitle}>Site performance by space — {periodConfig.label.toLowerCase()}</h2>
          {spacePerformance.length === 0 ? (
            <p className={styles.emptyNote}>No live coverage data modeled for {spaceFilter}.</p>
          ) : (
            <Card theme="light" className={sharedStyles.tableWrap}>
              <table className={sharedStyles.table}>
                <thead>
                  <tr>
                    <th aria-hidden="true" />
                    <th>Space</th>
                    <th>Building</th>
                    <th>Completion</th>
                    <th>Avg. score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {spacePerformance.map((a) => {
                    const isOpen = !!expandedSpaces[a.name];
                    const tasks = concourseDAreaTypes.find((at) => at.name === a.name)?.tasks;
                    return (
                      <Fragment key={a.name}>
                        <tr>
                          <td>
                            <button
                              type="button"
                              className={sharedStyles.rowToggle}
                              onClick={() => toggleSpace(a.name)}
                              aria-expanded={isOpen}
                              aria-label={`Show work to be done for ${a.name}`}
                            >
                              <span
                                className={[sharedStyles.treeCaret, isOpen ? sharedStyles.treeCaretOpen : ""]
                                  .filter(Boolean)
                                  .join(" ")}
                                aria-hidden="true"
                              >
                                ▸
                              </span>
                            </button>
                          </td>
                          <td>{a.name}</td>
                          <td>{a.building}</td>
                          <td>
                            <span className={styles.completionCell}>
                              <span className={styles.completionBarTrack}>
                                <span
                                  className={styles.completionBarFill}
                                  style={{ width: `${Math.min(100, a.periodPercent)}%` }}
                                />
                              </span>
                              <span className={styles.completionValue}>{a.periodPercent}%</span>
                            </span>
                          </td>
                          <td>{a.periodScore.toFixed(2)}</td>
                          <td>
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={6} className={sharedStyles.verificationCell}>
                              {tasks && tasks.length > 0 ? (
                                <div className={sharedStyles.taskList}>
                                  {tasks.map((task) => (
                                    <div key={task.label} className={sharedStyles.taskRow}>
                                      <span className={sharedStyles.taskLabel}>{task.label}</span>
                                      <span className={sharedStyles.frequencyText}>{task.frequency}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className={styles.emptyNote}>
                                  No contracted task list modeled for {a.name} yet — select a Concourse D space (Break
                                  Rooms or Gates) for the full example.
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <div className={sharedStyles.section}>
          <h2 className={sharedStyles.sectionTitle}>Service gaps — {periodConfig.label.toLowerCase()}</h2>
          {filteredGaps.length === 0 ? (
            <p className={styles.emptyNote}>
              No service gaps logged for this period{spaceFilter !== ALL_SPACES ? ` in ${spaceFilter}` : ""}.
            </p>
          ) : (
            <Card theme="light" className={sharedStyles.tableWrap}>
              <table className={sharedStyles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Space</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGaps.map((g, i) => (
                    <tr key={`${g.space}-${g.daysAgo}-${i}`}>
                      <td>{formatGapDate(g.daysAgo)}</td>
                      <td>{g.space}</td>
                      <td>{g.reason}</td>
                      <td>
                        <span className={g.status === "Resolved" ? styles.gapStatusResolved : styles.gapStatusOpen}>
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function TeamTable({ team }: { team: TeamMember[] }) {
  if (team.length === 0) {
    return <p className={styles.emptyNote}>No team roster available for this period.</p>;
  }
  return (
    <Card theme="light" className={sharedStyles.tableWrap}>
      <table className={sharedStyles.table}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Shift</th>
            <th>Services done</th>
            <th>Avg. score</th>
            <th>Time worked</th>
            <th>Most recent</th>
          </tr>
        </thead>
        <tbody>
          {team.map((member) => (
            <tr key={member.name}>
              <td>
                <div className={sharedStyles.personCell}>
                  <img src={member.avatar} alt="" className={sharedStyles.avatar} />
                  <span className={sharedStyles.personCellName}>
                    {member.name}
                    <span className={sharedStyles.personCellSub}>{member.position}</span>
                  </span>
                </div>
              </td>
              <td>{member.shift}</td>
              <td>{member.servicesCompleted}</td>
              <td>{member.avgScore.toFixed(2)}</td>
              <td>{member.timeWorked}</td>
              <td>{member.mostRecent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function StatusBadge({ status }: { status: AreaTypeStatus }) {
  const label = status === "at-risk" ? "At risk" : status === "low-score" ? "Low score" : "On track";
  const cls =
    status === "at-risk" ? styles.statusBadgeAtRisk : status === "low-score" ? styles.statusBadgeLowScore : styles.statusBadgeOnTrack;
  return <span className={[styles.statusBadge, cls].join(" ")}>{label}</span>;
}
