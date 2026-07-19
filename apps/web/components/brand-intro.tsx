import { FalconMark } from "@/components/icons";
import styles from "./brand-intro.module.css";

/* افتتاحية «خزنة العطر» — تُعرض عند كل دخول أو تحديث للرئيسية:
   ومضات ضوء تمسح العتمة، شعار الصقر يُرسم بخيط ذهبي، الاسم يتماسك حرفاً حرفاً،
   ثم تنكشف الصفحة كانتشار رذاذ من قلب الشعار وتُسلّم الدور لدخول الزجاجة ثلاثية الأبعاد.

   الإقلاع (سكربت + CSS حرج) يُركّب سطرياً في <head> عبر الـ layout الجذري فيعمل قبل
   أول رسم: السكربت يضبط سمة الحالة، والـ CSS الحرج يغطّي الشاشة فوراً بلون الخزنة —
   فلا يظهر المحتوى للحظة قبل الافتتاحية حتى في وضع التطوير حيث تتأخّر وحدات CSS.
   مقيّد بالمسار «/»، ولا يعمل في تنقلات الـ SPA، ويُتخطّى بأي نقرة أو مفتاح أو تمرير. */

const INTRO_MS = 2100;
const INTRO_REDUCED_MS = 700;

/* يُركّب سطرياً في <head> عبر الـ layout — يعمل قبل الترطيب فلا وميض. */
export const INTRO_BOOTSTRAP = `(function(){if(location.pathname!=='/')return;var d=document.documentElement;var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)d.dataset.falconIntroReduced='true';d.dataset.falconIntro='visible';var done=false;function end(){if(done)return;done=true;d.dataset.falconIntro='hidden';removeEventListener('click',end,true);removeEventListener('keydown',end,true);removeEventListener('wheel',end,true);removeEventListener('touchmove',end,true);}setTimeout(end,reduced?${INTRO_REDUCED_MS}:${INTRO_MS});addEventListener('click',end,true);addEventListener('keydown',end,true);addEventListener('wheel',end,{capture:true,passive:true});addEventListener('touchmove',end,{capture:true,passive:true});})();`;

/* CSS حرج سطري: يغطّي الشاشة بلون الخزنة لحظة ضبط السمة، قبل تحميل وحدة CSS.
   يستهدف المعرّف الثابت #falcon-intro (لا الصنف المُجزّأ) كي يُطبَّق فوراً. */
export const INTRO_CRITICAL_CSS =
  "#falcon-intro{display:none}" +
  'html[data-falcon-intro="visible"] #falcon-intro{display:grid;place-items:center;position:fixed;inset:0;z-index:10000;background:#070707;overflow:hidden}' +
  'html[data-falcon-intro="visible"] body{overflow:hidden}' +
  'html[data-falcon-intro="hidden"] #falcon-intro{display:none}';

export function BrandIntro() {
  return (
    <div id="falcon-intro" className={styles.intro} aria-hidden="true" dir="ltr">
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
  );
}
