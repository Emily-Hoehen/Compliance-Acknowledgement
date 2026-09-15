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
import { computeShiftAreaServices, computeShiftAreaCoverageBreakdown, type AreaServiceStatus, type AreaCoverageBreakdown } from "./mapAreaServiceData";
import { dateForDayOffset, hashSeed, pickClockTime, scaleForDay, scoreForDay } from "./sowData";
import { mapPageData, type DailyReportPerson, type DailyReportShift, type QualityScore } from "./mapPageData";
import { LGA_ASSOCIATES_BY_SHIFT } from "./lgaEmployeesData";

export type ManagerNote = {
  author: DailyReportPerson;
  timestamp: string;
  text: string;
  /** Category chips shown below the note copy — zero, one, or two of SHIFT_NOTE_TAGS ("QR Unreadable", "4Insite Discrepancy", "Staffing", "Access Restricted", "Area Closed") for shift-level notes, so a manager can scan what kind of issue each note explains without reading the full text. Not every note needs one — plenty are routine updates with nothing to categorize. */
  tags: string[];
};

/** The five tag categories shift-level notes (Shift Notes, Area Coverage, Service Coverage, Hours, Quality) rotate through — each note's own text explains the specific scenario behind whichever tag it carries. */
export const SHIFT_NOTE_TAGS = ["QR Unreadable", "4Insite Discrepancy", "Staffing", "Access Restricted", "Area Closed"] as const;

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

/** How far a safety incident has progressed through the incident-report workflow — Incident Report (initial report filed) → Investigation (EHS review) → Claims Review (if a claim was filed) → Closed (fully resolved). Drives the Full Shift Report's step tracker for each incident. */
export type SafetyIncidentStage = "Incident Report" | "Investigation" | "Claims Review" | "Closed";

export type SafetyIncident = ShiftIssue & {
  /** e.g. "First Aid", "Slip/Trip/Fall", "Property Damage" — shown as a tag next to the incident title. */
  category: string;
  stage: SafetyIncidentStage;
};

/** One roster entry for the Full Shift Report's "Associates on Shift" list — the real LGA crew (data/LGA Employees/lga_employees.csv), filtered to this shift's own `shift` column. */
export type AssociateShiftEntry = {
  name: string;
  position: string;
  avatar: string;
  /** The CSV's own scheduled arrival time for this associate — shown as a light caption, not a real clock-in/out pair (unlike managers, individual associates aren't clock-tracked in this data model). */
  time: string;
};

