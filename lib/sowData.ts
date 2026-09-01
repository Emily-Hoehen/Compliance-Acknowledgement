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
import type { ContractAreaType } from "./sowContract";
import { photoForLocation } from "./sowImages";

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
  /** Which shifts this task applies to — only set for tasks sourced from the real SOW export (lib/sowContract.ts), not the older illustrative task lists. */
  shifts?: string[];
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
 * Turns one real area type (from lib/sowContract.ts's parsed SOW
 * export) into the same AreaType shape the rest of this file already
 * generates day-varying stats against. name/tasks/totalActions are
 * real; servicedToday/percent/captured/score are illustrative —
 * deterministic per area type via hashSeed/scoreForDay, same spirit
 * as every other "today's numbers" figure in this file, just now
 * layered on top of a real task/area count instead of a guess.
 */
export function areaTypeFromContract(at: ContractAreaType): AreaType {
  const areaCount = at.areas.length;
  // Real per-day instance count — each task's own freq_count (e.g. 2
  // for "2x Daily"), not just how many distinct tasks exist, so an
  // area with several multiple-times-a-day tasks realistically shows
  // more daily activity than an area with the same task count done
  // once each. Falls back to 1 for tasks with no fixed count (e.g.
  // "As Needed").
  const dailyTaskInstances = at.tasks.reduce((sum, t) => sum + (t.freqCount ?? 1), 0);
  const totalActions = Math.max(1, areaCount * dailyTaskInstances);
  const expectedServices = totalActions;
  const seedKey = `${at.building}-${at.name}`;
  const servicedToday = Math.max(0, Math.round(expectedServices * scaleForDay(`${seedKey}-base`, 0, 0.35, 0.75)));
  const percent = expectedServices > 0 ? Math.min(100, (servicedToday / expectedServices) * 100) : 0;
  const capturedMinutes = 20 + (hashSeed(`${seedKey}-captured`) % 400);
  const captured = `${Math.floor(capturedMinutes / 60)}h ${String(capturedMinutes % 60).padStart(2, "0")}m`;
  const score = scoreForDay(`${seedKey}-score`, 0);
  return {
    name: at.name,
    totalActions,
    servicedToday,
    expectedServices,
    percent,
    captured,
    score,
    tasks: at.tasks.map((t) => ({ label: t.label, frequency: t.frequency, shifts: t.shifts })),
  };
}

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
  /** The real contract area/area-type this event is tagged against, when the caller has that context (SowHierarchyPage attaches these after calling verificationsForArea — see its withAreaTagging helper). Falls back to `location` display when absent. */
  areaDisplayName?: string;
  areaTypeName?: string;
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

/**
 * A broad sample of real associate rows (data/associates.csv) to draw
 * from — verificationsForArea rotates through this whole pool
 * (seeded per area name) rather than always the same 2-3 people, so
 * different areas across the site show different real associates
 * instead of the same few faces repeating everywhere.
 */
