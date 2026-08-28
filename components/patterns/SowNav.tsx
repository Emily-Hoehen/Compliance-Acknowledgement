import { Nav, type NavDropdownEntry } from "./Nav";
import { BellIcon, BriefcaseIcon, ClipboardIcon, EnvelopeIcon, MoreIcon, PinIcon, PlusCircleIcon } from "./icons";
import { siteInfo } from "../../lib/homeDashboardData";

export type SowVariant = "tabs" | "hierarchy" | "coverage" | "audience" | "timeFirst" | "planEvidence";

export type SowNavProps = {
  /** Which Scope of Work prototype this page is — highlights the matching item in the Quality dropdown. */
  current: SowVariant;
};

/**
 * SowNav — the Nav config shared by every Scope of Work page
 * variant. Mirrors HomeDashboard's Nav (same org/site labels,
 * utility icons) so the header is consistent across Home and every
 * Quality > Scope of Work exploration. Light theme only.
 *
 * Quality renders as a click-to-open dropdown instead of a plain
 * link, since this project has several parallel SOW prototypes
 * living side by side rather than one settled page. The two
 * site-hierarchy variants (SowHierarchyPage / SowHierarchyDetailPage)
 * are grouped under a "Space-First" heading in that dropdown rather
 * than listed as flat siblings, since they're both the same
 * navigation idea (site structure as the primary nav) at two
 * different levels of detail — paired with "Audience-First"
 * (SowAudiencePage) and "Time-First" (SowTimeFirstPage), each
 * organizing the same underlying data around one different
 * dimension: space, who's looking, or when.
 */
export function SowNav({ current }: SowNavProps) {
  const items: NavDropdownEntry[] = [
    {
      label: "Consolidated Tabs",
      href: "/quality/sow",
      active: current === "tabs",
      icon: <i className="fa-solid fa-table-columns" />,
    },
    {
      type: "group",
      label: "Space-First",
      icon: <i className="fa-solid fa-sitemap" />,
      items: [
        {
          label: "Site Hierarchy",
          href: "/quality/sow-hierarchy",
          active: current === "hierarchy",
          icon: <i className="fa-solid fa-sitemap" />,
        },
        {
          label: "Hierarchy + Coverage",
          href: "/quality/sow-hierarchy-detail",
          active: current === "coverage",
          icon: <i className="fa-solid fa-chart-simple" />,
        },
      ],
    },
    {
      label: "Audience-First",
      href: "/quality/sow-audience",
      active: current === "audience",
      icon: <i className="fa-solid fa-user-group" />,
    },
    {
      label: "Time-First",
      href: "/quality/sow-time-first",
      active: current === "timeFirst",
      icon: <i className="fa-solid fa-clock-rotate-left" />,
    },
    {
      label: "Plan vs Evidence",
      href: "/quality/sow-plan-evidence",
      active: current === "planEvidence",
      icon: <i className="fa-solid fa-scale-balanced" />,
    },
  ];

  return (
    <Nav
      theme="light"
      orgLabel="SBM"
      orgIcon={<BriefcaseIcon />}
      siteLabel={siteInfo.client}
      siteSubLabel={siteInfo.siteName}
      siteIcon={<PinIcon />}
      links={[
        { label: "Home", href: "/" },
        { label: "Quality", href: "/quality/sow", active: true, items },
        { label: "People", href: "/roster" },
        { label: "Safety", href: "#" },
        { label: "Financials", href: "#" },
      ]}
      showOlivia={false}
      utilityItems={[
        { icon: <PlusCircleIcon />, label: "Quick entries" },
        { icon: <ClipboardIcon />, label: "Clipboard" },
        { icon: <EnvelopeIcon />, label: "Messages" },
        { icon: <BellIcon />, label: "Notifications", hasNotification: true },
      ]}
      avatarFallback="EH"
      avatarAlt="Emily Hoehenrieder"
      menuIcon={<MoreIcon />}
    />
  );
}
