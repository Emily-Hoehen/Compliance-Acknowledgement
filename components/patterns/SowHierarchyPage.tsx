"use client";

import { useMemo, useState } from "react";
import { SowNav } from "./SowNav";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Sparkline } from "../ui/Charts";
import { SearchIcon } from "./icons";
import { siteInfo } from "../../lib/homeDashboardData";
import {
  siteContractStats,
  buildings,
  concourseDAreaTypes,
  verificationsForArea,
  auditsForArea,
  taskTypes,
  shifts,
  positions,
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
  type VerificationEvent,
  type AuditEvent,
  type ActivityItem,
  type ActivityKind,
  type TeamMember,
} from "../../lib/sowData";
import type { RosterPerson } from "../../lib/csv";
import sharedStyles from "./SowPage.module.css";
import styles from "./SowHierarchyPage.module.css";

export type SowHierarchyPageProps = {
  associates: RosterPerson[];
  managers: RosterPerson[];
};

const ZONES = ["Zone 1", "Zone 2", "Zone 3"];
const ALL = "all";

type Selection = {
  buildingName: string | null; // null = site level (nothing under it selected)
  areaTypeName: string | null;
  zoneName: string | null;
};

type TrendRange = "week" | "month";

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

type EvidenceView = "activity" | "team";

const EVIDENCE_VIEWS: { id: EvidenceView; label: string; icon: string }[] = [
  { id: "activity", label: "Activity", icon: "fa-clipboard-list" },
  { id: "team", label: "Team", icon: "fa-users" },
];

/**
 * SowHierarchyPage — alternate Scope of Work exploration. Instead
 * of top tabs (SowPage), the site's own structure — Site > Building
 * > Area Type > Area — is the navigation: a sidebar tree on the
 * left, with the main pane showing what's contracted and the
 * evidence it's happening for whatever's selected, plus a
 * performance trend at every level.
 *
 * Only Concourse D carries full area-type/zone detail (same
 * limitation as SowContractTab/SowFacilityTab) — the other six
 * buildings are selectable at the building level, with an empty
 * state where their area-type breakdown would go.
 *
 * The date nav actually drives the numbers — KPIs, stat tiles,
 * trend, and evidence timestamps/scores all recompute per
 * dayOffset via lib/sowData.ts's scoreForDay/scaleForDay generators.
 * There's no real historical dataset behind this (nothing in the
 * source screens tracked day-by-day history), so "yesterday" is a
 * deterministic, plausible-looking variation rather than a replay
 * of an actual past day — but it's consistent: revisiting the same
 * day reproduces the same numbers, and every node (site, building,
 * area type, zone) varies independently and smoothly day to day.
 *
 * Lofi: reuses SowPage.module.css for every content primitive
 * (cards, stat tiles, KPI boxes, activity mosaic, photo
 * placeholders, tags, task rows) so this stays visually consistent
 * with the rest of the SOW exploration; this module only adds the
 * sidebar/tree/two-pane layout and the trend chart shell.
 *
 * Evidence comes in two forms, toggled with the same Activity/Team
 * control at both the site level ("Recent activity") and per-node
 * level ("Evidence"): Activity is verifications + audits (as
 * before); Team is a friendlier "who was working, and what they
 * did" read on the Our Team / Service Times screens' data — a
 * deterministic, day-varying subset of the real associate/manager
 * rows rather than that dense per-metric-column table.
 */
