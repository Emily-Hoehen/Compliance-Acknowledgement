"use client";

import { Fragment, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { SearchIcon } from "./icons";
import {
  siteContractStats,
  facilitySummary,
  areaTypeCoverage,
  buildings,
  floors,
  shifts,
  positions,
  taskTypes,
  verificationsForArea,
  auditsForArea,
  allAreaVerifications,
  allAreaAudits,
  verificationToActivity,
  auditToActivity,
  type ActivityItem,
  type ActivityKind,
} from "../../lib/sowData";
import styles from "./SowPage.module.css";

type ViewMode = "grid" | "list";
type AreaActivityItem = ActivityItem & { areaName: string; building: string };

const ALL = "all";

const ACTIVITY_FILTERS: { id: ActivityKind | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "fa-check-double" },
  { id: "verification", label: "Verifications", icon: "fa-circle-check" },
  { id: "audit", label: "Audits", icon: "fa-clipboard-check" },
];

export function SowFacilityTab() {
  const [query, setQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState(ALL);
  const [areaTypeFilter, setAreaTypeFilter] = useState(ALL);
  const [floorFilter, setFloorFilter] = useState(ALL);
  const [shiftFilter, setShiftFilter] = useState(ALL);
  const [positionFilter, setPositionFilter] = useState(ALL);
  const [taskTypeFilter, setTaskTypeFilter] = useState(ALL);
  const [activityFilter, setActivityFilter] = useState<ActivityKind | "all">("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();

  // List view: area-type aggregates only carry building/area-type/floor —
  // shift, position, and task type only exist at the individual-verification
  // level, so they don't apply to this dataset (same as the real product's
  // "by building" table not having per-shift columns at the summary row).
  const filteredAreas = useMemo(
    () =>
      areaTypeCoverage.filter(
        (a) =>
          (buildingFilter === ALL || a.building === buildingFilter) &&
          (areaTypeFilter === ALL || a.name === areaTypeFilter) &&
          (floorFilter === ALL || a.floor === floorFilter) &&
          (!q || a.name.toLowerCase().includes(q))
      ),
    [q, buildingFilter, areaTypeFilter, floorFilter]
  );

  const filteredVerifications = useMemo(
    () =>
      allAreaVerifications.filter(
        (v) =>
          (buildingFilter === ALL || v.building === buildingFilter) &&
          (areaTypeFilter === ALL || v.areaName === areaTypeFilter) &&
          (floorFilter === ALL || v.floor === floorFilter) &&
          (shiftFilter === ALL || v.shift === shiftFilter) &&
          (positionFilter === ALL || v.position === positionFilter) &&
          (taskTypeFilter === ALL || v.type === taskTypeFilter) &&
          (!q || v.areaName.toLowerCase().includes(q) || v.personName.toLowerCase().includes(q))
      ),
    [q, buildingFilter, areaTypeFilter, floorFilter, shiftFilter, positionFilter, taskTypeFilter]
  );

  // Audits don't carry shift/position/task-type (those are verification-
  // specific dimensions) — building/area type/floor/search still apply.
  const filteredAudits = useMemo(
    () =>
      allAreaAudits.filter(
        (a) =>
          (buildingFilter === ALL || a.building === buildingFilter) &&
          (areaTypeFilter === ALL || a.areaName === areaTypeFilter) &&
          (floorFilter === ALL || a.floor === floorFilter) &&
          (!q || a.areaName.toLowerCase().includes(q) || a.auditorName.toLowerCase().includes(q))
      ),
    [q, buildingFilter, areaTypeFilter, floorFilter]
  );

  const activity: AreaActivityItem[] = useMemo(() => {
    const verificationItems = filteredVerifications.map((v) => ({
      ...verificationToActivity(v),
      areaName: v.areaName,
      building: v.building,
    }));
    const auditItems = filteredAudits.map((a) => ({
      ...auditToActivity(a),
      areaName: a.areaName,
      building: a.building,
    }));
    const combined =
      activityFilter === "verification" ? verificationItems : activityFilter === "audit" ? auditItems : [...verificationItems, ...auditItems];
    return combined;
  }, [filteredVerifications, filteredAudits, activityFilter]);

  function toggle(name: string) {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function clearAllFilters() {
    setQuery("");
    setBuildingFilter(ALL);
    setAreaTypeFilter(ALL);
    setFloorFilter(ALL);
    setShiftFilter(ALL);
    setPositionFilter(ALL);
    setTaskTypeFilter(ALL);
  }

  return (
    <div className={styles.sectionStack}>
      <div className={styles.statGrid}>
        <Card theme="light" className={styles.statTile}>
          <span className={styles.statTileLabel}>Buildings</span>
          <span className={styles.statTileValue}>{siteContractStats.buildings}</span>
        </Card>
        <Card theme="light" className={styles.statTile}>
          <span className={styles.statTileLabel}>Area types</span>
          <span className={styles.statTileValue}>{siteContractStats.areaTypes}</span>
        </Card>
        <Card theme="light" className={styles.statTile}>
          <span className={styles.statTileLabel}>Areas</span>
          <span className={styles.statTileValue}>{siteContractStats.areas}</span>
        </Card>
        <Card theme="light" className={styles.statTile}>
          <span className={styles.statTileLabel}>Elements</span>
          <span className={styles.statTileValue}>{siteContractStats.elements}</span>
        </Card>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Facility summary</h2>
          <button type="button" className={styles.textLink} onClick={() => setSummaryOpen((v) => !v)}>
            <i className={`fa-solid ${summaryOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            {summaryOpen ? "Hide facility summary" : "Show facility summary"}
          </button>
        </div>
        {summaryOpen && (
          <Card theme="light" className={styles.paddedCard}>
            <p className={styles.summaryText}>
              Today, <strong>{facilitySummary.teamMembers} team members</strong> completed{" "}
              <strong>{facilitySummary.verificationsCompleted.toLocaleString()} verifications</strong> of{" "}
              {facilitySummary.verificationsExpected.toLocaleString()} expected across{" "}
              {facilitySummary.areaTypesActive} area types, capturing{" "}
              <strong>
                {facilitySummary.hoursCaptured} ({facilitySummary.hoursCapturedPercent}%)
              </strong>{" "}
              of {facilitySummary.paidHours} paid hours while supporting {facilitySummary.flightsSupported} flights.
            </p>
          </Card>
        )}
      </div>

      <div className={styles.slicerRow}>
        <span className={styles.slicerLabel}>Slicers:</span>
        <select
          className={styles.filterSelect}
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          aria-label="Filter by building"
        >
          <option value={ALL}>Buildings — Total: {buildings.length}</option>
          {buildings.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={areaTypeFilter}
          onChange={(e) => setAreaTypeFilter(e.target.value)}
          aria-label="Filter by area type"
        >
          <option value={ALL}>Area Types — Total: {siteContractStats.areaTypes}</option>
          {areaTypeCoverage.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={floorFilter}
          onChange={(e) => setFloorFilter(e.target.value)}
          aria-label="Filter by floor"
        >
          <option value={ALL}>Floors — Total: {floors.length}</option>
          {floors.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          aria-label="Filter by shift"
        >
          <option value={ALL}>Shifts — Total: {shifts.length}</option>
          {shifts.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          aria-label="Filter by position"
        >
          <option value={ALL}>Positions — Total: {positions.length}</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={taskTypeFilter}
          onChange={(e) => setTaskTypeFilter(e.target.value)}
          aria-label="Filter by task type"
        >
          <option value={ALL}>Task Types — Total: {taskTypes.length}</option>
          {taskTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="button" className={styles.textLink} onClick={clearAllFilters}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
          Clear all
        </button>
      </div>

      <div className={styles.chipRow}>
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={[styles.chip, activityFilter === f.id ? styles.chipActive : ""].filter(Boolean).join(" ")}
            data-theme="light"
            aria-pressed={activityFilter === f.id}
            onClick={() => setActivityFilter(f.id)}
          >
            <i className={`fa-solid ${f.icon}`} aria-hidden="true" /> {f.label}
          </button>
        ))}
      </div>

      <div className={styles.planToolbar}>
        <div className={styles.searchWrap}>
          <Input
            theme="light"
            icon={<SearchIcon />}
            placeholder="Search for area"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for area"
          />
        </div>
        <div className={styles.viewToggleGroup}>
          <button
            type="button"
            className={[styles.viewToggleButton, view === "grid" ? styles.viewToggleButtonActive : ""]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            Grid
          </button>
          <button
            type="button"
            className={[styles.viewToggleButton, view === "list" ? styles.viewToggleButtonActive : ""]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>

      {view === "grid" ? (
        // Grid view: one card per verification or audit event (not per area
        // type) — each card is a real, individual service/inspection record,
        // not an aggregate.
        <div className={styles.areaGrid}>
          {activity.map((item, i) => (
            <ActivityCard key={`${item.areaName}-${item.location}-${i}`} item={item} />
          ))}
        </div>
      ) : (
        // List view: area-type aggregates, each expandable to its verifications.
        <Card theme="light" className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th aria-hidden="true" />
                <th>Area type</th>
                <th>Building</th>
                <th>Serviced today</th>
                <th>Expected services</th>
                <th>% complete</th>
                <th>Time captured</th>
                <th>Avg. score</th>
              </tr>
            </thead>
            <tbody>
              {filteredAreas.map((area) => {
                const isOpen = !!expanded[area.name];
                return (
                  <Fragment key={area.name}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className={styles.rowToggle}
                          onClick={() => toggle(area.name)}
                          aria-expanded={isOpen}
                          aria-label={`Show verifications for ${area.name}`}
                        >
                          <span
                            className={[styles.treeCaret, isOpen ? styles.treeCaretOpen : ""].filter(Boolean).join(" ")}
                            aria-hidden="true"
                          >
                            ▸
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className={styles.iconLabel}>
                          <i className="fa-solid fa-shapes" aria-hidden="true" />
                          {area.name}
                        </span>
                      </td>
                      <td>
                        <span className={styles.iconLabel}>
                          <i className="fa-solid fa-building" aria-hidden="true" />
                          {area.building}
                        </span>
                      </td>
                      <td>{area.servicedToday}</td>
                      <td>{area.expectedServices}</td>
                      <td>{area.percent.toFixed(0)}%</td>
                      <td>{area.captured}</td>
                      <td>{area.score.toFixed(2)}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className={styles.verificationCell}>
                          <VerificationList areaName={area.name} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ActivityCard({ item }: { item: AreaActivityItem }) {
  return (
    <Card theme="light" className={styles.photoCard}>
      <div className={styles.photoPlaceholder} aria-hidden="true">
        PHOTO
      </div>
      <div className={styles.photoBody}>
        <span className={styles.photoMeta}>
          <span className={styles.typeTag}>{item.tag}</span>
          <span className={styles.photoScore}>{item.score.toFixed(2)}</span>
        </span>
        <span className={styles.photoArea}>{item.location}</span>
        <span className={styles.photoMeta}>
          <span className={styles.activityPerson}>
            <img src={item.personAvatar} alt="" className={styles.avatarSmall} />
            {item.personName}
          </span>
        </span>
        <span className={styles.photoMeta}>
          <span>{item.building}</span>
          <span>{item.timeAgo}</span>
        </span>
      </div>
    </Card>
  );
}

/** Combines verifications and audits for one area's row drill-down (List view) — both always shown together, no separate toggle needed at this small a scope. */
function VerificationList({ areaName }: { areaName: string }) {
  const activity: ActivityItem[] = [
    ...verificationsForArea(areaName).map(verificationToActivity),
    ...auditsForArea(areaName).map(auditToActivity),
  ];
  return (
    <div className={styles.verificationList}>
      {activity.map((item) => (
        <div key={item.location} className={styles.verificationRow}>
          <img src={item.personAvatar} alt="" className={styles.avatarSmall} />
          <span className={styles.verificationMeta}>
            <span className={styles.typeTag}>{item.tag}</span>
            <span>{item.location}</span>
          </span>
          <span className={styles.verificationMeta}>
            <span>{item.personName}</span>
            <span>{item.timeAgo}</span>
            <span className={styles.photoScore}>{item.score.toFixed(2)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