/** One entry in the Full Shift Report's "Report-Its" list. */
export type ReportItemEntry = {
  title: string;
  tag: string;
  /** Longer sentence for the Full Day Report's richer Report-Its list — the short `title` above is what the per-shift modal shows instead. */
  description: string;
  location: string;
  /** Who filed it — a real LGA associate from this shift's own roster (data/LGA Employees/lga_employees.csv), not a manager. */
  submittedBy: AssociateShiftEntry;
  status: "Accepted" | "Rejected";
  /** Whether this report-it flagged something proactively rather than a routine complaint — shown in the Report Its modal's own "Good Catch" column. */
  goodCatch: boolean;
  /** How many comments the report-it has picked up (manager/associate follow-up), shown in the Report Its modal's own "Comments" column. */
  commentsCount: number;
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
  /** Total time worked plus clock-in/out timestamps this shift, keyed by manager name — the total shows in the Managers section, and the clock times show in a hover tooltip over it. */
  managerClockTimes: Record<string, ManagerClockTimes>;
  totalAreas: number;
  areasMissedCount: number;
  totalAreaTypesCount: number;
  areaTypesAffected: ShiftAreaTypeVerification[];
  /** Every area type relevant to this shift, for the shift-filtered Area Types list. */
  areaTypeSummaries: ShiftAreaTypeSummary[];
  /** How many of this shift's areas were fully/under/not/over-serviced — the Full Day Report's "Area Coverage" breakdown. */
  areaCoverage: AreaCoverageBreakdown;
  /** One or two manager notes on this shift's Area Coverage — more than one shift manager can weigh in on the same section (see buildNotes). */
  areaCoverageNote: ManagerNote[];
  /** Raw services-completed/expected counts for this shift alone, for the overview's Services Completed stat (distinct from the site-wide count shown when no shift is filtered). */
  servicesCompletedCount: number;
  servicesExpectedCount: number;
  servicesPercent: number;
  servicesNote: ManagerNote[];
  hoursCapturedLabel: string;
  hoursPaidLabel: string;
  hoursPercent: number;
  hoursNote: ManagerNote[];
  /** AI Verification / Internal Audit / Joint Audit / Customer Audit for this shift alone — same shape as mapPageData's site-wide qualityScores. */
  qualityScores: QualityScore[];
  scheduledHeadcount: number;
  actualArrival: number;
  totalAbsences: number;
  /** Named-associate detail backing the "View Associates" modal on Hours and Headcount — the shift's real roster, each with their own Arrived/Call Out/No Call/No Show status. Its Arrived/Absent tally always reconciles with scheduledHeadcount/actualArrival/totalAbsences above (see buildAssociateAttendance) — the same absences, just attributed to specific named people. */
  associateAttendance: AssociateAttendanceEntry[];
  noCallNoShowCount: number;
  callOutsCount: number;
  scoresNote: ManagerNote[];
  safetyIssues: SafetyIncident[];
  /** Same as reportItems.length — the count of report-its submitted this shift. */
  totalReportIts: number;
  reportItsAccepted: number;
  reportItsRejected: number;
  reportItsAcceptanceRate: number;
  reportItsNote: ManagerNote[];
  /** Individual Report-It entries backing totalReportIts, for the Full Shift Report's own itemized list — the shift-filtered sidebar only ever shows the aggregate count + note. */
  reportItems: ReportItemEntry[];
  attendanceIssues: ShiftIssue[];
  projects: ShiftProject[];
  notes: ManagerNote[];
  /** Real LGA roster for this shift (data/LGA Employees/lga_employees.csv), for the Full Shift Report's "Associates on Shift" list. */
  associates: AssociateShiftEntry[];
  associatesNote: ManagerNote[];
};

type NoteTemplate = { text: string; tags: string[] };

const MISSED_REASONS: NoteTemplate[] = [
  { text: "Access restricted for a construction crew on site.", tags: ["Access"] },
  { text: "Associate called out; reassigned remaining coverage to adjacent areas.", tags: ["Staffing"] },
  { text: "Awaiting replacement parts before service could be completed.", tags: ["Equipment"] },
  { text: "Flight delay pushed gate access past end of shift.", tags: ["Schedule"] },
  { text: "Area occupied by an event through the scheduled service window.", tags: ["Access"] },
];

function pickMissedReason(seed: string): NoteTemplate {
  return MISSED_REASONS[hashSeed(seed) % MISSED_REASONS.length];
}

const HOURS_SHORTFALL_NOTES: NoteTemplate[] = [
  {
    text: "Two associates called out early in the shift. Coverage was split across the remaining team to keep every zone touched, which cut into total hours captured but kept service moving.",
    tags: ["Staffing"],
  },
  {
    text: "A restricted access zone delayed check in for part of the crew by close to an hour, cutting into captured hours this shift. Security cleared the area once the escort arrived.",
    tags: ["Access Restricted", "Staffing"],
  },
  {
    text: "Short staffed for the back half of the shift after a last minute call out; the supervisor covered floor duties personally to keep coverage as close to target as possible.",
    tags: ["Staffing"],
  },
];

const HOURS_ON_TARGET_NOTES: NoteTemplate[] = [
  { text: "Full crew covered the shift as scheduled with no late arrivals or call outs. No coverage gaps to report and every zone was touched on time.", tags: ["Staffing"] },
  {
    text: "Hours captured landed right at target this shift; no reassignments needed and the team moved through the floor plan without any hold ups.",
    tags: [],
  },
];

function hoursNotePool(percent: number): NoteTemplate[] {
  return percent < 100 ? HOURS_SHORTFALL_NOTES : HOURS_ON_TARGET_NOTES;
}

