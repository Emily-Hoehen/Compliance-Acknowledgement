"use client";

import { useState } from "react";
import { SowNav } from "./SowNav";
import { SowAudienceOverviewTab } from "./SowAudienceOverviewTab";
import { SowFacilityTab } from "./SowFacilityTab";
import { SowPeopleTab } from "./SowPeopleTab";
import type { SowTab } from "./SowPage";
import type { RosterPerson } from "../../lib/csv";
import { siteInfo } from "../../lib/homeDashboardData";
import sharedStyles from "./SowPage.module.css";

type AudienceMode = "executive" | "operational";
type OperationalTab = "facility" | "people";

export type SowAudiencePageProps = {
  associates?: RosterPerson[];
  managers?: RosterPerson[];
};

/**
 * SowAudiencePage — fifth Scope of Work exploration: audience, not
 * space or time, is the primary nav. One page-level toggle —
 * Executive Overview vs. Operational Dashboard — decides how much
 * detail shows up at all, rather than a flat tab bar giving every
 * viewer the same set of tabs regardless of who they are:
 *
 *  - Executive Overview: the customer-facing read — is SBM on track
 *    today, and is the work holding up to standard. Headline numbers,
 *    a Recent Activity feed that can drop into a big-photo slideshow,
 *    and compliance health — no facility-summary paragraph or
 *    building/floor slicer row the way the Operational side has;
 *    just an area-type filter on the activity itself.
 *  - Operational Dashboard: the manager-facing read — Facility/People
 *    depth gated behind a second toggle so a customer never lands
 *    here by accident. Facility here is the plain SowFacilityTab
 *    (dense grid + drill-down table), reused as-is.
 *
 * Reuses SowFacilityTab / SowPeopleTab as-is rather than re-deriving
 * their content. SowAudienceOverviewTab is a fork of SowOverviewTab
 * (which SowPage still reuses unmodified) — its KPI boxes and
 * compliance health are unchanged, but Recent Activity gained an
 * area-type filter and a Grid/Slideshow toggle, and draws from the
 * full site-wide verification/audit pool instead of the five-item
 * recent feed so that filter has something real to narrow. "View
 * full live coverage" still jumps to the Operational side's Facility
 * tab, for the fuller grid/table a manager would want.
 */
export function SowAudiencePage({ associates = [], managers = [] }: SowAudiencePageProps) {
  const [mode, setMode] = useState<AudienceMode>("executive");
  const [operationalTab, setOperationalTab] = useState<OperationalTab>("facility");
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  function handleOverviewNavigate(tab: SowTab) {
    if (tab === "facility") {
      setMode("operational");
      setOperationalTab("facility");
    }
  }

  return (
    <div className={sharedStyles.page} data-theme="light">
      <SowNav current="audience" />

      <main className={sharedStyles.main}>
        <div className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.pageTitle}>Scope of Work for {siteInfo.siteName}</h1>
          <div className={sharedStyles.viewToggleGroup}>
            <button
              type="button"
              className={[sharedStyles.viewToggleButton, mode === "executive" ? sharedStyles.viewToggleButtonActive : ""]
                .filter(Boolean)
                .join(" ")}
              data-theme="light"
              onClick={() => setMode("executive")}
            >
              Executive Overview
            </button>
            <button
              type="button"
              className={[sharedStyles.viewToggleButton, mode === "operational" ? sharedStyles.viewToggleButtonActive : ""]
                .filter(Boolean)
                .join(" ")}
              data-theme="light"
              onClick={() => setMode("operational")}
            >
              Operational Dashboard
            </button>
          </div>
        </div>

        <div className={sharedStyles.pageHeader}>
          <button type="button" className={sharedStyles.dateControl}>
            Today, {today}
            <span aria-hidden="true">▾</span>
          </button>
        </div>

        {mode === "operational" && (
          <div className={sharedStyles.tabBar} role="tablist" aria-label="Operational Dashboard views">
            <button
              type="button"
              role="tab"
              aria-selected={operationalTab === "facility"}
              className={[sharedStyles.tabButton, operationalTab === "facility" ? sharedStyles.tabButtonActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setOperationalTab("facility")}
            >
              <i className="fa-solid fa-building" aria-hidden="true" />
              Facility
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={operationalTab === "people"}
              className={[sharedStyles.tabButton, operationalTab === "people" ? sharedStyles.tabButtonActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setOperationalTab("people")}
            >
              <i className="fa-solid fa-users" aria-hidden="true" />
              People
            </button>
          </div>
        )}

        {mode === "executive" && <SowAudienceOverviewTab onNavigateTab={handleOverviewNavigate} />}
        {mode === "operational" && operationalTab === "facility" && <SowFacilityTab />}
        {mode === "operational" && operationalTab === "people" && (
          <SowPeopleTab associates={associates} managers={managers} />
        )}
      </main>
    </div>
  );
}
