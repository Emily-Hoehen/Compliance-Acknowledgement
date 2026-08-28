import { Card } from "../ui/Card";
import { SectionHeading } from "../ui/SectionHeading";
import { BarChart, StreakBar, StarRating, Gauge, ProgressRow } from "../ui/Charts";
import { QuoteRightIcon, MapIcon, LocationDotIcon } from "./icons";
import type { sitePerformance as SitePerformanceData } from "../../lib/homeDashboardData";
import styles from "./SitePerformanceSection.module.css";

/**
 * SitePerformanceSection — "Site Performance" bento grid
 * Source: Figma fileKey iu8cX5Ew8b1vh1LUC3NLwz, node 10719:875, with
 * the "Live View" teaser's illustration swapped for the exported
 * asset at public/homepage/liveview.png (node 10719:1337's real
 * asset — see CommunicationsSection.tsx for the matching "Views"
 * card asset).
 */

export type SitePerformanceSectionProps = {
  theme?: "dark" | "light";
  data: typeof SitePerformanceData;
};

export function SitePerformanceSection({ theme = "light", data }: SitePerformanceSectionProps) {
  return (
    <section className={styles.section}>
      <SectionHeading theme={theme}>Site Performance</SectionHeading>

      <div className={styles.grid}>
        {/* Complaints */}
        <Card theme={theme} className={styles.cellComplaints}>
          <div className={styles.padSplit}>
            <div className={styles.stack16}>
              <p className={styles.cardLabel} data-theme={theme}>
                Complaints
              </p>
              <div className={styles.statBlockTight}>
                <span className={styles.statValue} data-theme={theme}>
                  {data.complaints.value}
                </span>
                <span className={styles.statCaption} data-theme={theme}>
                  {data.complaints.caption}
                </span>
              </div>
              <p className={styles.inlineNote} data-theme={theme}>
                {data.complaints.note.lead}
                <strong>{data.complaints.note.strong}</strong>
                {data.complaints.note.tail}
              </p>
            </div>
            <BarChart
              theme={theme}
              months={data.complaints.months}
              series={[{ label: "Complaints", values: data.complaints.series, color: "var(--color-datavis-purple-100)" }]}
            />
          </div>
        </Card>

        {/* Safety Streak */}
        <Card theme={theme} className={styles.cellSafety}>
          <div className={styles.padSplit}>
            <div className={styles.stack16}>
              <p className={styles.cardLabel} data-theme={theme}>
                Safety Streak
              </p>
              <div className={styles.statBlockTight}>
                <span className={styles.statValue} data-theme={theme}>
                  {data.safetyStreak.days} days
                </span>
                <span className={styles.statCaption} data-theme={theme}>
                  {data.safetyStreak.caption}
                </span>
              </div>
            </div>
            <div className={styles.stack16}>
              <div className={styles.axisRow} data-theme={theme}>
                {data.safetyStreak.months.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
              <StreakBar progress={data.safetyStreak.progress} />
              <p className={styles.inlineNote} data-theme={theme}>
                {data.safetyStreak.note.lead}
                <strong>{data.safetyStreak.note.strong}</strong>
              </p>
            </div>
          </div>
        </Card>

        {/* Latest Survey */}
        <Card theme={theme} className={styles.cellSurvey}>
          <div className={styles.padStack}>
            <p className={styles.cardLabel} data-theme={theme}>
              Latest Survey
            </p>
            <div className={styles.surveyRow}>
              <span className={styles.statValue} data-theme={theme}>
                {data.latestSurvey.rating}
              </span>
              <StarRating rating={data.latestSurvey.rating} />
            </div>
            <div className={styles.quoteCard}>
              <div className={styles.associate}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.latestSurvey.quote.person.avatar} alt="" className={styles.associateAvatar} />
                <span className={styles.associateName} data-theme={theme}>
                  {data.latestSurvey.quote.person.name}
                </span>
              </div>
              <p className={styles.quoteText} data-theme={theme}>
                {data.latestSurvey.quote.text}
              </p>
              <span className={styles.quoteMark} data-theme={theme} aria-hidden="true">
                <QuoteRightIcon />
              </span>
            </div>
            <div className={styles.associate}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.latestSurvey.response.person.avatar} alt="" className={styles.associateAvatar} />
              <span className={styles.associateName} data-theme={theme}>
                {data.latestSurvey.response.person.name}
              </span>
              <span className={styles.statCaption} data-theme={theme}>
                responded on {data.latestSurvey.response.respondedOn}
              </span>
            </div>
          </div>
        </Card>

        {/* Site Scorecard */}
        <Card theme={theme} className={styles.cellScorecard}>
          <div className={styles.scorecardBody}>
            <Gauge value={data.scorecard.value} />
            <span className={styles.scorecardValue} data-theme={theme}>
              {data.scorecard.value}
            </span>
            <span className={styles.scorecardLabel} data-theme={theme}>
              Site Scorecard
            </span>
            <span className={styles.scorecardTag} data-theme={theme}>
              {data.scorecard.period}
            </span>
          </div>
        </Card>

        {/* Report Its */}
        <Card theme={theme} className={styles.cellReportIts}>
          <div className={styles.splitCard}>
            <div className={styles.splitMain}>
              <p className={styles.cardLabel} data-theme={theme}>
                Report Its
              </p>
              <div className={styles.statBlockTight}>
                <span className={styles.statValue} data-theme={theme}>
                  {data.reportIts.count}
                </span>
                <span className={styles.statCaption} data-theme={theme}>
                  this month
                </span>
              </div>
              <div className={styles.monthlyAvgRow} data-theme={theme}>
                <i className="fa-solid fa-calendar" aria-hidden="true" />
                <span>Monthly Average:</span>
              </div>
              <div className={styles.statRowTight}>
                <span className={styles.chartMetaBig} data-theme={theme}>
                  {data.reportIts.monthlyAverage}
                </span>
                <span className={styles.statCaption} data-theme={theme}>
                  report-its/month
                </span>
              </div>
              <BarChart
                theme={theme}
                months={data.reportIts.months}
                series={[{ label: "Report Its", values: data.reportIts.series, color: "var(--color-datavis-red-orange-100)" }]}
              />
            </div>
            <div className={styles.splitAside} data-theme={theme}>
              <span className={styles.statCaption} data-theme={theme}>
                {data.reportIts.latest.submittedLabel}
              </span>
              <div className={styles.associate}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.reportIts.latest.person.avatar} alt="" className={styles.associateAvatarLg} />
                <div className={styles.associateInfo}>
                  <span className={styles.associateName} data-theme={theme}>
                    {data.reportIts.latest.person.name}
                  </span>
                  <span className={styles.statCaption} data-theme={theme}>
                    {data.reportIts.latest.person.position}
                  </span>
                </div>
              </div>
              <div className={styles.noteChip} data-theme={theme}>
                {data.reportIts.latest.note}
              </div>
              <div className={styles.asidePhoto}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.reportIts.latest.photo} alt="" className={styles.asidePhotoImg} />
              </div>
            </div>
          </div>
        </Card>

        {/* Site Performance Map */}
        <Card theme={theme} className={styles.cellMap}>
          <div className={styles.mapCard}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.performanceMap.image} alt="" className={styles.mapImage} />
            <span className={styles.mapPin} aria-hidden="true">
              <LocationDotIcon />
            </span>
            <div className={styles.mapOverlay}>
              <span className={styles.mapIcon}>
                <MapIcon />
              </span>
              <p className={styles.mapTitle}>{data.performanceMap.title}</p>
              <p className={styles.mapDescription}>{data.performanceMap.description}</p>
            </div>
          </div>
        </Card>

        {/* Audit Performance */}
        <Card theme={theme} className={styles.cellAudit}>
          <div className={styles.splitCard}>
            <div className={styles.splitMain}>
              <p className={styles.cardLabel} data-theme={theme}>
                Audit Performance
              </p>
              <div className={styles.auditScoreRow}>
                <span className={styles.scoreChipLg} data-theme={theme}>
                  {data.auditPerformance.score.toFixed(1)}
                </span>
                <span className={styles.statCaptionLg} data-theme={theme}>
                  {data.auditPerformance.total} total
                </span>
              </div>
            </div>
            <div className={styles.splitAsideWide} data-theme={theme}>
              <div className={styles.auditLatestRow}>
                <div className={styles.auditLatestText}>
                  <span className={styles.associateName} data-theme={theme}>
                    {data.auditPerformance.latest.title}
                  </span>
                  <span className={styles.statCaption} data-theme={theme}>
                    {data.auditPerformance.latest.timeAgo}
                  </span>
                </div>
                <span className={styles.scoreChip} data-theme={theme}>
                  {data.auditPerformance.latest.score.toFixed(1)}
                </span>
              </div>
              <div className={styles.associate}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.auditPerformance.latest.person.avatar} alt="" className={styles.associateAvatarLg} />
                <div className={styles.associateInfo}>
                  <span className={styles.associateName} data-theme={theme}>
                    {data.auditPerformance.latest.person.name}
                  </span>
                  <span className={styles.statCaption} data-theme={theme}>
                    {data.auditPerformance.latest.person.position}
                  </span>
                </div>
              </div>
              <div className={styles.auditPhotoRow}>
                {data.auditPerformance.latest.photos.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" key={src} className={styles.auditPhoto} />
                ))}
              </div>
            </div>
          </div>
          <div className={styles.auditAverages}>
            {data.auditPerformance.averages.map((avg) => (
              <ProgressRow key={avg.label} theme={theme} label={avg.label} value={avg.value} total={avg.total} />
            ))}
          </div>
        </Card>

        {/* Live View teaser */}
        <Card theme={theme} className={styles.cellLiveView}>
          <div className={styles.teaser}>
            <div className={styles.teaserImageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.liveViewTeaser.image} alt="" className={styles.teaserImage} />
            </div>
            <div className={styles.teaserContent}>
              <p className={styles.teaserTitle} data-theme={theme}>
                {data.liveViewTeaser.title}
              </p>
              <p className={styles.teaserDescription} data-theme={theme}>
                {data.liveViewTeaser.description}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
