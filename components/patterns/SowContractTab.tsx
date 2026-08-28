"use client";

import { useState } from "react";
import { Card } from "../ui/Card";
import { siteContractStats, buildings, concourseDAreaTypes, type ContractTask } from "../../lib/sowData";
import styles from "./SowPage.module.css";

/**
 * Contract — the static scope of work itself: what's contracted,
 * building by building, area type by area type, task by task, and
 * how often each is due. No live data (no coverage %, no due-today
 * status) — that lives on Overview and Facility instead.
 */
export function SowContractTab() {
  const [openBuilding, setOpenBuilding] = useState<string | null>("Concourse D");
  const [openAreaTypes, setOpenAreaTypes] = useState<Record<string, boolean>>({ "Baggage Claims": true });

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

      <Card theme="light" className={styles.treeCard}>
        {buildings.map((building) => {
          const isConcourseD = building.name === "Concourse D";
          const isOpen = openBuilding === building.name;
          return (
            <div key={building.name}>
              <button
                type="button"
                className={styles.treeRow}
                style={isConcourseD ? undefined : { cursor: "default" }}
                onClick={isConcourseD ? () => setOpenBuilding(isOpen ? null : building.name) : undefined}
                aria-expanded={isConcourseD ? isOpen : undefined}
              >
                <span className={styles.treeLabel}>
                  {isConcourseD && (
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
                  <span>{building.totalActions} total actions</span>
                </span>
              </button>

              {isConcourseD &&
                isOpen &&
                concourseDAreaTypes.map((areaType) => (
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
  areaType: { name: string; totalActions: number; tasks: ContractTask[] };
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
          <span>{areaType.totalActions} actions</span>
        </span>
      </button>

      {open && (
        <div className={styles.taskList}>
          {areaType.tasks.map((task) => (
            <div key={task.label} className={styles.taskRow}>
              <span className={styles.taskLabel}>{task.label}</span>
              <span className={styles.frequencyText}>{task.frequency}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