const AREA_COVERAGE_NOTES_CLEAN: NoteTemplate[] = [
  {
    text: "Every area hit its service goal this shift with a full crew on the floor. No shortfalls to flag, and the team had time to double back on a couple of high traffic spots.",
    tags: ["Staffing"],
  },
  {
    text: "Coverage held steady across all buildings this shift, no missed areas. Associates rotated through the harder to reach zones without falling behind on the rest of the floor plan.",
    tags: [],
  },
];
const AREA_COVERAGE_NOTES_SHORTFALL: NoteTemplate[] = [
  {
    text: "A restricted access zone kept crews out of several areas for most of the shift while an escort was arranged. Reassigning coverage for next shift so those areas get caught up first.",
    tags: ["Access Restricted"],
  },
  {
    text: "Coverage was uneven this shift; two areas were closed for scheduled maintenance and could not be serviced at all, while a few others ran ahead of target to compensate.",
    tags: ["Area Closed"],
  },
  {
    text: "Most areas hit their target this shift. The areas that fell short had QR codes that would not scan at the entry point, so service could not be logged even though the work was done.",
    tags: ["QR Unreadable"],
  },
  {
    text: "A few areas were skipped after their QR codes failed to scan at an access restricted checkpoint, so service could not be confirmed or logged until a manager badge was used to override it.",
    tags: ["QR Unreadable", "Access Restricted"],
  },
];

function areaCoverageNotePool(notServicedCount: number): NoteTemplate[] {
  return notServicedCount === 0 ? AREA_COVERAGE_NOTES_CLEAN : AREA_COVERAGE_NOTES_SHORTFALL;
}

const SERVICE_COVERAGE_NOTES_OVER: NoteTemplate[] = [
  {
    text: "We exceeded expected services, but coverage was uneven. Some areas were serviced more frequently than required while others just hit their number. Adjusting frequencies and assignments for next shift.",
    tags: ["Staffing"],
  },
  {
    text: "Services ran ahead of target this shift after the team finished the core floor plan early. Redistributing the extra passes more evenly across the site next time instead of over-servicing the same areas.",
    tags: [],
  },
];
const SERVICE_COVERAGE_NOTES_SHORT: NoteTemplate[] = [
  {
    text: "A 4Insite sync issue caused several completed services to log late, understating today's count on the dashboard. Corrected data has since been sent to 4Insite and should reconcile by the next refresh.",
    tags: ["4Insite Discrepancy"],
  },
  {
    text: "Fell short of expected services in a few high traffic areas after an unplanned equipment swap slowed the team down. Reallocating staff to catch up on those areas first thing next shift.",
    tags: ["Staffing"],
  },
];
const SERVICE_COVERAGE_NOTES_ON_TARGET: NoteTemplate[] = [
  {
    text: "Services landed right on target this shift with a clean run through the whole floor plan. No reassignment needed heading into the next one.",
    tags: [],
  },
];

function serviceCoverageNotePool(percent: number): NoteTemplate[] {
  return percent > 100 ? SERVICE_COVERAGE_NOTES_OVER : percent < 100 ? SERVICE_COVERAGE_NOTES_SHORT : SERVICE_COVERAGE_NOTES_ON_TARGET;
}

const SCORE_NOTES: NoteTemplate[] = [
  {
    text: "Verification scores dipped slightly after two new associates started this week and are still learning the checklist. Pairing them with senior staff for the next few shifts until they're fully ramped up.",
    tags: ["Staffing"],
  },
  {
    text: "Strong shift for scores across the board. Response time on flagged items has improved noticeably across the team since the last coaching session.",
    tags: [],
  },
  {
    text: "Customer audit score reflects one soft surface complaint in the lounge that came in mid shift; a corrective walkthrough with the associate is scheduled for tomorrow to review the standard.",
    tags: ["Staffing"],
  },
  {
    text: "Scores holding steady across all three audit types this shift. No new corrective actions needed, and the team is on pace with last week's averages.",
    tags: [],
  },
];


