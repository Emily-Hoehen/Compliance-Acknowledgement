"use client";

import { useState } from "react";
import { shiftBands, shiftTimelineHours, shiftTimelineValues, type DailyReportShift } from "../../lib/mapPageData";
import { MapShiftSummaryCard } from "./MapShiftSummaryCard";
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
 * `selectedShiftKey` (set once a shift is picked, via a band label
 * here or the left sidebar) highlights that band: a tinted backdrop
 * behind its bars, its bars at full brightness with the rest dimmed,
 * and its label picked out in the accent color.
 *
 * `shifts` drives a hover popover on each band's DAY/SWING/GRAVEYARD
 * label: hovering (or focusing, for keyboard users) that label shows
 * the MapShiftSummaryCard content for that shift, floating above the
 * chart. Independent of band selection/highlighting.
 *
 * Clicking a band label calls `onSelectShift`, filtering the left
 * sidebar (MapStatsPanel) to that shift.
 */
export type MapShiftTimelineProps = {
  selectedShiftKey?: DailyReportShift["key"] | null;
  shifts?: DailyReportShift[];
  onSelectShift?: (key: DailyReportShift["key"]) => void;
};

export function MapShiftTimeline({ selectedShiftKey, shifts, onSelectShift }: MapShiftTimelineProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoveredBandKey, setHoveredBandKey] = useState<DailyReportShift["key"] | null>(null);
  const max = Math.max(...shiftTimelineValues);

  const selectedBandIndex = selectedShiftKey ? shiftBands.findIndex((band) => band.label.toLowerCase() === selectedShiftKey) : -1;
  const selectedBand = selectedBandIndex >= 0 ? shiftBands[selectedBandIndex] : null;
  const selectedBandEnd = selectedBand ? (shiftBands[selectedBandIndex + 1]?.startIndex ?? TOTAL_SLOTS) : null;

  const hoveredShift = hoveredBandKey ? shifts?.find((shift) => shift.key === hoveredBandKey) : undefined;

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
        {shiftBands.map((band, bandIndex) => {
          const bandKey = band.label.toLowerCase() as DailyReportShift["key"];
          const bandShift = shifts?.find((shift) => shift.key === bandKey);
          const align = bandIndex === 0 ? "start" : bandIndex === shiftBands.length - 1 ? "end" : "center";
          return (
            <span key={band.label} className={styles.bandLabelWrap} style={{ left: `${(band.startIndex / TOTAL_SLOTS) * 100}%` }}>
              <button
                type="button"
                className={[styles.bandLabel, band === selectedBand ? styles.bandLabelSelected : ""].filter(Boolean).join(" ")}
                disabled={!bandShift}
                onClick={() => bandShift && onSelectShift?.(bandKey)}
                onPointerEnter={() => bandShift && setHoveredBandKey(bandKey)}
                onPointerLeave={() => setHoveredBandKey((current) => (current === bandKey ? null : current))}
                onFocus={() => bandShift && setHoveredBandKey(bandKey)}
                onBlur={() => setHoveredBandKey((current) => (current === bandKey ? null : current))}
                aria-label={`View ${band.label} shift report`}
              >
                {band.label.toUpperCase()}
              </button>

              {bandShift && hoveredBandKey === bandKey && (
                <div className={[styles.bandPopover, styles[`bandPopoverAlign${align === "start" ? "Start" : align === "end" ? "End" : "Center"}`]].join(" ")}>
                  <MapShiftSummaryCard shift={bandShift} />
                </div>
              )}
            </span>
          );
        })}
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
