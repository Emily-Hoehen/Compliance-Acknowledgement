/**
 * Reference content for the consolidated Scope of Work view
 * (components/patterns/SowPage.tsx + SowOverviewTab/SowFacilityTab/
 * SowPeopleTab/SowContractTab).
 *
 * Figures are carried over from the existing, disconnected SOW
 * screens this consolidation replaces (Scope of Work Details —
 * Scope/Coverage/Compliance, Visual SOW / Live coverage, Your
 * Spaces/Our Team/Service Times) so this reads as a real redesign
 * of this site's actual numbers, not invented placeholder data.
 * Where a section needed a number the source screens didn't show,
 * it's a plausible estimate for layout purposes only — flagged
 * inline below.
 */

import type { RosterPerson } from "./csv";

export const siteContractStats = {
  buildings: 7,
  areaTypes: 40,
  areas: 714,
  elements: 49,
  frequencyTypes: 10,
  routes: 125,
  expectedAnnualTasks: "303.7K",
  sowCoveragePercent: 58,
};

export const performanceStats = {
  avgAuditScore: 4.82,
  areasPassingPercent: 98,
  verifiableAreas: 712,
  verifications: { total: 31708, avgScore: 4.92 },
  complaints: { total: 0, daysSinceLast: 0 },
};

/** Today's aggregate — carried over from the "Live from LGA-LaGuardia, NY" coverage feed. */
export const facilitySummary = {
  teamMembers: 98,
  verificationsCompleted: 1638,
  verificationsExpected: 2897,
  areaTypesActive: 39,
  hoursCaptured: "416h 39m",
  hoursCapturedPercent: 82,
  paidHours: "505h 36m",
  flightsSupported: 519,
};

/** Carried over from the Service Times screenshot. */
export const peopleSummary = {
  associatesClockedIn: 138,
  managersClockedIn: 0,
  totalTimeWorked: "513h 21m",
  serviceTimeCaptured: "421h 46m",
};

export type BuildingSummary = {
  name: string;
  address: string;
  totalActions: number;
  coveragePercent: number;
};

export const buildings: BuildingSummary[] = [
  { name: "Concourse D", address: "1 Central Terminal Dr, Queens, NY 11371", totalActions: 605, coveragePercent: 53 },
  { name: "Concourse E", address: "1 Central Terminal Dr, Queens, NY 11371", totalActions: 547, coveragePercent: 61 },
  { name: "Concourse F", address: "1 Central Terminal Dr, Queens, NY 11371", totalActions: 640, coveragePercent: 58 },
  { name: "Concourse G", address: "1 Central Terminal Dr, Queens, NY 11371", totalActions: 425, coveragePercent: 55 },
  { name: "Headhouse", address: "1 Central Terminal Dr, Queens, NY 11371", totalActions: 573, coveragePercent: 62 },
  { name: "Mainline", address: "1 Central Terminal Dr, Queens, NY 11371", totalActions: 370, coveragePercent: 59 },
  { name: "Pavilion", address: "1 Central Terminal Dr, Queens, NY 11371", totalActions: 151, coveragePercent: 49 },
];

export type ContractTask = {
  label: string;
  frequency: string;
};

export type AreaType = {
  name: string;
  totalActions: number;
  servicedToday: number;
  expectedServices: number;
  percent: number;
  captured: string;
  score: number;
  tasks: ContractTask[];
};

/** Single-status read on an area type's coverage + score, for status-filtering a coverage list (All / At risk / On track / Low score) — thresholds are illustrative, chosen to spread the 5 Concourse D area types across all three statuses rather than pulled from a real SLA. */
export type AreaTypeStatus = "at-risk" | "on-track" | "low-score";

export function statusForAreaType(a: { percent: number; score: number }): AreaTypeStatus {
  if (a.score < 4.85) return "low-score";
  if (a.percent < 45) return "at-risk";
  return "on-track";
}

/**
 * Sample of Concourse D's area types (it has ~29 in the source
 * data — trimmed here to a demonstrative handful). The other six
 * buildings follow the same shape in the real product. Coverage
 * figures carry the same values as areaTypeCoverage below where the
 * two happen to name the same area type (Break Rooms, Gates); the
 * rest are plausible estimates, scaled to each one's totalActions.
 */