const REPORT_ITS_NOTES_ZERO: NoteTemplate[] = [
  { text: "No report-its this shift. A quiet one overall, with the team spending the extra time getting ahead on a few lower priority areas.", tags: [] },
  {
    text: "Nothing to log this shift; the team flagged a couple of small issues verbally and handled them on the spot before they became report-its.",
    tags: ["Staffing"],
  },
];
const REPORT_ITS_NOTES_SOME: NoteTemplate[] = [
  {
    text: "Most report-its traced back to an area closed for maintenance mid-shift, which associates kept flagging out of habit; logged for day shift follow-up once the area reopens.",
    tags: ["Area Closed"],
  },
  {
    text: "One report-it flagged a QR code that would not scan at the elevator landing, blocking service confirmation there; forwarded to building engineering for a replacement sticker.",
    tags: ["QR Unreadable"],
  },
  {
    text: "No report-its escalated to safety or security this shift; routine maintenance items only, all logged and assigned to the right team.",
    tags: [],
  },
];

function reportItsNotePool(count: number): NoteTemplate[] {
  return count === 0 ? REPORT_ITS_NOTES_ZERO : REPORT_ITS_NOTES_SOME;
}

const ASSOCIATE_NOTES: NoteTemplate[] = [
  { text: "Full crew showed up on time and ready to go. No coverage gaps to manage today, which made assigning the harder areas a lot easier.", tags: ["Staffing"] },
  {
    text: "One late arrival this shift, covered by shifting a floater into their zone until they clocked in about forty minutes later. No areas were left unattended in the meantime.",
    tags: ["Staffing"],
  },
  {
    text: "Crew handled the load well despite running a person short for the back half of the shift after an early call out. Everyone picked up a little extra without falling behind.",
    tags: ["Staffing"],
  },
  {
    text: "Team is settling in well overall; two associates are still in their first two weeks and picking things up fast, especially on the checklist steps that trip most new hires up.",
    tags: [],
  },
];


/**
 * The real LGA crew (data/LGA Employees/lga_employees.csv, via lib/lgaEmployeesData.ts),
 * one entry per shift's own roster — this is now the site's actual named associates, not
 * a hand-picked associates.csv sample. `time` isn't in the source CSV (individual associates
 * aren't clock-tracked in this data model), so it's a deterministic per-person clock time in
 * the same spirit as this file's other generators, seeded on the associate's own name.
 */
const ASSOCIATES_BY_SHIFT: Record<DailyReportShift["key"], AssociateShiftEntry[]> = {
  day: LGA_ASSOCIATES_BY_SHIFT.day.map((a) => ({ ...a, time: pickClockTime(`lga-associate-time-${a.name}`) })),
  swing: LGA_ASSOCIATES_BY_SHIFT.swing.map((a) => ({ ...a, time: pickClockTime(`lga-associate-time-${a.name}`) })),
  graveyard: LGA_ASSOCIATES_BY_SHIFT.graveyard.map((a) => ({ ...a, time: pickClockTime(`lga-associate-time-${a.name}`) })),
};

/** Category + starting workflow stage for a generated safety incident — a handful of realistic templates, each already assigned a stage so the Full Shift Report's step tracker has something other than "just filed" to show. */
const SAFETY_INCIDENT_POOL: SafetyIncident[] = [
  {
    title: "Wet floor sign missing",
    detail: "Reported near Baggage Claim; replacement sign placed within the hour.",
    category: "Slip/Trip/Fall",
    stage: "Closed",
  },
  {
    title: "Associate minor cut — Concourse D",
    detail: "Associate caught a finger on a broken cart latch; treated with first aid on site, cart pulled from service.",
    category: "First Aid",
    stage: "Investigation",
  },
  {
    title: "Loose handrail reported",
    detail: "Handrail near Gate 42 flagged as loose during a walkthrough; maintenance ticket opened, area cordoned off.",
    category: "Property Damage",
    stage: "Incident Report",
  },
  {
    title: "Associate slipped on spill — Food Court",
    detail: "Associate slipped on an unmarked spill; evaluated on site, no lost time, claim opened as a precaution.",
    category: "Slip/Trip/Fall",
    stage: "Claims Review",
  },
];

/** ~1-in-5 shifts report a safety incident — deterministic per shift/day, picking both whether one occurred and which template, so the same shift/day always reproduces the same incident. */
function buildSafetyIncidents(shift: DailyReportShift, dayOffset: number): SafetyIncident[] {
  const seed = shift.key;
  const roll = hashSeed(`${seed}-safety-${dayOffset}`) % 5;
  if (roll !== 0) return [];
  return [SAFETY_INCIDENT_POOL[hashSeed(`${seed}-safety-pick-${dayOffset}`) % SAFETY_INCIDENT_POOL.length]];
}

