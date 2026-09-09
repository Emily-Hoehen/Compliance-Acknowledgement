/**
 * Static content for the Manager App mobile home screen, ported
 * from Figma "Dashboard" (fileKey gtME8Hrbr497WEZi1U2HeZ, node
 * 4:1289). Copy and figures are the design's own authored content,
 * kept as-is for fidelity — only the avatar photos are swapped for
 * real rows from data/managers.csv and data/associates.csv per
 * this project's sample-data rule.
 */

import { clockedInAvatars } from "./homeDashboardData";

export const currentManager = {
  name: "Bruce Charles",
  position: "Site Mgr",
  avatar: "https://cdn.4insite.com/assets/r638204abf8a74c6588ae0706550a87bc_Wittekind_Kim_WHT_t.jpg",
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

/** Same clocked-in avatar stack as the desktop dashboard — no names shown in the design, so any real roster rows work. */
export const clockedInStack = clockedInAvatars.slice(0, 5);

export const managerAppHome = {
  incompleteVerifications: { count: 2 },
  associatesClockedIn: { total: 12 },
  kpis: [
    { label: "Requests", value: 8, sublabel: "Open", icon: "comments" as const, wash: "var(--wash-primary-15)", color: "var(--color-text-dt-blue)" },
    { label: "Complaints", value: 2, sublabel: "Open", icon: "message-exclamation" as const, wash: "var(--wash-purple-15)", color: "var(--color-datavis-purple-100)" },
    { label: "To-Dos", value: 1, sublabel: "Open", icon: "list-check" as const, wash: "var(--wash-sky-blue-15)", color: "var(--color-datavis-sky-blue-100)" },
    { label: "Report-Its", value: 3, sublabel: "Pending", icon: "triangle-exclamation" as const, wash: "var(--wash-orange-15)", color: "var(--color-datavis-orange-100)" },
  ],
  serviceValidation: { verificationsToday: 15, remaining: 400 },
  incompleteRoutes: { count: 0 },
  negativeAttestation: { count: 0 },
  messages: { unread: 176 },
  employeeScorecards: { note: "The Scorecards need to be finalized" },
  hoursApprovalDue: { hours: 22, minutes: 24, seconds: 33 },
};
