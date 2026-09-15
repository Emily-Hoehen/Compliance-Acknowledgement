/**
 * Data model for the Manager App's Shift Report input flow — the
 * data-entry surface feeding the Map feature's Daily Report ("Day
 * Shift" accordion, lib/mapShiftReportData.ts). This is deliberately
 * its own static, in-memory record rather than a live read from that
 * feature's dynamic per-day generators: the section numbers below are
 * the fixed sample figures this flow was speced against, so this
 * prototype and the Daily Report visibly describe the same kind of
 * record without literally sharing state. Wiring this flow's
 * completed record into the Daily Report's own data (so completing a
 * shift here is what the map's Day Shift accordion renders) is a TODO
 * for a real backend — see ShiftReportState's completedBy/completedAt.
 *
 * The manager roster (names/roles/clock times) matches the Day shift
 * managers already shown on the Map feature (lib/mapPageData.ts's
 * shiftManagers.day and lib/mapShiftReportData.ts's
 * buildManagerClockTimes output), so the two prototypes agree on who
 * was actually on shift.
 */

/** Same Day/Swing/Graveyard key vocabulary as the Map feature's own shifts (lib/mapPageData.ts's DailyReportShift["key"]), so a manager clocking in here and the Daily Report's shift cards are talking about the same three shifts. */
export type ShiftKey = "day" | "swing" | "graveyard";

export const SHIFT_OPTIONS: { key: ShiftKey; label: string; timeRange: string }[] = [
  { key: "day", label: "Day", timeRange: "6:00AM EST - 2:00PM EST" },
  { key: "swing", label: "Swing", timeRange: "2:00PM EST - 10:00PM EST" },
  { key: "graveyard", label: "Graveyard", timeRange: "10:00PM EST - 6:00AM EST" },
];

export const SHIFT_LABELS: Record<ShiftKey, string> = { day: "Day", swing: "Swing", graveyard: "Graveyard" };

/** A representative check-in time for the current manager's own clockIn once they pick a shift on the Home screen's check-in sheet — the seed data's "5:59 AM EDT" is Day-shift-specific (see the file header comment), so Swing/Graveyard need their own stand-in start time instead of keeping that stale Day-shift value. */
export const SHIFT_START_LABEL: Record<ShiftKey, string> = { day: "5:59 AM EDT", swing: "2:00 PM EDT", graveyard: "10:00 PM EDT" };

/** Which shift a manager checking in right now is most likely clocking into — Day 6:00-13:59, Swing 14:00-21:59, Graveyard the rest (22:00-5:59), matching the Map feature's own shift windows (lib/mapPageData.ts's buildDailyReport shiftDefs). Still just a default: the check-in sheet lets the manager pick a different one. */
export function getDefaultShiftForTime(date: Date = new Date()): ShiftKey {
  const hour = date.getHours();
  if (hour >= 6 && hour < 14) return "day";
  if (hour >= 14 && hour < 22) return "swing";
  return "graveyard";
}

export type SectionKey = "shiftNotes" | "hoursHeadcount" | "areaCoverage" | "serviceCoverage" | "quality";

export const SECTION_ORDER: SectionKey[] = ["shiftNotes", "hoursHeadcount", "areaCoverage", "serviceCoverage", "quality"];

export const SECTION_TITLES: Record<SectionKey, string> = {
  shiftNotes: "Shift Notes",
  hoursHeadcount: "Hours and Headcount",
  areaCoverage: "Areas Serviced",
  serviceCoverage: "Services Completed",
  quality: "Quality",
};

/** Same tag vocabulary for every section's note composer — one shared list rather than a distinct set per section. */
export const SHIFT_NOTE_TAGS: string[] = ["4Insite Discrepancy", "Staffing", "Equipment", "QR Unreadable", "Area Closed"];

/** Same per-section accent as ManagerAppShiftReportList's own icon bubbles (SECTION_ICON) — reused here for each note's left border so a note visually ties back to its section. */
export const SECTION_ACCENT_COLOR: Record<SectionKey, string> = {
  shiftNotes: "var(--color-datavis-pinkle-100)",
  hoursHeadcount: "var(--color-text-dt-warning)",
  areaCoverage: "var(--color-text-dt-blue)",
  serviceCoverage: "var(--color-datavis-purple-100)",
  quality: "var(--color-success-100)",
};

