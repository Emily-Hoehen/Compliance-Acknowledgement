"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SowNav } from "./SowNav";
import { Card } from "../ui/Card";
import { Sparkline } from "../ui/Charts";
import { ButtonGroup, type ButtonGroupOption } from "../ui/ButtonGroup";
import { DsSelect } from "../ui/Select";
import { AreaCard, AreaCardGrid, AreaCardList, TaskEvidenceCard, TaskEvidenceGrid, type AreaCardData, type TaskEvidenceData } from "./AreaCard";
import { siteInfo } from "../../lib/homeDashboardData";
import {
  siteContractStats,
  facilitySummary,
  scoreForDay,
  scaleForDay,
  trendSeries,
  hashSeed,
  taskTypes,
  shifts,
  areaTypeFromContract,
  capturedDurationLabel,
  hoursCapturedForNode,
  auditSummaryForNode,
  teamForNode,
  type TeamMember,
  type VerificationEvent,
} from "../../lib/sowData";
import { photoForAreaType } from "../../lib/sowImages";
import type { ContractArea, ContractAreaType, ContractBuilding, ContractTaskDef } from "../../lib/sowContract";
import type { RosterPerson } from "../../lib/csv";
import sharedStyles from "./SowPage.module.css";
import styles from "./SowTimeFirstPage.module.css";

type PeriodId = "today" | "yesterday" | "week" | "month" | "ytd" | "custom";

const PERIODS: { id: PeriodId; label: string; days: number; points: number; teamCount: number }[] = [
  { id: "today", label: "Today", days: 1, points: 7, teamCount: 6 },
  { id: "yesterday", label: "Yesterday", days: 1, points: 7, teamCount: 6 },
  { id: "week", label: "This Week", days: 7, points: 7, teamCount: 8 },
  { id: "month", label: "This Month", days: 30, points: 6, teamCount: 10 },
  { id: "ytd", label: "YTD", days: 240, points: 8, teamCount: 12 },
  { id: "custom", label: "Custom", days: 1, points: 7, teamCount: 6 },
];

type StatsView = "snapshot" | "trend";
const STATS_VIEW_OPTIONS: ButtonGroupOption<StatsView>[] = [
  { id: "snapshot", label: "Snapshot", icon: <i className="fa-solid fa-calendar-day" aria-hidden="true" /> },
  { id: "trend", label: "Trend", icon: <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" /> },
];

type ViewMode = "grid" | "list";
const VIEW_MODE_OPTIONS: ButtonGroupOption<ViewMode>[] = [
  { id: "grid", label: "Grid", icon: <i className="fa-solid fa-table-cells" aria-hidden="true" /> },
  { id: "list", label: "List", icon: <i className="fa-solid fa-list" aria-hidden="true" /> },
];

type FeatureTab = "site" | "headcount" | "scope";
const FEATURE_TABS: { id: FeatureTab; label: string; icon: string }[] = [
  { id: "site", label: "Verifications & Audits", icon: "fa-solid fa-image" },
  { id: "headcount", label: "Team & Occupancy", icon: "fa-solid fa-user-group" },
  { id: "scope", label: "Scope & Frequency", icon: "fa-solid fa-ballot-check" },
];

const ALL = "all";
type SortOrder = "recent" | "score-desc" | "score-asc";
const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "recent", label: "Newest Services" },
  { value: "score-desc", label: "Highest Score" },
  { value: "score-asc", label: "Lowest Score" },
];

const AREA_PAGE_SIZE = 8;
const TIME_AGO_OPTIONS = ["5 minutes ago", "17 minutes ago", "29 minutes ago", "1 hour ago", "2 hours ago", "3 hours ago"];

function timeAgoForSeed(seed: string): string {
  return TIME_AGO_OPTIONS[hashSeed(seed) % TIME_AGO_OPTIONS.length];
}

/** An area type's deterministic "primary" service type / shift — this dataset doesn't tag a whole area type (or a whole team member) with one, so Filter/Shifts narrow by a stable, seeded stand-in rather than nothing. */
function primaryTaskType(seedKey: string): VerificationEvent["type"] {
  return taskTypes[hashSeed(seedKey) % taskTypes.length];
}
function primaryShift(seedKey: string): VerificationEvent["shift"] {
  return shifts[hashSeed(`${seedKey}-shift`) % shifts.length];
}

