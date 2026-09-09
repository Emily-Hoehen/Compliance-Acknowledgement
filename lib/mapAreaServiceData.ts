/**
 * Shared per-area service-completion model for the Map feature —
 * the single source of truth both lib/mapPageData.ts's Daily Report
 * cards ("155 of 709 areas had no services") and
 * lib/mapShiftReportData.ts's Shift Report drill-down read, so the
 * two surfaces never disagree on which areas were missed.
 *
 * Every real area with at least one task scheduled for a shift
 * (data/SOW_DeltaLGA.csv's own `shift` column) gets 1–3 expected
 * services that shift and a deterministic, day-varying count of how
 * many were actually completed — most areas complete all of them;
 * a minority fall short by one, a few by more, and a rare handful
 * get none at all.
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

function servicesExpectedForArea(areaId: string, shiftLabel: string): number {
  return 1 + (hashSeed(`${areaId}-${shiftLabel}-expected`) % 3); // 1–3
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
      areaType.areas.forEach((area) => {
        const expected = servicesExpectedForArea(area.areaId, shiftLabel);
        const missed = servicesMissedForArea(area.areaId, shiftLabel, dayOffset, expected);
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
