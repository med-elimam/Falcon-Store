import Script from "next/script";
import { FalconMark } from "@/components/icons";
import styles from "./brand-intro.module.css";

/* افتتاحية «خزنة العطر» — تُعرض عند كل دخول أو تحديث للرئيسية:
   ومضات ضوء تمسح العتمة، شعار الصقر يُرسم بخيط ذهبي، الاسم يتماسك حرفاً حرفاً،
   ثم تنكشف الصفحة كانتشار رذاذ من قلب الشعار وتُسلّم الدور لدخول الزجاجة ثلاثية الأبعاد.

   سكربت الإقلاع يعمل في <head> قبل رسم الصفحة (لا وميض) ويُقيَّد بالمسار «/»؛
   لا يعمل في تنقلات الـ SPA فلا تتكرر الافتتاحية أثناء التصفح، وتعود مع كل تحديث حقيقي.
   أي نقرة أو مفتاح أو تمرير يتخطاها فوراً. */

const INTRO_MS = 2450;
const INTRO_REDUCED_MS = 850;

const INTRO_BOOTSTRAP = `(function(){if(location.pathname!=='/')return;var d=document.documentElement;var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)d.dataset.falconIntroReduced='true';d.dataset.falconIntro='visible';var done=false;function end(){if(done)return;done=true;d.dataset.falconIntro='hidden';removeEventListener('click',end,true);removeEventListener('keydown',end,true);removeEventListener('wheel',end,true);removeEventListener('touchmove',end,true);}setTimeout(end,reduced?${INTRO_REDUCED_MS}:${INTRO_MS});addEventListener('click',end,true);addEventListener('keydown',end,true);addEventListener('wheel',end,{capture:true,passive:true});addEventListener('touchmove',end,{capture:true,passive:true});})();`;

/* يُركَّب في <head> داخل الـ layout الجذري حصراً (شرط beforeInteractive) */
export function BrandIntroBootstrap() {
  return (
    <Script id="falcon-intro" strategy="beforeInteractive">
      {INTRO_BOOTSTRAP}
    </Script>
  );
}

export function BrandIntro() {
  return (
    <>
      <div className={styles.intro} aria-hidden="true" dir="ltr">
        <span className={styles.grain} />

        {/* ومضتا ضوء أفقيتان تمسحان الخزنة المعتمة */}
        <span className={`${styles.streak} ${styles.streakGold}`} />
        <span className={`${styles.streak} ${styles.streakCrimson}`} />

        {/* أنفاس رذاذ دافئة تتنفس حول الشعار */}
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
    </>
  );
}

