/**
 * Static content for the homepage dashboard, ported from Figma
 * "Single Site / Front Page" (fileKey iu8cX5Ew8b1vh1LUC3NLwz, node
 * 10719:694). Copy and figures are the design's own authored
 * content, kept as-is for fidelity. People shown in avatar slots
 * are swapped for real rows from data/associates.csv and
 * data/managers.csv per this project's sample-data rule — the
 * design's placeholder names (e.g. "Egda Tacuri", "Fanni
 * Montenegro") aren't in that dataset, so each slot below maps to
 * a real associate/manager whose role matches the design's intent.
 */

export type DashboardPerson = {
  name: string;
  position: string;
  avatar: string;
};

export const siteInfo = {
  siteName: "LGA-LaGuardia, NY",
  client: "Delta",
  logo: "/deltalogo.png",
  heroImages: [
    "/homepage/hero-1.png",
    "/homepage/hero-2.png",
    "/homepage/hero-3.png",
    "/homepage/hero-4.png",
    "/homepage/hero-5.png",
    "/homepage/hero-6.png",
  ],
};

/** Olivia, 4Insite's AI assistant — see components/patterns/OliviaFab.tsx. */
export const oliviaAvatar = "/homepage/olivia-avatar-2.png";

/** Decorative "Clocked In" avatar stack — no names shown in the design, so any real roster rows work. */
export const clockedInAvatars: DashboardPerson[] = [
  { name: "Aaron Ryan", position: "CSR", avatar: "https://cdn.4insite.com/image/64d3d91b-36e2-3cba-3b25-ef668df1dcdf_t.png" },
  { name: "Adam Craft", position: "Custodian", avatar: "https://cdn.4insite.com/assets/375f69e40ded4cb7be9baa2cc7429eb0_20241215_140710_t.jpg" },
  { name: "Alicia Langley", position: "Custodial Supervisor", avatar: "https://cdn.4insite.com/assets/r2d40f3ab68084c50874cf1163069d0ae_Adelina2_t.jpg" },
  { name: "Allen Burgess", position: "Sr Custodial Lead", avatar: "https://cdn.4insite.com/assets/909695ae86d84dd5917532dd3037af8c_AgustinaGarcia_DB_1_t.jpg" },
  { name: "Allison Black", position: "Recycle Tech", avatar: "https://cdn.4insite.com/assets/98e43f08a54d44efb022f444da0a392d_Anthony_t.jpg" },
  { name: "Allison Hardin", position: "CSR Lead", avatar: "https://cdn.4insite.com/assets/c4a0cedc304a4ce5823e773cfd378cd2_Arnoldo_t.jpg" },
  { name: "Ana Burnett", position: "Cleanroom Tech", avatar: "https://cdn.4insite.com/assets/50391811774747b08381a4916da1d4c8_20240816_072045_t.jpg" },
  { name: "Andre Barnett", position: "Custodial Lead", avatar: "https://cdn.4insite.com/assets/c82f8a6dab1f409fbcc6128af4742c35_Weston_t.jpg" },
  { name: "Andrea Hickman", position: "Custodial Lead II", avatar: "https://cdn.4insite.com/assets/2aaabfc1c8d34c59ad7e469c4207aad4_AMALIAMATEOS_t.jpg" },
  { name: "Andy Raymond", position: "Cust Foreperson", avatar: "https://cdn.4insite.com/assets/b99a141d156b40799d376d5f0ca7c6cc_1000002586_t.jpg" },
];

export const peopleManagement = {
  clockedIn: { count: 49, total: 1561 },
  hoursWorked: {
    total: "1,013",
    avgPerDay: "1,076",
    months: ["May", "Apr", "Mar", "Feb", "Jan", "Dec"],
    series: [58, 44, 47, 40, 35, 46],
  },
  turnover: {
    percent: 10,
    separations: 29,
    newHires: 17,
    months: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    separationsSeries: [39, 76, 39, 39, 4, 39],
    newHiresSeries: [62, 76, 39, 8, 45, 29],
  },
};

const francisco: DashboardPerson = {
  name: "Francisco Navarro",
  position: "CSR Lead",
  avatar: "https://cdn.4insite.com/assets/6d8af4de2aaf4830b4afeeb317868995_AliciaPrimus_t.jpg",
};

const dwayne: DashboardPerson = {
  name: "Dwayne Wells",
  position: "Site Mgr",
  avatar: "https://cdn.4insite.com/assets/95213175388a42e2853c7f8b7c179da6_20230417_074714_t.jpg",
};

