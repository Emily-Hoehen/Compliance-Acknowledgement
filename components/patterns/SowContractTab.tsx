"use client";

import { useState } from "react";
import { Card } from "../ui/Card";
import { siteContractStats, buildings } from "../../lib/sowData";
import type { ContractBuilding, ContractAreaType } from "../../lib/sowContract";
import styles from "./SowPage.module.css";

export type SowContractTabProps = {
  contractBuildings?: ContractBuilding[];
};

/**
 * Contract — the static scope of work itself: what's contracted,
 * building by building, area type by area type, task by task, and
 * how often each is due. No live data (no coverage %, no due-today
 * status) — that lives on Overview and Facility instead.
 *
 * Every building's tree is the real exported SOW
 * (data/SOW_DeltaLGA.csv — 714 areas, 40 area types, real
 * frequencies across all 7 buildings) rather than a hand-picked
 * sample. The top stat row (siteContractStats) isn't a rough guess
 * layered on top of that — its figures were set to match this
 * export's real totals exactly.
 */
export function SowContractTab({ contractBuildings = [] }: SowContractTabProps) {
  const [openBuilding, setOpenBuilding] = useState<string | null>("Concourse D");
  const [openAreaTypes, setOpenAreaTypes] = useState<Record<string, boolean>>({ "Break Rooms": true });

  function toggleAreaType(name: string) {
    setOpenAreaTypes((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div className={styles.sectionStack}>
      <div className={[styles.statGrid, styles.statGridWide].join(" ")}>
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
          <span className={styles.statTileLabel}>Frequency types</span>
          <span className={styles.statTileValue}>{siteContractStats.frequencyTypes}</span>
        </Card>
        <Card theme="light" className={styles.statTile}>
          <span className={styles.statTileLabel}>Expected annual tasks</span>
          <span className={styles.statTileValue}>{siteContractStats.expectedAnnualTasks}</span>
        </Card>
      </div>

      <p className={styles.summaryText}>
        Every building below is the real exported SOW — expand any of the 7 for its actual area types, areas, and
        contracted tasks.
      </p>

      <Card theme="light" className={styles.treeCard}>
        {buildings.map((building) => {
          const modeled = contractBuildings.find((cb) => cb.name === building.name);
          const isOpen = openBuilding === building.name;
          return (
            <div key={building.name}>
              <button
                type="button"
                className={styles.treeRow}
                style={modeled ? undefined : { cursor: "default" }}
                onClick={modeled ? () => setOpenBuilding(isOpen ? null : building.name) : undefined}
                aria-expanded={modeled ? isOpen : undefined}
              >
                <span className={styles.treeLabel}>
                  {modeled && (
                    <span
                      className={[styles.treeCaret, isOpen ? styles.treeCaretOpen : ""].filter(Boolean).join(" ")}
                      aria-hidden="true"
                    >
                      ▸
                    </span>
                  )}
                  {building.name}
                </span>
                <span className={styles.treeMeta}>
                  <span>{modeled ? `${modeled.areaCount} areas` : `${building.totalActions} total actions`}</span>
                </span>
              </button>

              {modeled &&
                isOpen &&
                modeled.areaTypes.map((areaType) => (
                  <AreaTypeRow
                    key={areaType.name}
                    areaType={areaType}
                    open={!!openAreaTypes[areaType.name]}
                    onToggle={() => toggleAreaType(areaType.name)}
                  />
                ))}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function AreaTypeRow({
  areaType,
  open,
  onToggle,
}: {
  areaType: ContractAreaType;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className={[styles.treeRow, styles.treeRowAreaType].join(" ")}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={[styles.treeLabel, styles.treeLabelSecondary].join(" ")}>
          <span className={[styles.treeCaret, open ? styles.treeCaretOpen : ""].filter(Boolean).join(" ")} aria-hidden="true">
            ▸
          </span>
          {areaType.name}
        </span>
        <span className={styles.treeMeta}>
          <span>{areaType.areas.length} areas</span>
          <span>{areaType.tasks.length} tasks</span>
        </span>
      </button>

      {open && (
        <div className={styles.taskList}>
          {areaType.tasks.map((task) => (
            <div key={task.label} className={styles.taskRow}>
              <span className={styles.taskLabel}>{task.label}</span>
              <span className={styles.frequencyText}>
                {task.frequency}
                {task.shifts.length < 3 && ` · ${task.shifts.join("/")}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
