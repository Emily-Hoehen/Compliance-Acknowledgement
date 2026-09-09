"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheckIcon,
  BarsIcon,
  BellIcon,
  ClockIcon,
  CommentsIcon,
  EnvelopeIcon,
  HomeIcon,
  ListCheckIcon,
  MessageExclamationIcon,
  PlusIcon,
  QrCodeIcon,
  TrafficLightStopIcon,
  TriangleExclamationIcon,
  UsersIcon,
} from "./icons";
import { ManagerAppClockSheet } from "./ManagerAppClockSheet";
import { calendarStrip, clockedInStack, currentManager, managerAppHome } from "../../lib/managerAppData";
import styles from "./ManagerAppHome.module.css";

function formatShiftClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function formatElapsedLabel(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}

/**
 * ManagerAppHome — Manager App mobile dashboard
 * Source: Figma fileKey gtME8Hrbr497WEZi1U2HeZ, node 4:1289.
 * The status bar row instead follows the Android system status bar
 * spec (fileKey SWFMjlBJ4u9vSrVaomRe12, node 169:43521 "Phone
 * portrait"): time on the left, status icons on the right, and an
 * empty gap centered where AndroidPhoneFrame's mask reveals the
 * device image's own camera cutout underneath. Meant to be viewed
 * inside AndroidPhoneFrame.
 */
