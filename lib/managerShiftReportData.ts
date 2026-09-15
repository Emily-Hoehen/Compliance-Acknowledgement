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
  { key: "day", label: "Day", timeRange: "6:00 AM – 2:00 PM" },
  { key: "swing", label: "Swing", timeRange: "2:00 PM – 10:00 PM" },
  { key: "graveyard", label: "Graveyard", timeRange: "10:00 PM – 6:00 AM" },
];

export const SHIFT_LABELS: Record<ShiftKey, string> = { day: "Day", swing: "Swing", graveyard: "Graveyard" };

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
  areaCoverage: "Area Coverage",
  serviceCoverage: "Service Coverage",
  quality: "Quality",
};

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
  managers: ShiftManager[];
  sections: ShiftSections;
  completedBy: string | null;
  completedAt: string | null;
};

/** The Manager App's own signed-in user (lib/managerAppData.ts's currentManager) — also this shift's Responsible Manager, so the demo's default path is the one that can actually complete the report. */
export const CURRENT_MANAGER_ID = "william-guy";

export const INITIAL_SHIFT_REPORT: ShiftReportState = {
  managers: [
    { id: "william-guy", name: "William Guy", role: "Senior Site Manager", avatar: "/william.png", clockIn: "5:59 AM EDT", clockOut: "2:00 PM EDT", totalTime: "8h 1min", isResponsible: true },
    { id: "betty-rodriguez", name: "Betty Rodriguez", role: "Operations Manager", avatar: "/Betty.jpg", clockIn: "5:55 AM EDT", clockOut: "1:34 PM EDT", totalTime: "7h 39min", isResponsible: false },
    { id: "edga-tacuri", name: "Edga Tacuri", role: "Site Supervisor", avatar: "/Edga.png", clockIn: "5:50 AM EDT", clockOut: "1:29 PM EDT", totalTime: "7h 39min", isResponsible: false },
    { id: "carmen-ramos", name: "Carmen Ramos", role: "Site Supervisor", avatar: "/Carmen.png", clockIn: "5:59 AM EDT", clockOut: "1:40 PM EDT", totalTime: "7h 41min", isResponsible: false },
  ],
  sections: {
    shiftNotes: {
      tagVocabulary: ["4Insite Discrepancy", "Staffing", "Scheduling", "Equipment"],
      notes: [
        {
          id: "sn-1",
          managerId: "carmen-ramos",
          timestamp: "6:55 AM EDT",
          text: "Corrected a 4Insite sync discrepancy in expected services this morning and sent the update through to 4insite, so tonight's numbers should reflect the fix once it processes.",
          tags: ["4Insite Discrepancy"],
        },
      ],
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
      tagVocabulary: ["QR Unreadable", "Access Restricted", "Call Out", "Staffing Gap"],
      notes: [
        {
          id: "hh-1",
          managerId: "betty-rodriguez",
          timestamp: "9:20 AM EDT",
          text: "Two call-outs on the morning crew; pulled a Swing associate forward to cover Concourse D until the afternoon overlap.",
          tags: ["Staffing Gap", "Call Out"],
        },
      ],
    },
    areaCoverage: {
      areasServiced: 750,
      areasTotal: 765,
      percentServiced: 98,
      breakdown: { notServiced: 4, underServiced: 25, fullyServiced: 232, overServiced: 12 },
      tagVocabulary: ["Access Restricted", "Closed for Maintenance", "Flight Delay", "Deferred"],
      notes: [
        {
          id: "ac-1",
          managerId: "edga-tacuri",
          timestamp: "11:05 AM EDT",
          text: "Gate 42 restroom closed for maintenance most of the shift; deferred that service to Swing once the contractor clears out.",
          tags: ["Closed for Maintenance", "Deferred"],
        },
      ],
    },
    serviceCoverage: {
      servicesCompleted: 1395,
      servicesExpected: 1222,
      percentCompleted: 114,
      tagVocabulary: ["Over-Serviced", "Frequency Adjusted", "Access Restricted"],
      notes: [],
    },
    quality: {
      aiVerification: { score: 4.87, count: 1395, unit: "services" },
      internalAudit: { score: 4.87, count: 2, unit: "audits" },
      customerAudit: { score: 4.87, count: 1, unit: "audits" },
      reportIts: { submitted: 6, rejected: 1, acceptanceRate: 83 },
      safety: { incidents: 1, reportStatus: "Incident Report Created" },
      tagVocabulary: ["New Associate", "Training Needed", "Equipment Issue"],
      notes: [
        {
          id: "q-1",
          managerId: "william-guy",
          timestamp: "1:10 PM EDT",
          text: "Minor cut reported near Concourse D — treated on site, incident report filed, cart pulled from service pending a latch repair.",
          tags: ["Equipment Issue"],
        },
      ],
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

export function getTotalNoteCount(state: ShiftReportState): number {
  return SECTION_ORDER.reduce((sum, key) => sum + getSectionNoteCount(state, key), 0);
}

/** Short preview stat shown on the section's row in the Day Shift Report list — the one number a manager would glance at before deciding whether to open it. */
export function getSectionPreview(state: ShiftReportState, key: SectionKey): string {
  const s = state.sections;
  switch (key) {
    case "shiftNotes": {
      const count = s.shiftNotes.notes.length;
      return count === 0 ? "No notes yet" : `${count} note${count === 1 ? "" : "s"} logged`;
    }
    case "hoursHeadcount":
      return `${s.hoursHeadcount.percentCaptured}% captured · ${s.hoursHeadcount.actualArrival} of ${s.hoursHeadcount.scheduledHeadcount} arrived`;
    case "areaCoverage":
      return `${s.areaCoverage.percentServiced}% serviced · ${s.areaCoverage.areasServiced.toLocaleString()} of ${s.areaCoverage.areasTotal.toLocaleString()} areas`;
    case "serviceCoverage":
      return `${s.serviceCoverage.percentCompleted}% completed · ${s.serviceCoverage.servicesCompleted.toLocaleString()} of ${s.serviceCoverage.servicesExpected.toLocaleString()}`;
    case "quality":
      return `${s.quality.aiVerification.score.toFixed(2)} avg · ${s.quality.reportIts.submitted} Report-Its`;
  }
}

/** Live-progress subtext for the Home screen's "End of Shift Report" tile — a manager should be able to tell how far along the record is without opening it. */
export function getShiftReportProgressSubtext(state: ShiftReportState): string {
  if (state.completedBy) return `Completed by ${getManager(state, state.completedBy)?.name ?? "a manager"}`;
  const totalNotes = getTotalNoteCount(state);
  const sectionsWithNotes = SECTION_ORDER.filter((key) => getSectionNoteCount(state, key) > 0).length;
  const noteLabel = `${totalNotes} note${totalNotes === 1 ? "" : "s"}`;
  return `${noteLabel} logged · ${sectionsWithNotes} of ${SECTION_ORDER.length} sections`;
}

let noteIdCounter = 0;

/** A fresh, monotonically increasing id suffix for notes added during this session — stable across renders, unlike Math.random(), and never collides with the seeded ids above. */
export function nextNoteId(): string {
  noteIdCounter += 1;
  return `note-${Date.now()}-${noteIdCounter}`;
}
