"use client";

import { useState } from "react";
import { LockIcon, PlusIcon } from "./icons";
import { ManagerAppNoteComposerModal } from "./ManagerAppNoteComposerModal";
import { ManagerAppScreenHeader } from "./ManagerAppScreenHeader";
import { getManager, SECTION_TITLES, type SectionKey, type ShiftNote, type ShiftReportState } from "../../lib/managerShiftReportData";
import styles from "./ManagerAppShiftReportSection.module.css";

export type ManagerAppShiftReportSectionProps = {
  shift: ShiftReportState;
  sectionKey: SectionKey;
  onBack: () => void;
  onAddNote: (sectionKey: SectionKey, text: string, tags: string[]) => void;
};

/**
 * ManagerAppShiftReportSection — full-screen detail for one Day
 * Shift Report section (pushed from ManagerAppShiftReportList, back
 * arrow returns there). Three fixed parts: the section's own
 * auto-captured data (read-only — never editable here), every
 * manager's existing notes on it so far, and a composer to add
 * another. Notes are additive: this never edits or removes another
 * manager's note, only appends the current manager's own.
 */
export function ManagerAppShiftReportSection({ shift, sectionKey, onBack, onAddNote }: ManagerAppShiftReportSectionProps) {
  const section = shift.sections[sectionKey];
  const isLocked = Boolean(shift.completedBy);
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className={styles.screen}>
      <ManagerAppScreenHeader title={SECTION_TITLES[sectionKey]} onBack={onBack} />
      <div className={styles.main}>
        <AutoCapturedData shift={shift} sectionKey={sectionKey} />

        <div className={styles.group}>
          <span className={styles.groupLabel}>Notes</span>
          {section.notes.length === 0 ? (
            <p className={styles.emptyNotes}>No notes yet — be the first to add one.</p>
          ) : (
            <div className={styles.notesList}>
              {section.notes.map((note) => (
                <NoteCard key={note.id} shift={shift} note={note} />
              ))}
            </div>
          )}
        </div>

        {isLocked ? (
          <div className={styles.lockedNotice}>
            <LockIcon className={styles.lockedIcon} />
            <span>This shift report has been completed and is locked — no further notes can be added.</span>
          </div>
        ) : (
          <button type="button" className={styles.addNoteTrigger} onClick={() => setComposerOpen(true)}>
            <PlusIcon />
            Add a Note
          </button>
        )}
      </div>

      <ManagerAppNoteComposerModal
        open={composerOpen}
        sectionTitle={SECTION_TITLES[sectionKey]}
        tagVocabulary={section.tagVocabulary}
        onCancel={() => setComposerOpen(false)}
        onSubmit={(text, tags) => {
          onAddNote(sectionKey, text, tags);
          setComposerOpen(false);
        }}
      />
    </div>
  );
}