export const concourseDAreaTypes: AreaType[] = [
  {
    name: "Baggage Claims",
    totalActions: 14,
    servicedToday: 2,
    expectedServices: 14,
    percent: 40,
    captured: "1h 12m",
    score: 4.92,
    tasks: [
      { label: "Collect trash and debris", frequency: "2x Daily" },
      { label: "Disinfect handles, keypads, and buttons on equipment", frequency: "1x Daily" },
      { label: "Keep all surfaces free of dust, dirt, and marks", frequency: "1x Daily" },
      { label: "Substantially clean carpets, minor spots/stains only", frequency: "1x Daily" },
    ],
  },
  {
    name: "Break Rooms",
    totalActions: 48,
    servicedToday: 27,
    expectedServices: 119,
    percent: 43.69,
    captured: "8h 21m",
    score: 4.87,
    tasks: [
      { label: "Empty trash receptacles and replace liner", frequency: "3x Daily" },
      { label: "Wipe, clean, and disinfect all chairs and tables", frequency: "3x Daily" },
      { label: "Clean refrigerators and empty per posted directions", frequency: "1x Weekly" },
    ],
  },
  {
    name: "Restrooms (Passenger)",
    totalActions: 24,
    servicedToday: 15,
    expectedServices: 24,
    percent: 62.5,
    captured: "3h 40m",
    score: 4.76,
    tasks: [
      { label: "Restock paper products and soap", frequency: "8x Daily" },
      { label: "Clean and disinfect all fixtures", frequency: "6x Daily" },
      { label: "Mop and sanitize floors", frequency: "2x Daily" },
    ],
  },
  {
    name: "Gates",
    totalActions: 22,
    servicedToday: 38,
    expectedServices: 342,
    percent: 49.12,
    captured: "32h 10m",
    score: 4.93,
    tasks: [
      { label: "Collect trash and debris", frequency: "5x Daily" },
      { label: "Clean seating and tray tables", frequency: "1x Daily" },
      { label: "Spot-clean glass and signage", frequency: "1x Daily" },
    ],
  },
  {
    name: "Jet Bridges",
    totalActions: 22,
    servicedToday: 14,
    expectedServices: 22,
    percent: 63.6,
    captured: "2h 45m",
    score: 4.99,
    tasks: [
      { label: "Sweep and remove debris", frequency: "2x Daily" },
      { label: "Wipe down handrails", frequency: "1x Daily" },
    ],
  },
];

export type AreaTypeCoverage = {
  name: string;
  building: string;
  floor: string;
  servicedToday: number;
  expectedServices: number;
  percent: number;
  captured: string;
  score: number;
};

/** Carried over from the "Your Spaces" live coverage grid. Building/floor assignment is a plausible estimate — the source screenshot didn't break this grid down by building or floor. */
export const areaTypeCoverage: AreaTypeCoverage[] = [
  { name: "Curbsides", building: "Headhouse", floor: "Ground Level", servicedToday: 11, expectedServices: 55, percent: 72.72, captured: "6h 17m", score: 5 },
  { name: "Break Rooms", building: "Concourse D", floor: "Floor 2", servicedToday: 27, expectedServices: 119, percent: 43.69, captured: "8h 21m", score: 4.87 },
  { name: "Elevators (Passenger)", building: "Concourse E", floor: "Floor 1", servicedToday: 19, expectedServices: 95, percent: 45.26, captured: "5h 15m", score: 4.92 },
  { name: "Gates", building: "Concourse F", floor: "Floor 1", servicedToday: 38, expectedServices: 342, percent: 49.12, captured: "32h 10m", score: 4.93 },
  { name: "Baggage Checks", building: "Concourse D", floor: "Ground Level", servicedToday: 7, expectedServices: 35, percent: 37.14, captured: "2h 19m", score: 4.88 },
  { name: "Pet Relief Areas", building: "Concourse G", floor: "Ground Level", servicedToday: 6, expectedServices: 42, percent: 71.42, captured: "5h 11m", score: 4.81 },
  { name: "Restrooms", building: "Mainline", floor: "Floor 1", servicedToday: 43, expectedServices: 263, percent: 49.04, captured: "27h 16m", score: 4.98 },
  { name: "Conference Rooms", building: "Headhouse", floor: "Floor 2", servicedToday: 8, expectedServices: 42, percent: 26.19, captured: "46m", score: 5 },
  { name: "Fire Stairwells", building: "Concourse D", floor: "Floor 1", servicedToday: 8, expectedServices: 24, percent: 45.83, captured: "2h 8m", score: 4.9 },
  { name: "Help Desk", building: "Headhouse", floor: "Floor 1", servicedToday: 6, expectedServices: 30, percent: 50, captured: "1h 39m", score: 4.98 },
  { name: "Baggage Carousels", building: "Pavilion", floor: "Ground Level", servicedToday: 5, expectedServices: 25, percent: 44, captured: "1h 29m", score: 5 },
  { name: "Ticketing", building: "Headhouse", floor: "Floor 1", servicedToday: 3, expectedServices: 21, percent: 52.38, captured: "2h 16m", score: 4.78 },
];

