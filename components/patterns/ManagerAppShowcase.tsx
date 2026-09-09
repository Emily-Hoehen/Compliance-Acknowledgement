import { AndroidPhoneFrame } from "./AndroidPhoneFrame";
import { ManagerAppHome } from "./ManagerAppHome";
import styles from "./ManagerAppShowcase.module.css";

/**
 * ManagerAppShowcase — entry point for the Manager App prototype:
 * a phone-shaped viewer for the missed-service-acknowledgement
 * mobile app the project scope has shifted to include. Only the
 * home screen exists in Figma so far (fileKey gtME8Hrbr497WEZi1U2HeZ,
 * node 4:1289); more screens land here as they're designed.
 */
export function ManagerAppShowcase() {
  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <AndroidPhoneFrame label="Manager App home screen prototype">
          <ManagerAppHome />
        </AndroidPhoneFrame>
      </div>
    </div>
  );
}
