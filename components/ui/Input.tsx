import { InputHTMLAttributes, ReactNode, useId } from "react";
import styles from "./Input.module.css";

/**
 * Input — NOT yet pulled from Figma. See Input.module.css header
 * for why, and re-pull from the real DS2 Input page when a
 * node-id URL is available.
 */

export type InputTheme = "dark" | "light";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: string;
  helperText?: string;
  error?: boolean;
  icon?: ReactNode;
  theme?: InputTheme;
  wrapperClassName?: string;
};

export function Input({
  label,
  helperText,
  error = false,
  icon,
  theme = "dark",
  wrapperClassName,
  id,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div
      className={[styles.field, wrapperClassName].filter(Boolean).join(" ")}
      data-theme={theme}
      data-error={error}
    >
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={styles.inputWrap}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input id={inputId} className={styles.input} {...rest} />
      </div>
      {helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
}