export type VerificationEvent = {
  type: "Periodic" | "Spot Clean" | "Full Service" | "Quality Check";
  personName: string;
  personAvatar: string;
  position: string;
  shift: "Day" | "Night" | "Swing" | "Graveyard";
  location: string;
  score: number;
  timeAgo: string;
};

const SHIFTS: VerificationEvent["shift"][] = ["Day", "Night", "Swing", "Graveyard"];

/**
 * Individual verification events (not area-type aggregates) —
 * carried over from the Home page / Live View "Recent Activity"
 * feed. People (and their real positions) are the same associate
 * rows as clockedInAvatars (lib/homeDashboardData.ts); shift is a
 * plausible estimate cycled per event since that feed doesn't
 * record it.
 */
export const recentVerifications: VerificationEvent[] = [
  { type: "Periodic", personName: "Aaron Ryan", personAvatar: "https://cdn.4insite.com/image/64d3d91b-36e2-3cba-3b25-ef668df1dcdf_t.png", position: "CSR", shift: "Day", location: "Curbside — Family Pick Up 1", score: 5, timeAgo: "1 minute ago" },
  { type: "Spot Clean", personName: "Adam Craft", personAvatar: "https://cdn.4insite.com/assets/375f69e40ded4cb7be9baa2cc7429eb0_20241215_140710_t.jpg", position: "Custodian", shift: "Night", location: "Break Room — HH2-129", score: 5, timeAgo: "2 minutes ago" },
  { type: "Spot Clean", personName: "Alicia Langley", personAvatar: "https://cdn.4insite.com/assets/r2d40f3ab68084c50874cf1163069d0ae_Adelina2_t.jpg", position: "Custodial Supervisor", shift: "Swing", location: "Elevators (Passenger) — ELV-E1-001", score: 5, timeAgo: "2 minutes ago" },
  { type: "Full Service", personName: "Allen Burgess", personAvatar: "https://cdn.4insite.com/assets/909695ae86d84dd5917532dd3037af8c_AgustinaGarcia_DB_1_t.jpg", position: "Sr Custodial Lead", shift: "Graveyard", location: "Gate 72", score: 4.8, timeAgo: "2 minutes ago" },
  { type: "Spot Clean", personName: "Allison Black", personAvatar: "https://cdn.4insite.com/assets/98e43f08a54d44efb022f444da0a392d_Anthony_t.jpg", position: "Recycle Tech", shift: "Day", location: "Baggage Check — HH3", score: 5, timeAgo: "3 minutes ago" },
];

