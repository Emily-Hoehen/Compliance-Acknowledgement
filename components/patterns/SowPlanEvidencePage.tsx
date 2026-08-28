"use client";

import { useMemo, useState } from "react";
import { SowNav } from "./SowNav";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { SearchIcon } from "./icons";
import { siteInfo } from "../../lib/homeDashboardData";
import {
  siteContractStats,
  performanceStats,
  facilitySummary,
  buildings,
  concourseDAreaTypes,
  allAreaVerifications,
  allAreaAudits,
  verificationToActivity,
  auditToActivity,
  applyDayVariationToActivity,
  scoreForDay,
  scaleForDay,
  statusForAreaType,
  type ActivityKind,
  type ActivityItem,
  type AreaTypeStatus,
} from "../../lib/sowData";
import sharedStyles from "./SowPage.module.css";
import styles from "./SowPlanEvidencePage.module.css";

type PlanEvidenceTab = "performance" | "plan" | "evidence";
type EvidenceViewMode = "showcase" | "dashboard";
type EvidenceSort = "recent" | "score-desc" | "score-asc";
type PlanStatusFilter = "all" | AreaTypeStatus;
type PlanSort = "completion-asc" | "completion-desc" | "name";
type BuildingStatus = "at-risk" | "on-track";

function formatDateLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (offset === 0) return `Today, ${dateStr}`;
  if (offset === 1) return `Yesterday, ${dateStr}`;
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday}, ${dateStr}`;
}

/** Buildings don't carry a score dimension in this dataset, so their status is coverage-only — a simpler two-state read than an area type's three-state status. */
function buildingStatus(percent: number): BuildingStatus {
  return percent < 45 ? "at-risk" : "on-track";
}

const TABS: { id: PlanEvidenceTab; label: string; icon: string }[] = [
  { id: "performance", label: "Site Performance", icon: "fa-gauge-high" },
  { id: "plan", label: "Service Plan", icon: "fa-list-check" },
  { id: "evidence", label: "Evidence", icon: "fa-camera" },
];

const STATUS_FILTERS: { id: PlanStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "at-risk", label: "At risk" },
  { id: "on-track", label: "On track" },
  { id: "low-score", label: "Low score" },
];

const PLAN_SORTS: { id: PlanSort; label: string }[] = [
  { id: "completion-asc", label: "Completion (low first)" },
  { id: "completion-desc", label: "Completion (high first)" },
  { id: "name", label: "Area type (A–Z)" },
];

const ACTIVITY_FILTERS: { id: ActivityKind | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "fa-check-double" },
  { id: "verification", label: "Verifications", icon: "fa-circle-check" },
  { id: "audit", label: "Audits", icon: "fa-clipboard-check" },
];

const EVIDENCE_SORTS: { id: EvidenceSort; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "score-desc", label: "Highest score" },
  { id: "score-asc", label: "Lowest score" },
];

/**
 * SowPlanEvidencePage — fourth Scope of Work exploration, organized
 * around one idea rather than a site hierarchy or a facility
 * breakdown: the plan is a promise, the evidence is proof it
 * happened.
 *
 *  - Site Performance: a daily read on promised vs. happening vs.
 *    needs attention — not a data dump, a status check.
 *  - Service Plan: every commitment, its frequency, and its
 *    completion signal, flattened into one searchable/sortable
 *    operating table instead of a nested accordion.
 *  - Evidence: every quality score traced back to the work, place,
 *    and person behind it, toggled between Showcase (big pictures,
 *    minimal chrome) and Dashboard (dense table) views of the same
 *    underlying verification/audit feed.
 *
 * Only Concourse D carries task-level commitments (same limitation
 * as the other SOW explorations), so Service Plan is scoped to it;
 * Site Performance and Evidence draw from site-wide data.
 *
 * The date nav actually drives the numbers here too, via the same
 * scoreForDay/scaleForDay generators as SowHierarchyPage and
 * SowHierarchyDetailPage — "yesterday" is a deterministic,
 * plausible-looking variation, not a replay of a real past day.
 *
 * Reuses SowPage.module.css for every primitive that carries over
 * (page shell, tabs, KPI boxes, stat tiles, chips, tables, the photo
 * mosaic) — SowPlanEvidencePage.module.css only holds what's new:
 * the date nav, the promised/happening/attention trio, the
 * attention list, status badges, and the Showcase photo grid.
 */
export function SowPlanEvidencePage() {
  const [activeTab, setActiveTab] = useState<PlanEvidenceTab>("performance");
  const [dayOffset, setDayOffset] = useState(0);

  // Service Plan state — lifted to the page so Site Performance's
  // "needs attention" rows can jump here pre-filtered.
  const [planSearch, setPlanSearch] = useState("");
  const [planStatusFilter, setPlanStatusFilter] = useState<PlanStatusFilter>("all");
  const [planSort, setPlanSort] = useState<PlanSort>("completion-asc");

  // Evidence state
  const [evidenceView, setEvidenceView] = useState<EvidenceViewMode>("showcase");
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [evidenceKindFilter, setEvidenceKindFilter] = useState<ActivityKind | "all">("all");
  const [evidenceSort, setEvidenceSort] = useState<EvidenceSort>("recent");

  function focusAreaTypeInPlan(name: string) {
    setPlanSearch(name);
    setPlanStatusFilter("all");
    setActiveTab("plan");
  }

  // The reverse trip: Service Plan's commitments are area-type rows
  // with no proof attached — this jumps to Evidence pre-searched to
  // that area type so a commitment's completion % can be checked
  // against the actual verifications/audits behind it. (Evidence's
  // pool is site-wide, not Concourse-D-only, so an area type name
  // that only exists in the plan's own list — not in the site-wide
  // coverage data — will land on an honestly empty result.)
  function focusAreaTypeInEvidence(name: string) {
    setEvidenceSearch(name);
    setEvidenceKindFilter("all");
    setActiveTab("evidence");
  }

  // Every Concourse D area type's coverage, re-derived per day — same
  // formulas as SowHierarchyDetailPage's dayAreaTypeRows, so all
  // three SOW explorations agree on what "today" looks like.
  const dayAreaTypeRows = useMemo(
    () =>
      concourseDAreaTypes.map((at) => {
        const dayServicedToday = Math.max(
          0,
          Math.round(at.servicedToday * scaleForDay(`${at.name}-serviced`, dayOffset))
        );
        const dayPercent = Math.min(100, (dayServicedToday / at.expectedServices) * 100);
        const dayScore = scoreForDay(`${at.name}-score`, dayOffset);
        return {
          ...at,
          dayServicedToday,
          dayPercent,
          dayScore,
          status: statusForAreaType({ percent: dayPercent, score: dayScore }),
        };
      }),
    [dayOffset]
  );

  const dayBuildingRows = useMemo(
    () =>
      buildings.map((b) => {
        const dayPercent = Math.min(100, Math.round(b.coveragePercent * scaleForDay(`${b.name}-coverage`, dayOffset)));
        return { ...b, dayPercent, status: buildingStatus(dayPercent) };
      }),
    [dayOffset]
  );

  const dayVerificationsCompleted = Math.round(
    facilitySummary.verificationsCompleted * scaleForDay("site-completed", dayOffset)
  );
  const dayHoursCapturedPercent = Math.min(
    100,
    Math.round(facilitySummary.hoursCapturedPercent * scaleForDay("site-captured", dayOffset))
  );
  const dayVerificationScore = scoreForDay("site-verification-score", dayOffset);
  const dayAuditScore = scoreForDay("site-audit-score", dayOffset);

  // Needs attention: flagged Concourse D area types (full detail) plus
  // any other building whose coverage alone is low enough to flag
  // (the other six buildings don't have area-type detail modeled, so
  // the building itself is as granular as this page can get for them).
  const needsAttention = useMemo(() => {
    const areaTypeItems = dayAreaTypeRows
      .filter((a) => a.status !== "on-track")
      .map((a) => ({
        kind: "areaType" as const,
        name: a.name,
        status: a.status,
        detail:
          a.status === "low-score"
            ? `Avg. score ${a.dayScore.toFixed(2)} — below target`
            : `${a.dayPercent.toFixed(0)}% coverage — below expected`,
      }));
    const buildingItems = dayBuildingRows
      .filter((b) => b.name !== "Concourse D" && b.status === "at-risk")
      .map((b) => ({
        kind: "building" as const,
        name: b.name,
        status: b.status as AreaTypeStatus | BuildingStatus,
        detail: `${b.dayPercent}% coverage — below expected`,
      }));
    return [...areaTypeItems, ...buildingItems];
  }, [dayAreaTypeRows, dayBuildingRows]);

  // Service Plan: every Concourse D commitment flattened into one
  // flat, searchable/sortable table instead of a per-area accordion.
  const planRows = useMemo(
    () =>
      dayAreaTypeRows.flatMap((at) =>
        at.tasks.map((task) => ({
          areaType: at.name,
          task: task.label,
          frequency: task.frequency,
          percent: at.dayPercent,
          status: at.status,
        }))
      ),
    [dayAreaTypeRows]
  );

  const planQ = planSearch.trim().toLowerCase();
  const filteredPlanRows = useMemo(() => {
    let rows = planRows;
    if (planStatusFilter !== "all") rows = rows.filter((r) => r.status === planStatusFilter);
    if (planQ) rows = rows.filter((r) => r.areaType.toLowerCase().includes(planQ) || r.task.toLowerCase().includes(planQ));
    const sorted = [...rows];
    switch (planSort) {
      case "completion-asc":
        sorted.sort((a, b) => a.percent - b.percent);
        break;
      case "completion-desc":
        sorted.sort((a, b) => b.percent - a.percent);
        break;
      case "name":
        sorted.sort((a, b) => a.areaType.localeCompare(b.areaType) || a.task.localeCompare(b.task));
        break;
    }
    return sorted;
  }, [planRows, planStatusFilter, planQ, planSort]);

  const avgCompletion = Math.round(
    dayAreaTypeRows.reduce((sum, a) => sum + a.dayPercent, 0) / dayAreaTypeRows.length
  );

  // Evidence: every verification + audit across every modeled area
  // type, site-wide (not scoped to Concourse D) — the fuller pool is
  // what makes tracing a score back to work/place/person meaningful.
  const evidenceActivityAll = useMemo(
    () => [...allAreaVerifications.map(verificationToActivity), ...allAreaAudits.map(auditToActivity)],
    []
  );
  const dayEvidenceActivityAll = useMemo(
    () => evidenceActivityAll.map((item) => applyDayVariationToActivity(item, dayOffset)),
    [evidenceActivityAll, dayOffset]
  );
  const evidenceQ = evidenceSearch.trim().toLowerCase();
  const filteredEvidence = useMemo(
    () =>
      dayEvidenceActivityAll.filter((item) => {
        const matchesKind = evidenceKindFilter === "all" || item.kind === evidenceKindFilter;
        const matchesSearch =
          !evidenceQ || item.location.toLowerCase().includes(evidenceQ) || item.personName.toLowerCase().includes(evidenceQ);
        return matchesKind && matchesSearch;
      }),
    [dayEvidenceActivityAll, evidenceKindFilter, evidenceQ]
  );
  const sortedEvidence = useMemo(() => {
    const arr = [...filteredEvidence];
    if (evidenceSort === "score-desc") arr.sort((a, b) => b.score - a.score);
    else if (evidenceSort === "score-asc") arr.sort((a, b) => a.score - b.score);
    return arr;
  }, [filteredEvidence, evidenceSort]);

  return (
    <div className={sharedStyles.page} data-theme="light">
      <SowNav current="planEvidence" />

      <main className={sharedStyles.main}>
        <div className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.pageTitle}>Plan vs Evidence for {siteInfo.siteName}</h1>
          <div className={styles.dateNav}>
            <button
              type="button"
              className={styles.dateNavArrow}
              onClick={() => setDayOffset((o) => o + 1)}
              aria-label="Previous day"
            >
              ‹
            </button>
            <span className={styles.dateNavLabel}>{formatDateLabel(dayOffset)}</span>
            <button
              type="button"
              className={styles.dateNavArrow}
              onClick={() => setDayOffset((o) => Math.max(0, o - 1))}
              disabled={dayOffset === 0}
              aria-label="Next day"
            >
              ›
            </button>
            <button
              type="button"
              className={[sharedStyles.chip, dayOffset === 0 ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
              data-theme="light"
              onClick={() => setDayOffset(0)}
            >
              Today
            </button>
            <button
              type="button"
              className={[sharedStyles.chip, dayOffset === 1 ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
              data-theme="light"
              onClick={() => setDayOffset(1)}
            >
              Yesterday
            </button>
          </div>
        </div>

        <div className={sharedStyles.tabBar} role="tablist" aria-label="Plan vs Evidence views">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={[sharedStyles.tabButton, activeTab === tab.id ? sharedStyles.tabButtonActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fa-solid ${tab.icon}`} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "performance" && (
          <SitePerformanceTab
            dayVerificationsCompleted={dayVerificationsCompleted}
            dayHoursCapturedPercent={dayHoursCapturedPercent}
            dayVerificationScore={dayVerificationScore}
            dayAuditScore={dayAuditScore}
            dayBuildingRows={dayBuildingRows}
            needsAttention={needsAttention}
            onFocusAreaType={focusAreaTypeInPlan}
          />
        )}

        {activeTab === "plan" && (
          <ServicePlanTab
            rows={filteredPlanRows}
            totalRows={planRows.length}
            avgCompletion={avgCompletion}
            search={planSearch}
            setSearch={setPlanSearch}
            statusFilter={planStatusFilter}
            setStatusFilter={setPlanStatusFilter}
            sort={planSort}
            setSort={setPlanSort}
            onViewEvidence={focusAreaTypeInEvidence}
          />
        )}

        {activeTab === "evidence" && (
          <EvidenceTab
            view={evidenceView}
            setView={setEvidenceView}
            search={evidenceSearch}
            setSearch={setEvidenceSearch}
            kindFilter={evidenceKindFilter}
            setKindFilter={setEvidenceKindFilter}
            sort={evidenceSort}
            setSort={setEvidenceSort}
            items={sortedEvidence}
            total={dayEvidenceActivityAll.length}
          />
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: AreaTypeStatus | BuildingStatus }) {
  const label = status === "at-risk" ? "At risk" : status === "low-score" ? "Low score" : "On track";
  const cls =
    status === "at-risk"
      ? styles.statusBadgeAtRisk
      : status === "low-score"
        ? styles.statusBadgeLowScore
        : styles.statusBadgeOnTrack;
  return <span className={[styles.statusBadge, cls].join(" ")}>{label}</span>;
}

