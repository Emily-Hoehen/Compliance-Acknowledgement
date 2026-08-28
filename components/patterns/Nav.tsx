"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import styles from "./Nav.module.css";

/**
 * Nav — DS2 | Web Core "Navbar" component
 * Source: Figma fileKey 5lX9s52cSgMPq0IlkgIYIC, node 468:1071.
 * Pulled from the Dark/Light "Size=Full Width (1440)" variants.
 *
 * Figma's utility icons (Clock, Quick Entries, Clipboard,
 * Messages, Notifications, overflow menu) are Font Awesome
 * glyphs this project doesn't have a license for, so they're
 * exposed as slots — pass your own icon elements rather than
 * the component guessing at a substitute icon set. Same for the
 * org/site picker glyphs and the "more options" menu icon.
 *
 * The page-link Hover/Active states aren't defined anywhere in
 * the Figma file (the "Navbar / List Item" instances carry no
 * state variants) — the hover/active colors here extrapolate
 * from the same accent-shift pattern DS2 uses elsewhere (Button,
 * Text Link), not invented from scratch, but flagging that they
 * weren't pulled directly like everything else in this file.
 */

export type NavTheme = "dark" | "light";

export type NavDropdownItem = {
  type?: "item";
  label: string;
  href: string;
  active?: boolean;
  /** Small leading icon (e.g. a Font Awesome `<i>` element) — a menu of links reads friendlier with a visual anchor per item than plain text alone. */
  icon?: ReactNode;
};

/**
 * A non-clickable label with its own nested set of links — for
 * grouping several related variants under one umbrella name inside
 * a dropdown (e.g. Quality's "Space-First" heading over its two
 * site-hierarchy explorations) instead of listing them as flat,
 * unrelated siblings.
 */
export type NavDropdownGroup = {
  type: "group";
  label: string;
  icon?: ReactNode;
  items: NavDropdownItem[];
};

export type NavDropdownEntry = NavDropdownItem | NavDropdownGroup;

export type NavLink = {
  label: string;
  href: string;
  active?: boolean;
  /**
   * Renders this link as a click-to-open dropdown of related pages
   * instead of a plain link — e.g. switching between prototype
   * variants of the same feature (Quality's several Scope of Work
   * explorations). Not part of the pulled Figma component; the
   * page-link states there don't define a dropdown variant.
   */
  items?: NavDropdownEntry[];
};

export type NavUtilityItem = {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  hasNotification?: boolean;
};

export type NavProps = {
  theme?: NavTheme;
  logoHref?: string;

  /** Org/business-unit picker, e.g. "SBM". */
  orgLabel?: string;
  orgIcon?: ReactNode;
  onOrgClick?: () => void;

  /** Site picker, e.g. "Delta" / "LaGuardia, NY". */
  siteLabel?: string;
  siteSubLabel?: string;
  siteIcon?: ReactNode;
  onSiteClick?: () => void;

  links?: NavLink[];

  /** Olivia, 4Insite's AI assistant — gradient orb is DS2's identity for her regardless of image. Omit when Olivia lives elsewhere on the page (e.g. a floating action button) — see `showOlivia`. */
  oliviaImageSrc?: string;
  onOliviaClick?: () => void;
  /** Set false to omit the Olivia slot entirely — the reduced-icon Navbar variant (fileKey I7TFV5MGgQwMlRjKlwJlBT, node 2197:16145) drops her from the bar in favor of a floating action button. Defaults true to match the originally-pulled Navbar variant. */
  showOlivia?: boolean;

  utilityItems?: NavUtilityItem[];

  avatarSrc?: string;
  avatarAlt?: string;
  /** Shown when `avatarSrc` isn't provided — e.g. initials. */
  avatarFallback?: ReactNode;
  onAvatarClick?: () => void;

  menuIcon?: ReactNode;
  onMenuClick?: () => void;

  /** Extra trailing control, e.g. a theme toggle — rendered after the menu button. Not part of the pulled Figma component. */
  trailing?: ReactNode;

  className?: string;
};