const ASSOCIATE_POOL = [
  { name: "Aaron Ryan", avatar: "https://cdn.4insite.com/image/64d3d91b-36e2-3cba-3b25-ef668df1dcdf_t.png", position: "CSR" },
  { name: "Adam Craft", avatar: "https://cdn.4insite.com/assets/375f69e40ded4cb7be9baa2cc7429eb0_20241215_140710_t.jpg", position: "Custodian" },
  { name: "Alicia Langley", avatar: "https://cdn.4insite.com/assets/r2d40f3ab68084c50874cf1163069d0ae_Adelina2_t.jpg", position: "Custodial Supervisor" },
  { name: "Allen Burgess", avatar: "https://cdn.4insite.com/assets/909695ae86d84dd5917532dd3037af8c_AgustinaGarcia_DB_1_t.jpg", position: "Sr Custodial Lead" },
  { name: "Allison Black", avatar: "https://cdn.4insite.com/assets/98e43f08a54d44efb022f444da0a392d_Anthony_t.jpg", position: "Recycle Tech" },
  { name: "Allison Hardin", avatar: "https://cdn.4insite.com/assets/c4a0cedc304a4ce5823e773cfd378cd2_Arnoldo_t.jpg", position: "CSR Lead" },
  { name: "Amy Sargent", avatar: "https://cdn.4insite.com/assets/6d8af4de2aaf4830b4afeeb317868995_AliciaPrimus_t.jpg", position: "CSR, Exterior" },
  { name: "Ana Burnett", avatar: "https://cdn.4insite.com/assets/50391811774747b08381a4916da1d4c8_20240816_072045_t.jpg", position: "Cleanroom Tech" },
  { name: "Andre Barnett", avatar: "https://cdn.4insite.com/assets/c82f8a6dab1f409fbcc6128af4742c35_Weston_t.jpg", position: "Custodial Lead" },
  { name: "Andrea Hickman", avatar: "https://cdn.4insite.com/assets/2aaabfc1c8d34c59ad7e469c4207aad4_AMALIAMATEOS_t.jpg", position: "Custodial Lead II" },
  { name: "Andrew Austin", avatar: "https://cdn.4insite.com/assets/r14876ff55e7c49cbb37f9ed1db6b0221_IMG_08721_t.jpg", position: "Custodial Lead, Safety" },
  { name: "Andy Raymond", avatar: "https://cdn.4insite.com/assets/b99a141d156b40799d376d5f0ca7c6cc_1000002586_t.jpg", position: "Cust Foreperson" },
  { name: "Angela Fernandez", avatar: "https://cdn.4insite.com/assets/067d5aee17754d9898db1d1f6d12d927_AlesajaCrayton_t.jpg", position: "Custodial Supervisor" },
  { name: "Annette Kidd", avatar: "https://cdn.4insite.com/assets/f4af2fa5406247e4b22ee422519139ed_ArmandoMunguiaChubb_t.jpg", position: "Customer Service Rep" },
  { name: "Anthony Salas", avatar: "https://cdn.4insite.com/assets/5f1644dcb6cb46e5bfded64ea8133307_IMG_2611_t.jpg", position: "Floor Tech" },
  { name: "Antonio Kramer", avatar: "https://cdn.4insite.com/assets/586c0dfdb23545119eefda790711d3f8_IMG_1889_t.jpg", position: "GMP Floor Tech" },
  { name: "Antonio Potts", avatar: "https://cdn.4insite.com/assets/c011422cd51a4c96b3e6e67af1a3ef34_IMG_2627_t.jpg", position: "Maintenence Tech" },
  { name: "April May", avatar: "https://cdn.4insite.com/assets/7c18e2f66942433a9cee39601f83eb7d_20230221_130515_t.jpg", position: "CSR" },
  { name: "Arnold Knapp", avatar: "https://cdn.4insite.com/assets/1604509629.9173334_BLewispicture_t.jpg", position: "Custodian" },
  { name: "Billie Zamora", avatar: "https://cdn.4insite.com/assets/r2cbbe1d30f314fdf8281ea25b50625f3_image_t.jpg", position: "Custodial Supervisor" },
  { name: "Bobbie Cohen", avatar: "https://cdn.4insite.com/assets/9ee70832ab44406b9707a4bda77482b7_CAthy_t.jpg", position: "Sr Custodial Lead" },
  { name: "Bobbie Wong", avatar: "https://cdn.4insite.com/assets/r594bbe6a515d4b3bbc5e6b8d9211898a_MicrosoftTeamsimage6_t.png", position: "Recycle Tech" },
  { name: "Bobby Davidson", avatar: "https://cdn.4insite.com/assets/465c0fd23241404e8859de5b43cdc2ce_image_t.jpg", position: "CSR Lead" },
  { name: "Bonnie Foley", avatar: "https://cdn.4insite.com/assets/6fa34aa76bd24c7f9e02f22bd04fc227_ChinhQuang2_t.jpg", position: "CSR, Exterior" },
];

