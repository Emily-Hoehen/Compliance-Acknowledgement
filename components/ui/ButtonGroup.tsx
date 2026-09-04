import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import styles from "./ButtonGroup.module.css";

export type ButtonGroupOption<T extends string> = {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
};

export type ButtonGroupTheme = "dark" | "light";
export type ButtonGroupVariant = "pills" | "segmented";

export type ButtonGroupProps<T extends string> = {
  options: ButtonGroupOption<T>[];
  value: T;
  onChange: (id: T) => void;
  theme?: ButtonGroupTheme;
  variant?: ButtonGroupVariant;
  /** Overrides the segmented variant's sliding thumb color for one call site (e.g. Our Team's roster tabs), without changing the shared default everywhere else. */
  thumbColor?: string;
  "aria-label"?: string;
};

/**
 * ButtonGroup — a row of mutually-exclusive buttons, one active at a
 * time. Two variants: "pills" (default — Figma's "Filter Button"
 * pattern, wash-tinted primary background on the selected option,
 * neutral wash on the rest, gap between buttons) for Group by, View
 * work by, Grid/List/Summary; "segmented" (a single neutral track
 * with a solid dark pill that slides to the active option, no gap)
 * for Snapshot/Trend-style toggles.
 *
 * The segmented variant's dark pill is a real element that slides
 * (translateX + width, both transitioned) rather than each option
 * cross-fading its own background — swapping two solid-color boxes
 * on click reads as a flicker/jump, sliding one shape reads as motion.
 */
export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  theme = "light",
  variant = "pills",
  thumbColor,
  ...rest
}: ButtonGroupProps<T>) {
  const optionRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const [thumbRect, setThumbRect] = useState<{ x: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (variant !== "segmented") return;

    function measure() {
      const activeEl = optionRefs.current[value];
      if (!activeEl) return;
      setThumbRect({ x: activeEl.offsetLeft, width: activeEl.offsetWidth });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, variant, options]);

  return (
    <div className={styles.group} data-theme={theme} data-variant={variant} role="group" aria-label={rest["aria-label"]}>
      {variant === "segmented" && thumbRect && (
        <div
          className={styles.thumb}
          style={{
            transform: `translateX(${thumbRect.x}px)`,
            width: thumbRect.width,
            ...(thumbColor ? { backgroundColor: thumbColor } : {}),
          }}
          aria-hidden="true"
        />
      )}
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            ref={(el) => {
              optionRefs.current[option.id] = el;
            }}
            type="button"
            className={[styles.option, isActive ? styles.optionActive : ""].filter(Boolean).join(" ")}
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
