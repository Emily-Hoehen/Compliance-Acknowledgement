"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { ButtonGroup, type ButtonGroupOption } from "../ui/ButtonGroup";
import { DsSelect, type SelectOption } from "../ui/Select";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { GridTrendChart } from "../ui/Charts";
import { SearchIcon } from "./icons";
import {
  peopleSummary,
  teamForNode,
  timeWorkedTrend,
  dayOverDayTimeDelta,
  rangeOverRangeAvgDelta,
  averageTimeWorkedLabel,
  formatHoursMinutesLong,
  hoursMinutesParts,
  timeTrendFullDateLabel,
  TIME_TREND_DAYS_PER_PERIOD,
  type TeamMember,
  type TimeTrendGranularity,
} from "../../lib/sowData";
import type { RosterPerson } from "../../lib/csv";
import styles from "./ComplianceAcknowledgementPage.module.css";

export type ComplianceAcknowledgementRosterProps = {
  associates: RosterPerson[];
  managers: RosterPerson[];
};

/* ---------------- Our Team table: click-to-sort columns ---------------- */

type TeamSortKey = "name" | "totalTime" | "score" | "services" | "recent";
type SortDir = "asc" | "desc";
type SortState = { key: TeamSortKey; dir: SortDir };

/** Clicking a new column starts it ascending; clicking the already-active column flips direction — same idiom as SowHierarchyPage's own sortable table headers. */
function toggleSort(key: TeamSortKey, current: SortState): SortState {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: "asc" };
}

