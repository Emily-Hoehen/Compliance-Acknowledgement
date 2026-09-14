"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BroomWideIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
import styles from "./FullDayReportModalV3.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

/** Same 3-category Quality treatment as V1/V2 — drops "Joint Audit" from the 4-entry qualityScores array. */
const QUALITY_DISPLAY_LABELS = ["AI Verification", "Internal Audit", "Customer Audit"] as const;

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

export type FullDayReportModalV3Props = {
  shiftReports: ShiftReport[];
  siteName: string;
  date: Date;
  siteManager: DailyReportPerson;
  aiOverview: string;
  siteManagerSignOff: string;
  areaCoverage: AreaCoverageBreakdown;
  onClose: () => void;
};

/**
 * FullDayReportModalV3 — a third exploration of the Daily Report screen,
 * matching Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 107:9550 ("Daily
 * Report" shift detail page). Differs from V2 in three ways: (1) each
 * shift's collapsed box on the overview is tinted a distinct color
 * (Day/Swing/Graveyard) instead of sharing one blue wash, (2) the Site
 * Director sign-off card sits as a full-width banner above the
 * overview's two-column layout instead of inside the main column, and
 * (3) clicking a shift box navigates to a dedicated full-page,
 * single-column shift report (with its own back button) instead of
 * expanding an accordion in place.
 */
