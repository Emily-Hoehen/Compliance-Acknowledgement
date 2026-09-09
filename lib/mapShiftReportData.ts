/**
 * Data for the Map feature's Shift Report — the right sidebar's
 * drill-down view for one selected shift (Day/Swing/Graveyard),
 * replacing the Daily Report when a shift is selected on MapPage.
 * No Figma source: this is a new surface, illustrative sample data
 * in the same spirit as the rest of lib/mapPageData.ts. Reuses
 * lib/sowData.ts's deterministic day-based generators
 * (hoursCapturedForNode) and real SOW area/area-type
 * data from lib/sowContract.ts so the "which area types fell short"
 * drill-down points at real area names, not invented ones.
 *
 * Centered on Areas Missed: the lead stat and its area-type/area
 * drill-down are built from lib/mapAreaServiceData.ts's
 * computeShiftAreaServices — the same per-area service-completion
 * model lib/mapPageData.ts's Daily Report cards read, so the two
 * surfaces always agree on which areas (and how many services per
 * area) were missed.
 */

import type { ContractBuilding } from "./sowContract";
import { photoForAreaType } from "./sowImages";
import { computeShiftAreaServices } from "./mapAreaServiceData";
import { hoursCapturedForNode, hashSeed, pickClockTime } from "./sowData";
import type { DailyReportPerson, DailyReportShift } from "./mapPageData";

export type ManagerNote = {
  author: DailyReportPerson;
  timestamp: string;
  text: string;
};

export type ShiftAreaVerification = {
  areaId: string;
  displayName: string;
  servicesExpected: number;
  servicesCompleted: number;
  managerNote?: ManagerNote;
};

export type ShiftAreaTypeVerification = {
  name: string;
  photo?: string;
  areasMissed: number;
  areasTotal: number;
  /** Only the areas with at least one missed service — this drill-down is centered on what fell short, not a full roster. */
  missedAreas: ShiftAreaVerification[];
};

export type ShiftIssue = {
  title: string;
  detail: string;
};

export type ShiftProject = {
  name: string;
  status: "On Track" | "Needs Attention" | "Complete";
};

export type ShiftReport = {
  shiftKey: DailyReportShift["key"];
  label: string;
  timeRange: string;
  managers: DailyReportPerson[];
  totalAreas: number;
  areasMissedCount: number;
  totalAreaTypesCount: number;
  areaTypesAffected: ShiftAreaTypeVerification[];
  hoursCapturedLabel: string;
  hoursPaidLabel: string;
  hoursPercent: number;
  hoursNote?: ManagerNote;
  scoresNote: ManagerNote;
  safetyIssues: ShiftIssue[];
  totalReportIts: number;
  reportItsNote: ManagerNote;
  attendanceIssues: ShiftIssue[];
  projects: ShiftProject[];
  notes: ManagerNote[];
};

const MISSED_REASONS = [
  "Access restricted — construction crew on site.",
  "Associate called out; reassigned remaining coverage to adjacent areas.",
  "Awaiting replacement parts before service could be completed.",
  "Flight delay pushed gate access past end of shift.",
  "Area occupied by an event through the scheduled service window.",
];

function pickMissedReason(seed: string): string {
  return MISSED_REASONS[hashSeed(seed) % MISSED_REASONS.length];
}

const HOURS_SHORTFALL_NOTES = [
  "Two associates called out; coverage was split across the remaining team.",
  "Held over finishing a deep-clean carried in from the prior shift.",
  "Short-staffed for the back half of the shift — supervisor covered floor duties.",
];

function pickHoursNote(seed: string): string {
  return HOURS_SHORTFALL_NOTES[hashSeed(seed) % HOURS_SHORTFALL_NOTES.length];
}

const SCORE_NOTES = [
  "Verification scores dipped slightly after two new associates started this week — pairing them with senior staff for the next few shifts.",
  "Strong shift for scores — response time on flagged items has improved across the team.",
  "Customer audit score reflects one soft-surface complaint in the lounge; a corrective walkthrough is scheduled.",
  "Scores holding steady — no new corrective actions needed this shift.",
];

function pickScoreNote(seed: string): string {
  return SCORE_NOTES[hashSeed(seed) % SCORE_NOTES.length];
}

const REPORT_ITS_NOTES_ZERO = ["No report-its this shift — a quiet one.", "Nothing to log this shift; team flagged issues before they became report-its."];
const REPORT_ITS_NOTES_SOME = [
  "Most report-its were minor facilities tickets (lighting, signage) — logged for day shift follow-up.",
  "One report-it flagged a recurring elevator issue; forwarded to building engineering.",
  "No report-its escalated to safety or security — routine maintenance items only.",
];