type AttentionItem = {
  kind: "areaType" | "building";
  name: string;
  status: AreaTypeStatus | BuildingStatus;
  detail: string;
};

function SitePerformanceTab({
  dayVerificationsCompleted,
  dayHoursCapturedPercent,
  dayVerificationScore,
  dayAuditScore,
  dayBuildingRows,
  needsAttention,
  onFocusAreaType,
}: {
  dayVerificationsCompleted: number;
  dayHoursCapturedPercent: number;
  dayVerificationScore: number;
  dayAuditScore: number;
  dayBuildingRows: { name: string; dayPercent: number; status: BuildingStatus }[];
  needsAttention: AttentionItem[];
  onFocusAreaType: (name: string) => void;
}) {
  return (
    <div className={sharedStyles.sectionStack}>
      <div className={styles.trioGrid}>
        <Card theme="light" className={sharedStyles.kpiBox}>
          <h2 className={sharedStyles.kpiBoxTitle}>
            <i className="fa-solid fa-file-contract" aria-hidden="true" /> Promised
          </h2>
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
          <h2 className={sharedStyles.kpiBoxTitle}>
            <i className="fa-solid fa-bolt" aria-hidden="true" /> Happening
          </h2>
          <div className={sharedStyles.kpiList}>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>
                {dayVerificationsCompleted.toLocaleString()}
                <span className={sharedStyles.kpiValueMuted}> / {facilitySummary.verificationsExpected.toLocaleString()}</span>
              </span>
              <span className={sharedStyles.kpiLabel}>Services completed today</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{dayHoursCapturedPercent}%</span>
              <span className={sharedStyles.kpiLabel}>Time captured</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{dayVerificationScore.toFixed(2)}</span>
              <span className={sharedStyles.kpiLabel}>Avg. verification score</span>
            </div>
          </div>
        </Card>

        <Card theme="light" className={sharedStyles.kpiBox}>
          <h2 className={sharedStyles.kpiBoxTitle}>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Needs attention
          </h2>
          <div className={sharedStyles.kpiList}>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{needsAttention.length}</span>
              <span className={sharedStyles.kpiLabel}>Flagged area types &amp; buildings</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{dayAuditScore.toFixed(2)}</span>
              <span className={sharedStyles.kpiLabel}>Avg. audit score</span>
            </div>
            <div className={sharedStyles.kpiItem}>
              <span className={sharedStyles.kpiValue}>{performanceStats.complaints.total}</span>
              <span className={sharedStyles.kpiLabel}>Open complaints</span>
            </div>
          </div>
        </Card>
      </div>

      <div className={sharedStyles.section}>
        <h2 className={sharedStyles.sectionTitle}>Needs attention</h2>
        {needsAttention.length === 0 ? (
          <p className={sharedStyles.gapPositive}>✓ Nothing flagged today — every building and area type is on track.</p>
        ) : (
          <Card theme="light" className={styles.attentionList}>
            {needsAttention.map((item) => (
              <div key={`${item.kind}-${item.name}`} className={styles.attentionRow}>
                <span className={styles.attentionMain}>
                  <span className={styles.attentionName}>
                    <i className={`fa-solid ${item.kind === "building" ? "fa-building" : "fa-shapes"}`} aria-hidden="true" />{" "}
                    {item.name}
                  </span>
                  <span className={styles.attentionDetail}>{item.detail}</span>
                </span>
                <span className={styles.attentionMeta}>
                  <StatusBadge status={item.status} />
                  {item.kind === "areaType" && (
                    <button type="button" className={sharedStyles.textLink} onClick={() => onFocusAreaType(item.name)}>
                      View in plan
                      <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div className={sharedStyles.section}>
        <h2 className={sharedStyles.sectionTitle}>Promised vs. happening, by building</h2>
        <Card theme="light" className={sharedStyles.paddedCard}>
          <div className={sharedStyles.scoreList}>
            {dayBuildingRows.map((b) => (
              <div key={b.name} className={sharedStyles.scoreRow}>
                <span className={sharedStyles.scoreName}>{b.name}</span>
                <span className={sharedStyles.scoreTrack}>
                  <span className={sharedStyles.scoreFill} style={{ width: `${b.dayPercent}%` }} />
                </span>
                <span className={sharedStyles.scoreValue}>{b.dayPercent}%</span>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

type PlanRow = { areaType: string; task: string; frequency: string; percent: number; status: AreaTypeStatus };

function ServicePlanTab({
  rows,
  totalRows,
  avgCompletion,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sort,
  setSort,
  onViewEvidence,
}: {
  rows: PlanRow[];
  totalRows: number;
  avgCompletion: number;
  search: string;
  setSearch: (v: string) => void;
  statusFilter: PlanStatusFilter;
  setStatusFilter: (v: PlanStatusFilter) => void;
  sort: PlanSort;
  setSort: (v: PlanSort) => void;
  onViewEvidence: (areaType: string) => void;
}) {
  return (
    <div className={sharedStyles.sectionStack}>
      <div className={sharedStyles.statGrid}>
        <Card theme="light" className={sharedStyles.statTile}>
          <span className={sharedStyles.statTileLabel}>Commitments</span>
          <span className={sharedStyles.statTileValue}>{totalRows}</span>
        </Card>
        <Card theme="light" className={sharedStyles.statTile}>
          <span className={sharedStyles.statTileLabel}>Frequency types</span>
          <span className={sharedStyles.statTileValue}>{siteContractStats.frequencyTypes}</span>
        </Card>
        <Card theme="light" className={sharedStyles.statTile}>
          <span className={sharedStyles.statTileLabel}>Area types modeled</span>
          <span className={sharedStyles.statTileValue}>{concourseDAreaTypes.length}</span>
        </Card>
        <Card theme="light" className={sharedStyles.statTile}>
          <span className={sharedStyles.statTileLabel}>Avg. completion</span>
          <span className={sharedStyles.statTileValue}>{avgCompletion}%</span>
        </Card>
      </div>

      <p className={styles.emptyNote}>
        Showing Concourse D — the only building with task-level commitments modeled in this exploration.
      </p>

      <div className={sharedStyles.planToolbar}>
        <div className={sharedStyles.searchWrap}>
          <Input
            theme="light"
            icon={<SearchIcon />}
            placeholder="Search area type or commitment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search commitments"
          />
        </div>
        <select
          className={sharedStyles.filterSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value as PlanSort)}
          aria-label="Sort commitments"
        >
          {PLAN_SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className={sharedStyles.chipRow}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={[sharedStyles.chip, statusFilter === f.id ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
            data-theme="light"
            aria-pressed={statusFilter === f.id}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={styles.emptyNote}>No commitments match these filters.</p>
      ) : (
        <Card theme="light" className={sharedStyles.tableWrap}>
          <table className={sharedStyles.table}>
            <thead>
              <tr>
                <th>Area type</th>
                <th>Commitment</th>
                <th>Frequency</th>
                <th>Completion</th>
                <th>Status</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.areaType}-${r.task}-${i}`}>
                  <td>{r.areaType}</td>
                  <td>{r.task}</td>
                  <td>{r.frequency}</td>
                  <td>
                    <span className={styles.completionCell}>
                      <span className={styles.completionBarTrack}>
                        <span className={styles.completionBarFill} style={{ width: `${Math.min(100, r.percent)}%` }} />
                      </span>
                      <span className={styles.completionValue}>{r.percent.toFixed(0)}%</span>
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <button type="button" className={sharedStyles.textLink} onClick={() => onViewEvidence(r.areaType)}>
                      <i className="fa-solid fa-camera" aria-hidden="true" />
                      View evidence
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function EvidenceTab({
  view,
  setView,
  search,
  setSearch,
  kindFilter,
  setKindFilter,
  sort,
  setSort,
  items,
  total,
}: {
  view: EvidenceViewMode;
  setView: (v: EvidenceViewMode) => void;
  search: string;
  setSearch: (v: string) => void;
  kindFilter: ActivityKind | "all";
  setKindFilter: (v: ActivityKind | "all") => void;
  sort: EvidenceSort;
  setSort: (v: EvidenceSort) => void;
  items: ActivityItem[];
  total: number;
}) {
  return (
    <div className={sharedStyles.sectionStack}>
      <div className={sharedStyles.sectionHeaderRow}>
        <h2 className={sharedStyles.sectionTitle}>Evidence</h2>
        <div className={sharedStyles.viewToggleGroup}>
          <button
            type="button"
            className={[sharedStyles.viewToggleButton, view === "showcase" ? sharedStyles.viewToggleButtonActive : ""]
              .filter(Boolean)
              .join(" ")}
            data-theme="light"
            onClick={() => setView("showcase")}
          >
            <i className="fa-solid fa-images" aria-hidden="true" /> Showcase
          </button>
          <button
            type="button"
            className={[sharedStyles.viewToggleButton, view === "dashboard" ? sharedStyles.viewToggleButtonActive : ""]
              .filter(Boolean)
              .join(" ")}
            data-theme="light"
            onClick={() => setView("dashboard")}
          >
            <i className="fa-solid fa-table-list" aria-hidden="true" /> Dashboard
          </button>
        </div>
      </div>

      <div className={sharedStyles.planToolbar}>
        <div className={sharedStyles.searchWrap}>
          <Input
            theme="light"
            icon={<SearchIcon />}
            placeholder="Search by place or person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search evidence"
          />
        </div>
        <select
          className={sharedStyles.filterSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value as EvidenceSort)}
          aria-label="Sort evidence"
        >
          {EVIDENCE_SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className={sharedStyles.chipRow}>
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={[sharedStyles.chip, kindFilter === f.id ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
            data-theme="light"
            aria-pressed={kindFilter === f.id}
            onClick={() => setKindFilter(f.id)}
          >
            <i className={`fa-solid ${f.icon}`} aria-hidden="true" /> {f.label}
          </button>
        ))}
      </div>
      <p className={styles.emptyNote}>
        Showing {items.length} of {total} evidence records.
      </p>

      {items.length === 0 ? (
        <p className={styles.emptyNote}>No evidence matches these filters.</p>
      ) : view === "showcase" ? (
        <div className={styles.showcaseGrid}>
          {items.map((item, i) => (
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
      ) : (
        <Card theme="light" className={sharedStyles.tableWrap}>
          <table className={sharedStyles.table}>
            <thead>
              <tr>
                <th>Score</th>
                <th>Type</th>
                <th>Location</th>
                <th>Person</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={`${item.location}-${i}`}>
                  <td>
                    <span className={sharedStyles.photoScore}>{item.score.toFixed(2)}</span>
                  </td>
                  <td>
                    <span className={sharedStyles.typeTag}>{item.tag}</span>
                  </td>
                  <td>{item.location}</td>
                  <td>
                    <div className={sharedStyles.personCell}>
                      <img src={item.personAvatar} alt="" className={sharedStyles.avatar} />
                      <span>{item.personName}</span>
                    </div>
                  </td>
                  <td>{item.timeAgo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