const ORDINAL_SUFFIXES = ["th", "st", "nd", "rd"];
function ordinal(n: number): string {
  const v = n % 100;
  return `${n}${ORDINAL_SUFFIXES[(v - 20) % 10] ?? ORDINAL_SUFFIXES[v] ?? ORDINAL_SUFFIXES[0]}`;
}
function formatOrdinalDate(d: Date): string {
  return `${d.toLocaleDateString("en-US", { month: "long" })} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}
function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The big date/range heading under the site identity — a real ordinal date for the two day-scoped periods, a real calendar range (anchored on today) for the coarser ones, same spirit as SowHierarchyPage's date-preset range label. */
function periodHeading(period: PeriodId): string {
  const today = new Date();
  if (period === "today") return `Today, ${formatOrdinalDate(today)}`;
  if (period === "yesterday") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return `Yesterday, ${formatOrdinalDate(d)}`;
  }
  if (period === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return `This Week, ${formatShortDate(start)} – ${formatShortDate(today)}`;
  }
  if (period === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return `This Month, ${formatShortDate(start)} – ${formatShortDate(today)}`;
  }
  if (period === "ytd") {
    const start = new Date(today.getFullYear(), 0, 1);
    return `Year to Date, ${formatShortDate(start)} – ${formatShortDate(today)}`;
  }
  return "Custom";
}

function trendAxisLabel(period: PeriodId, isStart: boolean): string {
  if (!isStart) return "Today";
  if (period === "week") return "7 days ago";
  if (period === "month") return "30 days ago";
  if (period === "ytd") return "Jan 1";
  return "Start";
}

// ---------------- Headcount & Occupancy: per-member metrics ----------------

/** A deterministic duration in seconds — the same seeded-generator idea as everywhere else in this project, just at second-level granularity for task-level (not shift-level) time breakdowns. */
function durationSeconds(seed: string, minSeconds: number, maxSeconds: number): number {
  return minSeconds + (hashSeed(seed) % Math.max(1, maxSeconds - minSeconds));
}
function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
function complianceFlag(seed: string, chanceOfYesPercent: number): boolean {
  return hashSeed(seed) % 100 < chanceOfYesPercent;
}
function complianceCount(seed: string, max: number): number {
  return hashSeed(seed) % (max + 1);
}

type MemberMetrics = TeamMember & {
  breaksTime: string;
  lunchTime: string;
  pauseTime: string;
  detailWorkTime: string;
  suppliesTime: string;
  transitionTime: string;
  overSupplies: boolean;
  lateStart: boolean;
  earlyEnd: boolean;
  spotCleanGaps: number;
  serviceGaps: number;
  nonPeriodicToDoTime: string;
  toDoNonPeriodicTime: string;
  toSoNonWorkOrderTime: string;
  serviceTime: string;
  unproductiveTime: string;
  totalTime: string;
};

/** Every Headcount & Occupancy sub-tab's columns beyond Overview draw from this one per-member breakdown — deterministic per period+roster+name, not fabricated on top of real attendance data (this dataset has no real task-level time breakdown to carry forward). */
function computeMemberMetrics(member: TeamMember, periodSeed: string): MemberMetrics {
  const seed = `${periodSeed}-${member.name}`;
  const serviceSec = durationSeconds(`${seed}-service`, 1800, 5400);
  const transitionSec = durationSeconds(`${seed}-transition`, 300, 1500);
  const unproductiveSec = durationSeconds(`${seed}-unproductive`, 300, 1800);
  return {
    ...member,
    breaksTime: formatSeconds(durationSeconds(`${seed}-breaks`, 300, 1200)),
    lunchTime: formatSeconds(durationSeconds(`${seed}-lunch`, 1500, 2700)),
    pauseTime: formatSeconds(durationSeconds(`${seed}-pause`, 180, 900)),
    detailWorkTime: formatSeconds(durationSeconds(`${seed}-detail`, 600, 1800)),
    suppliesTime: formatSeconds(durationSeconds(`${seed}-supplies`, 300, 1500)),
    transitionTime: formatSeconds(transitionSec),
    overSupplies: complianceFlag(`${seed}-oversupplies`, 30),
    lateStart: complianceFlag(`${seed}-latestart`, 20),
    earlyEnd: complianceFlag(`${seed}-earlyend`, 20),
    spotCleanGaps: complianceCount(`${seed}-spotclean`, 4),
    serviceGaps: complianceCount(`${seed}-servicegap`, 3),
    nonPeriodicToDoTime: formatSeconds(durationSeconds(`${seed}-nonperiodic`, 600, 2400)),
    toDoNonPeriodicTime: formatSeconds(durationSeconds(`${seed}-todo`, 600, 2400)),
    toSoNonWorkOrderTime: formatSeconds(durationSeconds(`${seed}-toso`, 300, 1800)),
    serviceTime: formatSeconds(serviceSec),
    unproductiveTime: formatSeconds(unproductiveSec),
    totalTime: formatSeconds(serviceSec + transitionSec + unproductiveSec),
  };
}

function CompliancePill({ triggered }: { triggered: boolean }) {
  return <span className={triggered ? styles.compliancePillBad : styles.compliancePillGood}>{triggered ? "Yes" : "No"}</span>;
}

type ColumnDef = { key: string; label: string; render: (m: MemberMetrics) => ReactNode };

const NAME_COLUMN: ColumnDef = {
  key: "name",
  label: "Name",
  render: (m) => (
    <div className={sharedStyles.personCell}>
      <img src={m.avatar} alt="" className={sharedStyles.avatar} />
      <span className={sharedStyles.personCellName}>
        {m.name}
        <span className={sharedStyles.personCellSub}>
          {m.position} | {m.shift}
        </span>
      </span>
    </div>
  ),
};

const OVERVIEW_COLUMNS: ColumnDef[] = [
  NAME_COLUMN,
  { key: "totalTimeWorked", label: "Total Time", render: (m) => m.timeWorked },
  { key: "avgScore", label: "Avg Score", render: (m) => <span className={sharedStyles.photoScore}>{m.avgScore.toFixed(2)}</span> },
  { key: "servicesCompleted", label: "Total Services", render: (m) => m.servicesCompleted },
  { key: "mostRecent", label: "Most Recent", render: (m) => m.mostRecent },
];

const TIME_COLUMNS: ColumnDef[] = [
  NAME_COLUMN,
  { key: "breaksTime", label: "Total Breaks Time", render: (m) => m.breaksTime },
  { key: "lunchTime", label: "Total Lunch Time", render: (m) => m.lunchTime },
  { key: "pauseTime", label: "Total Pause Time", render: (m) => m.pauseTime },
  { key: "detailWorkTime", label: "Total Detail Work Time", render: (m) => m.detailWorkTime },
  { key: "suppliesTime", label: "Total Supplies Time", render: (m) => m.suppliesTime },
  { key: "transitionTime", label: "Total Transition Time", render: (m) => m.transitionTime },
];

const COMPLIANCE_COLUMNS: ColumnDef[] = [
  NAME_COLUMN,
  { key: "overSupplies", label: ">15 min Supplies", render: (m) => <CompliancePill triggered={m.overSupplies} /> },
  { key: "lateStart", label: ">15min After Start", render: (m) => <CompliancePill triggered={m.lateStart} /> },
  { key: "earlyEnd", label: ">15min Before End", render: (m) => <CompliancePill triggered={m.earlyEnd} /> },
  { key: "spotCleanGaps", label: "# of >10min Spot Clean", render: (m) => m.spotCleanGaps },
  { key: "serviceGaps", label: "# of >10min Service Gap", render: (m) => m.serviceGaps },
  {
    key: "avgScoreCompliance",
    label: "Average Quality Score",
    render: (m) => <span className={sharedStyles.photoScore}>{m.avgScore.toFixed(2)}</span>,
  },
];

const WORK_ORDER_COLUMNS: ColumnDef[] = [
  NAME_COLUMN,
  { key: "nonPeriodicToDoTime", label: "Total Non-Periodic to-Do Time", render: (m) => m.nonPeriodicToDoTime },
  { key: "toDoNonPeriodicTime", label: "Total To-Do (Non-Periodic)", render: (m) => m.toDoNonPeriodicTime },
  { key: "toSoNonWorkOrderTime", label: "Total To-So (Non-Work Order)", render: (m) => m.toSoNonWorkOrderTime },
];

const TOTALS_COLUMNS: ColumnDef[] = [
  NAME_COLUMN,
  { key: "serviceTime", label: "Service Time", render: (m) => m.serviceTime },
  { key: "transitionTimeTotals", label: "Transition Time", render: (m) => m.transitionTime },
  { key: "unproductiveTime", label: "Unproductive Time", render: (m) => m.unproductiveTime },
  { key: "totalTime", label: "Total Time", render: (m) => m.totalTime },
  { key: "totalTimeWorkedTotals", label: "Total Time Worked", render: (m) => m.timeWorked },
];

const ALL_COLUMNS: ColumnDef[] = [
  NAME_COLUMN,
  ...OVERVIEW_COLUMNS.slice(1),
  ...TIME_COLUMNS.slice(1),
  ...COMPLIANCE_COLUMNS.slice(1),
  ...WORK_ORDER_COLUMNS.slice(1),
  ...TOTALS_COLUMNS.slice(1),
];

type HeadcountSubTab = "overview" | "time" | "compliance" | "workOrders" | "totals" | "allColumns";
const HEADCOUNT_SUB_TABS: { id: HeadcountSubTab; label: string; columns: ColumnDef[] }[] = [
  { id: "overview", label: "Overview", columns: OVERVIEW_COLUMNS },
  { id: "time", label: "Time", columns: TIME_COLUMNS },
  { id: "compliance", label: "Compliance", columns: COMPLIANCE_COLUMNS },
  { id: "workOrders", label: "Work Orders", columns: WORK_ORDER_COLUMNS },
  { id: "totals", label: "Totals", columns: TOTALS_COLUMNS },
  { id: "allColumns", label: "All Columns", columns: ALL_COLUMNS },
];
const HEADCOUNT_SUB_TAB_OPTIONS: ButtonGroupOption<HeadcountSubTab>[] = HEADCOUNT_SUB_TABS.map((t) => ({ id: t.id, label: t.label }));

function MetricsTable({ columns, rows }: { columns: ColumnDef[]; rows: MemberMetrics[] }) {
  if (rows.length === 0) {
    return <p className={styles.emptyNote}>No team members match these filters.</p>;
  }
  return (
    <Card theme="light" className={sharedStyles.tableWrap}>
      <table className={sharedStyles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.name}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(m)}</td>
              ))}
              <td>
                <i className={["fa-solid fa-arrow-right", styles.rowArrow].join(" ")} aria-hidden="true" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

type RosterKind = "associates" | "managers";

// ---------------- Scope & Frequency tab: real contracted tasks, grouped by
// Area Type / Building / Area, due for the selected period ----------------

type FreqPeriod = "Daily" | "Weekly" | "Monthly" | "As Needed" | "Other";
/** Cycle length in days for each schedule-driven frequency — a task is "due" for a period once the period spans at least one full cycle. "As Needed" and "Other" aren't on a fixed schedule, so they're never counted as due; they're surfaced separately instead. */
const FREQ_CYCLE_DAYS: Record<FreqPeriod, number | null> = {
  Daily: 1,
  Weekly: 7,
  Monthly: 30,
  "As Needed": null,
  Other: null,
};
function frequencyPeriod(freq: string): FreqPeriod {
  if (/as needed/i.test(freq)) return "As Needed";
  if (/daily/i.test(freq)) return "Daily";
  if (/weekly/i.test(freq)) return "Weekly";
  if (/monthly/i.test(freq)) return "Monthly";
  return "Other";
}
function isTaskDueForPeriod(freq: string, periodDays: number): boolean {
  const cycle = FREQ_CYCLE_DAYS[frequencyPeriod(freq)];
  return cycle !== null && cycle <= periodDays;
}

const FREQUENCY_FILTER_OPTIONS: { value: FreqPeriod | "all"; label: string }[] = [
  { value: "all", label: "All Frequencies" },
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "As Needed", label: "As Needed" },
];

/** Real distinct shift values sort in this order first; anything else (there shouldn't be any, per the source export) falls to the end alphabetically. */
const SCOPE_SHIFT_ORDER = ["Day", "Swing", "Graveyard"];
function compareScopeShifts(a: string, b: string): number {
  const ai = SCOPE_SHIFT_ORDER.indexOf(a);
  const bi = SCOPE_SHIFT_ORDER.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
}

/**
 * The four ways the Site & Verifications evidence grid can be grouped
 * — same real hierarchy the rest of the site models (Building > Area
 * Type > Area), plus "element" as a fourth stat button. There's no
 * per-element entity anywhere in the real SOW export
 * (lib/sowContract.ts has no Element type; `siteContractStats.elements`
 * is a bare count), so "element" intentionally renders an honest empty
 * state instead of fabricating 49 fake rows.
 */
type AreaGroupBy = "areaType" | "building" | "area" | "element";
const AREA_GROUP_BY_OPTIONS: { id: AreaGroupBy; label: string; icon: string; count: number }[] = [
  { id: "areaType", label: "Area Types", icon: "fa-solid fa-object-ungroup", count: siteContractStats.areaTypes },
  { id: "building", label: "Buildings", icon: "fa-solid fa-building", count: siteContractStats.buildings },
  { id: "area", label: "Areas", icon: "fa-solid fa-map-pin", count: siteContractStats.areas },
  { id: "element", label: "Elements", icon: "fa-solid fa-diagram-project", count: siteContractStats.elements },
];
const AREA_GROUP_SEARCH_PLACEHOLDER: Record<AreaGroupBy, string> = {
  areaType: "Find an Area Type",
  building: "Find a Building",
  area: "Find an Area",
  element: "Find an Element",
};

type ScopeTaskRow = {
  key: string;
  taskLabel: string;
  shiftLabel: string;
  frequencyLabel: FreqPeriod;
  coveragePercent: number;
  evidence: TaskEvidenceData[];
};

type ScopeGroupData = {
  id: string;
  icon: string;
  title: string;
  meta: string;
  rows: ScopeTaskRow[];
};

/** A few real, seeded "verification instances" of one task — the same photo/score/captured-time generators AreaCard uses, just picked across a handful of the task's real areas instead of one area's whole service history. */
function buildTaskEvidence(
  seedKey: string,
  areaTypeName: string,
  areas: ContractArea[],
  roster: RosterPerson[],
  count = 3
): TaskEvidenceData[] {
  if (areas.length === 0 || roster.length === 0) return [];
  const size = Math.min(count, areas.length);
  return Array.from({ length: size }, (_, i) => {
    const area = areas[i];
    const cardSeed = `${seedKey}-${area.areaId}`;
    const person = roster[hashSeed(cardSeed) % roster.length];
    return {
      key: cardSeed,
      photo: photoForAreaType(areaTypeName, cardSeed),
      timeAgo: timeAgoForSeed(cardSeed),
      taskType: primaryTaskType(cardSeed),
      areaLabel: area.displayName,
      score: scoreForDay(`${cardSeed}-score`, 0),
      techName: person.name,
      techAvatar: person.avatar,
      capturedLabel: `${capturedDurationLabel(cardSeed, 0)} Captured`,
    };
  });
}

export type SowTimeFirstPageProps = {
  associates?: RosterPerson[];
  managers?: RosterPerson[];
  contractBuildings?: ContractBuilding[];
};

/**
 * SowTimeFirstPage — the period is the primary nav, not site
 * hierarchy or a flat tab bar. Pick Today / Yesterday / This Week /
 * This Month / YTD / Custom and everything on the page — the
 * headline numbers, the score trend, the evidence grid, the team
 * roster, the contracted scope — recomputes for that window; "All
 * Spaces" narrows several sections down to one area type, a
 * secondary control rather than the thing you land on.
 *
 * Three feature tabs below the KPI row:
 *  - Site & Verifications — the real-area evidence grid (Figma node
 *    105:6728).
 *  - Headcount & Occupancy — a six-sub-tab breakdown of who worked
 *    this period (Overview / Time / Compliance / Work Orders /
 *    Totals / All Columns), each a different column set over the
 *    same per-member roster, plus an Associates/Managers segmented
 *    toggle (Figma node 107:12195). The Time/Compliance/Work
 *    Orders/Totals columns are deterministic per-member time and
 *    compliance breakdowns — this dataset has no real task-level
 *    time log to carry forward, so they're seeded stand-ins in the
 *    same spirit as the rest of this exploration's synthetic-but-
 *    consistent numbers, not real attendance data.
 *  - Scope — new to this page: the contracted tasks actually due for
 *    the selected period, derived from the real exported SOW's
 *    frequency field (Daily/Weekly/Monthly/As Needed). A single-day
 *    period only ever surfaces Daily tasks — a weekly or monthly task
 *    isn't due *every* day, and this dataset has no real schedule
 *    saying which day it lands on, so claiming one would be a fabrication.
 *
 * Reuses UI and logic already built for SowHierarchyPage rather than
 * re-deriving it: the Snapshot/Trend and Grid/List segmented
 * controls, the pill-style filter row, the shared DsSelect dropdown,
 * the shared AreaCard evidence card, the Accordion (Scope's per-space
 * task list, same pattern as SowHierarchyPage's "View Scope" modal),
 * and hoursCapturedForNode/auditSummaryForNode for two of the five
 * KPI cards.
 *
 * Each period's numbers are deterministic (the same scoreForDay/
 * scaleForDay/hashSeed generators as everywhere else in this
 * project, keyed by period id instead of a day offset) rather than a
 * real historical rollup — revisiting a period you already viewed
 * reproduces the same numbers.
 */
export function SowTimeFirstPage({ associates = [], managers = [], contractBuildings = [] }: SowTimeFirstPageProps) {
  const [period, setPeriod] = useState<PeriodId>("yesterday");
  const [statsView, setStatsView] = useState<StatsView>("snapshot");
  const [featureTab, setFeatureTab] = useState<FeatureTab>("site");
  const [siteScheduleOn, setSiteScheduleOn] = useState(false);

  const [taskTypeFilter, setTaskTypeFilter] = useState<VerificationEvent["type"] | "all">("all");
  const [shiftFilter, setShiftFilter] = useState<VerificationEvent["shift"] | "all">("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [areaShown, setAreaShown] = useState(AREA_PAGE_SIZE);

  const [areaGroupBy, setAreaGroupBy] = useState<AreaGroupBy>("areaType");
  const [siteGroupSearch, setSiteGroupSearch] = useState("");

  const [headcountSubTab, setHeadcountSubTab] = useState<HeadcountSubTab>("overview");
  const [rosterKind, setRosterKind] = useState<RosterKind>("associates");

  const [frequencyFilter, setFrequencyFilter] = useState<FreqPeriod | "all">("all");
  const [scopeShiftFilter, setScopeShiftFilter] = useState("all");
  const [openScopeGroupIds, setOpenScopeGroupIds] = useState<string[]>([]);
  const [openScopeTaskIds, setOpenScopeTaskIds] = useState<string[]>([]);

  const periodConfig = PERIODS.find((p) => p.id === period)!;

  function handlePeriodChange(id: PeriodId) {
    setPeriod(id);
    setAreaShown(AREA_PAGE_SIZE);
  }

  function handleAreaGroupByChange(id: AreaGroupBy) {
    setAreaGroupBy(id);
    setSiteGroupSearch("");
    setAreaShown(AREA_PAGE_SIZE);
  }

  /** "View flight supporting areas" jumps the group-by search to that area type — a working link, not a decorative dead one. */
  function jumpToSpace(name: string) {
    setFeatureTab("site");
    setAreaGroupBy("areaType");
    setSiteGroupSearch(name);
  }

  function toggleScopeGroup(id: string) {
    setOpenScopeGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleScopeTask(id: string) {
    setOpenScopeTaskIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const periodOptions: ButtonGroupOption<PeriodId>[] = PERIODS.map((p) => ({
    id: p.id,
    label: p.id === "today" ? `Today, ${formatOrdinalDate(new Date())}` : p.label,
  }));

  // -- Headcount & Occupancy roster sizing: how many of each real roster
  // (Associates/Managers) worked this period. Computed up front, before
  // the KPI row, so the "Team Members" KPI is derived from these same
  // two numbers instead of a separate, unrelated formula — the KPI and
  // the Headcount tab's Associates(N)/Managers(N) counts always agree
  // by construction, and neither can exceed the real roster's physical
  // size (teamForNode caps at roster.length regardless). --

  function workedCountFor(rosterLength: number, kind: RosterKind): number {
    if (rosterLength === 0) return 0;
    const base = kind === "associates" ? 0.66 : 0.06;
    const exponent = kind === "associates" ? 0.15 : 0.35;
    const fraction = Math.min(1, base * Math.pow(periodConfig.days, exponent));
    return Math.max(1, Math.min(rosterLength, Math.round(rosterLength * fraction * scaleForDay(`period-${period}-${kind}-count`, 0, 0.94, 1.06))));
  }

  const associatesWorkedCount = workedCountFor(associates.length, "associates");
  const managersWorkedCount = workedCountFor(managers.length, "managers");

  // -- KPI cards --

  const verificationsCompleted = Math.round(
    facilitySummary.verificationsCompleted * periodConfig.days * scaleForDay(`period-${period}-completed`, 0, 0.94, 1.02)
  );
  const verificationsExpected = Math.round(facilitySummary.verificationsExpected * periodConfig.days);
  const verificationCoveragePercent =
    verificationsExpected > 0 ? Math.min(100, (verificationsCompleted / verificationsExpected) * 100) : 0;

  const hoursCaptured = hoursCapturedForNode(`period-${period}`, 0);
  const auditSummary = auditSummaryForNode(`period-${period}`, 0);

  const teamMembersCount = associatesWorkedCount + managersWorkedCount;
  const teamMembersDescription =
    periodConfig.days === 1
      ? `${teamMembersCount.toLocaleString()} team members clocked in ${periodConfig.label.toLowerCase()}`
      : `${teamMembersCount.toLocaleString()} team members worked ${periodConfig.label.toLowerCase()}`;

  const flightsSupported = Math.round(
    facilitySummary.flightsSupported * periodConfig.days * scaleForDay(`period-${period}-flights`, 0, 0.94, 1.04)
  );

  // Real flight-adjacent area type (Jet Bridges / Gates / Ramps) to jump
  // the group-by search to — a working link, not a decorative dead one.
  const flightSpace = useMemo(() => {
    const names = contractBuildings.flatMap((cb) => cb.areaTypes.map((at) => at.name));
    return names.find((n) => /gate|jet bridge|ramp/i.test(n));
  }, [contractBuildings]);

  // -- Score trend (Trend view) --

  const trend = useMemo(() => trendSeries(`period-${period}`, periodConfig.points, 0), [period, periodConfig.points]);
  const trendLast = trend[trend.length - 1];
  const trendFirst = trend[0];

  // -- Evidence grid: real areas across every building, the same "Area"
  // card SowHierarchyPage builds, re-seeded per period instead of a day
  // offset. Filter/Shifts narrow by area type via the deterministic
  // primary-type/shift stand-ins above; Sort, the group-by buttons, and
  // the search box work exactly like the Scope & Frequency tab's own
  // grouped grid. --

  function areaTypeMatchesFilters(at: ContractAreaType): boolean {
    if (taskTypeFilter !== "all" && primaryTaskType(at.name) !== taskTypeFilter) return false;
    if (shiftFilter !== "all" && primaryShift(at.name) !== shiftFilter) return false;
    return true;
  }

  function areaCardsForAreaType(at: ContractAreaType): AreaCardData[] {
    const converted = areaTypeFromContract(at);
    const perAreaExpected = Math.max(1, Math.round(converted.expectedServices / Math.max(1, at.areas.length)));
    return at.areas.map((area) => {
      const seedKey = `${area.areaId}-period-${period}`;
      const servicedToday = Math.max(0, Math.round(perAreaExpected * scaleForDay(`${seedKey}-serviced`, 0, 0.2, 0.95)));
      const percent = Math.min(100, (servicedToday / perAreaExpected) * 100);
      return {
        key: seedKey,
        photo: photoForAreaType(at.name, seedKey),
        timeAgo: timeAgoForSeed(seedKey),
        title: area.displayName,
        score: scoreForDay(`${seedKey}-score`, 0),
        progress: { servicedToday, expected: perAreaExpected, percent },
        capturedLabel: `${capturedDurationLabel(seedKey, 0)} Captured`,
      };
    });
  }

  /** One card per whole area type (aggregate expected/serviced across all its real areas) — what the "Area Types" group-by shows, as opposed to one card per individual area. */
  function areaTypeCard(at: ContractAreaType): AreaCardData {
    const converted = areaTypeFromContract(at);
    const seedKey = `${at.building}-${at.name}-period-${period}`;
    const servicedToday = Math.max(0, Math.round(converted.expectedServices * scaleForDay(`${seedKey}-serviced`, 0, 0.2, 0.95)));
    const percent = converted.expectedServices > 0 ? Math.min(100, (servicedToday / converted.expectedServices) * 100) : 0;
    return {
      key: seedKey,
      photo: photoForAreaType(at.name, seedKey),
      timeAgo: timeAgoForSeed(seedKey),
      title: at.name,
      subtitle: `${at.building} · ${at.areas.length} area${at.areas.length === 1 ? "" : "s"}`,
      score: scoreForDay(`${seedKey}-score`, 0),
      progress: { servicedToday, expected: converted.expectedServices, percent },
      capturedLabel: `${capturedDurationLabel(seedKey, 0)} Captured`,
    };
  }

  function sortCards(cards: AreaCardData[]): AreaCardData[] {
    const arr = [...cards];
    if (sortOrder === "score-desc") arr.sort((a, b) => b.score - a.score);
    else if (sortOrder === "score-asc") arr.sort((a, b) => a.score - b.score);
    return arr;
  }

  const scopedAreaTypes = useMemo(
    () => contractBuildings.flatMap((cb) => cb.areaTypes).filter(areaTypeMatchesFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contractBuildings, taskTypeFilter, shiftFilter]
  );

  const siteSearchLower = siteGroupSearch.trim().toLowerCase();

  // The group-by buttons + search narrow WHICH area types/buildings/
  // areas are in play, but the result always renders as one flat photo
  // grid — no collapsible group rows.
  const sortedAreaCards = useMemo(() => {
    if (areaGroupBy === "element") return [];

    if (areaGroupBy === "building") {
      let bldgs = contractBuildings;
      if (siteSearchLower) bldgs = bldgs.filter((cb) => cb.name.toLowerCase().includes(siteSearchLower));
      const types = bldgs.flatMap((cb) => cb.areaTypes.filter(areaTypeMatchesFilters));
      return sortCards(types.flatMap((at) => areaCardsForAreaType(at)));
    }

    if (areaGroupBy === "areaType") {
      let types = scopedAreaTypes;
      if (siteSearchLower) types = types.filter((at) => at.name.toLowerCase().includes(siteSearchLower));
      return sortCards(types.map((at) => areaTypeCard(at)));
    }

    // area — search matches the area's own name, not its area type
    let cards = sortCards(scopedAreaTypes.flatMap((at) => areaCardsForAreaType(at)));
    if (siteSearchLower) cards = cards.filter((c) => c.title.toLowerCase().includes(siteSearchLower));
    return cards;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaGroupBy, scopedAreaTypes, contractBuildings, siteSearchLower, sortOrder, period, taskTypeFilter, shiftFilter]);

  const visibleAreaCards = sortedAreaCards.slice(0, areaShown);

  // -- Headcount & Occupancy tab: who worked this period, same
  // roster-rotation generator the hierarchy explorations use, applied
  // to whichever roster (Associates/Managers) is selected. --

  const activeRoster = rosterKind === "associates" ? associates : managers;
  const activeWorkedCount = rosterKind === "associates" ? associatesWorkedCount : managersWorkedCount;

  const team = useMemo(
    () => teamForNode(`period-${period}-team-${rosterKind}`, activeRoster, 0, activeWorkedCount),
    [period, activeRoster, activeWorkedCount, rosterKind]
  );

  const memberMetricsList = useMemo(
    () => team.map((m) => computeMemberMetrics(m, `period-${period}-${rosterKind}`)),
    [team, period, rosterKind]
  );

  const filteredMembers = useMemo(
    () =>
      memberMetricsList.filter(
        (m) =>
          (shiftFilter === "all" || m.shift === shiftFilter) && (taskTypeFilter === "all" || primaryTaskType(m.name) === taskTypeFilter)
      ),
    [memberMetricsList, shiftFilter, taskTypeFilter]
  );

  const sortedMembers = useMemo(() => {
    const arr = [...filteredMembers];
    if (sortOrder === "score-desc") arr.sort((a, b) => b.avgScore - a.avgScore);
    else if (sortOrder === "score-asc") arr.sort((a, b) => a.avgScore - b.avgScore);
    return arr;
  }, [filteredMembers, sortOrder]);

  const activeHeadcountColumns = HEADCOUNT_SUB_TABS.find((t) => t.id === headcountSubTab)!.columns;

  // -- Scope & Frequency tab: real contracted tasks due for the selected
  // period, grouped by whichever real dimension (Area Type / Building /
  // Area) the stat buttons pick — same real Building > Area Type > Area
  // hierarchy as the rest of the site, not a fabricated one. --

  const scopeShiftOptions = useMemo(() => {
    const set = new Set<string>();
    contractBuildings.forEach((cb) => cb.areaTypes.forEach((at) => at.tasks.forEach((t) => t.shifts.forEach((s) => set.add(s)))));
    return Array.from(set).sort(compareScopeShifts);
  }, [contractBuildings]);

  function buildScopeTaskRow(task: ContractTaskDef, seedKey: string): ScopeTaskRow | null {
    const freqP = frequencyPeriod(task.frequency);
    if (frequencyFilter !== "all" && freqP !== frequencyFilter) return null;
    if (freqP === "As Needed") {
      if (frequencyFilter !== "As Needed") return null;
    } else if (!isTaskDueForPeriod(task.frequency, periodConfig.days)) {
      return null;
    }
    if (scopeShiftFilter !== "all" && task.shifts.length > 0 && !task.shifts.includes(scopeShiftFilter)) return null;
    return {
      key: seedKey,
      taskLabel: task.label,
      shiftLabel: task.shifts.length > 0 ? task.shifts.join(", ") : "Any Shift",
      frequencyLabel: freqP,
      coveragePercent: Math.round(scaleForDay(`${seedKey}-coverage`, 0, 0.15, 0.98) * 100),
      evidence: [],
    };
  }

  // Scope & Frequency is always grouped by Area Type — Building/Area/
  // Element grouping now lives on the Site & Verifications tab instead
  // (AREA_GROUP_BY_OPTIONS above), so this stays a single fixed shape.
  const scopeGroups = useMemo<ScopeGroupData[]>(
    () =>
      contractBuildings
        .flatMap((cb) => cb.areaTypes)
        .map((at) => {
          const rows = at.tasks
            .map((task) => buildScopeTaskRow(task, `${at.building}-${at.name}-${task.label}-period-${period}`))
            .filter((r): r is ScopeTaskRow => r !== null)
            .map((r) => ({ ...r, evidence: buildTaskEvidence(r.key, at.name, at.areas, associates) }));
          return {
            id: `${at.building}-${at.name}`,
            icon: "fa-solid fa-object-ungroup",
            title: at.name,
            meta: `${at.building} · ${at.areas.length} area${at.areas.length === 1 ? "" : "s"}`,
            rows,
          };
        })
        .filter((g) => g.rows.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contractBuildings, frequencyFilter, scopeShiftFilter, period, periodConfig.days, associates]
  );

  const allScopeGroupsOpen = scopeGroups.length > 0 && scopeGroups.every((g) => openScopeGroupIds.includes(g.id));
  function handleExpandAllScope() {
    setOpenScopeGroupIds(allScopeGroupsOpen ? [] : scopeGroups.map((g) => g.id));
  }

  // Expected/Completed Tasks KPI cards: real due-task-instances (one per
  // area a due task applies to) for the whole site this period — a fixed
  // summary independent of the grid's grouping/search/frequency/shift
  // narrowing below, same as the other KPI cards on this page.
  const scopeExpectedInstances = useMemo(() => {
    let total = 0;
    contractBuildings.forEach((cb) =>
      cb.areaTypes.forEach((at) => {
        at.tasks.forEach((task) => {
          if (isTaskDueForPeriod(task.frequency, periodConfig.days)) total += at.areas.length;
        });
      })
    );
    return total;
  }, [contractBuildings, periodConfig.days]);
  const scopeCompletionRate = scaleForDay(`period-${period}-scope-completion`, 0, 0.72, 0.94);
  const scopeCompletedInstances = Math.round(scopeExpectedInstances * scopeCompletionRate);

  return (
    <div className={sharedStyles.page} data-theme="light">
      <SowNav current="timeFirst" />

      <main className={sharedStyles.main}>
        <p className={styles.breadcrumb}>
          Quality / <span className={styles.breadcrumbCurrent}>Scope of Work</span>
        </p>

        <div className={styles.periodRow}>
          <button
            type="button"
            className={styles.scheduleToggle}
            role="switch"
            aria-checked={siteScheduleOn}
            onClick={() => setSiteScheduleOn((v) => !v)}
          >
            Site Schedule
            <span className={[styles.scheduleToggleTrack, siteScheduleOn ? styles.scheduleToggleTrackOn : ""].filter(Boolean).join(" ")}>
              <span className={[styles.scheduleToggleThumb, siteScheduleOn ? styles.scheduleToggleThumbOn : ""].filter(Boolean).join(" ")} />
            </span>
          </button>
          <ButtonGroup options={periodOptions} value={period} onChange={handlePeriodChange} aria-label="Select period" />
        </div>

        <div className={sharedStyles.sectionStack}>
          <div className={sharedStyles.section}>
            <div className={styles.identityRow}>
              <img src={siteInfo.logo} alt="" className={styles.identityLogo} />
              <span className={styles.identityName}>
                {siteInfo.client} - {siteInfo.siteName}
              </span>
            </div>
            <h1 className={styles.periodHeading}>{periodHeading(period)}</h1>

            <div className={styles.snapshotControlRow}>
              <ButtonGroup
                options={STATS_VIEW_OPTIONS}
                value={statsView}
                onChange={setStatsView}
                variant="segmented"
                aria-label="Performance view"
              />
            </div>

            {statsView === "snapshot" ? (
              <div className={styles.kpiRow}>
                <Card theme="light" className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Verification Coverage</span>
                  <span className={styles.kpiValue} style={{ color: "var(--color-primary-500)" }}>
                    {Math.round(verificationCoveragePercent)}%
                  </span>
                  <span className={styles.kpiMeterTrack}>
                    <span
                      className={styles.kpiMeterFill}
                      style={{ width: `${Math.min(100, verificationCoveragePercent)}%`, backgroundColor: "var(--color-primary-500)" }}
                    />
                  </span>
                  <span className={styles.kpiDescription}>
                    {verificationsCompleted.toLocaleString()}/{verificationsExpected.toLocaleString()} Expected Verifications
                  </span>
                </Card>

                <Card theme="light" className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Time Captured</span>
                  <span className={styles.kpiValue} style={{ color: "var(--color-datavis-purple-500)" }}>
                    {hoursCaptured.percent}%
                  </span>
                  <span className={styles.kpiMeterTrack}>
                    <span
                      className={styles.kpiMeterFill}
                      style={{ width: `${Math.min(100, hoursCaptured.percent)}%`, backgroundColor: "var(--color-datavis-purple-500)" }}
                    />
                  </span>
                  <span className={styles.kpiDescription}>
                    {hoursCaptured.capturedLabel} of {hoursCaptured.paidLabel} paid
                  </span>
                </Card>

                <Card theme="light" className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Team Members</span>
                  <span className={styles.kpiValue} style={{ color: "var(--color-primary-500)" }}>
                    {teamMembersCount.toLocaleString()}
                  </span>
                  <span className={styles.kpiDescription}>{teamMembersDescription}</span>
                </Card>

                <Card theme="light" className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Average Audit Score</span>
                  <span className={styles.kpiScoreChip}>{auditSummary.avgScore.toFixed(2)}</span>
                  <span className={styles.kpiDescription}>
                    Across {auditSummary.totalAudits} audits · {auditSummary.jointAudits} joint with {siteInfo.client}
                  </span>
                </Card>

                <Card theme="light" className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Flight Supported</span>
                  <span className={styles.kpiValue} style={{ color: "var(--color-datavis-purple-500)" }}>
                    {flightsSupported.toLocaleString()} flights
                  </span>
                  {flightSpace ? (
                    <button type="button" className={sharedStyles.textLink} onClick={() => jumpToSpace(flightSpace)}>
                      View flight supporting areas
                    </button>
                  ) : (
                    <span className={styles.kpiDescription}>Flight supporting areas not modeled.</span>
                  )}
                </Card>
              </div>
            ) : (
              <Card theme="light" className={sharedStyles.paddedCard}>
                <div className={styles.trendHeaderRow}>
                  <span className={styles.trendValue}>{trendLast.toFixed(2)}</span>
                  <span className={styles.trendCaption}>avg. score — {periodConfig.label.toLowerCase()}</span>
                </div>
                <Sparkline values={trend} color="var(--color-primary-500)" height={90} interactive valueFormatter={(v) => v.toFixed(2)} />
                <div className={styles.trendAxis}>
                  <span>
                    {trendAxisLabel(period, true)} ({trendFirst.toFixed(2)})
                  </span>
                  <span>{trendAxisLabel(period, false)}</span>
                </div>
              </Card>
            )}
          </div>

          <div className={styles.tabRow}>
            {FEATURE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={[styles.tabButton, featureTab === tab.id ? styles.tabButtonActive : ""].filter(Boolean).join(" ")}
                aria-pressed={featureTab === tab.id}
                onClick={() => setFeatureTab(tab.id)}
              >
                <i className={tab.icon} aria-hidden="true" />
                <span className={styles.tabLabelGroup}>
                  <span className={styles.tabLabelText}>{tab.label}</span>
                  <span className={styles.tabUnderline} />
                </span>
              </button>
            ))}
          </div>

          {featureTab === "site" && (
            <div className={sharedStyles.section}>
              <div className={styles.workControlsRow}>
                <div className={styles.filterFieldGroup}>
                  <ButtonGroup
                    options={AREA_GROUP_BY_OPTIONS.map((o) => ({
                      id: o.id,
                      label: `${o.count.toLocaleString()} ${o.label}`,
                      icon: <i className={o.icon} aria-hidden="true" />,
                    }))}
                    value={areaGroupBy}
                    onChange={handleAreaGroupByChange}
                    aria-label="Group evidence by"
                  />
                  <span className={styles.scopeSearchWrap}>
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                    <input
                      type="text"
                      className={styles.scopeSearchInput}
                      placeholder={AREA_GROUP_SEARCH_PLACEHOLDER[areaGroupBy]}
                      value={siteGroupSearch}
                      onChange={(e) => setSiteGroupSearch(e.target.value)}
                      disabled={areaGroupBy === "element"}
                      aria-label={AREA_GROUP_SEARCH_PLACEHOLDER[areaGroupBy]}
                    />
                  </span>
                </div>
                <ButtonGroup
                  options={VIEW_MODE_OPTIONS}
                  value={viewMode}
                  onChange={setViewMode}
                  variant="segmented"
                  aria-label="Grid or list view"
                />
              </div>

              <div className={styles.workControlsRow}>
                <div className={styles.filterFieldGroup}>
                  <DsSelect
                    label="Filter"
                    value={taskTypeFilter}
                    onChange={setTaskTypeFilter}
                    options={[{ value: "all", label: "All Services" }, ...taskTypes.map((t) => ({ value: t, label: t }))]}
                    ariaLabel="Filter by service type"
                  />
                  <DsSelect
                    label="Shifts"
                    value={shiftFilter}
                    onChange={setShiftFilter}
                    options={[{ value: "all", label: "All Shifts" }, ...shifts.map((s) => ({ value: s, label: s }))]}
                    ariaLabel="Filter by shift"
                  />
                  <DsSelect
                    label="Sort"
                    value={sortOrder}
                    onChange={setSortOrder}
                    options={SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                    ariaLabel="Sort evidence"
                  />
                </div>
              </div>

              {areaGroupBy === "element" ? (
                <p className={styles.emptyNote}>
                  Element-level scope isn&rsquo;t tracked in this dataset yet — pick Area Types, Buildings, or Areas above to browse
                  evidence.
                </p>
              ) : visibleAreaCards.length === 0 ? (
                <p className={styles.emptyNote}>No {areaGroupBy === "areaType" ? "area types" : "areas"} match these filters.</p>
              ) : viewMode === "grid" ? (
                <AreaCardGrid>
                  {visibleAreaCards.map((data) => (
                    <AreaCard key={data.key} data={data} />
                  ))}
                </AreaCardGrid>
              ) : (
                <AreaCardList items={visibleAreaCards} />
              )}

              {areaGroupBy !== "element" && sortedAreaCards.length > visibleAreaCards.length && (
                <p className={styles.emptyNote}>
                  Showing {visibleAreaCards.length} of {sortedAreaCards.length} {areaGroupBy === "areaType" ? "area types" : "areas"}.{" "}
                  <button type="button" className={sharedStyles.textLink} onClick={() => setAreaShown((n) => n + AREA_PAGE_SIZE)}>
                    Show more
                  </button>
                </p>
              )}
            </div>
          )}

          {featureTab === "headcount" && (
            <div className={sharedStyles.section}>
              <div className={styles.workControlsRow}>
                <div className={styles.filterFieldGroup}>
                  <ButtonGroup
                    options={HEADCOUNT_SUB_TAB_OPTIONS}
                    value={headcountSubTab}
                    onChange={setHeadcountSubTab}
                    aria-label="Headcount view"
                  />
                  <DsSelect
                    label="Filter"
                    value={taskTypeFilter}
                    onChange={setTaskTypeFilter}
                    options={[{ value: "all", label: "All Services" }, ...taskTypes.map((t) => ({ value: t, label: t }))]}
                    ariaLabel="Filter by service type"
                  />
                  <DsSelect
                    label="Shifts"
                    value={shiftFilter}
                    onChange={setShiftFilter}
                    options={[{ value: "all", label: "All Shifts" }, ...shifts.map((s) => ({ value: s, label: s }))]}
                    ariaLabel="Filter by shift"
                  />
                  <DsSelect
                    label="Sort"
                    value={sortOrder}
                    onChange={setSortOrder}
                    options={SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                    ariaLabel="Sort team"
                  />
                </div>
                <ButtonGroup
                  options={[
                    { id: "associates" as const, label: `Associates (${associatesWorkedCount})` },
                    { id: "managers" as const, label: `Managers (${managersWorkedCount})` },
                  ]}
                  value={rosterKind}
                  onChange={setRosterKind}
                  variant="segmented"
                  aria-label="Associates or managers"
                />
              </div>

              <MetricsTable columns={activeHeadcountColumns} rows={sortedMembers} />
            </div>
          )}

          {featureTab === "scope" && (
            <div className={sharedStyles.section}>
              <div className={styles.scopeStatRow}>
                <Card theme="light" className={styles.scopeStatCard}>
                  <span className={styles.kpiLabel}>Expected Tasks</span>
                  <span className={styles.scopeStatValueRow}>
                    <i className="fa-solid fa-ballot-check" style={{ color: "var(--color-datavis-orange-500)" }} aria-hidden="true" />
                    <span className={styles.scopeStatValue} style={{ color: "var(--color-datavis-orange-500)" }}>
                      {scopeExpectedInstances.toLocaleString()}
                    </span>
                  </span>
                </Card>
                <Card theme="light" className={styles.scopeStatCard}>
                  <span className={styles.kpiLabel}>Completed Tasks</span>
                  <span className={styles.scopeStatValueRow}>
                    <i className="fa-solid fa-check-circle" style={{ color: "var(--color-text-lt-success)" }} aria-hidden="true" />
                    <span className={styles.scopeStatValue} style={{ color: "var(--color-text-lt-success)" }}>
                      {scopeCompletedInstances.toLocaleString()}
                    </span>
                  </span>
                </Card>
              </div>

              <div className={styles.workControlsRow}>
                <div className={styles.filterFieldGroup}>
                  <DsSelect
                    label="Shifts"
                    value={scopeShiftFilter}
                    onChange={setScopeShiftFilter}
                    options={[{ value: "all", label: "All Shifts" }, ...scopeShiftOptions.map((s) => ({ value: s, label: s }))]}
                    ariaLabel="Filter by shift"
                  />
                  <DsSelect
                    label="Frequency"
                    value={frequencyFilter}
                    onChange={setFrequencyFilter}
                    options={FREQUENCY_FILTER_OPTIONS}
                    ariaLabel="Filter by frequency"
                  />
                </div>
                <ButtonGroup
                  options={VIEW_MODE_OPTIONS}
                  value={viewMode}
                  onChange={setViewMode}
                  variant="segmented"
                  aria-label="Grid or list view for completed scope evidence"
                />
              </div>

              {periodConfig.days === 1 && frequencyFilter !== "As Needed" && (
                <p className={styles.emptyNote}>
                  Showing Daily tasks only — a weekly or monthly task isn&rsquo;t due every day. Switch to This Week or This Month to see
                  those too, or pick As Needed above.
                </p>
              )}

              {scopeGroups.length === 0 ? (
                <p className={styles.emptyNote}>No contracted tasks match these filters.</p>
              ) : (
                <>
                  <div className={styles.scopeTableHeaderRow}>
                    <span className={styles.scopeTableHeadTask}>Task</span>
                    <span className={styles.scopeTableHeadCol}>Shift</span>
                    <span className={styles.scopeTableHeadCol}>Frequency</span>
                    <span className={styles.scopeTableHeadCoverage}>Scope Coverage</span>
                    <button type="button" className={styles.scopeExpandAllBtn} onClick={handleExpandAllScope}>
                      {allScopeGroupsOpen ? "Collapse All" : "Expand All"}
                    </button>
                  </div>

                  <div className={styles.scopeTable}>
                    {scopeGroups.map((group) => {
                      const isGroupOpen = openScopeGroupIds.includes(group.id);
                      return (
                        <div key={group.id} className={styles.scopeGroup}>
                          <button
                            type="button"
                            className={styles.scopeGroupHeader}
                            onClick={() => toggleScopeGroup(group.id)}
                            aria-expanded={isGroupOpen}
                          >
                            <i
                              className={[
                                "fa-solid fa-chevron-right",
                                styles.scopeGroupChevron,
                                isGroupOpen ? styles.scopeGroupChevronOpen : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-hidden="true"
                            />
                            <i className={[group.icon, styles.scopeGroupIcon].join(" ")} aria-hidden="true" />
                            <span className={styles.scopeGroupTitleBlock}>
                              <span className={styles.scopeGroupTitle}>{group.title}</span>
                              <span className={styles.scopeGroupMeta}>
                                {group.meta} · {group.rows.length} task{group.rows.length === 1 ? "" : "s"}
                              </span>
                            </span>
                          </button>

                          {isGroupOpen &&
                            group.rows.map((row) => {
                              const taskKey = `${group.id}::${row.key}`;
                              const evidenceOpen = openScopeTaskIds.includes(taskKey);
                              return (
                                <div key={row.key} className={styles.scopeTaskBlock}>
                                  <div className={styles.scopeTaskRow}>
                                    <span className={styles.scopeTaskLabelCell}>
                                      <i className="fa-solid fa-ballot-check" aria-hidden="true" />
                                      <span>{row.taskLabel}</span>
                                    </span>
                                    <span className={styles.scopeTaskCol}>{row.shiftLabel}</span>
                                    <span className={styles.scopeTaskCol}>{row.frequencyLabel}</span>
                                    <span className={styles.scopeTaskCoverage}>
                                      <span className={styles.scopeCoverageValue}>{row.coveragePercent}%</span>
                                      <span className={styles.scopeCoverageTrack}>
                                        <span className={styles.scopeCoverageFill} style={{ width: `${row.coveragePercent}%` }} />
                                      </span>
                                    </span>
                                    <button type="button" className={styles.scopeTaskToggle} onClick={() => toggleScopeTask(taskKey)}>
                                      {evidenceOpen ? "Hide Completed Scope" : "View Completed Scope"}
                                      <i
                                        className={["fa-solid fa-chevron-down", evidenceOpen ? styles.scopeGroupChevronOpen : ""]
                                          .filter(Boolean)
                                          .join(" ")}
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </div>

                                  {evidenceOpen && (
                                    <div className={styles.scopeEvidencePanel}>
                                      {row.evidence.length === 0 ? (
                                        <p className={styles.emptyNote}>No captured evidence yet for this task.</p>
                                      ) : viewMode === "grid" ? (
                                        <TaskEvidenceGrid>
                                          {row.evidence.map((e) => (
                                            <TaskEvidenceCard key={e.key} data={e} />
                                          ))}
                                        </TaskEvidenceGrid>
                                      ) : (
                                        <Card theme="light" className={sharedStyles.tableWrap}>
                                          <table className={sharedStyles.table}>
                                            <thead>
                                              <tr>
                                                <th>Area</th>
                                                <th>Technician</th>
                                                <th>Score</th>
                                                <th>Captured</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {row.evidence.map((e) => (
                                                <tr key={e.key}>
                                                  <td>{e.areaLabel}</td>
                                                  <td>
                                                    <div className={sharedStyles.personCell}>
                                                      <img src={e.techAvatar} alt="" className={sharedStyles.avatar} />
                                                      <span className={sharedStyles.personCellName}>{e.techName}</span>
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <span className={sharedStyles.photoScore}>{e.score.toFixed(2)}</span>
                                                  </td>
                                                  <td>{e.capturedLabel}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </Card>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