export function SowHierarchyPage({ associates, managers }: SowHierarchyPageProps) {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection>({
    buildingName: null,
    areaTypeName: null,
    zoneName: null,
  });
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({ "Concourse D": true });
  const [expandedAreaTypes, setExpandedAreaTypes] = useState<Record<string, boolean>>({ "Baggage Claims": true });

  const [taskTypeFilter, setTaskTypeFilter] = useState(ALL);
  const [shiftFilter, setShiftFilter] = useState(ALL);
  const [positionFilter, setPositionFilter] = useState(ALL);
  const [activityFilter, setActivityFilter] = useState<ActivityKind | "all">("all");
  const [evidenceView, setEvidenceView] = useState<EvidenceView>("activity");

  const [dayOffset, setDayOffset] = useState(0);
  const [trendRange, setTrendRange] = useState<TrendRange>("week");

  // Associates are the frontline roster actually doing (and getting
  // credited for) the service work shown as "Team" evidence below —
  // managers aren't part of that rotation, same as the real Our Team
  // screen defaulting to its Associates tab.
  const roster = associates;

  const q = search.trim().toLowerCase();
  const searching = q.length > 0;

  function selectSite() {
    setSelection({ buildingName: null, areaTypeName: null, zoneName: null });
  }

  function selectBuilding(name: string) {
    setSelection({ buildingName: name, areaTypeName: null, zoneName: null });
    if (name === "Concourse D") {
      setExpandedBuildings((prev) => ({ ...prev, [name]: !prev[name] }));
    }
  }

  function selectAreaType(buildingName: string, areaTypeName: string) {
    setSelection({ buildingName, areaTypeName, zoneName: null });
    setExpandedAreaTypes((prev) => ({ ...prev, [areaTypeName]: !prev[areaTypeName] }));
  }

  function selectZone(buildingName: string, areaTypeName: string, zoneName: string) {
    setSelection({ buildingName, areaTypeName, zoneName });
  }

  const isSiteLevel = !selection.buildingName;
  const selectedAreaType = selection.areaTypeName
    ? concourseDAreaTypes.find((a) => a.name === selection.areaTypeName)
    : null;
  const selectedBuilding = selection.buildingName ? buildings.find((b) => b.name === selection.buildingName)! : null;

  const evidenceVerifications = useMemo(() => {
    let base: VerificationEvent[];
    if (selectedAreaType) {
      base = verificationsForArea(selectedAreaType.name);
      if (selection.zoneName) {
        base = base.filter((v) => v.location.endsWith(selection.zoneName as string));
      }
    } else if (selection.buildingName === "Concourse D") {
      base = concourseDAreaTypes.flatMap((a) => verificationsForArea(a.name));
    } else {
      base = [];
    }
    return base.filter(
      (v) =>
        (taskTypeFilter === ALL || v.type === taskTypeFilter) &&
        (shiftFilter === ALL || v.shift === shiftFilter) &&
        (positionFilter === ALL || v.position === positionFilter)
    );
  }, [selectedAreaType, selection.buildingName, selection.zoneName, taskTypeFilter, shiftFilter, positionFilter]);

  // Audits aren't modeled per-zone in this dataset, so they only show up
  // at the building/area-type level, not when a specific zone is selected.
  const evidenceAudits = useMemo((): AuditEvent[] => {
    if (selection.zoneName) return [];
    if (selectedAreaType) return auditsForArea(selectedAreaType.name);
    if (selection.buildingName === "Concourse D") return concourseDAreaTypes.flatMap((a) => auditsForArea(a.name));
    return [];
  }, [selectedAreaType, selection.buildingName, selection.zoneName]);

  const evidenceActivity = useMemo(() => {
    const verificationItems = evidenceVerifications.map(verificationToActivity);
    const auditItems = evidenceAudits.map(auditToActivity);
    if (activityFilter === "verification") return verificationItems;
    if (activityFilter === "audit") return auditItems;
    return [...verificationItems, ...auditItems];
  }, [evidenceVerifications, evidenceAudits, activityFilter]);

  const trendSeedKey = isSiteLevel
    ? "site"
    : selection.zoneName
      ? `${selection.areaTypeName}-${selection.zoneName}`
      : (selection.areaTypeName ?? selection.buildingName ?? "site");
  const trendDays = trendRange === "week" ? 7 : 30;
  const trend = useMemo(
    () => trendSeries(trendSeedKey, trendDays, dayOffset),
    [trendSeedKey, trendDays, dayOffset]
  );
  const trendFirst = trend[0];
  const trendLast = trend[trend.length - 1];
  const trendDelta = Number((trendLast - trendFirst).toFixed(2));

  const dayEvidenceActivity = useMemo(
    () => evidenceActivity.map((item) => applyDayVariationToActivity(item, dayOffset)),
    [evidenceActivity, dayOffset]
  );

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

  // Who was working here, and what they did — same day-varying idea as
  // Activity, just a friendlier read on the roster than a raw table.
  const dayTeam = useMemo(
    () => teamForNode(trendSeedKey, roster, dayOffset, isSiteLevel ? 8 : 5),
    [trendSeedKey, roster, dayOffset, isSiteLevel]
  );

  // Site-level KPIs, re-derived per day — "expected" volumes stay
  // static (the contracted plan doesn't change day to day); actual
  // performance does.
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

  // Building/area-type stats, re-derived per day — totalActions,
  // expectedServices, and captured time stay static (contract facts
  // / not worth reformatting a duration string for this pass);
  // servicedToday, % complete, coverage, and score vary.
  const dayBuildingCoverage = selectedBuilding
    ? Math.min(100, Math.round(selectedBuilding.coveragePercent * scaleForDay(`${selectedBuilding.name}-coverage`, dayOffset)))
    : 0;
  const dayAreaServicedToday = selectedAreaType
    ? Math.max(0, Math.round(selectedAreaType.servicedToday * scaleForDay(`${selectedAreaType.name}-serviced`, dayOffset)))
    : 0;
  const dayAreaPercent = selectedAreaType
    ? Math.min(100, (dayAreaServicedToday / selectedAreaType.expectedServices) * 100)
    : 0;
  const dayAreaScore = selectedAreaType ? scoreForDay(`${selectedAreaType.name}-score`, dayOffset) : 0;

  return (
    // sharedStyles.page + data-theme here (not just styles.page) because
    // every themed color rule in SowPage.module.css is scoped
    // `.page[data-theme="..."] .foo` — without an ancestor carrying
    // that module's own `.page` class and the attribute together, all
    // of that shared color styling (chip/tab/score colors, etc.)
    // silently no-ops on this page.
    <div className={[styles.page, sharedStyles.page].join(" ")} data-theme="light">
      <SowNav current="hierarchy" />

      <div className={styles.pageHeaderBar}>
        <h1 className={styles.pageHeaderTitle}>Scope of Work — Site Hierarchy</h1>
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

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarHeading}>Site Hierarchy</h2>
          <div className={styles.sidebarSearch}>
            <Input
              theme="light"
              icon={<SearchIcon />}
              placeholder="Search buildings, areas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search site hierarchy"
            />
          </div>

          <nav className={styles.tree} aria-label="Site hierarchy">
            <button
              type="button"
              className={[styles.treeNodeRow, styles.treeNodeSite, isSiteLevel ? styles.treeNodeActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={selectSite}
            >
              <span className={styles.treeNodeCaretSpacer} aria-hidden="true" />
              <img src={siteInfo.logo} alt="" className={styles.treeNodeLogo} />
              {siteInfo.client} — {siteInfo.siteName}
            </button>

            {buildings.map((building) => {
              const isConcourseD = building.name === "Concourse D";
              const buildingMatches = building.name.toLowerCase().includes(q);
              const childMatches = isConcourseD && concourseDAreaTypes.some((a) => a.name.toLowerCase().includes(q));
              if (searching && !buildingMatches && !childMatches) return null;

              const buildingOpen = searching ? true : !!expandedBuildings[building.name];
              const buildingSelected = selection.buildingName === building.name && !selection.areaTypeName;

              return (
                <div key={building.name}>
                  <button
                    type="button"
                    className={[
                      styles.treeNodeRow,
                      styles.treeNodeBuilding,
                      buildingSelected ? styles.treeNodeActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectBuilding(building.name)}
                    aria-expanded={isConcourseD ? buildingOpen : undefined}
                  >
                    {isConcourseD ? (
                      <span
                        className={[styles.treeNodeCaret, buildingOpen ? styles.treeNodeCaretOpen : ""]
                          .filter(Boolean)
                          .join(" ")}
                        aria-hidden="true"
                      >
                        ▸
                      </span>
                    ) : (
                      <span className={styles.treeNodeCaretSpacer} aria-hidden="true" />
                    )}
                    <i className="fa-solid fa-building" aria-hidden="true" />
                    {building.name}
                    <span className={styles.treeNodeMeta}>{building.totalActions}</span>
                  </button>

                  {isConcourseD &&
                    buildingOpen &&
                    concourseDAreaTypes
                      .filter((at) => !searching || buildingMatches || at.name.toLowerCase().includes(q))
                      .map((areaType) => {
                        const areaTypeOpen = searching ? true : !!expandedAreaTypes[areaType.name];
                        const areaTypeSelected = selection.areaTypeName === areaType.name && !selection.zoneName;
                        return (
                          <div key={areaType.name}>
                            <button
                              type="button"
                              className={[
                                styles.treeNodeRow,
                                styles.treeNodeAreaType,
                                areaTypeSelected ? styles.treeNodeActive : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => selectAreaType(building.name, areaType.name)}
                              aria-expanded={areaTypeOpen}
                            >
                              <span
                                className={[styles.treeNodeCaret, areaTypeOpen ? styles.treeNodeCaretOpen : ""]
                                  .filter(Boolean)
                                  .join(" ")}
                                aria-hidden="true"
                              >
                                ▸
                              </span>
                              <i className="fa-solid fa-shapes" aria-hidden="true" />
                              {areaType.name}
                              <span className={styles.treeNodeMeta}>{areaType.totalActions}</span>
                            </button>

                            {areaTypeOpen &&
                              ZONES.map((zone) => (
                                <button
                                  key={zone}
                                  type="button"
                                  className={[
                                    styles.treeNodeRow,
                                    styles.treeNodeZone,
                                    selection.zoneName === zone && selection.areaTypeName === areaType.name
                                      ? styles.treeNodeActive
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={() => selectZone(building.name, areaType.name, zone)}
                                >
                                  <span className={styles.treeNodeCaretSpacer} aria-hidden="true" />
                                  <i className="fa-solid fa-location-dot" aria-hidden="true" />
                                  {zone}
                                </button>
                              ))}
                          </div>
                        );
                      })}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className={styles.content}>
          <p className={styles.breadcrumb}>
            {isSiteLevel ? (
              <span className={styles.breadcrumbCurrent}>{siteInfo.client} — {siteInfo.siteName}</span>
            ) : (
              <>
                {siteInfo.client} — {siteInfo.siteName} / {selection.buildingName}
                {selectedAreaType && <> / {selectedAreaType.name}</>}
                {selection.zoneName && (
                  <>
                    {" "}
                    / <span className={styles.breadcrumbCurrent}>{selection.zoneName}</span>
                  </>
                )}
              </>
            )}
          </p>
          <h1 className={styles.contentTitle}>
            {isSiteLevel
              ? `${siteInfo.client} — ${siteInfo.siteName}`
              : (selection.zoneName ?? selectedAreaType?.name ?? selectedBuilding!.name)}
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
                  {selectedAreaType ? (
                    <>
                      <Card theme="light" className={sharedStyles.statTile}>
                        <span className={sharedStyles.statTileLabel}>Serviced today</span>
                        <span className={sharedStyles.statTileValue}>{dayAreaServicedToday}</span>
                      </Card>
                      <Card theme="light" className={sharedStyles.statTile}>
                        <span className={sharedStyles.statTileLabel}>Expected services</span>
                        <span className={sharedStyles.statTileValue}>{selectedAreaType.expectedServices}</span>
                      </Card>
                      <Card theme="light" className={sharedStyles.statTile}>
                        <span className={sharedStyles.statTileLabel}>% complete</span>
                        <span className={sharedStyles.statTileValue}>{dayAreaPercent.toFixed(0)}%</span>
                      </Card>
                      <Card theme="light" className={sharedStyles.statTile}>
                        <span className={sharedStyles.statTileLabel}>Time captured</span>
                        <span className={sharedStyles.statTileValue}>{selectedAreaType.captured}</span>
                      </Card>
                      <Card theme="light" className={sharedStyles.statTile}>
                        <span className={sharedStyles.statTileLabel}>Avg. score</span>
                        <span className={sharedStyles.statTileValue}>{dayAreaScore.toFixed(2)}</span>
                      </Card>
                    </>
                  ) : (
                    <>
                      <Card theme="light" className={sharedStyles.statTile}>
                        <span className={sharedStyles.statTileLabel}>Total actions</span>
                        <span className={sharedStyles.statTileValue}>{selectedBuilding!.totalActions}</span>
                      </Card>
                      <Card theme="light" className={sharedStyles.statTile}>
                        <span className={sharedStyles.statTileLabel}>Coverage</span>
                        <span className={sharedStyles.statTileValue}>{dayBuildingCoverage}%</span>
                      </Card>
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
                  {selectedAreaType ? (
                    <Card theme="light" className={sharedStyles.treeCard}>
                      <div className={styles.flatTaskList}>
                        {selectedAreaType.tasks.map((task) => (
                          <div key={task.label} className={sharedStyles.taskRow}>
                            <span className={sharedStyles.taskLabel}>{task.label}</span>
                            <span className={sharedStyles.frequencyText}>{task.frequency}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : selection.buildingName === "Concourse D" ? (
                    <Card theme="light" className={sharedStyles.treeCard}>
                      {concourseDAreaTypes.map((at) => (
                        <button
                          key={at.name}
                          type="button"
                          className={sharedStyles.treeRow}
                          onClick={() => selectAreaType("Concourse D", at.name)}
                        >
                          <span className={sharedStyles.treeLabel}>{at.name}</span>
                          <span className={sharedStyles.treeMeta}>
                            <span>{at.tasks.length} contracted tasks</span>
                          </span>
                        </button>
                      ))}
                    </Card>
                  ) : (
                    <p className={styles.emptyNote}>
                      No detailed task list for this building yet — select Concourse D for the full example.
                    </p>
                  )}
                </div>

                {/* Evidence: verifications/audits, and who was working */}
                <div className={sharedStyles.section}>
                  <h2 className={sharedStyles.sectionTitle}>Evidence</h2>
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
                      <div className={sharedStyles.planToolbar}>
                        <select
                          className={sharedStyles.filterSelect}
                          value={taskTypeFilter}
                          onChange={(e) => setTaskTypeFilter(e.target.value)}
                          aria-label="Filter by task type"
                        >
                          <option value={ALL}>All task types</option>
                          {taskTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <select
                          className={sharedStyles.filterSelect}
                          value={shiftFilter}
                          onChange={(e) => setShiftFilter(e.target.value)}
                          aria-label="Filter by shift"
                        >
                          <option value={ALL}>All shifts</option>
                          {shifts.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <select
                          className={sharedStyles.filterSelect}
                          value={positionFilter}
                          onChange={(e) => setPositionFilter(e.target.value)}
                          aria-label="Filter by position"
                        >
                          <option value={ALL}>All positions</option>
                          {positions.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      {dayEvidenceActivity.length === 0 ? (
                        <p className={styles.emptyNote}>
                          No evidence available here — try clearing filters, or select an area type under Concourse D.
                        </p>
                      ) : (
                        <div className={sharedStyles.areaGrid}>
                          {dayEvidenceActivity.map((item, i) => (
                            <Card key={`${item.location}-${i}`} theme="light" className={sharedStyles.photoCard}>
                              <div className={sharedStyles.photoPlaceholder} aria-hidden="true">
                                PHOTO
                              </div>
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
                                {(item.position || item.shift) && (
                                  <span className={sharedStyles.photoMeta}>
                                    <span>{item.position}</span>
                                    <span>{item.shift}</span>
                                  </span>
                                )}
                                <span className={sharedStyles.photoMeta}>
                                  <span>{item.timeAgo}</span>
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <TeamList team={dayTeam} />
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Who was working here (or site-wide) on the selected day, and what
 * they did — a friendlier read on the Our Team / Service Times
 * screens than their dense per-metric-column table: name, role,
 * services done, average score, time worked, and when they were
 * last seen.
 */
function TeamList({ team }: { team: TeamMember[] }) {
  if (team.length === 0) {
    return <p className={styles.emptyNote}>No team roster available for this selection.</p>;
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
        <div className={styles.trendHeaderRow}>
          <span className={styles.trendValue}>{trendLast.toFixed(2)}</span>
          <span className={styles.trendCaption}>
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
        <div className={styles.trendAxis}>
          <span>{startLabel} ({trendFirst.toFixed(2)})</span>
          <span>{endLabel}</span>
        </div>
      </Card>
    </div>
  );
}
