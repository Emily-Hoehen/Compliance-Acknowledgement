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

/** One roster entry for the Full Shift Report's "Associates on Shift" list — real rows from data/associates.csv (Delta - LaGuardia, NY site), filtered to this shift's own `Shift` column. */
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
  /** Who filed it — a real associate from this shift's own roster (data/associates.csv), not a manager. */
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
  /** Named-associate detail backing the "View Associates" modal on Hours and Headcount — a real, individually-tracked sample of who's on shift, each with their own Arrived/Call Out/No Call/No Show status. Its own counts don't reconcile to scheduledHeadcount/totalAbsences above (see buildAssociateAttendance) — those describe the whole site-wide crew, this is just the roster this project has real names for. */
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
  /** Real roster for this shift (data/associates.csv), for the Full Shift Report's "Associates on Shift" list. */
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
 * Real associate rows from data/associates.csv, filtered to the "Delta - LaGuardia, NY" `Main` site and each
 * shift's own `Shift` column (Day/Swing/Graveyard) — same real-sample-data convention as lib/sowData.ts's
 * ASSOCIATE_POOL, just scoped per shift instead of pooled site-wide. `time` is that CSV row's own scheduled
 * time, shown as a light caption (individual associates aren't clock-tracked the way managers are here).
 */
const ASSOCIATES_BY_SHIFT: Record<DailyReportShift["key"], AssociateShiftEntry[]> = {
  day: [
    { name: "Allison Black", position: "Recycle Tech", avatar: "https://cdn.4insite.com/assets/98e43f08a54d44efb022f444da0a392d_Anthony_t.jpg", time: "7:50 AM" },
    { name: "Antonio Potts", position: "Maintenence Tech", avatar: "https://cdn.4insite.com/assets/c011422cd51a4c96b3e6e67af1a3ef34_IMG_2627_t.jpg", time: "10:30 AM" },
    { name: "Brett Knowles", position: "Cust Foreperson", avatar: "https://cdn.4insite.com/assets/b0c36261e68d4e3fb8cd26414edd0af2_IMG_20221104_58325_t.jpg", time: "12:50 PM" },
    { name: "Claude Hall", position: "CSR, Exterior", avatar: "https://cdn.4insite.com/assets/1614178054.708322_AndreaPerrett_t.jpg", time: "9:05 PM" },
    { name: "Darren Dickson", position: "Custodian", avatar: "https://cdn.4insite.com/image/c4eca239-09b2-b0e5-fead-226214e743c0_t.png", time: "6:40 PM" },
    { name: "Edward Marshall", position: "Customer Service Rep", avatar: "https://cdn.4insite.com/image/845bcb1a-47ce-a7a8-f040-22aa690c1c7e_t.png", time: "8:25 PM" },
    { name: "Glen Larsen", position: "Custodial Lead", avatar: "https://cdn.4insite.com/assets/2aaabfc1c8d34c59ad7e469c4207aad4_AMALIAMATEOS_t.jpg", time: "7:40 AM" },
    { name: "Jacob Whitney", position: "Sr Custodial Lead", avatar: "https://cdn.4insite.com/assets/r594bbe6a515d4b3bbc5e6b8d9211898a_MicrosoftTeamsimage6_t.png", time: "1:55 PM" },
    { name: "Josephine McCarthy", position: "GMP Floor Tech", avatar: "https://cdn.4insite.com/image/48e0c0be-23ad-8b1b-abf9-ad8143e5c597_t.png", time: "7:15 PM" },
    { name: "Kent Chang", position: "Custodial Lead, Safety", avatar: "https://cdn.4insite.com/image/71e06da2-0baf-5fde-7763-c0abd59347e6_t.png", time: "2:30 PM" },
    { name: "Marcus Frost", position: "CSR Lead", avatar: "https://cdn.4insite.com/image/72e0ab8c-59c4-ad0c-1675-e02b0a26b5be_t.png", time: "7:20 PM" },
    { name: "Melvin Moran", position: "CSR", avatar: "https://cdn.4insite.com/assets/r2d40f3ab68084c50874cf1163069d0ae_Adelina2_t.jpg", time: "2:15 PM" },
    { name: "Nicholas Delacruz", position: "Custodial Supervisor", avatar: "https://cdn.4insite.com/assets/5f1644dcb6cb46e5bfded64ea8133307_IMG_2611_t.jpg", time: "6:15 AM" },
    { name: "Rebecca Jacobson", position: "Cleanroom Tech", avatar: "https://cdn.4insite.com/assets/6089d1e951924c5ebc8f1724c05899d8_EarleneWoodson_t.jpg", time: "12:40 PM" },
    { name: "Samuel Leblanc", position: "Custodial Supervisor", avatar: "https://cdn.4insite.com/image/b5b7a212-2846-4b11-fd95-50c0642d2563_t.png", time: "1:45 PM" },
    { name: "Timothy Collier", position: "Floor Tech", avatar: "https://cdn.4insite.com/assets/7f90fd3d4d474a6483c1eccafe02219d_20221202_094143_t.jpg", time: "5:15 PM" },
    { name: "Willard Good", position: "Custodial Lead II", avatar: "https://cdn.4insite.com/image/3eef672f-3a70-5deb-a1a2-1bba22094b80_t.png", time: "8:30 AM" },
  ],
  swing: [
    { name: "Andrew Austin", position: "Custodial Lead, Safety", avatar: "https://cdn.4insite.com/assets/r14876ff55e7c49cbb37f9ed1db6b0221_IMG_08721_t.jpg", time: "4:25 PM" },
    { name: "Bobby Davidson", position: "CSR Lead", avatar: "https://cdn.4insite.com/assets/465c0fd23241404e8859de5b43cdc2ce_image_t.jpg", time: "6:30 AM" },
    { name: "Cheryl Moses", position: "CSR", avatar: "https://cdn.4insite.com/assets/c49499a125c44bfd92aa5a21e982fe57_20221202_094054_t.jpg", time: "10:15 PM" },
    { name: "Connie Hernandez", position: "Custodial Supervisor", avatar: "https://cdn.4insite.com/image/a148ebfa-65da-2799-1072-9acfae6753e6_t.png", time: "8:45 AM" },
    { name: "Donald Rodriguez", position: "Cleanroom Tech", avatar: "https://cdn.4insite.com/image/69561eb4-5acb-44ce-3402-320f2adfea88_t.png", time: "11:40 AM" },
    { name: "Eva Sharp", position: "Custodial Supervisor", avatar: "https://cdn.4insite.com/assets/909695ae86d84dd5917532dd3037af8c_AgustinaGarcia_DB_1_t.jpg", time: "10:10 AM" },
    { name: "Henry Ballard", position: "Floor Tech", avatar: "https://cdn.4insite.com/assets/586c0dfdb23545119eefda790711d3f8_IMG_1889_t.jpg", time: "7:55 AM" },
    { name: "Jessica Dunn", position: "Custodial Lead II", avatar: "https://cdn.4insite.com/image/b0392430-487e-69f1-1c81-25005fa16c95_t.png", time: "11:05 AM" },
    { name: "Julian Booth", position: "Recycle Tech", avatar: "https://cdn.4insite.com/image/f8e5ed6b-be8f-135c-b5e9-23e71de4062d_t.png", time: "9:55 AM" },
    { name: "Lois Shelton", position: "Maintenence Tech", avatar: "https://cdn.4insite.com/assets/4149e7a1c9884b5790d0816c59232625_PDCpics011_t.jpg", time: "1:15 PM" },
    { name: "Marsha Burgess", position: "Cust Foreperson", avatar: "https://cdn.4insite.com/assets/1579645815.2171333_EdithBuruca_t.jpg", time: "9:35 AM" },
    { name: "Naomi Fuentes", position: "CSR, Exterior", avatar: "https://cdn.4insite.com/assets/c82f8a6dab1f409fbcc6128af4742c35_Weston_t.jpg", time: "7:45 PM" },
    { name: "Ramon Conner", position: "Custodian", avatar: "https://cdn.4insite.com/assets/9ee70832ab44406b9707a4bda77482b7_CAthy_t.jpg", time: "10:25 AM" },
    { name: "Rosemary Flores", position: "Customer Service Rep", avatar: "https://cdn.4insite.com/assets/1600109314.2572758_ScreenShot20200914at11.48_t.18AM", time: "11:10 AM" },
    { name: "Stacy Alvarez", position: "Custodial Lead", avatar: "https://cdn.4insite.com/assets/f3d4c5f052e3418d91a87e630d46d25f_2_t.jpg", time: "9:15 PM" },
    { name: "Viola Huff", position: "Sr Custodial Lead", avatar: "https://cdn.4insite.com/image/cd7aac60-6f50-5751-3ec9-48b7926cab7e_t.png", time: "5:10 PM" },
  ],
  graveyard: [
    { name: "Ana Burnett", position: "Cleanroom Tech", avatar: "https://cdn.4insite.com/assets/50391811774747b08381a4916da1d4c8_20240816_072045_t.jpg", time: "8:20 PM" },
    { name: "Billie Zamora", position: "Custodial Supervisor", avatar: "https://cdn.4insite.com/assets/r2cbbe1d30f314fdf8281ea25b50625f3_image_t.jpg", time: "2:45 PM" },
    { name: "Bruce Mullen", position: "Floor Tech", avatar: "https://cdn.4insite.com/assets/56aac24b0c5e4f29813e537865eeca0b_IMG_20210922_160106009_t.jpg", time: "9:15 AM" },
    { name: "Clyde Hardin", position: "Custodial Lead II", avatar: "https://cdn.4insite.com/assets/503bbc9547a8497cb44bd0cf8cd21841_IMG_20221104_45991_t.jpg", time: "2:55 PM" },
    { name: "Debra Dunlap", position: "Recycle Tech", avatar: "https://cdn.4insite.com/image/7f6b89e0-04e5-907e-8d03-4c044712fc6e_t.png", time: "3:40 PM" },
    { name: "Emma Skinner", position: "Maintenence Tech", avatar: "https://cdn.4insite.com/image/64d3d91b-36e2-3cba-3b25-ef668df1dcdf_t.png", time: "11:30 AM" },
    { name: "Gordon Crawford", position: "Cust Foreperson", avatar: "https://cdn.4insite.com/assets/067d5aee17754d9898db1d1f6d12d927_AlesajaCrayton_t.jpg", time: "8:10 AM" },
    { name: "Jeffery Hardy", position: "CSR, Exterior", avatar: "https://cdn.4insite.com/assets/ecc3eb7cd1d24059baae90108bbd6513_Resized_R_2_t.jpg", time: "6:55 PM" },
    { name: "Judith Cabrera", position: "Custodian", avatar: "https://cdn.4insite.com/assets/1594678941.8834553_seraheadshot_t.jpg", time: "12:25 PM" },
    { name: "Kristina Oliver", position: "Customer Service Rep", avatar: "https://cdn.4insite.com/assets/1577776047.9164042_yes2_t.jpg", time: "9:30 AM" },
    { name: "Marilyn Wolf", position: "Custodial Lead", avatar: "https://cdn.4insite.com/image/e2841eff-3ff3-a6f7-998d-9c894965fbde_t.png", time: "2:40 PM" },
    { name: "Misty Summers", position: "Sr Custodial Lead", avatar: "https://cdn.4insite.com/assets/c4a0cedc304a4ce5823e773cfd378cd2_Arnoldo_t.jpg", time: "11:55 AM" },
    { name: "Norman Rutledge", position: "GMP Floor Tech", avatar: "https://cdn.4insite.com/assets/7c18e2f66942433a9cee39601f83eb7d_20230221_130515_t.jpg", time: "6:00 PM" },
    { name: "Roberta Warren", position: "Custodial Lead, Safety", avatar: "https://cdn.4insite.com/image/20046cbc-7544-e32a-e889-cd0947769de0_t.png", time: "7:05 AM" },
    { name: "Shirley Bender", position: "CSR Lead", avatar: "https://cdn.4insite.com/assets/e30999eb4957434692210811489f7f94_ChristyR_t.jpg", time: "8:25 AM" },
    { name: "Veronica Dejesus", position: "CSR", avatar: "https://cdn.4insite.com/assets/ceaa86784444447f97140fd773a7b7e6_IMG_5952_t.jpg", time: "6:15 PM" },
  ],
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

/** Scheduled headcount / actual arrival / absence breakdown for one shift — deterministic per shift/day, in the same ~1-in-5 shifts have a couple of absences spirit as the rest of this file's issue rolls. This is a site-wide headcount figure (includes support roles beyond the individually-named roster below), not a 1:1 count of ASSOCIATES_BY_SHIFT — real per-shift rosters only run ~16-17 people, well short of a realistic ~50-person crew. */
function buildShiftAttendance(shift: DailyReportShift, dayOffset: number) {
  const seed = shift.key;
  const scheduledHeadcount = Math.round(scaleForDay(`${seed}-scheduled-headcount`, dayOffset, 46, 54));
  const callOutsCount = Math.round(scaleForDay(`${seed}-absences`, dayOffset, 4, 8));
  const noCallNoShowCount = 0;
  const totalAbsences = callOutsCount + noCallNoShowCount;
  return { scheduledHeadcount, actualArrival: scheduledHeadcount - totalAbsences, totalAbsences, noCallNoShowCount, callOutsCount };
}

/** One named associate's attendance status for the "View Associates" roster detail — Arrived unless a deterministic roll flags them absent (~1 in 7), in which case it's almost always a Call Out, rarely a No Call/No Show. A separate, independent roll from buildShiftAttendance's own scheduledHeadcount/totalAbsences figures (see AssociateAttendanceEntry), since the named roster here is a sample of real associates.csv rows, not the same headcount the site-wide numbers represent. */
export type AssociateAttendanceEntry = AssociateShiftEntry & {
  status: "Arrived" | "Call Out" | "No Call/No Show";
};

function buildAssociateAttendance(shift: DailyReportShift, dayOffset: number): AssociateAttendanceEntry[] {
  return ASSOCIATES_BY_SHIFT[shift.key].map((associate) => {
    const seed = `${shift.key}-${associate.name}-attendance-${dayOffset}`;
    const isAbsent = hashSeed(seed) % 100 < 14;
    if (!isAbsent) return { ...associate, status: "Arrived" };
    const isNoCallNoShow = hashSeed(`${seed}-type`) % 100 < 15;
    return { ...associate, status: isNoCallNoShow ? "No Call/No Show" : "Call Out" };
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
    associateAttendance: buildAssociateAttendance(shift, dayOffset),
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