/** Illustrative per-area verification samples — cycles through the same real associate rows (and real positions) as recentVerifications. */
export function verificationsForArea(areaName: string): VerificationEvent[] {
  const people = [
    { name: "Ana Burnett", avatar: "https://cdn.4insite.com/assets/50391811774747b08381a4916da1d4c8_20240816_072045_t.jpg", position: "Cleanroom Tech" },
    { name: "Andre Barnett", avatar: "https://cdn.4insite.com/assets/c82f8a6dab1f409fbcc6128af4742c35_Weston_t.jpg", position: "Custodial Lead" },
    { name: "Andrea Hickman", avatar: "https://cdn.4insite.com/assets/2aaabfc1c8d34c59ad7e469c4207aad4_AMALIAMATEOS_t.jpg", position: "Custodial Lead II" },
  ];
  const types: VerificationEvent["type"][] = ["Spot Clean", "Full Service", "Periodic"];
  const seed = areaName.length;
  return people.map((person, i) => ({
    type: types[(seed + i) % types.length],
    personName: person.name,
    personAvatar: person.avatar,
    position: person.position,
    shift: SHIFTS[(seed + i) % SHIFTS.length],
    location: `${areaName} — Zone ${i + 1}`,
    score: Number((4.7 + ((seed + i) % 3) * 0.1).toFixed(2)),
    timeAgo: `${5 + i * 12} minutes ago`,
  }));
}

export type AreaVerification = VerificationEvent & { areaName: string; building: string; floor: string };

/** Every area type's verification samples, flattened into one list — backs the Facility tab's Grid view (one card per verification, not per area). */
export const allAreaVerifications: AreaVerification[] = areaTypeCoverage.flatMap((area) =>
  verificationsForArea(area.name).map((v) => ({ ...v, areaName: area.name, building: area.building, floor: area.floor }))
);

/** Distinct filter option lists, derived from the data above rather than hardcoded twice. */
export const floors = Array.from(new Set(areaTypeCoverage.map((a) => a.floor)));
export const shifts: VerificationEvent["shift"][] = ["Day", "Night", "Swing", "Graveyard"];
export const positions = Array.from(new Set(allAreaVerifications.map((v) => v.position)));
export const taskTypes: VerificationEvent["type"][] = ["Periodic", "Spot Clean", "Full Service", "Quality Check"];

/**
 * Deterministic day-by-day generators backing SowHierarchyPage's
 * date nav (Today / Yesterday / ‹ ›) — not real historical data
 * (nothing in the source screens tracked history), but a distinct,
 * consistent-looking value per node *and* per day, so stepping the
 * date actually changes what's on screen instead of just the label,
 * and stepping back to a day you already viewed reproduces the same
 * numbers rather than re-rolling them.
 */
export function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return hash;
}

/** A single day's avg-score-shaped value (4.2–5.0) for one seed. dayOffset: 0 = today, 1 = yesterday, etc. */
export function scoreForDay(seed: string, dayOffset: number): number {
  const hash = hashSeed(seed);
  const base = 4.55 + (hash % 35) / 100; // 4.55–4.90 baseline
  const dayIndex = -dayOffset;
  const wobble = Math.sin((hash + dayIndex) * 0.8) * 0.05;
  const drift = Math.sin(hash * 0.015 + dayIndex * 0.03) * 0.12;
  return Number(Math.min(5, Math.max(4.2, base + wobble + drift)).toFixed(2));
}

/** A window of `days` scoreForDay values ending at dayOffset (oldest first) — feeds the trend chart. */
export function trendSeries(seed: string, days: number, dayOffset = 0): number[] {
  return Array.from({ length: days }, (_, i) => scoreForDay(seed, dayOffset + (days - 1 - i)));
}

/** Deterministic day-to-day multiplier (0.82x–1.18x by default) for count-like metrics — servicedToday, team size, coverage %, and so on. */
export function scaleForDay(seed: string, dayOffset: number, min = 0.82, max = 1.18): number {
  const hash = hashSeed(seed);
  const dayIndex = -dayOffset;
  const wobble = Math.sin((hash + dayIndex) * 0.8); // -1..1
  return min + ((wobble + 1) / 2) * (max - min);
}