const REPORT_ITEM_POOL: { title: string; tag: string; description: string }[] = [
  {
    title: "Flickering light — Concourse D",
    tag: "Facilities",
    description: "Overhead light is flickering intermittently and needs a ballast replacement.",
  },
  {
    title: "Elevator delay — Gate 72",
    tag: "Facilities",
    description: "Elevator response time is running 3-4 minutes behind normal during peak hours.",
  },
  {
    title: "Recurring odor complaint — Restroom B12",
    tag: "Facilities",
    description: "Passengers have flagged a persistent odor near the east bank of stalls.",
  },
  {
    title: "Torn carpet edge — Baggage Claim",
    tag: "Facilities",
    description: "Carpet edge is lifting near carousel 4 and poses a trip hazard.",
  },
  {
    title: "Overflowing recycling bin — Food Court",
    tag: "Facilities",
    description: "Recycling bin near the food court entrance is overflowing during the lunch rush.",
  },
];

/**
 * Individual Report-It entries backing the aggregate `totalReportIts` count — rotates through REPORT_ITEM_POOL
 * starting from a deterministic offset so the same day/shift always lists the same items, each attributed to a
 * real associate from this shift's own roster (not a manager) and a real area from this shift's own service
 * breakdown (so the location string points at somewhere that actually exists in the SOW data). Roughly 1 in 6
 * report-its is rejected — everything else is accepted — so "Rejected" isn't purely theoretical but stays rare.
 */
function buildReportItems(shift: DailyReportShift, dayOffset: number, count: number, areaServices: AreaServiceStatus[]): ReportItemEntry[] {
  if (count === 0) return [];
  const roster = ASSOCIATES_BY_SHIFT[shift.key];
  const startIndex = hashSeed(`${shift.key}-report-items-start-${dayOffset}`) % REPORT_ITEM_POOL.length;
  return Array.from({ length: count }, (_, i) => {
    const template = REPORT_ITEM_POOL[(startIndex + i) % REPORT_ITEM_POOL.length];
    const seed = `${shift.key}-report-item-${dayOffset}-${i}`;
    const submittedBy = roster[hashSeed(`${seed}-associate`) % roster.length];
    const area = areaServices.length > 0 ? areaServices[hashSeed(`${seed}-area`) % areaServices.length] : null;
    const location = area ? `${mapPageData.siteName} • ${area.areaTypeName} • ${area.displayName}` : mapPageData.siteName;
    const status: ReportItemEntry["status"] = hashSeed(`${seed}-status`) % 6 === 0 ? "Rejected" : "Accepted";
    const goodCatch = hashSeed(`${seed}-good-catch`) % 4 !== 0; // ~3 in 4 report-its are a genuine good catch
    const commentsCount = hashSeed(`${seed}-comments`) % 3; // 0-2 follow-up comments
    return { ...template, submittedBy, location, status, goodCatch, commentsCount };
  });
}

/** Picks one of the shift's own co-managers to attribute a note to, varying by seed so notes don't all come from the same person. `exclude` (an author name) keeps a second note in the same section from being credited to whoever already wrote the first one. */
function pickManager(shift: DailyReportShift, seed: string, exclude?: string): DailyReportPerson {
  const managers = exclude ? shift.managers.filter((m) => m.name !== exclude) : shift.managers;
  const pool = managers.length > 0 ? managers : shift.managers;
  if (pool.length === 0) return { name: "Shift Manager", position: "Manager", avatar: "" };
  return pool[hashSeed(seed) % pool.length];
}

function buildNote(shift: DailyReportShift, seed: string, template: NoteTemplate): ManagerNote {
  return { author: pickManager(shift, seed), timestamp: pickClockTime(`${seed}-time`), text: template.text, tags: template.tags };
}

/**
 * Same section-level note as buildNote, but drawn from a whole template
 * pool rather than one resolved template, so a second co-manager can
 * sometimes weigh in on the same section — e.g. one manager flags a
 * shortfall and another adds a different angle on it, matching how a real
 * shift report can carry more than one manager's comment on the same
 * topic. Only ever adds that second note when the shift actually has more
 * than one manager (nobody to credit it to otherwise) and the pool has
 * more than one template to draw a genuinely different one from — and
 * it's always a different author than the first note, never the same
 * person doubling up.
 */
