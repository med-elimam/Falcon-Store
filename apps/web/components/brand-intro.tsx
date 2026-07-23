import type { CSSProperties } from "react";
import { FalconMark } from "@/components/icons";
import styles from "./brand-intro.module.css";

/*
 * The cover geometry lives inline on the element deliberately. It therefore
 * covers the viewport in the first HTML frame even if streamed CSS is late or
 * unavailable. The controller owns only the state and the exit transition.
 */
const INTRO_COVER_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483000,
  display: "grid",
  placeItems: "center",
  width: "100%",
  minHeight: "100vh",
  height: "100dvh",
  overflow: "hidden",
  background: "#070707",
  colorScheme: "dark",
  opacity: 1,
  visibility: "visible",
  pointerEvents: "auto",
  isolation: "isolate",
};

export function BrandIntro() {
  return (
    <div
      id="falcon-intro"
      className={styles.intro}
      aria-hidden="true"
      dir="ltr"
      style={INTRO_COVER_STYLE}
      suppressHydrationWarning
    >
      <span className={styles.grain} />
      <span className={`${styles.streak} ${styles.streakGold}`} />
      <span className={`${styles.streak} ${styles.streakCrimson}`} />

      <span className={`${styles.mist} ${styles.mistA}`} />
      <span className={`${styles.mist} ${styles.mistB}`} />
      <span className={`${styles.mist} ${styles.mistC}`} />

      <div className={styles.stage}>
        <div className={styles.markWrap}>
          <FalconMark className={styles.mark} />
          <span className={styles.sheen} />
        </div>

        <div className={styles.identity}>
          <strong>FALCON STORE</strong>
          <span className={styles.divider}>
            <i />
            <em />
            <i />
          </span>
          <span className={styles.tagline}>متجر الصقر · THE SCENT VAULT</span>
        </div>
      </div>
    </div>
  );
}
