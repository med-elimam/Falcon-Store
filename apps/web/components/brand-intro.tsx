import { FalconMark } from "@/components/icons";
import styles from "./brand-intro.module.css";

/* افتتاحية «خزنة العطر». المبدأ الأساسي لتفادي أي وميض:
   الغطاء يظهر افتراضياً من أول إطار عبر CSS حرج سطريّ في <head>، ويتلاشى بأنيميشن
   CSS خالص (falconIntroOut). لا يعتمد إطلاقاً على تنفيذ JavaScript قبل الرسم — فحتى
   لو تأخّر السكربت أو تعطّل، لا يظهر المحتوى قبل الافتتاحية ولا تبقى عالقة.
   السكربت مهمّته الثانوية فقط: تعليم الانتهاء (لإخفائها نهائياً)، وتخطّيها بأي تفاعل,
   ومنع تكرارها في تنقّلات SPA. تُصيَّر الحاوية في الرئيسية فقط. */

/* المدة الكلية للغطاء = زمن البقاء ثم التلاشي. متطابقة مع falconIntroOut في CSS الحرج. */
const INTRO_MS = 2200;
const INTRO_REDUCED_MS = 900;

/* سكربت سطريّ في <head>: يضبط «done» عند الانتهاء أو التخطّي فيُخفي الغطاء نهائياً.
   لا يضبط «visible» — الظهور هو الحالة الافتراضية في CSS الحرج. */
export const INTRO_BOOTSTRAP = `(function(){if(location.pathname!=='/')return;var d=document.documentElement;if(d.getAttribute('data-falcon-intro')==='done')return;var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;var done=false;var evs=['pointerdown','keydown','wheel','touchmove'];function rm(){for(var i=0;i<evs.length;i++)removeEventListener(evs[i],end,true);}function end(){if(done)return;done=true;d.setAttribute('data-falcon-intro','done');rm();}setTimeout(end,reduced?${INTRO_REDUCED_MS}:${INTRO_MS});for(var i=0;i<evs.length;i++)addEventListener(evs[i],end,{capture:true,passive:true});})();`;

/* CSS حرج سطريّ في <head>: الغطاء ظاهر افتراضياً ويتلاشى بأنيميشن خالص.
   يستهدف المعرّف الثابت #falcon-intro كي يُطبَّق فوراً قبل تحميل وحدة CSS. */
export const INTRO_CRITICAL_CSS =
  "#falcon-intro{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;background:#070707;animation:falconIntroOut 2200ms cubic-bezier(.4,0,.2,1) forwards}" +
  "@media (prefers-reduced-motion:reduce){#falcon-intro{animation-duration:900ms}}" +
  'html[data-falcon-intro="done"] #falcon-intro{display:none}' +
  "@keyframes falconIntroOut{0%,63%{opacity:1;visibility:visible}100%{opacity:0;visibility:hidden}}";

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
