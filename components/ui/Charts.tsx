import { useId } from "react";
import styles from "./Charts.module.css";

/**
 * Small inline-SVG chart primitives for the Front Page dashboard
 * (fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:694). The source
 * design exports these as pre-rendered chart images with colors
 * baked in — rebuilt here as data-driven SVG so values, months and
 * theme (light/dark hairlines + labels) stay live instead of a
 * static picture. Datavis hues themselves come straight from the
 * DS2 token set (`--color-datavis-*`) via each call site.
 */

export type ChartTheme = "dark" | "light";

type MonthAxisProps = {
  months: string[];
  theme?: ChartTheme;
};

/** Shared hairline + month-label row used under every bar/line chart on the page. */
export function MonthAxis({ months, theme = "light" }: MonthAxisProps) {
  return (
    <div className={styles.axis} data-theme={theme}>
      <div className={styles.axisRule} />
      <div className={styles.axisLabels}>
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

type SparklineProps = {
  values: number[];
  color: string;
  fillId?: string;
  height?: number;
};

/** Smoothed line + gradient area fill, e.g. Hours Worked's 7-day trend. */
export function Sparkline({ values, color, height = 62 }: SparklineProps) {
  const gradientId = useId();
  const width = 290;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BarSeries = {
  values: number[];
  color: string;
  label: string;
};

type BarChartProps = {
  series: BarSeries[];
  months: string[];
  theme?: ChartTheme;
  height?: number;
};

/** Grouped/simple vertical bar chart, e.g. Turnover, Complaints, Report Its. */
export function BarChart({ series, months, theme = "light", height = 62 }: BarChartProps) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  return (
    <div className={styles.barChart}>
      <div className={styles.barGroups} style={{ height }}>
        {months.map((month, i) => (
          <div className={styles.barGroup} key={month}>
            {series.map((s) => (
              <span
                key={s.label}
                className={styles.bar}
                style={{
                  height: `${(s.values[i] / max) * 100}%`,
                  backgroundColor: s.color,
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        ))}
      </div>
      <MonthAxis months={months} theme={theme} />
    </div>
  );
}

type StreakBarProps = {
  progress: number;
  theme?: ChartTheme;
};

/** Warm gradient progress rail with a star marker — Safety Streak. */
export function StreakBar({ progress }: StreakBarProps) {
  return (
    <div className={styles.streak}>
      <div className={styles.streakTrack} />
      <div
        className={styles.streakMarker}
        style={{ left: `${Math.min(100, Math.max(0, progress))}%` }}
        aria-hidden="true"
      >
        <i className="fa-solid fa-star" />
      </div>
    </div>
  );
}

type GaugeProps = {
  value: number;
  max?: number;
  theme?: ChartTheme;
};

/** Red → yellow → green semicircle gauge — Site Scorecard. */
export function Gauge({ value, max = 5 }: GaugeProps) {
  const gradientId = useId();
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const fraction = Math.min(1, Math.max(0, value / max));
  const angle = Math.PI - fraction * Math.PI;
  const pointerX = cx + r * Math.cos(angle);
  const pointerY = cy - r * Math.sin(angle);

  return (
    <svg
      className={styles.gauge}
      viewBox={`0 0 ${size} ${size / 2 + 12}`}
      role="img"
      aria-label={`Score ${value} out of ${max}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-danger-500)" />
          <stop offset="50%" stopColor="var(--color-warning-500)" />
          <stop offset="100%" stopColor="var(--color-success-700)" />
        </linearGradient>
      </defs>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={14}
        strokeLinecap="round"
      />
      <circle cx={pointerX} cy={pointerY} r={7} className={styles.gaugePointer} />
    </svg>
  );
}

type ProgressRowProps = {
  label: string;
  value: number;
  total: string;
  max?: number;
  theme?: ChartTheme;
};

/** Thin labeled progress bar — Audit Performance's Internal/Joint/Customer avg rows. */
export function ProgressRow({ label, value, total, max = 5, theme = "light" }: ProgressRowProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={styles.progressRow} data-theme={theme}>
      <div className={styles.progressHeader}>
        <span className={styles.progressLabel}>{label}</span>
        <span className={styles.progressMeta}>
          <span className={styles.progressTotal}>{total}</span>
          <span className={styles.scoreChip} data-theme={theme}>
            {value.toFixed(2).replace(/0$/, "")}
          </span>
        </span>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type StarRatingProps = {
  rating: number;
  max?: number;
};

/** 5-star rating display built from Font Awesome glyphs (fa-star / fa-star-half-stroke). */
export function StarRating({ rating, max = 5 }: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => {
    const filled = rating - i;
    if (filled >= 1) return "full";
    if (filled >= 0.5) return "half";
    return "empty";
  });

  return (
    <div className={styles.stars} role="img" aria-label={`${rating} out of ${max} stars`}>
      {stars.map((state, i) => (
        <i
          key={i}
          className={
            state === "full"
              ? "fa-solid fa-star"
              : state === "half"
                ? "fa-solid fa-star-half-stroke"
                : "fa-regular fa-star"
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
