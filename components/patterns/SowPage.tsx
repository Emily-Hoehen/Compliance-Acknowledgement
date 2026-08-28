"use client";

import { useState } from "react";
import { SowNav } from "./SowNav";
import { siteInfo } from "../../lib/homeDashboardData";
import { SowOverviewTab } from "./SowOverviewTab";
import { SowFacilityTab } from "./SowFacilityTab";
import { SowPeopleTab } from "./SowPeopleTab";
import { SowContractTab } from "./SowContractTab";
import type { RosterPerson } from "../../lib/csv";
import styles from "./SowPage.module.css";

/**
 * SowPage — consolidated Scope of Work view.
 *
 * Replaces the disconnected Scope of Work Details (Scope / Coverage
 * / Compliance), Visual SOW / Live coverage, and Your Spaces / Our
 * Team / Service Times screens with one feature, shared by the site
 * manager and the customer rather than built twice — split into
 * four tabs instead of a manager/customer fork:
 *  - Overview  — the daily check-in: is SBM on track today, and
 *    is the work holding up to standard.
 *  - Facility  — everything scoped to areas: what this facility is
 *    made of and what's happening in it right now.
 *  - People    — everything scoped to the team: who's working and
 *    how they're performing.
 *  - Contract  — the static scope of work itself: what SBM is
 *    contracted to do and how often. No live data.
 *
 * Nav config mirrors HomeDashboard (same org/site labels, utility
 * icons) so the header is consistent when navigating between Home
 * and Quality > Scope of Work. Light theme only.
 */

export type SowTab = "overview" | "facility" | "people" | "contract";

const TABS: { id: SowTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "fa-gauge-high" },
  { id: "facility", label: "Facility", icon: "fa-building" },
  { id: "people", label: "People", icon: "fa-users" },
  { id: "contract", label: "Contract", icon: "fa-file-contract" },
];

export type SowPageProps = {
  associates?: RosterPerson[];
  managers?: RosterPerson[];
};

export function SowPage({ associates = [], managers = [] }: SowPageProps) {
  const [activeTab, setActiveTab] = useState<SowTab>("overview");
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className={styles.page} data-theme="light">
      <SowNav current="tabs" />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Scope of Work for {siteInfo.siteName}</h1>
          <button type="button" className={styles.dateControl}>
            Today, {today}
            <span aria-hidden="true">▾</span>
          </button>
        </div>

        <div className={styles.tabBar} role="tablist" aria-label="Scope of Work views">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={[styles.tabButton, activeTab === tab.id ? styles.tabButtonActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fa-solid ${tab.icon}`} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && <SowOverviewTab onNavigateTab={setActiveTab} />}
        {activeTab === "facility" && <SowFacilityTab />}
        {activeTab === "people" && <SowPeopleTab associates={associates} managers={managers} />}
        {activeTab === "contract" && <SowContractTab />}
      </main>
    </div>
  );
}
