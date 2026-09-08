"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SowNav } from "./SowNav";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { ButtonGroup, type ButtonGroupOption } from "../ui/ButtonGroup";
import { DsSelect } from "../ui/Select";
import { SearchIcon, CaretLeftIcon, CaretRightIcon } from "./icons";
import { OurTeamSection, ServiceTimesSection } from "./ComplianceAcknowledgementTeam";
import {
  facilitySummary,
  recentVerifications,
  recentAudits,
  verificationToActivity,
  auditToActivity,
  hashSeed,
  scaleForDay,
  scoreForDay,
  hoursCapturedForNode,
  type ActivityItem,
  type ActivityKind,
  type TimeTrendGranularity,
} from "../../lib/sowData";
import { areaTypePhotos, photoForAreaType } from "../../lib/sowImages";
import type { ContractBuilding, ContractArea, ContractTaskDef } from "../../lib/sowContract";
import type { RosterPerson } from "../../lib/csv";
import styles from "./ComplianceAcknowledgementPage.module.css";

export type ComplianceAcknowledgementPageProps = {
  associates: RosterPerson[];
  managers: RosterPerson[];
  contractBuildings: ContractBuilding[];
};

export type ComplianceAcknowledgementTab = "spaces" | "team" | "serviceTimes" | "charts";

const TABS: { id: ComplianceAcknowledgementTab; label: string; icon: string }[] = [
  { id: "spaces", label: "Your Spaces", icon: "fa-building" },
  { id: "team", label: "Our Team", icon: "fa-people-group" },
  { id: "serviceTimes", label: "Service Times", icon: "fa-clock" },
  { id: "charts", label: "Charts", icon: "fa-chart-simple" },
];

/**
 * ComplianceAcknowledgementPage — "Your Spaces / Our Team / Service Times"
 * exploration, rebuilt to match the Figma "Area Types" frame
 * (fileKey 8GF1e4t6oVXOTAhw1WU8zQ, Tour Sites branch, node
 * 26408:15662) exactly: a full-bleed photo banner (the real
 * exported asset — public/scope-of-work-hero.png, not a CSS
 * gradient), a plain title/tabs bar below it, then a single
 * site-wide "today" read — a Recent Activity carousel, one
 * plain-language coverage sentence, and a photo-first grid of
 * every real area type on the site (data/SOW_DeltaLGA.csv, 40 area
 * types/714 areas across all 7 buildings, via lib/sowContract.ts).
 *
 * Every repeating "chip" control (All/Verifications/Audits, the
 * Area Types/Buildings/Areas counts) reuses the project's own
 * ButtonGroup pills component — the same visual Figma's "Filter
 * Button" component reduces to everywhere it appears — rather than
 * one-off markup, per the design system.
 *
 * Area type cards aggregate each area type's real areas/tasks
 * across every building that has it (e.g. "Offices" merges
 * Concourse D's, E's, etc. office areas into one card). Numbers are
 * illustrative — deterministic per area type and day via
 * lib/sowData.ts's scaleForDay/scoreForDay/hoursCapturedForNode
 * generators, same convention as every other Scope of Work
 * prototype in this project — except each area type's real area
 * count and task list, which come straight from the export. An
 * area type with zero contracted tasks in the export reads as
 * "0 of 0 expected services, 100%" and an N/A score rather than a
 * fabricated number.
 */
export function ComplianceAcknowledgementPage({ associates, managers, contractBuildings }: ComplianceAcknowledgementPageProps) {
  const [activeTab, setActiveTab] = useState<ComplianceAcknowledgementTab>("spaces");
  // Drilled into one Area Type's own areas — lifted up here (not local to
  // YourSpacesSection) since it changes the hero's own title/breadcrumb too.
  const [selectedAreaType, setSelectedAreaType] = useState<string | null>(null);

  // Date + Recent Activity filters now live in the sticky header (see
  // ComplianceAcknowledgementHero) rather than inside YourSpacesSection, so every card/
  // sentence that reads dayOffset and every control that sets it need a
  // shared source of truth at this level.
  const [dayOffset, setDayOffset] = useState(0);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [activityFilter, setActivityFilter] = useState<ActivityKind | "all">("all");
  const [positionFilter, setPositionFilter] = useState("all");
  // Non-empty exactly on a multi-day preset (week/month/etc.) — Our Team
  // reads this to switch its Total Time column to an average-per-day
  // figure instead of a single day's total.
  const rangeDayOffsets = useMemo(() => missedRangeDayOffsets(datePreset), [datePreset]);
  // Which Total Time Trend tab a row's modal should open on, so it feels
  // like a continuation of whatever the page itself is showing rather
  // than always resetting to Daily — "week" opens on Weekly, any month-
  // or-longer preset opens on Monthly (there's no 4th granularity for
  // 3/6/12 months, so Monthly is the closest, least-misleading fit).
  const trendDefaultGranularity: TimeTrendGranularity =
    datePreset === "week" ? "week" : datePreset === "today" || datePreset === "yesterday" ? "day" : "month";

  // "Today"/"Yesterday" drive the real single-day dayOffset every card on
  // this page reads from. The coarser presets have no real day-by-day
  // history behind them in this dataset, so they just show a real,
  // correctly-computed calendar range in the pill/title and leave dayOffset
  // (and everything derived from it) anchored on today — same convention
  // as SowHierarchyPage's own date preset menu.
  function selectDatePreset(preset: DatePreset) {
    setDatePreset(preset);
    if (preset === "today") {
      setDayOffset(0);
      return;
    }
    if (preset === "yesterday") {
      setDayOffset(1);
      return;
    }
    setDayOffset(0);
  }

  return (
    <div className={styles.page} data-theme="light">
      <div className={styles.stickyNav}>
        <SowNav current="complianceAcknowledgement" />
      </div>

      <ComplianceAcknowledgementHero
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedAreaType={activeTab === "spaces" ? selectedAreaType : null}
        onClearSelection={() => setSelectedAreaType(null)}
        dayOffset={dayOffset}
        onStepDay={setDayOffset}
        datePreset={datePreset}
        onSelectDatePreset={selectDatePreset}
        activityFilter={activityFilter}
        onActivityFilterChange={setActivityFilter}
        positionFilter={positionFilter}
        onPositionFilterChange={setPositionFilter}
      />

      <main className={[styles.main, activeTab === "team" ? styles.mainTeamSpacing : ""].filter(Boolean).join(" ")}>
        {activeTab === "spaces" && (
          <YourSpacesSection
            contractBuildings={contractBuildings}
            associates={associates}
            managers={managers}
            selectedAreaType={selectedAreaType}
            onSelectAreaType={setSelectedAreaType}
            dayOffset={dayOffset}
            datePreset={datePreset}
            onJumpToDay={setDayOffset}
            activityFilter={activityFilter}
            positionFilter={positionFilter}
          />
        )}
        {activeTab === "team" && (
          <OurTeamSection
            associates={associates}
            managers={managers}
            dayOffset={dayOffset}
            rangeDayOffsets={rangeDayOffsets}
            trendDefaultGranularity={trendDefaultGranularity}
          />
        )}
        {activeTab === "serviceTimes" && <ServiceTimesSection associates={associates} managers={managers} />}
        {activeTab === "charts" && <ChartsSection />}
      </main>
    </div>
  );
}

/* ---------------- Hero: real banner photo + plain title/tabs bar ---------------- */