function buildNotes(shift: DailyReportShift, seed: string, pool: NoteTemplate[]): ManagerNote[] {
  if (pool.length === 0) return [];
  const firstIndex = hashSeed(seed) % pool.length;
  const primary: ManagerNote = { author: pickManager(shift, seed), timestamp: pickClockTime(`${seed}-time`), text: pool[firstIndex].text, tags: pool[firstIndex].tags };
  const wantsSecond = shift.managers.length > 1 && pool.length > 1 && hashSeed(`${seed}-second`) % 100 < 40;
  if (!wantsSecond) return [primary];
  let secondIndex = hashSeed(`${seed}-second-index`) % (pool.length - 1);
  if (secondIndex >= firstIndex) secondIndex += 1;
  const secondary: ManagerNote = {
    author: pickManager(shift, `${seed}-second-author`, primary.author.name),
    timestamp: pickClockTime(`${seed}-second-time`),
    text: pool[secondIndex].text,
    tags: pool[secondIndex].tags,
  };
  return [primary, secondary];
}

export type ManagerClockTimes = {
  /** "8h 12min"-style total time worked this shift. */
  totalTimeLabel: string;
  /** "6:04 AM EDT"-style clock-in, shown in a hover tooltip over the total time. */
  clockIn: string;
  /** "2:11 PM EDT"-style clock-out, shown in the same tooltip. */
  clockOut: string;
};

/** "6:00 AM" (from a "6:00 AM – 2:00 PM"-style timeRange) → minutes since midnight. */
function parseClockTimeToMinutes(time: string): number {
  const match = time.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  const hour12 = parseInt(match[1], 10) % 12;
  const minute = parseInt(match[2], 10);
  const isPm = match[3].toUpperCase() === "PM";
  return (isPm ? hour12 + 12 : hour12) * 60 + minute;
}

