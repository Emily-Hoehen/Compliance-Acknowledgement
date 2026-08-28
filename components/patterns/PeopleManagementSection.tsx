import { Card } from "../ui/Card";
import { SectionHeading } from "../ui/SectionHeading";
import { Marquee } from "../ui/Marquee";
import { Sparkline, BarChart, MonthAxis } from "../ui/Charts";
import { BookIcon } from "./icons";
import type { DashboardPerson } from "../../lib/homeDashboardData";
import type { peopleManagement as PeopleManagementData } from "../../lib/homeDashboardData";
import styles from "./PeopleManagementSection.module.css";

/**
 * PeopleManagementSection — "People Management" row
 * Source: Figma fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:720.
 * Clocked In (avatar stack), Hours Worked (sparkline), Turnover
 * (grouped bar chart).
 */

export type PeopleManagementSectionProps = {
  theme?: "dark" | "light";
  data: typeof PeopleManagementData;
  clockedInAvatars: DashboardPerson[];
};

export function PeopleManagementSection({ theme = "light", data, clockedInAvatars }: PeopleManagementSectionProps) {
  return (
    <section className={styles.section}>
      <SectionHeading theme={theme}>People Management</SectionHeading>

      <div className={styles.grid}>
        <Card theme={theme} className={styles.clockedInCard}>
          <div className={styles.cardBody}>
            <div className={styles.statBlock}>
              <p className={styles.cardLabel} data-theme={theme}>
                Clocked In
              </p>
              <div className={styles.statRow}>
                <span className={styles.statValue} data-theme={theme}>
                  {data.clockedIn.count}
                </span>
                <span className={styles.statUnit} data-theme={theme}>
                  of {data.clockedIn.total.toLocaleString()}
                </span>
                <span className={styles.statCaption} data-theme={theme}>
                  Team Members
                </span>
              </div>
            </div>

            <Marquee durationSeconds={22} trackClassName={styles.avatarTrack}>
              <ul className={styles.avatarStack}>
                {clockedInAvatars.map((person) => (
                  <li key={person.name} className={styles.avatarTile}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={person.avatar} alt="" className={styles.avatarImage} />
                    <span className={styles.avatarDot} data-theme={theme} aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </Marquee>

            <div className={styles.footnote}>
              <span className={styles.footnoteIcon} data-theme={theme}>
                <BookIcon />
              </span>
              <p className={styles.footnoteText} data-theme={theme}>
                Trained and certified through 4insite Knowledge Center across 10 sites
              </p>
            </div>
          </div>
        </Card>

        <Card theme={theme} className={styles.chartCard}>
          <div className={styles.cardBody}>
            <div className={styles.statBlock}>
              <p className={styles.cardLabel} data-theme={theme}>
                Hours Worked
              </p>
              <div className={styles.statRow}>
                <span className={styles.statValue} data-theme={theme}>
                  {data.hoursWorked.total}
                </span>
                <span className={styles.statCaption} data-theme={theme}>
                  hrs
                </span>
              </div>
            </div>

            <div className={styles.chartStack}>
              <div className={styles.chartMeta}>
                <span className={styles.chartMetaLine} data-theme={theme}>
                  <i className="fa-solid fa-clock" aria-hidden="true" />
                  7 day average
                </span>
                <span className={styles.chartMetaValue}>
                  <span className={styles.chartMetaBig} data-theme={theme}>
                    {data.hoursWorked.avgPerDay}
                  </span>
                  <span className={styles.chartMetaSmall} data-theme={theme}>
                    hrs/day
                  </span>
                </span>
              </div>
              <Sparkline values={data.hoursWorked.series} color="var(--color-primary-300)" />
              <MonthAxis months={data.hoursWorked.months} theme={theme} />
            </div>
          </div>
        </Card>

        <Card theme={theme} className={styles.chartCard}>
          <div className={styles.cardBody}>
            <div className={styles.statBlock}>
              <p className={styles.cardLabel} data-theme={theme}>
                Turnover
              </p>
              <div className={styles.statRow}>
                <span className={styles.statValue} data-theme={theme}>
                  {data.turnover.percent}%
                </span>
                <span className={styles.statCaption} data-theme={theme}>
                  last month
                </span>
              </div>
            </div>

            <div className={styles.legendRow}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: "var(--color-datavis-red-orange-500)" }} />
                <span className={styles.legendValue} data-theme={theme}>
                  {data.turnover.separations}
                </span>
                <span className={styles.legendLabel} data-theme={theme}>
                  Separations
                </span>
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: "var(--color-datavis-sky-blue-500)" }} />
                <span className={styles.legendValue} data-theme={theme}>
                  {data.turnover.newHires}
                </span>
                <span className={styles.legendLabel} data-theme={theme}>
                  New Hires
                </span>
              </span>
            </div>

            <BarChart
              theme={theme}
              months={data.turnover.months}
              series={[
                { label: "Separations", values: data.turnover.separationsSeries, color: "var(--color-datavis-red-orange-500)" },
                { label: "New Hires", values: data.turnover.newHiresSeries, color: "var(--color-datavis-sky-blue-500)" },
              ]}
            />
          </div>
        </Card>
      </div>
    </section>
  );
}
