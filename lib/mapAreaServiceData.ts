/**
 * Shared per-area service-completion model for the Map feature —
 * the single source of truth both lib/mapPageData.ts's Daily Report
 * cards ("155 of 709 areas had no services") and
 * lib/mapShiftReportData.ts's Shift Report drill-down read, so the
 * two surfaces never disagree on which areas were missed.
 *
 * Every real area with at least one task scheduled for a shift
 * (data/SOW_DeltaLGA.csv's own `shift` column) gets its own real
 * expected-service count for that shift (ContractArea.expectedByShift
 * — see lib/expectedServices.ts), not an invented one — the same
 * number every other surface reads, so a building/area override in
 * the source data (e.g. Concourse D's Escalators expecting more day
 * passes than the airport-wide default) shows up everywhere at once.
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
 * one, a few by more, a rare handful get none at all. This "who
 * completed how much" simulation is the only part still synthetic —
 * only the expected-count side is real.
 */

import type { ContractBuilding } from "./sowContract";
import type { ShiftLabel } from "./expectedServices";
import { scaleForDay } from "./sowData";

export type AreaServiceStatus = {
  areaId: string;
  displayName: string;
  areaTypeName: string;
  servicesExpected: number;
  servicesCompleted: number;
};

/** Service-completion tier for one area (or any completed/expected total rolled up from several) — missed: nothing completed, incomplete: partially completed, completed: exactly met, over-serviced: exceeded. Shared by the map's status pins, its area-type/area status dots, and the status filter, so all three always agree. */
export type AreaStatus = "missed" | "incomplete" | "completed" | "over-serviced";