/**
 * "5 minutes ago" only reads right for today's own feed — anything
 * else (Yesterday, a week, a month...) shows a real calendar date
 * instead, spread across the selected range (oldest items near the
 * start of the range, newest near dayOffset) so a month's worth of
 * rows actually look like they happened on different days.
 */
function timeAgoForIndex(i: number, count: number, dayOffset: number, periodDays: number, seed: string): string {
  const isToday = dayOffset === 0 && periodDays <= 1;
  if (isToday || count <= 1) return `${5 + i * 12} minutes ago`;
  const daysAgo =
    periodDays <= 1 ? dayOffset : dayOffset + Math.min(periodDays - 1, Math.floor(((i + 0.5) / count) * periodDays));
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const hour = 6 + (hashSeed(`${seed}-${i}-hr`) % 14); // 6am–7pm, plausible service hours
  const minute = hashSeed(`${seed}-${i}-min`) % 60;
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Illustrative per-area verification samples — associates rotated
 * (seeded per area name) out of the full ASSOCIATE_POOL. `count`
 * defaults to 3 (the original flat sample, still used by callers with
 * no date range — allAreaVerifications, the Scope view's linked-
 * evidence pool); callers scoped to a specific area/period pass a
 * real period-derived count (see evidenceVerifications in
 * SowHierarchyPage.tsx) so "This Month" actually shows a month's
 * worth of rows instead of always the same 3.
 */
export function verificationsForArea(
  areaName: string,
  count: number = 3,
  periodDays: number = 1,
  dayOffset: number = 0
): VerificationEvent[] {
  const types: VerificationEvent["type"][] = ["Spot Clean", "Full Service", "Periodic"];
  const seed = hashSeed(areaName);
  const start = seed % ASSOCIATE_POOL.length;
  return Array.from({ length: count }, (_, i) => {
    const person = ASSOCIATE_POOL[(start + i) % ASSOCIATE_POOL.length];
    return {
      type: types[(seed + i) % types.length],
      personName: person.name,
      personAvatar: person.avatar,
      position: person.position,
      shift: SHIFTS[(seed + i) % SHIFTS.length],
      location: `${areaName} — Zone ${(i % 40) + 1}`,
      score: Number((4.7 + ((seed + i) % 3) * 0.1).toFixed(2)),
      timeAgo: timeAgoForIndex(i, count, dayOffset, periodDays, areaName),
    };
  });
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

function formatHoursMinutes(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
}

/**
 * A deterministic, day-varying "hours captured vs. paid" read for a
 * hierarchy node — same generator spirit as scoreForDay/scaleForDay,
 * backing the Hours Captured metric card. `periodDays` (default 1,
 * for callers with no date-range selector) scales paidMinutes/
 * capturedMinutes so a longer selected range shows a realistically
 * larger total instead of the same one-day number — percent and the
 * day-to-day delta stay day-based, since a ratio/trend shouldn't
 * scale with period length the way a raw total should.
 */
export function hoursCapturedForNode(
  seedKey: string,
  dayOffset: number,
  periodDays: number = 1
): {
  percent: number;
  capturedLabel: string;
  paidLabel: string;
  deltaVsYesterday: number;
} {
  // Averages ~400 paid min/day (~6.7h) so that at ~75% avg capture
  // (the percent band below), a 30-day month centers on ~150h
  // captured per area, per the calibration target.
  const paidMinutesPerDay = 220 + (hashSeed(`${seedKey}-paid`) % 360);
  const paidMinutes = paidMinutesPerDay * periodDays;
  const percent = Math.min(100, Math.round(55 + scaleForDay(`${seedKey}-captured-pct`, dayOffset, 0, 40)));
  const yesterdayPercent = Math.min(100, Math.round(55 + scaleForDay(`${seedKey}-captured-pct`, dayOffset + 1, 0, 40)));
  const capturedMinutes = Math.round((paidMinutes * percent) / 100);
  return {
    percent,
    capturedLabel: formatHoursMinutes(capturedMinutes),
    paidLabel: formatHoursMinutes(paidMinutes),
    deltaVsYesterday: percent - yesterdayPercent,
  };
}

/**
 * A deterministic audit summary (score + volume) for a hierarchy
 * node, backing the Average Audit Score metric card. `periodDays`
 * (default 1) scales totalAudits/jointAudits the same way — avgScore
 * is an average, not a total, so it stays period-independent.
 */
export function auditSummaryForNode(
  seedKey: string,
  dayOffset: number,
  periodDays: number = 1
): {
  avgScore: number;
  totalAudits: number;
  jointAudits: number;
  deltaVsLastWeek: number;
} {
  const avgScore = scoreForDay(`${seedKey}-audit-score`, dayOffset);
  const lastWeekScore = scoreForDay(`${seedKey}-audit-score`, dayOffset + 7);
  const auditsPerDay = 8 + (hashSeed(`${seedKey}-audit-count`) % 60);
  const totalAudits = Math.max(1, Math.round(auditsPerDay * periodDays));
  const jointAudits = Math.max(1, Math.round(totalAudits * 0.2));
  return {
    avgScore,
    totalAudits,
    jointAudits,
    deltaVsLastWeek: Number((avgScore - lastWeekScore).toFixed(2)),
  };
}

/** Deterministic "on pace for X% by end of shift" projection layered on top of a current serviced/expected coverage percent, for the Service Coverage metric card. */
export function projectedEndOfShiftPercent(seedKey: string, currentPercent: number, dayOffset: number): number {
  const factor = 1.05 + scaleForDay(`${seedKey}-projection`, dayOffset, 0, 0.35);
  return Math.min(100, Math.round(currentPercent * factor));
}

/** A short "captured time" reading for a single card-level unit (one service instance, area, or element) — "17m 11s" style, distinct from hoursCapturedForNode's hour-scale KPI reading. Deterministic per seed and day. */
export function capturedDurationLabel(seedKey: string, dayOffset: number): string {
  const totalSeconds = 60 + Math.round(scaleForDay(`${seedKey}-duration`, dayOffset, 0, 720));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatTimeOfDay(totalMinutes: number): string {
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * A single service instance's End/Serviced/Start trio — for
 * SowHierarchyPage's "View by: Service" list table. Internally
 * consistent (Start = End − Serviced) rather than three independently
 * random strings, same generator family as capturedDurationLabel and
 * timeOfDayForSeed.
 */
export function serviceTimingForSeed(seedKey: string, dayOffset: number): { startLabel: string; endLabel: string; servicedLabel: string } {
  const durationSeconds = 60 + Math.round(scaleForDay(`${seedKey}-duration`, dayOffset, 0, 720));
  const durationMinutes = Math.round(durationSeconds / 60);
  const endTotalMinutes = 7 * 60 + (hashSeed(`${seedKey}-end`) % (12 * 60));
  const startTotalMinutes = Math.max(0, endTotalMinutes - durationMinutes);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return {
    endLabel: formatTimeOfDay(endTotalMinutes),
    startLabel: formatTimeOfDay(startTotalMinutes),
    servicedLabel: `${minutes}m ${String(seconds).padStart(2, "0")}s`,
  };
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
  /** See VerificationEvent's matching fields — same tagging convention. */
  areaDisplayName?: string;
  areaTypeName?: string;
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

/**
 * A broader sample of real manager rows (data/managers.csv) —
 * auditsForArea rotates through this whole pool (seeded per area
 * name) instead of always the same 2 auditors, so different areas
 * show different real people. AUDITORS above stays untouched since
 * recentAudits indexes into it directly.
 */
const AUDITOR_POOL = [
  { name: "Christina Delacruz", avatar: "https://cdn.4insite.com/assets/3945ad92d52340539a4c70a4e02045bc_ahmed_t.jpg" },
  { name: "Dwayne Wells", avatar: "https://cdn.4insite.com/assets/95213175388a42e2853c7f8b7c179da6_20230417_074714_t.jpg" },
  { name: "Jazmin Lin", avatar: "https://cdn.4insite.com/assets/d59260db4c624794aa21a73c958b5e09_FB_IMG_1750046846456_t.jpg" },
  { name: "Kasey Douglas", avatar: "https://cdn.4insite.com/assets/rc7c1a163596546e097a3312917128ab4_be_t.jpg" },
  { name: "Mia Moyer", avatar: "https://cdn.4insite.com/assets/r39179793193e423d898d1724715c3f26_Headshot20264_t.png" },
  { name: "Maya Valenzuela", avatar: "https://cdn.4insite.com/assets/61c4197397a9465383b2fa6fbb46e986_ProfessionalHeadshotCENTERED_t.jpg" },
  { name: "Kasey Dunn", avatar: "https://cdn.4insite.com/assets/3e80ff336dac4d83aa4060231556d5e9_cropped7432398783125274680.jpg" },
  { name: "Brendon Lee", avatar: "https://cdn.4insite.com/assets/r0a1cee2e179841c9b22f813f635edc13_portrait_t.jpg" },
  { name: "Chad Espinoza", avatar: "https://cdn.4insite.com/assets/027bad2c2a994309a2f5343d78902060_Headshort_t.jpg" },
  { name: "Yurem Richards", avatar: "https://cdn.4insite.com/assets/1598016323.0497205_CB_t.png" },
  { name: "Crystal Oneal", avatar: "https://cdn.4insite.com/assets/e5b8147192464b1d978e40c4a3ea44ac_Profilepic_t.jpg" },
  { name: "Cortez Cook", avatar: "https://cdn.4insite.com/assets/4a3cd2e66af74e67a86f8141db8a8c50_20240429_174001_t.jpg" },
];

/**
 * Illustrative per-area audit samples — auditors rotated (seeded per
 * area name) out of the full AUDITOR_POOL. `count` defaults to 2 (the
 * original flat sample); callers scoped to a specific area/period
 * pass a real period-derived count — see verificationsForArea's doc
 * comment, same convention.
 */
export function auditsForArea(
  areaName: string,
  count: number = 2,
  periodDays: number = 1,
  dayOffset: number = 0
): AuditEvent[] {
  const seed = hashSeed(areaName);
  const start = seed % AUDITOR_POOL.length;
  return Array.from({ length: count }, (_, i) => {
    const auditor = AUDITOR_POOL[(start + i) % AUDITOR_POOL.length];
    return {
      auditType: AUDIT_TYPES[(seed + i) % AUDIT_TYPES.length],
      auditorName: auditor.name,
      auditorAvatar: auditor.avatar,
      location: `${areaName} — Inspection ${(i % 40) + 1}`,
      score: Number((4.6 + ((seed + i) % 3) * 0.12).toFixed(2)),
      timeAgo: timeAgoForIndex(i, count, dayOffset, periodDays, `${areaName}-audit`),
    };
  });
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
  /** The area type's supplied verification/audit photo (public/SOWimages, lib/sowImages.ts), resolved from `location`. Undefined when no photo was supplied for that area type. */
  areaPhoto?: string;
  /** See VerificationEvent's matching fields — same tagging convention. */
  areaDisplayName?: string;
  areaTypeName?: string;
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
    areaPhoto: photoForLocation(v.location, `${v.location}|${v.personName}`),
    areaDisplayName: v.areaDisplayName,
    areaTypeName: v.areaTypeName,
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
    areaPhoto: photoForLocation(a.location, `${a.location}|${a.auditorName}`),
    areaDisplayName: a.areaDisplayName,
    areaTypeName: a.areaTypeName,
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
