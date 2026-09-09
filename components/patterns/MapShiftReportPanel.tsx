"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon, ChevronLeftIcon, CircleXmarkIcon, MagnifyingGlassLocationIcon } from "./icons";
import type { ShiftReport, ShiftAreaTypeVerification, ShiftAreaVerification, ManagerNote } from "../../lib/mapShiftReportData";
import type { DailyReportPerson } from "../../lib/mapPageData";
import styles from "./MapShiftReportPanel.module.css";

export type ZoomTarget = { areaId: string; displayName: string };

export type MapShiftReportPanelProps = {
  report: ShiftReport;
  onBack: () => void;
  onZoomToArea: (area: ZoomTarget) => void;
};

/**
 * MapShiftReportPanel — the Map feature's right overlay card once a
 * shift is selected from MapDailyReportPanel: a drill-down into that
 * shift's missed areas, hours, scores, issues, projects and notes.
 * No Figma source — a new surface designed to match MapStatsPanel/
 * MapDailyReportPanel's established card language (solid Neutral/850
 * panel, sticky header, hidden-scrollbar body, hairline section
 * dividers) rather than introduce a new visual system.
 *
 * Centered on Areas Missed rather than a Verifications-vs-Expected
 * framing: the lead stat and its area-type/area drill-down reuse the
 * same real total-areas-for-shift count the Daily Report cards show.
 * No donut rings — every metric here is a plain stat + label. Every
 * manager note carries its author's avatar/name and a relative
 * timestamp, via the shared NoteCallout below. Every section is its
 * own collapsible disclosure (ReportSection), independent of the
 * finer-grained per-area-type drill-down inside Areas Missed. The
 * header's avatar stack mirrors MapDailyReportPanel's own manager
 * stack (hover/focus an avatar for its name + title tooltip).
 */
export function MapShiftReportPanel({ report, onBack, onZoomToArea }: MapShiftReportPanelProps) {
  const [expandedAreaType, setExpandedAreaType] = useState<string | null>(null);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="Back to Daily Report">
          <ChevronLeftIcon />
        </button>
        <div className={styles.headerText}>
          <span className={styles.title}>{report.label} Shift Report</span>
          <span className={styles.subtitle}>{report.timeRange}</span>
        </div>
        <ManagerStack managers={report.managers} />
      </div>

      <div className={styles.scrollBody}>
        <ReportSection title="Areas Missed">
          <div className={styles.leadStatBlock}>
            <span className={styles.leadStatValue}>
              {report.areasMissedCount.toLocaleString()} <span className={styles.leadStatValueMuted}>of {report.totalAreas.toLocaleString()}</span>
            </span>
            <span className={styles.leadStatCaption}>areas missed this shift</span>
          </div>

          <div className={styles.areaTypeList}>
            {report.areaTypesAffected.map((areaType) => (
              <AreaTypeRow
                key={areaType.name}
                areaType={areaType}
                expanded={expandedAreaType === areaType.name}
                onToggle={() => setExpandedAreaType((current) => (current === areaType.name ? null : areaType.name))}
                onZoomToArea={onZoomToArea}
              />
            ))}
          </div>
        </ReportSection>

        <div className={styles.hairline} />

        <ReportSection title="Associate Hours">
          <div className={styles.leadStatBlock}>
            <span className={styles.leadStatValue}>
              {report.hoursCapturedLabel} <span className={styles.leadStatValueMuted}>of {report.hoursPaidLabel}</span>
            </span>
            <span className={styles.leadStatCaption}>{report.hoursPercent}% of paid hours captured</span>
          </div>
          {report.hoursNote && <NoteCallout note={report.hoursNote} />}
        </ReportSection>

        <div className={styles.hairline} />

        <ReportSection title="Scores">
          <NoteCallout note={report.scoresNote} />
        </ReportSection>

        <div className={styles.hairline} />

        <ReportSection title="Safety Issues">
          <IssueList issues={report.safetyIssues} emptyLabel="No safety issues reported" />
        </ReportSection>

        <div className={styles.hairline} />

        <ReportSection title="Report-Its" headerExtra={<span className={styles.inlineStatValue}>{report.totalReportIts}</span>}>
          <NoteCallout note={report.reportItsNote} />
        </ReportSection>

        <div className={styles.hairline} />

        <ReportSection title="Attendance Issues">
          <IssueList issues={report.attendanceIssues} emptyLabel="No attendance issues reported" />
        </ReportSection>

        <div className={styles.hairline} />

        <ReportSection title="Projects">
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
        </ReportSection>

        <div className={styles.hairline} />

        <ReportSection title="Notes">
          <div className={styles.noteList}>
            {report.notes.map((note, i) => (
              <NoteCallout key={`${note.author.name}-${i}`} note={note} />
            ))}
          </div>
        </ReportSection>
      </div>
    </div>
  );
}

type ReportSectionProps = {
  title: string;
  /** Extra content shown next to the title, always visible regardless of collapse state — e.g. Report-Its' count. */
  headerExtra?: ReactNode;
  children: ReactNode;
};

