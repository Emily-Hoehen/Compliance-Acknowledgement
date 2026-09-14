"use client";

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheckIcon,
  BriefcaseIcon,
  CircleCheckIcon,
  CircleXmarkIcon,
  ClockIcon,
  MessageExclamationIcon,
  PinIcon,
  TriangleExclamationIcon,
  UsersIcon,
  XmarkIcon,
} from "./icons";
import { DonutRing } from "../ui/Charts";
import { NoteCallout, NoteCalloutList } from "./MapShiftReportSections";
import type { DailyReportPerson } from "../../lib/mapPageData";
import type { SafetyIncident, SafetyIncidentStage, ShiftAreaTypeVerification, ShiftReport } from "../../lib/mapShiftReportData";
import { photoForAreaType } from "../../lib/sowImages";
import styles from "./FullShiftReportModal.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "2-digit", year: "numeric" });
const SAFETY_STAGES: SafetyIncidentStage[] = ["Incident Report", "Investigation", "Claims Review"];

/** "8h 12min" → 492 (total minutes) — for summing every manager's own total time into the sidebar's "Manager hours" figure. Exported for FullDayReportModal, which reuses this plus the presentational pieces below to combine all three shifts' reports into one. */
export function parseTotalTimeToMinutes(label: string | undefined): number {
  if (!label) return 0;
  const match = label.match(/(\d+)h\s*(\d+)min/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function formatMinutesToHoursLabel(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`;
}

/** "1,138h 5m" → 68,285 (total minutes) — for summing shift-level Hours Captured/Paid labels (a different string shape than manager total-time labels: "h"/"m" not "h"/"min") across all three shifts. */
export function parseHoursLabelToMinutes(label: string): number {
  const match = label.replace(/,/g, "").match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export type FullShiftReportModalProps = {
  report: ShiftReport;
  siteName: string;
  date: Date;
  /** The site's manager-of-record — who this shift's report gets signed off by. */
  siteManager: DailyReportPerson;
  onClose: () => void;
};

/**
 * FullShiftReportModal — a full-page, dark-theme takeover for one shift's
 * complete report (Managers, Shift Notes, Services Completed, Hours
 * Captured, Attendance, Associates, Quality Scores, Safety Issues,
 * Report-Its, Projects, Sign-Off). No Figma source: the outer chrome
 * (top bar + Close, big title/subtitle) takes its cue from this app's
 * other full-page takeovers; the numbered-section-plus-persistent-
 * sidebar-summary layout is modeled on a reference "daily manager
 * report" screenshot the user supplied, reinterpreted in this
 * feature's own dark card language (Neutral/800 surfaces,
 * wash-neutral-15 hairlines) rather than that reference's light theme.
 * Distinct from MapShiftReportSections, which packs a narrower subset
 * of this same ShiftReport into MapStatsPanel's 380px sidebar — this
 * is the spacious, print-friendly version of the same data, one shift
 * at a time.
 */
export function FullShiftReportModal({ report, siteName, date, siteManager, onClose }: FullShiftReportModalProps) {
  const [signOff, setSignOff] = useState<{ timestamp: string } | null>(null);
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

  const totalManagerMinutes = report.managers.reduce((sum, m) => sum + parseTotalTimeToMinutes(report.managerClockTimes[m.name]?.totalTimeLabel), 0);

  function handleSignOff() {
    setSignOff({ timestamp: new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }) });
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="full-shift-report-title" ref={overlayRef} tabIndex={-1}>
        <header className={styles.headerBlock}>
          <div className={styles.headerBlockInner}>
            <div className={styles.headerText}>
              <span className={styles.siteChip}>
                <PinIcon className={styles.siteChipIcon} />
                {siteName}
              </span>
              <h1 id="full-shift-report-title" className={styles.title}>
                {report.label} Shift Report
              </h1>
              <p className={styles.subtitle}>
                {siteName} &middot; {dateFormatter.format(date)} &middot; {report.timeRange}
              </p>
            </div>
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
              <XmarkIcon />
            </button>
          </div>
        </header>

        <div className={styles.scrollArea}>
          <div className={styles.body}>
            <div className={styles.mainColumn}>
              <NumberedSection index={1} title="Managers">
                <div className={styles.managerTable}>
                  {report.managers.map((manager) => {
                    const clock = report.managerClockTimes[manager.name];
                    return (
                      <div key={manager.name} className={styles.managerTableRow}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={manager.avatar} alt="" className={styles.managerAvatar} />
                        <div className={styles.managerInfo}>
                          <span className={styles.managerName}>{manager.name}</span>
                          <span className={styles.managerPosition}>{manager.position}</span>
                        </div>
                        <TimeStat label="Clocked In" value={clock?.clockIn ?? "—"} />
                        <TimeStat label="Clocked Out" value={clock?.clockOut ?? "—"} />
                        <TimeStat label="Total Time" value={clock?.totalTimeLabel ?? "—"} strong />
                      </div>
                    );
                  })}
                </div>
              </NumberedSection>

              <NumberedSection index={2} title="Shift Notes">
                {report.notes.map((note, i) => (
                  <NoteCallout key={`${note.author.name}-${i}`} note={note} />
                ))}
              </NumberedSection>

              <NumberedSection index={3} title="Services Completed">
                <div className={styles.leadStatRow}>
                  <div className={styles.leadStatText}>
                    <span className={styles.leadStatValue}>{report.servicesCompletedCount.toLocaleString()}</span>
                    <span className={styles.leadStatCaption}>of {report.servicesExpectedCount.toLocaleString()} expected services</span>
                  </div>
                  <div className={styles.leadStatRing}>
                    <DonutRing percent={report.servicesPercent} color="var(--color-datavis-purple-100)" trackColor="var(--color-neutral-700)" size={72} strokeWidth={7} />
                    <span className={styles.leadStatRingLabel}>{report.servicesPercent}%</span>
                  </div>
                </div>

                {report.areaTypesAffected.length > 0 ? (
                  <div className={styles.subsection}>
                    <span className={styles.subsectionHeading}>
                      {report.areasMissedCount.toLocaleString()} of {report.totalAreas.toLocaleString()} areas missed a service
                    </span>
                    <div className={styles.missedAreaTypeList}>
                      {report.areaTypesAffected.map((areaType) => (
                        <MissedAreaTypeCard key={areaType.name} areaType={areaType} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className={styles.emptyStateText}>Every area hit its expected services this shift.</p>
                )}
              </NumberedSection>

              <NumberedSection index={4} title="Hours Captured">
                <div className={styles.leadStatRow}>
                  <div className={styles.leadStatText}>
                    <span className={styles.leadStatValue}>{report.hoursCapturedLabel}</span>
                    <span className={styles.leadStatCaption}>of {report.hoursPaidLabel} shift time</span>
                  </div>
                  <div className={styles.leadStatRing}>
                    <DonutRing percent={report.hoursPercent} color="var(--color-datavis-yellow-100)" trackColor="var(--color-neutral-700)" size={72} strokeWidth={7} />
                    <span className={styles.leadStatRingLabel}>{report.hoursPercent}%</span>
                  </div>
                </div>
                <NoteCalloutList notes={report.hoursNote} />
              </NumberedSection>

              <NumberedSection index={5} title="Attendance">
                <div className={styles.attendanceGrid}>
                  <AttendanceTile label="Scheduled Headcount" value={report.scheduledHeadcount} />
                  <AttendanceTile label="Actual Arrival" value={report.actualArrival} />
                  <AttendanceTile label="Total Absences" value={report.totalAbsences} />
                  <AttendanceTile label="No Call/No Show" value={report.noCallNoShowCount} />
                  <AttendanceTile label="Call Outs" value={report.callOutsCount} />
                </div>
                {report.attendanceIssues.length > 0 && (
                  <div className={styles.issueList}>
                    {report.attendanceIssues.map((issue) => (
                      <div key={issue.title} className={styles.issueRow}>
                        <span className={styles.issueTitle}>{issue.title}</span>
                        <p className={styles.issueDetail}>{issue.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </NumberedSection>

              <NumberedSection index={6} title="Associates on Shift" headerExtra={<span className={styles.inlineCount}>{report.associates.length}</span>}>
                <div className={styles.associateGrid}>
                  {report.associates.map((associate) => (
                    <div key={associate.name} className={styles.associateCard}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={associate.avatar} alt="" className={styles.associateAvatar} />
                      <div className={styles.associateInfo}>
                        <span className={styles.associateName}>{associate.name}</span>
                        <span className={styles.associatePosition}>{associate.position}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <NoteCalloutList notes={report.associatesNote} />
              </NumberedSection>

              <NumberedSection index={7} title="Quality Scores">
                <div className={styles.qualityList}>
                  {report.qualityScores.map((score) => (
                    <div key={score.label} className={styles.qualityRow}>
                      <div className={styles.qualityText}>
                        <span className={styles.qualityLabel}>{score.label}</span>
                        <span className={styles.qualityCount}>{score.count}</span>
                      </div>
                      <span className={styles.qualityChip} data-tone={score.tone}>
                        {score.value}
                      </span>
                    </div>
                  ))}
                </div>
                <NoteCalloutList notes={report.scoresNote} />
              </NumberedSection>

              <NumberedSection index={8} title="Safety Issues">
                {report.safetyIssues.length === 0 ? (
                  <p className={styles.emptyStateText}>No safety issues reported this shift.</p>
                ) : (
                  <div className={styles.safetyList}>
                    {report.safetyIssues.map((incident) => (
                      <SafetyIncidentCard key={incident.title} incident={incident} />
                    ))}
                  </div>
                )}
              </NumberedSection>

              <NumberedSection index={9} title="Report-Its" headerExtra={<span className={styles.inlineCount}>{report.totalReportIts}</span>}>
                {report.reportItems.length > 0 && (
                  <div className={styles.reportItemList}>
                    {report.reportItems.map((item, i) => (
                      <div key={`${item.title}-${i}`} className={styles.reportItemRow}>
                        <MessageExclamationIcon className={styles.reportItemIcon} />
                        <span className={styles.reportItemTitle}>{item.title}</span>
                        <span className={styles.reportItemTag}>{item.tag}</span>
                      </div>
                    ))}
                  </div>
                )}
                <NoteCalloutList notes={report.reportItsNote} />
              </NumberedSection>

              <NumberedSection index={10} title="Projects">
                <div className={styles.projectList}>
                  {report.projects.map((project) => (
                    <div key={project.name} className={styles.projectRow}>
                      <span className={styles.projectName}>{project.name}</span>
                      <span className={styles.projectStatus} data-status={project.status}>
                        {project.status}
                      </span>
                    </div>
                  ))}
                </div>
              </NumberedSection>

              <NumberedSection index={11} title="Site Manager Sign-Off">
                <div className={styles.signOffCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={siteManager.avatar} alt="" className={styles.signOffAvatar} />
                  <div className={styles.signOffInfo}>
                    <span className={styles.signOffName}>{siteManager.name}</span>
                    <span className={styles.signOffPosition}>{siteManager.position}</span>
                  </div>
                  {signOff ? (
                    <span className={styles.signOffComplete}>
                      <CircleCheckIcon className={styles.signOffCompleteIcon} />
                      Signed off at {signOff.timestamp}
                    </span>
                  ) : (
                    <button type="button" className={styles.signOffButton} onClick={handleSignOff}>
                      <BadgeCheckIcon className={styles.signOffButtonIcon} />
                      Sign Off on This Report
                    </button>
                  )}
                </div>
              </NumberedSection>
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryStatus} data-signed={Boolean(signOff)}>
                  {signOff ? "Signed Off" : "Pending Sign-Off"}
                </span>
                <h2 className={styles.summaryTitle}>{report.label} Shift</h2>
                <span className={styles.summaryTime}>{report.timeRange}</span>

                <div className={styles.summaryStats}>
                  <SummaryStatRow icon={<UsersIcon />} label="Managers on Site" value={report.managers.length.toLocaleString()} />
                  <SummaryStatRow icon={<ClockIcon />} label="Manager Hours" value={formatMinutesToHoursLabel(totalManagerMinutes)} />
                  <SummaryStatRow icon={<UsersIcon />} label="Associates on Site" value={report.associates.length.toLocaleString()} />
                  <SummaryStatRow icon={<BriefcaseIcon />} label="Services Completed" value={`${report.servicesPercent}%`} />
                  <SummaryStatRow icon={<ClockIcon />} label="Hours Captured" value={`${report.hoursPercent}%`} />
                  {report.safetyIssues.length > 0 && (
                    <SummaryStatRow icon={<TriangleExclamationIcon />} label="Safety Issues" value={report.safetyIssues.length.toLocaleString()} />
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NumberedSection({ index, title, headerExtra, children }: { index: number; title: string; headerExtra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionBadge}>{index}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {headerExtra}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export function TimeStat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={styles.timeStat}>
      <span className={strong ? styles.timeStatValueStrong : styles.timeStatValue}>{value}</span>
      <span className={styles.timeStatLabel}>{label}</span>
    </div>
  );
}

export function AttendanceTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.attendanceTile}>
      <span className={styles.attendanceTileValue}>{value.toLocaleString()}</span>
      <span className={styles.attendanceTileLabel}>{label}</span>
    </div>
  );
}

export function SummaryStatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={styles.summaryStatRow}>
      <span className={styles.summaryStatIcon}>{icon}</span>
      <span className={styles.summaryStatLabel}>{label}</span>
      <span className={styles.summaryStatValue}>{value}</span>
    </div>
  );
}

export function MissedAreaTypeCard({ areaType }: { areaType: ShiftAreaTypeVerification }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={styles.missedAreaTypeCard}>
      <button type="button" className={styles.missedAreaTypeHeader} onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <div className={styles.missedAreaTypeThumb}>
          {areaType.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={areaType.photo} alt="" className={styles.missedAreaTypeThumbImage} />
          )}
        </div>
        <div className={styles.missedAreaTypeText}>
          <span className={styles.missedAreaTypeName}>{areaType.name}</span>
          <span className={styles.missedAreaTypeMeta}>
            {areaType.areasMissed} of {areaType.areasTotal} areas missed
          </span>
        </div>
      </button>
      {expanded && (
        <div className={styles.missedAreaList}>
          {areaType.missedAreas.map((area) => (
            <div key={area.areaId} className={styles.missedAreaRow}>
              <div className={styles.missedAreaHeader}>
                <CircleXmarkIcon className={styles.missedAreaIcon} />
                <span className={styles.missedAreaName}>{area.displayName}</span>
                <span className={styles.missedAreaServiceLabel}>
                  {area.servicesCompleted} of {area.servicesExpected} services
                </span>
              </div>
              {area.managerNote && <NoteCallout note={area.managerNote} compact />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SafetyIncidentCard({ incident }: { incident: SafetyIncident }) {
  const stageIndex = incident.stage === "Closed" ? SAFETY_STAGES.length : SAFETY_STAGES.indexOf(incident.stage);
  return (
    <div className={styles.safetyCard}>
      <div className={styles.safetyHeader}>
        <TriangleExclamationIcon className={styles.safetyIcon} />
        <span className={styles.safetyTitle}>{incident.title}</span>
        <span className={styles.safetyCategory}>{incident.category}</span>
      </div>
      <p className={styles.safetyDetail}>{incident.detail}</p>
      <div className={styles.safetyTracker}>
        {SAFETY_STAGES.map((stage, i) => {
          const complete = i < stageIndex || incident.stage === "Closed";
          const current = i === stageIndex && incident.stage !== "Closed";
          return (
            <div key={stage} className={styles.safetyTrackerStep}>
              <div className={styles.safetyTrackerDotRow}>
                <span className={styles.safetyTrackerDot} data-state={complete ? "complete" : current ? "current" : "pending"}>
                  {complete && <CircleCheckIcon className={styles.safetyTrackerCheck} />}
                </span>
                {i < SAFETY_STAGES.length - 1 && <span className={styles.safetyTrackerLine} data-state={complete ? "complete" : "pending"} />}
              </div>
              <span className={styles.safetyTrackerLabel}>{stage}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