function NoteCard({ shift, note }: { shift: ShiftReportState; note: ShiftNote }) {
  const author = getManager(shift, note.managerId);
  return (
    <div className={styles.noteCard}>
      <div className={styles.noteHeader}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={author?.avatar ?? ""} alt="" className={styles.noteAvatar} />
        <div className={styles.noteAuthor}>
          <span className={styles.noteName}>{author?.name ?? "Unknown manager"}</span>
          <span className={styles.noteRole}>{author?.role}</span>
        </div>
        <span className={styles.noteTimestamp}>{note.timestamp}</span>
      </div>
      <p className={styles.noteText}>{note.text}</p>
      {note.tags.length > 0 && (
        <div className={styles.noteTagRow}>
          {note.tags.map((tag) => (
            <span key={tag} className={styles.noteTag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AutoCapturedData({ shift, sectionKey }: { shift: ShiftReportState; sectionKey: SectionKey }) {
  const s = shift.sections;

  if (sectionKey === "shiftNotes") {
    return (
      <div className={styles.group}>
        <span className={styles.groupLabel}>Auto-Captured Data</span>
        <div className={styles.card}>
          <p className={styles.readOnlyHint}>Shift Notes has no auto-captured data — it&rsquo;s a running log of manager notes only.</p>
        </div>
      </div>
    );
  }

  if (sectionKey === "hoursHeadcount") {
    const d = s.hoursHeadcount;
    return (
      <div className={styles.group}>
        <span className={styles.groupLabel}>Auto-Captured Data</span>
        <div className={styles.card}>
          <div className={styles.headline}>
            <span className={styles.headlineValue}>{d.percentCaptured}%</span>
            <span className={styles.headlineCaption}>
              {d.hoursCaptured} of {d.totalTime} paid time captured
            </span>
          </div>
          <div className={styles.statGrid}>
            <StatTile label="Scheduled Headcount" value={d.scheduledHeadcount} />
            <StatTile label="Actual Arrival" value={d.actualArrival} />
            <StatTile label="Total Absences" value={d.totalAbsences} />
            <StatTile label="No Call/No Show" value={d.noCallNoShow} />
            <StatTile label="Call Outs" value={d.callOuts} />
          </div>
          <p className={styles.readOnlyHint}>Auto-captured by 4Insite — not editable here.</p>
        </div>
      </div>
    );
  }

  if (sectionKey === "areaCoverage") {
    const d = s.areaCoverage;
    return (
      <div className={styles.group}>
        <span className={styles.groupLabel}>Auto-Captured Data</span>
        <div className={styles.card}>
          <div className={styles.headline}>
            <span className={styles.headlineValue}>{d.percentServiced}%</span>
            <span className={styles.headlineCaption}>
              {d.areasServiced.toLocaleString()} of {d.areasTotal.toLocaleString()} areas serviced
            </span>
          </div>
          <div>
            <BreakdownRow tone="warning" label="Not Serviced" value={d.breakdown.notServiced} />
            <BreakdownRow tone="warning" label="Under Serviced" value={d.breakdown.underServiced} />
            <BreakdownRow tone="success" label="Fully Serviced" value={d.breakdown.fullyServiced} />
            <BreakdownRow tone="neutral" label="Over Serviced" value={d.breakdown.overServiced} />
          </div>
          <p className={styles.readOnlyHint}>
            Calculated automatically by 4Insite — rolls up into the Daily Report&rsquo;s own Areas Serviced breakdown. Not editable here.
          </p>
        </div>
      </div>
    );
  }

  if (sectionKey === "serviceCoverage") {
    const d = s.serviceCoverage;
    return (
      <div className={styles.group}>
        <span className={styles.groupLabel}>Auto-Captured Data</span>
        <div className={styles.card}>
          <div className={styles.headline}>
            <span className={styles.headlineValue}>{d.percentCompleted}%</span>
            <span className={styles.headlineCaption}>
              {d.servicesCompleted.toLocaleString()} of {d.servicesExpected.toLocaleString()} services completed
            </span>
          </div>
          <p className={styles.readOnlyHint}>Auto-captured by 4Insite — not editable here.</p>
        </div>
      </div>
    );
  }

  const d = s.quality;
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>Auto-Captured Data</span>
      <div className={styles.card}>
        <div className={styles.qualityRow}>
          <QualityCard label="AI Verification" score={d.aiVerification.score} count={d.aiVerification.count} unit={d.aiVerification.unit} />
          <QualityCard label="Internal Audit" score={d.internalAudit.score} count={d.internalAudit.count} unit={d.internalAudit.unit} />
          <QualityCard label="Customer Audit" score={d.customerAudit.score} count={d.customerAudit.count} unit={d.customerAudit.unit} />
        </div>
        <div>
          <div className={styles.inlineStatRow}>
            <span className={styles.inlineStatLabel}>Report-Its</span>
            <span className={styles.inlineStatValue}>
              {d.reportIts.submitted} submitted · {d.reportIts.rejected} rejected · {d.reportIts.acceptanceRate}% accepted
            </span>
          </div>
          <div className={styles.inlineStatRow}>
            <span className={styles.inlineStatLabel}>Safety</span>
            <span className={styles.inlineStatValue}>
              {d.safety.incidents} incident{d.safety.incidents === 1 ? "" : "s"} · {d.safety.reportStatus}
            </span>
          </div>
        </div>
        <p className={styles.readOnlyHint}>Auto-captured by 4Insite — not editable here.</p>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.statTile}>
      <span className={styles.statValue}>{value.toLocaleString()}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function QualityCard({ label, score, count, unit }: { label: string; score: number; count: number; unit: string }) {
  return (
    <div className={styles.qualityCard}>
      <span className={styles.qualityScore}>{score.toFixed(2)}</span>
      <span className={styles.qualityLabel}>{label}</span>
      <span className={styles.qualityCaption}>
        {count.toLocaleString()} {unit}
      </span>
    </div>
  );
}

function BreakdownRow({ tone, label, value }: { tone: "neutral" | "warning" | "success"; label: string; value: number }) {
  return (
    <div className={styles.breakdownRow}>
      <span className={styles.breakdownDot} data-tone={tone} aria-hidden="true">
        ●
      </span>
      <span className={styles.breakdownLabel}>{label}</span>
      <span className={styles.breakdownValue}>{value.toLocaleString()}</span>
    </div>
  );
}
