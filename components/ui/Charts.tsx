import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  /** Per-point label (e.g. "Aug 27"), same length/order as `values` — shown in the hover tooltip alongside its value. Only meaningful with `interactive`. */
  labels?: string[];
  /** Formats the hovered value for the tooltip; defaults to the raw number. */
  valueFormatter?: (value: number) => string;
  /** Opts into the pointer-follow tooltip + guideline. Default off, so existing call sites render exactly as before. */
  interactive?: boolean;
};

/** Smoothed line + gradient area fill, e.g. Hours Worked's 7-day trend. */
export function Sparkline({ values, color, height = 62, labels, valueFormatter, interactive = false }: SparklineProps) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
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

  function updateHoverFromClientX(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const xInViewBox = ((clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - xInViewBox);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    updateHoverFromClientX(e.clientX);
  }

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className={styles.sparklineWrap}>
      <svg
        ref={svgRef}
        className={[styles.sparkline, interactive ? styles.sparklineInteractive : ""].filter(Boolean).join(" ")}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-hidden="true"
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerLeave={interactive ? () => setHoverIndex(null) : undefined}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.x}
              y1={0}
              x2={hoverPoint.x}
              y2={height}
              className={styles.sparklineGuide}
              stroke={color}
            />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r={4} className={styles.sparklineDot} fill={color} />
          </>
        )}
      </svg>
      {interactive && hoverPoint && hoverIndex !== null && (
        <div
          className={styles.sparklineTooltip}
          style={{ left: `${Math.min(94, Math.max(6, (hoverPoint.x / width) * 100))}%` }}
        >
          {labels?.[hoverIndex] && <span className={styles.sparklineTooltipLabel}>{labels[hoverIndex]}</span>}
          <span className={styles.sparklineTooltipValue}>
            {valueFormatter ? valueFormatter(values[hoverIndex]) : values[hoverIndex]}
          </span>
        </div>
      )}
    </div>
  );
}

type DonutRingProps = {
  percent: number;
  color: string;
  trackColor?: string;
  size?: number;
  strokeWidth?: number;
};

/** Small ring progress indicator — e.g. a metric card's percent-complete glyph. */
export function DonutRing({ percent, color, trackColor = "var(--color-neutral-300)", size = 40, strokeWidth = 6 }: DonutRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg
      className={styles.donut}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(clamped)}%`}
    >
      <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${c} ${c})`}
      />
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