function ComplianceAcknowledgementHero({
  activeTab,
  onTabChange,
  selectedAreaType,
  onClearSelection,
  dayOffset,
  onStepDay,
  datePreset,
  onSelectDatePreset,
  activityFilter,
  onActivityFilterChange,
  positionFilter,
  onPositionFilterChange,
}: {
  activeTab: ComplianceAcknowledgementTab;
  onTabChange: (tab: ComplianceAcknowledgementTab) => void;
  selectedAreaType: string | null;
  onClearSelection: () => void;
  dayOffset: number;
  onStepDay: (updater: (offset: number) => number) => void;
  datePreset: DatePreset;
  onSelectDatePreset: (preset: DatePreset) => void;
  activityFilter: ActivityKind | "all";
  onActivityFilterChange: (v: ActivityKind | "all") => void;
  positionFilter: string;
  onPositionFilterChange: (v: string) => void;
}) {
  // Transparent while the title bar still sits over the banner photo
  // (the overlap look), then picks up an opaque backdrop only once
  // scrolling actually locks it under the nav — otherwise the grid
  // scrolling underneath would show through its own gaps. sentinelRef
  // sits right where the bar's un-stuck position starts; once it
  // scrolls past the nav's bottom edge (rootMargin matches .titleBar's
  // sticky `top: 56px`), the bar counts as stuck.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting), {
      rootMargin: "-57px 0px 0px 0px",
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // The date preset popover — a lightweight menu, not a Modal, so it
  // manages its own outside-click/Escape dismissal (same idiom as
  // components/ui/Select.tsx's DsSelect and SowHierarchyPage's own date
  // preset menu).
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

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

  const isDayPreset = datePreset === "today" || datePreset === "yesterday";
  const datePickerLabel = isDayPreset ? formatDatePillLabel(dayOffset) : (rangeLabelForPreset(datePreset) ?? "Custom");
  // Drives the "{word} at LGA-LaGuardia, NY" title — every preset's own
  // menu label already reads as the right word ("Today", "Current Week",
  // "3 Months", ...), so the title just borrows it rather than deriving a
  // second, separate phrase.
  const titleDayWord = DATE_PRESET_OPTIONS.find((p) => p.id === datePreset)?.label ?? "Today";

  return (
    <>
      <div className={styles.bannerImageWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scope-of-work-hero.png" alt="" className={styles.bannerImage} />
        <div className={styles.bannerGradient} aria-hidden="true" />
      </div>

      <div ref={sentinelRef} aria-hidden="true" className={styles.stickySentinel} />

      <div
        className={[styles.titleBar, isStuck ? styles.titleBarStuck : "", activeTab === "team" ? styles.titleBarNotSticky : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.titleBlock}>
          {selectedAreaType && (
            <p className={styles.breadcrumb}>
              <button type="button" className={styles.breadcrumbLink} onClick={onClearSelection}>
                Scope of Work
              </button>{" "}
              / {selectedAreaType}
            </p>
          )}
          <h1 className={styles.heroTitle}>
            {selectedAreaType ?? `${titleDayWord} at LGA-LaGuardia, NY`}
          </h1>
        </div>

        <div className={styles.titleBarTabsRow}>
          <div className={styles.tabRow} role="tablist" aria-label="Scope of Work views">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={styles.tab}
                  onClick={() => onTabChange(tab.id)}
                >
                  <i
                    className={`fa-solid ${tab.icon}`}
                    style={{ color: active ? "var(--color-primary-500)" : "var(--color-neutral-500)" }}
                    aria-hidden="true"
                  />
                  <span className={styles.tabLabelStack}>
                    <span className={[styles.tabLabel, active ? styles.tabLabelActive : ""].filter(Boolean).join(" ")}>
                      {tab.label}
                    </span>
                    <span className={[styles.tabUnderline, active ? styles.tabUnderlineActive : ""].filter(Boolean).join(" ")} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.headerActions}>
            <button type="button" className={styles.viewUserHitsLink}>
              <i className="fa-solid fa-bullseye-arrow" aria-hidden="true" />
              View User Hits
            </button>
            <button type="button" className={styles.settingsButton} aria-label="Settings">
              <i className="fa-solid fa-gear" aria-hidden="true" />
            </button>
            <div className={styles.datePicker} ref={dateMenuRef}>
              {isDayPreset && (
                <button
                  type="button"
                  className={styles.datePickerCaret}
                  onClick={() => onStepDay((o) => Math.min(30, o + 1))}
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
                {datePickerLabel}
              </button>
              {isDayPreset && (
                <button
                  type="button"
                  className={styles.datePickerCaret}
                  onClick={() => onStepDay((o) => Math.max(0, o - 1))}
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
                      onClick={() => {
                        onSelectDatePreset(p.id);
                        setDateMenuOpen(false);
                      }}
                    >
                      {p.label}
                      {datePreset === p.id && (
                        <i className={["fa-solid fa-check", styles.dateMenuItemCheck].join(" ")} aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deliberately outside .titleBar (the sticky element above) — this
          row scrolls away with the page instead of staying pinned, so the
          sticky header stays just the title/tabs/date once the visitor
          scrolls past it. */}
      {activeTab === "spaces" && (
        <div className={styles.chipRowOuter}>
          <ButtonGroup
            options={ACTIVITY_FILTER_OPTIONS}
            value={activityFilter}
            onChange={onActivityFilterChange}
            aria-label="Activity type"
          />
          <DsSelect
            value={positionFilter}
            onChange={onPositionFilterChange}
            options={POSITION_FILTER_OPTIONS}
            ariaLabel="Filter by position"
          />
        </div>
      )}
    </>
  );
}

/* ---------------- Charts ---------------- */

/**
 * ChartsSection — placeholder for the new "Charts" tab. This dataset has
 * no real trend/history data behind it (see the component doc comment
 * above), so rather than fabricate a chart, this reads as an honest
 * "not built yet" state, styled like the rest of the page's empty states.
 */
function ChartsSection() {
  return (
    <Card className={styles.chartsPlaceholder}>
      <i className="fa-solid fa-chart-simple" aria-hidden="true" />
      <h2>Charts</h2>
      <p>Trend charts for this site are coming soon.</p>
    </Card>
  );
}

/* ---------------- Your Spaces ---------------- */

const ACTIVITY_FILTER_OPTIONS: ButtonGroupOption<ActivityKind | "all">[] = [
  { id: "all", label: "All", icon: <i className="fa-solid fa-check-double" aria-hidden="true" /> },
  { id: "verification", label: "Verifications", icon: <i className="fa-solid fa-badge-check" aria-hidden="true" /> },
  { id: "audit", label: "Audits", icon: <i className="fa-solid fa-clipboard-check" aria-hidden="true" /> },
];

/** "4.90" → "4.9", "5.00" → "5" — trims the trailing zeros scoreForDay's fixed 2-decimal output leaves behind, without a regex. */
function formatScore(score: number): string {
  return String(Math.round(score * 100) / 100);
}

/**
 * Real area type for the handful of recentVerifications/recentAudits
 * locations (lib/sowData.ts) that don't spell one out directly —
 * "Gate 72" has no " — " to split, and an audit's own head half
 * ("Internal Audit", "Joint Audit") is its classification, not an
 * area type. Keyed by the exact location string since this is a
 * small, fixed illustrative list, not a general parser.
 */
const AREA_TYPE_OVERRIDES: Record<string, string> = {
  "Gate 72": "Gates",
  "Internal Audit — Concourse F": "Corridors (Passenger)",
  "Joint Audit — Gate 72": "Gates",
};

/** Splits a "Restrooms (Passenger) — D2-201 Women's RR South" style location into its area-type head and specific-room tail, for the card's two-line title (small grey area type over a larger dark room name) — every activity resolves to a real area type, via AREA_TYPE_OVERRIDES for the few locations with no natural split. */
function splitLocation(location: string): { head: string; tail: string } {
  const dashIndex = location.indexOf(" — ");
  const naturalHead = dashIndex === -1 ? location : location.slice(0, dashIndex);
  const tail = dashIndex === -1 ? location : location.slice(dashIndex + 3);
  return { head: AREA_TYPE_OVERRIDES[location] ?? naturalHead, tail };
}

/** "1 minute ago" / "28 minutes ago" → "28 minutes" — the featured card's own byline already reads "{time} • {n} photos", so the trailing "ago" (kept on the top-left time badge, where it stands alone) would read redundant here. */
function stripAgoSuffix(timeAgo: string): string {
  return timeAgo.replace(/\s+ago$/i, "");
}

/** "serviced by" for verifications, "audited by" for audits — an auditor doesn't "service" a space. */
function servicedByVerb(kind: ActivityKind): string {
  return kind === "audit" ? "audited by" : "serviced by";
}

/** Every Recent Activity score badge (verification or audit) uses this smaller, dark green treatment. */
function scoreBadgeClassName(): string {
  return [styles.scoreBadge, styles.scoreBadgeAudit].join(" ");
}

/**
 * FeaturedActivityCard — the large left-hand card in the new Recent
 * Activity layout: a real per-photo carousel (prev/next + dot rail)
 * over that area type's own photo set (lib/sowImages.ts), rather than
 * a single static shot. Dot/arrow count is the real number of photos
 * on file for the area type — this project favors a real, if smaller,
 * count over a fabricated one (see the component doc comment above).
 */
function FeaturedActivityCard({ item }: { item: ActivityItem }) {
  const { head, tail } = splitLocation(item.location);
  const photos = areaTypePhotos(head);
  const [photoIndex, setPhotoIndex] = useState(0);
  const hasMultiplePhotos = photos.length > 1;
  const activePhoto = photos[photoIndex % Math.max(photos.length, 1)] ?? item.areaPhoto;

  function stepPhoto(direction: 1 | -1) {
    setPhotoIndex((i) => (i + direction + photos.length) % photos.length);
  }

  return (
    <Card className={styles.featuredActivityCard}>
      <span className={styles.activityTimeBadge}>{item.timeAgo}</span>

      {activePhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={activePhoto} alt="" className={styles.featuredActivityPhoto} />
      ) : (
        <div className={styles.activityPhotoPlaceholder}>
          <i className="fa-solid fa-image" aria-hidden="true" />
        </div>
      )}

      {hasMultiplePhotos && (
        <>
          <button
            type="button"
            className={[styles.featuredCarouselButton, styles.featuredCarouselButtonPrev].join(" ")}
            onClick={() => stepPhoto(-1)}
            aria-label="Previous photo"
          >
            <CaretLeftIcon />
          </button>
          <button
            type="button"
            className={[styles.featuredCarouselButton, styles.featuredCarouselButtonNext].join(" ")}
            onClick={() => stepPhoto(1)}
            aria-label="Next photo"
          >
            <CaretRightIcon />
          </button>
          <div className={styles.featuredCarouselDots} role="tablist" aria-label="Photo">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={i === photoIndex}
                aria-label={`Photo ${i + 1}`}
                className={[styles.featuredCarouselDot, i === photoIndex ? styles.featuredCarouselDotActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setPhotoIndex(i)}
              />
            ))}
          </div>
        </>
      )}

      <div className={styles.featuredActivityCaption}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.personAvatar} alt="" className={styles.featuredActivityAvatar} />
        <div className={styles.featuredActivityCaptionText}>
          <p className={styles.featuredActivityCaptionTitle}>
            {tail} {servicedByVerb(item.kind)} {item.personName}{" "}
            <span className={scoreBadgeClassName()}>{formatScore(item.score)}</span>
          </p>
          <p className={styles.featuredActivityCaptionMeta}>
            {stripAgoSuffix(item.timeAgo)}
            {photos.length > 0 && ` • ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>
    </Card>
  );
}

/** One of the 2x2 grid cards beside the featured carousel — a single photo, no per-item carousel of its own. Same caption content/format as the featured card (see FeaturedActivityCard), just at the grid tile's smaller scale. */
function SecondaryActivityCard({ item }: { item: ActivityItem }) {
  const { head, tail } = splitLocation(item.location);
  const photos = areaTypePhotos(head);
  const mainPhoto = photos[0] ?? item.areaPhoto;

  return (
    <Card className={styles.secondaryActivityCard}>
      <span className={styles.activityTimeBadge}>{item.timeAgo}</span>
      {mainPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mainPhoto} alt="" className={styles.secondaryActivityPhoto} />
      ) : (
        <div className={styles.activityPhotoPlaceholder}>
          <i className="fa-solid fa-image" aria-hidden="true" />
        </div>
      )}
      <div className={styles.secondaryActivityCaption}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.personAvatar} alt="" className={styles.secondaryActivityAvatar} />
        <div className={styles.secondaryActivityCaptionText}>
          <p className={styles.secondaryActivityCaptionTitle}>
            {tail} {servicedByVerb(item.kind)} {item.personName}{" "}
            <span className={scoreBadgeClassName()}>{formatScore(item.score)}</span>
          </p>
          <p className={styles.secondaryActivityCaptionMeta}>
            {stripAgoSuffix(item.timeAgo)}
            {photos.length > 0 && ` • ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>
    </Card>
  );
}

type ViewMode = "grid" | "list";
type SortOrder = "recent" | "score-desc" | "score-asc";
/** Which unit the Work grid's cards represent — clicking one of the Area Types/Buildings/Areas/Elements count chips switches the whole grid to that granularity. */
type GroupBy = "areaTypes" | "buildings" | "areas" | "elements";

/** Which of List view's two summary cards is showing — see summaryView. */
type SummaryView = "summary" | "missed";

function SUMMARY_VIEW_OPTIONS(missedCount: number): ButtonGroupOption<SummaryView>[] {
  return [
    { id: "summary", label: "Summary" },
    { id: "missed", label: missedCount > 0 ? `Missed Services (${missedCount})` : "Missed Services" },
  ];
}

/**
 * A generic vocabulary of room fixtures — this dataset has no real
 * per-element inventory (the SOW tracks tasks, not fixtures), so
 * "Elements" is a deterministic, clearly-a-prototype stand-in:
 * plausible fixture names with a seeded quantity/score, not real
 * data — same convention SowHierarchyPage's own ELEMENT_NAMES uses.
 */
const ELEMENT_NAMES = ["Table", "Chair", "Trash Can", "Light Fixture", "Sink", "Mirror", "Window", "Vent"];

const SHIFT_FILTER_OPTIONS = [
  { value: "all", label: "All Shifts" },
  { value: "Day", label: "Day" },
  { value: "Night", label: "Night" },
  { value: "Swing", label: "Swing" },
  { value: "Graveyard", label: "Graveyard" },
];

/** Areas grouping only — whether an area hit its own Expected Services goal (areaExpectedHit). */
type ComplianceFilter = "all" | "compliant" | "nonCompliant";

const COMPLIANCE_FILTER_OPTIONS: { value: ComplianceFilter; label: string }[] = [
  { value: "all", label: "All Areas" },
  { value: "compliant", label: "Compliant Areas" },
  { value: "nonCompliant", label: "Non-compliant Areas" },
];

/** Distinct real positions among recentVerifications (lib/sowData.ts) — every option always yields at least one card, since that's the exact pool the Recent Activity carousel draws from. */
const POSITION_FILTER_OPTIONS = [
  { value: "all", label: "All Positions" },
  ...Array.from(new Set(recentVerifications.map((v) => v.position))).map((p) => ({ value: p, label: p })),
];

const SORT_OPTIONS: { id: SortOrder; label: string }[] = [
  { id: "recent", label: "Newest Services" },
  { id: "score-desc", label: "Highest Score" },
  { id: "score-asc", label: "Lowest Score" },
];

const SHIFT_TAGS = ["Day", "Night", "Swing", "Graveyard"];

function primaryShiftFor(name: string): string {
  return SHIFT_TAGS[hashSeed(`${name}-shift`) % SHIFT_TAGS.length];
}

/** The per-shift columns on the Areas list table (a coarser cut than SHIFT_TAGS/primaryShiftFor's own filter — no "Night" here, matching the Figma reference exactly). */
const AREA_SHIFT_NAMES = ["Day", "Graveyard", "Swing"] as const;
type AreaShiftName = (typeof AREA_SHIFT_NAMES)[number];
type ShiftBreakdown = { shift: AreaShiftName; expected: number; servicedToday: number };

/** Largest-remainder split of `total` into parts proportional to `weights`, so the parts always sum back to `total` exactly (no rounding drift across the row). */
function splitByWeights(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / weightSum);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let j = 0; j < remainder && j < order.length; j++) result[order[j].i] += 1;
  return result;
}

/** Deterministic Day/Graveyard/Swing split of one area's real expected/servicedToday totals — a prototype stand-in (no real per-shift schedule data), but internally consistent: each column's own numbers always add back up to the area's actual Expected Services and Total Services. Expected and serviced are weighted independently so a shift can plausibly run over its own target even though the area's overall numbers don't. */
function shiftBreakdownFor(seed: string, expected: number, servicedToday: number): ShiftBreakdown[] {
  const expectedWeights = AREA_SHIFT_NAMES.map((shift) => 1 + (hashSeed(`${seed}-${shift}-exp`) % 4));
  const servicedWeights = AREA_SHIFT_NAMES.map((shift) => 1 + (hashSeed(`${seed}-${shift}-svc`) % 4));
  const expectedParts = splitByWeights(expected, expectedWeights);
  const servicedParts = splitByWeights(servicedToday, servicedWeights);
  return AREA_SHIFT_NAMES.map((shift, i) => ({ shift, expected: expectedParts[i], servicedToday: servicedParts[i] }));
}

/** Which one of AREA_SHIFT_NAMES an area is primarily staffed on, for the List view's shift compliance columns — a real, disjoint partition of every area (unlike shiftBreakdownFor's own per-area 3-way split, which gives every area some expected load on all three shifts). */
function primaryAreaShiftFor(key: string): AreaShiftName {
  return AREA_SHIFT_NAMES[hashSeed(`${key}-primary-shift`) % AREA_SHIFT_NAMES.length];
}

/**
 * Every real (area type, shift) combination with at least one area
 * that had zero services on its own primary shift for one given day —
 * the same expected/servicedToday/shiftBreakdownFor math
 * individualAreaCards uses (same seeds, so results always agree),
 * factored out standalone so it can be run for a day other than
 * whichever one the grid itself is currently showing (see
 * recentMissedAlert's own past-week lookback on the Today view).
 */
function computeMissedServiceGroups(contractBuildings: ContractBuilding[], dayOffset: number): MissedServiceGroup[] {
  const map = new Map<string, MissedServiceGroup>();
  contractBuildings.forEach((building) => {
    building.areaTypes.forEach((at) => {
      const dailyTaskInstances = at.tasks.reduce((sum, t) => sum + (t.freqCount ?? 1), 0);
      if (dailyTaskInstances <= 0) return; // no contracted tasks — nothing to miss
      at.areas.forEach((area) => {
        const expected = Math.max(1, dailyTaskInstances);
        const servicedToday = Math.max(0, Math.round(expected * scaleForDay(`${area.areaId}-serviced`, dayOffset, 0.2, 0.95)));
        const shift = primaryAreaShiftFor(area.areaId);
        const shiftEntry = shiftBreakdownFor(`${area.areaId}-${dayOffset}`, expected, servicedToday).find((s) => s.shift === shift);
        if (!shiftEntry) return;
        const key = `${at.name}::${shift}`;
        const group =
          map.get(key) ?? ({ key, areaTypeName: at.name, shift, missedAreaCount: 0, totalAreaCount: 0, missedExpectedTotal: 0 } as MissedServiceGroup);
        group.totalAreaCount += 1;
        if (shiftEntry.servicedToday === 0) {
          group.missedAreaCount += 1;
          group.missedExpectedTotal += shiftEntry.expected;
        }
        map.set(key, group);
      });
    });
  });
  return Array.from(map.values())
    .filter((g) => g.missedAreaCount > 0)
    .sort((a, b) => b.missedAreaCount - a.missedAreaCount);
}

/** Longer date-preset ranges (3/6/12 months) are capped to their most recent days rather than aggregating the full span — the day-by-day math here is just seeded pseudo-randomness (see scaleForDay), not real history, so scanning a full year adds compute cost without adding real signal, and a flat list of a year's worth of groups wouldn't be usable anyway. */
const MAX_RANGE_LOOKBACK_DAYS = 30;

function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / 86400000);
}

/**
 * The completed day-offsets (1 = yesterday, 2 = the day before, ...)
 * covered by a coarser date-preset range — mirrors rangeLabelForPreset's
 * own calendar math so the aggregated Missed Services numbers cover
 * exactly the same span as the header's own displayed date range.
 * Empty for "today"/"yesterday" (those use the single dayOffset path
 * already) and for "custom" (no real range is defined for it).
 */
function missedRangeDayOffsets(preset: DatePreset): number[] {
  const today = new Date();
  let start: Date;
  let end: Date = today;
  if (preset === "week") {
    start = new Date(today);
    // 7 complete days (offsets 1-7), not 6 — matches the Total Time Trend
    // modal's own "This Week" window (TIME_TREND_DAYS_PER_PERIOD.week),
    // so "this week" means the same span everywhere on the page.
    start.setDate(start.getDate() - 7);
  } else if (preset === "month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (preset === "lastMonth") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (preset === "3months" || preset === "6months" || preset === "1year") {
    start = new Date(today);
    if (preset === "3months") start.setMonth(start.getMonth() - 3);
    else if (preset === "6months") start.setMonth(start.getMonth() - 6);
    else start.setFullYear(start.getFullYear() - 1);
  } else {
    return [];
  }
  const startOffset = daysBetween(today, start);
  const endOffset = Math.max(1, daysBetween(today, end)); // never includes today (offset 0) — that day isn't over yet
  const offsets: number[] = [];
  for (let offset = endOffset; offset <= startOffset; offset++) offsets.push(offset);
  return offsets.slice(0, MAX_RANGE_LOOKBACK_DAYS);
}

/**
 * The same (area type, shift) groups as computeMissedServiceGroups, but
 * summed across every day in a coarser date-preset range. totalAreaCount
 * stays the real, constant count of areas in that group (it doesn't
 * change day to day); missedAreaCount/missedExpectedTotal accumulate
 * across days, so they read as "missed-instances", not "distinct areas"
 * — see daysAffected for how many of those days actually had a miss.
 */
