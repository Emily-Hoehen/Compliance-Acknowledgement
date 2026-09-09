"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DonutRing } from "../ui/Charts";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ExpandIcon, LocationDotIcon, SearchIcon, XmarkIcon } from "./icons";
import { mapPageData, type DailyReportShift, type MapAreaRow, type MapAreaTypeRow } from "../../lib/mapPageData";
import styles from "./MapStatsPanel.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "2-digit", year: "numeric" });

type SortKey = "count" | "name";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "count", label: "Most Areas" },
  { key: "name", label: "Name (A–Z)" },
];

export type MapStatsPanelProps = {
  date: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  /** Real site-wide area types, aggregated from data/SOW_DeltaLGA.csv (see lib/mapPageData.ts's buildMapAreaTypes). */
  areaTypes: MapAreaTypeRow[];
  /** Every real area (714 site-wide) — only rendered once the "Areas" section is expanded, since the full list is large. */
  areas: MapAreaRow[];
  /** When set, shows a "Filtered to {shift}" chip below the header — MapPage sets this once a shift is selected from MapDailyReportPanel. */
  selectedShift?: DailyReportShift | null;
  onClearShiftFilter?: () => void;
};

/**
 * MapStatsPanel — the Map feature's left overlay card, matching
 * Figma fileKey SWFMjlBJ4u9vSrVaomRe12, node 180:10834 exactly
 * (padding/gap/color/type per that frame's own values — see the
 * inline notes below anywhere a number looks unusual, e.g. 56px vs
 * 42px score chips). Only the date-nav + site-name header stays
 * fixed; everything below (stats, Quality Scores, Area Types, Areas)
 * scrolls as one region in `.scrollBody` — a deliberate departure
 * from the source frame, which splits stats/quality into their own
 * non-scrolling block and scrolls only the area list.
 */
export function MapStatsPanel({ date, onPrevDay, onNextDay, areaTypes, areas, selectedShift, onClearShiftFilter }: MapStatsPanelProps) {
  const { servicesCompleted, hoursCaptured, qualityScores } = mapPageData;

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("count");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [areaTypesExpanded, setAreaTypesExpanded] = useState(true);
  const [areasExpanded, setAreasExpanded] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

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

  const query = search.trim().toLowerCase();

  const filteredAreaTypes = useMemo(() => {
    const filtered = query ? areaTypes.filter((row) => row.name.toLowerCase().includes(query)) : areaTypes;
    return [...filtered].sort((a, b) => (sortBy === "name" ? a.name.localeCompare(b.name) : b.areaCount - a.areaCount));
  }, [areaTypes, query, sortBy]);

  const filteredAreas = useMemo(() => {
    if (!query) return areas;
    return areas.filter((row) => row.displayName.toLowerCase().includes(query) || row.areaTypeName.toLowerCase().includes(query));
  }, [areas, query]);

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
        <h2 className={styles.siteName}>{mapPageData.siteName}</h2>
      </div>

      {selectedShift && (
        <div className={styles.shiftFilterBar}>
          <span className={styles.shiftFilterLabel}>
            Filtered to <strong>{selectedShift.label} Shift</strong>
          </span>
          <button type="button" className={styles.shiftFilterClear} onClick={onClearShiftFilter} aria-label="Clear shift filter">
            <XmarkIcon />
          </button>
        </div>
      )}

      <div className={styles.scrollBody}>
        <div className={styles.statsBlock}>
          <div className={styles.statRow}>
            <div className={styles.statText}>
              <span className={styles.statLabel}>Services Completed</span>
              <span className={styles.statValue}>{servicesCompleted.value.toLocaleString()}</span>
              <span className={styles.statCaption}>{servicesCompleted.expectedLabel}</span>
            </div>
            <div className={styles.ring}>
              <DonutRing percent={servicesCompleted.percent} color="var(--color-datavis-purple-100)" trackColor="var(--color-neutral-700)" size={60} strokeWidth={6} />
              <span className={styles.ringLabel}>{servicesCompleted.percent}%</span>
            </div>
          </div>

          <div className={styles.hairline} />

          <div className={styles.statRow}>
            <div className={styles.statText}>
              <span className={styles.statLabel}>Hours Captured</span>
              <span className={styles.statValue}>{hoursCaptured.value}</span>
              <span className={styles.statCaption}>{hoursCaptured.expectedLabel}</span>
            </div>
            <div className={styles.ring}>
              <DonutRing percent={hoursCaptured.percent} color="var(--color-datavis-yellow-100)" trackColor="var(--color-neutral-700)" size={60} strokeWidth={6} />
              <span className={styles.ringLabel}>{hoursCaptured.percent}%</span>
            </div>
          </div>

          <div className={styles.hairline} />

          <span className={styles.qualityHeading}>Quality Scores</span>

          {qualityScores.map((score) => (
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
            <span className={styles.listHeading}>{areaTypes.length} Area Types</span>
            <button type="button" className={styles.expandToggle} onClick={() => setAreaTypesExpanded((v) => !v)} aria-expanded={areaTypesExpanded}>
              <span>{areaTypesExpanded ? "Collapse" : "Expand"}</span>
              <ExpandIcon className={styles.expandToggleIcon} />
            </button>
          </div>

          <div className={styles.searchSortRow}>
            <label className={styles.searchPill}>
              <SearchIcon className={styles.searchPillIcon} />
              <input
                type="text"
                placeholder="search"
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
                  {SORT_OPTIONS.map((option) => (
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
              {filteredAreaTypes.map((row) => (
                <div key={row.name} className={styles.listRow}>
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
                    <span className={styles.rowMeta}>{row.areaCount} areas</span>
                  </div>
                  <span className={styles.rowScoreChip}>{row.score.toFixed(2)}</span>
                </div>
              ))}
              {filteredAreaTypes.length === 0 && <p className={styles.emptyState}>No area types match &ldquo;{search}&rdquo;.</p>}
            </div>
          )}

          <div className={styles.listSectionHeader}>
            <span className={styles.listHeading}>Areas</span>
            <button type="button" className={styles.expandToggle} onClick={() => setAreasExpanded((v) => !v)} aria-expanded={areasExpanded}>
              <span>{areasExpanded ? "Collapse" : "Expand"}</span>
              <ExpandIcon className={styles.expandToggleIcon} />
            </button>
          </div>

          {areasExpanded && (
            <div className={styles.list}>
              {filteredAreas.map((row) => (
                <div key={row.areaId} className={styles.listRow}>
                  <div className={styles.rowThumb}>
                    {row.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.photo} alt="" className={styles.rowThumbImage} />
                    ) : (
                      <LocationDotIcon className={styles.rowThumbFallbackIcon} />
                    )}
                  </div>
                  <div className={styles.rowText}>
                    <span className={styles.rowName}>{row.displayName}</span>
                    <span className={styles.rowMeta}>
                      {row.building} · Floor {row.floor}
                    </span>
                  </div>
                </div>
              ))}
              {filteredAreas.length === 0 && <p className={styles.emptyState}>No areas match &ldquo;{search}&rdquo;.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
