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
import { hashSeed, pickClockTime, scaleForDay, scoreForDay } from "./sowData";
import type { DailyReportPerson, DailyReportShift, QualityScore } from "./mapPageData";

export type ManagerNote = {
  author: DailyReportPerson;
  timestamp: string;
  text: string;
  /** Short category label shown as a chip on the note — e.g. "Staffing", "Access", "Facilities" — so a manager can scan what kind of issue each note explains without reading the full text. */
  tag: string;
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

/** One area type's roll-up for the shift-filtered Area Types list — every area type relevant to the shift (not only the ones with a missed area, unlike ShiftAreaTypeVerification above), so the list reads the same shape as the unfiltered site-wide Area Types list plus a per-type expected-services shortfall. */
export type ShiftAreaTypeSummary = {
  name: string;
  photo?: string;
  areasTotal: number;
  areasServiced: number;
  servicesCompletedCount: number;
  servicesExpectedCount: number;
  score: number;
};

/** The full drill-down for one area type within a shift — every area of that type (not only the missed ones, unlike ShiftAreaTypeVerification), for the "click an area type" detail view. */
export type ShiftAreaTypeDetail = {
  name: string;
  photo?: string;
  areasTotal: number;
  servicesCompletedCount: number;
  servicesExpectedCount: number;
  servicesPercent: number;
  areas: ShiftAreaVerification[];
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
  /** "8h 12min"-style total time worked this shift, keyed by manager name — shown in the shift overview's Managers section. */
  managerTotalTime: Record<string, string>;
  totalAreas: number;
  areasMissedCount: number;
  totalAreaTypesCount: number;
  areaTypesAffected: ShiftAreaTypeVerification[];
  /** Every area type relevant to this shift, for the shift-filtered Area Types list. */
  areaTypeSummaries: ShiftAreaTypeSummary[];
  /** Raw services-completed/expected counts for this shift alone, for the overview's Services Completed stat (distinct from the site-wide count shown when no shift is filtered). */
  servicesCompletedCount: number;
  servicesExpectedCount: number;
  servicesPercent: number;
  hoursCapturedLabel: string;
  hoursPaidLabel: string;
  hoursPercent: number;
  hoursNote?: ManagerNote;
  /** AI Verification / Internal Audit / Joint Audit / Customer Audit for this shift alone — same shape as mapPageData's site-wide qualityScores. */
  qualityScores: QualityScore[];
  scheduledHeadcount: number;
  actualArrival: number;
  totalAbsences: number;
  noCallNoShowCount: number;
  callOutsCount: number;
  scoresNote: ManagerNote;
  safetyIssues: ShiftIssue[];
  totalReportIts: number;
  reportItsNote: ManagerNote;
  attendanceIssues: ShiftIssue[];
  projects: ShiftProject[];
  notes: ManagerNote[];
};

type NoteTemplate = { text: string; tag: string };

const MISSED_REASONS: NoteTemplate[] = [
  { text: "Access restricted — construction crew on site.", tag: "Access" },
  { text: "Associate called out; reassigned remaining coverage to adjacent areas.", tag: "Staffing" },
  { text: "Awaiting replacement parts before service could be completed.", tag: "Equipment" },
  { text: "Flight delay pushed gate access past end of shift.", tag: "Schedule" },
  { text: "Area occupied by an event through the scheduled service window.", tag: "Access" },
];

function pickMissedReason(seed: string): NoteTemplate {
  return MISSED_REASONS[hashSeed(seed) % MISSED_REASONS.length];
}

const HOURS_SHORTFALL_NOTES: NoteTemplate[] = [
  { text: "Two associates called out; coverage was split across the remaining team.", tag: "Staffing" },
  { text: "Held over finishing a deep-clean carried in from the prior shift.", tag: "Handoff" },
  { text: "Short-staffed for the back half of the shift — supervisor covered floor duties.", tag: "Staffing" },
];

function pickHoursNote(seed: string): NoteTemplate {
  return HOURS_SHORTFALL_NOTES[hashSeed(seed) % HOURS_SHORTFALL_NOTES.length];
}

const SCORE_NOTES: NoteTemplate[] = [
  { text: "Verification scores dipped slightly after two new associates started this week — pairing them with senior staff for the next few shifts.", tag: "Training" },
  { text: "Strong shift for scores — response time on flagged items has improved across the team.", tag: "Improvement" },
  { text: "Customer audit score reflects one soft-surface complaint in the lounge; a corrective walkthrough is scheduled.", tag: "Complaint" },
  { text: "Scores holding steady — no new corrective actions needed this shift.", tag: "Steady" },
];

function pickScoreNote(seed: string): NoteTemplate {
  return SCORE_NOTES[hashSeed(seed) % SCORE_NOTES.length];
}

const REPORT_ITS_NOTES_ZERO: NoteTemplate[] = [
  { text: "No report-its this shift — a quiet one.", tag: "Routine" },
  { text: "Nothing to log this shift; team flagged issues before they became report-its.", tag: "Routine" },
];
const REPORT_ITS_NOTES_SOME: NoteTemplate[] = [
  { text: "Most report-its were minor facilities tickets (lighting, signage) — logged for day shift follow-up.", tag: "Facilities" },
  { text: "One report-it flagged a recurring elevator issue; forwarded to building engineering.", tag: "Facilities" },
  { text: "No report-its escalated to safety or security — routine maintenance items only.", tag: "Routine" },
];

function pickReportItsNote(seed: string, count: number): NoteTemplate {
  const pool = count === 0 ? REPORT_ITS_NOTES_ZERO : REPORT_ITS_NOTES_SOME;
  return pool[hashSeed(seed) % pool.length];
}

/** Picks one of the shift's own co-managers to attribute a note to, varying by seed so notes don't all come from the same person. */
function pickManager(shift: DailyReportShift, seed: string): DailyReportPerson {
  const managers = shift.managers;
  if (managers.length === 0) return { name: "Shift Manager", position: "Manager", avatar: "" };
  return managers[hashSeed(seed) % managers.length];
}

function buildNote(shift: DailyReportShift, seed: string, template: NoteTemplate): ManagerNote {
  return { author: pickManager(shift, seed), timestamp: pickClockTime(`${seed}-time`), text: template.text, tag: template.tag };
}

/** "8h 12min"-style total time worked, per co-manager, for the overview's Managers section — deterministic per shift/day/manager, centered on a full ~8h shift with a little natural variance. */
function buildManagerTotalTime(shift: DailyReportShift, dayOffset: number): Record<string, string> {
  const result: Record<string, string> = {};
  shift.managers.forEach((manager) => {
    const totalMinutes = 450 + (Math.abs(hashSeed(`${shift.key}-${manager.name}-total-time-${dayOffset}`)) % 60); // 7h30m–8h29m
    result[manager.name] = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`;
  });
  return result;
}

/** AI Verification / Internal Audit / Joint Audit / Customer Audit for one shift — scaled down from the site-wide daily volumes (mapPageData's qualityScores) to a plausible per-shift share, using the same scoreForDay/scaleForDay generators the rest of the app uses for realistic-but-deterministic numbers. */
function buildShiftQualityScores(shift: DailyReportShift, dayOffset: number): QualityScore[] {
  const seed = shift.key;
  const aiCount = Math.round(scaleForDay(`${seed}-ai-count`, dayOffset, 850, 1150));
  const aiScore = scoreForDay(`${seed}-ai-score`, dayOffset);
  const auditCount = Math.round(scaleForDay(`${seed}-audit-count`, dayOffset, 2, 8));
  const auditScore = scoreForDay(`${seed}-audit-score`, dayOffset);
  const jointAuditCount = hashSeed(`${seed}-joint-audit-${dayOffset}`) % 5 === 0 ? 1 : 0;
  const customerAuditCount = hashSeed(`${seed}-customer-audit-${dayOffset}`) % 6 === 0 ? 1 : 0;
  return [
    { label: "AI Verification", count: `${aiCount.toLocaleString()} services`, value: aiScore.toFixed(2), tone: "success" },
    { label: "Internal Audit", count: `${auditCount} audit${auditCount === 1 ? "" : "s"}`, value: auditScore.toFixed(2), tone: "success" },
    {
      label: "Joint Audit",
      count: `${jointAuditCount} audit${jointAuditCount === 1 ? "" : "s"}`,
      value: jointAuditCount > 0 ? scoreForDay(`${seed}-joint-audit-score`, dayOffset).toFixed(2) : "N/A",
      tone: jointAuditCount > 0 ? "success" : "neutral",
    },
    {
      label: "Customer Audit",
      count: `${customerAuditCount} audit${customerAuditCount === 1 ? "" : "s"}`,
      value: customerAuditCount > 0 ? scoreForDay(`${seed}-customer-audit-score`, dayOffset).toFixed(2) : "N/A",
      tone: customerAuditCount > 0 ? "success" : "neutral",
    },
  ];
}

/** The shift-level handoff note shown at the top of the shift-filtered sidebar (MapShiftOverviewSections' Shift Notes card) and in the full report's Notes section. The Day shift uses fixed, realistic copy (matching Figma fileKey SWFMjlBJ4u9vSrVaomRe12, node 183:14426, authored by Carmen Ramos) — multiple short update lines rather than one generic sentence. Swing/Graveyard fall back to the generic templated handoff note, since no equivalent design exists for them yet. */
function buildShiftNote(shift: DailyReportShift, dayOffset: number, seed: string): ManagerNote {
  if (shift.key === "day") {
    const carmen = shift.managers.find((m) => m.name === "Carmen Ramos") ?? shift.managers[0];
    return {
      author: carmen,
      timestamp: "6:55 AM EDT",
      text: [
        "Updated expected services has been completed and sent to 4insite",
        "Will have updated floor schedule by 09/13/26",
        "Alignment of staffing will be completed by 09/13/26",
      ].join("\n"),
      tag: "Handoff",
    };
  }
  return buildNote(shift, `${seed}-note-${dayOffset}`, {
    text: `Handed off clean — team stayed on top of ${shift.label.toLowerCase()} coverage despite the day's call-outs.`,
    tag: "Handoff",
  });
}

function formatShiftHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

/** Shift-scoped Services Completed stat for MapStatsPanel's widget — a shift-level illustrative count (not the per-area sums the Areas Missed drill-down uses), in the same "can run past 100%" spirit as the site-wide Services Completed stat (mapPageData.servicesCompleted), landing in the ~1,300–1,500 range per shift. */
function buildShiftServicesStat(shift: DailyReportShift, dayOffset: number): { completed: number; expected: number; percent: number } {
  const seed = shift.key;
  const expected = Math.round(scaleForDay(`${seed}-services-stat-expected`, dayOffset, 1380, 1420));
  const percent = Math.round(scaleForDay(`${seed}-services-stat-percent`, dayOffset, 100, 106));
  const completed = Math.round((expected * percent) / 100);
  return { completed, expected, percent };
}

/** Shift-scoped Hours Captured stat — the shift's own total paid hours (summed across its scheduled associates) and how much was captured, landing around 350h captured of ~380h paid. Distinct from lib/sowData.ts's hoursCapturedForNode, which is scaled for a single area/node's audit hours, not a whole shift's headcount-wide total. */
function buildShiftHoursStat(shift: DailyReportShift, dayOffset: number): { capturedLabel: string; paidLabel: string; percent: number } {
  const seed = shift.key;
  const paidHours = scaleForDay(`${seed}-hours-stat-paid`, dayOffset, 375, 390);
  const percent = Math.round(scaleForDay(`${seed}-hours-stat-percent`, dayOffset, 90, 94));
  const capturedHours = (paidHours * percent) / 100;
  return { capturedLabel: formatShiftHours(capturedHours), paidLabel: formatShiftHours(paidHours), percent };
}

/** Scheduled headcount / actual arrival / absence breakdown for one shift — deterministic per shift/day, in the same ~1-in-5 shifts have a couple of absences spirit as the rest of this file's issue rolls. */
function buildShiftAttendance(shift: DailyReportShift, dayOffset: number) {
  const seed = shift.key;
  const scheduledHeadcount = Math.round(scaleForDay(`${seed}-scheduled-headcount`, dayOffset, 46, 54));
  const callOutsCount = Math.round(scaleForDay(`${seed}-absences`, dayOffset, 4, 8));
  const noCallNoShowCount = 0;
  const totalAbsences = callOutsCount + noCallNoShowCount;
  return { scheduledHeadcount, actualArrival: scheduledHeadcount - totalAbsences, totalAbsences, noCallNoShowCount, callOutsCount };
}

/** Builds the "click an area type" detail view for one shift — matches Figma fileKey SWFMjlBJ4u9vSrVaomRe12, node 183:14544. Every area of the type gets a row (not only missed ones); a shortfall area gets the same manager note (same seed) the Areas Missed drill-down would show for it, so the two surfaces never disagree. Returns null if the type has no areas scheduled for this shift (shouldn't happen for a type the Area Types list itself surfaced). */
export function buildShiftAreaTypeDetail(shift: DailyReportShift, dayOffset: number, buildings: ContractBuilding[], areaTypeName: string): ShiftAreaTypeDetail | null {
  const seed = shift.key;
  const areaServices = computeShiftAreaServices(buildings, shift.label, dayOffset).filter((a) => a.areaTypeName === areaTypeName);
  if (areaServices.length === 0) return null;

  const servicesCompletedCount = areaServices.reduce((sum, a) => sum + a.servicesCompleted, 0);
  const servicesExpectedCount = areaServices.reduce((sum, a) => sum + a.servicesExpected, 0);

  return {
    name: areaTypeName,
    photo: photoForAreaType(areaTypeName, areaTypeName),
    areasTotal: areaServices.length,
    servicesCompletedCount,
    servicesExpectedCount,
    servicesPercent: servicesExpectedCount > 0 ? Math.round((servicesCompletedCount / servicesExpectedCount) * 100) : 0,
    areas: areaServices.map((area) => ({
      areaId: area.areaId,
      displayName: area.displayName,
      servicesExpected: area.servicesExpected,
      servicesCompleted: area.servicesCompleted,
      managerNote:
        area.servicesCompleted < area.servicesExpected
          ? buildNote(shift, `${seed}-${area.areaId}-note`, pickMissedReason(`${seed}-${area.areaId}-note`))
          : undefined,
    })),
  };
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

  const areaTypeSummaries: ShiftAreaTypeSummary[] = Array.from(byAreaType.entries())
    .map(([name, areasArr]) => ({
      name,
      photo: photoForAreaType(name, name),
      areasTotal: areasArr.length,
      areasServiced: areasArr.filter((a) => a.servicesCompleted > 0).length,
      servicesCompletedCount: areasArr.reduce((sum, a) => sum + a.servicesCompleted, 0),
      servicesExpectedCount: areasArr.reduce((sum, a) => sum + a.servicesExpected, 0),
      score: scoreForDay(name, dayOffset),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalAreas = areaServices.length;
  const areasMissedCount = areaServices.filter((a) => a.servicesCompleted < a.servicesExpected).length;
  const servicesStat = buildShiftServicesStat(shift, dayOffset);

  const hours = buildShiftHoursStat(shift, dayOffset);
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

  const attendance = buildShiftAttendance(shift, dayOffset);

  return {
    shiftKey: shift.key,
    label: shift.label,
    timeRange: shift.timeRange,
    managers: shift.managers,
    managerTotalTime: buildManagerTotalTime(shift, dayOffset),
    totalAreas,
    areasMissedCount,
    totalAreaTypesCount: byAreaType.size,
    areaTypesAffected,
    areaTypeSummaries,
    servicesCompletedCount: servicesStat.completed,
    servicesExpectedCount: servicesStat.expected,
    servicesPercent: servicesStat.percent,
    hoursCapturedLabel: hours.capturedLabel,
    hoursPaidLabel: hours.paidLabel,
    hoursPercent: hours.percent,
    hoursNote: hours.percent < 100 ? buildNote(shift, `${seed}-hours-note`, pickHoursNote(`${seed}-hours-note`)) : undefined,
    qualityScores: buildShiftQualityScores(shift, dayOffset),
    scheduledHeadcount: attendance.scheduledHeadcount,
    actualArrival: attendance.actualArrival,
    totalAbsences: attendance.totalAbsences,
    noCallNoShowCount: attendance.noCallNoShowCount,
    callOutsCount: attendance.callOutsCount,
    scoresNote: buildNote(shift, `${seed}-scores-note-${dayOffset}`, pickScoreNote(`${seed}-scores-note-${dayOffset}`)),
    safetyIssues,
    totalReportIts,
    reportItsNote: buildNote(shift, `${seed}-report-its-note-${dayOffset}`, pickReportItsNote(`${seed}-report-its-note-${dayOffset}`, totalReportIts)),
    attendanceIssues,
    projects: [
      { name: "Concourse D Floor Refinish", status: "On Track" },
      { name: "Restroom Fixture Upgrade — Pavilion", status: hashSeed(`${seed}-project2`) % 3 === 0 ? "Needs Attention" : "On Track" },
    ],
    notes: [buildShiftNote(shift, dayOffset, seed)],
  };
}
