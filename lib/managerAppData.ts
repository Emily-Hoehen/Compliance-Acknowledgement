/**
 * Static content for the Manager App mobile home screen, ported
 * from Figma "Dashboard" (fileKey gtME8Hrbr497WEZi1U2HeZ, node
 * 4:1289). Copy and figures are the design's own authored content,
 * kept as-is for fidelity — only the avatar photos are swapped for
 * real rows, and the signed-in manager/headcount now match the LGA
 * roster used elsewhere in this project (lib/lgaEmployeesData.ts).
 */

import { LGA_ASSOCIATES_BY_SHIFT } from "./lgaEmployeesData";

/** Same lead Day-shift manager as the Map feature's Daily Report (lib/mapPageData.ts's shiftManagers.day[0]), so this is the same William Guy with the same avatar across both surfaces. */
export const currentManager = {
  name: "William Guy",
  position: "Senior Site Manager",
  avatar: "/william.png",
};

export const calendarStrip = [
  { label: "Sun", date: 5 },
  { label: "Mon", date: 6 },
  { label: "Tue", date: 7 },
  { label: "Wed", date: 8 },
  { label: "Thu", date: 9 },
  { label: "Fri", date: 10, isToday: true },
  { label: "Sat", date: 11 },
];

/** No names shown in the design, so any real roster rows work — the LGA Day shift crew (lib/lgaEmployeesData.ts), matching the associatesClockedIn.total below (LGA's own Day-shift headcount). */
export const clockedInStack = LGA_ASSOCIATES_BY_SHIFT.day.slice(0, 5);

export const managerAppHome = {
  incompleteVerifications: { count: 2 },
  associatesClockedIn: { total: LGA_ASSOCIATES_BY_SHIFT.day.length },
  kpis: [
    { label: "Requests", value: 8, sublabel: "Open", icon: "comments" as const, wash: "var(--color-kpi-requests)", color: "var(--color-text-dt-blue)" },
    { label: "Complaints", value: 2, sublabel: "Open", icon: "message-exclamation" as const, wash: "var(--color-kpi-complaints)", color: "var(--color-datavis-purple-100)" },
    { label: "To-Dos", value: 1, sublabel: "Open", icon: "list-check" as const, wash: "var(--color-kpi-todos)", color: "var(--color-datavis-sky-blue-100)" },
    { label: "Report-Its", value: 3, sublabel: "Pending", icon: "triangle-exclamation" as const, wash: "var(--color-kpi-reportits)", color: "var(--color-datavis-orange-100)" },
  ],
  serviceValidation: { verificationsToday: 15, remaining: 400 },
  incompleteRoutes: { count: 0 },
  negativeAttestation: { count: 0 },
  messages: { unread: 176 },
  employeeScorecards: { note: "The Scorecards need to be finalized" },
  hoursApprovalDue: { hours: 22, minutes: 24, seconds: 33 },
};
