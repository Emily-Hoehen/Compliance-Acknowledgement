import { ReactNode } from "react";
import styles from "./AndroidPhoneFrame.module.css";

/**
 * AndroidPhoneFrame — device chrome for previewing mobile-app
 * screens inline in the browser, built from the mockup image at
 * public/Phone portrait.png. That mockup's screen area is an opaque
 * placeholder (not a transparent cutout), so the real app content
 * renders in a layer stacked on top of it, sized to exactly cover
 * that placeholder — see AndroidPhoneFrame.module.css. Screens are
 * passed in as children and scroll inside the device's screen well,
 * same as swiping through a real app.
 *
 * .screenClip (rounded-corner clip) and .screen (the mask-image
 * camera cutout) are deliberately two separate nested elements —
 * combining overflow:hidden+border-radius and mask-image on the
 * SAME element causes a white anti-aliasing fringe around both the
 * rounded corners and the mask's edge in Chromium/WebKit.
 */
export type AndroidPhoneFrameProps = {
  children: ReactNode;
  className?: string;
  /** Accessible label for the device landmark, e.g. "Manager App prototype". */
  label?: string;
};

export function AndroidPhoneFrame({ children, className, label = "Android phone prototype" }: AndroidPhoneFrameProps) {
  return (
    <div className={[styles.frame, className].filter(Boolean).join(" ")} role="group" aria-label={label}>
      <img src="/Phone%20portrait.png" alt="" className={styles.deviceImage} />
      <div className={styles.screenClip}>
        <div className={styles.screen}>
          <div className={styles.scrollArea}>{children}</div>
        </div>
      </div>
    </div>
  );
}
