"use client";

import { useEffect, useRef, useState } from "react";
import { XmarkIcon } from "./icons";
import styles from "./ManagerAppNoteComposerModal.module.css";

export type ManagerAppNoteComposerModalProps = {
  open: boolean;
  sectionTitle: string;
  tagVocabulary: string[];
  /** When set, the composer opens pre-filled with this note's text/tags and reads "Edit Note" instead of "Add Note". */
  initialNote?: { text: string; tags: string[] } | null;
  onCancel: () => void;
  onSubmit: (text: string, tags: string[]) => void;
};

const EXIT_DURATION_MS = 220;

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/**
 * ManagerAppNoteComposerModal — full-page "Add Note" modal for a Day
 * Shift Report section. Presented modally (X to cancel, Post to
 * submit) rather than pushed with a back arrow, since it creates new
 * content rather than drilling into existing content. Slides up over
 * the whole screen like ManagerAppClockSheet's bottom sheet slides
 * over part of it, and stays mounted through its own exit animation
 * the same way.
 *
 * Also prototypes the Android soft keyboard: a keyboard mockup docks
 * to the bottom while the note textarea is focused, sliding away on
 * blur. It's a visual stand-in, not a real IME — typing still goes
 * through the actual textarea (real keyboard on a real device, or
 * your own keyboard here), but its keys are wired up to actually
 * edit the note text so clicking through the prototype works too.
 */
export function ManagerAppNoteComposerModal({ open, tagVocabulary, initialNote, onCancel, onSubmit }: ManagerAppNoteComposerModalProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setText(initialNote?.text ?? "");
      setSelectedTags(initialNote?.tags ?? []);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timeout = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      setText("");
      setSelectedTags([]);
      setKeyboardVisible(false);
    }, EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (mounted && !closing) textareaRef.current?.focus({ preventScroll: true });
  }, [mounted, closing]);

  if (!mounted) return null;

  function toggleTag(tag: string) {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  function handlePost() {
    const trimmed = text.trim();
    if (!trimmed && selectedTags.length === 0) return;
    onSubmit(trimmed, selectedTags);
  }

  function insertAtCursor(insert: string) {
    const el = textareaRef.current;
    if (!el) {
      setText((current) => current + insert);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + insert + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + insert.length;
      el.setSelectionRange(caret, caret);
    });
  }

  function handleBackspace() {
    const el = textareaRef.current;
    if (!el) {
      setText((current) => current.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    if (start === end) {
      if (start === 0) return;
      const next = text.slice(0, start - 1) + text.slice(end);
      setText(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start - 1, start - 1);
      });
    } else {
      const next = text.slice(0, start) + text.slice(end);
      setText(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start);
      });
    }
  }

  return (
    <div className={[styles.overlay, closing ? styles.overlayClosing : ""].filter(Boolean).join(" ")}>
      <div className={styles.modal}>
        <div className={styles.topBar}>
          <button type="button" className={styles.iconButton} onClick={onCancel} aria-label="Cancel">
            <XmarkIcon />
          </button>
          <span className={styles.topBarTitle}>{initialNote ? "Edit Note" : "Add Note"}</span>
          <span className={styles.iconButton} aria-hidden="true" />
        </div>

        <div className={[styles.body, keyboardVisible ? styles.bodyKeyboardPadding : ""].filter(Boolean).join(" ")}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="Add a note to the shift report"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setKeyboardVisible(true)}
            onBlur={() => setKeyboardVisible(false)}
          />

          <span className={styles.tagPickerLabel}>Add tags to your note</span>
          <div className={styles.tagPickerRow}>
            {tagVocabulary.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={[styles.tagOption, selected ? styles.tagOptionSelected : ""].filter(Boolean).join(" ")}
                  aria-pressed={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.bottomDock}>
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.saveButton}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handlePost}
              disabled={text.trim().length === 0 && selectedTags.length === 0}
            >
              Save Note
            </button>
          </div>

          <AndroidKeyboard
            visible={keyboardVisible}
            onKey={(letter) => insertAtCursor(letter)}
            onSpace={() => insertAtCursor(" ")}
            onEnter={() => insertAtCursor("\n")}
            onBackspace={handleBackspace}
          />
        </div>
      </div>
    </div>
  );
}

function AndroidKeyboard({
  visible,
  onKey,
  onSpace,
  onEnter,
  onBackspace,
}: {
  visible: boolean;
  onKey: (letter: string) => void;
  onSpace: () => void;
  onEnter: () => void;
  onBackspace: () => void;
}) {
  return (
    <div className={[styles.keyboard, visible ? styles.keyboardVisible : ""].filter(Boolean).join(" ")} aria-hidden={!visible}>
      <div className={styles.keyboardSuggestionRow}>
        <span className={styles.keyboardSuggestion}>Staffing</span>
        <span className={styles.keyboardSuggestion}>Staffed</span>
        <span className={styles.keyboardSuggestion}>Staff</span>
      </div>
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={row} className={styles.keyboardRow}>
          {i === 2 && (
            <button type="button" className={[styles.key, styles.keyWide].join(" ")} tabIndex={-1}>
              ⇧
            </button>
          )}
          {row.split("").map((letter) => (
            <button key={letter} type="button" className={styles.key} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => onKey(letter)}>
              {letter}
            </button>
          ))}
          {i === 2 && (
            <button type="button" className={[styles.key, styles.keyWide].join(" ")} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={onBackspace}>
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className={styles.keyboardRow}>
        <button type="button" className={[styles.key, styles.keyWide].join(" ")} tabIndex={-1}>
          123
        </button>
        <button type="button" className={styles.key} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => onKey(",")}>
          ,
        </button>
        <button type="button" className={[styles.key, styles.keySpace].join(" ")} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={onSpace}>
          {" "}
        </button>
        <button type="button" className={styles.key} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => onKey(".")}>
          .
        </button>
        <button type="button" className={[styles.key, styles.keyEnter].join(" ")} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={onEnter}>
          ⏎
        </button>
      </div>
    </div>
  );
}
