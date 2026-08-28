"use client";

import { useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { SearchIcon } from "./icons";
import { peopleSummary } from "../../lib/sowData";
import type { RosterPerson } from "../../lib/csv";
import styles from "./SowPage.module.css";

export type SowPeopleTabProps = {
  associates: RosterPerson[];
  managers: RosterPerson[];
};

type RoleFilter = "associates" | "managers";
type PeopleView = "overview" | "time" | "compliance" | "workOrders" | "totals";

const VIEWS: { id: PeopleView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "time", label: "Time" },
  { id: "compliance", label: "Compliance" },
  { id: "workOrders", label: "Work Orders" },
  { id: "totals", label: "Totals" },
];

/** Deterministic, illustrative-only figures — the sample CSVs don't carry service-time data. */
function illustrate(i: number) {
  return {
    hoursWorked: `${7 + (i % 3)}h ${(i * 13) % 60}m`,
    avgScore: (4.7 + (i % 4) * 0.07).toFixed(2),
    totalServices: 20 + ((i * 7) % 60),
    mostRecent: `${1 + (i % 6)} hour${(i % 6) === 0 ? "" : "s"} ago`,
    totalBreaks: `${10 + (i % 5)}m`,
    totalLunch: `${28 + (i % 20)}m`,
    totalPause: `${(i % 4) * 5}m`,
    detailWorkTime: `${(i % 3) * 15}m`,
    routeCompliance: `${90 + (i % 10)}%`,
    onTimePercent: `${88 + (i % 12)}%`,
    incompleteRoutes: i % 5 === 0 ? 1 : 0,
    todosOpen: i % 4,
    todosClosed: 3 + (i % 6),
    reportIts: i % 3,
    serviceTime: `${5 + (i % 3)}h ${(i * 9) % 60}m`,
    transitionTime: `${(i % 2) + 1}h ${(i * 3) % 60}m`,
    unproductiveTime: `${(i % 3) * 10}m`,
    totalTime: `${8 + (i % 2)}h ${(i * 5) % 60}m`,
  };
}

export function SowPeopleTab({ associates, managers }: SowPeopleTabProps) {
  const [role, setRole] = useState<RoleFilter>("associates");
  const [query, setQuery] = useState("");
  const [clockedInOnly, setClockedInOnly] = useState(false);
  const [view, setView] = useState<PeopleView>("overview");
  const [summaryOpen, setSummaryOpen] = useState(true);

  const roster = role === "associates" ? associates : managers;
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? roster.filter((p) => p.name.toLowerCase().includes(q)) : roster),
    [roster, q]
  );

  return (
    <div className={styles.sectionStack}>
      <div className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>People summary</h2>
          <button type="button" className={styles.textLink} onClick={() => setSummaryOpen((v) => !v)}>
            <i className={`fa-solid ${summaryOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            {summaryOpen ? "Hide people summary" : "Show people summary"}
          </button>
        </div>
        {summaryOpen && (
          <div className={styles.statGrid}>
            <Card theme="light" className={styles.statTile}>
              <span className={styles.statTileLabel}>Associates clocked in</span>
              <span className={styles.statTileValue}>{peopleSummary.associatesClockedIn}</span>
            </Card>
            <Card theme="light" className={styles.statTile}>
              <span className={styles.statTileLabel}>Managers clocked in</span>
              <span className={styles.statTileValue}>{peopleSummary.managersClockedIn}</span>
            </Card>
            <Card theme="light" className={styles.statTile}>
              <span className={styles.statTileLabel}>Total time worked</span>
              <span className={styles.statTileValue}>{peopleSummary.totalTimeWorked}</span>
            </Card>
            <Card theme="light" className={styles.statTile}>
              <span className={styles.statTileLabel}>Service time captured</span>
              <span className={styles.statTileValue}>{peopleSummary.serviceTimeCaptured}</span>
            </Card>
          </div>
        )}
      </div>

      <div className={styles.planToolbar}>
        <div className={styles.chipRow}>
          <button
            type="button"
            className={[styles.chip, role === "associates" ? styles.chipActive : ""].filter(Boolean).join(" ")}
            data-theme="light"
            onClick={() => setRole("associates")}
          >
            Associates ({associates.length})
          </button>
          <button
            type="button"
            className={[styles.chip, role === "managers" ? styles.chipActive : ""].filter(Boolean).join(" ")}
            data-theme="light"
            onClick={() => setRole("managers")}
          >
            Managers ({managers.length})
          </button>
        </div>
        <div className={styles.searchWrap}>
          <Input
            theme="light"
            icon={<SearchIcon />}
            placeholder="Find a person"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find a person"
          />
        </div>
        <button
          type="button"
          className={[styles.chip, clockedInOnly ? styles.chipActive : ""].filter(Boolean).join(" ")}
          data-theme="light"
          aria-pressed={clockedInOnly}
          onClick={() => setClockedInOnly((v) => !v)}
        >
          Employees clocked in
        </button>
      </div>

      <div className={styles.chipRow}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={[styles.chip, view === v.id ? styles.chipActive : ""].filter(Boolean).join(" ")}
            data-theme="light"
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <Card theme="light" className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Shift</th>
              {view === "overview" && (
                <>
                  <th>Position</th>
                  <th>Avg. score</th>
                  <th>Total services</th>
                  <th>Most recent</th>
                </>
              )}
              {view === "time" && (
                <>
                  <th>Total breaks</th>
                  <th>Total lunch</th>
                  <th>Total pause</th>
                  <th>Detail work time</th>
                </>
              )}
              {view === "compliance" && (
                <>
                  <th>Route compliance</th>
                  <th>On-time %</th>
                  <th>Incomplete routes</th>
                </>
              )}
              {view === "workOrders" && (
                <>
                  <th>To-Dos open</th>
                  <th>To-Dos closed</th>
                  <th>Report-Its</th>
                </>
              )}
              {view === "totals" && (
                <>
                  <th>Service time</th>
                  <th>Transition time</th>
                  <th>Unproductive time</th>
                  <th>Total time</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((person, i) => {
              const d = illustrate(i);
              return (
                <tr key={person.name}>
                  <td>
                    <div className={styles.personCell}>
                      <img src={person.avatar} alt="" className={styles.avatar} />
                      <span>{person.name}</span>
                    </div>
                  </td>
                  <td>{person.shift || "Day"}</td>
                  {view === "overview" && (
                    <>
                      <td>{person.position}</td>
                      <td>{d.avgScore}</td>
                      <td>{d.totalServices}</td>
                      <td>{d.mostRecent}</td>
                    </>
                  )}
                  {view === "time" && (
                    <>
                      <td>{d.totalBreaks}</td>
                      <td>{d.totalLunch}</td>
                      <td>{d.totalPause}</td>
                      <td>{d.detailWorkTime}</td>
                    </>
                  )}
                  {view === "compliance" && (
                    <>
                      <td>{d.routeCompliance}</td>
                      <td>{d.onTimePercent}</td>
                      <td>{d.incompleteRoutes}</td>
                    </>
                  )}
                  {view === "workOrders" && (
                    <>
                      <td>{d.todosOpen}</td>
                      <td>{d.todosClosed}</td>
                      <td>{d.reportIts}</td>
                    </>
                  )}
                  {view === "totals" && (
                    <>
                      <td>{d.serviceTime}</td>
                      <td>{d.transitionTime}</td>
                      <td>{d.unproductiveTime}</td>
                      <td>{d.totalTime}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
