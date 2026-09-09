"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseIcon, ChevronDownIcon, LayerGroupIcon, LocationDotIcon, PinIcon, SearchIcon, XmarkIcon } from "./icons";
import { MapDailyReportPanel } from "./MapDailyReportPanel";
import { MapShiftReportPanel, type ZoomTarget } from "./MapShiftReportPanel";
import { MapShiftTimeline } from "./MapShiftTimeline";
import { MapStatsPanel } from "./MapStatsPanel";
import { buildDailyReport, buildMapAreaTypes, buildMapAreas, mapPageData, type DailyReportShift } from "../../lib/mapPageData";
import { buildShiftReport } from "../../lib/mapShiftReportData";
import type { ContractBuilding } from "../../lib/sowContract";
import styles from "./MapPage.module.css";

const ANCHOR_DATE = new Date(2026, 8, 8);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Deterministic pseudo-position for an area on the map backdrop (28–78% x, 38–73% y — roughly the terminal footprint in public/map-clean.png), since real per-area geo-coordinates aren't part of the SOW export. */
function pseudoPositionForArea(areaId: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < areaId.length; i++) hash = (hash * 31 + areaId.charCodeAt(i)) % 9973;
  return { x: 28 + (hash % 500) / 10, y: 38 + ((Math.floor(hash / 8)) % 350) / 10 };
}

export type MapPageProps = {
  contractBuildings: ContractBuilding[];
};

/**
 * MapPage — site-wide performance view over a map backdrop.
 * No Figma source: built from a reference screenshot of an internal
 * Mapbox dashboard. Rather than wiring up a real Mapbox instance
 * (API key, tile styling, 3D building layer), the backdrop is a
 * static image — this project's other "map" surfaces
 * (SitePerformanceSection, ManagerAppClockSheet) take the same
 * static-image approach.
 *
 * public/map-clean.png is derived from public/map.png (the original
 * reference screenshot, which has the whole dashboard UI baked into
 * its pixels, chrome and all) with the top bar, search/area-type
 * row, and bottom timeline strip painted out — this page rebuilds
 * those as real interactive elements, so the raw screenshot can't be
 * used directly as a backdrop without doubling every control.
 */
export function MapPage({ contractBuildings }: MapPageProps) {
  const [date, setDate] = useState(() => new Date(ANCHOR_DATE));
  const [searchValue, setSearchValue] = useState("");
  const [areaType, setAreaType] = useState(mapPageData.areaTypeOptions[0]);
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const [selectedShiftKey, setSelectedShiftKey] = useState<DailyReportShift["key"] | null>(null);
  const [zoomTarget, setZoomTarget] = useState<ZoomTarget | null>(null);
  const areaMenuRef = useRef<HTMLDivElement>(null);

  const dayOffset = Math.round((ANCHOR_DATE.getTime() - date.getTime()) / MS_PER_DAY);
  const mapAreaTypes = useMemo(() => buildMapAreaTypes(contractBuildings, dayOffset), [contractBuildings, dayOffset]);
  const mapAreas = useMemo(() => buildMapAreas(contractBuildings), [contractBuildings]);
  const dailyReport = useMemo(() => buildDailyReport(dayOffset, contractBuildings), [dayOffset, contractBuildings]);

  const selectedShift = selectedShiftKey ? (dailyReport.shifts.find((s) => s.key === selectedShiftKey) ?? null) : null;
  const shiftReport = useMemo(
    () => (selectedShift ? buildShiftReport(selectedShift, dayOffset, contractBuildings) : null),
    [selectedShift, dayOffset, contractBuildings]
  );
  const zoomPosition = zoomTarget ? pseudoPositionForArea(zoomTarget.areaId) : null;

  useEffect(() => {
    if (!areaMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (areaMenuRef.current && !areaMenuRef.current.contains(e.target as Node)) {
        setAreaMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAreaMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [areaMenuOpen]);

  function shiftDay(delta: number) {
    setDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  function handleSelectShift(key: DailyReportShift["key"]) {
    setSelectedShiftKey(key);
    setZoomTarget(null);
  }

  function handleBackToDaily() {
    setSelectedShiftKey(null);
    setZoomTarget(null);
  }

  return (
    <div className={styles.page}>
      <div
        className={styles.backdropWrap}
        style={zoomPosition ? { transform: "scale(1.6)", transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : undefined}
      >
        <img src="/map-clean.png" alt="" className={styles.backdrop} />
        {zoomTarget && zoomPosition && (
          <div className={styles.zoomPin} style={{ left: `${zoomPosition.x}%`, top: `${zoomPosition.y}%` }}>
            <LocationDotIcon className={styles.zoomPinIcon} />
            <span className={styles.zoomPinLabel}>{zoomTarget.displayName}</span>
          </div>
        )}
      </div>

      {zoomTarget && (
        <button type="button" className={styles.zoomResetButton} onClick={() => setZoomTarget(null)}>
          <XmarkIcon />
          Reset view
        </button>
      )}

      <header className={styles.topBar}>
        <img src="/brand/4insite-logo-dark.svg" alt="4Insite" className={styles.logo} width={32} height={32} />
        <button type="button" className={styles.chip}>
          <span className={styles.chipIcon}>
            <BriefcaseIcon />
          </span>
          <span>SBM</span>
        </button>
        <button type="button" className={styles.chip}>
          <span className={styles.chipIcon}>
            <PinIcon />
          </span>
          <span>Delta</span>
          <span className={styles.chipDivider} />
          <span>{mapPageData.siteName}</span>
        </button>
      </header>

      <div className={styles.controlBar}>
        <label className={styles.searchField}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search area types"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={styles.searchInput}
            aria-label="Search area types"
          />
        </label>

        <div className={styles.areaMenuWrap} ref={areaMenuRef}>
          <button
            type="button"
            className={styles.areaMenuButton}
            onClick={() => setAreaMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={areaMenuOpen}
          >
            <LayerGroupIcon className={styles.areaMenuIcon} />
            <span>{areaType}</span>
            <ChevronDownIcon className={styles.areaMenuCaret} />
          </button>
          {areaMenuOpen && (
            <ul className={styles.areaMenuList} role="listbox">
              {mapPageData.areaTypeOptions.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option === areaType}
                    className={[styles.areaMenuItem, option === areaType ? styles.areaMenuItemActive : ""].filter(Boolean).join(" ")}
                    onClick={() => {
                      setAreaType(option);
                      setAreaMenuOpen(false);
                    }}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.statsPanelWrap}>
        <MapStatsPanel
          date={date}
          onPrevDay={() => shiftDay(-1)}
          onNextDay={() => shiftDay(1)}
          areaTypes={mapAreaTypes}
          areas={mapAreas}
          selectedShift={selectedShift}
          onClearShiftFilter={handleBackToDaily}
        />
      </div>

      <div className={styles.dailyReportWrap}>
        {shiftReport ? (
          <MapShiftReportPanel report={shiftReport} onBack={handleBackToDaily} onZoomToArea={setZoomTarget} />
        ) : (
          <MapDailyReportPanel
            siteManager={dailyReport.siteManager}
            siteManagerSignOff={dailyReport.siteManagerSignOff}
            aiOverview={dailyReport.aiOverview}
            shifts={dailyReport.shifts}
            onSelectShift={handleSelectShift}
          />
        )}
      </div>

      <footer className={styles.footer}>
        <MapShiftTimeline selectedShiftKey={selectedShiftKey} />
      </footer>
    </div>
  );
}