export function FullDayReportModalV3({
  shiftReports,
  siteName,
  date,
  siteManager,
  aiOverview,
  siteManagerSignOff,
  areaCoverage,
  onClose,
}: FullDayReportModalV3Props) {
  const [activeShiftKey, setActiveShiftKey] = useState<ShiftReport["shiftKey"] | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 });
  }, [activeShiftKey]);

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

  const activeReport = activeShiftKey ? (shiftReports.find((r) => r.shiftKey === activeShiftKey) ?? null) : null;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="full-day-report-v3-title" ref={overlayRef} tabIndex={-1}>
        <header className={styles.headerBlock}>
          <div className={styles.headerBlockInner}>
            <div className={styles.headerText}>
              <p className={styles.greeting} id="full-day-report-v3-title">
                Here is the daily report for
              </p>
              <h1 className={styles.bigDate}>{dateFormatter.format(date)}</h1>
            </div>
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
              <XmarkIcon />
            </button>
          </div>
        </header>

        <div className={styles.scrollArea} ref={scrollAreaRef}>
            {!activeReport ? (
              <div className={styles.body}>
                <div className={styles.mainColumn}>
                  {/* Site Director sign-off note — first item in the column, above the shift list. */}
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
                    <ShiftNavCard key={report.shiftKey} report={report} onOpen={() => setActiveShiftKey(report.shiftKey)} />
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
            ) : (
              <ShiftDetailPage report={activeReport} onBack={() => setActiveShiftKey(null)} />
            )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Overview: shift nav card ---------------- */

/** Collapsed-only shift entry on the overview (Figma node 105:5941) — every shift shares one flat card style (no per-shift tint) and is always a plain navigation trigger to its own full page, not an accordion header. */
function ShiftNavCard({ report, onOpen }: { report: ShiftReport; onOpen: () => void }) {
  const reportedNote = report.notes[0];
  return (
    <button type="button" className={styles.shiftNavCard} data-shift={report.shiftKey} onClick={onOpen}>
      <div className={styles.shiftNavCardHeader}>
        <div className={styles.shiftCardHeaderText}>
          <span className={styles.detailHeadingTitle}>{report.label} Shift</span>
          {reportedNote && (
            <span className={styles.shiftCardMeta}>
              Reported at {reportedNote.timestamp} by {reportedNote.author.name}
            </span>
          )}
        </div>

        <div className={styles.shiftNavCardMetrics}>
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

        <span className={styles.shiftNavCardChevronButton} aria-hidden="true">
          <ChevronRightIcon />
        </span>
      </div>
    </button>
  );
}

/* ---------------- Shift detail page (full page, no sidebar) ---------------- */

function ShiftDetailPage({ report, onBack }: { report: ShiftReport; onBack: () => void }) {
  const shiftQualityScores = QUALITY_DISPLAY_LABELS.map((label) => report.qualityScores.find((q) => q.label === label)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s)
  );
  const [headcountModalOpen, setHeadcountModalOpen] = useState(false);
  const [reportItsModalOpen, setReportItsModalOpen] = useState(false);

  const leadManager = report.managers[0];
  const leadManagerClock = leadManager ? report.managerClockTimes[leadManager.name] : undefined;

  return (
    <>
      <div className={styles.detailToolbarBar}>
        <div className={styles.detailToolbar}>
          <button type="button" className={styles.backButton} onClick={onBack} aria-label="Back to daily report">
            <ChevronLeftIcon />
          </button>
          <div className={styles.detailHeadingTextStack}>
            <span className={styles.detailHeadingTitle}>{report.label} Shift</span>
            {leadManager && leadManagerClock && (
              <span className={styles.shiftCardMeta}>
                Checked out by {leadManager.name} at {leadManagerClock.clockOut}
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
        </div>
      </div>

      <div className={styles.detailWrap}>
        <div className={styles.detailSections}>
        <Section title="Shift Managers">
          <div className={styles.managerList}>
            {report.managers.map((manager, index) => {
              const clock = report.managerClockTimes[manager.name];
              return (
                <div key={manager.name} className={[styles.statBox, styles.managerRow].join(" ")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={manager.avatar} alt="" className={styles.managerAvatar} />
                  <div className={styles.managerInfo}>
                    <span className={styles.managerName}>{manager.name}</span>
                    <span className={styles.managerPosition}>{manager.position}</span>
                    {index === 0 && clock && <span className={styles.managerCheckedOut}>Checked out at {clock.clockOut}</span>}
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
          <div className={styles.hoursHeadcountRow}>
            <div className={[styles.statBox, styles.hoursBox].join(" ")}>
              <LeadStatV2
                ringColor="var(--color-datavis-yellow-100)"
                percent={report.hoursPercent}
                amount={report.hoursCapturedLabel}
                label="Hours Captured"
                caption={`of ${report.hoursPaidLabel} shift time`}
              />
            </div>
            <button
              type="button"
              className={[styles.statBox, styles.statBoxButton, styles.headcountGrid].join(" ")}
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
          <div className={[styles.statBox, styles.areaCoverageBox].join(" ")}>
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
          <div className={[styles.statBox, styles.serviceCoverageBox].join(" ")}>
            <LeadStatV2
              ringColor="var(--color-datavis-purple-100)"
              percent={report.servicesPercent}
              amount={report.servicesCompletedCount.toLocaleString()}
              label="Services Completed"
              caption={`of ${report.servicesExpectedCount.toLocaleString()} expected`}
            />
          </div>
          <div className={styles.noteV2List}>
            {report.servicesNote.map((note, i) => (
              <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
            ))}
          </div>
        </Section>

        <Section title="Quality">
          <div className={styles.qualityBoxRow}>
            <div className={[styles.statBox, styles.qualityBox].join(" ")}>
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
            </div>

            <button
              type="button"
              className={[styles.statBox, styles.statBoxButton, styles.qualityBox].join(" ")}
              onClick={() => setReportItsModalOpen(true)}
            >
              <span className={styles.qualityBoxTitle}>Report Its</span>
              <div className={styles.qualityStatRow}>
                <HeadcountStat label="Submitted" value={report.totalReportIts} />
                <HeadcountStat label="Rejected" value={report.reportItsRejected} />
                <HeadcountStat label="Acceptance Rate" value={`${report.reportItsAcceptanceRate}%`} />
              </div>
            </button>

            <div className={[styles.statBox, styles.qualityBox].join(" ")}>
              <span className={styles.qualityBoxTitle}>Safety</span>
              <div className={styles.qualityStatRow}>
                <HeadcountStat label="Incidents" value={report.safetyIssues.length} />
                {report.safetyIssues.length > 0 && (
                  <div className={styles.headcountStat}>
                    <span className={styles.headcountLabel}>Incident Status</span>
                    <span className={styles.safetyReportStatusBadge}>
                      <CircleCheckIcon className={styles.safetyReportStatusIcon} /> Incident Report Created
                    </span>
                  </div>
                )}
              </div>
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

      <AssociateAttendanceModal
        open={headcountModalOpen}
        onClose={() => setHeadcountModalOpen(false)}
        shiftLabel={report.label}
        associates={report.associateAttendance}
      />

      <ReportItsModal open={reportItsModalOpen} onClose={() => setReportItsModalOpen(false)} shiftLabel={report.label} report={report} />
    </>
  );
}

/* ---------------- Shared small pieces (same as V2) ---------------- */

/** Figma node 108:12459: title, content, and note all sit as direct children of the same blue-tinted card, spaced by one uniform gap — no separate inner "body" wrapper. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
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
        <div className={styles.leadStatValueRow}>
          <span className={styles.leadStatStackValue}>{amount}</span>
          <span className={styles.leadStatValueLabel}>{label}</span>
        </div>
        <span className={styles.leadStatCaption}>{caption}</span>
      </div>
    </div>
  );
}

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
        <div className={styles.leadStatValueRow}>
          <span className={styles.leadStatStackValue}>{coverage.servicedCount.toLocaleString()}</span>
          <span className={styles.leadStatValueLabel}>Areas Serviced</span>
        </div>
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
