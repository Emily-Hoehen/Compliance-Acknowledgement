import styles from "./Select.module.css";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export type DsSelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  ariaLabel: string;
  /** Optional inline label rendered to the left, e.g. "Filter" / "Sort" — pairs the select with its own field wrapper instead of the caller hand-rolling one. */
  label?: string;
};

/**
 * DsSelect — a native `<select>` restyled to the design system's
 * "Dropdown" component (Figma fileKey SWFMjlBJ4u9vSrVaomRe12): the
 * browser's own caret is suppressed (`appearance: none`) in favor of
 * a Font Awesome chevron laid on top, so it reads the same as every
 * other dropdown in the reference instead of the platform default.
 * Shared across every page with a "Filter / Sort / View by"-style
 * control row (SowHierarchyPage, SowTimeFirstPage).
 */
export function DsSelect<T extends string>({ value, onChange, options, ariaLabel, label }: DsSelectProps<T>) {
  const select = (
    <span className={styles.selectWrap}>
      <select
        className={styles.dsSelect}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={ariaLabel}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <i className={["fa-solid fa-chevron-down", styles.selectCaret].join(" ")} aria-hidden="true" />
    </span>
  );

  if (!label) return select;

  return (
    <div className={styles.filterField}>
      <span className={styles.filterFieldLabel}>{label}</span>
      {select}
    </div>
  );
}