/** A plausible time-of-day (7:00 AM–6:59 PM) for a past day's verification timestamp, since "X minutes ago" only makes sense for today. */
export function timeOfDayForSeed(seed: string): string {
  const hash = hashSeed(seed);
  const totalMinutes = 7 * 60 + (hash % (12 * 60));
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/* ============================================================
 * Audits — a distinct evidence source from Verifications (formal
 * Internal/Joint/Customer inspections, carried over from the
 * "Audit Performance" pattern, vs. Verifications' routine service
 * checks). Auditors are real manager rows (same name+avatar pairs
 * used as "responded on"/"internal audit" people in
 * homeDashboardData's sitePerformance).
 * ============================================================ */

export type AuditType = "Internal" | "Joint" | "Customer";

export type AuditEvent = {
  auditType: AuditType;
  auditorName: string;
  auditorAvatar: string;
  location: string;
  score: number;
  timeAgo: string;
};

const AUDITORS = [
  { name: "Christina Delacruz", avatar: "https://cdn.4insite.com/assets/3945ad92d52340539a4c70a4e02045bc_ahmed_t.jpg" },
  { name: "Dwayne Wells", avatar: "https://cdn.4insite.com/assets/95213175388a42e2853c7f8b7c179da6_20230417_074714_t.jpg" },
];
const AUDIT_TYPES: AuditType[] = ["Internal", "Joint", "Customer"];

export const recentAudits: AuditEvent[] = [
  { auditType: "Internal", auditorName: "Christina Delacruz", auditorAvatar: AUDITORS[0].avatar, location: "Internal Audit — Concourse F", score: 5.0, timeAgo: "2 hours ago" },
  { auditType: "Joint", auditorName: "Dwayne Wells", auditorAvatar: AUDITORS[1].avatar, location: "Joint Audit — Gate 72", score: 4.6, timeAgo: "5 hours ago" },
];

/** Illustrative per-area audit samples, same shape/spirit as verificationsForArea. */
export function auditsForArea(areaName: string): AuditEvent[] {
  const seed = hashSeed(areaName);
  return AUDITORS.map((auditor, i) => ({
    auditType: AUDIT_TYPES[(seed + i) % AUDIT_TYPES.length],
    auditorName: auditor.name,
    auditorAvatar: auditor.avatar,
    location: `${areaName} — Inspection ${i + 1}`,
    score: Number((4.6 + ((seed + i) % 3) * 0.12).toFixed(2)),
    timeAgo: `${2 + i * 3} hours ago`,
  }));
}

export type AreaAudit = AuditEvent & { areaName: string; building: string; floor: string };

export const allAreaAudits: AreaAudit[] = areaTypeCoverage.flatMap((area) =>
  auditsForArea(area.name).map((a) => ({ ...a, areaName: area.name, building: area.building, floor: area.floor }))
);

/**
 * Unified shape for showing Verifications and Audits together in
 * one feed behind an All / Verifications / Audits toggle — each
 * source normalizes into this so the UI doesn't need to branch on
 * which one it's rendering.
 */
export type ActivityKind = "verification" | "audit";

export type ActivityItem = {
  kind: ActivityKind;
  tag: string;
  personName: string;
  personAvatar: string;
  location: string;
  score: number;
  timeAgo: string;
  /** Verifications only — audits don't carry a shift/position in this dataset. */
  position?: string;
  shift?: VerificationEvent["shift"];
};

export function verificationToActivity(v: VerificationEvent): ActivityItem {
  return {
    kind: "verification",
    tag: v.type,
    personName: v.personName,
    personAvatar: v.personAvatar,
    location: v.location,
    score: v.score,
    timeAgo: v.timeAgo,
    position: v.position,
    shift: v.shift,
  };
}

export function auditToActivity(a: AuditEvent): ActivityItem {
  return {
    kind: "audit",
    tag: `${a.auditType} Audit`,
    personName: a.auditorName,
    personAvatar: a.auditorAvatar,
    location: a.location,
    score: a.score,
    timeAgo: a.timeAgo,
  };
}

/** Re-scores and re-times an activity item for a given day — same idea as the per-verification day variation, generalized to work for audits too. */
export function applyDayVariationToActivity(item: ActivityItem, dayOffset: number): ActivityItem {
  return {
    ...item,
    score: scoreForDay(item.location, dayOffset),
    timeAgo: dayOffset === 0 ? item.timeAgo : timeOfDayForSeed(`${item.location}-${dayOffset}`),
  };
}

/** Same idea as applyDayVariationToActivity, but keyed by a period id string (e.g. "week", "ytd") instead of a numeric day offset — backs SowTimeFirstPage's Evidence section, where "day" isn't a meaningful unit. */
export function applyPeriodVariationToActivity(item: ActivityItem, periodId: string): ActivityItem {
  return {
    ...item,
    score: scoreForDay(`${item.location}-${periodId}`, 0),
    timeAgo: timeOfDayForSeed(`${item.location}-${periodId}-time`),
  };
}

/* ============================================================
 * Service gaps — a "what went wrong and was it fixed" log,
 * backing SowTimeFirstPage's period-scoped incident list. Not real
 * incident data (nothing in the source screens tracked this), but
 * a distinct, consistent-looking handful of rows per period —
 * revisiting the same period reproduces the same rows.
 * ============================================================ */

export type ServiceGap = {
  daysAgo: number;
  space: string;
  reason: string;
  status: "Open" | "Resolved";
};

export const SERVICE_GAP_SPACES = [
  "Baggage Claims",
  "Gate 72",
  "Concourse F",
  "Break Rooms",
  "Restrooms (Passenger)",
  "Curbsides",
  "Jet Bridges",
];

const SERVICE_GAP_REASONS = ["Short-staffed", "Access issue", "No reason logged", "Equipment down", "Weather delay"];

export function serviceGapsForPeriod(periodId: string, count: number): ServiceGap[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = hashSeed(`${periodId}-gap-${i}`);
    return {
      daysAgo: i * 2 + (seed % 2) + 1,
      space: SERVICE_GAP_SPACES[seed % SERVICE_GAP_SPACES.length],
      reason: SERVICE_GAP_REASONS[(seed + i) % SERVICE_GAP_REASONS.length],
      status: seed % 3 === 0 ? "Resolved" : "Open",
    };
  });
}