/** "8h 05m" → 485 (total minutes), for a real numeric sort on Total Time's formatted label (lib/sowData.ts's durationForSeed). */
function parseTimeWorkedToMinutes(label: string): number {
  const m = label.match(/(\d+)h\s*(\d+)m/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** "28 minutes ago" → 28, for a real numeric sort on Most Recent — teamForNode's dayOffset-0 rows are always "N minutes ago". */
function parseMinutesAgo(label: string): number {
  const m = label.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function teamSortValue(member: TeamMember, key: TeamSortKey): string | number {
  switch (key) {
    case "name":
      return member.name;
    case "totalTime":
      return parseTimeWorkedToMinutes(member.timeWorked);
    case "score":
      return member.avgScore;
    case "services":
      return member.servicesCompleted;
    case "recent":
      return parseMinutesAgo(member.mostRecent);
  }
}

function sortTeam(members: TeamMember[], sortState: SortState): TeamMember[] {
  const dirMul = sortState.dir === "asc" ? 1 : -1;
  return [...members].sort((a, b) => {
    const av = teamSortValue(a, sortState.key);
    const bv = teamSortValue(b, sortState.key);
    if (typeof av === "string" || typeof bv === "string") return dirMul * String(av).localeCompare(String(bv));
    return dirMul * (av - bv);
  });
}

/** "4.90" → "4.9", "5.00" → "5" — trims the trailing zeros avgScore's fixed 2-decimal generator leaves behind, without a regex, same convention as ComplianceAcknowledgementPage.tsx's own formatScore. */
function formatScore(score: number): string {
  return String(Math.round(score * 100) / 100);
}

function TeamHeaderCell({
  label,
  columnKey,
  sortState,
  onSort,
  centered,
}: {
  label: string;
  columnKey: TeamSortKey;
  sortState: SortState;
  onSort: (key: TeamSortKey) => void;
  centered?: boolean;
}) {
  const isActive = sortState.key === columnKey;
  return (
    <button
      type="button"
      className={[styles.teamHeaderCell, centered ? styles.teamHeaderCellCentered : "", isActive ? styles.teamHeaderCellActive : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSort(columnKey)}
      aria-sort={isActive ? (sortState.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <i
        className={[
          "fa-solid",
          isActive && sortState.dir === "asc" ? "fa-caret-up" : "fa-caret-down",
          styles.teamHeaderCaret,
          isActive ? styles.teamHeaderCaretActive : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />
    </button>
  );
}

const TIME_TREND_GRANULARITY_OPTIONS: ButtonGroupOption<TimeTrendGranularity>[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

/** 7 daily points / 8 weekly points / 6 monthly points per window — enough history to read a trend without crowding the chart's x-axis. */
const TIME_TREND_PERIOD_COUNT: Record<TimeTrendGranularity, number> = { day: 7, week: 8, month: 6 };

const TIME_TREND_COPY: Record<TimeTrendGranularity, { current: string; previous: string; noun: string }> = {
  day: { current: "Yesterday", previous: "the day before", noun: "day" },
  // "(avg/day)" — Week/Month's headline stat and chart are an average per
  // day over the period, not the period's raw sum, so the label says so.
  week: { current: "This Week (avg/day)", previous: "last week", noun: "week" },
  month: { current: "This Month (avg/day)", previous: "last month", noun: "month" },
};

/** Blanks out all but every Nth label (always keeping the last) so a dense axis — Weekly's 8 points — doesn't overlap; the chart's own hover tooltip still shows every point's real label regardless. */
function decimateAxisLabels(labels: string[], maxLabels = 7): string[] {
  if (labels.length <= maxLabels) return labels;
  const step = Math.ceil(labels.length / maxLabels);
  return labels.map((label, i) => (i % step === 0 || i === labels.length - 1 ? label : ""));
}

/**
 * Per-employee "Total Time" trend — opened from a row's Total Time
 * cell so a manager can see how one person's worked time is moving
 * day/week/month over day/week/month, not just today's figure. Sums
 * the same per-day generator behind the table's own Total Time
 * column (lib/sowData.ts's timeWorkedTrend), so the two stay
 * consistent instead of reading as two disconnected numbers.
 *
 * Each bucket (a day, a 7-day week, a 30-day month) is a fixed-length
 * rolling window ending at `anchorDayOffset` — the most recent COMPLETE
 * day, never today, since today's hours are still accumulating — so
 * "This Month" is always a full 30 days of finished data, never a
 * truncated partial month or a suspiciously-low final day.
 *
 * `defaultGranularity`/`anchorDayOffset` (from OurTeamSection, derived
 * from the page's own date selector) seed which tab opens and which day
 * every window ends at, so the modal reads as a continuation of
 * whatever the page was already showing — the segmented control below
 * still lets the viewer switch freely once it's open.
 */
function TeamTimeTrendModal({
  member,
  onClose,
  defaultGranularity,
  anchorDayOffset,
}: {
  member: TeamMember | null;
  onClose: () => void;
  defaultGranularity: TimeTrendGranularity;
  anchorDayOffset: number;
}) {
  const [granularity, setGranularity] = useState<TimeTrendGranularity>(defaultGranularity);

  // Re-seeds the tab whenever the modal opens for a (possibly new) member,
  // or when the page's own context changes what tab makes sense — plain
  // useState's initial value only applies once, since this component
  // stays mounted (just hidden) between opens.
  useEffect(() => {
    if (member) setGranularity(defaultGranularity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, defaultGranularity]);

  const periodCount = TIME_TREND_PERIOD_COUNT[granularity];
  const periodDays = TIME_TREND_DAYS_PER_PERIOD[granularity];
  const windowDays = periodCount * periodDays;
  const copy = TIME_TREND_COPY[granularity];

  const rawPoints = useMemo(() => {
    if (!member) return [];
    return timeWorkedTrend(member.personSeed, granularity, periodCount, anchorDayOffset);
  }, [member, granularity, periodCount, anchorDayOffset]);

  // Every figure derived from points — the headline stat, the trend
  // caption, and the chart itself — is an average-per-day value, not the
  // period's raw sum: "This Week" shows what a typical day looked like
  // that week, consistent with the Our Team table's own Avg Total Time
  // column when it's viewing a range, not a single day's total or a
  // whole period's total dumped into one number. periodDays is 1 for
  // Daily, so this is a no-op there.
  const points = useMemo(() => rawPoints.map((p) => ({ ...p, hours: p.hours / periodDays })), [rawPoints, periodDays]);

  const current = points[points.length - 1]?.hours ?? 0;
  const previous = points.length > 1 ? points[points.length - 2].hours : null;
  const delta = previous === null ? 0 : Math.round((current - previous) * 10) / 10;
  const average = points.length > 0 ? points.reduce((sum, p) => sum + p.hours, 0) / points.length : 0;
  // This period's own span (e.g. just this week's 7 days) — distinct from
  // the Trend section's rangeLabel below, which covers the full multi-
  // period window (e.g. 8 weeks) the chart plots.
  const currentPeriodRangeLabel =
    granularity === "day"
      ? timeTrendFullDateLabel(anchorDayOffset)
      : `${timeTrendFullDateLabel(anchorDayOffset + periodDays - 1)} - ${timeTrendFullDateLabel(anchorDayOffset)}`;
  const rangeLabel = `${timeTrendFullDateLabel(anchorDayOffset + windowDays - 1)} - ${timeTrendFullDateLabel(anchorDayOffset)}`;
  // "Yesterday" only actually reads true when the anchor is 1 day back;
  // if the page is stepped further into the past, name that weekday
  // instead of mislabeling an older day as "yesterday".
  const currentLabel =
    granularity === "day" && anchorDayOffset !== 1
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() - anchorDayOffset);
          return d.toLocaleDateString("en-US", { weekday: "long" });
        })()
      : copy.current;
  const { h: currentHours, m: currentMinutes } = hoursMinutesParts(current);

  return (
    <Modal open={member !== null} onClose={onClose} title="Total Time Trend">
      {member && (
        <div className={styles.timeTrendBody}>
          <div className={styles.timeTrendHeader}>
            <div className={styles.timeTrendProfile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={member.avatar} alt="" className={styles.teamRowAvatar} />
              <span className={styles.timeTrendMemberText}>
                <span className={styles.timeTrendMemberName}>{member.name}</span>
                <span className={styles.timeTrendMemberSubtitle}>
                  {member.position} | {member.shift}
                </span>
              </span>
            </div>
            <div className={styles.timeTrendGranularity}>
              <ButtonGroup
                options={TIME_TREND_GRANULARITY_OPTIONS}
                value={granularity}
                onChange={setGranularity}
                variant="segmented"
                aria-label="Trend period"
              />
            </div>
          </div>

          <div className={styles.statBlock}>
            <p className={styles.cardLabel}>
              {currentLabel} - {currentPeriodRangeLabel}
            </p>
            <div className={styles.statRow}>
              <span className={styles.statValueGroup}>
                {currentHours > 0 && (
                  <span className={styles.statPair}>
                    <span className={styles.statValue}>{currentHours}</span>
                    <span className={styles.statUnit}>hr</span>
                  </span>
                )}
                {(currentMinutes > 0 || currentHours === 0) && (
                  <span className={styles.statPair}>
                    <span className={styles.statValue}>{currentMinutes}</span>
                    <span className={styles.statUnit}>min</span>
                  </span>
                )}
              </span>
              {delta !== 0 && (
                <span
                  className={[styles.timeTrendDelta, delta > 0 ? styles.timeTrendDeltaUp : styles.timeTrendDeltaDown].join(" ")}
                >
                  <i className={`fa-solid ${delta > 0 ? "fa-arrow-up" : "fa-arrow-down"}`} aria-hidden="true" />
                  {delta > 0 ? "up" : "down"} {formatHoursMinutesLong(Math.abs(delta))} vs {copy.previous}
                </span>
              )}
            </div>
          </div>

          <div className={styles.chartStack}>
            <div className={styles.timeTrendChartHeader}>
              <p className={styles.cardLabel}>Trend - {rangeLabel}</p>
              <p className={styles.timeTrendAverageCaption}>
                {formatHoursMinutesLong(average)}/{copy.noun} average over the last {points.length} {copy.noun}s
              </p>
            </div>
            <GridTrendChart
              values={points.map((p) => p.hours)}
              labels={points.map((p) => p.label)}
              axisLabels={decimateAxisLabels(points.map((p) => p.label))}
              color="var(--color-primary-300)"
              valueFormatter={(v) => formatHoursMinutesLong(v)}
              height={160}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

type RosterTab = "associates" | "managers" | "customers";

const ROSTER_TAB_OPTIONS: (associatesCount: number, managersCount: number) => ButtonGroupOption<RosterTab>[] = (
  associatesCount,
  managersCount
) => [
  { id: "associates", label: `Associates (${associatesCount})` },
  { id: "managers", label: `Managers (${managersCount})` },
  { id: "customers", label: "Customers (0)" },
];

/** "All Shifts"/"All Positions" — the distinct real values present in whichever roster tab is active, not a fixed fabricated list, so every option always yields at least one row. */
function distinctOptions(roster: RosterPerson[], field: "shift" | "position", allLabel: string): SelectOption<string>[] {
  const values = Array.from(new Set(roster.map((p) => p[field]).filter(Boolean))).sort();
  return [{ value: "all", label: allLabel }, ...values.map((v) => ({ value: v, label: v }))];
}

/**
 * Our Team — a sortable, filterable roster table (real associate/
 * manager rows from data/associates.csv, data/managers.csv), given a
 * plausible today's-shift read (total time, average score, total
 * services, most recent service) via lib/sowData.ts's teamForNode —
 * the same generator SowHierarchyPage uses for its own Team evidence.
 * "Customers" has no real data behind it in this dataset, so that tab
 * always reads an honest empty state rather than a fabricated roster.
 *
 * `dayOffset` is the page's own date-nav state (0 = today). The row's
 * day-over-day trend caret is hidden at 0 — today's hours are still
 * accumulating, so a delta against it isn't a real comparison — but
 * shows for every other day on the calendar.
 *
 * `rangeDayOffsets` is non-empty exactly when the page's date selector
 * is on a multi-day preset (week/month/etc., via missedRangeDayOffsets)
 * rather than a single day — in which case Total Time switches to an
 * average-per-day figure instead of one day's raw total, since a single
 * day's number wouldn't represent a multi-day range.
 *
 * `trendDefaultGranularity` is which tab a row's Total Time Trend modal
 * should open on — so it reads as a continuation of whatever the page is
 * already showing (Current Week open on Weekly, a month-or-longer preset
 * on Monthly) instead of always resetting to Daily.
 */
export function OurTeamSection({
  associates,
  managers,
  dayOffset,
  rangeDayOffsets,
  trendDefaultGranularity,
}: ComplianceAcknowledgementRosterProps & {
  dayOffset: number;
  rangeDayOffsets: number[];
  trendDefaultGranularity: TimeTrendGranularity;
}) {
  const isRangeView = rangeDayOffsets.length > 0;
  // The Daily tab's "most recent complete day" tracks whatever day the
  // page itself is stepped to (so opening the modal continues what you
  // were looking at), except at dayOffset 0 (today) — today's hours
  // aren't finished, so Daily still falls back to yesterday there.
  const trendAnchorDayOffset = Math.max(1, dayOffset);
  const [rosterTab, setRosterTab] = useState<RosterTab>("associates");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortState, setSortState] = useState<SortState>({ key: "services", dir: "desc" });
  const [trendMember, setTrendMember] = useState<TeamMember | null>(null);

  function selectRosterTab(tab: RosterTab) {
    setRosterTab(tab);
    setShiftFilter("all");
    setPositionFilter("all");
  }

  const baseRoster = rosterTab === "associates" ? associates : rosterTab === "managers" ? managers : [];

  const shiftOptions = useMemo(() => distinctOptions(baseRoster, "shift", "All Shifts"), [baseRoster]);
  const positionOptions = useMemo(() => distinctOptions(baseRoster, "position", "All Positions"), [baseRoster]);

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();
    return baseRoster.filter(
      (p) =>
        (shiftFilter === "all" || p.shift === shiftFilter) &&
        (positionFilter === "all" || p.position === positionFilter) &&
        (query === "" || p.name.toLowerCase().includes(query))
    );
  }, [baseRoster, shiftFilter, positionFilter, search]);

  const team = useMemo(
    () => teamForNode(`our-team-${rosterTab}`, filteredRoster, dayOffset, filteredRoster.length),
    [filteredRoster, rosterTab, dayOffset]
  );
  // Swaps each row's Total Time for an average-per-day figure while a
  // range is selected — reusing the same `timeWorked` field downstream
  // (sorting, rendering) keeps this a one-spot change.
  const displayedTeam = useMemo(
    () =>
      isRangeView
        ? team.map((member) => ({ ...member, timeWorked: averageTimeWorkedLabel(member.personSeed, rangeDayOffsets) }))
        : team,
    [team, isRangeView, rangeDayOffsets]
  );
  const sortedTeam = useMemo(() => sortTeam(displayedTeam, sortState), [displayedTeam, sortState]);
  const onSort = (key: TeamSortKey) => setSortState((prev) => toggleSort(key, prev));

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={styles.teamToolbarRow}>
        <ButtonGroup
          options={ROSTER_TAB_OPTIONS(associates.length, managers.length)}
          value={rosterTab}
          onChange={selectRosterTab}
          theme="light"
          variant="segmented"
          thumbColor="rgb(58, 67, 77)"
          aria-label="Roster group"
        />
        <DsSelect value={shiftFilter} onChange={setShiftFilter} options={shiftOptions} ariaLabel="Filter by shift" />
        <DsSelect value={positionFilter} onChange={setPositionFilter} options={positionOptions} ariaLabel="Filter by position" />
        <Input
          wrapperClassName={styles.searchField}
          placeholder="Find a person"
          icon={<SearchIcon />}
          theme="light"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Find a person"
        />
      </div>

      {sortedTeam.length === 0 ? (
        <p className={styles.teamEmptyNote}>
          {rosterTab === "customers" ? "No customers on this roster." : "No team members match these filters."}
        </p>
      ) : (
        <div className={styles.teamTableWrap}>
          <div className={[styles.teamTableRow, styles.teamTableHeaderRow].join(" ")}>
            <TeamHeaderCell label="Name" columnKey="name" sortState={sortState} onSort={onSort} />
            <TeamHeaderCell
              label={isRangeView ? "Avg Total Time" : "Total Time"}
              columnKey="totalTime"
              sortState={sortState}
              onSort={onSort}
              centered
            />
            <TeamHeaderCell label="Average Score" columnKey="score" sortState={sortState} onSort={onSort} centered />
            <TeamHeaderCell label="Total Services" columnKey="services" sortState={sortState} onSort={onSort} centered />
            <TeamHeaderCell label="Most Recent" columnKey="recent" sortState={sortState} onSort={onSort} centered />
            <span aria-hidden="true" />
          </div>

          <div className={styles.teamTableRows}>
            {sortedTeam.map((member, i) => (
              <div className={[styles.teamTableRow, styles.teamTableBodyRow].join(" ")} key={`${member.name}-${i}`}>
                <span className={styles.teamNameCell}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={member.avatar} alt="" className={styles.teamRowAvatar} />
                  <span className={styles.teamNameText}>
                    <span className={styles.teamRowName}>{member.name}</span>
                    <span className={styles.teamRowSubtitle}>
                      {member.position} | {member.shift}
                    </span>
                  </span>
                </span>
                <span className={styles.teamCellCentered}>
                  <button
                    type="button"
                    className={styles.teamTimeSnapshotButton}
                    onClick={() => setTrendMember(member)}
                    aria-label={`View ${member.name}'s total time trend`}
                  >
                    <span className={styles.teamTimeValue}>{member.timeWorked}</span>
                    {(isRangeView || dayOffset !== 0) &&
                      (() => {
                        // Range views (Current Week/Month/etc.) compare
                        // this range's avg/day against the immediately
                        // preceding range of the same length; single-day
                        // views compare against the day before. Both are
                        // hidden only on literal "Today" (dayOffset 0,
                        // no range) — that day isn't over yet.
                        const delta = isRangeView
                          ? rangeOverRangeAvgDelta(member.personSeed, rangeDayOffsets)
                          : dayOverDayTimeDelta(member.personSeed, dayOffset);
                        if (delta === 0) return null;
                        return (
                          <i
                            className={[
                              "fa-solid",
                              delta > 0 ? "fa-caret-up" : "fa-caret-down",
                              delta > 0 ? styles.teamTimeTrendUp : styles.teamTimeTrendDown,
                            ].join(" ")}
                            aria-label={
                              delta > 0
                                ? `Trending up vs the previous ${isRangeView ? "period" : "day"}`
                                : `Trending down vs the previous ${isRangeView ? "period" : "day"}`
                            }
                          />
                        );
                      })()}
                  </button>
                </span>
                <span className={styles.teamCellCentered}>
                  <span className={styles.teamScoreBadge}>{formatScore(member.avgScore)}</span>
                </span>
                <span className={styles.teamCellCentered}>{member.servicesCompleted}</span>
                <span className={styles.teamCellCentered}>{member.mostRecent}</span>
                <span className={styles.teamRowArrow}>
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TeamTimeTrendModal
        member={trendMember}
        onClose={() => setTrendMember(null)}
        defaultGranularity={trendDefaultGranularity}
        anchorDayOffset={trendAnchorDayOffset}
      />
    </section>
  );
}

/**
 * Service Times — the roster's own real Time/Shift/Position columns
 * (data/associates.csv, data/managers.csv), alongside the
 * "Total Time Worked / Service Time Captured" pair carried over from
 * the source Service Times screenshot (lib/sowData.ts's
 * peopleSummary). No live clock events exist in this dataset, so
 * "Time" below is each person's own sample row rather than a real
 * clock-in timestamp.
 */
export function ServiceTimesSection({ associates, managers }: ComplianceAcknowledgementRosterProps) {
  const roster = useMemo(() => [...associates, ...managers].filter((p) => p.time).slice(0, 24), [associates, managers]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={styles.statTileRow}>
        <Card className={styles.statTile}>
          <span className={styles.statTileLabel}>Total Time Worked</span>
          <span className={styles.statTileValue}>{peopleSummary.totalTimeWorked}</span>
        </Card>
        <Card className={styles.statTile}>
          <span className={styles.statTileLabel}>Service Time Captured</span>
          <span className={styles.statTileValue}>{peopleSummary.serviceTimeCaptured}</span>
        </Card>
        <Card className={styles.statTile}>
          <span className={styles.statTileLabel}>Associates Clocked In</span>
          <span className={styles.statTileValue}>{peopleSummary.associatesClockedIn}</span>
        </Card>
        <Card className={styles.statTile}>
          <span className={styles.statTileLabel}>Managers Clocked In</span>
          <span className={styles.statTileValue}>{peopleSummary.managersClockedIn}</span>
        </Card>
      </div>

      <div className={styles.timesTableWrap}>
        <div className={styles.timesTableHeaderRow}>
          <span>Name</span>
          <span>Position</span>
          <span>Shift</span>
          <span>Time</span>
        </div>
        {roster.map((person) => (
          <div className={styles.timesTableRow} key={person.email || person.name}>
            <div className={styles.timesTableNameCell}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={person.avatar} alt="" className={styles.timesTableAvatar} />
              <span className={styles.timesTableName}>{person.name}</span>
            </div>
            <span className={styles.timesTableCell}>{person.position}</span>
            <span className={styles.timesTableCell}>{person.shift || "—"}</span>
            <span className={styles.timesTableCell}>{person.time || "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