const adamCraft: DashboardPerson = {
  name: "Adam Craft",
  position: "Custodian",
  avatar: "https://cdn.4insite.com/assets/375f69e40ded4cb7be9baa2cc7429eb0_20241215_140710_t.jpg",
};

const christina: DashboardPerson = {
  name: "Christina Delacruz",
  position: "Site Mgr",
  avatar: "https://cdn.4insite.com/assets/3945ad92d52340539a4c70a4e02045bc_ahmed_t.jpg",
};

export const sitePerformance = {
  complaints: {
    value: "1 month",
    caption: "Since last complaint",
    note: { lead: "There’ve been ", strong: "0 complaints this month,", tail: " a decrease of 8 from July." },
    months: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    series: [42, 42, 2, 2, 31, 58],
  },
  safetyStreak: {
    days: 172,
    caption: "Since last recordable incident",
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    progress: 88,
    note: { lead: "You kept your perfect streak for ", strong: "6 months in a row" },
  },
  latestSurvey: {
    rating: 4.67,
    quote: {
      person: francisco,
      text: "While conducting my terminal walkthrough, I observed the cleaning staff performing maintenance tasks on escalator DC2-001 using duplex cleaning equipment. I am pleased to report that all personnel were in full compliance with PPE requirements, including safety glasses, gloves, and high-visibility vests. Appropriate floor signage was also properly positioned throughout the work area. I commend the team for their adherence to safety protocols during this operation.",
    },
    response: { person: dwayne, respondedOn: "Jul 18" },
  },
  scorecard: { value: 4.5, period: "July 2026" },
  reportIts: {
    count: 4,
    monthlyAverage: "12",
    months: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    series: [42, 42, 31, 70, 42, 46],
    latest: {
      submittedLabel: "Latest • submitted 2 hours ago",
      person: adamCraft,
      note: "Elevator 5 light is broken",
      photo: "/homepage/report-photo-1.png",
    },
  },
  performanceMap: {
    title: "Site Performance Map",
    description: "Explore KPIs and do cool stuff on a map",
    image: "/homepage/performance-map.png",
  },
  auditPerformance: {
    score: 5.0,
    total: 10,
    latest: {
      title: "Internal Audit of Concourse F",
      timeAgo: "2 hr ago",
      score: 5.0,
      person: christina,
      photos: ["/homepage/audit-photo-1.png", "/homepage/audit-photo-2.png", "/homepage/audit-photo-3.png", "/homepage/audit-photo-4.png"],
    },
    averages: [
      { label: "Internal avg", total: "8 total", value: 4.77 },
      { label: "Joint avg", total: "1 total", value: 4.86 },
      { label: "Customer avg", total: "1 total", value: 4.35 },
    ],
  },
  liveViewTeaser: {
    title: "Live View",
    description: "View latest service photos, audit results, employee stats, and more in real time.",
    image: "/homepage/liveview.png",
  },
};

export const communications = {
  messages: {
    kicker: "Latest Messages",
    person: dwayne,
    title: "Daily Assignment 07/28/2026",
    body: "The following is your assigned area for 07/29/2026. Should there be any changes due to call out the day of, your leads will be reaching out you directly. Otherwise, please ensure you arrive at your designated area on time and clock in at the supply pick up location.",
    image: "/homepage/comms-messages.png",
    tint: "var(--wash-purple-15)",
  },
  news: {
    kicker: "Latest News & Announcements",
    org: "SBM",
    title: "SBM’s Manager in Training Program",
    body: "SBM is thrilled to announce the addition of our three newest partners: Valarie Barnett, Nicole Ouimet, and Nick McMackins. Their dynamic contributions over the years have been remarkable, and we know they’ll make positive impacts as members of our limited partnership structure.",
    image: "/homepage/comms-news.png",
    tint: "var(--wash-warning-15)",
  },
  release: {
    kicker: "Latest Release Notes",
    product: "4insite",
    title: "4insite Release 2026.4",
    body: "Added an enhancement to Customer Config that allows users to view/manage Customer rosters at a multi site view. AD's / Vertical leads will be able to manage their entire portfolio to ensure all customer's contact info is current.",
    tags: [
      { label: "Bug Fix", tone: "danger" as const },
      { label: "New Feature", tone: "success" as const },
      { label: "Enhancement", tone: "purple" as const },
    ],
    image: "/homepage/comms-release.png",
    tint: "var(--wash-primary-15)",
  },
  views: {
    count: 118,
    label: "Today",
    image: "/homepage/views.svg",
  },
};
