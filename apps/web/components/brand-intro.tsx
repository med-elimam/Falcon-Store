import { FalconMark } from "@/components/icons";
import styles from "./brand-intro.module.css";

const INTRO_DURATION_MS = 1450;
const REDUCED_MOTION_DURATION_MS = 80;

const INTRO_BOOTSTRAP = `(function(){var d=document.documentElement;var played=sessionStorage.getItem('falcon-intro-played');var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(played||reduced){d.dataset.falconIntro='hidden';return;}d.dataset.falconIntro='visible';sessionStorage.setItem('falcon-intro-played','true');setTimeout(function(){d.dataset.falconIntro='hidden';},1450);})();`;

export function BrandIntro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }} />
      <div className={styles.intro} aria-hidden="true" dir="ltr">
        <div className={`${styles.curtain} ${styles.curtainLeft}`} />
        <div className={`${styles.curtain} ${styles.curtainRight}`} />

        <div className={styles.stage}>
          <span className={styles.apertureLine} />

          <div className={styles.markAssembly}>
            <div className={styles.shards}>
              <span className={`${styles.shard} ${styles.leftTop}`} />
              <span className={`${styles.shard} ${styles.leftMiddle}`} />
              <span className={`${styles.shard} ${styles.leftBottom}`} />
              <span className={`${styles.shard} ${styles.rightTop}`} />
              <span className={`${styles.shard} ${styles.rightMiddle}`} />
              <span className={`${styles.shard} ${styles.rightBottom}`} />
            </div>

            <FalconMark className={styles.mark} />
            <span className={styles.core} />
          </div>

          <div className={styles.identity}>
            <strong>FALCON STORE</strong>
            <span>THE SCENT VAULT</span>
            <i />
          </div>
        </div>
      </div>
    </>
  );
}
