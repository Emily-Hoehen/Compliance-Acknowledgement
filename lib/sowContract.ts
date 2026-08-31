/**
 * Real Scope of Work export for the whole site — all seven buildings
 * (Concourse D/E/F/G, Headhouse, Mainline, Pavilion) —
 * data/SOW_DeltaLGA.csv (11,316 rows, 714 areas, 40 area types; see
 * data/SOW_Data_Dictonary.csv for the source schema and known
 * issues). Unlike everything else in lib/sowData.ts, area/area-
 * type/task structure here is not illustrative — it's the actual
 * exported SOW. Every prototype that reads this via
 * lib/sowContractLoader.ts now has real per-building detail for the
 * full site, not just a couple of modeled buildings.
 *
 * Parsing (parseSowContractRows/buildContractBuildings) is plain,
 * synchronous, and side-effect-free — safe to import from a "use
 * client" component. Actually reading the CSV file needs `fs`, which
 * only runs server-side; that loader lives in sowContractLoader.ts
 * so client components never pull `fs` into their bundle.
 */

import { parseCsv } from "./csv";

/**
 * The export spells this building "Pavillion" (confirmed cosmetic in
 * the data dictionary's Known Issues — area labels themselves say
 * "Pavilion"); normalized here to match the single-L spelling used
 * everywhere else in this app's building list (lib/sowData.ts's
 * `buildings`), so building-name lookups actually match.
 */
function normalizeBuildingName(name: string): string {
  return name === "Pavillion" ? "Pavilion" : name;
}

export type SowContractRow = {
  rowId: string;
  building: string;
  areaType: string;
  areaId: string;
  areaNumber: string;
  areaName: string;
  floor: number;
  floorDescription: string;
  taskId: string;
  taskSeq: number;
  taskName: string;
  shift: string;
  frequencyRaw: string;
  freqCount: number | null;
  freqPeriod: string;
  textTruncated: boolean;
};

export function parseSowContractRows(csvText: string): SowContractRow[] {
  return parseCsv(csvText).map((r) => ({
    rowId: r["row_id"] ?? "",
    building: normalizeBuildingName(r["building"] ?? ""),
    areaType: r["area_type"] ?? "",
    areaId: r["area_id"] ?? "",
    areaNumber: r["area_number"] ?? "",
    areaName: r["area_name"] ?? "",
    floor: Number(r["floor"]) || 0,
    floorDescription: r["floor_description"] ?? "",
    taskId: r["task_id"] ?? "",
    taskSeq: Number(r["task_seq"]) || 0,
    taskName: r["task_name"] ?? "",
    shift: r["shift"] ?? "",
    frequencyRaw: r["frequency_raw"] ?? "",
    freqCount: r["freq_count"] ? Number(r["freq_count"]) : null,
    freqPeriod: r["freq_period"] ?? "",
    textTruncated: r["text_truncated"]?.toUpperCase() === "TRUE",
  }));
}

export type ContractArea = {
  areaId: string;
  areaNumber: string;
  /** area_name, falling back to area_number then area_id — ~1,547 source rows have a blank area_name. */
  displayName: string;
  floor: number;
  floorDescription: string;
};

export type ContractTaskDef = {
  label: string;
  frequency: string;
  /** Which shifts this task applies to (Day/Swing/Graveyard) — a task's frequency never varies by shift in this export, so one row covers all its shifts. */
  shifts: string[];
};

export type ContractAreaType = {
  name: string;
  building: string;
  areas: ContractArea[];
  tasks: ContractTaskDef[];
};

export type ContractBuilding = {
  name: string;
  areaTypes: ContractAreaType[];
  areaCount: number;
};

const SHIFT_ORDER = ["Day", "Swing", "Graveyard"];

function areaDisplayName(row: SowContractRow): string {
  if (row.areaName.trim()) return row.areaName;
  if (row.areaNumber.trim()) return row.areaNumber;
  return row.areaId;
}

export function buildContractBuildings(rows: SowContractRow[]): ContractBuilding[] {
  type AreaTypeAcc = { areas: Map<string, ContractArea>; tasks: Map<string, ContractTaskDef> };
  const byBuilding = new Map<string, Map<string, AreaTypeAcc>>();

  rows.forEach((row) => {
    if (!row.building || !row.areaType) return;
    if (!byBuilding.has(row.building)) byBuilding.set(row.building, new Map());
    const areaTypeMap = byBuilding.get(row.building)!;
    if (!areaTypeMap.has(row.areaType)) areaTypeMap.set(row.areaType, { areas: new Map(), tasks: new Map() });
    const acc = areaTypeMap.get(row.areaType)!;

    if (!acc.areas.has(row.areaId)) {
      acc.areas.set(row.areaId, {
        areaId: row.areaId,
        areaNumber: row.areaNumber,
        displayName: areaDisplayName(row),
        floor: row.floor,
        floorDescription: row.floorDescription,
      });
    }

    const existingTask = acc.tasks.get(row.taskName);
    if (!existingTask) {
      acc.tasks.set(row.taskName, { label: row.taskName, frequency: row.frequencyRaw, shifts: [row.shift] });
    } else if (row.shift && !existingTask.shifts.includes(row.shift)) {
      existingTask.shifts.push(row.shift);
    }
  });

  const buildings: ContractBuilding[] = [];
  byBuilding.forEach((areaTypeMap, buildingName) => {
    const areaTypes: ContractAreaType[] = [];
    let areaCount = 0;
    areaTypeMap.forEach((acc, areaTypeName) => {
      const areas = Array.from(acc.areas.values()).sort((a, b) => a.areaNumber.localeCompare(b.areaNumber));
      areaCount += areas.length;
      const tasks = Array.from(acc.tasks.values()).map((t) => ({
        ...t,
        shifts: [...t.shifts].sort((a, b) => SHIFT_ORDER.indexOf(a) - SHIFT_ORDER.indexOf(b)),
      }));
      areaTypes.push({ name: areaTypeName, building: buildingName, areas, tasks });
    });
    areaTypes.sort((a, b) => a.name.localeCompare(b.name));
    buildings.push({ name: buildingName, areaTypes, areaCount });
  });
  buildings.sort((a, b) => a.name.localeCompare(b.name));
  return buildings;
}

/** Find one building's area types by name — used everywhere a page needs "is this building modeled, and if so what's in it." */
export function findContractBuilding(buildings: ContractBuilding[], name: string | null): ContractBuilding | undefined {
  return name ? buildings.find((b) => b.name === name) : undefined;
}

/**
 * Find an area type by name, optionally preferring a specific
 * building — used where an unrelated dataset (areaTypeCoverage) names
 * a building that doesn't necessarily match where this area type is
 * actually modeled in the real export.
 */
export function findContractAreaType(
  buildings: ContractBuilding[],
  areaTypeName: string,
  preferredBuilding?: string
): ContractAreaType | undefined {
  if (preferredBuilding) {
    const preferred = findContractBuilding(buildings, preferredBuilding)?.areaTypes.find((at) => at.name === areaTypeName);
    if (preferred) return preferred;
  }
  for (const building of buildings) {
    const match = building.areaTypes.find((at) => at.name === areaTypeName);
    if (match) return match;
  }
  return undefined;
}