export function statusForCounts(completed: number, expected: number): AreaStatus {
  if (completed <= 0) return "missed";
  if (completed < expected) return "incomplete";
  if (completed > expected) return "over-serviced";
  return "completed";
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

/** Decided once per area type per DAY (not per shift — an over-serviced type tends to run that way all day, not shift-by-shift, so this doesn't use `scaleForDay`'s shift-varying seed) — a little over half of the area types that fully hit their expected count also pick up extra passes somewhere; the rest land exactly on target with no over-servicing at all. Keeping this a per-type, per-day decision (rather than an independent roll per area) is what keeps "completed" and "over-serviced" as genuinely distinct, common outcomes at the area-type level instead of every type's roster averaging out to "some areas over, some not, sums to over" once you have a dozen-plus areas in it. */
function areaTypeRunsOverServiced(areaTypeName: string, dayOffset: number): boolean {
  const roll = scaleForDay(`${areaTypeName}-overtype`, dayOffset, 0, 1);
  return roll < 0.55;
}

/** For an area within a type that's running over-serviced this day — how many services *beyond* the expected count it individually picked up, e.g. an extra pass because a neighboring area's associate had time left. Areas within a type that isn't running over-serviced always land exactly on target (no roll at all). */
function servicesOverForArea(areaId: string, dayOffset: number): number {
  const roll = scaleForDay(`${areaId}-overamount`, dayOffset, 0, 1);
  if (roll < 0.35) return 0; // even in an over-serviced type, some areas still land exactly on target
  if (roll < 0.75) return 1;
  return 2;
}

/** Every area with a task scheduled for `shiftLabel`, each with a deterministic services-expected/completed breakdown for the given day. */
export function computeShiftAreaServices(buildings: ContractBuilding[], shiftLabel: string, dayOffset: number): AreaServiceStatus[] {
  const result: AreaServiceStatus[] = [];
  buildings.forEach((building) => {
    building.areaTypes.forEach((areaType) => {
      if (!areaType.tasks.some((task) => task.shifts.includes(shiftLabel))) return;
      const typeHitsExpected = areaTypeHitsExpectedServices(areaType.name, shiftLabel, dayOffset);
      const typeRunsOverServiced = typeHitsExpected && areaTypeRunsOverServiced(areaType.name, dayOffset);
      areaType.areas.forEach((area) => {
        const expected = area.expectedByShift[shiftLabel as ShiftLabel] ?? 0;
        const missed = typeHitsExpected ? 0 : servicesMissedForArea(area.areaId, shiftLabel, dayOffset, expected);
        const over = missed === 0 && typeRunsOverServiced ? servicesOverForArea(area.areaId, dayOffset) : 0;
        result.push({
          areaId: area.areaId,
          displayName: area.displayName,
          areaTypeName: areaType.name,
          servicesExpected: expected,
          servicesCompleted: expected - missed + over,
        });
      });
    });
  });
  return result;
}

/** How many areas fall into each of the four service-completion tiers (see AreaStatus) plus "No Frequency" (areas with nothing scheduled at all for this shift/day), and the overall "serviced at all" percent — the Full Day Report's "Area Coverage"/"Areas Serviced" breakdown, shared by the per-shift cards, the Daily Summary sidebar, and the Map sidebar so all three always read the same real counts against the same site-wide total. */
export type AreaCoverageBreakdown = {
  /** Every physical area at the site — the same fixed count (709 site-wide) for every shift AND for the unfiltered day, since each shift is responsible for the whole site (not just the areas it happens to have a task for), and the day is those same shifts cleaning the same physical areas again, not a different, larger set of areas. */
  totalAreas: number;
  /** Areas with a scheduled frequency that got at least some (but not necessarily all) of it done — under + fully + over-serviced. Deliberately excludes both "Not Serviced" (had a frequency, got none of it) and "No Frequency" (nothing was ever scheduled) from this headline count. */
  servicedCount: number;
  servicedPercent: number;
  notServicedCount: number;
  underServicedCount: number;
  fullyServicedCount: number;
  overServicedCount: number;
  /** Areas with no scheduled frequency at all for this shift (or, for the unfiltered day, on any of the three shifts) — informational, not a shortfall. */
  noFrequencyCount: number;
};

/** Buckets a set of per-area rows into an AreaCoverageBreakdown — an area with servicesExpected <= 0 has no scheduled frequency at all and lands in noFrequencyCount rather than being run through statusForCounts (which would otherwise read "0 completed" as "missed"). */
function bucketAreaCoverageBreakdown(areaServices: AreaServiceStatus[]): AreaCoverageBreakdown {
  const totalAreas = areaServices.length;
  let notServicedCount = 0;
  let underServicedCount = 0;
  let fullyServicedCount = 0;
  let overServicedCount = 0;
  let noFrequencyCount = 0;
  areaServices.forEach((area) => {
    if (area.servicesExpected <= 0) {
      noFrequencyCount += 1;
      return;
    }
    switch (statusForCounts(area.servicesCompleted, area.servicesExpected)) {
      case "missed":
        notServicedCount += 1;
        break;
      case "incomplete":
        underServicedCount += 1;
        break;
      case "completed":
        fullyServicedCount += 1;
        break;
      case "over-serviced":
        overServicedCount += 1;
        break;
    }
  });
  const servicedCount = underServicedCount + fullyServicedCount + overServicedCount;
  return {
    totalAreas,
    servicedCount,
    servicedPercent: totalAreas > 0 ? Math.round((servicedCount / totalAreas) * 100) : 0,
    notServicedCount,
    underServicedCount,
    fullyServicedCount,
    overServicedCount,
    noFrequencyCount,
  };
}

const DAILY_SHIFT_LABELS = ["Day", "Swing", "Graveyard"];

/** Same per-area roll as computeShiftAreaServices, but for EVERY physical area at the site regardless of whether it has a scheduled frequency for `shiftLabel` — areas with none simply come back with servicesExpected 0, so this is what the "Areas Serviced" widget's totalAreas always reflects (every shift is responsible for the whole site). computeShiftAreaServices' own narrower "only areas this shift actually touches" set stays what the map pins/Area Types list read — a pin doesn't make sense for an area with nothing scheduled that shift. */
function computeAllAreaServicesForShift(buildings: ContractBuilding[], shiftLabel: string, dayOffset: number): AreaServiceStatus[] {
  const result: AreaServiceStatus[] = [];
  buildings.forEach((building) => {
    building.areaTypes.forEach((areaType) => {
      // Whether this area type has any real SOW task scheduled on this shift at all — expectedByShift can still
      // resolve to a non-zero fallback value even for a shift the type has no task on (the expected-services
      // reference data's own broader building/area-type defaults apply regardless), so that field alone can't be
      // used to detect "nothing scheduled"; the type's own task list is the real signal.
      const typeHasFrequency = areaType.tasks.some((task) => task.shifts.includes(shiftLabel));
      const typeHitsExpected = typeHasFrequency && areaTypeHitsExpectedServices(areaType.name, shiftLabel, dayOffset);
      const typeRunsOverServiced = typeHitsExpected && areaTypeRunsOverServiced(areaType.name, dayOffset);
      areaType.areas.forEach((area) => {
        const expected = typeHasFrequency ? (area.expectedByShift[shiftLabel as ShiftLabel] ?? 0) : 0;
        const missed = typeHitsExpected ? 0 : servicesMissedForArea(area.areaId, shiftLabel, dayOffset, expected);
        const over = missed === 0 && typeRunsOverServiced ? servicesOverForArea(area.areaId, dayOffset) : 0;
        result.push({
          areaId: area.areaId,
          displayName: area.displayName,
          areaTypeName: areaType.name,
          servicesExpected: expected,
          servicesCompleted: typeHasFrequency ? expected - missed + over : 0,
        });
      });
    });
  });
  return result;
}

/** Every physical area at the site with its combined expected/completed across all three shifts — an area with a frequency on only one shift still shows up (with that one shift's numbers); an area with no frequency on any of the three shifts lands at 0/0 (No Frequency for the whole day). The same 709 areas are what every shift cleans, once or twice a day — not a fresh set of areas per shift — so this merges each area into one row rather than counting it three times. */
function computeAllAreaServicesForDay(buildings: ContractBuilding[], dayOffset: number): AreaServiceStatus[] {
  const merged = new Map<string, AreaServiceStatus>();
  DAILY_SHIFT_LABELS.forEach((label) => {
    computeAllAreaServicesForShift(buildings, label, dayOffset).forEach((row) => {
      const existing = merged.get(row.areaId);
      if (existing) {
        existing.servicesExpected += row.servicesExpected;
        existing.servicesCompleted += row.servicesCompleted;
      } else {
        merged.set(row.areaId, { ...row });
      }
    });
  });
  return Array.from(merged.values());
}

/** The "Areas Serviced" widget's breakdown for one shift — every area at the site, against just that shift's own expected/completed counts. */
export function computeShiftAreaCoverageBreakdown(buildings: ContractBuilding[], shiftLabel: string, dayOffset: number): AreaCoverageBreakdown {
  return bucketAreaCoverageBreakdown(computeAllAreaServicesForShift(buildings, shiftLabel, dayOffset));
}

/**
 * The "Areas Serviced" widget's breakdown for the whole (unfiltered) day —
 * every one of the site's 709 areas, bucketed once each against its
 * combined expected/completed across all three shifts. An area Not
 * Serviced on Day but Fully Serviced on Swing and Graveyard nets out to
 * whatever its combined day total lands on (e.g. Fully or Over-Serviced),
 * not "Not Serviced" — it's the same physical area getting cleaned by
 * more than one shift, not three separate areas, so it's counted once for
 * the day. That's what keeps totalAreas fixed at the real site count and
 * the Not/Under/Fully/Over-Serviced/No-Frequency counts summing to it
 * exactly, the same way each individual shift's own breakdown already does.
 */
export function computeDailyAreaCoverageBreakdown(buildings: ContractBuilding[], dayOffset: number): AreaCoverageBreakdown {
  return bucketAreaCoverageBreakdown(computeAllAreaServicesForDay(buildings, dayOffset));
}

/** Same per-area model as computeShiftAreaServices, summed across the day's three shifts — for the map's status pins and the unfiltered (no-shift-selected) Area Types list, where "red/yellow/green" means the area's whole day, not one shift. An area scheduled on more than one shift is merged into a single row rather than counted twice. Areas with no scheduled frequency on any shift are absent here entirely (unlike computeDailyAreaCoverageBreakdown's own full site-wide set) since a status pin/list row wouldn't mean anything for them. */
export function computeDailyAreaServices(buildings: ContractBuilding[], dayOffset: number): AreaServiceStatus[] {
  const merged = new Map<string, AreaServiceStatus>();
  DAILY_SHIFT_LABELS.forEach((label) => {
    computeShiftAreaServices(buildings, label, dayOffset).forEach((row) => {
      const existing = merged.get(row.areaId);
      if (existing) {
        existing.servicesExpected += row.servicesExpected;
        existing.servicesCompleted += row.servicesCompleted;
      } else {
        merged.set(row.areaId, { ...row });
      }
    });
  });
  return Array.from(merged.values());
}