/** Exact tag → color matches from the Daily Report's own note tags (FullDayReportModalV2's .noteV2Tag), so shared tags read identically across both features. */
const DAILY_REPORT_TAG_COLORS: Record<string, { wash: string; color: string }> = {
  "qr unreadable": { wash: "var(--wash-orange-15)", color: "var(--color-datavis-orange-100)" },
  "4insite discrepancy": { wash: "var(--wash-pinkle-15)", color: "var(--color-datavis-pinkle-100)" },
  staffing: { wash: "var(--wash-sky-blue-15)", color: "var(--color-datavis-sky-blue-100)" },
  "access restricted": { wash: "var(--wash-purple-15)", color: "var(--color-datavis-purple-100)" },
};

/** Fallback palette for shift-report tags outside the Daily Report's own vocabulary (e.g. "Call Out", "New Associate") — picked deterministically per tag so the same tag always gets the same color. */
const TAG_COLOR_FALLBACK: { wash: string; color: string }[] = [
  { wash: "var(--wash-red-orange-15)", color: "var(--color-datavis-red-orange-100)" },
  { wash: "var(--wash-bubblegum-15)", color: "var(--color-datavis-bubblegum-100)" },
  { wash: "var(--wash-teal-15)", color: "var(--color-datavis-teal-500)" },
  { wash: "var(--wash-warning-light-15)", color: "var(--color-text-dt-warning)" },
  { wash: "var(--wash-success-light-15)", color: "var(--color-success-100)" },
];

function hashTag(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) % 997;
  return hash;
}

/** Tag chip color for a shift-report note tag, matching the Daily Report's palette for shared tag names and falling back to a deterministic pick from the same design-token family otherwise. */
export function getTagColor(tag: string): { wash: string; color: string } {
  const exact = DAILY_REPORT_TAG_COLORS[tag.trim().toLowerCase()];
  if (exact) return exact;
  return TAG_COLOR_FALLBACK[hashTag(tag) % TAG_COLOR_FALLBACK.length];
}

export type ShiftNote = {
  id: string;
  managerId: string;
  timestamp: string;
  text: string;
  tags: string[];
};

export type ShiftManager = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  clockIn: string;
  clockOut: string;
  totalTime: string;
  isResponsible: boolean;
};

type SectionBase = {
  notes: ShiftNote[];
  tagVocabulary: string[];
};

export type ShiftNotesSection = SectionBase;

export type HoursHeadcountSection = SectionBase & {
  hoursCaptured: string;
  totalTime: string;
  percentCaptured: number;
  scheduledHeadcount: number;
  actualArrival: number;
  totalAbsences: number;
  noCallNoShow: number;
  callOuts: number;
};

export type AreaCoverageSection = SectionBase & {
  areasServiced: number;
  areasTotal: number;
  percentServiced: number;
  breakdown: { notServiced: number; underServiced: number; fullyServiced: number; overServiced: number };
};

export type ServiceCoverageSection = SectionBase & {
  servicesCompleted: number;
  servicesExpected: number;
  percentCompleted: number;
};

export type QualitySection = SectionBase & {
  aiVerification: { score: number; count: number; unit: string };
  internalAudit: { score: number; count: number; unit: string };
  customerAudit: { score: number; count: number; unit: string };
  reportIts: { submitted: number; rejected: number; acceptanceRate: number };
  safety: { incidents: number; reportStatus: string };
};

export type ShiftSections = {
  shiftNotes: ShiftNotesSection;
  hoursHeadcount: HoursHeadcountSection;
  areaCoverage: AreaCoverageSection;
  serviceCoverage: ServiceCoverageSection;
  quality: QualitySection;
};

export type ShiftReportState = {
  /** Which shift this report is for — set from the Home screen's own check-in shift picker, so the report's heading/hours-remaining math (getShiftReportHeading, getShiftMinutesRemaining, getShiftEndTimeLabel) always matches whatever the manager actually clocked into. */
  shiftKey: ShiftKey;
  managers: ShiftManager[];
  sections: ShiftSections;
  completedBy: string | null;
  completedAt: string | null;
};

/** The Manager App's own signed-in user (lib/managerAppData.ts's currentManager) — also this shift's Responsible Manager, so the demo's default path is the one that can actually complete the report. */
export const CURRENT_MANAGER_ID = "william-guy";

