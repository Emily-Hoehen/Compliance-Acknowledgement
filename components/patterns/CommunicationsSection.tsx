import { Card } from "../ui/Card";
import { SectionHeading } from "../ui/SectionHeading";
import { ArrowRightIcon } from "./icons";
import type { communications as CommunicationsData } from "../../lib/homeDashboardData";
import styles from "./CommunicationsSection.module.css";

/**
 * CommunicationsSection — "Communications" row
 * Source: Figma fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:1055, with
 * the "Views" card's illustration swapped for the exported asset at
 * public/homepage/views.svg (node 10719:1337's real asset).
 */

export type CommunicationsSectionProps = {
  theme?: "dark" | "light";
  data: typeof CommunicationsData;
};

/** Tag tone → theme-aware wash background + text color (see app/globals.css's `--wash-*` and `--color-text-*` tokens). */
const tagToneStyles = {
  danger: {
    light: { backgroundColor: "var(--wash-danger-15)", color: "var(--color-text-lt-danger)" },
    dark: { backgroundColor: "var(--wash-danger-15)", color: "var(--color-text-dt-danger)" },
  },
  success: {
    light: { backgroundColor: "var(--wash-success-15)", color: "var(--color-text-lt-success)" },
    dark: { backgroundColor: "var(--wash-success-15)", color: "var(--color-text-dt-success)" },
  },
  purple: {
    light: { backgroundColor: "var(--wash-purple-15)", color: "var(--color-datavis-purple-500)" },
    dark: { backgroundColor: "var(--wash-purple-15)", color: "var(--color-datavis-purple-100)" },
  },
} as const;

export function CommunicationsSection({ theme = "light", data }: CommunicationsSectionProps) {
  return (
    <section className={styles.section}>
      <SectionHeading
        theme={theme}
        action={
          <span className={styles.headingArrow} data-theme={theme} aria-hidden="true">
            <ArrowRightIcon />
          </span>
        }
      >
        Communications
      </SectionHeading>

      <div className={styles.grid}>
        <Card theme={theme}>
          <div className={styles.tintHeader} style={{ backgroundColor: data.messages.tint }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.messages.image} alt="" className={styles.tintImage} />
            <p className={styles.tintKicker} data-theme={theme}>
              {data.messages.kicker}
            </p>
          </div>
          <div className={styles.body}>
            <div className={styles.associate}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.messages.person.avatar} alt="" className={styles.associateAvatar} />
              <span className={styles.associateName} data-theme={theme}>
                {data.messages.person.name}
              </span>
            </div>
            <p className={styles.bodyTitle} data-theme={theme}>
              {data.messages.title}
            </p>
            <p className={styles.bodyText} data-theme={theme}>
              {data.messages.body}
            </p>
          </div>
        </Card>

        <Card theme={theme}>
          <div className={styles.tintHeader} style={{ backgroundColor: data.news.tint }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.news.image} alt="" className={styles.tintImage} />
            <p className={styles.tintKicker} data-theme={theme}>
              {data.news.kicker}
            </p>
          </div>
          <div className={styles.body}>
            <div className={styles.associate}>
              <span className={styles.orgBadge} aria-hidden="true">
                {data.news.org.slice(0, 1)}
              </span>
              <span className={styles.associateName} data-theme={theme}>
                {data.news.org}
              </span>
            </div>
            <p className={styles.bodyTitle} data-theme={theme}>
              {data.news.title}
            </p>
            <p className={styles.bodyText} data-theme={theme}>
              {data.news.body}
            </p>
          </div>
        </Card>

        <Card theme={theme}>
          <div className={styles.tintHeader} style={{ backgroundColor: data.release.tint }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.release.image} alt="" className={styles.tintImage} />
            <p className={styles.tintKicker} data-theme={theme}>
              {data.release.kicker}
            </p>
          </div>
          <div className={styles.body}>
            <div className={styles.associate}>
              <span className={styles.productBadge} aria-hidden="true" />
              <span className={styles.associateName} data-theme={theme}>
                {data.release.product}
              </span>
            </div>
            <p className={styles.bodyTitle} data-theme={theme}>
              {data.release.title}
            </p>
            <p className={styles.bodyText} data-theme={theme}>
              {data.release.body}
            </p>
            <div className={styles.tagRow}>
              {data.release.tags.map((tag) => (
                <span key={tag.label} className={styles.tag} style={tagToneStyles[tag.tone][theme]}>
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card theme={theme} tint="var(--wash-pinkle-15)" className={styles.viewsCard}>
          <div className={styles.views}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.views.image} alt="" className={styles.viewsImage} />
            <p className={styles.viewsLabel} data-theme={theme}>
              Views
            </p>
            <div className={styles.statRow}>
              <span className={styles.statValue} data-theme={theme}>
                {data.views.count}
              </span>
              <span className={styles.statCaption} data-theme={theme}>
                {data.views.label}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