export function ManagerAppHome() {
  const { incompleteVerifications, associatesClockedIn, kpis, serviceValidation, incompleteRoutes, negativeAttestation, messages, employeeScorecards, hoursApprovalDue } =
    managerAppHome;

  const remainingPercent = Math.round((serviceValidation.remaining / (serviceValidation.verificationsToday + serviceValidation.remaining)) * 100);

  const [onShift, setOnShift] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!onShift) return;
    const interval = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(interval);
  }, [onShift]);

  function handleConfirmClock() {
    if (onShift) {
      setOnShift(false);
      setElapsedSeconds(0);
    } else {
      setOnShift(true);
      setElapsedSeconds(0);
    }
    setSheetOpen(false);
  }

  const shiftClock = formatShiftClock(elapsedSeconds);

  return (
    <div className={styles.page}>
      <div className={styles.statusBar}>
        <span className={styles.statusBarTime}>9:30</span>
        <span className={styles.statusBarCameraGap} aria-hidden="true" />
        <div className={styles.statusBarIcons}>
          <img src="/status-icons/wifi.svg" alt="" className={styles.statusBarIcon} />
          <img src="/status-icons/signal.svg" alt="" className={styles.statusBarIcon} />
          <img src="/status-icons/battery.svg" alt="" className={styles.statusBarIcon} />
        </div>
      </div>

      <div className={styles.topRow}>
        <img src="/brand/4insite-logo-dark.svg" alt="4insite" className={styles.wordmark} />
        <button type="button" className={styles.bellButton} aria-label="Notifications">
          <BellIcon />
        </button>
      </div>

      <div className={styles.userRow}>
        <img src={currentManager.avatar} alt="" className={styles.userAvatar} />
        <p className={styles.greeting}>
          Hello Bob!
          <br />
          Here&rsquo;s today&rsquo;s activities!
        </p>
      </div>

      <div className={styles.calendar}>
        {calendarStrip.map((day) => (
          <div key={day.label} className={styles.calendarDay}>
            <span className={styles.calendarLabel}>{day.label}</span>
            {day.isToday ? (
              <span className={styles.calendarToday}>
                <span className={styles.calendarDate}>{day.date}</span>
              </span>
            ) : (
              <span className={styles.calendarDate}>{day.date}</span>
            )}
          </div>
        ))}
      </div>

      <div className={styles.main}>
        <button type="button" className={styles.shiftCard} onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
          <span className={styles.shiftTitle}>{onShift ? "Shift in Progress" : "Shift not Started"}</span>
          <div className={styles.shiftRow}>
            <div className={styles.shiftUnit}>
              <span className={`${styles.shiftNumber} ${onShift ? styles.shiftNumberActive : ""}`}>{shiftClock.hours}</span>
              <span className={styles.shiftUnitLabel}>Hours</span>
            </div>
            <span className={`${styles.shiftColon} ${onShift ? styles.shiftNumberActive : ""}`}>:</span>
            <div className={styles.shiftUnit}>
              <span className={`${styles.shiftNumber} ${onShift ? styles.shiftNumberActive : ""}`}>{shiftClock.minutes}</span>
              <span className={styles.shiftUnitLabel}>Minutes</span>
            </div>
            <span className={`${styles.shiftColon} ${onShift ? styles.shiftNumberActive : ""}`}>:</span>
            <div className={styles.shiftUnit}>
              <span className={`${styles.shiftNumber} ${onShift ? styles.shiftNumberActive : ""}`}>{shiftClock.seconds}</span>
              <span className={styles.shiftUnitLabel}>Seconds</span>
            </div>
          </div>
        </button>

        <div className={styles.card}>
          <span className={styles.iconBubble} style={{ backgroundColor: "var(--wash-warning-15)", color: "var(--color-text-dt-warning)" }}>
            <QrCodeIcon />
          </span>
          <div className={styles.cardDetails}>
            <span className={styles.cardTitle}>Incomplete Verifications</span>
            <span className={styles.cardSubtitle}>
              There are <strong>{incompleteVerifications.count}</strong> Incomplete Verifications
            </span>
          </div>
        </div>

        <div className={styles.clockCard}>
          <div className={styles.clockBlock}>
            <span className={styles.clockIcon}>
              <ClockIcon />
            </span>
            <span className={styles.clockTotal}>{associatesClockedIn.total}</span>
            <span className={styles.clockLabel}>Total</span>
          </div>
          <div className={styles.associates}>
            <span className={styles.associatesTitle}>Associates Clocked In</span>
            <div className={styles.avatarStack}>
              {clockedInStack.map((person) => (
                <img key={person.name} src={person.avatar} alt="" className={styles.avatarStackItem} />
              ))}
              <span className={styles.avatarStackMore}>+7</span>
            </div>
          </div>
        </div>

        <div className={styles.kpiRow}>
          {kpis.map((kpi) => (
            <div key={kpi.label} className={styles.kpiTile}>
              <span className={styles.kpiIconBubble} style={{ backgroundColor: kpi.wash, color: kpi.color }}>
                {kpi.icon === "comments" && <CommentsIcon />}
                {kpi.icon === "message-exclamation" && <MessageExclamationIcon />}
                {kpi.icon === "list-check" && <ListCheckIcon />}
                {kpi.icon === "triangle-exclamation" && <TriangleExclamationIcon />}
              </span>
              <span className={styles.kpiLabel}>{kpi.label}</span>
              <span className={styles.kpiValue}>{kpi.value}</span>
              <span className={styles.kpiSublabel}>{kpi.sublabel}</span>
            </div>
          ))}
        </div>

        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <span className={styles.iconBubble} style={{ backgroundColor: "var(--wash-success-15)", color: "var(--color-success-500)" }}>
              <QrCodeIcon />
            </span>
            <div className={styles.cardDetails}>
              <span className={styles.cardTitle}>Service Validation</span>
              <span className={styles.cardSubtitle}>Today&rsquo;s Progress</span>
            </div>
          </div>
          <div>
            <div className={styles.serviceStats}>
              <div className={styles.serviceStat}>
                <span className={styles.serviceStatValue}>{serviceValidation.verificationsToday}</span>
                <span className={styles.serviceStatLabel}>Verifications Today</span>
              </div>
              <div className={`${styles.serviceStat} ${styles.right}`}>
                <span className={`${styles.serviceStatValue} ${styles.danger}`}>{serviceValidation.remaining}</span>
                <span className={styles.serviceStatLabel}>Remaining</span>
              </div>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${100 - remainingPercent}%` }} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.iconBubble} style={{ backgroundColor: "var(--wash-red-orange-15)", color: "var(--color-datavis-red-orange-100)" }}>
            <TrafficLightStopIcon />
          </span>
          <div className={styles.cardDetails}>
            <span className={styles.cardTitle}>Incomplete Routes</span>
            <span className={styles.cardSubtitle}>There are {incompleteRoutes.count} Incomplete Routes</span>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.iconBubble} style={{ backgroundColor: "var(--wash-teal-15)", color: "var(--color-datavis-teal-500)" }}>
            <UsersIcon />
          </span>
          <div className={styles.cardDetails}>
            <span className={styles.cardTitle}>Negative Attestation</span>
            <span className={styles.cardSubtitle}>There are {negativeAttestation.count} Negative Attestations</span>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.iconBubble} style={{ backgroundColor: "var(--wash-pinkle-light-15)", color: "var(--color-datavis-pinkle-100)" }}>
            <EnvelopeIcon />
          </span>
          <div className={styles.cardDetails}>
            <span className={styles.cardTitle}>Messages</span>
            <span className={styles.cardSubtitle}>
              There are <strong>{messages.unread}</strong> unread message(s)
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.iconBubble} style={{ backgroundColor: "var(--wash-danger-light-15)", color: "var(--color-text-dt-danger)" }}>
            <BadgeCheckIcon />
          </span>
          <div className={styles.cardDetails}>
            <span className={styles.cardTitle}>Employee Scorecards</span>
            <span className={styles.cardSubtitle}>{employeeScorecards.note}</span>
          </div>
        </div>

        <div className={styles.hoursCard}>
          <span className={styles.hoursTitle}>Hours Approval Due In</span>
          <div className={styles.hoursRow}>
            <div className={styles.hoursUnit}>
              <span className={styles.hoursNumber}>{hoursApprovalDue.hours}</span>
              <span className={styles.hoursUnitLabel}>Hours</span>
            </div>
            <span className={styles.hoursColon}>:</span>
            <div className={styles.hoursUnit}>
              <span className={styles.hoursNumber}>{hoursApprovalDue.minutes}</span>
              <span className={styles.hoursUnitLabel}>Minutes</span>
            </div>
            <span className={styles.hoursColon}>:</span>
            <div className={styles.hoursUnit}>
              <span className={styles.hoursNumber}>{hoursApprovalDue.seconds}</span>
              <span className={styles.hoursUnitLabel}>Seconds</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.toolbarSpacer} aria-hidden="true" />
      <div className={styles.toolbar}>
        <div className={styles.toolbarBackground} />
        <div className={styles.toolbarInner}>
          <button type="button" className={styles.toolbarButton}>
            <span className={styles.toolbarIcon}>
              <HomeIcon />
            </span>
            <span className={styles.toolbarLabel}>Home</span>
          </button>
          <button type="button" className={styles.toolbarButton}>
            <span className={styles.toolbarIcon}>
              <BarsIcon />
            </span>
            <span className={styles.toolbarLabel}>More</span>
          </button>
        </div>
        <button type="button" className={styles.fabButton} aria-label="Create">
          <PlusIcon />
        </button>
      </div>

      <ManagerAppClockSheet
        open={sheetOpen}
        mode={onShift ? "check-out" : "check-in"}
        elapsedLabel={formatElapsedLabel(elapsedSeconds)}
        onConfirm={handleConfirmClock}
        onCancel={() => setSheetOpen(false)}
      />
    </div>
  );
}
