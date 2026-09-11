"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BroomWideIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  ClockIcon,
  TriangleExclamationIcon,
  UserHardHatIcon,
  VectorSquareIcon,
  XmarkIcon,
} from "./icons";
import { DonutRing, SegmentedDonutRing } from "../ui/Charts";
import { NoteCallout } from "./MapShiftReportSections";
import { formatMinutesToHoursLabel, parseHoursLabelToMinutes } from "./FullShiftReportModal";
import { mapPageData, type DailyReportPerson } from "../../lib/mapPageData";
import type { ShiftReport } from "../../lib/mapShiftReportData";
import type { AreaCoverageBreakdown } from "../../lib/mapAreaServiceData";
import styles from "./FullDayReportModal.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

/** The three Quality categories this report shows everywhere (header chips and the Daily Summary sidebar alike) — drops "Joint Audit" from mapPageData/ShiftReport's own 4-entry qualityScores array (AI Verification/Internal Audit/Joint Audit/Customer Audit), matching the Figma file's own 3-category Quality treatment. */
const QUALITY_DISPLAY_LABELS = ["AI Verification", "Internal Audit", "Customer Audit"] as const;

export type FullDayReportModalProps = {
  /** All three shifts' full reports (Day, Swing, Graveyard), in that order — combined here into one document. */
  shiftReports: ShiftReport[];
  siteName: string;
  date: Date;
  /** The site's manager-of-record — the one sign-off this whole document needs. */
  siteManager: DailyReportPerson;
  /** AI-generated one-paragraph summary of the whole day, aggregated across all three shifts — the same text lib/mapPageData.ts's buildDailyReport generates and MapStatsPanel already shows for the unfiltered day view. */
  aiOverview: string;
  /** "Signed off at 9:04 PM EDT" — the same deterministic per-day label MapStatsPanel already shows; this modal only displays it, day nav/sign-off both stay on the underlying Map page. */
  siteManagerSignOff: string;
  /** Whole-day (all three shifts merged) Not/Under/Fully/Over-Serviced area breakdown, for the Daily Summary sidebar's "Areas Serviced" stat. */
  areaCoverage: AreaCoverageBreakdown;
  onClose: () => void;
};

/**
 * FullDayReportModal — full-page dark-theme recreation of the "Manager Shift
 * Report" Figma file's Daily Report screen (fileKey 0UJDRcrFiXkn16yfc2MUEW,
 * node 61:20862), reusing this project's own design tokens rather than that
 * file's light-theme hex values. Three collapsible shift cards (Day expanded
 * by default, Swing/Graveyard collapsed) on the left, a persistent "Daily
 * Summary" card on the right. Each shift card runs Shift Manager → Shift
 * Notes → Area Coverage → Service Coverage → Hours and Headcount → Quality,
 * each of the last four carrying its own manager note — Safety Issues/
 * Report Its/To Dos (present in an earlier iteration of this modal) aren't
 * part of this design; their totals still roll up into the Daily Summary
 * sidebar via each ShiftReport's own safetyIssues/reportIts* fields. Distinct
 * from FullShiftReportModal, which is one shift's report at a time with its
 * own (different) numbered-section layout.
 */
