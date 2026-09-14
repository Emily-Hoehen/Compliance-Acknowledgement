"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BroomWideIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  ClipboardCheckIcon,
  ClockIcon,
  TriangleExclamationIcon,
  UserHardHatIcon,
  VectorSquareIcon,
  XmarkIcon,
} from "./icons";
import { DonutRing, SegmentedDonutRing } from "../ui/Charts";
import { AssociateAttendanceModal } from "./AssociateAttendanceModal";
import { ReportItsModal } from "./ReportItsModal";
import { formatMinutesToHoursLabel, parseHoursLabelToMinutes } from "./FullShiftReportModal";
import type { DailyReportPerson, QualityScore } from "../../lib/mapPageData";
import type { ManagerNote, ShiftReport } from "../../lib/mapShiftReportData";
import type { AreaCoverageBreakdown } from "../../lib/mapAreaServiceData";
import styles from "./FullDayReportModalV2.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

/** The three Quality categories this report shows everywhere (header chips and the Daily Summary sidebar alike) — drops "Joint Audit" from mapPageData/ShiftReport's own 4-entry qualityScores array (AI Verification/Internal Audit/Joint Audit/Customer Audit), matching the Figma file's own 3-category Quality treatment. */
const QUALITY_DISPLAY_LABELS = ["AI Verification", "Internal Audit", "Customer Audit"] as const;

/** One quality category's whole-day figure, built from the three shifts' own scores rather than a separate static number — the score is the average of whichever shifts actually scored this category (a shift with no audits that category reports "N/A" and is excluded, so it doesn't drag the average toward zero), and the count is the real total across all three shifts. */
function buildDailyQualityScore(shiftReports: ShiftReport[], label: (typeof QUALITY_DISPLAY_LABELS)[number]): QualityScore {
  const perShift = shiftReports
    .map((report) => report.qualityScores.find((score) => score.label === label))
    .filter((score): score is QualityScore => Boolean(score));
  const totalCount = perShift.reduce((sum, score) => sum + (parseInt(score.count.replace(/[^\d]/g, ""), 10) || 0), 0);
  const scoredValues = perShift.filter((score) => score.value !== "N/A").map((score) => Number(score.value));
  const averageValue = scoredValues.length > 0 ? (scoredValues.reduce((sum, value) => sum + value, 0) / scoredValues.length).toFixed(2) : "N/A";
  const countLabel = label === "AI Verification" ? `${totalCount.toLocaleString()} services` : `${totalCount} audit${totalCount === 1 ? "" : "s"}`;
  return { label, count: countLabel, value: averageValue, tone: scoredValues.length > 0 ? "success" : "neutral" };
}

export type FullDayReportModalV2Props = {
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
 * FullDayReportModalV2 — a second exploration of the Daily Report screen,
 * matching Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 104:5253 ("Shift
 * Accordion" v2). Same data and outer chrome (overlay, header, Daily
 * Summary sidebar, shift-card accordion header) as FullDayReportModal —
 * V1 is untouched by this file. What's different is scoped to each shift
 * card's expanded body: manager notes drop their colored left accent bar
 * for a flat Core/Neutral/700 fill (see NoteCalloutV2Item), and each
 * card's sub-topics (Hours/Headcount, Area Coverage/Service Coverage,
 * Average Scores/Report Its/Safety) run as label-left/content-right rows
 * within one card instead of V1's separate titled Section per topic.
 */
