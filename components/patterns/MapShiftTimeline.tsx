"use client";

import { useState } from "react";
import { shiftBands, shiftTimelineHours, shiftTimelineValues, type DailyReportShift } from "../../lib/mapPageData";
import styles from "./MapShiftTimeline.module.css";

const TOTAL_SLOTS = shiftTimelineValues.length;

function formatHourLabel(hour24: number) {
  const normalized = ((hour24 % 24) + 24) % 24;
  const period = normalized < 12 ? "AM" : "PM";
  const hour12 = Math.floor(normalized) % 12 || 12;
  return `${hour12} ${period}`;
}

function formatSlotTime(hour24: number) {
  const normalized = ((hour24 % 24) + 24) % 24;
  const period = normalized < 12 ? "AM" : "PM";
  const hour12 = Math.floor(normalized) % 12 || 12;
  const minutes = normalized % 1 === 0 ? "00" : "30";
  return `${hour12}:${minutes} ${period}`;
}

/**
 * MapShiftTimeline — hourly service-activity bars across the Day /
 * Swing / Graveyard shift bands, anchoring the bottom of the Map
 * feature. No Figma source (built from a reference screenshot); bar
 * geometry and shift-band math live here since the layout (band
 * dividers + hour ticks + bars, all sharing one slot index) doesn't
 * generalize to the design system's other chart primitives.
 *
 * `selectedShiftKey` (set once a shift is picked in
 * MapDailyReportPanel) highlights that band: a tinted backdrop
 * behind its bars, its bars at full brightness with the rest dimmed,
 * and its label picked out in the accent color.
 */
export type MapShiftTimelineProps = {
  selectedShiftKey?: DailyReportShift["key"] | null;
};

export function MapShiftTimeline({ selectedShiftKey }: MapShiftTimelineProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(...shiftTimelineValues);

  const selectedBandIndex = selectedShiftKey ? shiftBands.findIndex((band) => band.label.toLowerCase() === selectedShiftKey) : -1;
  const selectedBand = selectedBandIndex >= 0 ? shiftBands[selectedBandIndex] : null;
  const selectedBandEnd = selectedBand ? (shiftBands[selectedBandIndex + 1]?.startIndex ?? TOTAL_SLOTS) : null;

  return (
    <div className={styles.timeline}>
      {selectedBand && selectedBandEnd !== null && (
        <span
          className={styles.bandHighlight}
          style={{
            left: `${(selectedBand.startIndex / TOTAL_SLOTS) * 100}%`,
            width: `${((selectedBandEnd - selectedBand.startIndex) / TOTAL_SLOTS) * 100}%`,
          }}
          aria-hidden="true"
        />
      )}

      {shiftBands
        .filter((band) => band.startIndex > 0)
        .map((band) => (
          <span
            key={`divider-${band.label}`}
            className={styles.bandDivider}
            style={{ left: `${(band.startIndex / TOTAL_SLOTS) * 100}%` }}
            aria-hidden="true"
          />
        ))}

      <div className={styles.bands}>
        {shiftBands.map((band) => (
          <span
            key={band.label}
            className={[styles.bandLabel, band === selectedBand ? styles.bandLabelSelected : ""].filter(Boolean).join(" ")}
            style={{ left: `${(band.startIndex / TOTAL_SLOTS) * 100}%` }}
          >
            {band.label.toUpperCase()}
          </span>
        ))}
      </div>

      <div className={styles.plot}>
        {shiftTimelineHours.map((hour, i) =>
          i % 6 === 0 ? (
            <span key={`tick-${i}`} className={styles.tickLabel} style={{ left: `${(i / TOTAL_SLOTS) * 100}%` }}>
              {formatHourLabel(hour)}
            </span>
          ) : null
        )}

        <div className={styles.bars} onPointerLeave={() => setHoverIndex(null)}>
          {shiftTimelineValues.map((value, i) => {
            const isDimmed = selectedBand !== null && selectedBandEnd !== null && (i < selectedBand.startIndex || i >= selectedBandEnd);
            return (
              <button
                key={i}
                type="button"
                className={[styles.bar, isDimmed ? styles.barDimmed : ""].filter(Boolean).join(" ")}
                style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                onPointerEnter={() => setHoverIndex(i)}
                aria-label={`${formatSlotTime(shiftTimelineHours[i])}: ${value} services`}
              />
            );
          })}
        </div>

        {hoverIndex !== null && (
          <div className={styles.tooltip} style={{ left: `${(hoverIndex / TOTAL_SLOTS) * 100}%` }}>
            <span className={styles.tooltipTime}>{formatSlotTime(shiftTimelineHours[hoverIndex])}</span>
            <span className={styles.tooltipValue}>{shiftTimelineValues[hoverIndex]} services</span>
          </div>
        )}
      </div>
    </div>
  );
}