export function FullDayReportModal({
  shiftReports,
  siteName,
  date,
  siteManager,
  aiOverview,
  siteManagerSignOff,
  areaCoverage,
  onClose,
}: FullDayReportModalProps) {
  /** Each shift toggles independently — opening one never collapses another, so expanding a later shift (e.g. Swing after Day) never shifts the ones above it. */
  const [expandedShiftKeys, setExpandedShiftKeys] = useState<Set<ShiftReport["shiftKey"]>>(() => new Set());
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlayRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const totalManagers = shiftReports.reduce((sum, r) => sum + r.managers.length, 0);
  const totalAssociates = shiftReports.reduce((sum, r) => sum + r.associates.length, 0);

  const capturedMinutes = shiftReports.reduce((sum, r) => sum + parseHoursLabelToMinutes(r.hoursCapturedLabel), 0);
  const paidMinutes = shiftReports.reduce((sum, r) => sum + parseHoursLabelToMinutes(r.hoursPaidLabel), 0);

  const realServicesCompleted = shiftReports.reduce((sum, r) => sum + r.servicesCompletedCount, 0);
  const realServicesExpected = shiftReports.reduce((sum, r) => sum + r.servicesExpectedCount, 0);
  const realServicesPercent = realServicesExpected > 0 ? Math.round((realServicesCompleted / realServicesExpected) * 100) : 0;

  const dailyQualityScores = QUALITY_DISPLAY_LABELS.map((label) => mapPageData.qualityScores.find((q) => q.label === label));
  const totalSafetyIssues = shiftReports.reduce((sum, r) => sum + r.safetyIssues.length, 0);
  const reportItsSubmitted = shiftReports.reduce((sum, r) => sum + r.totalReportIts, 0);
  const reportItsAccepted = shiftReports.reduce((sum, r) => sum + r.reportItsAccepted, 0);
  const reportItsAcceptanceRate = reportItsSubmitted > 0 ? Math.round((reportItsAccepted / reportItsSubmitted) * 100) : 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="full-day-report-title" ref={overlayRef} tabIndex={-1}>
        <header className={styles.headerBlock}>
          <div className={styles.headerBlockInner}>
            <div className={styles.headerText}>
              <p className={styles.greeting} id="full-day-report-title">
                Here is the daily report for
              </p>
              <h1 className={styles.bigDate}>{dateFormatter.format(date)}</h1>
            </div>
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
              <XmarkIcon />
            </button>
          </div>
        </header>

        <div className={styles.scrollArea}>
          <div className={styles.body}>
            <div className={styles.mainColumn}>
              <div className={styles.dailySummaryCard}>
                <div className={styles.dailySummaryText}>
                  {aiOverview.split("\n").map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <div className={styles.signOffPersonRow}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={siteManager.avatar} alt="" className={styles.signOffAvatar} />
                  <div className={styles.signOffInfo}>
                    <div className={styles.signOffNameRow}>
                      <span className={styles.signOffName}>{siteManager.name}</span>
                      <span className={styles.signOffPosition}>{siteManager.position}</span>
                    </div>
                    <span className={styles.signOffComplete}>{siteManagerSignOff}</span>
                  </div>
                </div>
              </div>

              {shiftReports.map((report) => (
                <ShiftCard
                  key={report.shiftKey}
                  report={report}
                  expanded={expandedShiftKeys.has(report.shiftKey)}
                  onToggle={() =>
                    setExpandedShiftKeys((current) => {
                      const next = new Set(current);
                      if (next.has(report.shiftKey)) next.delete(report.shiftKey);
                      else next.add(report.shiftKey);
                      return next;
                    })
                  }
                />
              ))}
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Daily Summary</h2>
                <div className={styles.hairline} />

                <SidebarStat icon={<VectorSquareIcon />} value={`${areaCoverage.servicedPercent}%`} label="Areas Serviced">
                  <p className={styles.sidebarStatCaption}>
                    {areaCoverage.servicedCount.toLocaleString()} of {areaCoverage.totalAreas.toLocaleString()} total areas serviced
                  </p>
                  <div className={styles.sidebarSubRow}>
                    <span>Not Serviced</span>
                    <span>{areaCoverage.notServicedCount}</span>
                  </div>
                  <div className={styles.sidebarSubRow}>
                    <span>Under Serviced</span>
                    <span>{areaCoverage.underServicedCount}</span>
                  </div>
                  <div className={styles.sidebarSubRow}>
                    <span>Full Serviced</span>
                    <span>{areaCoverage.fullyServicedCount}</span>
                  </div>
                  <div className={styles.sidebarSubRow}>
                    <span>Over Serviced</span>
                    <span>{areaCoverage.overServicedCount}</span>
                  </div>
                </SidebarStat>

                <div className={styles.hairline} />
                <SidebarStat
                  icon={<BroomWideIcon />}
                  iconClassName={styles.sidebarStatIconPurple}
                  value={`${realServicesPercent}%`}
                  label="Service Coverage"
                >
                  <p className={styles.sidebarStatCaption}>
                    {realServicesCompleted.toLocaleString()} of {realServicesExpected.toLocaleString()} services completed
                  </p>
                </SidebarStat>

                <div className={styles.hairline} />
                <SidebarStat
                  icon={<ClockIcon />}
                  iconClassName={styles.sidebarStatIconYellow}
                  value={formatMinutesToHoursLabel(capturedMinutes)}
                  label="Hours Captured"
                >
                  <p className={styles.sidebarStatCaption}>
                    {formatMinutesToHoursLabel(capturedMinutes)} of {formatMinutesToHoursLabel(paidMinutes)} shift time
                  </p>
                  <div className={styles.sidebarSubRow}>
                    <span>Managers on site</span>
                    <span>{totalManagers}</span>
                  </div>
                  <div className={styles.sidebarSubRow}>
                    <span>Associates on site</span>
                    <span>{totalAssociates}</span>
                  </div>
                </SidebarStat>

                <div className={styles.hairline} />
                <div className={styles.sidebarStatBlock}>
                  <div className={styles.sidebarStatHeaderRow}>
                    <span className={[styles.sidebarStatIcon, styles.sidebarStatIconGreen].join(" ")}>
                      <ClipboardCheckIcon />
                    </span>
                    {dailyQualityScores[0] && (
                      <div className={styles.sidebarStatValueRow}>
                        <span className={styles.sidebarStatValue}>{dailyQualityScores[0].value}</span>
                        <span className={styles.sidebarStatLabel}>Verification Score</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.sidebarStatBody}>
                    <div className={styles.sidebarQualityRows}>
                      {dailyQualityScores.slice(1).map(
                        (score) =>
                          score && (
                            <div key={score.label} className={styles.sidebarStatValueRow}>
                              <span className={styles.sidebarStatValue}>{score.value}</span>
                              <span className={styles.sidebarStatLabel}>{score.label}</span>
                            </div>
                          )
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.hairline} />
                <SidebarStat
                  icon={<UserHardHatIcon />}
                  iconClassName={styles.sidebarStatIconOrange}
                  value={totalSafetyIssues.toLocaleString()}
                  label="Safety issues"
                />

                <div className={styles.hairline} />
                <SidebarStat
                  icon={<TriangleExclamationIcon />}
                  iconClassName={styles.sidebarStatIconPink}
                  value={reportItsAccepted.toLocaleString()}
                  label="Report Its Accepted"
                >
                  <div className={styles.sidebarSubRow}>
                    <span>Submitted</span>
                    <span>{reportItsSubmitted}</span>
                  </div>
                  <div className={styles.sidebarSubRow}>
                    <span>Accepted</span>
                    <span>{reportItsAccepted}</span>
                  </div>
                  <div className={styles.sidebarSubRow}>
                    <span>Rejected</span>
                    <span>{reportItsSubmitted - reportItsAccepted}</span>
                  </div>
                  <div className={styles.sidebarSubRow}>
                    <span>Acceptance Rate</span>
                    <span>{reportItsAcceptanceRate}%</span>
                  </div>
                </SidebarStat>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Shift card ---------------- */

function ShiftCard({ report, expanded, onToggle }: { report: ShiftReport; expanded: boolean; onToggle: () => void }) {
  const reportedNote = report.notes[0];
  const shiftQualityScores = QUALITY_DISPLAY_LABELS.map((label) => report.qualityScores.find((q) => q.label === label)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s)
  );
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expanded]);

  return (
    <div className={styles.shiftCard} ref={cardRef}>
      <button type="button" className={styles.shiftCardHeader} onClick={onToggle} aria-expanded={expanded}>
        <div className={styles.shiftCardHeaderText}>
          <span className={[styles.shiftCardTitle, expanded ? "" : styles.shiftCardTitleCollapsed].filter(Boolean).join(" ")}>
            {report.label} Shift
          </span>
          {reportedNote && (
            <span className={styles.shiftCardMeta}>
              Reported at {reportedNote.timestamp} by {reportedNote.author.name}
            </span>
          )}
        </div>

        <div className={styles.shiftCardStatsExpanded}>
          <ShiftHeaderStat icon={<VectorSquareIcon />} title={`${report.areaCoverage.servicedPercent}% Areas Serviced`}>
            {report.areaCoverage.servicedCount.toLocaleString()} of {report.areaCoverage.totalAreas.toLocaleString()}
          </ShiftHeaderStat>
          <ShiftHeaderStat icon={<BroomWideIcon />} iconClassName={styles.shiftHeaderStatIconPurple} title={`${report.servicesPercent}% Services Completed`}>
            {report.servicesCompletedCount.toLocaleString()} of {report.servicesExpectedCount.toLocaleString()}
          </ShiftHeaderStat>
          <ShiftHeaderStat icon={<ClockIcon />} iconClassName={styles.shiftHeaderStatIconYellow} title={`${report.hoursPercent}% Hours Captured`}>
            {report.hoursCapturedLabel} of {report.hoursPaidLabel}
          </ShiftHeaderStat>
        </div>

        <ChevronDownIcon className={[styles.shiftCardCaret, expanded ? styles.shiftCardCaretOpen : ""].filter(Boolean).join(" ")} />
      </button>

      <div
        className={[styles.shiftCardBodyWrap, expanded ? styles.shiftCardBodyWrapOpen : ""].filter(Boolean).join(" ")}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className={styles.shiftCardBody}>
          <div className={styles.shiftCardBodyContent}>
          <Section title="Shift Manager">
            <div className={styles.managerList}>
              {report.managers.map((manager) => {
                const clock = report.managerClockTimes[manager.name];
                return (
                  <div key={manager.name} className={styles.managerRow}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={manager.avatar} alt="" className={styles.managerAvatar} />
                    <div className={styles.managerInfo}>
                      <span className={styles.managerName}>{manager.name}</span>
                      <span className={styles.managerPosition}>
                        {manager.position} | {report.label}
                      </span>
                    </div>
                    <div className={styles.managerDivider} />
                    <ManagerTimeStat value={clock?.clockIn ?? "—"} label="Clocked In" />
                    <ManagerTimeStat value={clock?.clockOut ?? "—"} label="Clocked Out" />
                    <ManagerTimeStat value={clock?.totalTimeLabel ?? "—"} label="Total Time" />
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Shift Notes">
            {report.notes.map((note, i) => (
              <NoteCallout key={`${note.author.name}-${i}`} note={note} />
            ))}
          </Section>

          <Section title="Area Coverage">
            <div className={styles.areaCoverageRow}>
              <AreaCoverageStat coverage={report.areaCoverage} />
              <AreaCoverageBreakdownRow coverage={report.areaCoverage} />
            </div>
            <NoteCallout note={report.areaCoverageNote} />
          </Section>

          <Section title="Service Coverage">
            <LeadStat
              ringColor="var(--color-datavis-purple-100)"
              percent={report.servicesPercent}
              value={report.servicesCompletedCount.toLocaleString()}
              caption={`of ${report.servicesExpectedCount.toLocaleString()} expected`}
              label="Services Completed"
            />
            <NoteCallout note={report.servicesNote} />
          </Section>

          <Section title="Hours and Headcount">
            <div className={styles.areaCoverageRow}>
              <LeadStat
                ringColor="var(--color-datavis-yellow-100)"
                percent={report.hoursPercent}
                value={report.hoursCapturedLabel}
                caption={`of ${report.hoursPaidLabel} shift time`}
                label="Hours Captured"
              />
              <div className={styles.headcountGrid}>
                <HeadcountStat label="Scheduled Headcount" value={report.scheduledHeadcount} />
                <HeadcountStat label="Actual Arrival" value={report.actualArrival} />
                <HeadcountStat label="Total Absences" value={report.totalAbsences} />
                <div className={styles.headcountSubGroup}>
                  <HeadcountInlineStat label="No Call/No Show" value={report.noCallNoShowCount} />
                  <HeadcountInlineStat label="Call Outs" value={report.callOutsCount} />
                </div>
              </div>
            </div>
            <NoteCallout note={report.hoursNote} />
          </Section>

          <Section title="Quality">
            <div className={styles.scoreChipRow}>
              {shiftQualityScores.map((score) => (
                <div key={score.label} className={styles.scoreCard}>
                  <span className={styles.scoreBadge} data-tone={score.tone}>
                    {score.value}
                  </span>
                  <div className={styles.scoreCardTextGroup}>
                    <span className={styles.scoreCardLabel}>{score.label}</span>
                    <span className={styles.scoreCardCaption}>{score.count}</span>
                  </div>
                </div>
              ))}
            </div>
            <NoteCallout note={report.scoresNote} />
          </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Shared small pieces ---------------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

function ShiftHeaderStat({
  icon,
  iconClassName,
  title,
  children,
}: {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.shiftHeaderStatItem}>
      <span className={[styles.shiftHeaderStatIcon, iconClassName].filter(Boolean).join(" ")}>{icon}</span>
      <div className={styles.shiftHeaderStatText}>
        <span className={styles.shiftHeaderStatTitle}>{title}</span>
        <span className={styles.shiftHeaderStatSubtitle}>{children}</span>
      </div>
    </div>
  );
}

function LeadStat({ percent, value, caption, label, ringColor }: { percent: number; value: string; caption: string; label: string; ringColor: string }) {
  return (
    <div className={styles.leadStatRow}>
      <div className={styles.leadStatRing}>
        <DonutRing percent={percent} color={ringColor} trackColor="var(--color-neutral-700)" size={68} strokeWidth={6} />
        <span className={styles.leadStatRingLabel}>{percent}%</span>
      </div>
      <div className={styles.leadStatTextStack}>
        <span className={styles.leadStatStackLabel}>{label}</span>
        <span className={styles.leadStatStackValue}>{value}</span>
        <span className={styles.leadStatCaption}>{caption}</span>
      </div>
    </div>
  );
}

/** Same left-hand layout as LeadStat (ring + value/label + caption), but the ring is a 4-color SegmentedDonutRing reflecting the Not/Under/Fully/Over-Serviced split rather than one percent value. */
function AreaCoverageStat({ coverage }: { coverage: AreaCoverageBreakdown }) {
  return (
    <div className={styles.leadStatRow}>
      <div className={styles.leadStatRing}>
        <SegmentedDonutRing
          size={68}
          strokeWidth={6}
          segments={[
            { value: coverage.notServicedCount, color: "var(--color-danger-300)" },
            { value: coverage.underServicedCount, color: "var(--color-warning-300)" },
            { value: coverage.fullyServicedCount, color: "var(--color-success-300)" },
            { value: coverage.overServicedCount, color: "var(--color-success-700)" },
            { value: coverage.noFrequencyCount, color: "var(--color-neutral-500)" },
          ]}
        />
        <span className={styles.leadStatRingLabel}>{coverage.servicedPercent}%</span>
      </div>
      <div className={styles.leadStatTextStack}>
        <span className={styles.leadStatStackLabel}>Areas Serviced</span>
        <span className={styles.leadStatStackValue}>{coverage.servicedCount.toLocaleString()}</span>
        <span className={styles.leadStatCaption}>of {coverage.totalAreas.toLocaleString()} total areas</span>
      </div>
    </div>
  );
}

const COVERAGE_BREAKDOWN_ITEMS: { key: keyof AreaCoverageBreakdown; label: string; color: string }[] = [
  { key: "notServicedCount", label: "Not Serviced", color: "var(--color-danger-300)" },
  { key: "underServicedCount", label: "Under-Serviced", color: "var(--color-warning-300)" },
  { key: "fullyServicedCount", label: "Fully Serviced", color: "var(--color-success-300)" },
  { key: "overServicedCount", label: "Over-Serviced", color: "var(--color-success-700)" },
  { key: "noFrequencyCount", label: "No Frequency", color: "var(--color-neutral-500)" },
];

function AreaCoverageBreakdownRow({ coverage }: { coverage: AreaCoverageBreakdown }) {
  return (
    <div className={styles.coverageBreakdownRow}>
      {COVERAGE_BREAKDOWN_ITEMS.map((item) => {
        const count = coverage[item.key] as number;
        const percent = coverage.totalAreas > 0 ? Math.round((count / coverage.totalAreas) * 100) : 0;
        return (
          <div key={item.label} className={styles.coverageBreakdownItem}>
            <div className={styles.coverageBreakdownLabelRow}>
              <span className={styles.coverageBreakdownDot} style={{ backgroundColor: item.color }} />
              <span className={styles.coverageBreakdownLabel}>{item.label}</span>
            </div>
            <div className={styles.coverageBreakdownValueRow}>
              <span className={styles.coverageBreakdownValue}>{count.toLocaleString()} areas</span>
              <span className={styles.coverageBreakdownPercent}>({percent}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function HeadcountStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.headcountStat}>
      <span className={styles.headcountLabel}>{label}</span>
      <span className={styles.headcountValue}>{value.toLocaleString()}</span>
    </div>
  );
}

function HeadcountInlineStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.headcountInlineStat}>
      <span className={styles.headcountInlineLabel}>{label}</span>
      <span className={styles.headcountInlineValue}>{value.toLocaleString()}</span>
    </div>
  );
}

function ManagerTimeStat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.managerTimeStat}>
      <span className={styles.managerTimeValue}>{value}</span>
      <span className={styles.managerTimeLabel}>{label}</span>
    </div>
  );
}

function SidebarStat({
  icon,
  iconClassName,
  value,
  label,
  children,
}: {
  icon: ReactNode;
  iconClassName?: string;
  value: string;
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.sidebarStatBlock}>
      <div className={styles.sidebarStatHeaderRow}>
        <span className={[styles.sidebarStatIcon, iconClassName].filter(Boolean).join(" ")}>{icon}</span>
        <div className={styles.sidebarStatValueRow}>
          <span className={styles.sidebarStatValue}>{value}</span>
          <span className={styles.sidebarStatLabel}>{label}</span>
        </div>
      </div>
      {children && <div className={styles.sidebarStatBody}>{children}</div>}
    </div>
  );
}