export function FullDayReportModalV2({
  shiftReports,
  siteName,
  date,
  siteManager,
  aiOverview,
  siteManagerSignOff,
  areaCoverage,
  onClose,
}: FullDayReportModalV2Props) {
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
  const totalAssociates = shiftReports.reduce((sum, r) => sum + r.scheduledHeadcount, 0);

  const capturedMinutes = shiftReports.reduce((sum, r) => sum + parseHoursLabelToMinutes(r.hoursCapturedLabel), 0);
  const paidMinutes = shiftReports.reduce((sum, r) => sum + parseHoursLabelToMinutes(r.hoursPaidLabel), 0);

  const realServicesCompleted = shiftReports.reduce((sum, r) => sum + r.servicesCompletedCount, 0);
  const realServicesExpected = shiftReports.reduce((sum, r) => sum + r.servicesExpectedCount, 0);
  const realServicesPercent = realServicesExpected > 0 ? Math.round((realServicesCompleted / realServicesExpected) * 100) : 0;

  const dailyQualityScores = QUALITY_DISPLAY_LABELS.map((label) => buildDailyQualityScore(shiftReports, label));
  const totalSafetyIssues = shiftReports.reduce((sum, r) => sum + r.safetyIssues.length, 0);
  const reportItsSubmitted = shiftReports.reduce((sum, r) => sum + r.totalReportIts, 0);
  const reportItsAccepted = shiftReports.reduce((sum, r) => sum + r.reportItsAccepted, 0);
  const reportItsAcceptanceRate = reportItsSubmitted > 0 ? Math.round((reportItsAccepted / reportItsSubmitted) * 100) : 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="full-day-report-v2-title" ref={overlayRef} tabIndex={-1}>
        <header className={styles.headerBlock}>
          <div className={styles.headerBlockInner}>
            <div className={styles.headerText}>
              <p className={styles.greeting} id="full-day-report-v2-title">
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
                  <div className={styles.sidebarSubRow}>
                    <span>No Frequency</span>
                    <span>{areaCoverage.noFrequencyCount}</span>
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
  const [headcountModalOpen, setHeadcountModalOpen] = useState(false);
  const [reportItsModalOpen, setReportItsModalOpen] = useState(false);

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
            <Section title="Shift Managers">
              <div className={styles.managerList}>
                {report.managers.map((manager, index) => {
                  const clock = report.managerClockTimes[manager.name];
                  return (
                    <div key={manager.name} className={styles.managerRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={manager.avatar} alt="" className={styles.managerAvatar} />
                      <div className={styles.managerInfo}>
                        <span className={styles.managerName}>{manager.name}</span>
                        <span className={styles.managerPosition}>{manager.position}</span>
                        {index === 0 && reportedNote && (
                          <span className={styles.managerCheckedOut}>Reported at {reportedNote.timestamp}</span>
                        )}
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
              <div className={styles.noteV2List}>
                {report.notes.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>

            <Section title="Hours and Headcount">
              <div className={styles.sectionRows}>
                <LeadStatV2
                  ringColor="var(--color-datavis-yellow-100)"
                  percent={report.hoursPercent}
                  amount={report.hoursCapturedLabel}
                  label="Hours Captured"
                  caption={`of ${report.hoursPaidLabel} shift time`}
                />
                <button
                  type="button"
                  className={[styles.headcountGrid, styles.headcountCard].join(" ")}
                  onClick={() => setHeadcountModalOpen(true)}
                >
                  <HeadcountStat label="Scheduled Headcount" value={report.scheduledHeadcount} />
                  <HeadcountStat label="Actual Arrival" value={report.actualArrival} />
                  <HeadcountStat label="Total Absences" value={report.totalAbsences} />
                  <div className={styles.headcountSubGroup}>
                    <HeadcountInlineStat label="No Call/No Show" value={report.noCallNoShowCount} />
                    <HeadcountInlineStat label="Call Outs" value={report.callOutsCount} />
                  </div>
                </button>
              </div>
              <div className={styles.noteV2List}>
                {report.hoursNote.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>

            <Section title="Area Coverage">
              <div className={styles.areaCoverageStack}>
                <AreaCoverageStat coverage={report.areaCoverage} />
                <AreaCoverageBreakdownRow coverage={report.areaCoverage} />
              </div>
              <div className={styles.noteV2List}>
                {report.areaCoverageNote.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>

            <Section title="Service Coverage">
              <LeadStatV2
                ringColor="var(--color-datavis-purple-100)"
                percent={report.servicesPercent}
                amount={report.servicesCompletedCount.toLocaleString()}
                label="Services Completed"
                caption={`of ${report.servicesExpectedCount.toLocaleString()} expected`}
              />
              <div className={styles.noteV2List}>
                {report.servicesNote.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
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

              <div className={styles.qualitySubsectionRow}>
                <button
                  type="button"
                  className={[styles.qualitySubsection, styles.qualitySubsectionButton].join(" ")}
                  onClick={() => setReportItsModalOpen(true)}
                >
                  <h4 className={styles.qualitySubsectionTitle}>Report Its</h4>
                  <div className={styles.qualityStatRow}>
                    <HeadcountStat label="Submitted" value={report.totalReportIts} />
                    <HeadcountStat label="Rejected" value={report.reportItsRejected} />
                    <HeadcountStat label="Acceptance Rate" value={`${report.reportItsAcceptanceRate}%`} />
                  </div>
                </button>

                <div className={styles.verticalDivider} />

                <div className={styles.qualitySubsection}>
                  <h4 className={styles.qualitySubsectionTitle}>Safety</h4>
                  {report.safetyIssues.length === 0 ? (
                    <span className={styles.safetyEmptyState}>There are no safety issues for this shift</span>
                  ) : (
                    <div className={styles.qualityStatRow}>
                      <HeadcountStat label="Incidents" value={report.safetyIssues.length} />
                      <div className={styles.headcountStat}>
                        <span className={styles.headcountLabel}>Incident Status</span>
                        <span className={styles.safetyReportStatusBadge}>
                          <CircleCheckIcon className={styles.safetyReportStatusIcon} /> Incident Report Created
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.noteV2List}>
                {report.scoresNote.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>

      <AssociateAttendanceModal
        open={headcountModalOpen}
        onClose={() => setHeadcountModalOpen(false)}
        shiftLabel={report.label}
        associates={report.associateAttendance}
      />

      <ReportItsModal open={reportItsModalOpen} onClose={() => setReportItsModalOpen(false)} shiftLabel={report.label} report={report} />
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

/** Label-left/content-right row for a card's sub-topic — e.g. "Hours" next to its own ring+value, "Headcount" next to its own stat grid. */
function SectionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.sectionRow}>
      <span className={styles.sectionRowLabel}>{label}</span>
      <div className={styles.sectionRowContent}>{children}</div>
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

/** Same ring+value+caption as V1's LeadStat, minus the separate top label line — the row's own left-hand SectionRow label already names the metric, so V2 folds label + value into one line (e.g. "330h 10m hours captured") instead of stacking "Hours Captured" above "346h 18m". */
function LeadStatV2({
  percent,
  amount,
  label,
  caption,
  ringColor,
}: {
  percent: number;
  amount: string;
  label: string;
  caption: string;
  ringColor: string;
}) {
  return (
    <div className={styles.leadStatRow}>
      <div className={styles.leadStatRing}>
        <DonutRing percent={percent} color={ringColor} trackColor="var(--color-neutral-700)" size={68} strokeWidth={6} />
        <span className={styles.leadStatRingLabel}>{percent}%</span>
      </div>
      <div className={styles.leadStatTextStack}>
        <span className={styles.leadStatValueLabel}>{label}</span>
        <div className={styles.leadStatValueRow}>
          <span className={styles.leadStatStackValue}>{amount}</span>
          <span className={styles.leadStatCaption}>{caption}</span>
        </div>
      </div>
    </div>
  );
}

/** Same left-hand layout as LeadStatV2 (ring + amount/label/caption), but the ring is a 4-color SegmentedDonutRing reflecting the Not/Under/Fully/Over-Serviced split rather than one percent value. */
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
        <span className={styles.leadStatValueLabel}>Areas Serviced</span>
        <div className={styles.leadStatValueRow}>
          <span className={styles.leadStatStackValue}>{coverage.servicedCount.toLocaleString()}</span>
          <span className={styles.leadStatCaption}>of {coverage.totalAreas.toLocaleString()} total areas</span>
        </div>
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

function HeadcountStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={styles.headcountStat}>
      <span className={styles.headcountLabel}>{label}</span>
      <span className={styles.headcountValue}>{typeof value === "number" ? value.toLocaleString() : value}</span>
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

function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** V2's own note card — same content (text/tags/author/timestamp) as the shared NoteCallout, but flat Core/Neutral/700 fill with no colored left accent bar, matching Figma node 104:5253. Scoped to this file rather than changing the shared component, so V1 stays exactly as it was. */
function NoteCalloutV2Item({ note }: { note: ManagerNote }) {
  return (
    <div className={styles.noteV2}>
      <p className={styles.noteV2Text}>
        {note.text.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            <br />
          </span>
        ))}
      </p>
      {note.tags.length > 0 && (
        <div className={styles.noteV2TagRow}>
          {note.tags.map((tag) => (
            <span key={tag} className={styles.noteV2Tag} data-tag={tagSlug(tag)}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className={styles.noteV2Footer}>
        {note.author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={note.author.avatar} alt="" className={styles.noteV2Avatar} />
        ) : (
          <span className={styles.noteV2Avatar} aria-hidden="true" />
        )}
        <span className={styles.noteV2Author}>{note.author.name}</span>
        <span className={styles.noteV2Time}>{note.timestamp}</span>
      </div>
    </div>
  );
}