/* ============================================================
 * Team — "who was working, and what they did" for a given
 * hierarchy node and day. A friendlier read on the same idea as
 * the Our Team / Service Times screens (name, position, shift,
 * services done, score, time on site) without their dense
 * column-per-metric table — shown alongside Activity as another
 * form of evidence on SowHierarchyPage.
 * ============================================================ */

export type TeamMember = {
  name: string;
  avatar: string;
  position: string;
  shift: string;
  servicesCompleted: number;
  avgScore: number;
  timeWorked: string;
  mostRecent: string;
};

/** A plausible worked-time duration (4h00m–8h45m), deterministic per seed. */
function durationForSeed(seed: string): string {
  const hash = hashSeed(seed);
  const totalMinutes = 4 * 60 + (hash % (4 * 60 + 45));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/**
 * A deterministic, day-varying "who worked here" roster for a
 * hierarchy node — a real subset of the sample associate/manager
 * rows (not tied to an actual building assignment; the sample CSVs
 * don't carry one), rotated per seed+day so a different mix of
 * people shows up as you step through dates, each with plausible
 * per-day service stats generated the same way the rest of this
 * page's evidence varies (scoreForDay/scaleForDay).
 */
export function teamForNode(
  seedKey: string,
  roster: RosterPerson[],
  dayOffset: number,
  count = 6
): TeamMember[] {
  if (roster.length === 0) return [];
  const rotationHash = hashSeed(`${seedKey}-${dayOffset}`);
  const start = rotationHash % roster.length;
  const size = Math.min(count, roster.length);
  return Array.from({ length: size }, (_, i) => {
    const person = roster[(start + i) % roster.length];
    const personSeed = `${seedKey}-${person.name}`;
    const baseServices = 8 + (hashSeed(personSeed) % 40);
    return {
      name: person.name,
      avatar: person.avatar,
      position: person.position,
      shift: person.shift || "Day",
      servicesCompleted: Math.max(1, Math.round(baseServices * scaleForDay(personSeed, dayOffset))),
      avgScore: scoreForDay(personSeed, dayOffset),
      timeWorked: durationForSeed(`${personSeed}-${dayOffset}-time`),
      mostRecent:
        dayOffset === 0
          ? `${5 + (hashSeed(`${personSeed}-recent`) % 55)} minutes ago`
          : timeOfDayForSeed(`${personSeed}-${dayOffset}-recent`),
    };
  });
}