export const INITIAL_SHIFT_REPORT: ShiftReportState = {
  shiftKey: "day",
  managers: [
    { id: "william-guy", name: "William Guy", role: "Senior Site Manager", avatar: "/william.png", clockIn: "5:59 AM EDT", clockOut: "2:00 PM EDT", totalTime: "8h 1min", isResponsible: true },
    { id: "betty-rodriguez", name: "Betty Rodriguez", role: "Operations Manager", avatar: "/Betty.jpg", clockIn: "5:55 AM EDT", clockOut: "1:34 PM EDT", totalTime: "7h 39min", isResponsible: false },
    { id: "edga-tacuri", name: "Edga Tacuri", role: "Site Supervisor", avatar: "/Edga.png", clockIn: "5:50 AM EDT", clockOut: "1:29 PM EDT", totalTime: "7h 39min", isResponsible: false },
    { id: "carmen-ramos", name: "Carmen Ramos", role: "Site Supervisor", avatar: "/Carmen.png", clockIn: "5:59 AM EDT", clockOut: "1:40 PM EDT", totalTime: "7h 41min", isResponsible: false },
  ],
  sections: {
    shiftNotes: {
      tagVocabulary: SHIFT_NOTE_TAGS,
      notes: [],
    },
    hoursHeadcount: {
      hoursCaptured: "330h 10m",
      totalTime: "353h 59m",
      percentCaptured: 93,
      scheduledHeadcount: 50,
      actualArrival: 44,
      totalAbsences: 6,
      noCallNoShow: 0,
      callOuts: 6,
      tagVocabulary: SHIFT_NOTE_TAGS,
      notes: [],
    },
    areaCoverage: {
      areasServiced: 750,
      areasTotal: 765,
      percentServiced: 98,
      breakdown: { notServiced: 4, underServiced: 25, fullyServiced: 232, overServiced: 12 },
      tagVocabulary: SHIFT_NOTE_TAGS,
      notes: [],
    },
    serviceCoverage: {
      servicesCompleted: 1395,
      servicesExpected: 1222,
      percentCompleted: 114,
      tagVocabulary: SHIFT_NOTE_TAGS,
      notes: [],
    },
    quality: {
      aiVerification: { score: 4.87, count: 1395, unit: "services" },
      internalAudit: { score: 4.87, count: 2, unit: "audits" },
      customerAudit: { score: 4.87, count: 1, unit: "audits" },
      reportIts: { submitted: 6, rejected: 1, acceptanceRate: 83 },
      safety: { incidents: 1, reportStatus: "Incident Report Created" },
      tagVocabulary: SHIFT_NOTE_TAGS,
      notes: [],
    },
  },
  completedBy: null,
  completedAt: null,
};

export function getManager(state: ShiftReportState, managerId: string): ShiftManager | undefined {
  return state.managers.find((m) => m.id === managerId);
}

export function getResponsibleManager(state: ShiftReportState): ShiftManager | undefined {
  return state.managers.find((m) => m.isResponsible);
}

export function getSectionNoteCount(state: ShiftReportState, key: SectionKey): number {
  return state.sections[key].notes.length;
}

/** Whether every section has at least one note — the gate on Complete Report, alongside being the Responsible Manager. Each section's row-level check (see ManagerAppShiftReportList) turns green the same way, one section at a time. */
export function allSectionsHaveNotes(state: ShiftReportState): boolean {
  return SECTION_ORDER.every((key) => getSectionNoteCount(state, key) > 0);
}

/** Short preview stat shown on the section's row in the Day Shift Report list — the one line a manager would glance at before deciding whether to open it. Matches Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 134:26579's exact phrasing per section. */
export function getSectionPreview(state: ShiftReportState, key: SectionKey): string {
  const s = state.sections;
  switch (key) {
    case "shiftNotes": {
      const count = s.shiftNotes.notes.length;
      return `${count} note${count === 1 ? "" : "s"} added`;
    }
    case "hoursHeadcount":
      return `${s.hoursHeadcount.percentCaptured}% of ${s.hoursHeadcount.totalTime} paid`;
    case "areaCoverage":
      return `${s.areaCoverage.percentServiced}% of ${s.areaCoverage.areasTotal.toLocaleString()} total areas serviced`;
    case "serviceCoverage":
      return `${s.serviceCoverage.percentCompleted}% expected services complete`;
    case "quality":
      return `${s.quality.aiVerification.score.toFixed(2)} avg verification score`;
  }
}

