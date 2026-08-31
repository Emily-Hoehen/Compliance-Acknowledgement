"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SowNav } from "./SowNav";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Sparkline } from "../ui/Charts";
import { SearchIcon } from "./icons";
import { siteInfo } from "../../lib/homeDashboardData";
import {
  siteContractStats,
  buildings,
  verificationsForArea,
  auditsForArea,
  areaTypeFromContract,
  taskTypes,
  facilitySummary,
  recentVerifications,
  recentAudits,
  verificationToActivity,
  auditToActivity,
  applyDayVariationToActivity,
  trendSeries,
  scoreForDay,
  scaleForDay,
  teamForNode,
  statusForAreaType,
  type VerificationEvent,
  type ActivityItem,
  type ActivityKind,
  type TeamMember,
  type AreaTypeStatus,
} from "../../lib/sowData";
import type { ContractArea, ContractBuilding } from "../../lib/sowContract";
import type { RosterPerson } from "../../lib/csv";
import sharedStyles from "./SowPage.module.css";
import layoutStyles from "./SowHierarchyPage.module.css";
import detailStyles from "./SowHierarchyDetailPage.module.css";

export type SowHierarchyDetailPageProps = {
  associates: RosterPerson[];
  managers: RosterPerson[];
  contractBuildings: ContractBuilding[];
};

type Selection = {
  buildingName: string | null; // null = site level (nothing under it selected)
  areaTypeName: string | null;
  areaId: string | null; // a real area's area_id, from the leaf level of the tree
};

type TrendRange = "week" | "month";
type EvidenceView = "activity" | "team";
type ProofFilterId = "all" | VerificationEvent["type"] | "audit";
type AreaTypeSort = "coverage-asc" | "coverage-desc" | "score-asc" | "score-desc" | "name";
type ProofSort = "recent" | "score-desc" | "score-asc";
type AreaTypeGroupBy = "areaType" | "status";

type DayAreaTypeRow = ReturnType<typeof areaTypeFromContract> & {
  areaCount: number;
  dayServicedToday: number;
  dayPercent: number;
  dayScore: number;
  status: AreaTypeStatus;
};

function formatDateLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (offset === 0) return `Today, ${dateStr}`;
  if (offset === 1) return `Yesterday, ${dateStr}`;
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday}, ${dateStr}`;
}

/** Short form for chart axis labels — "Today" / "Yesterday" / "Aug 24". */
function formatShortDayLabel(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Yesterday";
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ACTIVITY_FILTERS: { id: ActivityKind | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "fa-check-double" },
  { id: "verification", label: "Verifications", icon: "fa-circle-check" },
  { id: "audit", label: "Audits", icon: "fa-clipboard-check" },
];

const EVIDENCE_VIEWS: { id: EvidenceView; label: string; icon: string }[] = [
  { id: "activity", label: "Activity", icon: "fa-clipboard-list" },
  { id: "team", label: "Team", icon: "fa-users" },
];

const STATUS_FILTERS: { id: "all" | AreaTypeStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "at-risk", label: "At risk" },
  { id: "on-track", label: "On track" },
  { id: "low-score", label: "Low score" },
];

const AREA_TYPE_SORTS: { id: AreaTypeSort; label: string }[] = [
  { id: "coverage-asc", label: "Coverage (low first)" },
  { id: "coverage-desc", label: "Coverage (high first)" },
  { id: "score-asc", label: "Score (low first)" },
  { id: "score-desc", label: "Score (high first)" },
  { id: "name", label: "Name (A–Z)" },
];

const GROUP_BY_OPTIONS: { id: AreaTypeGroupBy; label: string }[] = [
  { id: "areaType", label: "Area Type" },
  { id: "status", label: "Status" },
];

/** Fixed display order for "Group by: Status" — worst-first, same spirit as the default coverage sort. */
const STATUS_GROUPS: { id: AreaTypeStatus; label: string }[] = [
  { id: "at-risk", label: "At risk" },
  { id: "low-score", label: "Low score" },
  { id: "on-track", label: "On track" },
];

const PROOF_FILTERS: { id: ProofFilterId; label: string }[] = [
  { id: "all", label: "All services" },
  ...taskTypes.map((t) => ({ id: t as ProofFilterId, label: t })),
  { id: "audit", label: "Audits" },
];

const PROOF_SORTS: { id: ProofSort; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "score-desc", label: "Highest score" },
  { id: "score-asc", label: "Lowest score" },
];

/**
 * SowHierarchyDetailPage — third Scope of Work exploration. Same
 * Site > Building > Area Type > Area sidebar hierarchy as
 * SowHierarchyPage (including its site-level KPI/trend/recent
 * activity overview), expanded in two ways:
 *
 *  - The sidebar's area-type rows carry their own coverage bar,
 *    serviced/expected count, and score, and can be filtered by
 *    status (At risk / On track / Low score) and sorted (coverage,
 *    score, name) — a ranked "contracted vs. delivered" list nested
 *    inside the tree instead of a plain text row. The filter/sort
 *    controls apply to whichever building is currently selected.
 *  - The main pane's Evidence section becomes a fuller
 *    "Verification proof" panel: a summary line (areas in this type,
 *    last activity), a live count of what's showing vs. available,
 *    and its own search + service-type filter + sort on top of the
 *    same verification/audit cards.
 *
 * Every building carries full area-type/area detail — the real
 * exported SOW (data/SOW_DeltaLGA.csv), same as SowHierarchyPage,
 * across all 7 buildings. The tree's leaf level is each area type's
 * real areas; selecting one doesn't fabricate per-room evidence, it
 * just identifies which physical space you're looking at within that
 * area type's shared tasks/evidence.
 *
 * Reuses SowHierarchyPage.module.css for the page header/date nav,
 * two-pane layout, and tree primitives, and SowPage.module.css for
 * every card/chip/stat primitive — SowHierarchyDetailPage.module.css
 * only holds what's new here (coverage rows, proof panel header).
 * Light theme only, same grayscale/lofi treatment as the rest of
 * this exploration — the reference screenshot this was built from
 * is a pattern reference (rows with bars/badges, filter + sort
 * pills), not a color reference.
 */
export function SowHierarchyDetailPage({ associates, contractBuildings }: SowHierarchyDetailPageProps) {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection>({
    buildingName: null,
    areaTypeName: null,
    areaId: null,
  });
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({ "Concourse D": true });
  const [expandedAreaTypes, setExpandedAreaTypes] = useState<Record<string, boolean>>({ "Break Rooms": true });

  const [statusFilter, setStatusFilter] = useState<"all" | AreaTypeStatus>("all");
  const [areaTypeSort, setAreaTypeSort] = useState<AreaTypeSort>("coverage-asc");
  const [areaTypeGroupBy, setAreaTypeGroupBy] = useState<AreaTypeGroupBy>("areaType");

  const [proofSearch, setProofSearch] = useState("");
  const [proofFilter, setProofFilter] = useState<ProofFilterId>("all");
  const [proofSort, setProofSort] = useState<ProofSort>("recent");

  // Site-level "Recent activity" only.
  const [activityFilter, setActivityFilter] = useState<ActivityKind | "all">("all");
  const [evidenceView, setEvidenceView] = useState<EvidenceView>("activity");

  const [dayOffset, setDayOffset] = useState(0);
  const [trendRange, setTrendRange] = useState<TrendRange>("week");

  // Associates are the frontline roster actually doing the service
  // work shown in site-level Team — managers aren't part of that
  // rotation, same as SowHierarchyPage.
  const roster = associates;

  function isModeled(buildingName: string): boolean {
    return contractBuildings.some((cb) => cb.name === buildingName);
  }

  const q = search.trim().toLowerCase();
  const searching = q.length > 0;

  function selectSite() {
    setSelection({ buildingName: null, areaTypeName: null, areaId: null });
  }

  function selectBuilding(name: string) {
    setSelection({ buildingName: name, areaTypeName: null, areaId: null });
    if (isModeled(name)) {
      setExpandedBuildings((prev) => ({ ...prev, [name]: !prev[name] }));
    }
  }

  function selectAreaType(buildingName: string, areaTypeName: string) {
    setSelection({ buildingName, areaTypeName, areaId: null });
    setExpandedAreaTypes((prev) => ({ ...prev, [areaTypeName]: !prev[areaTypeName] }));
  }

  function selectArea(buildingName: string, areaTypeName: string, areaId: string) {
    setSelection({ buildingName, areaTypeName, areaId });
  }

  const isSiteLevel = !selection.buildingName;
  const selectedBuilding = selection.buildingName ? buildings.find((b) => b.name === selection.buildingName)! : null;
  const selectedBuildingContract = selection.buildingName
    ? contractBuildings.find((cb) => cb.name === selection.buildingName)
    : undefined;

  // Whichever building is currently selected — its real area types,
  // re-derived per day. Status filter/sort/group-by (in the sidebar)
  // apply to this list; a different, incidentally-still-expanded
  // building in the tree just shows its area types in plain order.
  const dayAreaTypeRows: DayAreaTypeRow[] = useMemo(() => {
    if (!selectedBuildingContract) return [];
    return selectedBuildingContract.areaTypes.map((ct) => {
      const at = areaTypeFromContract(ct);
      const dayServicedToday = Math.max(0, Math.round(at.servicedToday * scaleForDay(`${at.name}-serviced`, dayOffset)));
      const dayPercent = at.expectedServices > 0 ? Math.min(100, (dayServicedToday / at.expectedServices) * 100) : 0;
      const dayScore = scoreForDay(`${at.name}-score`, dayOffset);
      return {
        ...at,
        areaCount: ct.areas.length,
        dayServicedToday,
        dayPercent,
        dayScore,
        status: statusForAreaType({ percent: dayPercent, score: dayScore }),
      };
    });
  }, [selectedBuildingContract, dayOffset]);

  const selectedAreaTypeRow = selection.areaTypeName
    ? (dayAreaTypeRows.find((a) => a.name === selection.areaTypeName) ?? null)
    : null;
  const selectedContractAreaType = selectedBuildingContract?.areaTypes.find((at) => at.name === selection.areaTypeName);
  const selectedArea: ContractArea | undefined = selectedContractAreaType?.areas.find((a) => a.areaId === selection.areaId);

  const visibleAreaTypeRows = useMemo(() => {
    let rows = dayAreaTypeRows;
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (searching && selection.buildingName) {
      rows = rows.filter((r) => selection.buildingName!.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    }
    const sorted = [...rows];
    switch (areaTypeSort) {
      case "coverage-asc":
        sorted.sort((a, b) => a.dayPercent - b.dayPercent);
        break;
      case "coverage-desc":
        sorted.sort((a, b) => b.dayPercent - a.dayPercent);
        break;
      case "score-asc":
        sorted.sort((a, b) => a.dayScore - b.dayScore);
        break;
      case "score-desc":
        sorted.sort((a, b) => b.dayScore - a.dayScore);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [dayAreaTypeRows, statusFilter, searching, q, areaTypeSort, selection.buildingName]);

  // "Group by: Status" splits the same filtered/sorted rows into
  // labeled sections instead of one flat list — "Area Type" (the
  // default) keeps them flat under a single unlabeled group.
  const groupedAreaTypeRows = useMemo(() => {
    if (areaTypeGroupBy !== "status") return [{ label: null as string | null, rows: visibleAreaTypeRows }];
    return STATUS_GROUPS.map((g) => ({
      label: g.label,
      rows: visibleAreaTypeRows.filter((r) => r.status === g.id),
    })).filter((g) => g.rows.length > 0);
  }, [areaTypeGroupBy, visibleAreaTypeRows]);

  // Verification proof pool for whatever's selected. Real areas don't
  // carry per-area evidence in this dataset — selecting a specific
  // area still shows its area type's full evidence pool, just with
  // that area's identity called out above the panel.
  const evidenceVerificationsBase = useMemo(
    () => (selectedAreaTypeRow ? verificationsForArea(selectedAreaTypeRow.name) : []),
    [selectedAreaTypeRow]
  );
  const evidenceAuditsBase = useMemo(
    () => (selectedAreaTypeRow ? auditsForArea(selectedAreaTypeRow.name) : []),
    [selectedAreaTypeRow]
  );

  const evidenceActivityAll = useMemo(
    () => [...evidenceVerificationsBase.map(verificationToActivity), ...evidenceAuditsBase.map(auditToActivity)],
    [evidenceVerificationsBase, evidenceAuditsBase]
  );

  const dayAllEvidenceActivity = useMemo(
    () => evidenceActivityAll.map((item) => applyDayVariationToActivity(item, dayOffset)),
    [evidenceActivityAll, dayOffset]
  );

  const proofQ = proofSearch.trim().toLowerCase();
  const filteredEvidenceActivity = useMemo(
    () =>
      dayAllEvidenceActivity.filter((item) => {
        const matchesFilter =
          proofFilter === "all" ? true : proofFilter === "audit" ? item.kind === "audit" : item.tag === proofFilter;
        const matchesSearch =
          !proofQ || item.location.toLowerCase().includes(proofQ) || item.personName.toLowerCase().includes(proofQ);
        return matchesFilter && matchesSearch;
      }),
    [dayAllEvidenceActivity, proofFilter, proofQ]
  );

  const sortedEvidenceActivity = useMemo(() => {
    const arr = [...filteredEvidenceActivity];
    if (proofSort === "score-desc") arr.sort((a, b) => b.score - a.score);
    else if (proofSort === "score-asc") arr.sort((a, b) => a.score - b.score);
    return arr;
  }, [filteredEvidenceActivity, proofSort]);

  const areaCount = selectedContractAreaType?.areas.length ?? 0;
  const lastActivityLabel = dayAllEvidenceActivity[0]?.timeAgo ?? "no activity yet";

  const trendSeedKey = isSiteLevel ? "site" : (selection.areaTypeName ?? selection.buildingName ?? "site");
  const trendDays = trendRange === "week" ? 7 : 30;
  const trend = useMemo(
    () => trendSeries(trendSeedKey, trendDays, dayOffset),
    [trendSeedKey, trendDays, dayOffset]
  );
  const trendFirst = trend[0];
  const trendLast = trend[trend.length - 1];
  const trendDelta = Number((trendLast - trendFirst).toFixed(2));

  const recentActivity = useMemo(() => {
    const verificationItems = recentVerifications.map(verificationToActivity);
    const auditItems = recentAudits.map(auditToActivity);
    if (activityFilter === "verification") return verificationItems;
    if (activityFilter === "audit") return auditItems;
    return [...verificationItems, ...auditItems];
  }, [activityFilter]);
  const dayRecentActivity = useMemo(
    () => recentActivity.map((item) => applyDayVariationToActivity(item, dayOffset)),
    [recentActivity, dayOffset]
  );
  const dayTeam = useMemo(() => teamForNode("site", roster, dayOffset, 8), [roster, dayOffset]);

  // Site-level KPIs — identical formulas to SowHierarchyPage, so the
  // two pages agree on what "today" looks like site-wide.
  const dayVerificationsCompleted = Math.round(
    facilitySummary.verificationsCompleted * scaleForDay("site-completed", dayOffset)
  );
  const dayHoursCapturedPercent = Math.min(
    100,
    Math.round(facilitySummary.hoursCapturedPercent * scaleForDay("site-captured", dayOffset))
  );
  const dayTeamMembers = Math.round(facilitySummary.teamMembers * scaleForDay("site-team", dayOffset, 0.9, 1.05));
  const dayVerificationScore = scoreForDay("site-verification-score", dayOffset);
  const dayAuditScore = scoreForDay("site-audit-score", dayOffset);

  const dayBuildingCoverage = selectedBuilding
    ? Math.min(100, Math.round(selectedBuilding.coveragePercent * scaleForDay(`${selectedBuilding.name}-coverage`, dayOffset)))
    : 0;

  return (
    // sharedStyles.page + data-theme here (not just layoutStyles.page)
    // because every themed color rule in SowPage.module.css is scoped
    // `.page[data-theme="..."] .foo` — without an ancestor carrying
    // that module's own `.page` class and the attribute together, all
    // of that shared color styling (chip/tab/score colors, etc.)
    // silently no-ops on this page.
    <div className={[layoutStyles.page, sharedStyles.page].join(" ")} data-theme="light">
      <SowNav current="coverage" />

      <div className={layoutStyles.pageHeaderBar}>
        <h1 className={layoutStyles.pageHeaderTitle}>Scope of Work — Hierarchy + Coverage</h1>
        <div className={layoutStyles.dateNav}>
          <button
            type="button"
            className={layoutStyles.dateNavArrow}
            onClick={() => setDayOffset((o) => o + 1)}
            aria-label="Previous day"
          >
            ‹
          </button>
          <span className={layoutStyles.dateNavLabel}>{formatDateLabel(dayOffset)}</span>
          <button
            type="button"
            className={layoutStyles.dateNavArrow}
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

      <div className={layoutStyles.layout}>
        <aside className={layoutStyles.sidebar}>
          <h2 className={layoutStyles.sidebarHeading}>Site Hierarchy</h2>
          <div className={layoutStyles.sidebarSearch}>
            <Input
              theme="light"
              icon={<SearchIcon />}
              placeholder="Search buildings, areas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search site hierarchy"
            />
          </div>

          {/* Area-type filters live here, at the top level, rather than
              nested under a building in the tree below — they apply to
              whichever building is currently selected/expanded, but read
              as a persistent filter bar instead of something you have to
              expand a building to find. */}
          <div className={detailStyles.filterPanel}>
            <div className={detailStyles.statusPillRow}>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={[detailStyles.statusPill, statusFilter === f.id ? detailStyles.statusPillActive : ""]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={statusFilter === f.id}
                  onClick={() => setStatusFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className={detailStyles.sortGrid}>
              <label className={detailStyles.sortField}>
                <span className={detailStyles.sortFieldLabel}>Sort</span>
                <select
                  className={[sharedStyles.filterSelect, detailStyles.sortFieldSelect].join(" ")}
                  value={areaTypeSort}
                  onChange={(e) => setAreaTypeSort(e.target.value as AreaTypeSort)}
                >
                  {AREA_TYPE_SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={detailStyles.sortField}>
                <span className={detailStyles.sortFieldLabel}>Group by</span>
                <select
                  className={[sharedStyles.filterSelect, detailStyles.sortFieldSelect].join(" ")}
                  value={areaTypeGroupBy}
                  onChange={(e) => setAreaTypeGroupBy(e.target.value as AreaTypeGroupBy)}
                >
                  {GROUP_BY_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <nav className={layoutStyles.tree} aria-label="Site hierarchy">
            <button
              type="button"
              className={[layoutStyles.treeNodeRow, layoutStyles.treeNodeSite, isSiteLevel ? layoutStyles.treeNodeActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={selectSite}
            >
              <span className={layoutStyles.treeNodeCaretSpacer} aria-hidden="true" />
              <img src={siteInfo.logo} alt="" className={layoutStyles.treeNodeLogo} />
              {siteInfo.client} — {siteInfo.siteName}
            </button>

            {buildings.map((building) => {
              const modeled = contractBuildings.find((cb) => cb.name === building.name);
              const buildingMatches = building.name.toLowerCase().includes(q);
              const childMatches = !!modeled && modeled.areaTypes.some((a) => a.name.toLowerCase().includes(q));
              if (searching && !buildingMatches && !childMatches) return null;

              const buildingOpen = searching ? true : !!expandedBuildings[building.name];
              const buildingSelected = selection.buildingName === building.name && !selection.areaTypeName;
              const isSelectedBuilding = selection.buildingName === building.name;
              // The currently selected building's rows are already
              // status-filtered/sorted/grouped; any other modeled building
              // that's incidentally still expanded just shows its area
              // types in plain, unfiltered order.
              const rowsForThisBuilding: DayAreaTypeRow[] = isSelectedBuilding
                ? visibleAreaTypeRows
                : (modeled?.areaTypes ?? [])
                    .filter((at) => !searching || buildingMatches || at.name.toLowerCase().includes(q))
                    .map((ct) => ({ ...areaTypeFromContract(ct), areaCount: ct.areas.length, dayServicedToday: 0, dayPercent: 0, dayScore: areaTypeFromContract(ct).score, status: statusForAreaType({ percent: 0, score: areaTypeFromContract(ct).score }) }));
              const groupsForThisBuilding = isSelectedBuilding
                ? groupedAreaTypeRows
                : [{ label: null as string | null, rows: rowsForThisBuilding }];

              return (
                <div key={building.name}>
                  <button
                    type="button"
                    className={[
                      layoutStyles.treeNodeRow,
                      layoutStyles.treeNodeBuilding,
                      buildingSelected ? layoutStyles.treeNodeActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectBuilding(building.name)}
                    aria-expanded={modeled ? buildingOpen : undefined}
                  >
                    {modeled ? (
                      <span
                        className={[layoutStyles.treeNodeCaret, buildingOpen ? layoutStyles.treeNodeCaretOpen : ""]
                          .filter(Boolean)
                          .join(" ")}
                        aria-hidden="true"
                      >
                        ▸
                      </span>
                    ) : (
                      <span className={layoutStyles.treeNodeCaretSpacer} aria-hidden="true" />
                    )}
                    <i className="fa-solid fa-building" aria-hidden="true" />
                    {building.name}
                    <span className={layoutStyles.treeNodeMeta}>{modeled ? modeled.areaCount : building.totalActions}</span>
                  </button>

                  {modeled && buildingOpen && (
                    <>
                      {rowsForThisBuilding.length === 0 ? (
                        <p className={detailStyles.coverageEmptyNote}>No area types match these filters.</p>
                      ) : (
                        groupsForThisBuilding.map((group, groupIndex) => (
                          <div key={group.label ?? `group-${groupIndex}`}>
                            {group.label && <p className={detailStyles.groupLabel}>{group.label}</p>}
                            {group.rows.map((areaType) => {
                              const areaTypeOpen = searching ? true : !!expandedAreaTypes[areaType.name];
                              const areaTypeSelected =
                                isSelectedBuilding && selection.areaTypeName === areaType.name && !selection.areaId;
                              const contractAreas =
                                modeled.areaTypes.find((at) => at.name === areaType.name)?.areas ?? [];
                              return (
                                <div key={areaType.name}>
                                  <button
                                    type="button"
                                    className={[
                                      detailStyles.coverageRow,
                                      areaTypeSelected ? detailStyles.coverageRowActive : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    onClick={() => selectAreaType(building.name, areaType.name)}
                                    aria-expanded={areaTypeOpen}
                                  >
                                    <span className={detailStyles.coverageRowTop}>
                                      <span
                                        className={[
                                          layoutStyles.treeNodeCaret,
                                          areaTypeOpen ? layoutStyles.treeNodeCaretOpen : "",
                                        ]
                                          .filter(Boolean)
                                          .join(" ")}
                                        aria-hidden="true"
                                      >
                                        ▸
                                      </span>
                                      <i className="fa-solid fa-shapes" aria-hidden="true" />
                                      <span className={detailStyles.coverageRowName}>
                                        {areaType.name} ({areaType.areaCount})
                                      </span>
                                      <span
                                        className={[sharedStyles.photoScore, detailStyles.coverageRowScore].join(" ")}
                                      >
                                        {areaType.dayScore.toFixed(2)}
                                      </span>
                                    </span>
                                    <span className={detailStyles.coverageMetaLine}>
                                      <span>
                                        {areaType.dayServicedToday} of {areaType.expectedServices} expected services
                                      </span>
                                    </span>
                                    <span className={detailStyles.coverageBarTrack}>
                                      <span
                                        className={detailStyles.coverageBarFill}
                                        style={{ width: `${Math.min(100, areaType.dayPercent)}%` }}
                                      />
                                    </span>
                                    <span className={detailStyles.coverageMetaLine}>
                                      <span className={detailStyles.coveragePercentText}>
                                        {areaType.dayPercent.toFixed(0)}% coverage
                                      </span>
                                      <span>{areaType.captured} captured</span>
                                    </span>
                                  </button>

                                  {areaTypeOpen &&
                                    contractAreas.map((area) => (
                                      <button
                                        key={area.areaId}
                                        type="button"
                                        className={[
                                          layoutStyles.treeNodeRow,
                                          layoutStyles.treeNodeZone,
                                          selection.areaId === area.areaId && selection.areaTypeName === areaType.name
                                            ? layoutStyles.treeNodeActive
                                            : "",
                                        ]
                                          .filter(Boolean)
                                          .join(" ")}
                                        onClick={() => selectArea(building.name, areaType.name, area.areaId)}
                                      >
                                        <span className={layoutStyles.treeNodeCaretSpacer} aria-hidden="true" />
                                        <i className="fa-solid fa-location-dot" aria-hidden="true" />
                                        {area.displayName}
                                      </button>
                                    ))}
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className={layoutStyles.content}>
          <p className={layoutStyles.breadcrumb}>
            {isSiteLevel ? (
              <span className={layoutStyles.breadcrumbCurrent}>
                {siteInfo.client} — {siteInfo.siteName}
              </span>
            ) : (
              <>
                {siteInfo.client} — {siteInfo.siteName} / {selection.buildingName}
                {selectedAreaTypeRow && <> / {selectedAreaTypeRow.name}</>}
                {selectedArea && (
                  <>
                    {" "}
                    / <span className={layoutStyles.breadcrumbCurrent}>{selectedArea.displayName}</span>
                  </>
                )}
              </>
            )}
          </p>
          <h1 className={layoutStyles.contentTitle}>
            {isSiteLevel
              ? `${siteInfo.client} — ${siteInfo.siteName}`
              : (selectedArea?.displayName ?? selectedAreaTypeRow?.name ?? selectedBuilding!.name)}
          </h1>

          <div className={sharedStyles.sectionStack}>
            {isSiteLevel ? (
              <>
                {/* Site-level KPIs */}
                <div className={sharedStyles.kpiBoxRow}>
                  <Card theme="light" className={sharedStyles.kpiBox}>
                    <h2 className={sharedStyles.kpiBoxTitle}>Doing the work</h2>
                    <div className={sharedStyles.kpiList}>
                      <div className={sharedStyles.kpiItem}>
                        <span className={sharedStyles.kpiValue}>
                          {dayVerificationsCompleted.toLocaleString()}
                          <span className={sharedStyles.kpiValueMuted}>
                            {" "}
                            / {facilitySummary.verificationsExpected.toLocaleString()}
                          </span>
                        </span>
                        <span className={sharedStyles.kpiLabel}>Expected vs. completed services</span>
                      </div>
                      <div className={sharedStyles.kpiItem}>
                        <span className={sharedStyles.kpiValue}>{dayHoursCapturedPercent}%</span>
                        <span className={sharedStyles.kpiLabel}>Time captured</span>
                      </div>
                      <div className={sharedStyles.kpiItem}>
                        <span className={sharedStyles.kpiValue}>{dayTeamMembers}</span>
                        <span className={sharedStyles.kpiLabel}>Active team members</span>
                      </div>
                    </div>
                  </Card>

                  <Card theme="light" className={sharedStyles.kpiBox}>
                    <h2 className={sharedStyles.kpiBoxTitle}>Doing it well</h2>
                    <div className={sharedStyles.kpiList}>
                      <div className={sharedStyles.kpiItem}>
                        <span className={sharedStyles.kpiValue}>{dayVerificationScore.toFixed(2)}</span>
                        <span className={sharedStyles.kpiLabel}>Average verification score</span>
                      </div>
                      <div className={sharedStyles.kpiItem}>
                        <span className={sharedStyles.kpiValue}>{dayAuditScore.toFixed(2)}</span>
                        <span className={sharedStyles.kpiLabel}>Average audit score</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Trend */}
                <TrendSection
                  trend={trend}
                  trendFirst={trendFirst}
                  trendLast={trendLast}
                  trendDelta={trendDelta}
                  trendRange={trendRange}
                  setTrendRange={setTrendRange}
                  dayOffset={dayOffset}
                />

                {/* Work to be done — the site-wide contract scope, same
                    numbers SowContractTab leads with. Per-building/area-type
                    task lists live below once you drill into the tree. */}
                <div className={sharedStyles.section}>
                  <h2 className={sharedStyles.sectionTitle}>Work to be done</h2>
                  <div className={[sharedStyles.statGrid, sharedStyles.statGridWide].join(" ")}>
                    <Card theme="light" className={sharedStyles.statTile}>
                      <span className={sharedStyles.statTileLabel}>Buildings</span>
                      <span className={sharedStyles.statTileValue}>{siteContractStats.buildings}</span>
                    </Card>
                    <Card theme="light" className={sharedStyles.statTile}>
                      <span className={sharedStyles.statTileLabel}>Area types</span>
                      <span className={sharedStyles.statTileValue}>{siteContractStats.areaTypes}</span>
                    </Card>
                    <Card theme="light" className={sharedStyles.statTile}>
                      <span className={sharedStyles.statTileLabel}>Areas</span>
                      <span className={sharedStyles.statTileValue}>{siteContractStats.areas}</span>
                    </Card>
                    <Card theme="light" className={sharedStyles.statTile}>
                      <span className={sharedStyles.statTileLabel}>Frequency types</span>
                      <span className={sharedStyles.statTileValue}>{siteContractStats.frequencyTypes}</span>
                    </Card>
                    <Card theme="light" className={sharedStyles.statTile}>
                      <span className={sharedStyles.statTileLabel}>Expected annual tasks</span>
                      <span className={sharedStyles.statTileValue}>{siteContractStats.expectedAnnualTasks}</span>
                    </Card>
                  </div>
                  <button type="button" className={sharedStyles.textLink} onClick={() => selectBuilding("Concourse D")}>
                    Browse Concourse D&rsquo;s full task list
                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </button>
                </div>

                {/* Recent activity — larger images, same hero mosaic as Overview — plus who was working */}
                <div className={sharedStyles.section}>
                  <div className={sharedStyles.sectionHeaderRow}>
                    <h2 className={sharedStyles.sectionTitle}>Recent activity</h2>
                  </div>
                  <div className={sharedStyles.chipRow}>
                    {EVIDENCE_VIEWS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={[sharedStyles.chip, evidenceView === v.id ? sharedStyles.chipActive : ""]
                          .filter(Boolean)
                          .join(" ")}
                        data-theme="light"
                        aria-pressed={evidenceView === v.id}
                        onClick={() => setEvidenceView(v.id)}
                      >
                        <i className={`fa-solid ${v.icon}`} aria-hidden="true" /> {v.label}
                      </button>
                    ))}
                  </div>

                  {evidenceView === "activity" ? (
                    <>
                      <div className={sharedStyles.chipRow}>
                        {ACTIVITY_FILTERS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className={[sharedStyles.chip, activityFilter === f.id ? sharedStyles.chipActive : ""]
                              .filter(Boolean)
                              .join(" ")}
                            data-theme="light"
                            aria-pressed={activityFilter === f.id}
                            onClick={() => setActivityFilter(f.id)}
                          >
                            <i className={`fa-solid ${f.icon}`} aria-hidden="true" /> {f.label}
                          </button>
                        ))}
                      </div>
                      <div className={sharedStyles.activityGrid}>
                        {dayRecentActivity.map((item, i) => (
                          <Card
                            key={item.location}
                            theme="light"
                            className={[sharedStyles.activityCard, i === 0 ? sharedStyles.activityHero : ""]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {item.areaPhoto ? (
                              <img
                                src={item.areaPhoto}
                                alt=""
                                className={[sharedStyles.activityPhoto, sharedStyles.activityPhotoImg].join(" ")}
                              />
                            ) : (
                              <div className={sharedStyles.activityPhoto} aria-hidden="true">
                                No photo
                              </div>
                            )}
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
                    </>
                  ) : (
                    <TeamList team={dayTeam} />
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Stats for whatever's selected */}
                <div className={[sharedStyles.statGrid, sharedStyles.statGridWide].join(" ")}>
                  {selectedAreaTypeRow ? (
                    <>
                      <StatTile label="Serviced today" value={selectedAreaTypeRow.dayServicedToday} />
                      <StatTile label="Expected services" value={selectedAreaTypeRow.expectedServices} />
                      <StatTile label="% complete" value={`${selectedAreaTypeRow.dayPercent.toFixed(0)}%`} />
                      <StatTile label="Time captured" value={selectedAreaTypeRow.captured} />
                      <StatTile label="Avg. score" value={selectedAreaTypeRow.dayScore.toFixed(2)} />
                    </>
                  ) : (
                    <>
                      <StatTile label="Total actions" value={selectedBuilding!.totalActions} />
                      <StatTile label="Coverage" value={`${dayBuildingCoverage}%`} />
                    </>
                  )}
                </div>

                {/* Trend */}
                <TrendSection
                  trend={trend}
                  trendFirst={trendFirst}
                  trendLast={trendLast}
                  trendDelta={trendDelta}
                  trendRange={trendRange}
                  setTrendRange={setTrendRange}
                  dayOffset={dayOffset}
                />

                {/* Work to be done */}
                <div className={sharedStyles.section}>
                  <h2 className={sharedStyles.sectionTitle}>Work to be done</h2>
                  {selectedAreaTypeRow ? (
                    <>
                      {selectedArea && (
                        <p className={layoutStyles.emptyNote}>
                          {selectedArea.displayName} · Floor {selectedArea.floor} ({selectedArea.floorDescription}) —
                          same contracted tasks as every {selectedAreaTypeRow.name} area.
                        </p>
                      )}
                      <Card theme="light" className={sharedStyles.treeCard}>
                        <div className={layoutStyles.flatTaskList}>
                          {selectedAreaTypeRow.tasks.map((task) => (
                            <div key={task.label} className={sharedStyles.taskRow}>
                              <span className={sharedStyles.taskLabel}>{task.label}</span>
                              <span className={sharedStyles.frequencyText}>
                                {task.frequency}
                                {task.shifts && task.shifts.length > 0 && task.shifts.length < 3 && ` · ${task.shifts.join("/")}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </>
                  ) : selectedBuildingContract ? (
                    <Card theme="light" className={sharedStyles.treeCard}>
                      {dayAreaTypeRows.map((at) => (
                        <button
                          key={at.name}
                          type="button"
                          className={sharedStyles.treeRow}
                          onClick={() => selectAreaType(selection.buildingName!, at.name)}
                        >
                          <span className={sharedStyles.treeLabel}>{at.name}</span>
                          <span className={sharedStyles.treeMeta}>
                            <span>{at.areaCount} areas</span>
                            <span>{at.tasks.length} contracted tasks</span>
                          </span>
                        </button>
                      ))}
                    </Card>
                  ) : (
                    <p className={layoutStyles.emptyNote}>No detailed task list available for this building.</p>
                  )}
                </div>

                {/* Verification proof */}
                {selectedAreaTypeRow && (
                  <div className={sharedStyles.section}>
                    <div className={detailStyles.proofHeaderRow}>
                      <h2 className={sharedStyles.sectionTitle}>
                        Verification proof ·{" "}
                        {selectedArea ? `${selectedAreaTypeRow.name} — ${selectedArea.displayName}` : selectedAreaTypeRow.name}
                      </h2>
                      <span className={detailStyles.proofCount}>
                        Showing {sortedEvidenceActivity.length} of {dayAllEvidenceActivity.length} today
                      </span>
                    </div>
                    <p className={detailStyles.proofSubtitle}>
                      {areaCount} area{areaCount === 1 ? "" : "s"} in this type · last activity {lastActivityLabel}
                    </p>

                    <div className={sharedStyles.planToolbar}>
                      <div className={sharedStyles.searchWrap}>
                        <Input
                          theme="light"
                          icon={<SearchIcon />}
                          placeholder="Search area or associate..."
                          value={proofSearch}
                          onChange={(e) => setProofSearch(e.target.value)}
                          aria-label="Search verification proof"
                        />
                      </div>
                    </div>
                    <div className={sharedStyles.chipRow}>
                      {PROOF_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className={[sharedStyles.chip, proofFilter === f.id ? sharedStyles.chipActive : ""]
                            .filter(Boolean)
                            .join(" ")}
                          data-theme="light"
                          aria-pressed={proofFilter === f.id}
                          onClick={() => setProofFilter(f.id)}
                        >
                          {f.label}
                        </button>
                      ))}
                      <span className={detailStyles.proofSortLabel}>Sort</span>
                      <select
                        className={sharedStyles.filterSelect}
                        value={proofSort}
                        onChange={(e) => setProofSort(e.target.value as ProofSort)}
                        aria-label="Sort verification proof"
                      >
                        {PROOF_SORTS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {sortedEvidenceActivity.length === 0 ? (
                      <p className={layoutStyles.emptyNote}>No verification proof matches these filters.</p>
                    ) : (
                      <div className={sharedStyles.areaGrid}>
                        {sortedEvidenceActivity.map((item, i) => (
                          <Card key={`${item.location}-${i}`} theme="light" className={sharedStyles.photoCard}>
                            {item.areaPhoto ? (
                              <img
                                src={item.areaPhoto}
                                alt=""
                                className={[sharedStyles.photoPlaceholder, sharedStyles.photoPlaceholderImg].join(" ")}
                              />
                            ) : (
                              <div className={sharedStyles.photoPlaceholder} aria-hidden="true">
                                No photo
                              </div>
                            )}
                            <div className={sharedStyles.photoBody}>
                              <span className={sharedStyles.photoMeta}>
                                <span className={sharedStyles.typeTag}>{item.tag}</span>
                                <span className={sharedStyles.photoScore}>{item.score.toFixed(2)}</span>
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
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card theme="light" className={sharedStyles.statTile}>
      <span className={sharedStyles.statTileLabel}>{label}</span>
      <span className={sharedStyles.statTileValue}>{value}</span>
    </Card>
  );
}

/**
 * Who was working site-wide on the selected day, and what they did —
 * a friendlier read on the Our Team / Service Times screens than
 * their dense per-metric-column table: name, role, services done,
 * average score, time worked, and when they were last seen.
 */
function TeamList({ team }: { team: TeamMember[] }) {
  if (team.length === 0) {
    return <p className={layoutStyles.emptyNote}>No team roster available for this selection.</p>;
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

function TrendSection({
  trend,
  trendFirst,
  trendLast,
  trendDelta,
  trendRange,
  setTrendRange,
  dayOffset,
}: {
  trend: number[];
  trendFirst: number;
  trendLast: number;
  trendDelta: number;
  trendRange: TrendRange;
  setTrendRange: (r: TrendRange) => void;
  dayOffset: number;
}) {
  const direction = trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "flat";
  const endLabel = formatShortDayLabel(dayOffset);
  const startLabel = formatShortDayLabel(dayOffset + trend.length - 1);
  return (
    <div className={sharedStyles.section}>
      <div className={sharedStyles.sectionHeaderRow}>
        <h2 className={sharedStyles.sectionTitle}>Performance trend</h2>
        <div className={sharedStyles.chipRow}>
          <button
            type="button"
            className={[sharedStyles.chip, trendRange === "week" ? sharedStyles.chipActive : ""]
              .filter(Boolean)
              .join(" ")}
            data-theme="light"
            onClick={() => setTrendRange("week")}
          >
            Week
          </button>
          <button
            type="button"
            className={[sharedStyles.chip, trendRange === "month" ? sharedStyles.chipActive : ""]
              .filter(Boolean)
              .join(" ")}
            data-theme="light"
            onClick={() => setTrendRange("month")}
          >
            Month
          </button>
        </div>
      </div>
      <Card theme="light" className={sharedStyles.paddedCard}>
        <div className={layoutStyles.trendHeaderRow}>
          <span className={layoutStyles.trendValue}>{trendLast.toFixed(2)}</span>
          <span className={layoutStyles.trendCaption}>
            avg. score —{" "}
            {direction === "flat" ? (
              "flat"
            ) : (
              <>
                {direction} {Math.abs(trendDelta).toFixed(2)}
              </>
            )}{" "}
            over the {trend.length} days ending {dayOffset === 0 ? "today" : endLabel}
          </span>
        </div>
        <Sparkline values={trend} color="var(--color-neutral-600)" height={64} />
        <div className={layoutStyles.trendAxis}>
          <span>
            {startLabel} ({trendFirst.toFixed(2)})
          </span>
          <span>{endLabel}</span>
        </div>
      </Card>
    </div>
  );
}
