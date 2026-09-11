"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon, CircleXmarkIcon, MagnifyingGlassLocationIcon } from "./icons";
import type { ShiftReport, ShiftAreaTypeVerification, ShiftAreaVerification, ManagerNote } from "../../lib/mapShiftReportData";
import styles from "./MapShiftReportSections.module.css";

export type ZoomTarget = { areaId: string; displayName: string };

export type MapShiftReportSectionsProps = {
  report: ShiftReport;
  onZoomToArea: (area: ZoomTarget) => void;
};

/**
 * MapShiftReportSections — the shift-report body (Areas Missed,
 * Associate Hours, Scores, Safety Issues, Report-Its, Attendance
 * Issues, Projects, Notes), extracted so it can drop into
 * MapStatsPanel's own panel/scroll frame once a shift is selected
 * from MapShiftTimeline, replacing that panel's Area Types/Areas
 * lists. No panel chrome of its own (no header, no back button, no
 * manager avatar stack) — MapStatsPanel's header and shift-filter bar
 * already cover that. Every section is independently collapsible.
 */
export function MapShiftReportSections({ report, onZoomToArea }: MapShiftReportSectionsProps) {
  const [expandedAreaType, setExpandedAreaType] = useState<string | null>(null);

  return (
    <div className={styles.sections}>
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

/** A manager note attributed to its author (small avatar + name) with an absolute clock timestamp — shared by every note surface here (missed areas, hours, scores, report-its, and the general Notes list). Text may contain embedded "\n" line breaks (e.g. a multi-line handoff note) — each line renders as its own paragraph rather than collapsing into one run-on sentence. */
/** "QR Unreadable" -> "qr-unreadable", for the tag pill's data-tag selector. */
function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function NoteCallout({ note, compact = false }: { note: ManagerNote; compact?: boolean }) {
  return (
    <div className={[styles.noteCallout, compact ? styles.noteCalloutCompact : ""].filter(Boolean).join(" ")}>
      <div className={styles.noteCalloutText}>
        {note.text.split("\n").map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      {!compact && note.tags.length > 0 && (
        <div className={styles.noteCalloutTagRow}>
          {note.tags.map((tag) => (
            <span key={tag} className={styles.noteCalloutTag} data-tag={tagSlug(tag)}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className={styles.noteCalloutFooter}>
        {note.author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={note.author.avatar} alt="" className={styles.noteCalloutAvatar} />
        ) : (
          <span className={styles.noteCalloutAvatarFallback} aria-hidden="true" />
        )}
        <div className={styles.noteCalloutAuthorInfo}>
          <span className={styles.noteCalloutAuthor}>{note.author.name}</span>
          <span className={styles.noteCalloutTime}>{note.timestamp}</span>
        </div>
      </div>
    </div>
  );
}
