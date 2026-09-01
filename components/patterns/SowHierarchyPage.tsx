"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SowNav } from "./SowNav";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { ButtonGroup, type ButtonGroupOption } from "../ui/ButtonGroup";
import { DsSelect } from "../ui/Select";
import { Modal } from "../ui/Modal";
import { Accordion, type AccordionItemData } from "../ui/Accordion";
import { Sparkline, DonutRing } from "../ui/Charts";
import { SearchIcon, CaretLeftIcon, CaretRightIcon } from "./icons";
import { siteInfo } from "../../lib/homeDashboardData";
import {
  siteContractStats,
  buildings,
  verificationsForArea,
  auditsForArea,
  areaTypeFromContract,
  facilitySummary,
  verificationToActivity,
  auditToActivity,
  applyDayVariationToActivity,
  scoreForDay,
  scaleForDay,
  hoursCapturedForNode,
  auditSummaryForNode,
  hashSeed,
  capturedDurationLabel,
  serviceTimingForSeed,
  type VerificationEvent,
  type AuditEvent,
  type ActivityItem,
  type ActivityKind,
} from "../../lib/sowData";
import {
  findContractAreaType,
  isTaskDueForPeriod,
  type ContractBuilding,
  type ContractAreaType,
  type ContractArea,
  type ContractTaskDef,
} from "../../lib/sowContract";
import { photoForAreaType } from "../../lib/sowImages";
import type { RosterPerson } from "../../lib/csv";
import sharedStyles from "./SowPage.module.css";
import styles from "./SowHierarchyPage.module.css";

export type SowHierarchyPageProps = {
  associates: RosterPerson[];
  managers: RosterPerson[];
  contractBuildings: ContractBuilding[];
};

const ALL = "all";

type Selection = {
  buildingName: string | null; // null = site level (nothing under it selected) OR a cross-building area type — see crossBuilding
  areaTypeName: string | null;
  areaId: string | null; // a real area's area_id, from the leaf level of the tree
  /** True when areaTypeName was picked via its "Group by: Area Type" group header — the whole area type across every building that offers it, rather than one building's instance of it. */
  crossBuilding?: boolean;
};

type TrendRange = "week" | "month";
type StatsView = "snapshot" | "trend";
type GroupBy = "building" | "areaType";
type ViewMode = "grid" | "list";
type SortOrder = "recent" | "score-desc" | "score-asc";

/** Which unit each evidence card represents — Figma's "View by" dropdown (Area / Area Type / Element / Service, fileKey SWFMjlBJ4u9vSrVaomRe12, node 100:21953). */
type CardGranularity = "areaType" | "area" | "element" | "service";

const CARD_GRANULARITY_OPTIONS: { id: CardGranularity; label: string }[] = [
  { id: "areaType", label: "Area Type" },
  { id: "area", label: "Area" },
  { id: "service", label: "Service" },
  { id: "element", label: "Element" },
];

/**
 * The "Services" filter dropdown's option list — Figma's fuller service
 * taxonomy (fileKey SWFMjlBJ4u9vSrVaomRe12, node 118:16305), broader
 * than this dataset's 4 real task types (lib/sowData.ts's taskTypes).
 * Only "All Services" and "Periodics" (mapped to this dataset's real
 * "Periodic" tag) return live evidence; the rest are stand-in
 * categories with no backing data yet — same spirit as the Element
 * grid's ELEMENT_NAMES below, so selecting one just shows the grid's
 * existing empty state rather than fabricating matches.
 */
const SERVICE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: "All Services" },
  { value: "Failed Services", label: "Failed Services" },
  { value: "No Services", label: "No Services" },
  { value: "Periodic", label: "Periodics" },
  { value: "Detail Work", label: "Detail Work" },
  { value: "Additional Services", label: "Additional Services" },
  { value: "Trashing", label: "Trashing" },
  { value: "Utility/Supply Management", label: "Utility/Supply Management" },
  { value: "Floor Work", label: "Floor Work" },
];

/**
 * A generic vocabulary of room fixtures — this dataset has no real
 * per-element inventory (the SOW tracks tasks, not fixtures), so
 * "Element" cards are a deterministic, clearly-a-prototype stand-in:
 * plausible fixture names with a seeded count and score, not real data.
 */
const ELEMENT_NAMES = ["Table", "Chair", "Trash Can", "Light Fixture", "Sink", "Mirror", "Window", "Vent"];

/** One evidence card's normalized shape — shared by all four "View by" granularities so one WorkCard/ActivityList can render any of them. */
type WorkCardData = {
  key: string;
  photo?: string;
  timeAgo: string;
  title: string;
  score: number;
  variant: CardGranularity;
  progress?: { servicedToday: number; expected: number; percent: number };
  capturedLabel?: string;
  serviceIcon?: string;
  location?: string;
  personName?: string;
  personAvatar?: string;
  /** Area-type-only, for the List view's dedicated table (AreaTypeListTable) — which building this area type's row belongs to (for click-to-navigate) and its areas-serviced-today count out of its total area count. */
  building?: string;
  areaCount?: number;
  areasServicedCount?: number;
  /** Area-only, for the List view's dedicated table (AreaListTable) — the owning area type's name, alongside `building`, for the row's breadcrumb subtitle and click-to-navigate (key already carries the area's own areaId). */
  areaTypeName?: string;
  /** Service-only, for the Grid card (WorkCard) and List view's dedicated table (ServiceListTable) — the real physical area this event is tagged against (areaTypeName, above, doubles as its area type), the icon's tag color, the associate's role/shift subtitle, and the End/Serviced/Start trio (internally consistent — see lib/sowData.ts's serviceTimingForSeed). */
  areaDisplayName?: string;
  serviceIconColor?: string;
  personRole?: string;
  startLabel?: string;
  endLabel?: string;
  servicedLabel?: string;
};

/** Icon + color per service tag — Figma fileKey SWFMjlBJ4u9vSrVaomRe12, node 118:20809. Shared by the Grid card (WorkCard) and List row (ServiceListTable) so both read identically. */
function iconForServiceTag(tag: string): string {
  if (tag.includes("Audit")) return "fa-solid fa-clipboard-check";
  if (tag === "Full Service") return "fa-solid fa-hand-sparkles";
  if (tag === "Spot Clean") return "fa-solid fa-broom-wide";
  if (tag === "Periodic") return "fa-solid fa-rotate";
  if (tag === "Quality Check") return "fa-solid fa-magnifying-glass";
  return "fa-solid fa-bullseye-arrow"; // Detail Work and any other stand-in category
}

/**
 * Tags each verification/audit event with a real physical area from
 * its source area type (deterministic pick, not the event's own
 * "Zone N"/"Inspection N" suffix) plus that area type's real name —
 * backs the Service grid card and list row's "Area" / "Area Type"
 * lines (Figma fileKey SWFMjlBJ4u9vSrVaomRe12, node 118:20809).
 * verificationsForArea/auditsForArea only take an area-type name (no
 * ContractAreaType), so this enriches their output afterward rather
 * than changing their shared signature.
 */
function withAreaTagging<T extends { location: string }>(events: T[], areaType: ContractAreaType): T[] {
  if (areaType.areas.length === 0) return events.map((e) => ({ ...e, areaTypeName: areaType.name }));
  return events.map((e) => ({
    ...e,
    areaDisplayName: areaType.areas[hashSeed(e.location) % areaType.areas.length].displayName,
    areaTypeName: areaType.name,
  }));
}

/**
 * Tags every event with one specific real area instead of
 * hash-distributing across its whole area type — used when the
 * sidebar tree has a specific area selected (selectedArea), so its
 * evidence pool genuinely reflects "just this area" rather than a
 * sample spread across every area in the type.
 */
function withForcedArea<T>(events: T[], areaDisplayName: string, areaTypeName: string): T[] {
  return events.map((e) => ({ ...e, areaDisplayName, areaTypeName }));
}

function colorForServiceTag(tag: string): string {
  if (tag.includes("Audit")) return "var(--color-datavis-sky-blue-700)";
  if (tag === "Full Service") return "var(--color-datavis-purple-500)";
  if (tag === "Spot Clean") return "var(--color-datavis-pinkle-500)";
  if (tag === "Periodic") return "var(--color-datavis-sky-blue-500)";
  if (tag === "Quality Check") return "var(--color-datavis-teal-700)";
  return "var(--color-datavis-bubblegum-500)"; // Detail Work and any other stand-in category
}

/* ---------------- Click-to-sort column headers, shared by AreaTypeListTable/AreaListTable/ServiceListTable ---------------- */

type SortDir = "asc" | "desc";
type SortState<K extends string> = { key: K; dir: SortDir } | null;

/** Clicking a new column starts it ascending; clicking the already-active column flips direction. */
function toggleSort<K extends string>(key: K, current: SortState<K>): { key: K; dir: SortDir } {
  if (current?.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: "asc" };
}

function sortByValue<T, K extends string>(items: T[], sortState: SortState<K>, getValue: (item: T, key: K) => string | number): T[] {
  if (!sortState) return items;
  const { key, dir } = sortState;
  const dirMul = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = getValue(a, key);
    const bv = getValue(b, key);
    if (typeof av === "string" || typeof bv === "string") return dirMul * String(av).localeCompare(String(bv));
    return dirMul * (av - bv);
  });
}

/** "1:48 PM" → minutes since midnight, for a real chronological sort on End/Start's formatted time labels (see lib/sowData.ts's serviceTimingForSeed). */
function parseTimeLabelToMinutes(label: string): number {
  const m = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let hour = parseInt(m[1], 10) % 12;
  if (/PM/i.test(m[3])) hour += 12;
  return hour * 60 + parseInt(m[2], 10);
}