function computeMissedServiceGroupsForRange(contractBuildings: ContractBuilding[], offsets: number[]): MissedServiceGroup[] {
  const map = new Map<string, MissedServiceGroup>();
  offsets.forEach((offset) => {
    computeMissedServiceGroups(contractBuildings, offset).forEach((dayGroup) => {
      const existing = map.get(dayGroup.key);
      if (existing) {
        existing.missedAreaCount += dayGroup.missedAreaCount;
        existing.missedExpectedTotal += dayGroup.missedExpectedTotal;
        existing.daysAffected = (existing.daysAffected ?? 0) + 1;
      } else {
        map.set(dayGroup.key, { ...dayGroup, daysAffected: 1 });
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => b.missedAreaCount - a.missedAreaCount);
}

function minutesAgoForSeed(seed: string): number {
  return 5 + (hashSeed(seed) % 480);
}

function formatMinutesAgoLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hour${hours === 1 ? "" : "s"} ago` : `${hours}h ${remainder}m ago`;
}

function parseHoursLabelToMinutes(label: string): number {
  const m = label.match(/(\d+)h\s*(\d+)m/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatMinutesAsHoursLabel(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
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

/** "Today" / "Yesterday" / a short weekday — the Area Type card's own "N Serviced {day}" line, a shorter read than formatDateLabel's full "Weekday, date" pill. */
function dayLabelForOffset(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Yesterday";
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

/* ---------------- Header date picker (preset menu) ---------------- */

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

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The date pill's label for a preset coarser than a single day — a real
 * computed calendar range anchored on today (not fabricated data). Returns
 * null for "today"/"yesterday", which use formatDatePillLabel instead.
 * Same convention as SowHierarchyPage's own rangeLabelForPreset.
 */
function rangeLabelForPreset(preset: DatePreset): string | null {
  const today = new Date();
  if (preset === "week") {
    // The most recent 7 complete days (today excluded — see
    // missedRangeDayOffsets), not "today-6 through today": the pill's
    // own range now matches the data it actually represents.
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(today);
    end.setDate(end.getDate() - 1);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
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

/** The date picker pill's own label for "Today"/"Yesterday" — always the real weekday + date (never the words "Today"/"Yesterday", which the preset menu item already carries) so re-selecting "Today" tomorrow reads correctly. */
function formatDatePillLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  return `${weekday}, ${dateStr}`;
}

type AreaTypeGroup = { name: string; areas: ContractArea[]; tasks: ContractTaskDef[]; buildings: string[] };

type AreaTypeCardData = {
  name: string;
  photo?: string;
  timeAgo: string;
  minutesAgo: number;
  score: number | null;
  areaCount: number;
  areasServicedToday: number;
  expected: number;
  servicedToday: number;
  percent: number;
  capturedLabel: string;
  paidLabel: string;
  capturedPercent: number;
  buildings: string[];
};

/** Areas grouping — one real area's own identity (area type / building / floor) rather than a group count, plus a single "Captured" line with no paid-hours ratio. Its own shape rather than overloading AreaTypeCardData with area-only fields. */
type AreaCardData = {
  key: string;
  name: string;
  areaTypeName: string;
  buildingName: string;
  floor: number;
  floorDescription: string;
  photo?: string;
  timeAgo: string;
  minutesAgo: number;
  score: number | null;
  expected: number;
  servicedToday: number;
  percent: number;
  capturedLabel: string;
  capturedPercent: number;
  shifts: ShiftBreakdown[];
};

/** Buildings grouping — its own shape (departures/arrivals flight badges, a single "Captured" line with no paid-hours ratio) rather than overloading AreaTypeCardData with building-only fields. */
type BuildingCardData = {
  name: string;
  photo?: string;
  timeAgo: string;
  minutesAgo: number;
  score: number | null;
  areaCount: number;
  areasServicedToday: number;
  expected: number;
  servicedToday: number;
  percent: number;
  capturedLabel: string;
  capturedPercent: number;
  departures: number;
  arrivals: number;
};

type PerformanceSummaryCardProps = {
  teamMembers: number;
  avatarPreview: RosterPerson[];
  avatarOverflowCount: number;
  verificationsCompleted: number;
  verificationsExpected: number;
  servicesCompletePercent: number;
  capturedMinutes: number;
  paidMinutes: number;
  hoursCapturedPercent: number;
  postDeparturePercent: number;
  postDepartureWindowMinutes: number;
  onTimeServicesCount: number;
  todayWord: string;
  areaTypeCount: number;
  flightsSupported: number;
};

/**
 * PerformanceSummaryCard — the site-wide "how's today going" read that
 * replaces the old freestanding coverage sentence: four side-by-side
 * plain-language reads (Staffing, Service Compliance, Hours Captured
 * vs Paid, Post-Departure Services), each over a two-value progress
 * bar, plus that same coverage sentence as before, now tucked under a
 * "Summary" tag along the bottom of the card instead of standing alone.
 */
function PerformanceSummaryCard({
  teamMembers,
  avatarPreview,
  avatarOverflowCount,
  verificationsCompleted,
  verificationsExpected,
  servicesCompletePercent,
  capturedMinutes,
  paidMinutes,
  hoursCapturedPercent,
  postDeparturePercent,
  postDepartureWindowMinutes,
  onTimeServicesCount,
  todayWord,
  areaTypeCount,
  flightsSupported,
}: PerformanceSummaryCardProps) {
  return (
    <Card className={styles.perfSummaryCard}>
      <div className={styles.perfSummaryColumns}>
        <div className={styles.perfSummaryCol}>
          <div className={styles.perfSummaryColHeader}>
            <i className="fa-solid fa-users" aria-hidden="true" />
            Staffing
          </div>
          <p className={styles.perfSummarySentence}>
            <span className={styles.sentenceBlue}>{teamMembers.toLocaleString()} Team Members</span> have been on site{" "}
            {todayWord.toLowerCase()}.
          </p>
          <ul className={styles.perfSummaryAvatarRow}>
            {avatarPreview.map((person, i) => (
              <li
                key={`${person.email}-${i}`}
                className={styles.perfSummaryAvatarTile}
                style={{ zIndex: avatarPreview.length - i }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={person.avatar} alt="" className={styles.perfSummaryAvatarImage} />
              </li>
            ))}
            {avatarOverflowCount > 0 && <li className={styles.perfSummaryAvatarOverflow}>+{avatarOverflowCount}</li>}
          </ul>
        </div>

        <div className={styles.perfSummaryCol}>
          <div className={styles.perfSummaryColHeader}>
            <i className="fa-solid fa-badge-check" aria-hidden="true" />
            Service Compliance
          </div>
          <p className={styles.perfSummarySentence}>
            <span className={styles.sentencePurple}>
              {verificationsCompleted.toLocaleString()} ({Math.round(servicesCompletePercent)}%)
            </span>{" "}
            of {todayWord}&rsquo;s {verificationsExpected.toLocaleString()} Expected Services have been completed.
          </p>
          <div className={styles.perfSummaryMetricsRow}>
            <span className={styles.perfSummaryMetric}>
              <span className={styles.perfSummaryMetricLabel}>Completed Services</span>
              <span className={styles.perfSummaryMetricValue}>
                <i className="fa-solid fa-badge-check" aria-hidden="true" /> {verificationsCompleted.toLocaleString()}
              </span>
            </span>
            <span className={[styles.perfSummaryMetric, styles.perfSummaryMetricRight].join(" ")}>
              <span className={styles.perfSummaryMetricLabel}>Expected Services</span>
              <span className={styles.perfSummaryMetricValue}>
                <i className="fa-solid fa-clipboard-list" aria-hidden="true" /> {verificationsExpected.toLocaleString()}
              </span>
            </span>
          </div>
          <span className={styles.perfSummaryProgressTrack}>
            <span
              className={[styles.perfSummaryProgressFill, styles.perfSummaryProgressFillPurple].join(" ")}
              style={{ width: `${Math.min(100, servicesCompletePercent)}%` }}
            />
          </span>
        </div>

        <div className={styles.perfSummaryCol}>
          <div className={styles.perfSummaryColHeader}>
            <i className="fa-solid fa-clock" aria-hidden="true" />
            Hours Captured vs Paid
          </div>
          <p className={styles.perfSummarySentence}>
            <span className={styles.sentenceBlue}>{hoursCapturedPercent}%</span> of {todayWord}&rsquo;s{" "}
            <span className={styles.sentenceBlue}>Paid Hours</span> have been <span className={styles.sentenceBlue}>Captured</span>{" "}
            by Associates.
          </p>
          <div className={styles.perfSummaryMetricsRow}>
            <span className={styles.perfSummaryMetric}>
              <span className={styles.perfSummaryMetricLabel}>Hours Captured</span>
              <span className={styles.perfSummaryMetricValue}>
                <i className="fa-solid fa-stopwatch" aria-hidden="true" /> {formatMinutesAsHoursLabel(capturedMinutes)}
              </span>
            </span>
            <span className={[styles.perfSummaryMetric, styles.perfSummaryMetricRight].join(" ")}>
              <span className={styles.perfSummaryMetricLabel}>Hours Paid</span>
              <span className={styles.perfSummaryMetricValue}>
                <i className="fa-solid fa-clock" aria-hidden="true" /> {formatMinutesAsHoursLabel(paidMinutes)}
              </span>
            </span>
          </div>
          <span className={styles.perfSummaryProgressTrack}>
            <span
              className={[styles.perfSummaryProgressFill, styles.perfSummaryProgressFillBlue].join(" ")}
              style={{ width: `${Math.min(100, hoursCapturedPercent)}%` }}
            />
          </span>
        </div>

        <div className={styles.perfSummaryCol}>
          <div className={styles.perfSummaryColHeader}>
            <i className="fa-solid fa-plane-departure" aria-hidden="true" />
            Post-Departure Services
          </div>
          <p className={styles.perfSummarySentence}>
            <span className={styles.sentenceGreen}>{postDeparturePercent}%</span> of Post-Departure Services performed within{" "}
            {postDepartureWindowMinutes} minutes of departure.
          </p>
          <div className={styles.perfSummaryMetricsRow}>
            <span className={styles.perfSummaryMetric}>
              <span className={styles.perfSummaryMetricLabel}>On-Time Services</span>
              <span className={styles.perfSummaryMetricValue}>
                <i className="fa-solid fa-plane-departure" aria-hidden="true" /> {onTimeServicesCount.toLocaleString()}
              </span>
            </span>
          </div>
          <span className={styles.perfSummaryProgressTrack}>
            <span
              className={[styles.perfSummaryProgressFill, styles.perfSummaryProgressFillGreen].join(" ")}
              style={{ width: `${Math.min(100, postDeparturePercent)}%` }}
            />
          </span>
        </div>
      </div>

      <div className={styles.perfSummaryFooter}>
        <span className={styles.summaryTag}>Summary</span>
        <p className={styles.perfSummaryFooterSentence}>
          {todayWord}, <span className={styles.sentenceBlue}>{teamMembers.toLocaleString()} Team Members</span> completed{" "}
          <span className={styles.sentenceBlue}>{verificationsCompleted.toLocaleString()} Verifications</span> of{" "}
          {verificationsExpected.toLocaleString()} expected verifications across {areaTypeCount} Area Types and captured{" "}
          <span className={styles.sentencePurple}>
            {formatMinutesAsHoursLabel(capturedMinutes)} ({hoursCapturedPercent}%)
          </span>{" "}
          of {formatMinutesAsHoursLabel(paidMinutes)} paid hours while supporting{" "}
          <span className={styles.sentenceBlue}>{flightsSupported.toLocaleString()} flights</span>.
        </p>
      </div>
    </Card>
  );
}

/** One real (area type, shift) combination with at least one area that had zero services that day — the unit managers acknowledge against. */
type MissedServiceGroup = {
  key: string;
  areaTypeName: string;
  shift: AreaShiftName;
  missedAreaCount: number;
  totalAreaCount: number;
  missedExpectedTotal: number;
  /** Set only for a range-aggregated group (see computeMissedServiceGroupsForRange) — how many of the range's days actually had a miss; changes missedAreaCount's own meaning from "distinct areas" to "missed instances summed across days". */
  daysAffected?: number;
};

/** A manager's own written reason for one MissedServiceGroup on one specific day — session-only, no backend behind this prototype. */
type MissedServiceAck = {
  reason: string;
  acknowledgedLabel: string;
};

/** One real area's own missed shift — finer-grained than MissedServiceGroup (that area type's whole shift), for acknowledging a single area rather than the aggregate. */
type AreaShiftAckSubject = {
  key: string;
  areaName: string;
  buildingName: string;
  shift: AreaShiftName;
  expected: number;
};

/** Namespaced separately from MissedServiceGroup's own `${dayOffset}::${areaTypeName}::${shift}` keys (see ackKeyFor) so an area id can never collide with an area type name in the shared acknowledgedMissed map. */
function areaShiftAckKey(dayOffset: number, areaKey: string, shift: AreaShiftName): string {
  return `${dayOffset}::area::${areaKey}::${shift}`;
}

/** How many past days the Today view checks for unacknowledged missed services — see recentMissedAlert. */
const RECENT_MISSED_LOOKBACK_DAYS = 7;

/** Today's own "heads up, earlier days need attention" summary — see recentMissedAlert. */
type RecentMissedAlert = {
  unacknowledgedGroupCount: number;
  daysWithIssues: number;
  /** The most recent day (smallest dayOffset) with anything still unacknowledged — where "Review" jumps to. */
  mostRecentDayOffset: number;
};

type ShiftComplianceColumn = {
  key: "totals" | AreaShiftName;
  label: string;
  totalAreas: number;
  servicedTotal: number;
  expectedTotal: number;
  noServiceCount: number;
  metGoalCount: number;
  overservicedCount: number;
};

/**
 * RecentMissedServicesBanner — the Today view's own heads-up: Today
 * has no completed-day Missed Services list of its own (see
 * recentMissedAlert), so this surfaces at the very top of Your Spaces
 * whenever an earlier day in the last RECENT_MISSED_LOOKBACK_DAYS
 * still has something unacknowledged, rather than only being
 * discoverable by clicking back through the date picker.
 */
function RecentMissedServicesBanner({ alert, onReview }: { alert: RecentMissedAlert; onReview: (offset: number) => void }) {
  return (
    <Card className={styles.recentMissedBanner}>
      <div className={styles.recentMissedBannerText}>
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        <p>
          <strong>
            {alert.unacknowledgedGroupCount} unacknowledged missed service{alert.unacknowledgedGroupCount === 1 ? "" : "s"}
          </strong>{" "}
          across {alert.daysWithIssues} of the last {RECENT_MISSED_LOOKBACK_DAYS} days. Most recent: {dayLabelForOffset(alert.mostRecentDayOffset)}
          .
        </p>
      </div>
      <button type="button" className={styles.recentMissedBannerButton} onClick={() => onReview(alert.mostRecentDayOffset)}>
        Review
      </button>
    </Card>
  );
}

/**
 * MissedServicesPanel — Compliance Acknowledgement's own addition to
 * the List view's summary: once a day is actually over (dayOffset >=
 * 1 — "Yesterday" or further back via the date picker's caret, never
 * "Today", since the day isn't done yet), surfaces every real (area
 * type, shift) combination that had at least one area with zero
 * services (see missedServiceGroups — a real breakdown of the exact
 * same "no services" counts ShiftComplianceSummary's own columns
 * already show, not a separate random model) and lets a manager
 * acknowledge each one with a written reason. Acknowledgment is
 * session-only state, keyed by day + area type + shift, so switching
 * the date picker always shows that day's own real list rather than
 * carrying another day's acknowledgments over.
 */
function MissedServicesPanel({
  dayOffset,
  groups,
  acknowledgedMissed,
  ackKeyForGroup,
  onOpenAcknowledge,
  onInvestigate,
  title,
  periodLabel,
  defaultCollapsed = false,
}: {
  dayOffset: number;
  groups: MissedServiceGroup[];
  acknowledgedMissed: Record<string, MissedServiceAck>;
  /** How to look up (and, on submit, write) this group's own acknowledgment — defaults to the single-day `${dayOffset}::${key}` key; a range-aggregated panel passes its own `range::${preset}::${key}` version instead. */
  ackKeyForGroup?: (group: MissedServiceGroup) => string;
  onOpenAcknowledge: (group: MissedServiceGroup) => void;
  /** Filters Your Spaces down to this group's own area type (Area Types list) so a manager can see exactly which areas/tasks were missed. Omit to hide the button entirely — used when this panel is already scoped to one investigated area type, where an Investigate button would just point at itself. */
  onInvestigate?: (group: MissedServiceGroup) => void;
  /** Overrides the default "Missed Services — {day}" heading — used when this panel is reused inline, scoped to one area type someone is actively investigating, or to a date-preset range. */
  title?: string;
  /** Overrides the default "today"/"yesterday"/"on {day}" phrase used in the subtitle and empty state — for a range-aggregated panel, e.g. "this week". */
  periodLabel?: string;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const dayLabel = dayLabelForOffset(dayOffset);
  const getAckKey = ackKeyForGroup ?? ((g: MissedServiceGroup) => `${dayOffset}::${g.key}`);
  const periodLabelLower = periodLabel ?? (dayLabel === "Today" || dayLabel === "Yesterday" ? dayLabel.toLowerCase() : `on ${dayLabel}`);
  const unacknowledged = groups.filter((g) => !acknowledgedMissed[getAckKey(g)]);

  if (groups.length === 0) {
    return (
      <Card className={styles.missedServicesCard}>
        <div className={styles.missedServicesEmpty}>
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <p>Every area type hit its expected services on every shift {periodLabelLower} — nothing to acknowledge.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.missedServicesCard}>
      <button
        type="button"
        className={styles.missedServicesHeader}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <div className={styles.missedServicesHeaderText}>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <div>
            <h3 className={styles.missedServicesTitle}>{title ?? `Missed Services — ${dayLabel}`}</h3>
            <p className={styles.missedServicesSubtitle}>
              {groups.length} area type/shift {groups.length === 1 ? "combination" : "combinations"} had no services {periodLabelLower}.
            </p>
          </div>
        </div>
        <span className={styles.missedServicesHeaderRight}>
          <span className={styles.missedServicesCountPill}>
            {groups.length - unacknowledged.length} of {groups.length} acknowledged
          </span>
          <i
            className={["fa-solid fa-chevron-down", styles.missedServicesCollapseCaret, collapsed ? styles.missedServicesCollapseCaretCollapsed : ""]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          />
        </span>
      </button>

      {!collapsed && (
      <div className={styles.missedServicesList}>
        {groups.map((group) => {
          const ack = acknowledgedMissed[getAckKey(group)];
          return (
            <div className={styles.missedServiceRow} key={group.key}>
              <div className={styles.missedServiceInfo}>
                <span className={styles.missedServiceAreaType}>
                  {group.areaTypeName} <span className={styles.missedServiceShiftTag}>{group.shift}</span>
                </span>
                <span className={styles.missedServiceMeta}>
                  {group.daysAffected !== undefined ? (
                    <>
                      {group.missedAreaCount} missed service instance{group.missedAreaCount === 1 ? "" : "s"} across {group.daysAffected} day
                      {group.daysAffected === 1 ? "" : "s"} · {group.missedExpectedTotal} expected service
                      {group.missedExpectedTotal === 1 ? "" : "s"} missed
                    </>
                  ) : (
                    <>
                      {group.missedAreaCount} of {group.totalAreaCount} area{group.totalAreaCount === 1 ? "" : "s"} had no services ·{" "}
                      {group.missedExpectedTotal} expected service{group.missedExpectedTotal === 1 ? "" : "s"} missed
                    </>
                  )}
                </span>
                {ack && (
                  <p className={styles.missedServiceReason}>
                    <i className="fa-solid fa-quote-left" aria-hidden="true" />
                    {ack.reason}
                  </p>
                )}
              </div>
              <div className={styles.missedServiceActions}>
                {onInvestigate && (
                  <button type="button" className={styles.missedServiceInvestigateButton} onClick={() => onInvestigate(group)}>
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                    Investigate
                  </button>
                )}
                {ack ? (
                  <span className={styles.missedServiceAcknowledged}>
                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    Acknowledged {ack.acknowledgedLabel}
                  </span>
                ) : (
                  <button type="button" className={styles.missedServiceAckButton} onClick={() => onOpenAcknowledge(group)}>
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </Card>
  );
}

/** The "write a reason" dialog opened from one MissedServicesPanel row — a required, non-empty reason before the Acknowledge button enables. */
function MissedServiceAckModal({
  group,
  dayLabel,
  periodLabel,
  onClose,
  onSubmit,
}: {
  group: MissedServiceGroup | null;
  dayLabel: string;
  /** Overrides dayLabel's own "today"/"yesterday"/"on {day}" phrase — for a range-aggregated group, e.g. "over the last 7 days". */
  periodLabel?: string;
  onClose: () => void;
  onSubmit: (group: MissedServiceGroup, reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [group?.key]);

  const canSubmit = reason.trim().length > 0;
  const periodLabelLower = periodLabel ?? (dayLabel === "Today" || dayLabel === "Yesterday" ? dayLabel.toLowerCase() : `on ${dayLabel}`);

  return (
    <Modal open={group !== null} onClose={onClose} title={group ? `Acknowledge — ${group.areaTypeName}` : ""}>
      {group && (
        <>
          <p className={styles.ackModalMeta}>
            {group.shift} shift ·{" "}
            {group.daysAffected !== undefined ? (
              <>
                {group.missedAreaCount} missed service instance{group.missedAreaCount === 1 ? "" : "s"} across {group.daysAffected} of the
                last {periodLabel ? periodLabel.replace(/^over the last /, "") : `${group.daysAffected} days`}.
              </>
            ) : (
              <>
                {group.missedAreaCount} of {group.totalAreaCount} area{group.totalAreaCount === 1 ? "" : "s"} had no services {periodLabelLower}.
              </>
            )}
          </p>
          <label className={styles.ackModalLabel} htmlFor="missed-service-reason">
            Why were these services missed?
          </label>
          <textarea
            id="missed-service-reason"
            className={styles.ackModalTextarea}
            rows={4}
            placeholder="e.g. Team was reassigned to cover a call-out on Concourse D."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={styles.ackModalActions}>
            <button type="button" className={styles.ackModalCancel} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.ackModalSubmit}
              disabled={!canSubmit}
              onClick={() => onSubmit(group, reason.trim())}
            >
              Acknowledge
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/** The area-level counterpart to MissedServiceAckModal — acknowledging one specific area's own missed shift (see AreaListView's own acknowledge icon) rather than the whole area type's. */
function AreaShiftAckModal({
  subject,
  dayLabel,
  onClose,
  onSubmit,
}: {
  subject: AreaShiftAckSubject | null;
  dayLabel: string;
  onClose: () => void;
  onSubmit: (subject: AreaShiftAckSubject, reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [subject?.key]);

  const canSubmit = reason.trim().length > 0;
  const dayLabelLower = dayLabel === "Today" || dayLabel === "Yesterday" ? dayLabel.toLowerCase() : `on ${dayLabel}`;

  return (
    <Modal open={subject !== null} onClose={onClose} title={subject ? `Acknowledge — ${subject.areaName}` : ""}>
      {subject && (
        <>
          <p className={styles.ackModalMeta}>
            {subject.buildingName} · {subject.shift} shift · 0 of {subject.expected} expected service{subject.expected === 1 ? "" : "s"}{" "}
            completed {dayLabelLower}.
          </p>
          <label className={styles.ackModalLabel} htmlFor="area-shift-reason">
            Why was this service missed?
          </label>
          <textarea
            id="area-shift-reason"
            className={styles.ackModalTextarea}
            rows={4}
            placeholder="e.g. Access was blocked for maintenance overnight."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={styles.ackModalActions}>
            <button type="button" className={styles.ackModalCancel} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={styles.ackModalSubmit} disabled={!canSubmit} onClick={() => onSubmit(subject, reason.trim())}>
              Acknowledge
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/**
 * ShiftComplianceSummary — the List view's own replacement for
 * PerformanceSummaryCard: a Totals column plus one column per
 * AREA_SHIFT_NAMES entry (Day/Graveyard/Swing), each reading three
 * compliance rates off that shift's own real area population (see
 * primaryAreaShiftFor/shiftBreakdownFor) — areas with no services
 * today, areas that met their Expected Services goal, and areas that
 * ran over it. A zero count reads as a plain "No areas..." sentence
 * (matching Swing's own all-zero column in the design reference)
 * rather than a "0 of N" that would otherwise dominate every row.
 */
function ShiftComplianceSummary({ columns }: { columns: ShiftComplianceColumn[] }) {
  return (
    <Card className={styles.shiftComplianceCard}>
      <div className={styles.shiftComplianceColumns}>
        {columns.map((col) => (
          <div className={styles.shiftComplianceCol} key={col.key}>
            <h3 className={styles.shiftComplianceColTitle}>{col.label}</h3>

            <div className={styles.shiftComplianceStatRow}>
              <div className={styles.shiftComplianceStatTile}>
                <span className={styles.shiftComplianceStatLabel}>Total Areas</span>
                <span className={styles.shiftComplianceStatValue}>{col.totalAreas.toLocaleString()}</span>
              </div>
              <div className={styles.shiftComplianceStatTile}>
                <span className={styles.shiftComplianceStatLabel}>Total Services</span>
                <span className={styles.shiftComplianceStatValue}>
                  {col.servicedTotal.toLocaleString()} / {col.expectedTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <ShiftComplianceMetricRow
              color="red"
              percent={col.totalAreas > 0 ? (col.noServiceCount / col.totalAreas) * 100 : 0}
              sentence={
                <>
                  <strong className={styles.shiftComplianceRed}>{col.noServiceCount}</strong> of {col.totalAreas} areas have no
                  services
                </>
              }
            />

            <ShiftComplianceMetricRow
              color="green"
              percent={col.totalAreas > 0 ? (col.metGoalCount / col.totalAreas) * 100 : 0}
              sentence={
                col.metGoalCount === 0 ? (
                  "No areas have met compliance goal"
                ) : (
                  <>
                    <strong className={styles.shiftComplianceGreen}>{col.metGoalCount}</strong> of {col.totalAreas} areas met goal |{" "}
                    <strong className={styles.shiftComplianceRed}>{col.totalAreas - col.metGoalCount}</strong> did not
                  </>
                )
              }
            />

            <ShiftComplianceMetricRow
              color="amber"
              percent={col.totalAreas > 0 ? (col.overservicedCount / col.totalAreas) * 100 : 0}
              sentence={
                col.overservicedCount === 0 ? (
                  "No areas were overserviced"
                ) : (
                  <>
                    <strong className={styles.shiftComplianceAmber}>{col.overservicedCount}</strong> of {col.totalAreas} areas were
                    overserviced
                  </>
                )
              }
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

const SHIFT_COMPLIANCE_COLOR_CLASS = {
  red: { track: "shiftComplianceBarTrackRed", fill: "shiftComplianceBarFillRed" },
  green: { track: "shiftComplianceBarTrackGreen", fill: "shiftComplianceBarFillGreen" },
  amber: { track: "shiftComplianceBarTrackAmber", fill: "shiftComplianceBarFillAmber" },
} as const;

function ShiftComplianceMetricRow({
  sentence,
  percent,
  color,
}: {
  sentence: ReactNode;
  percent: number;
  color: "red" | "green" | "amber";
}) {
  const colorClasses = SHIFT_COMPLIANCE_COLOR_CLASS[color];
  return (
    <div className={styles.shiftComplianceMetric}>
      <p className={styles.shiftComplianceSentence}>{sentence}</p>
      <div className={[styles.shiftComplianceBarTrack, styles[colorClasses.track]].join(" ")}>
        <span
          className={[styles.shiftComplianceBarFill, styles[colorClasses.fill]].join(" ")}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
        <span className={styles.shiftComplianceBarLabel}>{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function YourSpacesSection({
  contractBuildings,
  associates,
  managers,
  selectedAreaType,
  onSelectAreaType,
  dayOffset,
  datePreset,
  onJumpToDay,
  activityFilter,
  positionFilter,
}: {
  contractBuildings: ContractBuilding[];
  associates: RosterPerson[];
  managers: RosterPerson[];
  selectedAreaType: string | null;
  onSelectAreaType: (name: string | null) => void;
  dayOffset: number;
  datePreset: DatePreset;
  /** Jumps the header's own date picker back to a specific past day — see recentMissedAlert's "Review" action. */
  onJumpToDay: (offset: number) => void;
  activityFilter: ActivityKind | "all";
  positionFilter: string;
}) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  // Which of the two List-view summary cards is showing — a tab
  // instead of stacking both, since managers only need one at a time
  // (Missed Services only exists once a day is over, so this tab only
  // appears then; on Today the Summary card shows alone).
  const [summaryView, setSummaryView] = useState<SummaryView>("summary");
  const [buildingFilter, setBuildingFilter] = useState("all");
  // Areas grouping only — investigateMissedGroup sets this to
  // "nonCompliant" so the drilled-in area list shows only the areas
  // that actually missed their target, not every area of that type.
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("areaTypes");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  // Missed Services acknowledgment — keyed by day + area type + shift so
  // switching the date picker always shows that day's own real
  // unacknowledged list rather than carrying another day's state over.
  // Session-only (no backend in this prototype), same convention as
  // every other piece of "state" on this page.
  const [acknowledgedMissed, setAcknowledgedMissed] = useState<Record<string, MissedServiceAck>>({});
  const [activeMissedGroup, setActiveMissedGroup] = useState<MissedServiceGroup | null>(null);
  const [activeAreaShiftAck, setActiveAreaShiftAck] = useState<AreaShiftAckSubject | null>(null);
  // Scroll target for the "Explore Area Types" link below the Recent
  // Activity layout — jumps straight to the Group by/search/grid section
  // rather than making the visitor scroll past the coverage sentence.
  const areaTypesRef = useRef<HTMLDivElement>(null);
  // Where investigateMissedGroup scrolls to — the actual filtered
  // results themselves, not just the top of the filter controls above
  // them, so the manager lands on the one matching area type row.
  const resultsRef = useRef<HTMLDivElement>(null);

  // The "Explore Area Types" bar is fixed to the bottom of the viewport
  // (a scroll cue over Recent Activity's own photos) rather than in normal
  // flow, so it stays put at the very top of the page — then fades away
  // the moment the visitor scrolls down at all, and comes back only once
  // they're back at the top, rather than tracking Recent Activity's own
  // position on screen.
  const [showExploreBar, setShowExploreBar] = useState(true);

  useEffect(() => {
    function handleScroll() {
      setShowExploreBar(window.scrollY <= 0);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // "Periodic" is dropped from this page's Recent Activity entirely —
  // not just filtered out of the "All" view, but excluded from the
  // underlying pool so it never appears under any chip. Position is a
  // real field on verification events only (lib/sowData.ts's
  // VerificationEvent) — audits aren't attributed to a position in
  // this dataset, so picking a specific position drops them from the
  // feed rather than showing them regardless of the filter.
  const activityItems: ActivityItem[] = useMemo(() => {
    const verificationItems = recentVerifications
      .map(verificationToActivity)
      .filter((v) => v.tag !== "Periodic")
      .filter((v) => positionFilter === "all" || v.position === positionFilter);
    const auditItems = positionFilter === "all" ? recentAudits.map(auditToActivity) : [];
    if (activityFilter === "verification") return verificationItems;
    if (activityFilter === "audit") return auditItems;
    return [...verificationItems, ...auditItems];
  }, [activityFilter, positionFilter]);

  // One large featured card (its own photo carousel) plus up to four
  // smaller cards in a 2x2 grid beside it — replaces the old uniform
  // horizontal scroller with a "most recent item, featured" layout.
  const featuredActivityItem = activityItems[0];
  const secondaryActivityItems = activityItems.slice(1, 5);

  // Every unique area type name across the whole site, aggregating each
  // building's own instance of it (union of areas, de-duplicated tasks,
  // and the set of buildings that offer it — for the Filter dropdown
  // below) — nothing on this page is scoped to one building, so each
  // card reads as that area type's real site-wide footprint (e.g.
  // "Offices" combines every building's office areas into one count).
  const areaTypeGroups: AreaTypeGroup[] = useMemo(() => {
    const map = new Map<string, AreaTypeGroup>();
    contractBuildings.forEach((building) => {
      building.areaTypes.forEach((at) => {
        if (!map.has(at.name)) map.set(at.name, { name: at.name, areas: [], tasks: [], buildings: [] });
        const entry = map.get(at.name)!;
        entry.areas.push(...at.areas);
        if (!entry.buildings.includes(building.name)) entry.buildings.push(building.name);
        at.tasks.forEach((task) => {
          if (!entry.tasks.some((t) => t.label === task.label)) entry.tasks.push(task);
        });
      });
    });
    return Array.from(map.values());
  }, [contractBuildings]);

  const areaTypeCards: AreaTypeCardData[] = useMemo(
    () =>
      areaTypeGroups.map((group) => {
        const areaCount = group.areas.length;
        const dailyTaskInstances = group.tasks.reduce((sum, t) => sum + (t.freqCount ?? 1), 0);
        const hasTasks = dailyTaskInstances > 0 && areaCount > 0;
        const expected = hasTasks ? Math.max(1, areaCount * dailyTaskInstances) : 0;
        const servicedToday = hasTasks
          ? Math.max(0, Math.round(expected * scaleForDay(`${group.name}-serviced`, dayOffset, 0.35, 0.95)))
          : 0;
        const percent = hasTasks ? Math.min(100, (servicedToday / expected) * 100) : 100;
        const areasServicedToday = hasTasks
          ? Math.min(areaCount, Math.max(1, Math.round(areaCount * scaleForDay(`${group.name}-areas`, dayOffset, 0.5, 1))))
          : 0;
        const hours = hoursCapturedForNode(group.name, dayOffset);
        const minutesAgo = minutesAgoForSeed(`${group.name}-timeago-${dayOffset}`);
        return {
          name: group.name,
          photo: photoForAreaType(group.name, group.name),
          timeAgo: formatMinutesAgoLabel(minutesAgo),
          minutesAgo,
          score: hasTasks ? scoreForDay(`${group.name}-score`, dayOffset) : null,
          areaCount,
          areasServicedToday,
          expected,
          servicedToday,
          percent,
          capturedLabel: hasTasks ? hours.capturedLabel : "0m",
          paidLabel: hasTasks ? hours.paidLabel : "0m",
          capturedPercent: hasTasks ? hours.percent : 0,
          buildings: group.buildings,
        };
      }),
    [areaTypeGroups, dayOffset]
  );

  // Buildings grouping — one card per real building (data/SOW_DeltaLGA.csv's
  // 7 buildings), aggregating every area type it contains. Departures/
  // Arrivals are the only fabricated figures here (no real flight-board
  // data at the building level in this dataset) — deterministic per
  // building, same generator convention as everything else on this page.
  const buildingCards: BuildingCardData[] = useMemo(
    () =>
      contractBuildings.map((building) => {
        const areaCount = building.areaCount;
        const dailyTaskInstances = building.areaTypes.reduce(
          (sum, at) => sum + at.areas.length * at.tasks.reduce((s, t) => s + (t.freqCount ?? 1), 0),
          0
        );
        const hasTasks = dailyTaskInstances > 0 && areaCount > 0;
        const expected = hasTasks ? Math.max(1, dailyTaskInstances) : 0;
        const servicedToday = hasTasks
          ? Math.max(0, Math.round(expected * scaleForDay(`${building.name}-serviced`, dayOffset, 0.35, 0.95)))
          : 0;
        const percent = hasTasks ? Math.min(100, (servicedToday / expected) * 100) : 100;
        const areasServicedToday = hasTasks
          ? Math.min(areaCount, Math.max(1, Math.round(areaCount * scaleForDay(`${building.name}-areas`, dayOffset, 0.5, 1))))
          : 0;
        const hours = hoursCapturedForNode(building.name, dayOffset);
        const minutesAgo = minutesAgoForSeed(`${building.name}-timeago-${dayOffset}`);
        return {
          name: building.name,
          photo: photoForAreaType(building.areaTypes[0]?.name ?? "", building.name),
          timeAgo: formatMinutesAgoLabel(minutesAgo),
          minutesAgo,
          score: hasTasks ? scoreForDay(`${building.name}-score`, dayOffset) : null,
          areaCount,
          areasServicedToday,
          expected,
          servicedToday,
          percent,
          capturedLabel: hasTasks ? hours.capturedLabel : "0m",
          capturedPercent: hasTasks ? hours.percent : 0,
          departures: 35 + (hashSeed(`${building.name}-dep-${dayOffset}`) % 45),
          arrivals: 35 + (hashSeed(`${building.name}-arr-${dayOffset}`) % 45),
        };
      }),
    [contractBuildings, dayOffset]
  );

  // Areas grouping — one card per real individual area (all ~714 of
  // them), carrying its own real area type / building / floor identity
  // rather than a group count, same math as an area type's card but
  // scoped to just that one area's own daily task instances.
  const individualAreaCards: AreaCardData[] = useMemo(() => {
    const cards: AreaCardData[] = [];
    contractBuildings.forEach((building) => {
      building.areaTypes.forEach((at) => {
        const dailyTaskInstances = at.tasks.reduce((sum, t) => sum + (t.freqCount ?? 1), 0);
        const hasTasks = dailyTaskInstances > 0;
        at.areas.forEach((area) => {
          const expected = hasTasks ? Math.max(1, dailyTaskInstances) : 0;
          const servicedToday = hasTasks
            ? Math.max(0, Math.round(expected * scaleForDay(`${area.areaId}-serviced`, dayOffset, 0.2, 0.95)))
            : 0;
          const percent = hasTasks ? Math.min(100, (servicedToday / expected) * 100) : 100;
          const hours = hoursCapturedForNode(area.areaId, dayOffset);
          const minutesAgo = minutesAgoForSeed(`${area.areaId}-timeago-${dayOffset}`);
          cards.push({
            key: area.areaId,
            name: area.displayName,
            areaTypeName: at.name,
            buildingName: building.name,
            floor: area.floor,
            floorDescription: area.floorDescription,
            photo: photoForAreaType(at.name, area.areaId),
            timeAgo: formatMinutesAgoLabel(minutesAgo),
            minutesAgo,
            score: hasTasks ? scoreForDay(`${area.areaId}-score`, dayOffset) : null,
            expected,
            servicedToday,
            shifts: shiftBreakdownFor(`${area.areaId}-${dayOffset}`, expected, servicedToday),
            percent,
            capturedLabel: hasTasks ? hours.capturedLabel : "0m",
            capturedPercent: hasTasks ? hours.percent : 0,
          });
        });
      });
    });
    return cards;
  }, [contractBuildings, dayOffset]);

  // List view's own Totals/Day/Graveyard/Swing compliance read —
  // site-wide (every real area, not scoped to whatever groupBy/search/
  // filter the grid itself is currently showing), same convention as
  // PerformanceSummaryCard's own always-site-wide numbers above.
  // primaryAreaShiftFor gives each area a single, disjoint shift so the
  // three shift columns partition the full area population instead of
  // all reading the same total (shiftBreakdownFor's own 3-way split, by
  // contrast, gives every area *some* load on all three shifts).
  const shiftComplianceColumns: ShiftComplianceColumn[] = useMemo(() => {
    const totalsColumn: ShiftComplianceColumn = {
      key: "totals",
      label: "Totals",
      totalAreas: individualAreaCards.length,
      servicedTotal: individualAreaCards.reduce((sum, c) => sum + c.servicedToday, 0),
      expectedTotal: individualAreaCards.reduce((sum, c) => sum + c.expected, 0),
      noServiceCount: individualAreaCards.filter((c) => c.servicedToday === 0).length,
      metGoalCount: individualAreaCards.filter((c) => areaExpectedHit(c)).length,
      overservicedCount: individualAreaCards.filter((c) => c.expected > 0 && c.servicedToday > c.expected).length,
    };

    const shiftColumns: ShiftComplianceColumn[] = AREA_SHIFT_NAMES.map((shiftName) => {
      const shiftAreas = individualAreaCards
        .filter((c) => primaryAreaShiftFor(c.key) === shiftName)
        .map((c) => c.shifts.find((s) => s.shift === shiftName)!);
      return {
        key: shiftName,
        label: shiftName,
        totalAreas: shiftAreas.length,
        servicedTotal: shiftAreas.reduce((sum, s) => sum + s.servicedToday, 0),
        expectedTotal: shiftAreas.reduce((sum, s) => sum + s.expected, 0),
        noServiceCount: shiftAreas.filter((s) => s.servicedToday === 0).length,
        metGoalCount: shiftAreas.filter((s) => s.expected > 0 && s.servicedToday >= s.expected).length,
        overservicedCount: shiftAreas.filter((s) => s.expected > 0 && s.servicedToday > s.expected).length,
      };
    });

    return [totalsColumn, ...shiftColumns];
  }, [individualAreaCards]);

  // Missed Services — every real (area type, shift) combination with at
  // least one area that had zero services on its own primary shift
  // (same primaryAreaShiftFor/shiftBreakdownFor pair the shift compliance
  // columns above already read, so this list is a real breakdown of
  // those same "no services" counts, not a separate random model).
  // Site-wide, same as shiftComplianceColumns — not scoped to whatever
  // groupBy/filter the grid itself is currently showing.
  const missedServiceGroups: MissedServiceGroup[] = useMemo(
    () => computeMissedServiceGroups(contractBuildings, dayOffset),
    [contractBuildings, dayOffset]
  );

  // Coarser date-preset ranges (Current Week, Current Month, ...) don't
  // move dayOffset off "today" (see selectDatePreset), so Missed
  // Services would otherwise just vanish for them. When the preset is
  // one of those ranges, aggregate across every completed day it
  // covers instead of the single dayOffset.
  const missedRangeOffsets = useMemo(() => missedRangeDayOffsets(datePreset), [datePreset]);
  const isRangeMissedView = missedRangeOffsets.length > 0;
  const rangeMissedServiceGroups: MissedServiceGroup[] = useMemo(
    () => (isRangeMissedView ? computeMissedServiceGroupsForRange(contractBuildings, missedRangeOffsets) : []),
    [isRangeMissedView, contractBuildings, missedRangeOffsets]
  );
  const activeMissedServiceGroups = isRangeMissedView ? rangeMissedServiceGroups : missedServiceGroups;
  const showMissedServicesTab = dayOffset >= 1 || isRangeMissedView;

  // Every missed group, bucketed by its own area type name — lets the
  // Area Types list (see AreaTypeListView's missedGroupsByAreaType prop)
  // show and acknowledge a row's own missed shifts right in that row,
  // without a separate panel duplicating the same data.
  const missedGroupsByAreaType: Map<string, MissedServiceGroup[]> = useMemo(() => {
    const map = new Map<string, MissedServiceGroup[]>();
    missedServiceGroups.forEach((g) => {
      const arr = map.get(g.areaTypeName) ?? [];
      arr.push(g);
      map.set(g.areaTypeName, arr);
    });
    return map;
  }, [missedServiceGroups]);

  function ackKeyFor(group: MissedServiceGroup, offset = dayOffset) {
    return `${offset}::${group.key}`;
  }

  // A range-aggregated group is acknowledged as its own thing, scoped to
  // that date preset — a separate namespace from any single day's own
  // ackKeyFor key, since "acknowledged for the week" isn't the same
  // claim as "acknowledged for yesterday specifically".
  function rangeAckKeyFor(group: MissedServiceGroup) {
    return `range::${datePreset}::${group.key}`;
  }

  function ackKeyForActiveView(group: MissedServiceGroup) {
    return isRangeMissedView ? rangeAckKeyFor(group) : ackKeyFor(group);
  }

  function acknowledgeMissedGroup(group: MissedServiceGroup, reason: string) {
    setAcknowledgedMissed((prev) => ({ ...prev, [ackKeyForActiveView(group)]: { reason, acknowledgedLabel: "Just now" } }));
    setActiveMissedGroup(null);
  }

  function acknowledgeAreaShift(subject: AreaShiftAckSubject, reason: string) {
    setAcknowledgedMissed((prev) => ({ ...prev, [subject.key]: { reason, acknowledgedLabel: "Just now" } }));
    setActiveAreaShiftAck(null);
  }

  // Today has no completed-day missed-services list of its own (the day
  // isn't over yet), but a manager landing on Today should still see
  // that earlier days need attention rather than only discovering it by
  // clicking back through the date picker. Looks back over the last
  // RECENT_MISSED_LOOKBACK_DAYS completed days for anything still
  // unacknowledged; only computed on Today itself, not on every day view.
  const recentMissedAlert: RecentMissedAlert | null = useMemo(() => {
    // Not just dayOffset === 0 — a range preset (Current Week, ...) also
    // leaves dayOffset at 0 (see selectDatePreset), but that case already
    // gets its own aggregated Missed Services tab (see isRangeMissedView)
    // instead of this "here's what changed since you left" banner.
    if (dayOffset !== 0 || datePreset !== "today") return null;
    let unacknowledgedGroupCount = 0;
    let daysWithIssues = 0;
    let mostRecentDayOffset: number | null = null;
    for (let offset = 1; offset <= RECENT_MISSED_LOOKBACK_DAYS; offset++) {
      const groups = computeMissedServiceGroups(contractBuildings, offset);
      const unacknowledged = groups.filter((g) => !acknowledgedMissed[ackKeyFor(g, offset)]);
      if (unacknowledged.length === 0) continue;
      unacknowledgedGroupCount += unacknowledged.length;
      daysWithIssues += 1;
      if (mostRecentDayOffset === null) mostRecentDayOffset = offset;
    }
    if (mostRecentDayOffset === null) return null;
    return { unacknowledgedGroupCount, daysWithIssues, mostRecentDayOffset };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOffset, contractBuildings, acknowledgedMissed]);

  // Filters down to the Area Types list itself (not the Areas drill-in —
  // selectedAreaType forces effectiveGroupBy to "areas" unconditionally,
  // see below, so investigating clears it and filters via the search box
  // instead) so a manager can see that one area type's own Last
  // Serviced/Avg Score/Expected Services/per-shift row without leaving
  // the aggregate view. The inline MissedServicesPanel rendered near
  // that filtered row (see searchMatchedMissedGroups) is what lets them
  // acknowledge right there too.
  // Drills into that area type's own real areas — the same
  // selectedAreaType mechanism an Area Type card's own click uses, so
  // it gets the same header title/breadcrumb change and the "Selected"
  // filter chip (with its own X to clear) for free, rather than a
  // separate one-off filter.
  function investigateMissedGroup(group: MissedServiceGroup) {
    setSearch("");
    onSelectAreaType(group.areaTypeName);
    // The whole point of investigating is seeing what actually went
    // wrong, so land straight on the areas that missed their own
    // target rather than every area of that type.
    setComplianceFilter("nonCompliant");
    // Waits a frame so the filtered-down results have actually rendered
    // (React commits the new search/selection state async) before
    // scrolling — otherwise this can scroll to where the row *will* be
    // rather than where it now is.
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function reviewRecentMissed(offset: number) {
    onJumpToDay(offset);
    setViewMode("list");
    areaTypesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Elements grouping — a generic fixture stand-in (see ELEMENT_NAMES's
  // own doc comment); not real per-fixture inventory.
  const elementCards: AreaTypeCardData[] = useMemo(
    () =>
      ELEMENT_NAMES.map((name) => {
        const seedKey = `element-${name}`;
        const qty = 20 + (hashSeed(seedKey) % 400);
        const expected = Math.max(1, Math.round(qty * 1.5));
        const servicedToday = Math.max(0, Math.round(expected * scaleForDay(`${seedKey}-serviced`, dayOffset, 0.3, 0.9)));
        const percent = Math.min(100, (servicedToday / expected) * 100);
        const hours = hoursCapturedForNode(seedKey, dayOffset);
        const minutesAgo = minutesAgoForSeed(`${seedKey}-timeago-${dayOffset}`);
        return {
          name,
          photo: undefined,
          timeAgo: formatMinutesAgoLabel(minutesAgo),
          minutesAgo,
          score: scoreForDay(`${seedKey}-score`, dayOffset),
          areaCount: qty,
          areasServicedToday: servicedToday,
          expected,
          servicedToday,
          percent,
          capturedLabel: hours.capturedLabel,
          paidLabel: hours.paidLabel,
          capturedPercent: hours.percent,
          buildings: [],
        };
      }),
    [dayOffset]
  );

  const q = search.trim().toLowerCase();

  // The two groupings that share AreaTypeCardData's shape (Area Types,
  // Elements) — Buildings and Areas each get their own filtered/sorted
  // computation below since neither is shaped the same way.
  const activeAreaTypeShapedCards: AreaTypeCardData[] = groupBy === "elements" ? elementCards : areaTypeCards;

  const filteredSortedCards = useMemo(() => {
    let arr = activeAreaTypeShapedCards;
    if (q) arr = arr.filter((c) => c.name.toLowerCase().includes(q));
    if (buildingFilter !== "all" && groupBy !== "elements") arr = arr.filter((c) => c.buildings.includes(buildingFilter));
    if (shiftFilter !== "all") arr = arr.filter((c) => primaryShiftFor(c.name) === shiftFilter);
    const sorted = [...arr];
    if (sortOrder === "score-desc") sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    else if (sortOrder === "score-asc") sorted.sort((a, b) => (a.score ?? 6) - (b.score ?? 6));
    else sorted.sort((a, b) => a.minutesAgo - b.minutesAgo);
    return sorted;
  }, [activeAreaTypeShapedCards, q, buildingFilter, shiftFilter, sortOrder, groupBy]);

  // Areas grouping's own filtered/sorted computation — AreaCardData isn't
  // shaped like AreaTypeCardData (a real building name instead of a list
  // of buildings, no group count).
  const filteredSortedAreaCards = useMemo(() => {
    let arr = individualAreaCards;
    if (selectedAreaType) arr = arr.filter((c) => c.areaTypeName === selectedAreaType);
    if (q) arr = arr.filter((c) => c.name.toLowerCase().includes(q) || c.areaTypeName.toLowerCase().includes(q));
    if (buildingFilter !== "all") arr = arr.filter((c) => c.buildingName === buildingFilter);
    if (shiftFilter !== "all") arr = arr.filter((c) => primaryShiftFor(c.key) === shiftFilter);
    if (complianceFilter === "compliant") arr = arr.filter((c) => areaExpectedHit(c));
    else if (complianceFilter === "nonCompliant") arr = arr.filter((c) => !areaExpectedHit(c));
    const sorted = [...arr];
    if (sortOrder === "score-desc") sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    else if (sortOrder === "score-asc") sorted.sort((a, b) => (a.score ?? 6) - (b.score ?? 6));
    else sorted.sort((a, b) => a.minutesAgo - b.minutesAgo);
    return sorted;
  }, [individualAreaCards, selectedAreaType, q, buildingFilter, shiftFilter, complianceFilter, sortOrder]);

  // Buildings grouping's own filtered/sorted computation — BuildingCardData
  // isn't shaped like AreaTypeCardData, so it can't share the memo above.
  const filteredSortedBuildingCards = useMemo(() => {
    let arr = buildingCards;
    if (q) arr = arr.filter((c) => c.name.toLowerCase().includes(q));
    if (buildingFilter !== "all") arr = arr.filter((c) => c.name === buildingFilter);
    if (shiftFilter !== "all") arr = arr.filter((c) => primaryShiftFor(c.name) === shiftFilter);
    const sorted = [...arr];
    if (sortOrder === "score-desc") sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    else if (sortOrder === "score-asc") sorted.sort((a, b) => (a.score ?? 6) - (b.score ?? 6));
    else sorted.sort((a, b) => a.minutesAgo - b.minutesAgo);
    return sorted;
  }, [buildingCards, q, buildingFilter, shiftFilter, sortOrder]);

  const buildingCount = contractBuildings.length;
  const areaTypeCount = areaTypeGroups.length;
  const areaCount = contractBuildings.reduce((sum, b) => sum + b.areaCount, 0);

  const buildingFilterOptions = useMemo(
    () => [{ value: "all", label: "All Spaces" }, ...contractBuildings.map((b) => ({ value: b.name, label: b.name }))],
    [contractBuildings]
  );

  // Drilled into one Area Type (a card or list row was clicked) — the
  // grid/list always shows that area type's own real areas regardless
  // of whatever groupBy chip was last active, and the meta chips scope
  // down to just Buildings/Areas/Elements (no "Area Types" chip, since
  // we're already inside one).
  const scopedAreaTypeGroup = selectedAreaType ? areaTypeGroups.find((g) => g.name === selectedAreaType) : undefined;
  const effectiveGroupBy: GroupBy = selectedAreaType ? "areas" : groupBy;

  const metaCountOptions: ButtonGroupOption<GroupBy>[] = selectedAreaType
    ? [
        {
          id: "buildings",
          label: `${scopedAreaTypeGroup?.buildings.length ?? 0} Buildings`,
          icon: <i className="fa-solid fa-building" aria-hidden="true" />,
        },
        {
          id: "areas",
          label: `${scopedAreaTypeGroup?.areas.length ?? 0} Areas`,
          icon: <i className="fa-solid fa-vector-square" aria-hidden="true" />,
        },
        { id: "elements", label: `${ELEMENT_NAMES.length} Elements`, icon: <i className="fa-solid fa-cube" aria-hidden="true" /> },
      ]
    : [
        { id: "areaTypes", label: `${areaTypeCount} Area Types`, icon: <i className="fa-solid fa-object-ungroup" aria-hidden="true" /> },
        { id: "buildings", label: `${buildingCount} Buildings`, icon: <i className="fa-solid fa-building" aria-hidden="true" /> },
        { id: "areas", label: `${areaCount.toLocaleString()} Areas`, icon: <i className="fa-solid fa-vector-square" aria-hidden="true" /> },
        { id: "elements", label: `${ELEMENT_NAMES.length} Elements`, icon: <i className="fa-solid fa-cube" aria-hidden="true" /> },
      ];

  const searchPlaceholder =
    effectiveGroupBy === "buildings"
      ? "Find a building"
      : effectiveGroupBy === "areas"
        ? "Find an area"
        : effectiveGroupBy === "elements"
          ? "Find an element"
          : "Find an area type";

  // Same deterministic day-variation convention as the rest of this
  // dataset (lib/sowData.ts's scaleForDay) — real fixed anchors
  // (lib/sowData.ts's facilitySummary) scaled by a per-day multiplier,
  // so the coverage sentence and the date label always move together
  // and a revisited day reproduces the same numbers.
  const scale = scaleForDay("facility-summary", dayOffset, 0.85, 1.12);
  const completionScale = scaleForDay("facility-summary-completion", dayOffset, 0.55, 0.9);
  const capturedPctScale = scaleForDay("facility-hours-pct-scale", dayOffset, 0.9, 1.08);
  const teamMembers = Math.max(1, Math.round(facilitySummary.teamMembers * scale));
  const verificationsExpected = Math.max(1, Math.round(facilitySummary.verificationsExpected * scale));
  const verificationsCompleted = Math.min(
    verificationsExpected,
    Math.max(1, Math.round(verificationsExpected * completionScale))
  );
  const paidMinutes = Math.round(parseHoursLabelToMinutes(facilitySummary.paidHours) * scale);
  const hoursCapturedPercent = Math.min(100, Math.round(facilitySummary.hoursCapturedPercent * capturedPctScale));
  const capturedMinutes = Math.round((paidMinutes * hoursCapturedPercent) / 100);
  const flightsSupported = Math.max(1, Math.round(facilitySummary.flightsSupported * scale));
  const todayWord = dayOffset === 0 ? "Today" : formatDateLabel(dayOffset).split(",")[0];

  // Staffing facepile — a preview of the real roster (not fabricated
  // names/photos, per this project's own sample-data convention) plus
  // an overflow bubble that always reconciles back to the real
  // teamMembers count above.
  const staffingRoster = useMemo(() => [...associates, ...managers], [associates, managers]);
  const staffingAvatarPreview = staffingRoster.slice(0, 8);
  const staffingOverflowCount = Math.max(0, teamMembers - staffingAvatarPreview.length);

  // Post-Departure Services — no real per-flight timing data in this
  // dataset (same caveat as the Buildings grouping's own
  // departures/arrivals figures above), so this is a deterministic,
  // day-varying illustrative rate applied to half of today's real
  // flightsSupported count.
  const postDepartureWindowMinutes = 15;
  const postDepartureExpected = Math.max(1, Math.round(flightsSupported * 0.5));
  const postDeparturePercent = Math.min(
    100,
    Math.max(1, Math.round(18 * scaleForDay("post-departure-pct", dayOffset, 0.6, 1.6)))
  );
  const onTimeServicesCount = Math.max(0, Math.round((postDepartureExpected * postDeparturePercent) / 100));

  return (
    <>
      {recentMissedAlert && <RecentMissedServicesBanner alert={recentMissedAlert} onReview={reviewRecentMissed} />}

      <section className={styles.activitySection}>
        {featuredActivityItem ? (
          <div className={styles.activityLayout}>
            <FeaturedActivityCard item={featuredActivityItem} />
            {secondaryActivityItems.length > 0 && (
              <div className={styles.activitySecondaryGrid}>
                {secondaryActivityItems.map((item, i) => (
                  <SecondaryActivityCard item={item} key={`${item.location}-${i}`} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className={styles.resultsEmpty}>No recent activity matches these filters.</p>
        )}
      </section>

      <div
        className={[styles.exploreAreaTypesBar, showExploreBar ? "" : styles.exploreAreaTypesBarHidden]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={!showExploreBar}
      >
        <button
          type="button"
          className={styles.exploreAreaTypesLink}
          tabIndex={showExploreBar ? 0 : -1}
          onClick={() => areaTypesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <i className="fa-solid fa-grid-2" aria-hidden="true" />
          Explore Area Types
          <i className="fa-solid fa-chevron-down" aria-hidden="true" />
        </button>
      </div>

      <section ref={areaTypesRef} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className={styles.metaBar}>
          <div className={styles.metaLeft}>
            <ButtonGroup
              options={metaCountOptions}
              value={effectiveGroupBy}
              onChange={(v) => {
                onSelectAreaType(null);
                setGroupBy(v);
              }}
              aria-label="Group by"
            />
            <Input
              wrapperClassName={styles.searchField}
              placeholder={searchPlaceholder}
              icon={<SearchIcon />}
              theme="light"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={searchPlaceholder}
            />
            <button
              type="button"
              className={styles.viewToggleButton}
              onClick={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}
            >
              <i className={`fa-solid ${viewMode === "grid" ? "fa-list" : "fa-table-cells"}`} aria-hidden="true" />
              {viewMode === "grid" ? "List" : "Grid"}
            </button>
          </div>
          <div className={styles.filterFieldGroup}>
            {effectiveGroupBy === "areas" ? (
              <DsSelect
                value={complianceFilter}
                onChange={(v) => setComplianceFilter(v as ComplianceFilter)}
                options={COMPLIANCE_FILTER_OPTIONS}
                ariaLabel="Filter by compliance"
                label="Filter"
              />
            ) : (
              <DsSelect value={buildingFilter} onChange={setBuildingFilter} options={buildingFilterOptions} ariaLabel="Filter by space" label="Filter" />
            )}
            <DsSelect value={shiftFilter} onChange={setShiftFilter} options={SHIFT_FILTER_OPTIONS} ariaLabel="Filter by shift" />
            <DsSelect
              value={sortOrder}
              onChange={(v) => setSortOrder(v as SortOrder)}
              options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
              ariaLabel="Sort"
              label="Sort"
            />
          </div>
        </div>

        {selectedAreaType && (
          <div className={styles.selectedChipRow}>
            <span className={styles.selectedChipLabel}>Selected</span>
            <button
              type="button"
              className={styles.selectedChip}
              onClick={() => {
                onSelectAreaType(null);
                setComplianceFilter("all");
              }}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
              {selectedAreaType}
            </button>
          </div>
        )}

        {viewMode === "grid" && (
          <PerformanceSummaryCard
            teamMembers={teamMembers}
            avatarPreview={staffingAvatarPreview}
            avatarOverflowCount={staffingOverflowCount}
            verificationsCompleted={verificationsCompleted}
            verificationsExpected={verificationsExpected}
            servicesCompletePercent={verificationsExpected > 0 ? (verificationsCompleted / verificationsExpected) * 100 : 0}
            capturedMinutes={capturedMinutes}
            paidMinutes={paidMinutes}
            hoursCapturedPercent={hoursCapturedPercent}
            postDeparturePercent={postDeparturePercent}
            postDepartureWindowMinutes={postDepartureWindowMinutes}
            onTimeServicesCount={onTimeServicesCount}
            todayWord={todayWord}
            areaTypeCount={areaTypeCount}
            flightsSupported={flightsSupported}
          />
        )}

        {viewMode === "list" && (
          <>
            {showMissedServicesTab && (
              <ButtonGroup
                options={SUMMARY_VIEW_OPTIONS(activeMissedServiceGroups.length)}
                value={summaryView}
                onChange={setSummaryView}
                aria-label="Summary view"
              />
            )}

            {showMissedServicesTab && summaryView === "missed" ? (
              <MissedServicesPanel
                dayOffset={dayOffset}
                groups={activeMissedServiceGroups}
                acknowledgedMissed={acknowledgedMissed}
                ackKeyForGroup={ackKeyForActiveView}
                onOpenAcknowledge={setActiveMissedGroup}
                onInvestigate={isRangeMissedView ? undefined : investigateMissedGroup}
                title={isRangeMissedView ? `Missed Services — Last ${missedRangeOffsets.length} Days` : undefined}
                periodLabel={isRangeMissedView ? `over the last ${missedRangeOffsets.length} days` : undefined}
              />
            ) : (
              <ShiftComplianceSummary columns={shiftComplianceColumns} />
            )}

            <MissedServiceAckModal
              group={activeMissedGroup}
              dayLabel={dayLabelForOffset(dayOffset)}
              periodLabel={isRangeMissedView ? `over the last ${missedRangeOffsets.length} days` : undefined}
              onClose={() => setActiveMissedGroup(null)}
              onSubmit={acknowledgeMissedGroup}
            />
            <AreaShiftAckModal
              subject={activeAreaShiftAck}
              dayLabel={dayLabelForOffset(dayOffset)}
              onClose={() => setActiveAreaShiftAck(null)}
              onSubmit={acknowledgeAreaShift}
            />
          </>
        )}

        <div ref={resultsRef}>
          {effectiveGroupBy === "buildings" ? (
            filteredSortedBuildingCards.length === 0 ? (
              <p className={styles.resultsEmpty}>No buildings match these filters.</p>
            ) : viewMode === "grid" ? (
              <div className={styles.areaTypeGrid}>
                {filteredSortedBuildingCards.map((card) => (
                  <BuildingCard card={card} dayLabel={dayLabelForOffset(dayOffset)} key={card.name} />
                ))}
              </div>
            ) : (
              <AreaTypeListView cards={filteredSortedBuildingCards} firstColumnLabel="Building" />
            )
          ) : effectiveGroupBy === "areas" ? (
            filteredSortedAreaCards.length === 0 ? (
              <p className={styles.resultsEmpty}>No areas match these filters.</p>
            ) : viewMode === "grid" ? (
              <div className={styles.areaTypeGrid}>
                {filteredSortedAreaCards.map((card) => (
                  <AreaCard card={card} key={card.key} />
                ))}
              </div>
            ) : (
              <AreaListView
                cards={filteredSortedAreaCards}
                acknowledgedMissed={dayOffset >= 1 ? acknowledgedMissed : undefined}
                dayOffset={dayOffset}
                onOpenAreaShiftAck={dayOffset >= 1 ? setActiveAreaShiftAck : undefined}
              />
            )
          ) : filteredSortedCards.length === 0 ? (
            <p className={styles.resultsEmpty}>No results match these filters.</p>
          ) : viewMode === "grid" ? (
            <div className={styles.areaTypeGrid}>
              {filteredSortedCards.map((card) => (
                <AreaTypeCard
                  card={card}
                  dayLabel={dayLabelForOffset(dayOffset)}
                  key={card.name}
                  onSelect={groupBy === "areaTypes" ? () => onSelectAreaType(card.name) : undefined}
                />
              ))}
            </div>
          ) : (
            <AreaTypeListView
              cards={filteredSortedCards}
              firstColumnLabel={effectiveGroupBy === "elements" ? "Element" : "Area Type"}
              variant={effectiveGroupBy === "elements" ? "compact" : "full"}
              onSelectAreaType={groupBy === "areaTypes" ? onSelectAreaType : undefined}
              missedGroupsByAreaType={groupBy === "areaTypes" && dayOffset >= 1 ? missedGroupsByAreaType : undefined}
              acknowledgedMissed={acknowledgedMissed}
              dayOffset={dayOffset}
              onOpenAcknowledge={setActiveMissedGroup}
            />
          )}
        </div>
      </section>
    </>
  );
}

function AreaTypeCard({
  card,
  dayLabel,
  onSelect,
}: {
  card: AreaTypeCardData;
  dayLabel: string;
  onSelect?: () => void;
}) {
  return (
    <Card
      className={[styles.areaTypeCard, onSelect ? styles.areaTypeCardClickable : ""].filter(Boolean).join(" ")}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <div className={styles.areaTypeCardPhotoWrap}>
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt="" className={styles.areaTypeCardPhoto} />
        ) : (
          <div className={styles.areaTypeCardPhotoPlaceholder}>
            <i className="fa-solid fa-image" aria-hidden="true" />
          </div>
        )}
        <span className={styles.areaTypeCardTimeBadge}>{card.timeAgo}</span>
      </div>
      <div className={styles.areaTypeCardBody}>
        <div className={styles.areaTypeCardTitleRow}>
          <div className={styles.areaTypeCardTitleBlock}>
            <span className={styles.areaTypeCardTitle}>
              <span>{card.name}</span>
              <span>({card.areaCount})</span>
            </span>
            <span className={styles.areaTypeCardServicedToday}>
              {card.areasServicedToday} Serviced {dayLabel}
            </span>
          </div>
          <span
            className={[styles.scoreBadge, card.score === null ? styles.scoreBadgeNone : ""].filter(Boolean).join(" ")}
          >
            {card.score === null ? "N/A" : formatScore(card.score)}
          </span>
        </div>
        <div className={styles.areaTypeCardProgressStack}>
          <div className={styles.areaTypeCardProgressGroup}>
            <div className={styles.areaTypeCardProgressLine}>
              <span className={styles.areaTypeCardProgressLabel}>
                {card.servicedToday} of {card.expected} expected services
              </span>
              <span className={styles.areaTypeCardProgressPercent}>{Math.round(card.percent)}%</span>
            </div>
            <span className={styles.areaTypeCardProgressTrack}>
              <span className={styles.areaTypeCardProgressFill} style={{ width: `${card.percent}%` }} />
            </span>
          </div>
          <div className={styles.areaTypeCardProgressGroup}>
            <div className={styles.areaTypeCardProgressLine}>
              <span className={styles.areaTypeCardProgressLabel}>
                {card.capturedLabel} of {card.paidLabel} Exp Captured
              </span>
              <span className={styles.areaTypeCardProgressPercent}>{Math.round(card.capturedPercent)}%</span>
            </div>
            <span className={styles.areaTypeCardProgressTrack}>
              <span
                className={[styles.areaTypeCardProgressFill, styles.areaTypeCardProgressFillCaptured].join(" ")}
                style={{ width: `${card.capturedPercent}%` }}
              />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BuildingCard({ card, dayLabel }: { card: BuildingCardData; dayLabel: string }) {
  return (
    <Card className={styles.areaTypeCard}>
      <div className={styles.areaTypeCardPhotoWrap}>
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt="" className={styles.areaTypeCardPhoto} />
        ) : (
          <div className={styles.areaTypeCardPhotoPlaceholder}>
            <i className="fa-solid fa-image" aria-hidden="true" />
          </div>
        )}
        <span className={styles.areaTypeCardTimeBadge}>{card.timeAgo}</span>
        {/* Only the concourses (D/E/F/G) actually front gates/jet bridges — Headhouse, Mainline, and Pavilion have no flight activity to badge. */}
        {card.name.startsWith("Concourse") && (
          <div className={styles.buildingFlightBadges}>
            <span className={styles.buildingFlightBadge}>
              <i className="fa-solid fa-plane-departure" aria-hidden="true" />
              {card.departures} Departures
            </span>
            <span className={styles.buildingFlightBadge}>
              <i className="fa-solid fa-plane-arrival" aria-hidden="true" />
              {card.arrivals} Arrivals
            </span>
          </div>
        )}
      </div>
      <div className={styles.areaTypeCardBody}>
        <div className={styles.areaTypeCardTitleRow}>
          <div className={styles.areaTypeCardTitleBlock}>
            <span className={styles.areaTypeCardTitle}>
              <span>{card.name}</span>
              <span>({card.areaCount})</span>
            </span>
            <span className={styles.areaTypeCardServicedToday}>
              {card.areasServicedToday} Serviced {dayLabel}
            </span>
          </div>
          <span className={[styles.scoreBadge, card.score === null ? styles.scoreBadgeNone : ""].filter(Boolean).join(" ")}>
            {card.score === null ? "N/A" : formatScore(card.score)}
          </span>
        </div>
        <div className={styles.areaTypeCardProgressStack}>
          <div className={styles.areaTypeCardProgressGroup}>
            <div className={styles.areaTypeCardProgressLine}>
              <span className={styles.areaTypeCardProgressLabel}>
                {card.servicedToday} of {card.expected} Expected Services
              </span>
              <span className={styles.areaTypeCardProgressPercent}>{card.percent.toFixed(2)}%</span>
            </div>
            <span className={styles.areaTypeCardProgressTrack}>
              <span className={styles.areaTypeCardProgressFill} style={{ width: `${card.percent}%` }} />
            </span>
          </div>
          <div className={styles.areaTypeCardProgressGroup}>
            <div className={styles.areaTypeCardProgressLine}>
              <span className={styles.areaTypeCardProgressLabel}>{card.capturedLabel} Captured</span>
            </div>
            <span className={styles.areaTypeCardProgressTrack}>
              <span
                className={[styles.areaTypeCardProgressFill, styles.areaTypeCardProgressFillCaptured].join(" ")}
                style={{ width: `${card.capturedPercent}%` }}
              />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AreaCard({ card }: { card: AreaCardData }) {
  return (
    <Card className={styles.areaTypeCard}>
      <div className={styles.areaTypeCardPhotoWrap}>
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt="" className={styles.areaTypeCardPhoto} />
        ) : (
          <div className={styles.areaTypeCardPhotoPlaceholder}>
            <i className="fa-solid fa-image" aria-hidden="true" />
          </div>
        )}
        <span className={styles.areaTypeCardTimeBadge}>{card.timeAgo}</span>
      </div>
      <div className={styles.areaTypeCardBody}>
        <div className={styles.areaTypeCardTitleRow}>
          <div className={styles.areaTypeCardTitleBlock}>
            <span className={styles.areaTypeCardTitle}>
              <span>{card.name}</span>
            </span>
            <div className={styles.areaCardMetaList}>
              <span className={styles.areaCardMetaLine}>Area Type: {card.areaTypeName}</span>
              <span className={styles.areaCardMetaLine}>Building: {card.buildingName}</span>
              <span className={styles.areaCardMetaLine}>
                Floor: {card.floor}
                {card.floorDescription ? ` (${card.floorDescription})` : ""}
              </span>
            </div>
          </div>
          <span className={[styles.scoreBadge, card.score === null ? styles.scoreBadgeNone : ""].filter(Boolean).join(" ")}>
            {card.score === null ? "N/A" : formatScore(card.score)}
          </span>
        </div>
        <div className={styles.areaTypeCardProgressStack}>
          <div className={styles.areaTypeCardProgressGroup}>
            <div className={styles.areaTypeCardProgressLine}>
              <span className={styles.areaTypeCardProgressLabel}>
                {card.servicedToday} of {card.expected} Expected Services
              </span>
              <span className={styles.areaTypeCardProgressPercent}>{Math.round(card.percent)}%</span>
            </div>
            <span className={styles.areaTypeCardProgressTrack}>
              <span className={styles.areaTypeCardProgressFill} style={{ width: `${Math.min(100, card.percent)}%` }} />
            </span>
          </div>
          <div className={styles.areaTypeCardProgressGroup}>
            <div className={styles.areaTypeCardProgressLine}>
              <span className={styles.areaTypeCardProgressLabel}>{card.capturedLabel} Captured</span>
            </div>
            <span className={styles.areaTypeCardProgressTrack}>
              <span
                className={[styles.areaTypeCardProgressFill, styles.areaTypeCardProgressFillCaptured].join(" ")}
                style={{ width: `${card.capturedPercent}%` }}
              />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

type AreaListSortKey = "lastServiced" | "avgScore" | "totalServices" | "expectedServices" | AreaShiftName;
type AreaListSortState = { key: AreaListSortKey; dir: "asc" | "desc" } | null;

function areaExpectedHit(card: { score: number | null; expected: number; servicedToday: number }): boolean {
  return card.score !== null && card.expected > 0 && card.servicedToday >= card.expected;
}

/**
 * The Areas list — same sortable-table shape as AreaTypeListView, plus
 * a per-shift breakdown (Day/Graveyard/Swing, see shiftBreakdownFor)
 * after a thin divider: three more "ratio baked into the bar" cells
 * reading the exact same red/green compliance rule as Expected
 * Services, just scoped to that one shift's own target.
 */
function AreaListView({
  cards,
  acknowledgedMissed,
  dayOffset,
  onOpenAreaShiftAck,
}: {
  cards: AreaCardData[];
  /** Compliance Acknowledgement only — lets each area's own missed shift cell (0 of N, see below) show an acknowledge control. Omitted entirely elsewhere. */
  acknowledgedMissed?: Record<string, MissedServiceAck>;
  dayOffset?: number;
  onOpenAreaShiftAck?: (subject: AreaShiftAckSubject) => void;
}) {
  const [sortState, setSortState] = useState<AreaListSortState>(null);

  function onSort(key: AreaListSortKey) {
    setSortState((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  const sortedCards = useMemo(() => {
    if (!sortState) return cards;
    const dirMul = sortState.dir === "asc" ? 1 : -1;
    const valueFor = (card: AreaCardData): number => {
      switch (sortState.key) {
        case "lastServiced":
          return -card.minutesAgo;
        case "avgScore":
          return card.score ?? -1;
        case "totalServices":
          return card.servicedToday;
        case "expectedServices":
          return card.percent;
        default: {
          const shift = card.shifts.find((s) => s.shift === sortState.key);
          return shift && shift.expected > 0 ? shift.servicedToday / shift.expected : 0;
        }
      }
    };
    return [...cards].sort((a, b) => dirMul * (valueFor(a) - valueFor(b)));
  }, [cards, sortState]);

  return (
    <div className={styles.areaTypeTableWrap}>
      <div className={[styles.areaTypeTableHeaderRow, styles.areaListTableGrid].join(" ")}>
        <span className={styles.areaTypeTableHeaderCell}>Area</span>
        <AreaTypeListSortHeader label="Last Serviced" columnKey="lastServiced" sortState={sortState} onSort={onSort} />
        <AreaTypeListSortHeader label="Avg. Score" columnKey="avgScore" sortState={sortState} onSort={onSort} />
        <AreaTypeListSortHeader label="Total Services" columnKey="totalServices" sortState={sortState} onSort={onSort} />
        <AreaTypeListSortHeader label="Expected Services" columnKey="expectedServices" sortState={sortState} onSort={onSort} />
        <span className={styles.areaTypeTableDivider} aria-hidden="true" />
        {AREA_SHIFT_NAMES.map((shift) => (
          <AreaTypeListSortHeader label={shift} columnKey={shift} sortState={sortState} onSort={onSort} key={shift} />
        ))}
      </div>

      <div className={styles.areaTypeTableRows}>
        {sortedCards.map((card) => {
          const expectedHit = areaExpectedHit(card);
          return (
            <div className={[styles.areaTypeTableRow, styles.areaListTableGrid].join(" ")} key={card.key}>
              <div className={styles.areaTypeListNameCell}>
                {card.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.photo} alt="" className={styles.areaTypeTableThumb} />
                ) : (
                  <div className={[styles.areaTypeTableThumb, styles.areaTypeListThumbPlaceholder].join(" ")}>
                    <i className="fa-solid fa-image" aria-hidden="true" />
                  </div>
                )}
                <div className={styles.areaTypeListNameStack}>
                  <span className={styles.areaTypeListName}>{card.name}</span>
                  <span className={styles.areaTypeListNameSub}>
                    {card.buildingName} · {card.floor}
                    {card.floorDescription ? ` (${card.floorDescription})` : ""}
                  </span>
                </div>
              </div>
              <span className={styles.areaTypeTableCell}>
                <i className="fa-regular fa-clock" aria-hidden="true" /> {card.timeAgo}
              </span>
              <span className={[styles.scoreBadge, card.score === null ? styles.scoreBadgeNone : ""].filter(Boolean).join(" ")}>
                {card.score === null ? "N/A" : formatScore(card.score)}
              </span>
              <span className={styles.areaTypeTableCell}>{card.servicedToday}</span>
              <div className={styles.listBarCell}>
                <span
                  className={[styles.listBarFill, expectedHit ? styles.listBarFillHit : ""].filter(Boolean).join(" ")}
                  style={{ width: `${Math.min(100, card.percent)}%` }}
                />
                <span className={styles.listBarLabel}>
                  {card.servicedToday} of {card.expected}
                  {expectedHit && <i className="fa-regular fa-circle-check" aria-hidden="true" />}
                </span>
              </div>
              <span className={styles.areaTypeTableDivider} aria-hidden="true" />
              {card.shifts.map((shift) => {
                const hit = shift.expected > 0 && shift.servicedToday >= shift.expected;
                const missed = shift.expected > 0 && shift.servicedToday === 0;
                const ackKey = missed && dayOffset !== undefined ? areaShiftAckKey(dayOffset, card.key, shift.shift) : null;
                const ack = ackKey ? acknowledgedMissed?.[ackKey] : undefined;
                return (
                  <div className={styles.listBarCell} key={shift.shift}>
                    <span
                      className={[styles.listBarFill, hit ? styles.listBarFillHit : ""].filter(Boolean).join(" ")}
                      style={{ width: `${shift.expected > 0 ? Math.min(100, (shift.servicedToday / shift.expected) * 100) : 0}%` }}
                    />
                    <span className={styles.listBarLabel}>
                      {shift.servicedToday} of {shift.expected}
                      {hit && <i className="fa-regular fa-circle-check" aria-hidden="true" />}
                      {ackKey && onOpenAreaShiftAck && (
                        ack ? (
                          <i
                            className={["fa-solid fa-circle-check", styles.areaShiftAckedIcon].join(" ")}
                            aria-hidden="true"
                            title={`Acknowledged: ${ack.reason}`}
                          />
                        ) : (
                          <button
                            type="button"
                            className={styles.areaShiftAckButton}
                            aria-label={`Acknowledge missed ${shift.shift} shift for ${card.name}`}
                            title="Acknowledge missed service"
                            onClick={() =>
                              onOpenAreaShiftAck({
                                key: ackKey,
                                areaName: card.name,
                                buildingName: card.buildingName,
                                shift: shift.shift,
                                expected: shift.expected,
                              })
                            }
                          >
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                          </button>
                        )
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type AreaTypeListSortKey = "lastServiced" | "avgScore" | "totalServices" | "expectedServices" | "areasServiced";
type AreaTypeListSortState = { key: AreaTypeListSortKey; dir: "asc" | "desc" } | null;

/** The subset of AreaTypeCardData's shape this table actually reads — BuildingCardData carries every one of these fields too, so the same sortable table renders the Buildings list view (label "Building") with no separate component. */
type ListTableCardData = {
  name: string;
  photo?: string;
  timeAgo: string;
  minutesAgo: number;
  score: number | null;
  areaCount: number;
  areasServicedToday: number;
  expected: number;
  servicedToday: number;
  percent: number;
};

function areaTypeExpectedHit(card: ListTableCardData): boolean {
  return card.score !== null && card.expected > 0 && card.servicedToday >= card.expected;
}

function areaTypeAreasHit(card: ListTableCardData): boolean {
  return card.score !== null && card.areaCount > 0 && card.areasServicedToday >= card.areaCount;
}

function AreaTypeListSortHeader<K extends string>({
  label,
  columnKey,
  sortState,
  onSort,
}: {
  label: string;
  columnKey: K;
  sortState: { key: K; dir: "asc" | "desc" } | null;
  onSort: (key: K) => void;
}) {
  const active = sortState?.key === columnKey;
  return (
    <button
      type="button"
      className={[styles.areaTypeTableHeaderCell, active ? styles.areaTypeTableHeaderCellActive : ""].filter(Boolean).join(" ")}
      onClick={() => onSort(columnKey)}
      aria-sort={active ? (sortState!.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <i
        className={[
          "fa-solid",
          active && sortState!.dir === "asc" ? "fa-caret-up" : "fa-caret-down",
          styles.areaTypeTableHeaderCaret,
          active ? styles.areaTypeTableHeaderCaretActive : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * The "View by: Area Type" (and Elements / Buildings, which share
 * ListTableCardData's shape) list — a real sortable table: a photo +
 * name/area-count cell, Last Serviced, Avg Score, a real Total
 * Services count, and two inline progress bars (Expected Services,
 * Areas Serviced) with the ratio baked into the bar itself rather
 * than sitting above it. Both bars turn green with a checkmark once
 * their target is actually hit (serviced >= expected, or every area
 * in the type serviced today) — an honest reflection of the same
 * numbers the Grid view's cards show, not a separate stat.
 */
function AreaTypeListView({
  cards,
  firstColumnLabel = "Area Type",
  variant = "full",
  onSelectAreaType,
  missedGroupsByAreaType,
  acknowledgedMissed,
  dayOffset,
  onOpenAcknowledge,
}: {
  cards: ListTableCardData[];
  firstColumnLabel?: string;
  /** "compact" drops the Expected Services / Areas Serviced bars (Elements have no per-area service target worth tracking) down to just name/Last Serviced/Avg Score/Total Services. */
  variant?: "full" | "compact";
  onSelectAreaType?: (name: string) => void;
  /** Compliance Acknowledgement only — that row's own real missed-service groups (see ComplianceAcknowledgementPage's own missedGroupsByAreaType), keyed by area type name. Omitted entirely for Buildings/Elements, where missed services don't apply. */
  missedGroupsByAreaType?: Map<string, MissedServiceGroup[]>;
  acknowledgedMissed?: Record<string, MissedServiceAck>;
  dayOffset?: number;
  onOpenAcknowledge?: (group: MissedServiceGroup) => void;
}) {
  const [sortState, setSortState] = useState<AreaTypeListSortState>(null);

  function onSort(key: AreaTypeListSortKey) {
    setSortState((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  const sortedCards = useMemo(() => {
    if (!sortState) return cards;
    const dirMul = sortState.dir === "asc" ? 1 : -1;
    const valueFor = (card: ListTableCardData): number => {
      switch (sortState.key) {
        case "lastServiced":
          return -card.minutesAgo;
        case "avgScore":
          return card.score ?? -1;
        case "totalServices":
          return card.servicedToday;
        case "expectedServices":
          return card.percent;
        case "areasServiced":
          return card.areaCount > 0 ? card.areasServicedToday / card.areaCount : 0;
        default:
          return 0;
      }
    };
    return [...cards].sort((a, b) => dirMul * (valueFor(a) - valueFor(b)));
  }, [cards, sortState]);

  return (
    <div className={styles.areaTypeTableWrap}>
      <div
        className={[styles.areaTypeTableHeaderRow, variant === "compact" ? styles.areaTypeTableGridCompact : styles.areaTypeTableGrid].join(
          " "
        )}
      >
        <span className={styles.areaTypeTableHeaderCell}>{firstColumnLabel}</span>
        <AreaTypeListSortHeader label="Last Serviced" columnKey="lastServiced" sortState={sortState} onSort={onSort} />
        <AreaTypeListSortHeader label="Avg. Score" columnKey="avgScore" sortState={sortState} onSort={onSort} />
        <AreaTypeListSortHeader label="Total Services" columnKey="totalServices" sortState={sortState} onSort={onSort} />
        {variant === "full" && (
          <>
            <AreaTypeListSortHeader label="Expected Services" columnKey="expectedServices" sortState={sortState} onSort={onSort} />
            <AreaTypeListSortHeader label="Areas Serviced" columnKey="areasServiced" sortState={sortState} onSort={onSort} />
          </>
        )}
      </div>

      <div className={styles.areaTypeTableRows}>
        {sortedCards.map((card) => {
          const expectedHit = areaTypeExpectedHit(card);
          const areasHit = areaTypeAreasHit(card);
          const rowMissedGroups = missedGroupsByAreaType?.get(card.name) ?? [];
          const rowUnacknowledgedMissed = rowMissedGroups.filter((g) => !acknowledgedMissed?.[`${dayOffset}::${g.key}`]);
          return (
            <div
              className={[
                styles.areaTypeTableRow,
                variant === "compact" ? styles.areaTypeTableGridCompact : styles.areaTypeTableGrid,
                onSelectAreaType ? styles.areaTypeCardClickable : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={card.name}
              role={onSelectAreaType ? "button" : undefined}
              tabIndex={onSelectAreaType ? 0 : undefined}
              onClick={onSelectAreaType ? () => onSelectAreaType(card.name) : undefined}
              onKeyDown={
                onSelectAreaType
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectAreaType(card.name);
                      }
                    }
                  : undefined
              }
            >
              <div className={styles.areaTypeListNameCell}>
                {card.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.photo} alt="" className={styles.areaTypeTableThumb} />
                ) : (
                  <div className={[styles.areaTypeTableThumb, styles.areaTypeListThumbPlaceholder].join(" ")}>
                    <i className="fa-solid fa-image" aria-hidden="true" />
                  </div>
                )}
                <div className={styles.areaTypeListNameStack}>
                  <span className={styles.areaTypeListName}>{card.name}</span>
                  <span className={styles.areaTypeListNameSub}>{card.areaCount} Areas</span>
                  {rowMissedGroups.length > 0 && (
                    <div className={styles.areaTypeRowMissed} onClick={(e) => e.stopPropagation()}>
                      {rowUnacknowledgedMissed.length > 0 ? (
                        <>
                          <span className={styles.areaTypeRowMissedTag}>
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                            {rowUnacknowledgedMissed.length} shift{rowUnacknowledgedMissed.length === 1 ? "" : "s"} missed
                          </span>
                          <button
                            type="button"
                            className={styles.areaTypeRowAckButton}
                            onClick={() => onOpenAcknowledge?.(rowUnacknowledgedMissed[0])}
                          >
                            Acknowledge
                          </button>
                        </>
                      ) : (
                        <span className={styles.areaTypeRowMissedAcknowledged}>
                          <i className="fa-solid fa-circle-check" aria-hidden="true" />
                          Acknowledged
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <span className={styles.areaTypeTableCell}>
                <i className="fa-regular fa-clock" aria-hidden="true" /> {card.timeAgo}
              </span>
              <span className={[styles.scoreBadge, card.score === null ? styles.scoreBadgeNone : ""].filter(Boolean).join(" ")}>
                {card.score === null ? "N/A" : formatScore(card.score)}
              </span>
              <span className={styles.areaTypeTableCell}>{card.servicedToday}</span>
              {variant === "full" && (
                <>
                  <div className={styles.listBarCell}>
                    <span
                      className={[styles.listBarFill, expectedHit ? styles.listBarFillHit : ""].filter(Boolean).join(" ")}
                      style={{ width: `${Math.min(100, card.percent)}%` }}
                    />
                    <span className={styles.listBarLabel}>
                      {card.servicedToday} of {card.expected}
                      {expectedHit && <i className="fa-regular fa-circle-check" aria-hidden="true" />}
                    </span>
                  </div>
                  <div className={styles.listBarCell}>
                    <span
                      className={[styles.listBarFillAreas, areasHit ? styles.listBarFillAreasHit : ""].filter(Boolean).join(" ")}
                      style={{
                        width: `${card.areaCount > 0 ? Math.min(100, (card.areasServicedToday / card.areaCount) * 100) : 0}%`,
                      }}
                    />
                    <span className={styles.listBarLabel}>
                      {card.areasServicedToday} of {card.areaCount}
                      {areasHit && <i className="fa-regular fa-circle-check" aria-hidden="true" />}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
