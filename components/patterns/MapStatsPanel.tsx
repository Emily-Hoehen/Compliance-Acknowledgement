"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DonutRing, SegmentedDonutRing } from "../ui/Charts";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ExpandIcon, LocationDotIcon, SearchIcon, XmarkIcon } from "./icons";
import { MapShiftOverviewSections } from "./MapShiftOverviewSections";
import { MapShiftReportSections, type ZoomTarget } from "./MapShiftReportSections";
import { mapPageData, type DailyReportShift, type MapAreaTypeRow } from "../../lib/mapPageData";
import type { ManagerNote, ShiftAreaTypeDetail, ShiftReport } from "../../lib/mapShiftReportData";
import { statusForCounts, type AreaCoverageBreakdown, type AreaStatus } from "../../lib/mapAreaServiceData";
import { photoForAreaType } from "../../lib/sowImages";
import { scoreForDay } from "../../lib/sowData";
import styles from "./MapStatsPanel.module.css";

/** Short chip labels for the compact Quality Scores chips (Figma: "Verification"/"Internal"/"Customer", not the full label text). */
const QUALITY_SHORT_LABEL: Record<string, string> = {
  "AI Verification": "Verification",
  "Internal Audit": "Internal",
  "Customer Audit": "Customer",
};
/** Drops "Joint Audit" from the site-wide/shift qualityScores array (AI Verification/Internal Audit/Joint Audit/Customer Audit) — matches the Manager Shift Report Figma file's own 3-category Quality treatment used throughout this app. */
const QUALITY_DISPLAY_LABELS = ["AI Verification", "Internal Audit", "Customer Audit"];

/** Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 61:18402 — color bar + label + count(%) per status, in Not/Under/Fully/Over-Serviced order. */
const AREA_COVERAGE_ROWS: { key: keyof AreaCoverageBreakdown; status?: AreaStatus; label: string; color: string }[] = [
  { key: "notServicedCount", status: "missed", label: "Not serviced", color: "var(--color-danger-300)" },
  { key: "underServicedCount", status: "incomplete", label: "Under-serviced", color: "var(--color-warning-100)" },
  { key: "fullyServicedCount", status: "completed", label: "Fully Serviced", color: "var(--color-success-100)" },
  { key: "overServicedCount", status: "over-serviced", label: "Over Serviced", color: "var(--color-success-700)" },
  { key: "noFrequencyCount", label: "No Frequency", color: "var(--color-neutral-500)" },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "2-digit", year: "numeric" });

