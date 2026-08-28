/**
 * Icon set for the Nav/Button demo — real Font Awesome Pro Kit
 * glyphs (see .font-awesome.md — kit 95881adc33, loaded in
 * app/layout.tsx), solid/filled style throughout to match DS2's
 * spec for these slots. Previously hand-drawn stroke SVGs; migrated
 * project-wide so every caller (Nav, dashboard sections, RosterDemo)
 * renders the same filled glyphs without a call-site change.
 */

type IconProps = { className?: string };

export function SearchIcon({ className }: IconProps) {
  return fa("solid", "magnifying-glass", className);
}

export function PlusIcon({ className }: IconProps) {
  return fa("solid", "plus", className);
}

export function ClockIcon({ className }: IconProps) {
  return fa("solid", "clock", className);
}

export function ClipboardIcon({ className }: IconProps) {
  return fa("solid", "clipboard", className);
}

export function EnvelopeIcon({ className }: IconProps) {
  return fa("solid", "envelope", className);
}

export function BellIcon({ className }: IconProps) {
  return fa("solid", "bell", className);
}

export function MoreIcon({ className }: IconProps) {
  return fa("solid", "ellipsis-vertical", className);
}

export function BriefcaseIcon({ className }: IconProps) {
  return fa("solid", "briefcase", className);
}

export function PinIcon({ className }: IconProps) {
  return fa("solid", "location-dot", className);
}

/**
 * Icons below are new for the "Single Site / Front Page" dashboard
 * (fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:694), which specs
 * Font Awesome 7 Pro Solid throughout. Sized with `font-size`, not
 * width/height — see .font-awesome.md's "Conventions".
 */
function fa(style: "solid" | "regular", name: string, className?: string) {
  return <i className={["fa-" + style, "fa-" + name, className].filter(Boolean).join(" ")} aria-hidden="true" />;
}

export function ArrowRightIcon({ className }: IconProps) {
  return fa("solid", "arrow-right", className);
}

export function CaretLeftIcon({ className }: IconProps) {
  return fa("solid", "caret-left", className);
}

export function CaretRightIcon({ className }: IconProps) {
  return fa("solid", "caret-right", className);
}

export function BookIcon({ className }: IconProps) {
  return fa("solid", "book", className);
}

export function CalendarIcon({ className }: IconProps) {
  return fa("solid", "calendar", className);
}

export function MapIcon({ className }: IconProps) {
  return fa("solid", "map", className);
}

export function LocationDotIcon({ className }: IconProps) {
  return fa("solid", "location-dot", className);
}

export function QuoteRightIcon({ className }: IconProps) {
  return fa("solid", "quote-right", className);
}

export function NewspaperIcon({ className }: IconProps) {
  return fa("solid", "newspaper", className);
}

export function BullhornIcon({ className }: IconProps) {
  return fa("solid", "bullhorn", className);
}

export function ChartLineIcon({ className }: IconProps) {
  return fa("solid", "chart-line", className);
}

export function ArrowPointerIcon({ className }: IconProps) {
  return fa("solid", "arrow-pointer", className);
}

export function StarSolidIcon({ className }: IconProps) {
  return fa("solid", "star", className);
}

export function StarHalfIcon({ className }: IconProps) {
  return fa("solid", "star-half-stroke", className);
}

export function StarRegularIcon({ className }: IconProps) {
  return fa("regular", "star", className);
}

export function SunIcon({ className }: IconProps) {
  return fa("solid", "sun-bright", className);
}

export function MoonIcon({ className }: IconProps) {
  return fa("solid", "moon", className);
}

export function PlusCircleIcon({ className }: IconProps) {
  return fa("solid", "circle-plus", className);
}