/** Minutes since midnight (may run past 1440 for an overnight shift like Graveyard) → "6:04 AM EDT"-style clock time. */
function formatClockTime(totalMinutesOfDay: number): string {
  const normalized = ((totalMinutesOfDay % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period} EDT`;
}

/** Total time worked plus clock-in/out timestamps, per co-manager, for the overview's Managers section — deterministic per shift/day/manager, centered on the shift's own start time with a little natural variance (a few minutes early or late clocking in) and a full ~8h shift length. */
function buildManagerClockTimes(shift: DailyReportShift, dayOffset: number): Record<string, ManagerClockTimes> {
  const shiftStartMinutes = parseClockTimeToMinutes(shift.timeRange.split(/[–-]/)[0]);
  const result: Record<string, ManagerClockTimes> = {};
  shift.managers.forEach((manager) => {
    const totalMinutes = 450 + (Math.abs(hashSeed(`${shift.key}-${manager.name}-total-time-${dayOffset}`)) % 60); // 7h30m–8h29m
    const clockInOffset = (Math.abs(hashSeed(`${shift.key}-${manager.name}-clockin-${dayOffset}`)) % 31) - 10; // 10 min early to 20 min late
    const clockInMinutes = shiftStartMinutes + clockInOffset;
    result[manager.name] = {
      totalTimeLabel: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`,
      clockIn: formatClockTime(clockInMinutes),
      clockOut: formatClockTime(clockInMinutes + totalMinutes),
    };
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
/** "9/10/26" — a short calendar date for a note's own follow-up-by line, in the same numeric style the Day shift's handoff note has always used. */
function shortDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

/** A follow-up date `daysAhead` after whatever date this report is actually showing (via dateForDayOffset), so the Day shift's handoff note always reads as "a couple days from now" relative to the report, not a fixed date that drifts into the past once you navigate away from it. */
function followUpDate(dayOffset: number, daysAhead: number): string {
  const date = dateForDayOffset(dayOffset);
  date.setDate(date.getDate() + daysAhead);
  return shortDate(date);
}

function buildShiftNote(shift: DailyReportShift, dayOffset: number, seed: string): ManagerNote {
  if (shift.key === "day") {
    const carmen = shift.managers.find((m) => m.name === "Carmen Ramos") ?? shift.managers[0];
    return {
      author: carmen,
      timestamp: "6:55 AM EDT",
      text: [
        "Corrected a 4Insite sync discrepancy in expected services this morning and sent the update through to 4insite, so tonight's numbers should reflect the fix once it processes.",
        `Reviewed the floor schedule with the team; an updated version covering the new gate assignments will be posted by ${followUpDate(dayOffset, 2)}.`,
        `Staffing alignment for the two new associates who started this week will be completed by ${followUpDate(dayOffset, 2)}, pairing them with senior floor leads in the meantime.`,
        `Still waiting on building engineering for the recurring elevator ticket near Gate 72; expecting an update by ${followUpDate(dayOffset, 3)}.`,
      ].join("\n"),
      tags: ["4Insite Discrepancy", "Staffing"],
    };
  }
  return buildNote(shift, `${seed}-note-${dayOffset}`, {
    text: `Handed off clean. Team stayed on top of ${shift.label.toLowerCase()} coverage despite the day's call-outs, and there's nothing outstanding for the next shift to pick up.`,
    tags: ["Staffing"],
  });
}

function formatShiftHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

/** Shift-scoped Hours Captured stat — the shift's own total paid hours (summed across its scheduled associates) and how much was captured, landing around 350h captured of ~380h paid. Distinct from lib/sowData.ts's hoursCapturedForNode, which is scaled for a single area/node's audit hours, not a whole shift's headcount-wide total. */
function buildShiftHoursStat(shift: DailyReportShift, dayOffset: number): { capturedLabel: string; paidLabel: string; percent: number } {
  const seed = shift.key;
  const paidHours = scaleForDay(`${seed}-hours-stat-paid`, dayOffset, 375, 390);
  const percent = Math.round(scaleForDay(`${seed}-hours-stat-percent`, dayOffset, 90, 94));
  const capturedHours = (paidHours * percent) / 100;
  return { capturedLabel: formatShiftHours(capturedHours), paidLabel: formatShiftHours(paidHours), percent };
}

/** Scheduled headcount / actual arrival / absence breakdown for one shift — scheduledHeadcount is the real named-roster size for this shift (ASSOCIATES_BY_SHIFT, the LGA crew), so it moves in lockstep with the roster instead of a made-up number. Absences are still a deterministic per-day roll, in the same ~1-in-5 shifts have a couple of absences spirit as the rest of this file's issue rolls, scaled to this shift's own headcount rather than a flat 4-8. */
function buildShiftAttendance(shift: DailyReportShift, dayOffset: number) {
  const seed = shift.key;
  const scheduledHeadcount = ASSOCIATES_BY_SHIFT[shift.key].length;
  const callOutsCount = Math.round(scaleForDay(`${seed}-absences`, dayOffset, scheduledHeadcount * 0.05, scheduledHeadcount * 0.12));
  const noCallNoShowCount = 0;
  const totalAbsences = callOutsCount + noCallNoShowCount;
  return { scheduledHeadcount, actualArrival: scheduledHeadcount - totalAbsences, totalAbsences, noCallNoShowCount, callOutsCount };
}

/** One named associate's attendance status for the "View Associates" roster detail. Exactly `attendance.totalAbsences` of the shift's roster are marked absent (the lowest-ranked names by a deterministic per-person/per-day seed, so who's absent still varies day to day), `attendance.noCallNoShowCount` of those as No Call/No Show and the rest as Call Out — so this roster's own Arrived/Absent tally always reconciles with buildShiftAttendance's scheduledHeadcount/actualArrival/totalAbsences figures (see AssociateAttendanceEntry) instead of drifting from an independent roll. */
export type AssociateAttendanceEntry = AssociateShiftEntry & {
  status: "Arrived" | "Call Out" | "No Call/No Show";
};

function buildAssociateAttendance(
  shift: DailyReportShift,
  dayOffset: number,
  attendance: { totalAbsences: number; noCallNoShowCount: number }
): AssociateAttendanceEntry[] {
  const roster = ASSOCIATES_BY_SHIFT[shift.key];
  const ranked = roster
    .map((associate, index) => ({ index, rank: hashSeed(`${shift.key}-${associate.name}-attendance-${dayOffset}`) }))
    .sort((a, b) => a.rank - b.rank);
  const absentIndexes = new Set(ranked.slice(0, attendance.totalAbsences).map((r) => r.index));
  const noCallNoShowIndexes = new Set(ranked.slice(0, attendance.noCallNoShowCount).map((r) => r.index));
  return roster.map((associate, index) => {
    if (!absentIndexes.has(index)) return { ...associate, status: "Arrived" };
    return { ...associate, status: noCallNoShowIndexes.has(index) ? "No Call/No Show" : "Call Out" };
  });
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
  const servicesCompletedCount = areaServices.reduce((sum, a) => sum + a.servicesCompleted, 0);
  const servicesExpectedCount = areaServices.reduce((sum, a) => sum + a.servicesExpected, 0);
  const servicesPercent = servicesExpectedCount > 0 ? Math.round((servicesCompletedCount / servicesExpectedCount) * 100) : 0;
  const areaCoverage = computeShiftAreaCoverageBreakdown(buildings, shift.label, dayOffset);

  const hours = buildShiftHoursStat(shift, dayOffset);
  const totalReportIts = hashSeed(`${seed}-report-its-${dayOffset}`) % 4;
  const reportItems = buildReportItems(shift, dayOffset, totalReportIts, areaServices);
  const reportItsAccepted = reportItems.filter((item) => item.status === "Accepted").length;
  const reportItsRejected = reportItems.length - reportItsAccepted;
  const reportItsAcceptanceRate = reportItems.length > 0 ? Math.round((reportItsAccepted / reportItems.length) * 100) : 0;

  const safetyIssues = buildSafetyIncidents(shift, dayOffset);

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
    managerClockTimes: buildManagerClockTimes(shift, dayOffset),
    totalAreas,
    areasMissedCount,
    totalAreaTypesCount: byAreaType.size,
    areaTypesAffected,
    areaTypeSummaries,
    areaCoverage,
    areaCoverageNote: buildNotes(shift, `${seed}-area-coverage-note-${dayOffset}`, areaCoverageNotePool(areaCoverage.notServicedCount)),
    servicesCompletedCount,
    servicesExpectedCount,
    servicesPercent,
    servicesNote: buildNotes(shift, `${seed}-services-note-${dayOffset}`, serviceCoverageNotePool(servicesPercent)),
    hoursCapturedLabel: hours.capturedLabel,
    hoursPaidLabel: hours.paidLabel,
    hoursPercent: hours.percent,
    hoursNote: buildNotes(shift, `${seed}-hours-note-${dayOffset}`, hoursNotePool(hours.percent)),
    qualityScores: buildShiftQualityScores(shift, dayOffset),
    scheduledHeadcount: attendance.scheduledHeadcount,
    actualArrival: attendance.actualArrival,
    totalAbsences: attendance.totalAbsences,
    noCallNoShowCount: attendance.noCallNoShowCount,
    callOutsCount: attendance.callOutsCount,
    associateAttendance: buildAssociateAttendance(shift, dayOffset, attendance),
    scoresNote: buildNotes(shift, `${seed}-scores-note-${dayOffset}`, SCORE_NOTES),
    safetyIssues,
    totalReportIts,
    reportItsAccepted,
    reportItsRejected,
    reportItsAcceptanceRate,
    reportItsNote: buildNotes(shift, `${seed}-report-its-note-${dayOffset}`, reportItsNotePool(totalReportIts)),
    reportItems,
    attendanceIssues,
    projects: [
      { name: "Concourse D Floor Refinish", status: "On Track" },
      { name: "Restroom Fixture Upgrade — Pavilion", status: hashSeed(`${seed}-project2`) % 3 === 0 ? "Needs Attention" : "On Track" },
    ],
    notes: [buildShiftNote(shift, dayOffset, seed)],
    associates: ASSOCIATES_BY_SHIFT[shift.key],
    associatesNote: buildNotes(shift, `${seed}-associates-note-${dayOffset}`, ASSOCIATE_NOTES),
  };
}