export function Nav({
  theme = "dark",
  logoHref = "/",
  orgLabel,
  orgIcon,
  onOrgClick,
  siteLabel,
  siteSubLabel,
  siteIcon,
  onSiteClick,
  links = [],
  oliviaImageSrc,
  onOliviaClick,
  showOlivia = true,
  utilityItems = [],
  avatarSrc,
  avatarAlt = "Account",
  avatarFallback,
  onAvatarClick,
  menuIcon,
  onMenuClick,
  trailing,
  className,
}: NavProps) {
  const logoSrc =
    theme === "dark" ? "/brand/4insite-logo-dark.svg" : "/brand/4insite-logo-light.svg";

  const [openLink, setOpenLink] = useState<string | null>(null);
  // Fixed-positioned (computed from the trigger button's own rect)
  // rather than absolutely positioned under it — .nav clips vertical
  // overflow to keep its horizontal-scroll fallback from also
  // growing a vertical scrollbar, which would clip an absolutely
  // positioned dropdown along with it. Fixed positioning escapes
  // that clip since it isn't laid out relative to .nav at all.
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const linksRef = useRef<HTMLUListElement>(null);

  function toggleDropdown(href: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openLink === href) {
      setOpenLink(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    setOpenLink(href);
  }

  useEffect(() => {
    if (!openLink) return;
    function handlePointerDown(e: MouseEvent) {
      if (linksRef.current && !linksRef.current.contains(e.target as Node)) {
        setOpenLink(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenLink(null);
    }
    // The menu's position is computed once, on open — closing on
    // scroll avoids it drifting out of alignment with its trigger.
    function handleScroll() {
      setOpenLink(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openLink]);

  return (
    <nav className={[styles.nav, className].filter(Boolean).join(" ")} data-theme={theme}>
      <div className={styles.navInner}>
        <div className={styles.left}>
          <a href={logoHref} aria-label="4Insite home">
            <img src={logoSrc} alt="4Insite" className={styles.logo} width={32} height={32} />
          </a>

          {orgLabel && (
            <button type="button" className={styles.picker} onClick={onOrgClick}>
              {orgIcon && <span className={styles.pickerIcon}>{orgIcon}</span>}
              <span>{orgLabel}</span>
            </button>
          )}

          {siteLabel && (
            <button type="button" className={styles.picker} onClick={onSiteClick}>
              {siteIcon && <span className={styles.pickerIcon}>{siteIcon}</span>}
              <span>{siteLabel}</span>
              {siteSubLabel && (
                <>
                  <span className={styles.pickerDivider} />
                  <span>{siteSubLabel}</span>
                </>
              )}
            </button>
          )}
        </div>

        {links.length > 0 && (
          <ul className={styles.links} ref={linksRef}>
            {links.map((link) =>
              link.items && link.items.length > 0 ? (
                <li key={link.href} className={styles.linkItem}>
                  <button
                    type="button"
                    className={[styles.link, styles.linkButton, link.active ? styles.linkActive : ""]
                      .filter(Boolean)
                      .join(" ")}
                    aria-haspopup="true"
                    aria-expanded={openLink === link.href}
                    onClick={(e) => toggleDropdown(link.href, e)}
                  >
                    {link.label}
                    <span className={styles.linkCaret} aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {openLink === link.href && menuPos && (
                    <ul
                      className={styles.dropdownMenu}
                      style={{ top: menuPos.top, left: menuPos.left }}
                    >
                      {link.items.map((entry) =>
                        entry.type === "group" ? (
                          <li key={`group-${entry.label}`}>
                            <div className={styles.dropdownGroupLabel}>
                              {entry.icon && (
                                <span className={styles.dropdownItemIcon} aria-hidden="true">
                                  {entry.icon}
                                </span>
                              )}
                              {entry.label}
                            </div>
                            <ul className={styles.dropdownSubList}>
                              {entry.items.map((item) => (
                                <li key={item.href}>
                                  <a
                                    href={item.href}
                                    className={[
                                      styles.dropdownItem,
                                      styles.dropdownSubItem,
                                      item.active ? styles.dropdownItemActive : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    aria-current={item.active ? "page" : undefined}
                                    onClick={() => setOpenLink(null)}
                                  >
                                    {item.icon && (
                                      <span className={styles.dropdownItemIcon} aria-hidden="true">
                                        {item.icon}
                                      </span>
                                    )}
                                    {item.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ) : (
                          <li key={entry.href}>
                            <a
                              href={entry.href}
                              className={[styles.dropdownItem, entry.active ? styles.dropdownItemActive : ""]
                                .filter(Boolean)
                                .join(" ")}
                              aria-current={entry.active ? "page" : undefined}
                              onClick={() => setOpenLink(null)}
                            >
                              {entry.icon && (
                                <span className={styles.dropdownItemIcon} aria-hidden="true">
                                  {entry.icon}
                                </span>
                              )}
                              {entry.label}
                            </a>
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={link.href} className={styles.linkItem}>
                  <a
                    href={link.href}
                    className={[styles.link, link.active ? styles.linkActive : ""]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={link.active ? "page" : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              )
            )}
          </ul>
        )}

        <div className={styles.right}>
          <span className={styles.divider} />

          {showOlivia &&
            (onOliviaClick !== undefined || oliviaImageSrc ? (
              <button
                type="button"
                className={styles.olivia}
                onClick={onOliviaClick}
                aria-label="Ask Olivia"
              >
                {oliviaImageSrc && (
                  <img src={oliviaImageSrc} alt="" className={styles.oliviaImage} />
                )}
              </button>
            ) : (
              <div className={styles.olivia} aria-hidden="true" />
            ))}

          {utilityItems.map((item, i) =>
            item.hasNotification ? (
              <button
                key={i}
                type="button"
                className={styles.notification}
                onClick={item.onClick}
                aria-label={item.label}
              >
                <span className={styles.iconButton}>{item.icon}</span>
                <span className={styles.notificationDot} />
              </button>
            ) : (
              <button
                key={i}
                type="button"
                className={styles.iconButton}
                onClick={item.onClick}
                aria-label={item.label}
              >
                {item.icon}
              </button>
            )
          )}

          <span className={styles.divider} />

          {avatarSrc ? (
            <button type="button" onClick={onAvatarClick} aria-label={avatarAlt}>
              <img src={avatarSrc} alt={avatarAlt} className={styles.avatar} />
            </button>
          ) : (
            <button
              type="button"
              className={styles.avatarFallback}
              onClick={onAvatarClick}
              aria-label={avatarAlt}
            >
              {avatarFallback}
            </button>
          )}

          <button
            type="button"
            className={styles.menuButton}
            onClick={onMenuClick}
            aria-label="More options"
          >
            {menuIcon}
          </button>

          {trailing}
        </div>
      </div>
    </nav>
  );
}
