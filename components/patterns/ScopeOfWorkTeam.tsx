"use client";

import { useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { ButtonGroup, type ButtonGroupOption } from "../ui/ButtonGroup";
import { DsSelect, type SelectOption } from "../ui/Select";
import { Input } from "../ui/Input";
import { SearchIcon } from "./icons";
import { peopleSummary, teamForNode, type TeamMember } from "../../lib/sowData";
import type { RosterPerson } from "../../lib/csv";
import styles from "./ScopeOfWorkPage.module.css";

export type ScopeOfWorkRosterProps = {
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

/** "4.90" → "4.9", "5.00" → "5" — trims the trailing zeros avgScore's fixed 2-decimal generator leaves behind, without a regex, same convention as ScopeOfWorkPage.tsx's own formatScore. */
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
 */
export function OurTeamSection({ associates, managers }: ScopeOfWorkRosterProps) {
  const [rosterTab, setRosterTab] = useState<RosterTab>("associates");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortState, setSortState] = useState<SortState>({ key: "services", dir: "desc" });

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
    () => teamForNode(`our-team-${rosterTab}`, filteredRoster, 0, filteredRoster.length),
    [filteredRoster, rosterTab]
  );
  const sortedTeam = useMemo(() => sortTeam(team, sortState), [team, sortState]);
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
            <TeamHeaderCell label="Total Time" columnKey="totalTime" sortState={sortState} onSort={onSort} centered />
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
                <span className={styles.teamCellCentered}>{member.timeWorked}</span>
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
export function ServiceTimesSection({ associates, managers }: ScopeOfWorkRosterProps) {
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
