/**
 * Shared per-area service-completion model for the Map feature —
 * the single source of truth both lib/mapPageData.ts's Daily Report
 * cards ("155 of 709 areas had no services") and
 * lib/mapShiftReportData.ts's Shift Report drill-down read, so the
 * two surfaces never disagree on which areas were missed.
 *
 * Every real area with at least one task scheduled for a shift
 * (data/SOW_DeltaLGA.csv's own `shift` column) gets a set number of
 * expected services that shift — fixed per area TYPE (e.g. every
 * Restroom area always expects the same count, matching how a real
 * SOW specifies a service frequency per area type, not per
 * individual area).
 *
 * Whether an area type falls short at all is decided once per type
 * (~75% of area types fully hit their expected count this shift, 25%
 * don't) rather than per area — per-area rolls alone would make
 * "did this type hit its number" mostly a function of how many areas
 * it has (a 100-area type would almost always show *some* shortfall
 * purely from area count), which isn't the realistic "most types are
 * fine, some aren't" split this is meant to represent. Types that
 * miss still distribute that shortfall realistically across their
 * own areas — most complete everything, a minority fall short by
 * one, a few by more, a rare handful get none at all.
 */

import type { ContractBuilding } from "./sowContract";
import { hashSeed, scaleForDay } from "./sowData";

export type AreaServiceStatus = {
  areaId: string;
  displayName: string;
  areaTypeName: string;
  servicesExpected: number;
  servicesCompleted: number;
};

/** Fixed 1–3 expected-services count for an area type — every area of that type shares the same number, and it never varies by day. */
function servicesExpectedForType(areaTypeName: string): number {
  return 1 + (hashSeed(`${areaTypeName}-expected`) % 3); // 1–3
}

/** Decided once per area type per shift/day — ~75% of area types fully hit their expected services this shift; the rest fall short in at least one area. */
function areaTypeHitsExpectedServices(areaTypeName: string, shiftLabel: string, dayOffset: number): boolean {
  const roll = scaleForDay(`${areaTypeName}-${shiftLabel}-typehit`, dayOffset, 0, 1);
  return roll < 0.75;
}

function servicesMissedForArea(areaId: string, shiftLabel: string, dayOffset: number, expected: number): number {
  const roll = scaleForDay(`${areaId}-${shiftLabel}-missroll`, dayOffset, 0, 1);
  if (roll < 0.85) return 0; // ~85% of areas complete everything
  if (roll < 0.93) return 1;
  if (roll < 0.98) return Math.min(2, expected);
  return expected; // fully missed — rare
}

/** Every area with a task scheduled for `shiftLabel`, each with a deterministic services-expected/completed breakdown for the given day. */
export function computeShiftAreaServices(buildings: ContractBuilding[], shiftLabel: string, dayOffset: number): AreaServiceStatus[] {
  const result: AreaServiceStatus[] = [];
  buildings.forEach((building) => {
    building.areaTypes.forEach((areaType) => {
      if (!areaType.tasks.some((task) => task.shifts.includes(shiftLabel))) return;
      const expected = servicesExpectedForType(areaType.name);
      const typeHitsExpected = areaTypeHitsExpectedServices(areaType.name, shiftLabel, dayOffset);
      areaType.areas.forEach((area) => {
        const missed = typeHitsExpected ? 0 : servicesMissedForArea(area.areaId, shiftLabel, dayOffset, expected);
        result.push({
          areaId: area.areaId,
          displayName: area.displayName,
          areaTypeName: areaType.name,
          servicesExpected: expected,
          servicesCompleted: expected - missed,
        });
      });
    });
  });
  return result;
}
