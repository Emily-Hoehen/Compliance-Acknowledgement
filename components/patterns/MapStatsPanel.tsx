"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DonutRing } from "../ui/Charts";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ExpandIcon, LocationDotIcon, SearchIcon, XmarkIcon } from "./icons";
import { MapShiftOverviewSections } from "./MapShiftOverviewSections";
import { MapShiftReportSections, type ZoomTarget } from "./MapShiftReportSections";
import { mapPageData, shiftStatNotes, siteOverviewAttendance, type DailyReportShift, type MapAreaTypeRow, type ShiftStatNote } from "../../lib/mapPageData";
import type { ShiftAreaTypeDetail, ShiftReport } from "../../lib/mapShiftReportData";
import { photoForAreaType } from "../../lib/sowImages";
import { scoreForDay } from "../../lib/sowData";
import styles from "./MapStatsPanel.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "2-digit", year: "numeric" });

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
}: MapStatsPanelProps) {
  const { servicesCompleted, hoursCaptured, qualityScores } = mapPageData;

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
    const filtered = query ? areaTypes.filter((row) => row.name.toLowerCase().includes(query)) : areaTypes;
    return [...filtered].sort((a, b) => (sortBy === "name" ? a.name.localeCompare(b.name) : b.areaCount - a.areaCount));
  }, [areaTypes, query, sortBy]);

  const filteredShiftAreaTypes = useMemo(() => {
    if (!shiftReport) return [];
    const filtered = query ? shiftReport.areaTypeSummaries.filter((row) => row.name.toLowerCase().includes(query)) : shiftReport.areaTypeSummaries;
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "missed") {
        return b.servicesExpectedCount - b.servicesCompletedCount - (a.servicesExpectedCount - a.servicesCompletedCount);
      }
      return b.areasTotal - a.areasTotal;
    });
  }, [shiftReport, query, sortBy]);

  const areaQuery = areaSearch.trim().toLowerCase();

  const filteredDetailAreas = useMemo(() => {
    if (!areaTypeDetail) return [];
    const filtered = areaQuery ? areaTypeDetail.areas.filter((row) => row.displayName.toLowerCase().includes(areaQuery)) : areaTypeDetail.areas;
    return [...filtered].sort((a, b) =>
      areaSortBy === "name" ? a.displayName.localeCompare(b.displayName) : b.servicesExpected - a.servicesExpected
    );
  }, [areaTypeDetail, areaQuery, areaSortBy]);

  const areaTypeListItems: AreaTypeListItem[] = isShiftView
    ? filteredShiftAreaTypes.map((row) => ({
        key: row.name,
        name: row.name,
        photo: row.photo,
        caption: `${row.areasServiced}/${row.areasTotal} areas serviced`,
        expectedServicesCaption: `${row.servicesCompletedCount} of ${row.servicesExpectedCount} expected services`,
        expectedServicesMet: row.servicesCompletedCount >= row.servicesExpectedCount,
        score: row.score,
      }))
    : filteredAreaTypes.map((row) => ({ key: row.name, name: row.name, photo: row.photo, caption: `${row.areaCount} areas`, score: row.score }));

  const areaTypesTotalCount = isShiftView ? (shiftReport?.areaTypeSummaries.length ?? 0) : areaTypes.length;

  const statsServicesCompleted = isShiftView
    ? { value: shiftReport!.servicesCompletedCount.toLocaleString(), expectedLabel: `of ${shiftReport!.servicesExpectedCount.toLocaleString()} expected`, percent: shiftReport!.servicesPercent }
    : { value: servicesCompleted.value.toLocaleString(), expectedLabel: servicesCompleted.expectedLabel, percent: servicesCompleted.percent };

  const statsHoursCaptured = isShiftView
    ? { value: shiftReport!.hoursCapturedLabel, expectedLabel: `of ${shiftReport!.hoursPaidLabel} shift time`, percent: shiftReport!.hoursPercent }
    : { value: hoursCaptured.value, expectedLabel: hoursCaptured.expectedLabel, percent: hoursCaptured.percent };

  const statsQualityScores = isShiftView ? shiftReport!.qualityScores : qualityScores;

  const attendance = isShiftView
    ? {
        scheduledHeadcount: shiftReport!.scheduledHeadcount,
        actualArrival: shiftReport!.actualArrival,
        totalAbsences: shiftReport!.totalAbsences,
        noCallNoShowCount: shiftReport!.noCallNoShowCount,
        callOutsCount: shiftReport!.callOutsCount,
      }
    : siteOverviewAttendance;

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
                  <span className={styles.statValue}>{areaTypeDetail!.servicesCompletedCount.toLocaleString()}</span>
                  <span className={styles.statCaption}>of {areaTypeDetail!.servicesExpectedCount.toLocaleString()} expected</span>
                </div>
                <div className={styles.ring}>
                  <DonutRing percent={areaTypeDetail!.servicesPercent} color="var(--color-datavis-purple-100)" trackColor="var(--color-neutral-700)" size={80} strokeWidth={8} />
                  <span className={styles.ringLabel}>{areaTypeDetail!.servicesPercent}%</span>
                </div>
              </div>

              <div className={styles.hairline} />

              <span className={styles.qualityHeading}>Quality Scores</span>

              {statsQualityScores.map((score) => (
                <div key={score.label} className={styles.qualityRow}>
                  <div className={styles.qualityText}>
                    <span className={styles.qualityLabel}>{score.label}</span>
                    <span className={styles.qualityCount}>{score.count}</span>
                  </div>
                  <span className={styles.qualityChip} data-tone={score.tone}>
                    {score.value}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.hairline} />

            <div className={styles.areaListBlock}>
              <div className={styles.listSectionHeader}>
                <span className={styles.listHeading}>{areaTypeDetail!.areasTotal} Areas</span>
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
                    return (
                      <div key={area.areaId} className={styles.detailAreaRow}>
                        <div className={styles.listRow}>
                          <div className={styles.rowThumb}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoForAreaType(areaTypeDetail!.name, area.areaId)} alt="" className={styles.rowThumbImage} />
                          </div>
                          <div className={styles.rowText}>
                            <span className={styles.rowName}>{area.displayName}</span>
                            {met ? (
                              <span className={styles.rowMeta}>
                                {area.servicesCompleted} of {area.servicesExpected} Expected Service
                              </span>
                            ) : (
                              <span className={styles.rowShortfall}>
                                {area.servicesCompleted} of {area.servicesExpected} expected
                              </span>
                            )}
                          </div>
                          <span className={styles.rowScoreChip} data-tone={area.servicesCompleted > 0 ? "success" : "neutral"}>
                            {score}
                          </span>
                        </div>
                        {area.managerNote && <StatNoteCard note={area.managerNote} />}
                      </div>
                    );
                  })}
                  {filteredDetailAreas.length === 0 && <p className={styles.emptyState}>No areas match &ldquo;{areaSearch}&rdquo;.</p>}
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
              </div>

              {isShiftView && <StatNoteCard note={shiftStatNotes.servicesCompleted} />}

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
              </div>

              <div className={styles.attendanceBlock}>
                <div className={styles.attendanceRow}>
                  <span className={styles.attendanceLabel}>Scheduled Headcount</span>
                  <span className={styles.attendanceValue}>{attendance.scheduledHeadcount}</span>
                </div>
                <div className={styles.attendanceRow}>
                  <span className={styles.attendanceLabel}>Actual Arrival</span>
                  <span className={styles.attendanceValue}>{attendance.actualArrival}</span>
                </div>
                <div className={styles.attendanceRow}>
                  <span className={styles.attendanceLabel}>Total Absences</span>
                  <span className={styles.attendanceValue}>{attendance.totalAbsences}</span>
                </div>
                <div className={styles.attendanceSubRow}>
                  <span className={styles.attendanceSubLabel}>No Call/No Show</span>
                  <span className={styles.attendanceSubValue}>{attendance.noCallNoShowCount}</span>
                </div>
                <div className={styles.attendanceSubRow}>
                  <span className={styles.attendanceSubLabel}>Call Outs</span>
                  <span className={styles.attendanceSubValue}>{attendance.callOutsCount}</span>
                </div>
              </div>

              {isShiftView && <StatNoteCard note={shiftStatNotes.hoursCaptured} />}

              <div className={styles.hairline} />

              <span className={styles.qualityHeading}>Quality Scores</span>

              {statsQualityScores.map((score) => (
                <div key={score.label} className={styles.qualityRow}>
                  <div className={styles.qualityText}>
                    <span className={styles.qualityLabel}>{score.label}</span>
                    <span className={styles.qualityCount}>{score.count}</span>
                  </div>
                  <span className={styles.qualityChip} data-tone={score.tone}>
                    {score.value}
                  </span>
                </div>
              ))}

              {isShiftView && <StatNoteCard note={shiftStatNotes.qualityScores} />}
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
                        <span className={styles.rowName}>{row.name}</span>
                        <span className={styles.rowMeta}>{row.caption}</span>
                        {row.expectedServicesCaption && (
                          <span className={row.expectedServicesMet ? styles.rowMeta : styles.rowShortfall}>{row.expectedServicesCaption}</span>
                        )}
                      </div>
                      <span className={styles.rowScoreChip}>{row.score.toFixed(2)}</span>
                    </div>
                  ))}
                  {areaTypeListItems.length === 0 && <p className={styles.emptyState}>No area types match &ldquo;{search}&rdquo;.</p>}
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
function StatNoteCard({ note }: { note: ShiftStatNote & { tag?: string } }) {
  return (
    <div className={styles.statNoteCard}>
      {note.tag && (
        <span className={styles.statNoteTag} data-tag={note.tag}>
          {note.tag}
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
        <span className={styles.statNoteAuthorName}>{note.author.name}</span>
        <span className={styles.statNoteTime}>{note.timestamp}</span>
      </div>
    </div>
  );
}
