import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

/**
 * Button — DS2 | Web Core "Button" component
 * Source: Figma fileKey 5lX9s52cSgMPq0IlkgIYIC, node 414:179.
 *
 * Figma models this as a "Type" axis (7 visual treatments) crossed
 * with Dark/Light theme, Mobile (icon-only square) shape, and
 * State (Static/Hover/Pressed/Disabled). Static/Hover/Pressed map
 * to real interactive pseudo-states here (:not(:hover), :hover,
 * :active) instead of separate props, and "Secondary Icon" in
 * Figma collapses into `variant="secondary"` with an optional
 * `icon` — the two were pixel-identical aside from the icon slot.
 */

export type ButtonVariant =
  | "primary"
  | "altPrimary"
  | "secondary"
  | "danger"
  | "altDanger"
  | "textLink"
  | "flatIcon";

export type ButtonTheme = "dark" | "light";

type CommonProps = {
  variant?: ButtonVariant;
  /** Matches Figma's Dark=True/False axis. Defaults to "dark" per the dark-first design principle. */
  theme?: ButtonTheme;
  /** Square, label-less 40x40 shape — Figma's "Mobile=True" instances. Forced on for `flatIcon`. */
  iconOnly?: boolean;
  /** Left icon slot (16px box on regular buttons, 24px on icon-only/flatIcon). Render your own icon element. */
  icon?: ReactNode;
  /** Right icon slot — desktop pill shapes only (matches Figma's `showRightIcon`). */
  endIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button({
  variant = "primary",
  theme = "dark",
  iconOnly = false,
  icon,
  endIcon,
  children,
  className,
  href,
  ...rest
}: ButtonProps) {
  const isIconOnly = iconOnly || variant === "flatIcon";
  const isTextLink = variant === "textLink";

  const classNames = [
    styles.button,
    styles[variant],
    isIconOnly && !isTextLink ? styles.iconOnly : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      {!isIconOnly && children}
      {endIcon && !isIconOnly && <span className={styles.icon}>{endIcon}</span>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={classNames}
        data-theme={theme}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classNames}
      data-theme={theme}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
