/**
 * Real per-shift expected-service counts for LGA Terminal C — parses
 * `data/Service Count/lga_expected_services.csv` (see that folder's
 * README for the source and the specificity rule `lookupExpectedServices`
 * implements verbatim: an exact area override wins over a building-level
 * override, which wins over the area type's site-wide "All Buildings"
 * default). lib/sowContract.ts attaches these onto every `ContractArea`
 * (see its `attachExpectedServices`), so every surface that shows an
 * "expected services" number — the Map feature, the Daily/Shift Report
 * modals, and the SOW pages — reads the same real counts instead of
 * each inventing its own estimate.
 *
 * Parsing here is plain, synchronous, and side-effect-free (safe to
 * import from a "use client" component) — actually reading the CSV
 * file needs `fs`, which only runs server-side; that loader lives in
 * lib/sowContractLoader.ts, same split as the real SOW export itself.
 */

import { parseCsv } from "./csv";

export type ShiftLabel = "Day" | "Swing" | "Graveyard";
export const SHIFT_LABELS: ShiftLabel[] = ["Day", "Swing", "Graveyard"];

/** The source spells this building "Pavillion" (same cosmetic quirk sowContract.ts's own normalizeBuildingName already corrects for the real SOW export) — normalized here too, so a building-level override in this CSV actually matches `ContractAreaType.building`'s single-L spelling. */
function normalizeBuildingName(name: string): string {
  return name === "Pavillion" ? "Pavilion" : name;
}

export type ExpectedServiceRow = {
  areaType: string;
  /** A real building name (normalized), or the literal wildcard "All Buildings". */
  building: string;
  floor: string;
  /** A specific named space (e.g. "Delta Sky Priority"), or the literal wildcard "All". */
  area: string;
  shift: string;
  expectedCount: number;
};

export function parseExpectedServiceRows(csvText: string): ExpectedServiceRow[] {
  return parseCsv(csvText).map((r) => ({
    areaType: r["area_type"] ?? "",
    building: normalizeBuildingName(r["building"] ?? ""),
    floor: r["floor"] ?? "",
    area: r["area"] ?? "",
    shift: r["shift"] ?? "",
    expectedCount: Number(r["expected_count"]) || 0,
  }));
}

export type ExpectedServicesIndex = {
  /** `${areaType}|${building}|${area}|${shift}` -> count — a specific named-area override. */
  byArea: Map<string, number>;
  /** `${areaType}|${building}|${shift}` -> count — a building-level override (area === "All"). */
  byBuilding: Map<string, number>;
  /** `${areaType}|${shift}` -> count — the airport-wide default (building === "All Buildings"). */
  byDefault: Map<string, number>;
  /** Every area type with at least one rule anywhere in the source — lets lookupExpectedServices tell "no rule anywhere for this area type" (fall back to something else) apart from "this area type has rules, just none for this particular shift" (a real, deliberate zero). */
  areaTypesWithRules: Set<string>;
};

export function buildExpectedServicesIndex(rows: ExpectedServiceRow[]): ExpectedServicesIndex {
  const byArea = new Map<string, number>();
  const byBuilding = new Map<string, number>();
  const byDefault = new Map<string, number>();
  const areaTypesWithRules = new Set<string>();
  rows.forEach((row) => {
    if (!row.areaType || !row.shift) return;
    areaTypesWithRules.add(row.areaType);
    if (row.building === "All Buildings") {
      byDefault.set(`${row.areaType}|${row.shift}`, row.expectedCount);
    } else if (row.area === "All") {
      byBuilding.set(`${row.areaType}|${row.building}|${row.shift}`, row.expectedCount);
    } else {
      byArea.set(`${row.areaType}|${row.building}|${row.area}|${row.shift}`, row.expectedCount);
    }
  });
  return { byArea, byBuilding, byDefault, areaTypesWithRules };
}

export const EMPTY_EXPECTED_SERVICES_INDEX: ExpectedServicesIndex = {
  byArea: new Map(),
  byBuilding: new Map(),
  byDefault: new Map(),
  areaTypesWithRules: new Set(),
};

/**
 * Real expected-service count for one location + shift, per the
 * 3-tier specificity rule the source data already encodes (exact area
 * override -> building-level override -> airport-wide default).
 *
 * Returns `null` when this area type has no rule anywhere in the
 * source (e.g. "Curbsides"/"Exterior Stairwells" aren't in the
 * reference data at all) so callers can fall back to a different real
 * number instead of silently treating "no data" as "zero expected."
 * Returns `0` when the area type does have rules but genuinely none
 * for this specific shift/location (e.g. Fire Stairwells has no Day
 * rule in some buildings) — that's a real "no service expected," not
 * missing data.
 */
/** Sum of one area's real expected-service count across all three shifts — the "combined, not shift-specific" total the SOW pages show (Area Type / Building / Area cards). Takes just the one field it needs (rather than the full ContractArea type) so this file doesn't have to import from lib/sowContract.ts, which itself imports from here. */
export function totalExpectedServices(area: { expectedByShift: Record<ShiftLabel, number> }): number {
  return SHIFT_LABELS.reduce((sum, shift) => sum + area.expectedByShift[shift], 0);
}

export function lookupExpectedServices(
  index: ExpectedServicesIndex,
  params: { areaType: string; building: string; area: string; shift: string }
): number | null {
  const { areaType, building, area, shift } = params;
  if (!index.areaTypesWithRules.has(areaType)) return null;
  const areaKey = `${areaType}|${building}|${area}|${shift}`;
  if (index.byArea.has(areaKey)) return index.byArea.get(areaKey)!;
  const buildingKey = `${areaType}|${building}|${shift}`;
  if (index.byBuilding.has(buildingKey)) return index.byBuilding.get(buildingKey)!;
  const defaultKey = `${areaType}|${shift}`;
  return index.byDefault.get(defaultKey) ?? 0;
}