/** "17m 11s" → total seconds, for a real duration sort on Serviced's formatted label. */
function parseDurationLabelToSeconds(label: string): number {
  const m = label.match(/(\d+)m\s*(\d+)s/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function SortableHeaderCell<K extends string>({
  label,
  columnKey,
  sortState,
  onSort,
}: {
  label: string;
  columnKey: K;
  sortState: SortState<K>;
  onSort: (key: K) => void;
}) {
  const isActive = sortState?.key === columnKey;
  return (
    <button
      type="button"
      className={[styles.areaTypeTableHeaderCell, isActive ? styles.areaTypeTableHeaderCellActive : ""].filter(Boolean).join(" ")}
      onClick={() => onSort(columnKey)}
      aria-sort={isActive ? (sortState!.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <i
        className={[
          "fa-solid",
          isActive && sortState!.dir === "asc" ? "fa-caret-up" : "fa-caret-down",
          styles.areaTypeTableHeaderCaret,
          isActive ? styles.areaTypeTableHeaderCaretActive : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />
    </button>
  );
}

const TIME_AGO_OPTIONS = ["5 minutes ago", "17 minutes ago", "29 minutes ago", "1 hour ago", "2 hours ago", "3 hours ago"];

function timeAgoForSeed(seed: string): string {
  return TIME_AGO_OPTIONS[hashSeed(seed) % TIME_AGO_OPTIONS.length];
}

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

type DatePreset = "today" | "yesterday" | "week" | "month" | "lastMonth" | "3months" | "6months" | "1year" | "custom";

const DATE_PRESET_OPTIONS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "Current Week" },
  { id: "month", label: "Current Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "3months", label: "3 Months" },
  { id: "6months", label: "6 Months" },
  { id: "1year", label: "1 Year" },
  { id: "custom", label: "Custom" },
];

/** Day-count for the page's date preset — feeds the scope modal's "is this task due for the period in view" check (isTaskDueForPeriod), so a Weekly/Monthly task only shows a completed-vs-expected count once the selected range actually spans its cycle. */
function periodDaysForDatePreset(preset: DatePreset): number {
  if (preset === "today" || preset === "yesterday") return 1;
  if (preset === "week") return 7;
  if (preset === "month" || preset === "lastMonth" || preset === "custom") return 30;
  if (preset === "3months") return 90;
  if (preset === "6months") return 180;
  return 365; // 1year
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The date pill's label for a preset coarser than a single day — a real
 * computed calendar range anchored on today (not fabricated data; the
 * KPIs underneath still read as of today, since nothing in this dataset
 * tracks real history). Returns null for "today"/"yesterday", which use
 * the existing single-day formatDateLabel instead.
 */
function rangeLabelForPreset(preset: DatePreset): string | null {
  const today = new Date();
  if (preset === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return `${formatShortDate(start)} - ${formatShortDate(today)}`;
  }
  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return `${formatShortDate(start)} - ${formatShortDate(today)}`;
  }
  if (preset === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }
  if (preset === "3months" || preset === "6months" || preset === "1year") {
    const start = new Date(today);
    if (preset === "3months") start.setMonth(start.getMonth() - 3);
    else if (preset === "6months") start.setMonth(start.getMonth() - 6);
    else start.setFullYear(start.getFullYear() - 1);
    return `${formatShortDate(start)} - ${formatShortDate(today)}`;
  }
  if (preset === "custom") return "Custom";
  return null;
}

/** "All / Verifications / Audits" filter pills atop the Work grid — Figma's Filter Button row (fileKey SWFMjlBJ4u9vSrVaomRe12, node 100:21986). */
const TYPE_OPTIONS: ButtonGroupOption<ActivityKind | "all">[] = [
  { id: "all", label: "All", icon: <i className="fa-solid fa-check-double" aria-hidden="true" /> },
  { id: "verification", label: "Verifications", icon: <i className="fa-solid fa-badge-check" aria-hidden="true" /> },
  { id: "audit", label: "Audits", icon: <i className="fa-solid fa-clipboard-check" aria-hidden="true" /> },
];

const GROUP_BY_OPTIONS: ButtonGroupOption<GroupBy>[] = [
  { id: "building", label: "Building", icon: <i className="fa-solid fa-building" aria-hidden="true" /> },
  { id: "areaType", label: "Area Type", icon: <i className="fa-solid fa-vector-square" aria-hidden="true" /> },
];

const VIEW_MODE_OPTIONS: ButtonGroupOption<ViewMode>[] = [
  { id: "grid", label: "Grid", icon: <i className="fa-solid fa-table-cells" aria-hidden="true" /> },
  { id: "list", label: "List", icon: <i className="fa-solid fa-list" aria-hidden="true" /> },
];

const STATS_VIEW_OPTIONS: ButtonGroupOption<StatsView>[] = [
  { id: "snapshot", label: "Snapshot", icon: <i className="fa-solid fa-calendar-day" aria-hidden="true" /> },
  { id: "trend", label: "Trend", icon: <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" /> },
];

const SORT_OPTIONS: { id: SortOrder; label: string }[] = [
  { id: "recent", label: "Newest Services" },
  { id: "score-desc", label: "Highest Score" },
  { id: "score-asc", label: "Lowest Score" },
];

type AreaTypeGroup = {
  areaTypeName: string;
  totalAreas: number;
  instances: { building: ContractBuilding; areaType: ContractAreaType }[];
};

/**
 * SowHierarchyPage — alternate Scope of Work exploration. Instead
 * of top tabs (SowPage), the site's own structure — Site > Building
 * > Area Type > Area — is the navigation: a sidebar tree on the
 * left (browsable either by Building or, flattened, by Area Type),
 * with the main pane showing what's contracted and the evidence
 * it's happening for whatever's selected, plus per-node metric
 * cards and a performance trend at the site level.
 *
 * Rebuilt from the Figma "Area Types" exploration (fileKey
 * SWFMjlBJ4u9vSrVaomRe12, node 87:10576 and, for the Performance/Work
 * layout, node 100:21986): a standalone site card, a Building/Area
 * Type grouping toggle, two-line tree rows, three metric cards
 * (Service Coverage / Hours Captured / Average Audit Score) with a
 * Snapshot/Trend segmented control, an All/Verifications/Audits
 * filter row over the evidence grid, a View by/Filter/Sort control
 * row, and a Grid/List segmented control.
 *
 * Every building carries full area-type/area detail — the real
 * exported SOW (data/SOW_DeltaLGA.csv: 714 areas, 40 area types,
 * real tasks/frequencies across all 7 buildings), not a hand-picked
 * sample. The tree's leaf level is each area type's real areas
 * (room/asset labels from the SOW, e.g. "D1-110 — Endeavor Air") —
 * selecting one doesn't fabricate per-room evidence (this dataset
 * doesn't have that), it just shows that area's identity alongside
 * its area type's tasks/evidence.
 *
 * The date nav actually drives the numbers — KPIs, metric cards,
 * trend, and evidence timestamps/scores all recompute per
 * dayOffset via lib/sowData.ts's scoreForDay/scaleForDay/
 * hoursCapturedForNode/auditSummaryForNode generators. There's no
 * real historical dataset behind this (nothing in the source
 * screens tracked day-by-day history), so "yesterday" is a
 * deterministic, plausible-looking variation rather than a replay
 * of an actual past day — but it's consistent: revisiting the same
 * day reproduces the same numbers, and every node (site, building,
 * area type) varies independently and smoothly day to day.
 */
export function SowHierarchyPage({ contractBuildings }: SowHierarchyPageProps) {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection>({
    buildingName: null,
    areaTypeName: null,
    areaId: null,
  });
  const treeRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  // Two independent scroll adjustments on every new tree selection: the
  // main content pane's own top scrolls into view (not the whole page —
  // the page header bar above it can stay scrolled out of view), so a new
  // selection always reads from its own title/breadcrumb regardless of
  // how far the previous selection's evidence grid had been scrolled —
  // but only once the page is already scrolled down (past the point
  // where the sidebar goes sticky); if the user's still at the very top,
  // there's nothing to correct, so leave the scroll position alone. And
  // — only if the newly-selected row isn't already visible in the
  // sidebar's own scrolling tree — that tree scrolls just enough to
  // reveal it, anchored at the bottom of the tree's viewport rather than
  // snapping it to the top (so the rows leading up to the selection stay
  // visible for context) rather than always re-centering on every click.
  useEffect(() => {
    if (window.scrollY > 0) {
      contentRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
    const container = treeRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>(`.${styles.treeRowActive}`);
    if (!activeEl) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const isFullyVisible = activeRect.top >= containerRect.top && activeRect.bottom <= containerRect.bottom;
    if (!isFullyVisible) {
      activeEl.scrollIntoView({ block: "end", behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const [groupBy, setGroupBy] = useState<GroupBy>("building");
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({ "Concourse D": true });
  const [expandedAreaTypes, setExpandedAreaTypes] = useState<Record<string, boolean>>({ "Break Rooms": true });
  const [expandedAreaTypeGroups, setExpandedAreaTypeGroups] = useState<Record<string, boolean>>({ "Break Rooms": true });

  const [siteScheduleOn, setSiteScheduleOn] = useState(false);

  const [taskTypeFilter, setTaskTypeFilter] = useState(ALL);
  const [activityFilter, setActivityFilter] = useState<ActivityKind | "all">("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [cardGranularity, setCardGranularity] = useState<CardGranularity>("areaType");

  const [dayOffset, setDayOffset] = useState(0);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>("week");
  const [statsView, setStatsView] = useState<StatsView>("snapshot");
  const [performanceCollapsed, setPerformanceCollapsed] = useState(false);

  // Close the date preset menu on an outside click or Escape — it's a
  // lightweight popover, not a Modal, so it manages its own dismissal.
  useEffect(() => {
    if (!dateMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setDateMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDateMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dateMenuOpen]);

  // "Today"/"Yesterday" drive the real single-day dayOffset every KPI on
  // this page reads from. The coarser presets have no real history behind
  // them (nothing in this dataset tracks day-by-day history — see the
  // component doc comment) — they show a real, correctly-computed calendar
  // range in the pill and coarsen the Performance section's Trend range to
  // match, while the KPIs stay anchored on today rather than faking a
  // number for a window we have no data for.
  function selectDatePreset(preset: DatePreset) {
    setDatePreset(preset);
    setDateMenuOpen(false);
    if (preset === "today") {
      setDayOffset(0);
      setTrendRange("week");
      return;
    }
    if (preset === "yesterday") {
      setDayOffset(1);
      setTrendRange("week");
      return;
    }
    setDayOffset(0);
    setTrendRange(preset === "week" ? "week" : "month");
  }

  const isDayPreset = datePreset === "today" || datePreset === "yesterday";
  const dateLabel = isDayPreset ? formatDateLabel(dayOffset) : (rangeLabelForPreset(datePreset) ?? "Custom");

  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [openScopeIds, setOpenScopeIds] = useState<string[]>([]);
  const [viewedServiceItem, setViewedServiceItem] = useState<WorkCardData | null>(null);

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

  function selectAreaType(buildingName: string, areaTypeName: string, expandKey: string = areaTypeName) {
    setSelection({ buildingName, areaTypeName, areaId: null });
    setExpandedAreaTypes((prev) => ({ ...prev, [expandKey]: !prev[expandKey] }));
  }

  function selectArea(buildingName: string, areaTypeName: string, areaId: string) {
    setSelection({ buildingName, areaTypeName, areaId });
  }

  /** Selects an area type across every building that offers it — clicking the group header itself in "Group by: Area Type" mode, rather than one of its building instances underneath. */
  function selectCrossBuildingAreaType(areaTypeName: string) {
    setSelection({ buildingName: null, areaTypeName, areaId: null, crossBuilding: true });
    setExpandedAreaTypeGroups((prev) => ({ ...prev, [areaTypeName]: !prev[areaTypeName] }));
  }

  // Every unique area type name across the whole site, flattened for
  // "Group by: Area Type" — each group's instances are the (building,
  // area type) pairs that actually offer it, since the same area type
  // name (e.g. "Break Rooms") recurs across several buildings.
  const areaTypeGroups: AreaTypeGroup[] = useMemo(() => {
    const map = new Map<string, AreaTypeGroup>();
    contractBuildings.forEach((b) => {
      b.areaTypes.forEach((at) => {
        if (!map.has(at.name)) map.set(at.name, { areaTypeName: at.name, totalAreas: 0, instances: [] });
        const entry = map.get(at.name)!;
        entry.totalAreas += at.areas.length;
        entry.instances.push({ building: b, areaType: at });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.areaTypeName.localeCompare(b.areaTypeName));
  }, [contractBuildings]);

  /** Merges every building's instance of an area type into one synthetic ContractAreaType (union of areas, de-duplicated tasks by label) so the whole "single area type" data pipeline below — coverage, evidence, the scope modal — works unchanged for the cross-building view. */
  function buildCrossBuildingAreaType(areaTypeName: string): ContractAreaType | undefined {
    const group = areaTypeGroups.find((g) => g.areaTypeName === areaTypeName);
    if (!group) return undefined;
    const areas = group.instances.flatMap((inst) => inst.areaType.areas);
    const taskMap = new Map<string, ContractTaskDef>();
    group.instances.forEach((inst) => {
      inst.areaType.tasks.forEach((t) => {
        if (!taskMap.has(t.label)) taskMap.set(t.label, t);
      });
    });
    return { name: areaTypeName, building: "All Buildings", areas, tasks: Array.from(taskMap.values()) };
  }

  const isSiteLevel = !selection.buildingName && !selection.crossBuilding;
  const selectedContractAreaType: ContractAreaType | undefined = selection.areaTypeName
    ? selection.crossBuilding
      ? buildCrossBuildingAreaType(selection.areaTypeName)
      : findContractAreaType(contractBuildings, selection.areaTypeName, selection.buildingName ?? undefined)
    : undefined;
  const selectedAreaType = selectedContractAreaType ? areaTypeFromContract(selectedContractAreaType) : null;
  const selectedArea: ContractArea | undefined = selectedContractAreaType?.areas.find((a) => a.areaId === selection.areaId);
  const selectedBuilding = selection.buildingName ? buildings.find((b) => b.name === selection.buildingName)! : null;
  const selectedBuildingContract = selection.buildingName
    ? contractBuildings.find((cb) => cb.name === selection.buildingName)
    : undefined;

  // "View by" only offers a granularity that still describes a real group
  // of siblings for what's selected: with one area type picked, "by area
  // type" would just be a single card for itself, so it drops out (falling
  // back to "Area"); with one specific area picked, "by area" is the same
  // dead end too, so both drop out (falling back to "Element").
  const availableCardGranularityOptions = useMemo(() => {
    if (selectedArea) return CARD_GRANULARITY_OPTIONS.filter((o) => o.id === "element" || o.id === "service");
    if (selectedAreaType) return CARD_GRANULARITY_OPTIONS.filter((o) => o.id !== "areaType");
    return CARD_GRANULARITY_OPTIONS;
  }, [selectedArea, selectedAreaType]);

  useEffect(() => {
    if (availableCardGranularityOptions.some((o) => o.id === cardGranularity)) return;
    setCardGranularity(availableCardGranularityOptions[0].id);
  }, [availableCardGranularityOptions, cardGranularity]);

  const evidenceVerifications = useMemo(() => {
    let base: VerificationEvent[];
    if (selectedContractAreaType && selectedArea) {
      base = withForcedArea(verificationsForArea(selectedContractAreaType.name), selectedArea.displayName, selectedContractAreaType.name);
    } else if (selectedContractAreaType) {
      base = withAreaTagging(verificationsForArea(selectedContractAreaType.name), selectedContractAreaType);
    } else if (selection.buildingName && isModeled(selection.buildingName)) {
      const modeled = contractBuildings.find((cb) => cb.name === selection.buildingName)!;
      base = modeled.areaTypes.flatMap((at) => withAreaTagging(verificationsForArea(at.name), at));
    } else if (isSiteLevel) {
      // A few featured area types per building rather than every one — flattening
      // all ~40 area types across all 7 buildings would produce thousands of cards.
      base = contractBuildings.flatMap((cb) =>
        cb.areaTypes.slice(0, 3).flatMap((at) => withAreaTagging(verificationsForArea(at.name), at))
      );
    } else {
      base = [];
    }
    return base.filter((v) => taskTypeFilter === ALL || v.type === taskTypeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContractAreaType, selectedArea, selection.buildingName, isSiteLevel, contractBuildings, taskTypeFilter]);

  const evidenceAudits = useMemo((): AuditEvent[] => {
    if (selectedContractAreaType && selectedArea) {
      return withForcedArea(auditsForArea(selectedContractAreaType.name), selectedArea.displayName, selectedContractAreaType.name);
    }
    if (selectedContractAreaType) return withAreaTagging(auditsForArea(selectedContractAreaType.name), selectedContractAreaType);
    if (selection.buildingName && isModeled(selection.buildingName)) {
      const modeled = contractBuildings.find((cb) => cb.name === selection.buildingName)!;
      return modeled.areaTypes.flatMap((at) => withAreaTagging(auditsForArea(at.name), at));
    }
    if (isSiteLevel) {
      return contractBuildings.flatMap((cb) => cb.areaTypes.slice(0, 3).flatMap((at) => withAreaTagging(auditsForArea(at.name), at)));
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContractAreaType, selectedArea, selection.buildingName, isSiteLevel, contractBuildings]);

  const evidenceActivity = useMemo(() => {
    const verificationItems = evidenceVerifications.map(verificationToActivity);
    const auditItems = evidenceAudits.map(auditToActivity);
    if (activityFilter === "verification") return verificationItems;
    if (activityFilter === "audit") return auditItems;
    return [...verificationItems, ...auditItems];
  }, [evidenceVerifications, evidenceAudits, activityFilter]);

  const metricSeedKey = selection.areaTypeName ?? selection.buildingName ?? "site";

  const dayEvidenceActivity = useMemo(
    () => evidenceActivity.map((item) => applyDayVariationToActivity(item, dayOffset)),
    [evidenceActivity, dayOffset]
  );

  const sortedEvidenceActivity = useMemo(() => {
    const arr = [...dayEvidenceActivity];
    if (sortOrder === "score-desc") arr.sort((a, b) => b.score - a.score);
    else if (sortOrder === "score-asc") arr.sort((a, b) => a.score - b.score);
    return arr;
  }, [dayEvidenceActivity, sortOrder]);

  // "View by" card data — Area Type / Area / Element / Service granularities,
  // each normalized to WorkCardData so one WorkCard/ActivityList
  // renders any of them. All four are scoped to the same
  // "what area types are in view" set: the selected area type itself, the
  // selected building's area types, or — at the site level — a few
  // featured area types per building (the same capped sample the Activity
  // feed already uses, so the grid doesn't try to render thousands of
  // cards for the whole site at once).
  const scopedAreaTypesForGrid: ContractAreaType[] = useMemo(() => {
    if (selectedContractAreaType) return [selectedContractAreaType];
    if (selectedBuildingContract) return selectedBuildingContract.areaTypes;
    return contractBuildings.flatMap((cb) => cb.areaTypes.slice(0, 3));
  }, [selectedContractAreaType, selectedBuildingContract, contractBuildings]);

  const areaTypeCards: WorkCardData[] = useMemo(
    () =>
      scopedAreaTypesForGrid.map((at) => {
        const converted = areaTypeFromContract(at);
        const expected = converted.expectedServices;
        const servicedToday = Math.max(0, Math.round(converted.servicedToday * scaleForDay(`${at.name}-serviced`, dayOffset)));
        const percent = expected > 0 ? Math.min(100, (servicedToday / expected) * 100) : 0;
        const seedKey = `${at.building}-${at.name}`;
        const areaCount = at.areas.length;
        const areasServicedCount = Math.min(
          areaCount,
          Math.max(areaCount > 0 ? 1 : 0, Math.round(areaCount * scaleForDay(`${seedKey}-areas-serviced`, dayOffset, 0.75, 1)))
        );
        return {
          key: seedKey,
          photo: photoForAreaType(at.name, seedKey),
          timeAgo: timeAgoForSeed(seedKey),
          title: at.name,
          score: scoreForDay(`${at.name}-score`, dayOffset),
          variant: "areaType" as const,
          progress: { servicedToday, expected, percent },
          capturedLabel: `${capturedDurationLabel(seedKey, dayOffset)} Captured`,
          building: at.building,
          areaCount,
          areasServicedCount,
        };
      }),
    [scopedAreaTypesForGrid, dayOffset]
  );

  const areaCards: WorkCardData[] = useMemo(
    () =>
      scopedAreaTypesForGrid.flatMap((at) => {
        const converted = areaTypeFromContract(at);
        const perAreaExpected = Math.max(1, Math.round(converted.expectedServices / Math.max(1, at.areas.length)));
        return at.areas.map((area) => {
          const seedKey = area.areaId;
          const servicedToday = Math.max(0, Math.round(perAreaExpected * scaleForDay(`${seedKey}-serviced`, dayOffset, 0.2, 0.95)));
          const percent = Math.min(100, (servicedToday / perAreaExpected) * 100);
          return {
            key: seedKey,
            photo: photoForAreaType(at.name, seedKey),
            timeAgo: timeAgoForSeed(seedKey),
            title: area.displayName,
            score: scoreForDay(`${seedKey}-score`, dayOffset),
            variant: "area" as const,
            progress: { servicedToday, expected: perAreaExpected, percent },
            capturedLabel: `${capturedDurationLabel(seedKey, dayOffset)} Captured`,
            building: at.building,
            areaTypeName: at.name,
          };
        });
      }),
    [scopedAreaTypesForGrid, dayOffset]
  );

  const elementCards: WorkCardData[] = useMemo(
    () =>
      scopedAreaTypesForGrid.flatMap((at) =>
        ELEMENT_NAMES.slice(0, 3).map((name) => {
          const seedKey = `${at.building}-${at.name}-${name}`;
          const qty = 3 + (hashSeed(seedKey) % Math.max(3, at.areas.length));
          return {
            key: seedKey,
            photo: photoForAreaType(at.name, seedKey),
            timeAgo: timeAgoForSeed(seedKey),
            title: `${name} (${qty})`,
            score: scoreForDay(`${seedKey}-score`, dayOffset),
            variant: "element" as const,
          };
        })
      ),
    [scopedAreaTypesForGrid, dayOffset]
  );

  const serviceCards: WorkCardData[] = useMemo(
    () =>
      sortedEvidenceActivity.map((item, i) => {
        const seedKey = `${item.location}-${item.personName}-${i}`;
        const timing = serviceTimingForSeed(seedKey, dayOffset);
        return {
          key: `${item.location}-${i}`,
          photo: item.areaPhoto,
          timeAgo: item.timeAgo,
          title: item.tag,
          score: item.score,
          variant: "service" as const,
          serviceIcon: iconForServiceTag(item.tag),
          serviceIconColor: colorForServiceTag(item.tag),
          location: item.location,
          areaDisplayName: item.areaDisplayName ?? item.location,
          areaTypeName: item.areaTypeName,
          personName: item.personName,
          personAvatar: item.personAvatar,
          personRole: item.position && item.shift ? `${item.position} | ${item.shift}` : undefined,
          capturedLabel: timing.servicedLabel,
          startLabel: timing.startLabel,
          endLabel: timing.endLabel,
          servicedLabel: timing.servicedLabel,
        };
      }),
    [sortedEvidenceActivity, dayOffset]
  );

  const gridCards: WorkCardData[] = useMemo(() => {
    const base =
      cardGranularity === "service"
        ? serviceCards
        : cardGranularity === "area"
          ? areaCards
          : cardGranularity === "element"
            ? elementCards
            : areaTypeCards;
    const arr = [...base];
    if (sortOrder === "score-desc") arr.sort((a, b) => b.score - a.score);
    else if (sortOrder === "score-asc") arr.sort((a, b) => a.score - b.score);
    return arr;
  }, [cardGranularity, serviceCards, areaCards, elementCards, areaTypeCards, sortOrder]);

  // How many distinct floors the whole site spans, for the site-level
  // header meta row (Buildings/Floors/Area Types/Areas).
  const siteFloorCount = useMemo(
    () => new Set(contractBuildings.flatMap((cb) => cb.areaTypes.flatMap((at) => at.areas.map((a) => a.floor)))).size,
    [contractBuildings]
  );

  // Coverage % for an arbitrary day, for whatever's selected (area type,
  // building, or — with nothing selected — the whole site). Same formula
  // (and the exact same per-node seed) used for both "today's" snapshot
  // number and every point on the Service Coverage trend line, so the
  // two views never disagree on what "today" reads.
  function coveragePercentForOffset(offset: number): number {
    if (selectedAreaType) {
      const servicedToday = Math.max(
        0,
        Math.round(selectedAreaType.servicedToday * scaleForDay(`${selectedAreaType.name}-serviced`, offset))
      );
      return selectedAreaType.expectedServices > 0 ? Math.min(100, (servicedToday / selectedAreaType.expectedServices) * 100) : 0;
    }
    if (selectedBuilding) {
      return Math.min(100, Math.round(selectedBuilding.coveragePercent * scaleForDay(`${selectedBuilding.name}-coverage`, offset)));
    }
    const completed = facilitySummary.verificationsCompleted * scaleForDay("site-completed", offset);
    return facilitySummary.verificationsExpected > 0 ? Math.min(100, (completed / facilitySummary.verificationsExpected) * 100) : 0;
  }

  const dayAreaServicedToday = selectedAreaType
    ? Math.max(0, Math.round(selectedAreaType.servicedToday * scaleForDay(`${selectedAreaType.name}-serviced`, dayOffset)))
    : 0;

  const coveragePercent = coveragePercentForOffset(dayOffset);
  const coverageExpected = selectedAreaType
    ? selectedAreaType.expectedServices
    : (selectedBuilding?.totalActions ?? facilitySummary.verificationsExpected);
  const coverageServicedToday = selectedAreaType
    ? dayAreaServicedToday
    : Math.round((coveragePercent / 100) * coverageExpected);
  const hoursCaptured = hoursCapturedForNode(metricSeedKey, dayOffset);
  const auditSummary = auditSummaryForNode(metricSeedKey, dayOffset);

  // Per-metric trend series for the Performance section's Trend view —
  // one line each for Service Coverage, Hours Captured, and Average
  // Audit Score, each built from the same per-day generators driving
  // their Snapshot counterparts above (oldest first, ending at dayOffset).
  const metricTrendDays = trendRange === "week" ? 7 : 30;
  const coverageTrendSeries = Array.from({ length: metricTrendDays }, (_, i) =>
    coveragePercentForOffset(dayOffset + (metricTrendDays - 1 - i))
  );
  const hoursCapturedTrendSeries = Array.from(
    { length: metricTrendDays },
    (_, i) => hoursCapturedForNode(metricSeedKey, dayOffset + (metricTrendDays - 1 - i)).percent
  );
  const auditScoreTrendSeries = Array.from({ length: metricTrendDays }, (_, i) =>
    scoreForDay(`${metricSeedKey}-audit-score`, dayOffset + (metricTrendDays - 1 - i))
  );

  const metaFloorCount = selectedContractAreaType
    ? new Set(selectedContractAreaType.areas.map((a) => a.floor)).size
    : selectedBuildingContract
      ? new Set(selectedBuildingContract.areaTypes.flatMap((at) => at.areas.map((a) => a.floor))).size
      : 0;
  const metaAreaCount = selectedContractAreaType ? selectedContractAreaType.areas.length : (selectedBuildingContract?.areaCount ?? 0);
  const hasHeaderMeta = !!selectedContractAreaType || !!selectedBuildingContract;

  // "Delta LGA / All Buildings / Conference Rooms" — site, then the
  // building (or "All Buildings" for a cross-building area type group),
  // then whatever leaf is selected. Only shown once you've drilled past
  // the site level, same as a real breadcrumb trail.
  const breadcrumbLabel = useMemo(() => {
    if (isSiteLevel) return null;
    const siteCode = siteInfo.siteName.split("-")[0];
    const segments = [`${siteInfo.client} ${siteCode}`];
    if (selection.crossBuilding) segments.push("All Buildings");
    else if (selection.buildingName) segments.push(selection.buildingName);
    if (selectedArea) segments.push(selectedArea.displayName);
    else if (selectedAreaType) segments.push(selectedAreaType.name);
    return segments.join(" / ");
  }, [isSiteLevel, selection.crossBuilding, selection.buildingName, selectedArea, selectedAreaType]);

  // "View Scope for this Area" opens the task list in a modal instead of a
  // page section — pre-opening the selected leaf area's own accordion
  // section (if one's picked) so it's not buried behind every sibling area.
  function openScopeModal() {
    setOpenScopeIds(selection.areaId ? [selection.areaId] : []);
    setScopeModalOpen(true);
  }

  function toggleScopeItem(id: string) {
    setOpenScopeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // The scope modal's accordion groups by Building when an area type was
  // selected cross-building (its group header in "Group by: Area Type"
  // mode); by real Area when one building's instance of an area type is
  // selected (every area in it shares the same contracted tasks, so this
  // surfaces "which physical spaces this applies to"); and by Area Type
  // when only a building is selected — the natural next level down, same
  // as the (now-removed) inline task list used to.
  const periodDays = periodDaysForDatePreset(datePreset);

  const scopeAccordionItems: AccordionItemData[] = useMemo(() => {
    // Real, contract-derived expected count (areaCount — one due instance
    // per area, same convention SowTimeFirstPage's Scope & Frequency tab
    // uses) alongside a deterministic seeded completed count (same
    // scaleForDay generator family as every other coverage number on this
    // page). Only rendered for tasks actually due within the page's
    // current date-range preset — a Weekly/Monthly task viewed on "Today"
    // just shows its frequency text, same as before, rather than a
    // misleading 0-of-something for a task that isn't due yet.
    function tasksList(tasks: ContractTaskDef[], seedPrefix: string, areaCount: number) {
      return (
        <div className={styles.flatTaskList}>
          {tasks.map((task) => {
            const due = isTaskDueForPeriod(task.frequency, periodDays);
            const expected = areaCount;
            const seedKey = `${seedPrefix}-${task.label}`;
            const completed = due ? Math.round(expected * scaleForDay(`${seedKey}-scope-completion`, dayOffset, 0.72, 0.94)) : 0;
            const completedPercent = due && expected > 0 ? Math.min(100, (completed / expected) * 100) : 0;
            return (
              <div key={task.label} className={styles.scopeTaskRow}>
                <div className={sharedStyles.taskRow}>
                  <span className={sharedStyles.taskLabel}>{task.label}</span>
                  <span className={sharedStyles.frequencyText}>
                    {task.frequency}
                    {task.shifts && task.shifts.length > 0 && task.shifts.length < 3 && ` · ${task.shifts.join("/")}`}
                  </span>
                </div>
                {due && (
                  <span className={styles.areaTypeTableProgressTrack}>
                    <span className={styles.areaTypeTableProgressFill} style={{ width: `${completedPercent}%` }}>
                      <span className={styles.areaTypeTableProgressLabel}>
                        {completed} of {expected} Completed
                      </span>
                    </span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (isSiteLevel) {
      return contractBuildings.map((cb) => ({
        id: cb.name,
        header: (
          <span className={styles.scopeAccordionHeader}>
            <span className={styles.scopeAccordionHeaderName}>{cb.name}</span>
            <span className={styles.scopeAccordionHeaderMeta}>
              {cb.areaTypes.length} area type{cb.areaTypes.length === 1 ? "" : "s"} · {cb.areaCount} areas
            </span>
          </span>
        ),
        content: (
          <div className={styles.flatTaskList}>
            {cb.areaTypes.map((at) => (
              <div key={at.name} className={sharedStyles.taskRow}>
                <span className={sharedStyles.taskLabel}>{at.name}</span>
                <span className={sharedStyles.frequencyText}>
                  {at.areas.length} area{at.areas.length === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        ),
      }));
    }
    if (selection.crossBuilding && selection.areaTypeName) {
      const group = areaTypeGroups.find((g) => g.areaTypeName === selection.areaTypeName);
      if (group) {
        return group.instances.map((inst) => ({
          id: inst.building.name,
          header: (
            <span className={styles.scopeAccordionHeader}>
              <span className={styles.scopeAccordionHeaderName}>{inst.building.name}</span>
              <span className={styles.scopeAccordionHeaderMeta}>
                {inst.areaType.areas.length} area{inst.areaType.areas.length === 1 ? "" : "s"}
              </span>
            </span>
          ),
          content: tasksList(inst.areaType.tasks, `${inst.building.name}-${inst.areaType.name}`, inst.areaType.areas.length),
        }));
      }
    }
    if (selectedContractAreaType) {
      return selectedContractAreaType.areas.map((a) => ({
        id: a.areaId,
        header: (
          <span className={styles.scopeAccordionHeader}>
            <span className={styles.scopeAccordionHeaderName}>{a.displayName}</span>
            <span className={styles.scopeAccordionHeaderMeta}>
              Floor {a.floor}
              {a.floorDescription ? ` (${a.floorDescription})` : ""}
            </span>
          </span>
        ),
        content: tasksList(selectedContractAreaType.tasks, a.areaId, 1),
      }));
    }
    if (selectedBuildingContract) {
      return selectedBuildingContract.areaTypes.map((at) => ({
        id: at.name,
        header: (
          <span className={styles.scopeAccordionHeader}>
            <span className={styles.scopeAccordionHeaderName}>{at.name}</span>
            <span className={styles.scopeAccordionHeaderMeta}>
              {at.areas.length} area{at.areas.length === 1 ? "" : "s"}
            </span>
          </span>
        ),
        content: tasksList(at.tasks, `${selectedBuildingContract.name}-${at.name}`, at.areas.length),
      }));
    }
    return [];
  }, [
    isSiteLevel,
    contractBuildings,
    selection.crossBuilding,
    selection.areaTypeName,
    areaTypeGroups,
    selectedContractAreaType,
    selectedBuildingContract,
    periodDays,
    dayOffset,
  ]);

  // -- Tree row renderers (closures over selection/expand state) --

  function renderBuildingTopRow(building: (typeof buildings)[number], modeled: ContractBuilding | undefined) {
    const buildingOpen = searching ? true : !!expandedBuildings[building.name];
    const buildingSelected = selection.buildingName === building.name && !selection.areaTypeName;
    const floorCount = modeled ? new Set(modeled.areaTypes.flatMap((at) => at.areas.map((a) => a.floor))).size : 0;
    const areaCount = modeled ? modeled.areaCount : building.totalActions;
    return (
      <button
        type="button"
        className={[styles.treeRow, buildingSelected ? styles.treeRowActive : ""].filter(Boolean).join(" ")}
        onClick={() => selectBuilding(building.name)}
        aria-expanded={modeled ? buildingOpen : undefined}
      >
        {modeled ? (
          <span
            className={[styles.treeRowCaret, buildingOpen ? styles.treeRowCaretOpen : ""].filter(Boolean).join(" ")}
            aria-hidden="true"
          >
            ▸
          </span>
        ) : (
          <span className={styles.treeRowCaretSpacer} aria-hidden="true" />
        )}
        <span className={styles.treeIconChip}>
          <i className="fa-solid fa-building" aria-hidden="true" />
        </span>
        <span className={styles.treeRowBody}>
          <span className={styles.treeRowName}>{building.name}</span>
          <span className={styles.treeRowMeta}>
            <span className={styles.treeRowMetaItem}>
              <i className="fa-solid fa-layer-group" aria-hidden="true" /> Floors: {floorCount}
            </span>
            <span>•</span>
            <span className={styles.treeRowMetaItem}>
              <i className="fa-solid fa-vector-square" aria-hidden="true" /> Areas: {areaCount}
            </span>
          </span>
        </span>
      </button>
    );
  }

  /**
   * Renders one area-type row and its real-area children. `variant="building"`
   * swaps the label/icon to the owning building — used when the tree is
   * grouped by area type instead, where the same area-type name can appear
   * under several buildings at once. Its expand key is scoped per-building
   * in that case so expanding one instance doesn't cascade into every
   * other building's same-named area type.
   */
  function renderAreaTypeRow(building: { name: string }, contractAreaType: ContractAreaType, variant: "areaType" | "building") {
    const expandKey = variant === "building" ? `${building.name}::${contractAreaType.name}` : contractAreaType.name;
    const isOpen = searching ? true : !!expandedAreaTypes[expandKey];
    const isSelected =
      selection.buildingName === building.name && selection.areaTypeName === contractAreaType.name && !selection.areaId;
    const floorCount = new Set(contractAreaType.areas.map((a) => a.floor)).size;
    const label = variant === "building" ? building.name : contractAreaType.name;
    return (
      <div key={`${building.name}-${contractAreaType.name}`}>
        <button
          type="button"
          className={[styles.treeRow, styles.treeRowIndent1, isSelected ? styles.treeRowActive : ""].filter(Boolean).join(" ")}
          onClick={() => selectAreaType(building.name, contractAreaType.name, expandKey)}
          aria-expanded={isOpen}
        >
          <span className={[styles.treeRowCaret, isOpen ? styles.treeRowCaretOpen : ""].filter(Boolean).join(" ")} aria-hidden="true">
            ▸
          </span>
          {variant === "building" ? (
            <span className={styles.treeIconChip}>
              <i className="fa-solid fa-building" aria-hidden="true" />
            </span>
          ) : (
            <span className={[styles.treeIconPlain, styles.treeIconPrimary].join(" ")}>
              <i className="fa-solid fa-object-ungroup" aria-hidden="true" />
            </span>
          )}
          <span className={styles.treeRowBody}>
            <span className={styles.treeRowName}>{label}</span>
            <span className={styles.treeRowMeta}>
              <span className={styles.treeRowMetaItem}>
                <i className="fa-solid fa-layer-group" aria-hidden="true" /> Floors: {floorCount}
              </span>
              <span>•</span>
              <span className={styles.treeRowMetaItem}>
                <i className="fa-solid fa-vector-square" aria-hidden="true" /> Areas: {contractAreaType.areas.length}
              </span>
            </span>
          </span>
        </button>

        {isOpen &&
          contractAreaType.areas.map((area) => (
            <button
              key={area.areaId}
              type="button"
              className={[
                styles.treeRow,
                styles.treeRowIndent2,
                selection.areaId === area.areaId && selection.areaTypeName === contractAreaType.name ? styles.treeRowActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => selectArea(building.name, contractAreaType.name, area.areaId)}
            >
              <span className={styles.treeRowCaretSpacer} aria-hidden="true" />
              <span className={[styles.treeIconPlain, styles.treeIconPurple].join(" ")}>
                <i className="fa-solid fa-vector-square" aria-hidden="true" />
              </span>
              <span className={styles.treeRowBody}>
                <span className={styles.treeRowName}>{area.displayName}</span>
                <span className={styles.treeRowMeta}>
                  <span className={styles.treeRowMetaItem}>
                    <i className="fa-solid fa-location-dot" aria-hidden="true" /> Floor {area.floor}
                    {area.floorDescription ? ` (${area.floorDescription})` : ""}
                  </span>
                  <span>•</span>
                  <span className={styles.treeRowMetaItem}>
                    <i className="fa-solid fa-list" aria-hidden="true" /> Tasks: {contractAreaType.tasks.length}
                  </span>
                </span>
              </span>
            </button>
          ))}
      </div>
    );
  }

  // Shared by every "meta row" variant below (site-level, area/area-type,
  // and the no-meta fallback) so the toggle always sits on the same line
  // as whatever meta text is there, right under "View Scope for this Area".
  function renderPerformanceToggle() {
    return (
      <button
        type="button"
        className={styles.performanceToggleButton}
        onClick={() => setPerformanceCollapsed((v) => !v)}
        aria-expanded={!performanceCollapsed}
      >
        <i className={["fa-solid", performanceCollapsed ? "fa-chevron-down" : "fa-chevron-up"].join(" ")} aria-hidden="true" />
        {performanceCollapsed ? "Show Performance Summary" : "Hide Performance Summary"}
      </button>
    );
  }

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
        <h1 className={styles.pageHeaderTitle}>
          <span className={styles.pageHeaderTitleGrey}>Quality / </span>
          Scope of Work
        </h1>

        <div className={styles.pageHeaderControlsRow}>
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
          <div className={styles.datePicker} ref={dateMenuRef}>
            {isDayPreset && (
              <button
                type="button"
                className={styles.datePickerCaret}
                onClick={() => setDayOffset((o) => o + 1)}
                aria-label="Previous day"
              >
                <CaretLeftIcon />
              </button>
            )}
            <button
              type="button"
              className={styles.datePickerLabel}
              onClick={() => setDateMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={dateMenuOpen}
            >
              {dateLabel}
            </button>
            {isDayPreset && (
              <button
                type="button"
                className={styles.datePickerCaret}
                onClick={() => setDayOffset((o) => Math.max(0, o - 1))}
                disabled={dayOffset === 0}
                aria-label="Next day"
              >
                <CaretRightIcon />
              </button>
            )}
            {dateMenuOpen && (
              <div className={styles.dateMenu} role="menu">
                {DATE_PRESET_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={datePreset === p.id}
                    className={[styles.dateMenuItem, datePreset === p.id ? styles.dateMenuItemActive : ""]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectDatePreset(p.id)}
                  >
                    {p.label}
                    {datePreset === p.id && <i className={["fa-solid fa-check", styles.dateMenuItemCheck].join(" ")} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <button
            type="button"
            className={[styles.siteCard, isSiteLevel ? styles.siteCardActive : ""].filter(Boolean).join(" ")}
            onClick={selectSite}
          >
            <img src={siteInfo.logo} alt="" className={styles.siteCardLogo} />
            <span className={styles.siteCardBody}>
              <span className={styles.siteCardName}>{siteInfo.client}</span>
              <span className={styles.siteCardSub}>{siteInfo.siteName}</span>
            </span>
          </button>

          <div className={styles.sidebarSearch}>
            <Input
              theme="light"
              icon={<SearchIcon />}
              placeholder="Filter areas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search site hierarchy"
            />
          </div>

          <div className={styles.groupByRow}>
            <span className={styles.groupByLabel}>Group by</span>
            <ButtonGroup options={GROUP_BY_OPTIONS} value={groupBy} onChange={setGroupBy} aria-label="Group sidebar by" />
          </div>

          <nav className={styles.tree} aria-label="Site hierarchy" ref={treeRef}>
            {groupBy === "building"
              ? buildings.map((building) => {
                  const modeled = contractBuildings.find((cb) => cb.name === building.name);
                  const buildingMatches = building.name.toLowerCase().includes(q);
                  const childMatches = !!modeled && modeled.areaTypes.some((a) => a.name.toLowerCase().includes(q));
                  if (searching && !buildingMatches && !childMatches) return null;
                  const buildingOpen = searching ? true : !!expandedBuildings[building.name];
                  return (
                    <div key={building.name}>
                      {renderBuildingTopRow(building, modeled)}
                      {modeled &&
                        buildingOpen &&
                        modeled.areaTypes
                          .filter((at) => !searching || buildingMatches || at.name.toLowerCase().includes(q))
                          .map((at) => renderAreaTypeRow(building, at, "areaType"))}
                    </div>
                  );
                })
              : areaTypeGroups.map((group) => {
                  const groupMatches = group.areaTypeName.toLowerCase().includes(q);
                  const childMatches = group.instances.some((inst) => inst.building.name.toLowerCase().includes(q));
                  if (searching && !groupMatches && !childMatches) return null;
                  const groupOpen = searching ? true : !!expandedAreaTypeGroups[group.areaTypeName];
                  const groupSelected = !!selection.crossBuilding && selection.areaTypeName === group.areaTypeName;
                  return (
                    <div key={group.areaTypeName}>
                      <button
                        type="button"
                        className={[styles.treeRow, groupSelected ? styles.treeRowActive : ""].filter(Boolean).join(" ")}
                        onClick={() => selectCrossBuildingAreaType(group.areaTypeName)}
                        aria-expanded={groupOpen}
                      >
                        <span
                          className={[styles.treeRowCaret, groupOpen ? styles.treeRowCaretOpen : ""].filter(Boolean).join(" ")}
                          aria-hidden="true"
                        >
                          ▸
                        </span>
                        <span className={[styles.treeIconPlain, styles.treeIconPrimary].join(" ")}>
                          <i className="fa-solid fa-object-ungroup" aria-hidden="true" />
                        </span>
                        <span className={styles.treeRowBody}>
                          <span className={styles.treeRowName}>{group.areaTypeName}</span>
                          <span className={styles.treeRowMeta}>
                            <span>
                              {group.instances.length} building{group.instances.length === 1 ? "" : "s"}
                            </span>
                            <span>•</span>
                            <span>{group.totalAreas} areas</span>
                          </span>
                        </span>
                      </button>
                      {groupOpen &&
                        group.instances
                          .filter((inst) => !searching || groupMatches || inst.building.name.toLowerCase().includes(q))
                          .map((inst) => renderAreaTypeRow(inst.building, inst.areaType, "building"))}
                    </div>
                  );
                })}
          </nav>
        </aside>

        <main className={styles.content} ref={contentRef}>
          {breadcrumbLabel && (
            <div className={styles.contentBreadcrumbRow}>
              <p className={styles.breadcrumb}>{breadcrumbLabel}</p>
              <Button variant="secondary" theme="light" onClick={openScopeModal}>
                View Scope for this Area
              </Button>
            </div>
          )}
          <div className={styles.contentHeaderRow}>
            {isSiteLevel ? (
              <div className={styles.contentHeaderIdentity}>
                <img src={siteInfo.logo} alt="" className={styles.contentHeaderLogo} />
                <span className={styles.contentHeaderIdentityBody}>
                  <h1 className={styles.contentTitle}>{siteInfo.client}</h1>
                  <span className={styles.contentHeaderSub}>{siteInfo.siteName}</span>
                </span>
              </div>
            ) : (
              <h1 className={styles.contentTitle}>
                {selectedArea?.displayName ?? selectedAreaType?.name ?? selectedBuilding!.name}
              </h1>
            )}
            {!breadcrumbLabel && (
              <Button variant="secondary" theme="light" onClick={openScopeModal}>
                View Scope for this Site
              </Button>
            )}
          </div>
          {isSiteLevel ? (
            <div className={styles.contentHeaderMetaRow}>
              <p className={styles.contentHeaderMeta}>
                <span className={styles.treeRowMetaItem}>
                  <i className="fa-solid fa-building" aria-hidden="true" /> Buildings: {siteContractStats.buildings}
                </span>
                <span>•</span>
                <span className={styles.treeRowMetaItem}>
                  <i className="fa-solid fa-layer-group" aria-hidden="true" /> Floors: {siteFloorCount}
                </span>
                <span>•</span>
                <span className={styles.treeRowMetaItem}>
                  <i className="fa-solid fa-object-ungroup" aria-hidden="true" /> Area Types: {siteContractStats.areaTypes}
                </span>
                <span>•</span>
                <span className={styles.treeRowMetaItem}>
                  <i className="fa-solid fa-vector-square" aria-hidden="true" /> Areas: {siteContractStats.areas}
                </span>
              </p>
              {renderPerformanceToggle()}
            </div>
          ) : hasHeaderMeta ? (
            <div className={styles.contentHeaderMetaRow}>
              <p className={styles.contentHeaderMeta}>
                <span className={styles.treeRowMetaItem}>
                  <i className="fa-solid fa-layer-group" aria-hidden="true" /> Floors: {metaFloorCount}
                </span>
                <span>•</span>
                <span className={styles.treeRowMetaItem}>
                  <i className="fa-solid fa-vector-square" aria-hidden="true" /> Areas: {metaAreaCount}
                </span>
              </p>
              {renderPerformanceToggle()}
            </div>
          ) : (
            <div className={styles.contentHeaderMetaRow}>
              <span />
              {renderPerformanceToggle()}
            </div>
          )}

          <hr className={styles.sectionDivider} />

          <div className={[sharedStyles.sectionStack, styles.sectionStackTight].join(" ")}>
                {/* Performance: today's Snapshot (the three metric cards), or a
                    Trend view of daily progress over the past week/month. Same
                    pattern site-wide as it is for a single building/area type —
                    just fed the whole site's aggregate numbers when nothing in
                    the tree is selected. */}
                {!performanceCollapsed && (
                <div className={sharedStyles.section}>
                  <div className={styles.performanceSectionHeader}>
                    <div className={styles.workControlsLeft}>
                      <ButtonGroup
                        options={STATS_VIEW_OPTIONS}
                        value={statsView}
                        onChange={setStatsView}
                        variant="segmented"
                        aria-label="Performance view"
                      />
                      {statsView === "trend" && <TrendRangeToggle trendRange={trendRange} setTrendRange={setTrendRange} />}
                    </div>
                  </div>

                  {(statsView === "snapshot" ? (
                    <div className={styles.metricCardRow}>
                      <Card theme="light" className={styles.metricCard}>
                        <div className={styles.metricCardTop}>
                          <span className={styles.metricCardLabel}>Service Coverage</span>
                          <div className={styles.metricCardValueRow}>
                            <DonutRing percent={coveragePercent} color="var(--color-primary-500)" />
                            <span className={styles.metricCardValue}>{Math.round(coveragePercent)}%</span>
                          </div>
                        </div>
                        <span className={styles.metricCardDescription}>
                          {coverageServicedToday}/{coverageExpected} Services Covered
                        </span>
                      </Card>

                      <Card theme="light" className={styles.metricCard}>
                        <div className={styles.metricCardTop}>
                          <span className={styles.metricCardLabel}>Hours Captured</span>
                          <div className={styles.metricCardValueRow}>
                            <DonutRing percent={hoursCaptured.percent} color="var(--color-datavis-purple-500)" />
                            <span className={styles.metricCardValue}>{hoursCaptured.percent}%</span>
                          </div>
                        </div>
                        <span className={styles.metricCardDescription}>
                          {hoursCaptured.capturedLabel} of {hoursCaptured.paidLabel} paid
                        </span>
                      </Card>

                      <Card theme="light" className={styles.metricCard}>
                        <div className={styles.metricCardTop}>
                          <span className={styles.metricCardLabel}>Average Audit Score</span>
                          <span className={styles.metricCardScoreChip}>{auditSummary.avgScore.toFixed(2)}</span>
                        </div>
                        <span className={styles.metricCardDescription}>
                          Across {auditSummary.totalAudits} audits · {auditSummary.jointAudits} joint with {siteInfo.client}
                        </span>
                      </Card>
                    </div>
                  ) : (
                    <div className={styles.metricCardRow}>
                      <MetricTrendCard
                        label="Service Coverage"
                        series={coverageTrendSeries}
                        formatValue={(v) => `${Math.round(v)}%`}
                        dayOffset={dayOffset}
                        color="var(--color-primary-500)"
                        description={`${coverageServicedToday}/${coverageExpected} Services Covered`}
                      />
                      <MetricTrendCard
                        label="Hours Captured"
                        series={hoursCapturedTrendSeries}
                        formatValue={(v) => `${Math.round(v)}%`}
                        dayOffset={dayOffset}
                        color="var(--color-datavis-purple-500)"
                        description={`${hoursCaptured.capturedLabel} of ${hoursCaptured.paidLabel} paid`}
                      />
                      <MetricTrendCard
                        label="Average Audit Score"
                        series={auditScoreTrendSeries}
                        formatValue={(v) => v.toFixed(2)}
                        dayOffset={dayOffset}
                        color="var(--color-success-700)"
                        description={`Across ${auditSummary.totalAudits} audits · ${auditSummary.jointAudits} joint with ${siteInfo.client}`}
                        chip
                      />
                    </div>
                  ))}
                </div>
                )}

          </div>

          {/* Collapsed shows just the one divider above (already separating
              the header meta from whatever's next) — a second one right
              after it, with nothing in between, would read as two lines
              instead of one. */}
          {!performanceCollapsed && <hr className={styles.sectionDivider} />}

          <div className={[sharedStyles.sectionStack, styles.sectionStackTight].join(" ")}>
                {/* Work: All / Verifications / Audits filter pills, then
                    View by / Filter / Sort plus a Grid / List segmented
                    control, then the evidence grid itself. */}
                <div className={[sharedStyles.section, styles.workSectionGap].join(" ")}>
                  <ButtonGroup
                    options={TYPE_OPTIONS}
                    value={activityFilter}
                    onChange={(v) => setActivityFilter(v)}
                    aria-label="Filter by activity type"
                  />

                  <div className={styles.workControlsRow}>
                    <div className={styles.filterFieldGroup}>
                      <DsSelect
                        label="View by"
                        value={cardGranularity}
                        onChange={(v) => setCardGranularity(v as CardGranularity)}
                        options={availableCardGranularityOptions.map((o) => ({ value: o.id, label: o.label }))}
                        ariaLabel="View evidence by area type, area, element, or service"
                      />
                      <DsSelect
                        label="Filter"
                        value={taskTypeFilter}
                        onChange={setTaskTypeFilter}
                        options={SERVICE_FILTER_OPTIONS}
                        ariaLabel="Filter by service type"
                      />
                      <DsSelect
                        label="Sort"
                        value={sortOrder}
                        onChange={(v) => setSortOrder(v as SortOrder)}
                        options={SORT_OPTIONS.map((s) => ({ value: s.id, label: s.label }))}
                        ariaLabel="Sort evidence"
                      />
                    </div>
                    <ButtonGroup
                      options={VIEW_MODE_OPTIONS}
                      value={viewMode}
                      onChange={setViewMode}
                      variant="segmented"
                      aria-label="Grid or list view"
                    />
                  </div>

                  {gridCards.length === 0 ? (
                    <p className={styles.emptyNote}>
                      No evidence available here — try clearing filters, or select an area type in the tree.
                    </p>
                  ) : viewMode === "grid" ? (
                    <div className={styles.workCardGrid}>
                      {gridCards.map((data) => (
                        <WorkCard key={data.key} data={data} />
                      ))}
                    </div>
                  ) : cardGranularity === "areaType" ? (
                    <AreaTypeListTable items={gridCards} onSelect={(building, name) => selectAreaType(building, name)} />
                  ) : cardGranularity === "area" ? (
                    <AreaListTable
                      items={gridCards}
                      onSelect={(building, areaTypeName, areaId) => selectArea(building, areaTypeName, areaId)}
                    />
                  ) : cardGranularity === "service" ? (
                    <ServiceListTable items={gridCards} onView={setViewedServiceItem} showAreaColumn={!selectedArea} />
                  ) : (
                    <ActivityList items={gridCards} />
                  )}
                </div>
          </div>
        </main>
      </div>

      <Modal
        open={scopeModalOpen}
        onClose={() => setScopeModalOpen(false)}
        theme="light"
        title={
          isSiteLevel
            ? `Scope for ${siteInfo.client} — ${siteInfo.siteName}`
            : `Scope for ${selectedArea?.displayName ?? selectedAreaType?.name ?? selectedBuilding?.name ?? ""}${
                selection.crossBuilding ? " — All Buildings" : ""
              }`
        }
      >
        {selectedArea && (
          <p className={styles.emptyNote}>
            {selectedArea.displayName} · Floor {selectedArea.floor} ({selectedArea.floorDescription}) — same
            contracted tasks as every {selectedAreaType?.name} area.
          </p>
        )}
        {scopeAccordionItems.length === 0 ? (
          <p className={styles.emptyNote}>No detailed task list available for this selection.</p>
        ) : (
          <Accordion theme="light" items={scopeAccordionItems} openIds={openScopeIds} onToggle={toggleScopeItem} />
        )}
      </Modal>

      <Modal open={!!viewedServiceItem} onClose={() => setViewedServiceItem(null)} theme="light" title={viewedServiceItem?.location}>
        {viewedServiceItem && (
          <>
            {viewedServiceItem.photo ? (
              <img src={viewedServiceItem.photo} alt="" className={styles.serviceViewPhoto} />
            ) : (
              <p className={styles.emptyNote}>No photo available for this service.</p>
            )}
            <p className={styles.emptyNote}>
              {viewedServiceItem.title} by {viewedServiceItem.personName} · Score {viewedServiceItem.score.toFixed(2)} ·{" "}
              {viewedServiceItem.timeAgo}
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}

/** Compact table read on the Activity evidence feed — the "List" alternative to WorkCard's photo grid. */
function ActivityList({ items }: { items: WorkCardData[] }) {
  return (
    <Card theme="light" className={sharedStyles.tableWrap}>
      <table className={sharedStyles.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Location</th>
            <th>Person</th>
            <th>Score</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <td>{item.title}</td>
              <td>{item.location ?? "—"}</td>
              <td>
                {item.personName ? (
                  <div className={sharedStyles.personCell}>
                    <img src={item.personAvatar} alt="" className={sharedStyles.avatar} />
                    <span className={sharedStyles.personCellName}>{item.personName}</span>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td>{item.score.toFixed(2)}</td>
              <td>{item.timeAgo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/**
 * "View by: Area Type" + List — a dedicated table (Figma fileKey
 * SWFMjlBJ4u9vSrVaomRe12, node 118:17921) rather than ActivityList's
 * generic columns: Area Type (+ area count), Last Serviced, Avg Score,
 * Total Services, an Expected Services progress bar, and an Areas
 * Serviced progress bar (checked once every area's had at least one
 * service today). Areas Serviced has no real per-area tracking in this
 * dataset — it's a deterministic seeded stand-in, same spirit as the
 * Element grid's fabricated fixture counts. Every row is clickable
 * (and keyboard-operable) to drill into that area type, same
 * destination as clicking it in the sidebar tree.
 */
type AreaTypeSortKey = "areaType" | "lastServiced" | "avgScore" | "totalsServices" | "expectedServices" | "areasServiced";

function areaTypeSortValue(item: WorkCardData, key: AreaTypeSortKey): string | number {
  const areaCount = item.areaCount ?? 0;
  switch (key) {
    case "areaType":
      return item.title;
    case "lastServiced":
      return TIME_AGO_OPTIONS.indexOf(item.timeAgo);
    case "avgScore":
      return item.score;
    case "totalsServices":
      return item.progress?.servicedToday ?? 0;
    case "expectedServices":
      return item.progress?.percent ?? 0;
    case "areasServiced":
      return areaCount > 0 ? (item.areasServicedCount ?? 0) / areaCount : 0;
  }
}

function AreaTypeListTable({ items, onSelect }: { items: WorkCardData[]; onSelect: (building: string, name: string) => void }) {
  const [sortState, setSortState] = useState<SortState<AreaTypeSortKey>>(null);
  const sortedItems = useMemo(() => sortByValue(items, sortState, areaTypeSortValue), [items, sortState]);
  const onSort = (key: AreaTypeSortKey) => setSortState((prev) => toggleSort(key, prev));

  return (
    <div className={styles.areaTypeTableWrap}>
      <div className={[styles.areaTypeTableHeaderRow, styles.cols6].join(" ")}>
        <SortableHeaderCell label="Area Type" columnKey="areaType" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Last Serviced" columnKey="lastServiced" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Avg Score" columnKey="avgScore" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Totals Services" columnKey="totalsServices" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Expected Services" columnKey="expectedServices" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Areas Serviced" columnKey="areasServiced" sortState={sortState} onSort={onSort} />
      </div>

      <div className={styles.areaTypeTableRows}>
        {sortedItems.map((item) => {
          const areaCount = item.areaCount ?? 0;
          const areasServicedCount = item.areasServicedCount ?? 0;
          const expectedPercent = Math.min(100, item.progress?.percent ?? 0);
          const areasServicedPercent = areaCount > 0 ? Math.min(100, (areasServicedCount / areaCount) * 100) : 0;
          const fullyServiced = areaCount > 0 && areasServicedCount >= areaCount;
          return (
            <div
              key={item.key}
              className={[styles.areaTypeTableRow, styles.cols6].join(" ")}
              tabIndex={0}
              role="button"
              aria-label={`View ${item.title}`}
              onClick={() => onSelect(item.building ?? "", item.title)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item.building ?? "", item.title);
                }
              }}
            >
              <span className={styles.areaTypeTableNameCell}>
                <span className={styles.areaTypeTableName}>{item.title}</span>
                <span className={styles.areaTypeTableNameSub}>
                  {areaCount} Area{areaCount === 1 ? "" : "s"}
                </span>
              </span>

              <span className={styles.areaTypeTableCellText}>{item.timeAgo}</span>

              <span>
                <span className={styles.areaTypeTableScoreChip}>{item.score.toFixed(1)}</span>
              </span>

              <span className={styles.areaTypeTableCellTextMedium}>{item.progress?.servicedToday ?? 0}</span>

              <span>
                <span className={styles.areaTypeTableProgressTrack}>
                  <span className={styles.areaTypeTableProgressFill} style={{ width: `${expectedPercent}%` }}>
                    <span className={styles.areaTypeTableProgressLabel}>
                      {item.progress?.servicedToday ?? 0} of {item.progress?.expected ?? 0}
                    </span>
                  </span>
                </span>
              </span>

              <span>
                <span className={styles.areaTypeTableProgressTrack}>
                  <span
                    className={[styles.areaTypeTableProgressFill, styles.areaTypeTableProgressFillSuccess].join(" ")}
                    style={{ width: `${areasServicedPercent}%` }}
                  >
                    <span className={styles.areaTypeTableProgressLabel}>
                      {areasServicedCount} of {areaCount}
                      {fullyServiced && (
                        <i className={["fa-solid fa-check", styles.areaTypeTableCheck].join(" ")} aria-hidden="true" />
                      )}
                    </span>
                  </span>
                </span>
              </span>

              <span className={styles.areaTypeTableArrowCell}>
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "View by: Area" + List — Figma fileKey SWFMjlBJ4u9vSrVaomRe12, node
 * 118:19385. Same row-card pattern as AreaTypeListTable, minus the
 * Areas Serviced column (a single area has no further area-count
 * breakdown), and the name cell's subtitle is a "Building • Area
 * Type" breadcrumb (grey, with a lighter neutral-500 bullet) instead
 * of an area count. Rows click through to that specific area, same
 * destination as clicking it in the sidebar tree.
 */
type AreaSortKey = "area" | "lastServiced" | "avgScore" | "totalsServices" | "expectedServices";

function areaSortValue(item: WorkCardData, key: AreaSortKey): string | number {
  switch (key) {
    case "area":
      return item.title;
    case "lastServiced":
      return TIME_AGO_OPTIONS.indexOf(item.timeAgo);
    case "avgScore":
      return item.score;
    case "totalsServices":
      return item.progress?.servicedToday ?? 0;
    case "expectedServices":
      return item.progress?.percent ?? 0;
  }
}

function AreaListTable({
  items,
  onSelect,
}: {
  items: WorkCardData[];
  onSelect: (building: string, areaTypeName: string, areaId: string) => void;
}) {
  const [sortState, setSortState] = useState<SortState<AreaSortKey>>(null);
  const sortedItems = useMemo(() => sortByValue(items, sortState, areaSortValue), [items, sortState]);
  const onSort = (key: AreaSortKey) => setSortState((prev) => toggleSort(key, prev));

  return (
    <div className={styles.areaTypeTableWrap}>
      <div className={[styles.areaTypeTableHeaderRow, styles.cols5].join(" ")}>
        <SortableHeaderCell label="Area" columnKey="area" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Last Serviced" columnKey="lastServiced" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Avg Score" columnKey="avgScore" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Totals Services" columnKey="totalsServices" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Expected Services" columnKey="expectedServices" sortState={sortState} onSort={onSort} />
      </div>

      <div className={styles.areaTypeTableRows}>
        {sortedItems.map((item) => {
          const expectedPercent = Math.min(100, item.progress?.percent ?? 0);
          return (
            <div
              key={item.key}
              className={[styles.areaTypeTableRow, styles.cols5].join(" ")}
              tabIndex={0}
              role="button"
              aria-label={`View ${item.title}`}
              onClick={() => onSelect(item.building ?? "", item.areaTypeName ?? "", item.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item.building ?? "", item.areaTypeName ?? "", item.key);
                }
              }}
            >
              <span className={styles.areaTypeTableNameCell}>
                <span className={styles.areaTypeTableName}>{item.title}</span>
                <span className={styles.areaTableNameSub}>
                  <span>{item.building}</span>
                  <span className={styles.areaTableNameSubDot}>•</span>
                  <span>{item.areaTypeName}</span>
                </span>
              </span>

              <span className={styles.areaTypeTableCellText}>{item.timeAgo}</span>

              <span>
                <span className={styles.areaTypeTableScoreChip}>{item.score.toFixed(1)}</span>
              </span>

              <span className={styles.areaTypeTableCellTextMedium}>{item.progress?.servicedToday ?? 0}</span>

              <span>
                <span className={styles.areaTypeTableProgressTrack}>
                  <span className={styles.areaTypeTableProgressFill} style={{ width: `${expectedPercent}%` }}>
                    <span className={styles.areaTypeTableProgressLabel}>
                      {item.progress?.servicedToday ?? 0} of {item.progress?.expected ?? 0}
                    </span>
                  </span>
                </span>
              </span>

              <span className={styles.areaTypeTableArrowCell}>
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "View by: Service" + List — Figma fileKey SWFMjlBJ4u9vSrVaomRe12,
 * node 118:17045 (columns) and node 118:20809 (icon/color + Area/Area
 * Type treatment, shared with WorkCard's Grid "Service" variant via
 * iconForServiceTag/colorForServiceTag). No row navigation — a single
 * service instance isn't a node in the sidebar tree — "View" instead
 * opens that event's own captured photo.
 */
type ServiceSortKey = "area" | "serviceType" | "employeeName" | "score" | "end" | "serviced" | "start";

function serviceSortValue(item: WorkCardData, key: ServiceSortKey): string | number {
  switch (key) {
    case "area":
      return item.areaDisplayName ?? item.location ?? "";
    case "serviceType":
      return item.title;
    case "employeeName":
      return item.personName ?? "";
    case "score":
      return item.score;
    case "end":
      return parseTimeLabelToMinutes(item.endLabel ?? "");
    case "serviced":
      return parseDurationLabelToSeconds(item.servicedLabel ?? "");
    case "start":
      return parseTimeLabelToMinutes(item.startLabel ?? "");
  }
}

function ServiceListTable({
  items,
  onView,
  showAreaColumn = true,
}: {
  items: WorkCardData[];
  onView: (item: WorkCardData) => void;
  /** False when the sidebar tree already has one specific area selected — every row would repeat the same area, so the column is redundant. */
  showAreaColumn?: boolean;
}) {
  const rowColsClass = showAreaColumn ? styles.cols7 : styles.cols6Service;
  const [sortState, setSortState] = useState<SortState<ServiceSortKey>>(null);
  const sortedItems = useMemo(() => sortByValue(items, sortState, serviceSortValue), [items, sortState]);
  const onSort = (key: ServiceSortKey) => setSortState((prev) => toggleSort(key, prev));

  return (
    <div className={styles.areaTypeTableWrap}>
      <div className={[styles.areaTypeTableHeaderRow, rowColsClass].join(" ")}>
        {showAreaColumn && <SortableHeaderCell label="Area" columnKey="area" sortState={sortState} onSort={onSort} />}
        <SortableHeaderCell label="Service Type" columnKey="serviceType" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Employee Name" columnKey="employeeName" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Score" columnKey="score" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="End" columnKey="end" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Serviced" columnKey="serviced" sortState={sortState} onSort={onSort} />
        <SortableHeaderCell label="Start" columnKey="start" sortState={sortState} onSort={onSort} />
      </div>

      <div className={styles.areaTypeTableRows}>
        {sortedItems.map((item) => (
          <div key={item.key} className={[styles.areaTypeTableRow, rowColsClass].join(" ")}>
            {showAreaColumn && (
              <span className={styles.areaTypeTableNameCell}>
                <span className={styles.areaTypeTableName}>{item.areaDisplayName ?? item.location}</span>
                {item.areaTypeName && <span className={styles.serviceTableAreaTypeSub}>{item.areaTypeName}</span>}
              </span>
            )}

            <span className={styles.serviceTypeCell}>
              {item.serviceIcon && (
                <i
                  className={[item.serviceIcon, styles.serviceTypeIcon].join(" ")}
                  style={item.serviceIconColor ? { color: item.serviceIconColor } : undefined}
                  aria-hidden="true"
                />
              )}
              <span className={styles.serviceTypeLabel}>{item.title}</span>
            </span>

            <span className={styles.employeeCell}>
              <img src={item.personAvatar} alt="" className={styles.employeeAvatar} />
              <span className={styles.employeeInfo}>
                <span className={styles.employeeName}>{item.personName}</span>
                {item.personRole && <span className={styles.employeeSub}>{item.personRole}</span>}
              </span>
            </span>

            <span>
              <span className={styles.areaTypeTableScoreChip}>{item.score.toFixed(1)}</span>
            </span>

            <span className={styles.areaTypeTableCellTextMedium}>{item.endLabel}</span>

            <span className={styles.areaTypeTableCellText}>{item.servicedLabel}</span>

            <span className={styles.areaTypeTableCellTextMedium}>{item.startLabel}</span>

            <button type="button" className={styles.serviceTableViewLink} onClick={() => onView(item)}>
              <i className="fa-solid fa-image" aria-hidden="true" />
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One evidence card, reshaped per the "View by" granularity — Figma's
 * Area / Area Type / Element / Service card variants (fileKey
 * SWFMjlBJ4u9vSrVaomRe12, node 100:21953). All four share the same
 * photo + time-ago badge; what's below it differs:
 *  - Area / Area Type: title + score, an "N of M Expected Services"
 *    progress bar, and a captured-time footer.
 *  - Element: just title (name + count) + score — no progress data
 *    exists at that grain, so the card is naturally shorter.
 *  - Service: a leading task-type icon, title + the specific area
 *    it happened in, who captured it, and a captured-time footer —
 *    no progress bar (a single event doesn't have one).
 */
function WorkCard({ data }: { data: WorkCardData }) {
  return (
    <Card theme="light" className={styles.workCard}>
      <div className={styles.workCardPhotoWrap}>
        {data.photo ? (
          <img src={data.photo} alt="" className={styles.workCardPhoto} />
        ) : (
          <div className={styles.workCardPhotoPlaceholder} aria-hidden="true">
            No photo
          </div>
        )}
        <span className={styles.workCardTimeBadge}>{data.timeAgo}</span>
      </div>
      <div className={styles.workCardBody}>
        {data.variant === "service" ? (
          <>
            <div className={styles.workCardServiceHeaderRow}>
              {data.serviceIcon && (
                <i
                  className={[data.serviceIcon, styles.workCardServiceIcon].join(" ")}
                  style={data.serviceIconColor ? { color: data.serviceIconColor } : undefined}
                  aria-hidden="true"
                />
              )}
              <span className={styles.workCardServiceTitleGroup}>
                <span className={styles.workCardTag}>{data.title}</span>
              </span>
              <span className={styles.workCardScore}>{data.score.toFixed(2)}</span>
            </div>

            {(data.areaDisplayName || data.areaTypeName) && (
              <span className={styles.workCardAreaLine}>
                {data.areaDisplayName && <span>{data.areaDisplayName}</span>}
                {data.areaDisplayName && data.areaTypeName && <span className={styles.workCardAreaLineDot}>•</span>}
                {data.areaTypeName && <span>{data.areaTypeName}</span>}
              </span>
            )}

            <div className={styles.workCardServiceFooterRow}>
              {data.personName && (
                <span className={styles.workCardPerson}>
                  <img src={data.personAvatar} alt="" className={sharedStyles.avatarSmall} />
                  {data.personName}
                </span>
              )}
              {data.capturedLabel && !data.title.includes("Audit") && (
                <span className={styles.workCardFooterRow}>
                  <i className="fa-regular fa-clock" aria-hidden="true" />
                  {data.capturedLabel}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={styles.workCardHeaderRow}>
              <span className={styles.workCardTag}>{data.title}</span>
              <span className={styles.workCardScore}>{data.score.toFixed(2)}</span>
            </div>

            {data.progress && (
              <>
                <div className={styles.workCardProgressLine}>
                  <span className={styles.workCardProgressLabel}>
                    {data.progress.servicedToday} of {data.progress.expected} Expected Services
                  </span>
                  <span className={styles.workCardProgressPercent}>{Math.round(data.progress.percent)}%</span>
                </div>
                <span className={styles.workCardProgressTrack}>
                  <span className={styles.workCardProgressFill} style={{ width: `${Math.min(100, data.progress.percent)}%` }} />
                </span>
              </>
            )}

            {data.capturedLabel && (
              <span className={styles.workCardFooterRow}>
                <i className="fa-regular fa-clock" aria-hidden="true" />
                {data.capturedLabel}
              </span>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

/** The Week/Month range toggle shared by TrendSection's own header (site level) and the per-node Performance header (building/area-type/area level). */
function TrendRangeToggle({ trendRange, setTrendRange }: { trendRange: TrendRange; setTrendRange: (r: TrendRange) => void }) {
  return (
    <div className={sharedStyles.chipRow}>
      <button
        type="button"
        className={[sharedStyles.chip, trendRange === "week" ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
        data-theme="light"
        onClick={() => setTrendRange("week")}
      >
        Week
      </button>
      <button
        type="button"
        className={[sharedStyles.chip, trendRange === "month" ? sharedStyles.chipActive : ""].filter(Boolean).join(" ")}
        data-theme="light"
        onClick={() => setTrendRange("month")}
      >
        Month
      </button>
    </div>
  );
}

/**
 * One metric's own trend line, styled to match its Snapshot metric
 * card (same label/value/description layout) so switching between
 * the Performance section's Snapshot and Trend views feels like one
 * continuous read rather than a different widget. `formatValue`
 * keeps this generic across a percent metric (Service Coverage,
 * Hours Captured) and a 0–5 score metric (Average Audit Score).
 */
function MetricTrendCard({
  label,
  series,
  formatValue,
  dayOffset,
  color,
  description,
  chip = false,
}: {
  label: string;
  series: number[];
  formatValue: (value: number) => string;
  dayOffset: number;
  color: string;
  description: ReactNode;
  chip?: boolean;
}) {
  const first = series[0];
  const last = series[series.length - 1];
  const delta = Number((last - first).toFixed(2));
  const direction = delta < 0 ? "down" : "up";
  const endLabel = formatShortDayLabel(dayOffset);
  const startLabel = formatShortDayLabel(dayOffset + series.length - 1);
  // Per-point day labels, oldest first — same offset math that built
  // `series` itself, so the hover tooltip's day always lines up with
  // the value under the cursor.
  const dayLabels = series.map((_, i) => formatShortDayLabel(dayOffset + (series.length - 1 - i)));

  return (
    <Card theme="light" className={styles.metricCard}>
      <div className={styles.metricCardTop}>
        <span className={styles.metricCardLabel}>{label}</span>
        <div className={styles.metricCardTrendValueRow}>
          {chip ? (
            <span className={styles.metricCardScoreChip}>{formatValue(last)}</span>
          ) : (
            <span className={styles.metricCardValue}>{formatValue(last)}</span>
          )}
          <span
            className={[styles.metricCardTrendRow, direction === "down" ? styles.metricCardTrendDown : styles.metricCardTrendUp].join(
              " "
            )}
          >
            <i
              className={["fa-solid", direction === "down" ? "fa-arrow-trend-down" : "fa-arrow-trend-up", styles.metricCardTrendIcon].join(
                " "
              )}
              aria-hidden="true"
            />
            {direction === "down" ? "−" : "+"}
            {formatValue(Math.abs(delta))} over last {series.length} days
          </span>
        </div>
      </div>
      <span className={styles.metricCardDescription}>{description}</span>
      <Sparkline values={series} color={color} height={48} interactive labels={dayLabels} valueFormatter={formatValue} />
      <div className={styles.trendAxis}>
        <span>
          {startLabel} ({formatValue(first)})
        </span>
        <span>{endLabel}</span>
      </div>
    </Card>
  );
}