/** "1,138h 5m" → 68,285 (total minutes) — there's no raw per-area hours data to sum directly for a filtered Hours Captured stat, so it's derived by scaling this baseline label's own minutes by how much of the site's total completed/expected services the filtered areas represent (see scaledHoursStat below). */
function parseHoursLabelToMinutes(label: string): number {
  const match = label.replace(/,/g, "").match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/** 68,285 → "1,138h 5m" */
function formatMinutesToHoursLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours.toLocaleString()}h ${minutes}m`;
}

/** Scales the leading number in a "2,971 services"/"13 audits"-style count string (e.g. down to just a filtered subset), keeping whatever unit text follows it (singularized when the scaled count lands on exactly 1). */
function scaleCountLabel(label: string, ratio: number): string {
  const match = label.replace(/,/g, "").match(/^(\d+)(.*)$/);
  if (!match) return label;
  const scaled = Math.round(parseInt(match[1], 10) * ratio);
  const unit = scaled === 1 ? match[2].replace(/s$/, "") : match[2];
  return `${scaled.toLocaleString()}${unit}`;
}

type SortKey = "count" | "name" | "missed";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "count", label: "Most Areas" },
  { key: "name", label: "Name (A–Z)" },
];
/** Only meaningful once a shift is selected — the unfiltered site-wide Area Types list has no completed/expected data to rank by. */
const MISSED_SERVICES_SORT_OPTION: { key: SortKey; label: string } = { key: "missed", label: "Most Missed Services" };

type AreaTypeListItem = {
  key: string;
  name: string;
  photo?: string;
  caption: string;
  /** "X of Y expected services" — shown for every shift-filtered row (not just shortfalls), grey when met and red when not. Absent for the unfiltered site-wide list, which has no completed/expected data to report. */
  expectedServicesCaption?: string;
  expectedServicesMet?: boolean;
  score: number;
  status?: AreaStatus;
};

export type MapStatsPanelProps = {
  date: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  /** Real site-wide area types, aggregated from data/SOW_DeltaLGA.csv (see lib/mapPageData.ts's buildMapAreaTypes). */
  areaTypes: MapAreaTypeRow[];
  /** When set, shows a compact "{Shift} Shift ×" chip in the header — MapPage sets this once a shift is selected from MapShiftTimeline's band labels. */
  selectedShift?: DailyReportShift | null;
  onClearShiftFilter?: () => void;
  /** The selected shift's full drill-down data — its Shift Notes/Managers/stats/Area Types drive the shift-filtered overview, and MapShiftReportSections is one "View Full Shift Report" tap away. */
  shiftReport?: ShiftReport | null;
  onZoomToArea?: (area: ZoomTarget) => void;
  /** Set once a row in the shift-filtered Area Types list is clicked — swaps the overview for that type's own detail view (node 183:14544): its Services Completed/Quality Scores plus every one of its individual areas. */
  areaTypeDetail?: ShiftAreaTypeDetail | null;
  onSelectAreaType?: (name: string) => void;
  onClearAreaType?: () => void;
  /** Opens the full-page FullShiftReportModal for the currently selected shift — shown as a "Full Report" button next to the shift-filter chip whenever a shift is selected. */
  onOpenFullReport?: () => void;
  /** Which single status to narrow to — null shows everything (the default). Set from the Areas Serviced section's own filter rows below, and applied to every list here (Area Types, and the drilled-into Areas list) so the sidebar always matches the map's own status pins. */
  statusFilter: AreaStatus | null;
  onToggleStatusFilter: (status: AreaStatus) => void;
  /** Area-type name → status for the unfiltered (no-shift-selected) Area Types list, which has no per-row completed/expected counts of its own to derive status from directly. */
  areaTypeStatuses: Map<string, AreaStatus>;
  /** Not/Under/Fully/Over-Serviced area breakdown for the "Areas Serviced" section — scoped to whatever's currently in view (the whole day, or the selected shift). */
  areaCoverage: AreaCoverageBreakdown;
  /** Services Completed/Expected/percent summed across just the areas the active status filter narrows to (or the whole current scope, when nothing's filtered) — keeps the Services Completed stat card in sync with the status buttons. */
  filteredServicesStat: { completed: number; expected: number; percent: number };
  /** Services Completed/Expected summed across every area in the current scope, regardless of the filter — the denominator used to scale Hours Captured and Quality Scores down to the filtered subset. */
  totalServicesStat: { completed: number; expected: number };
};

/**
 * MapStatsPanel — the Map feature's left overlay card. Its unfiltered
 * state matches Figma fileKey SWFMjlBJ4u9vSrVaomRe12, node 180:10834
 * exactly (padding/gap/color/type per that frame's own values — see
 * the inline notes below anywhere a number looks unusual, e.g. 56px
 * vs 42px score chips). Only the date-nav + site-name header stays
 * fixed; everything below scrolls as one region in `.scrollBody` — a
 * deliberate departure from the source frame, which splits
 * stats/quality into their own non-scrolling block and scrolls only
 * the area list.
 *
 * Once a shift is selected (from MapShiftTimeline's band labels),
 * this panel switches to the shift-filtered
 * layout from node 182:13906: a compact "{Shift} Shift ×" chip in the
 * header (replacing the date-picker row's full-width filter bar),
 * then MapShiftOverviewSections (Shift Notes, Managers), then this
 * same Services Completed/Hours Captured/Quality Scores block —
 * scoped to the shift instead of the whole site, with Scheduled
 * Headcount/Actual Arrival/Total Absences rows inserted between Hours
 * Captured and Quality Scores — then the Area Types/Areas lists,
 * scoped to the shift's own area types, with a red "X of Y expected
 * services" caption on any area type that fell short. Tapping "View
 * Full Shift Report" swaps this whole shift-scoped view for
 * MapShiftReportSections' deeper Areas Missed/Hours/Scores/Issues/
 * Report-Its/Projects/Notes drill-down, with a "Shift Overview" link
 * back.
 */
export function MapStatsPanel({
  date,
  onPrevDay,
  onNextDay,
  areaTypes,
  selectedShift,
  onClearShiftFilter,
  shiftReport,
  onZoomToArea,
  areaTypeDetail,
  onSelectAreaType,
  onClearAreaType,
  onOpenFullReport,
  statusFilter,
  onToggleStatusFilter,
  areaTypeStatuses,
  areaCoverage,
  filteredServicesStat,
  totalServicesStat,
}: MapStatsPanelProps) {
  const { hoursCaptured, qualityScores } = mapPageData;

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [areaTypesExpanded, setAreaTypesExpanded] = useState(true);
  const [showFullReport, setShowFullReport] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  const [areaSortBy, setAreaSortBy] = useState<SortKey>("name");
  const [areaSortMenuOpen, setAreaSortMenuOpen] = useState(false);
  const [areasWithinTypeExpanded, setAreasWithinTypeExpanded] = useState(true);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const areaSortMenuRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const isShiftView = Boolean(selectedShift && shiftReport);
  const isAreaTypeDetailView = Boolean(isShiftView && !showFullReport && areaTypeDetail);

  useEffect(() => {
    if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0;
  }, [isAreaTypeDetailView, showFullReport, selectedShift?.key]);

  useEffect(() => {
    setShowFullReport(false);
    onClearAreaType?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShift?.key]);

  useEffect(() => {
    setAreaSearch("");
    setAreaSortBy("name");
  }, [areaTypeDetail?.name]);

  useEffect(() => {
    if (!sortMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setSortMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSortMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sortMenuOpen]);

  useEffect(() => {
    if (!areaSortMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (areaSortMenuRef.current && !areaSortMenuRef.current.contains(e.target as Node)) setAreaSortMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAreaSortMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [areaSortMenuOpen]);

  const query = search.trim().toLowerCase();

  const filteredAreaTypes = useMemo(() => {
    const filtered = areaTypes.filter((row) => {
      if (query && !row.name.toLowerCase().includes(query)) return false;
      const status = areaTypeStatuses.get(row.name);
      return !status || statusFilter === null || statusFilter === status;
    });
    return [...filtered].sort((a, b) => (sortBy === "name" ? a.name.localeCompare(b.name) : b.areaCount - a.areaCount));
  }, [areaTypes, query, sortBy, areaTypeStatuses, statusFilter]);

  const filteredShiftAreaTypes = useMemo(() => {
    if (!shiftReport) return [];
    const filtered = shiftReport.areaTypeSummaries.filter((row) => {
      if (query && !row.name.toLowerCase().includes(query)) return false;
      const status = statusForCounts(row.servicesCompletedCount, row.servicesExpectedCount);
      return statusFilter === null || statusFilter === status;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "missed") {
        return b.servicesExpectedCount - b.servicesCompletedCount - (a.servicesExpectedCount - a.servicesCompletedCount);
      }
      return b.areasTotal - a.areasTotal;
    });
  }, [shiftReport, query, sortBy, statusFilter]);

  const areaQuery = areaSearch.trim().toLowerCase();

  const filteredDetailAreas = useMemo(() => {
    if (!areaTypeDetail) return [];
    const filtered = areaTypeDetail.areas.filter((row) => {
      if (areaQuery && !row.displayName.toLowerCase().includes(areaQuery)) return false;
      const status = statusForCounts(row.servicesCompleted, row.servicesExpected);
      return statusFilter === null || statusFilter === status;
    });
    return [...filtered].sort((a, b) =>
      areaSortBy === "name" ? a.displayName.localeCompare(b.displayName) : b.servicesExpected - a.servicesExpected
    );
  }, [areaTypeDetail, areaQuery, areaSortBy, statusFilter]);

  /** Services Completed/Expected for the area-type detail view, scoped to just the areas the active status filter narrows to — falls back to the type's own full totals when nothing's filtered. */
  const detailServicesStat = useMemo(() => {
    const completed = filteredDetailAreas.reduce((sum, area) => sum + area.servicesCompleted, 0);
    const expected = filteredDetailAreas.reduce((sum, area) => sum + area.servicesExpected, 0);
    return { completed, expected, percent: expected > 0 ? Math.round((completed / expected) * 100) : 0 };
  }, [filteredDetailAreas]);

  const areaTypeListItems: AreaTypeListItem[] = isShiftView
    ? filteredShiftAreaTypes.map((row) => ({
        key: row.name,
        name: row.name,
        photo: row.photo,
        caption: `${row.areasServiced}/${row.areasTotal} areas serviced`,
        expectedServicesCaption: `${row.servicesCompletedCount} of ${row.servicesExpectedCount} expected services`,
        expectedServicesMet: row.servicesCompletedCount >= row.servicesExpectedCount,
        score: row.score,
        status: statusForCounts(row.servicesCompletedCount, row.servicesExpectedCount),
      }))
    : filteredAreaTypes.map((row) => ({
        key: row.name,
        name: row.name,
        photo: row.photo,
        caption: `${row.areaCount} areas`,
        score: row.score,
        status: areaTypeStatuses.get(row.name),
      }));

  /** Matches exactly what's rendered in the Area Types list below (post search AND post status filter), rather than the scope's raw total, so the heading never claims a count larger than what's actually shown. */
  const areaTypesTotalCount = areaTypeListItems.length;

  const statsServicesCompleted =
    isShiftView && statusFilter === null
      ? { value: shiftReport!.servicesCompletedCount.toLocaleString(), expectedLabel: `of ${shiftReport!.servicesExpectedCount.toLocaleString()} expected`, percent: shiftReport!.servicesPercent }
      : {
          value: filteredServicesStat.completed.toLocaleString(),
          expectedLabel: `of ${filteredServicesStat.expected.toLocaleString()} expected`,
          percent: filteredServicesStat.percent,
        };

  const baselineHoursCaptured = isShiftView
    ? { value: shiftReport!.hoursCapturedLabel, expectedLabel: `of ${shiftReport!.hoursPaidLabel} shift time`, percent: shiftReport!.hoursPercent }
    : { value: hoursCaptured.value, expectedLabel: hoursCaptured.expectedLabel, percent: hoursCaptured.percent };

  const baselineQualityScores = isShiftView ? shiftReport!.qualityScores : qualityScores;

  /**
   * Hours Captured and Quality Scores have no per-area breakdown of their own (hours are tracked per shift/site,
   * audits are sampled, not tied to a specific area's completion status) — so when a status filter is active,
   * both are derived by scaling the baseline (unfiltered) numbers by how much of the site's total completed/
   * expected services the filtered areas represent. A "Missed" filter (0 completed) correctly lands on 0h/0%;
   * an "Over-Serviced" filter (completed > expected) correctly pushes the percent above 100%, same as Services
   * Completed already does.
   */
  const completedRatio = totalServicesStat.completed > 0 ? filteredServicesStat.completed / totalServicesStat.completed : 0;
  const expectedRatio = totalServicesStat.expected > 0 ? filteredServicesStat.expected / totalServicesStat.expected : 0;

  const statsHoursCaptured =
    statusFilter === null
      ? baselineHoursCaptured
      : (() => {
          const capturedMinutes = parseHoursLabelToMinutes(baselineHoursCaptured.value) * completedRatio;
          const paidMinutes = parseHoursLabelToMinutes(baselineHoursCaptured.expectedLabel) * expectedRatio;
          return {
            value: formatMinutesToHoursLabel(capturedMinutes),
            expectedLabel: baselineHoursCaptured.expectedLabel.replace(/[\d,]+h\s*\d+m/, formatMinutesToHoursLabel(paidMinutes)),
            percent: paidMinutes > 0 ? Math.round((capturedMinutes / paidMinutes) * 100) : 0,
          };
        })();

  const statsQualityScores =
    statusFilter === null
      ? baselineQualityScores
      : baselineQualityScores.map((score) => ({ ...score, count: scaleCountLabel(score.count, completedRatio) }));

  const displayQualityScores = statsQualityScores.filter((score) => QUALITY_DISPLAY_LABELS.includes(score.label));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.datePicker}>
          <button type="button" className={styles.dateArrow} onClick={onPrevDay} aria-label="Previous day">
            <ChevronLeftIcon />
          </button>
          <span className={styles.dateLabel}>{dateFormatter.format(date)}</span>
          <button type="button" className={styles.dateArrow} onClick={onNextDay} aria-label="Next day">
            <ChevronRightIcon />
          </button>
        </div>
        {isAreaTypeDetailView ? (
          <div className={styles.areaTypeDetailHeaderRow}>
            <h2 className={styles.areaTypeDetailName}>{areaTypeDetail!.name}</h2>
            <button type="button" className={styles.areaTypeDetailClose} onClick={onClearAreaType} aria-label="Close area type details">
              <XmarkIcon />
            </button>
          </div>
        ) : (
          <h2 className={styles.siteName}>{mapPageData.siteName}</h2>
        )}

        {selectedShift && (
          <div className={styles.shiftFilterRow}>
            <div className={styles.shiftFilterChip}>
              <span className={styles.shiftFilterChipLabel}>{selectedShift.label} Shift</span>
              <button type="button" className={styles.shiftFilterChipClose} onClick={onClearShiftFilter} aria-label="Clear shift filter">
                <XmarkIcon />
              </button>
            </div>
            {onOpenFullReport && (
              <button type="button" className={styles.openFullReportButton} onClick={onOpenFullReport}>
                <ExpandIcon className={styles.openFullReportIcon} />
                Full Report
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.scrollBody} ref={scrollBodyRef}>
        {isShiftView && showFullReport ? (
          <>
            <button type="button" className={styles.backToOverviewLink} onClick={() => setShowFullReport(false)}>
              <ChevronLeftIcon className={styles.backToOverviewIcon} />
              Shift Overview
            </button>
            <MapShiftReportSections report={shiftReport!} onZoomToArea={onZoomToArea ?? (() => {})} />
          </>
        ) : isAreaTypeDetailView ? (
          <>
            <div className={styles.statsBlock}>
              <div className={styles.statRow}>
                <div className={styles.statText}>
                  <span className={styles.statLabel}>Services Completed</span>
                  <span className={styles.statValue}>
                    {(statusFilter !== null ? detailServicesStat.completed : areaTypeDetail!.servicesCompletedCount).toLocaleString()}
                  </span>
                  <span className={styles.statCaption}>
                    of {(statusFilter !== null ? detailServicesStat.expected : areaTypeDetail!.servicesExpectedCount).toLocaleString()} expected
                  </span>
                </div>
                <div className={styles.ring}>
                  <DonutRing
                    percent={statusFilter !== null ? detailServicesStat.percent : areaTypeDetail!.servicesPercent}
                    color="var(--color-datavis-purple-100)"
                    trackColor="var(--color-neutral-700)"
                    size={80}
                    strokeWidth={8}
                  />
                  <span className={styles.ringLabel}>{statusFilter !== null ? detailServicesStat.percent : areaTypeDetail!.servicesPercent}%</span>
                </div>
              </div>

              <div className={styles.hairline} />

              <span className={styles.qualityHeading}>Quality Scores</span>

              <QualityScoreChips scores={displayQualityScores} />
            </div>

            <div className={styles.hairline} />

            <div className={styles.areaListBlock}>
              <div className={styles.listSectionHeader}>
                <span className={styles.listHeading}>{filteredDetailAreas.length} Areas</span>
                <button
                  type="button"
                  className={styles.expandToggle}
                  onClick={() => setAreasWithinTypeExpanded((v) => !v)}
                  aria-expanded={areasWithinTypeExpanded}
                  aria-label={areasWithinTypeExpanded ? "Collapse areas" : "Expand areas"}
                >
                  <ExpandIcon className={styles.expandToggleIcon} />
                </button>
              </div>

              <div className={styles.searchSortRow}>
                <label className={styles.searchPill}>
                  <SearchIcon className={styles.searchPillIcon} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={areaSearch}
                    onChange={(e) => setAreaSearch(e.target.value)}
                    className={styles.searchPillInput}
                    aria-label="Search areas"
                  />
                </label>
                <div className={styles.sortWrap} ref={areaSortMenuRef}>
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={() => setAreaSortMenuOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={areaSortMenuOpen}
                  >
                    <span>Sort By</span>
                    <span className={styles.sortCaretSlot}>
                      <ChevronDownIcon className={styles.sortCaret} />
                    </span>
                  </button>
                  {areaSortMenuOpen && (
                    <ul className={styles.sortMenu} role="listbox">
                      {SORT_OPTIONS.map((option) => (
                        <li key={option.key}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={option.key === areaSortBy}
                            className={[styles.sortMenuItem, option.key === areaSortBy ? styles.sortMenuItemActive : ""].filter(Boolean).join(" ")}
                            onClick={() => {
                              setAreaSortBy(option.key);
                              setAreaSortMenuOpen(false);
                            }}
                          >
                            {option.label === "Most Areas" ? "Most Services" : option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {areasWithinTypeExpanded && (
                <div className={styles.list}>
                  {filteredDetailAreas.map((area) => {
                    const met = area.servicesCompleted >= area.servicesExpected;
                    const score = area.servicesCompleted > 0 ? scoreForDay(area.areaId, 0).toFixed(2) : "N/A";
                    const areaStatus = statusForCounts(area.servicesCompleted, area.servicesExpected);
                    return (
                      <div key={area.areaId} className={styles.detailAreaRow}>
                        <div className={styles.listRow}>
                          <div className={styles.rowThumb}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoForAreaType(areaTypeDetail!.name, area.areaId)} alt="" className={styles.rowThumbImage} />
                          </div>
                          <div className={styles.rowText}>
                            <span className={styles.rowName}>
                              <span className={styles.statusDot} data-status={areaStatus} aria-hidden="true" />
                              {area.displayName}
                            </span>
                            <span className={met ? styles.rowMeta : styles.rowShortfall}>
                              {area.servicesCompleted} of {area.servicesExpected} Expected Service{area.servicesExpected === 1 ? "" : "s"}
                            </span>
                          </div>
                          <span className={styles.rowScoreChip} data-tone={area.servicesCompleted > 0 ? "success" : "neutral"}>
                            {score}
                          </span>
                        </div>
                        {area.managerNote && <StatNoteCard note={area.managerNote} shiftLabel={selectedShift!.label} />}
                      </div>
                    );
                  })}
                  {filteredDetailAreas.length === 0 && (
                    <p className={styles.emptyState}>
                      {areaSearch ? <>No areas match &ldquo;{areaSearch}&rdquo;.</> : "No areas match the selected status filter."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {isShiftView && (
              <>
                <MapShiftOverviewSections report={shiftReport!} onViewFullReport={() => setShowFullReport(true)} />
                <div className={styles.hairline} />
              </>
            )}

            <div className={styles.statsBlock}>
              <AreaCoverageSection coverage={areaCoverage} statusFilter={statusFilter} onToggleStatusFilter={onToggleStatusFilter} />

              <div className={styles.hairline} />

              <div className={styles.statRow}>
                <div className={styles.statText}>
                  <span className={styles.statLabel}>Services Completed</span>
                  <span className={styles.statValue}>{statsServicesCompleted.value}</span>
                  <span className={styles.statCaption}>{statsServicesCompleted.expectedLabel}</span>
                </div>
                <div className={styles.ring}>
                  <DonutRing percent={statsServicesCompleted.percent} color="var(--color-datavis-purple-100)" trackColor="var(--color-neutral-700)" size={80} strokeWidth={8} />
                  <span className={styles.ringLabel}>{statsServicesCompleted.percent}%</span>
                </div>
                <ChevronRightIcon className={styles.statChevron} />
              </div>

              <div className={styles.hairline} />

              <div className={styles.statRow}>
                <div className={styles.statText}>
                  <span className={styles.statLabel}>Hours Captured</span>
                  <span className={styles.statValue}>{statsHoursCaptured.value}</span>
                  <span className={styles.statCaption}>{statsHoursCaptured.expectedLabel}</span>
                </div>
                <div className={styles.ring}>
                  <DonutRing percent={statsHoursCaptured.percent} color="var(--color-datavis-yellow-100)" trackColor="var(--color-neutral-700)" size={80} strokeWidth={8} />
                  <span className={styles.ringLabel}>{statsHoursCaptured.percent}%</span>
                </div>
                <ChevronRightIcon className={styles.statChevron} />
              </div>

              <div className={styles.hairline} />

              <span className={styles.qualityHeading}>Quality Scores</span>

              <QualityScoreChips scores={displayQualityScores} />
            </div>

            <div className={styles.hairline} />

            <div className={styles.areaListBlock}>
              <div className={styles.listSectionHeader}>
                <span className={styles.listHeading}>{areaTypesTotalCount} Area Types</span>
                <button
                  type="button"
                  className={styles.expandToggle}
                  onClick={() => setAreaTypesExpanded((v) => !v)}
                  aria-expanded={areaTypesExpanded}
                  aria-label={areaTypesExpanded ? "Collapse area types" : "Expand area types"}
                >
                  <ExpandIcon className={styles.expandToggleIcon} />
                </button>
              </div>

              <div className={styles.searchSortRow}>
                <label className={styles.searchPill}>
                  <SearchIcon className={styles.searchPillIcon} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={styles.searchPillInput}
                    aria-label="Search area types and areas"
                  />
                </label>
                <div className={styles.sortWrap} ref={sortMenuRef}>
                  <button type="button" className={styles.sortButton} onClick={() => setSortMenuOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={sortMenuOpen}>
                    <span>Sort By</span>
                    <span className={styles.sortCaretSlot}>
                      <ChevronDownIcon className={styles.sortCaret} />
                    </span>
                  </button>
                  {sortMenuOpen && (
                    <ul className={styles.sortMenu} role="listbox">
                      {(isShiftView ? [...SORT_OPTIONS, MISSED_SERVICES_SORT_OPTION] : SORT_OPTIONS).map((option) => (
                        <li key={option.key}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={option.key === sortBy}
                            className={[styles.sortMenuItem, option.key === sortBy ? styles.sortMenuItemActive : ""].filter(Boolean).join(" ")}
                            onClick={() => {
                              setSortBy(option.key);
                              setSortMenuOpen(false);
                            }}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {areaTypesExpanded && (
                <div className={styles.list}>
                  {areaTypeListItems.map((row) => (
                    <div
                      key={row.key}
                      className={[styles.listRow, isShiftView ? styles.listRowClickable : ""].filter(Boolean).join(" ")}
                      role={isShiftView ? "button" : undefined}
                      tabIndex={isShiftView ? 0 : undefined}
                      onClick={isShiftView ? () => onSelectAreaType?.(row.name) : undefined}
                      onKeyDown={
                        isShiftView
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectAreaType?.(row.name);
                              }
                            }
                          : undefined
                      }
                    >
                      <div className={styles.rowThumb}>
                        {row.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.photo} alt="" className={styles.rowThumbImage} />
                        ) : (
                          <LocationDotIcon className={styles.rowThumbFallbackIcon} />
                        )}
                      </div>
                      <div className={styles.rowText}>
                        <span className={styles.rowName}>
                          {row.status && <span className={styles.statusDot} data-status={row.status} aria-hidden="true" />}
                          {row.name}
                        </span>
                        <span className={styles.rowMeta}>{row.caption}</span>
                        {row.expectedServicesCaption && (
                          <span className={row.expectedServicesMet ? styles.rowMeta : styles.rowShortfall}>{row.expectedServicesCaption}</span>
                        )}
                      </div>
                      <span className={styles.rowScoreChip}>{row.score.toFixed(2)}</span>
                    </div>
                  ))}
                  {areaTypeListItems.length === 0 && (
                    <p className={styles.emptyState}>
                      {search ? <>No area types match &ldquo;{search}&rdquo;.</> : "No area types match the selected status filter."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** A handoff note below one of the shift-filtered stats widgets (Services Completed/Hours Captured/Quality Scores) — same bespoke card language as MapShiftOverviewSections' Shift Notes card (no tag chip, 14px/22px body copy), just without the "View Full Shift Report" link since there's no further drill-down to point to from here. Also reused for the area-type detail view's per-area shortfall notes. */
function StatNoteCard({ note, shiftLabel }: { note: ManagerNote; shiftLabel?: string }) {
  return (
    <div className={styles.statNoteCard}>
      {note.tags[0] && (
        <span className={styles.statNoteTag} data-tag={note.tags[0]}>
          {note.tags[0]}
        </span>
      )}
      <p className={styles.statNoteText}>{note.text}</p>
      <div className={styles.statNoteAuthorRow}>
        {note.author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={note.author.avatar} alt="" className={styles.statNoteAvatar} />
        ) : (
          <span className={styles.statNoteAvatarFallback} aria-hidden="true" />
        )}
        <div className={styles.statNoteAuthorInfo}>
          <span className={styles.statNoteAuthorName}>{note.author.name}</span>
          <span className={styles.statNoteAuthorShift}>{shiftLabel ? `${note.author.position} | ${shiftLabel}` : note.author.position}</span>
        </div>
        <span className={styles.statNoteTime}>{note.timestamp}</span>
      </div>
    </div>
  );
}

/** The sidebar's "Areas Serviced" stat — a segmented ring + headline count/percent, matching the Services Completed/Hours Captured rows below it, plus the Not/Under/Fully/Over-Serviced breakdown as its own row of filter buttons (moved in from the map's old floating status-filter stack, restyled to Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 61:18402). */
function AreaCoverageSection({
  coverage,
  statusFilter,
  onToggleStatusFilter,
}: {
  coverage: AreaCoverageBreakdown;
  statusFilter: AreaStatus | null;
  onToggleStatusFilter: (status: AreaStatus) => void;
}) {
  return (
    <>
      <div className={styles.statRow}>
        <div className={styles.statText}>
          <span className={styles.statLabel}>Areas Serviced</span>
          <span className={styles.statValue}>{coverage.servicedCount.toLocaleString()}</span>
          <span className={styles.statCaption}>of {coverage.totalAreas.toLocaleString()} total areas</span>
        </div>
        <div className={styles.ring}>
          <SegmentedDonutRing
            size={80}
            strokeWidth={8}
            trackColor="var(--color-neutral-700)"
            segments={AREA_COVERAGE_ROWS.map((row) => ({ value: coverage[row.key] as number, color: row.color }))}
          />
          <span className={styles.ringLabel}>{coverage.servicedPercent}%</span>
        </div>
        <ChevronRightIcon className={styles.statChevron} />
      </div>

      <div className={styles.areaCoverageRows}>
        {AREA_COVERAGE_ROWS.map((row) => {
          const count = coverage[row.key] as number;
          const percent = coverage.totalAreas > 0 ? Math.round((count / coverage.totalAreas) * 100) : 0;
          const rowContent = (
            <>
              <span className={styles.areaCoverageBar} style={{ backgroundColor: row.color }} />
              <span className={styles.areaCoverageLabel}>{row.label}</span>
              <span className={styles.areaCoverageCount}>
                {count.toLocaleString()} areas <span className={styles.areaCoveragePercent}>({percent}%)</span>
              </span>
            </>
          );
          if (!row.status) {
            // No Frequency isn't a real AreaStatus — nothing to filter the map pins/list to, so it's an informational row only.
            return (
              <div key={row.key} className={styles.areaCoverageRow}>
                {rowContent}
              </div>
            );
          }
          return (
            <button
              key={row.key}
              type="button"
              className={styles.areaCoverageRow}
              data-dimmed={statusFilter !== null && statusFilter !== row.status}
              aria-pressed={statusFilter === row.status}
              onClick={() => onToggleStatusFilter(row.status!)}
            >
              {rowContent}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Three equal-width mint chips (value + short label both inside), matching Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 61:18402 — reused for both the unfiltered/shift-filtered stats block and the area-type detail view. */
function QualityScoreChips({ scores }: { scores: { label: string; value: string; tone: "success" | "neutral" }[] }) {
  return (
    <div className={styles.qualityChipRow}>
      {scores.map((score) => (
        <div key={score.label} className={styles.qualityChip} data-tone={score.tone}>
          <span className={styles.qualityChipValue}>{score.value}</span>
          <span className={styles.qualityChipLabel}>{QUALITY_SHORT_LABEL[score.label] ?? score.label}</span>
        </div>
      ))}
    </div>
  );
}