function pickReportItsNote(seed: string, count: number): string {
  const pool = count === 0 ? REPORT_ITS_NOTES_ZERO : REPORT_ITS_NOTES_SOME;
  return pool[hashSeed(seed) % pool.length];
}

/** Picks one of the shift's own co-managers to attribute a note to, varying by seed so notes don't all come from the same person. */
function pickManager(shift: DailyReportShift, seed: string): DailyReportPerson {
  const managers = shift.managers;
  if (managers.length === 0) return { name: "Shift Manager", position: "Manager", avatar: "" };
  return managers[hashSeed(seed) % managers.length];
}

function buildNote(shift: DailyReportShift, seed: string, text: string): ManagerNote {
  return { author: pickManager(shift, seed), timestamp: pickClockTime(`${seed}-time`), text };
}

/** Builds the full Shift Report for one shift/day — deterministic, so re-selecting the same shift on the same date always reproduces the same numbers, and always agrees with the Daily Report's own missed-areas count (both read lib/mapAreaServiceData.ts's computeShiftAreaServices). */
export function buildShiftReport(shift: DailyReportShift, dayOffset: number, buildings: ContractBuilding[]): ShiftReport {
  const seed = shift.key;
  const areaServices = computeShiftAreaServices(buildings, shift.label, dayOffset);

  const byAreaType = new Map<string, typeof areaServices>();
  areaServices.forEach((area) => {
    if (!byAreaType.has(area.areaTypeName)) byAreaType.set(area.areaTypeName, []);
    byAreaType.get(area.areaTypeName)!.push(area);
  });

  const areaTypesAffected: ShiftAreaTypeVerification[] = Array.from(byAreaType.entries())
    .map(([name, areas]) => {
      const missed = areas.filter((a) => a.servicesCompleted < a.servicesExpected);
      return {
        name,
        photo: photoForAreaType(name, name),
        areasMissed: missed.length,
        areasTotal: areas.length,
        missedAreas: missed.map((area) => ({
          areaId: area.areaId,
          displayName: area.displayName,
          servicesExpected: area.servicesExpected,
          servicesCompleted: area.servicesCompleted,
          managerNote: buildNote(shift, `${seed}-${area.areaId}-note`, pickMissedReason(`${seed}-${area.areaId}-note`)),
        })),
      };
    })
    .filter((areaType) => areaType.areasMissed > 0)
    .sort((a, b) => b.areasMissed - a.areasMissed);

  const totalAreas = areaServices.length;
  const areasMissedCount = areaServices.filter((a) => a.servicesCompleted < a.servicesExpected).length;

  const hours = hoursCapturedForNode(seed, dayOffset);
  const totalReportIts = hashSeed(`${seed}-report-its-${dayOffset}`) % 4;

  const safetyRoll = hashSeed(`${seed}-safety-${dayOffset}`) % 5;
  const safetyIssues: ShiftIssue[] =
    safetyRoll === 0
      ? [{ title: "Wet floor sign missing", detail: "Reported near Baggage Claim; replacement sign placed within the hour." }]
      : [];

  const attendanceRoll = hashSeed(`${seed}-attendance-${dayOffset}`) % 4;
  const attendanceIssues: ShiftIssue[] =
    attendanceRoll === 0
      ? [{ title: `${shift.managers[0]?.name ?? "Team lead"} logged one late arrival`, detail: "Associate arrived 25 minutes late; shift coverage was not affected." }]
      : [];

  return {
    shiftKey: shift.key,
    label: shift.label,
    timeRange: shift.timeRange,
    managers: shift.managers,
    totalAreas,
    areasMissedCount,
    totalAreaTypesCount: byAreaType.size,
    areaTypesAffected,
    hoursCapturedLabel: hours.capturedLabel,
    hoursPaidLabel: hours.paidLabel,
    hoursPercent: hours.percent,
    hoursNote: hours.percent < 100 ? buildNote(shift, `${seed}-hours-note`, pickHoursNote(`${seed}-hours-note`)) : undefined,
    scoresNote: buildNote(shift, `${seed}-scores-note-${dayOffset}`, pickScoreNote(`${seed}-scores-note-${dayOffset}`)),
    safetyIssues,
    totalReportIts,
    reportItsNote: buildNote(shift, `${seed}-report-its-note-${dayOffset}`, pickReportItsNote(`${seed}-report-its-note-${dayOffset}`, totalReportIts)),
    attendanceIssues,
    projects: [
      { name: "Concourse D Floor Refinish", status: "On Track" },
      { name: "Restroom Fixture Upgrade — Pavilion", status: hashSeed(`${seed}-project2`) % 3 === 0 ? "Needs Attention" : "On Track" },
    ],
    notes: [buildNote(shift, `${seed}-note-${dayOffset}`, `Handed off clean — team stayed on top of ${shift.label.toLowerCase()} coverage despite the day's call-outs.`)],
  };
}