/** "Day Shift - Tuesday, Sep 10th" — the Shift Report list's own heading, using whichever shift the manager actually clocked into (ShiftReportState.shiftKey), dated off the real current day so the prototype doesn't go stale. */
export function getShiftReportHeading(shiftKey: ShiftKey, date: Date = new Date()): string {
  const weekday = date.toLocaleDateString([], { weekday: "long" });
  const month = date.toLocaleDateString([], { month: "short" });
  const day = date.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${SHIFT_LABELS[shiftKey]} Shift - ${weekday}, ${month} ${day}${suffix}`;
}

/** Tight "5:59AM" style formatting (no space, no leading zero already assumed) for the list heading's meta row — reformats a manager's own "5:59 AM EDT" clock string down to just the time. */
export function formatTightClockTime(clockTime: string): string {
  return clockTime.replace(/\s*(AM|PM)\b.*$/i, "$1").replace(/\s+/g, "");
}

/** Each shift's scheduled end hour, matching the same Day 6-14 / Swing 14-22 / Graveyard 22-6 windows getDefaultShiftForTime uses. Shared by getShiftMinutesRemaining and getShiftEndTimeLabel so they stay in sync. */
const SHIFT_END_HOUR: Record<ShiftKey, number> = { day: 14, swing: 22, graveyard: 6 };

function shiftEndDate(shiftKey: ShiftKey, date: Date): Date {
  const end = new Date(date);
  end.setHours(SHIFT_END_HOUR[shiftKey], 0, 0, 0);
  // Graveyard crosses midnight (22:00-05:59) — an afternoon/evening "now" means the shift just started tonight and ends tomorrow morning, not today.
  if (shiftKey === "graveyard" && date.getHours() >= 12) end.setDate(end.getDate() + 1);
  return end;
}

/** Minutes remaining until this shift's scheduled end, clamped to 0. Purely a live "time left" flourish on the list heading; the shift's actual data doesn't depend on it. */
export function getShiftMinutesRemaining(shiftKey: ShiftKey, date: Date = new Date()): number {
  const diffMinutes = Math.round((shiftEndDate(shiftKey, date).getTime() - date.getTime()) / 60000);
  return Math.max(0, diffMinutes);
}

/** "45min" under an hour, "6hr 8min" at or past one — the list heading's own countdown reads as a wall-clock duration once it's more than a few minutes. */
export function formatMinutesRemaining(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}hr ${minutes}min`;
}

/** Tight "2:00PM" style label for the shift's scheduled end — shown in the list heading's meta row once the shift has actually ended, in place of "to Current". */
export function getShiftEndTimeLabel(shiftKey: ShiftKey, date: Date = new Date()): string {
  return formatTightClockTime(shiftEndDate(shiftKey, date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
}

/** Live-progress subtext for the Home screen's "End of Shift Report" tile — a manager should be able to tell how far along the record is without opening it. */
export function getShiftReportProgressSubtext(state: ShiftReportState): string {
  if (state.completedBy) return `Completed by ${getManager(state, state.completedBy)?.name ?? "a manager"}`;
  const sectionsWithNotes = SECTION_ORDER.filter((key) => getSectionNoteCount(state, key) > 0).length;
  return `${SHIFT_LABELS[state.shiftKey]} Shift - ${sectionsWithNotes} section${sectionsWithNotes === 1 ? "" : "s"} acknowledged`;
}

/** "5:59 AM EDT" -> 359 (minutes since midnight) — for comparing a manager's own clock-out time against the current moment, not for display. */
function parseClockTimeMinutes(clockTime: string): number {
  const match = clockTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function formatDurationMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, totalMinutes);
  return `${Math.floor(clamped / 60)}h ${clamped % 60}min`;
}

/** Whether this manager is still on shift right now — the current moment hasn't reached their own clock-out time yet. Each manager clocks out at their own time (lib/mapShiftReportData.ts's real per-manager clock times), so this can differ manager to manager, not just shift to shift. */
export function isManagerCheckedIn(manager: ShiftManager, date: Date = new Date()): boolean {
  return minutesSinceMidnight(date) < parseClockTimeMinutes(manager.clockOut);
}

/** The Shift Managers detail page's own per-manager time row — "Shift Time" with a live elapsed duration while still checked in, or "Total Shift Time" with the manager's own fixed total once checked out. */
export function getManagerShiftTimeInfo(
  manager: ShiftManager,
  date: Date = new Date()
): { checkedIn: boolean; rangeLabel: string; durationLabel: string; sectionLabel: string } {
  const checkedIn = isManagerCheckedIn(manager, date);
  if (checkedIn) {
    const elapsed = minutesSinceMidnight(date) - parseClockTimeMinutes(manager.clockIn);
    return { checkedIn, rangeLabel: `${manager.clockIn} – Current`, durationLabel: formatDurationMinutes(elapsed), sectionLabel: "Shift Time" };
  }
  return { checkedIn, rangeLabel: `${manager.clockIn} – ${manager.clockOut}`, durationLabel: manager.totalTime, sectionLabel: "Total Shift Time" };
}

let noteIdCounter = 0;

/** A fresh, monotonically increasing id suffix for notes added during this session — stable across renders, unlike Math.random(), and never collides with the seeded ids above. */
export function nextNoteId(): string {
  noteIdCounter += 1;
  return `note-${Date.now()}-${noteIdCounter}`;
}