/** One collapsible section of the Shift Report — click the heading to hide/show its body. Defaults open so nothing already-visible disappears until the user chooses to collapse it. */
function ReportSection({ title, headerExtra, children }: ReportSectionProps) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section className={styles.section}>
      <button type="button" className={styles.sectionHeaderButton} onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <h3 className={styles.sectionHeading}>{title}</h3>
        {headerExtra}
        <ChevronDownIcon className={[styles.sectionCaret, expanded ? styles.sectionCaretOpen : ""].filter(Boolean).join(" ")} />
      </button>
      {expanded && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}

/** Overlapping avatar stack for the header — same pattern as MapDailyReportPanel's manager stack (hover/focus an avatar for its name + title tooltip). */
function ManagerStack({ managers }: { managers: DailyReportPerson[] }) {
  return (
    <div className={styles.managerStack}>
      {managers.map((manager) => (
        <div key={manager.name} className={styles.managerAvatarWrap} tabIndex={0}>
          <img src={manager.avatar} alt={manager.name} className={styles.managerAvatar} />
          <div className={styles.managerTooltip} role="tooltip">
            <span className={styles.managerTooltipName}>{manager.name}</span>
            <span className={styles.managerTooltipRole}>{manager.position}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type AreaTypeRowProps = {
  areaType: ShiftAreaTypeVerification;
  expanded: boolean;
  onToggle: () => void;
  onZoomToArea: (area: ZoomTarget) => void;
};

function AreaTypeRow({ areaType, expanded, onToggle, onZoomToArea }: AreaTypeRowProps) {
  return (
    <div className={styles.areaTypeRow}>
      <button type="button" className={styles.areaTypeRowHeader} onClick={onToggle} aria-expanded={expanded}>
        <div className={styles.areaTypeThumb}>
          {areaType.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={areaType.photo} alt="" className={styles.areaTypeThumbImage} />
          ) : null}
        </div>
        <div className={styles.areaTypeText}>
          <span className={styles.areaTypeName}>{areaType.name}</span>
          <span className={styles.areaTypeMeta}>
            {areaType.areasMissed} of {areaType.areasTotal} areas missed
          </span>
        </div>
        <ChevronDownIcon className={[styles.areaTypeCaret, expanded ? styles.areaTypeCaretOpen : ""].filter(Boolean).join(" ")} />
      </button>

      {expanded && (
        <div className={styles.areaList}>
          {areaType.missedAreas.map((area) => (
            <AreaRow key={area.areaId} area={area} onZoomToArea={onZoomToArea} />
          ))}
        </div>
      )}
    </div>
  );
}

function AreaRow({ area, onZoomToArea }: { area: ShiftAreaVerification; onZoomToArea: (area: ZoomTarget) => void }) {
  const percent = Math.round((area.servicesCompleted / area.servicesExpected) * 100);
  return (
    <div className={styles.areaRow}>
      <div className={styles.areaRowHeader}>
        <CircleXmarkIcon className={styles.areaMissedIcon} />
        <span className={styles.areaName}>{area.displayName}</span>
        <button type="button" className={styles.zoomButton} onClick={() => onZoomToArea({ areaId: area.areaId, displayName: area.displayName })}>
          <MagnifyingGlassLocationIcon className={styles.zoomButtonIcon} />
          Zoom
        </button>
      </div>
      <div className={styles.areaServiceBar}>
        <div className={styles.areaServiceBarTrack}>
          <div className={styles.areaServiceBarFill} style={{ width: `${percent}%` }} />
        </div>
        <span className={styles.areaServiceBarLabel}>
          {area.servicesCompleted} of {area.servicesExpected} services
        </span>
      </div>
      {area.managerNote && <NoteCallout note={area.managerNote} compact />}
    </div>
  );
}

function IssueList({ issues, emptyLabel }: { issues: { title: string; detail: string }[]; emptyLabel: string }) {
  if (issues.length === 0) {
    return <p className={styles.emptyIssueLabel}>{emptyLabel}</p>;
  }
  return (
    <div className={styles.issueList}>
      {issues.map((issue) => (
        <div key={issue.title} className={styles.issueRow}>
          <span className={styles.issueTitle}>{issue.title}</span>
          <p className={styles.issueDetail}>{issue.detail}</p>
        </div>
      ))}
    </div>
  );
}

/** A manager note attributed to its author (small avatar + name) with a relative timestamp — shared by every note surface in this panel (missed areas, hours, scores, report-its, and the general Notes list). */
function NoteCallout({ note, compact = false }: { note: ManagerNote; compact?: boolean }) {
  return (
    <div className={[styles.noteCallout, compact ? styles.noteCalloutCompact : ""].filter(Boolean).join(" ")}>
      <div className={styles.noteCalloutHeader}>
        {note.author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={note.author.avatar} alt="" className={styles.noteCalloutAvatar} />
        ) : (
          <span className={styles.noteCalloutAvatarFallback} aria-hidden="true" />
        )}
        <span className={styles.noteCalloutAuthor}>{note.author.name}</span>
        <span className={styles.noteCalloutTime}>{note.timestamp}</span>
      </div>
      <p className={styles.noteCalloutText}>{note.text}</p>
    </div>
  );
}
