import { FalconMark } from "@/components/icons";
import styles from "./brand-intro.module.css";

/* افتتاحية «خزنة العطر» — الغطاء يسكن الهيكل الثابت (layout) لا محتوى الصفحة:
   الرئيسية تُبثّ تدريجياً، ولو كان الغطاء داخلها لظهرت الترويسة والفوتر وشريط
   التحميل ثوانيَ قبل وصوله — وهذا كان مصدر «لمحة أسفل الصفحة قبل الافتتاحية».
   المبدأ الآن:
   1. الغطاء موجود في هيكل كل الصفحات من أول بايت؛ CSS حرج يُظهره افتراضياً،
      وسكربت سطريّ متزامن في <head> يخفيه قبل أول رسم في غير الرئيسية.
   2. لا يغادر الغطاء بمؤقّت أعمى بل عند جاهزية المحتوى فعلاً: يراقب وصول قسم
      البطل [data-falcon-hero] ثم يحترم حداً أدنى للعرض، فلا انكشاف على صفحة
      نصف مبثوثة مهما بطؤ الخادم (مع مهلة أمان قصوى كي لا يُحبس الزائر).
   3. كل عودة إلى الرئيسية — تحديثاً أو تنقّلاً من القوائم — تعيد تشغيله: نقرة
      على رابط "/" تُظهر الغطاء في اللحظة نفسها فيغطي الانتقال كاملاً.
   4. أي تفاعل (لمس/عجلة/مفتاح) يتخطاه فوراً، والرجوع بالتاريخ يلغيه. */

/* مدد المشهد: حد أدنى للعرض فوق المحتوى الجاهز، ثم تلاشي الخروج. */
const HOLD_MS = 1400;
const HOLD_REDUCED_MS = 600;
const FADE_MS = 800;
const FADE_REDUCED_MS = 320;
/* مهلة الأمان القصوى: انكشاف إجباري لو تعثّر البث أو فشل تنقّل — لا حبس أبداً. */
const SAFETY_MS = 6500;

/* سكربت سطريّ متزامن في <head> (وسم <script> خام لا next/script — ضمانة تنفيذ
   قبل أول رسم): يدير دورة الغطاء كاملة على كل الصفحات ويعترض نقرات العودة "/" */
export const INTRO_BOOTSTRAP = `(function(){var d=document.documentElement;var m=matchMedia('(prefers-reduced-motion: reduce)').matches;var HOLD=m?${HOLD_REDUCED_MS}:${HOLD_MS};var FADE=m?${FADE_REDUCED_MS}:${FADE_MS};var active=false,ready=false,t0=0,mo=null,endT=0,holdT=0,safeT=0;var evs=['pointerdown','keydown','wheel','touchmove'];function un(){for(var i=0;i<evs.length;i++)removeEventListener(evs[i],skip,true);removeEventListener('popstate',skip);if(mo){mo.disconnect();mo=null}clearTimeout(holdT);clearTimeout(safeT)}function fin(){d.setAttribute('data-falcon-intro','done')}function leave(){if(!active)return;active=false;un();try{if(location.pathname==='/')scrollTo(0,0)}catch(e){}d.setAttribute('data-falcon-intro','leaving');endT=setTimeout(fin,FADE+120)}function skip(){if(!active)return;active=false;un();clearTimeout(endT);fin()}function onReady(){if(!active||ready)return;ready=true;if(mo){mo.disconnect();mo=null}var left=HOLD-(performance.now()-t0);holdT=setTimeout(leave,left>0?left:0)}function watch(){if(document.querySelector('[data-falcon-hero]')){onReady();return}mo=new MutationObserver(function(){if(document.querySelector('[data-falcon-hero]'))onReady()});mo.observe(d,{childList:true,subtree:true})}function begin(){if(active)return;active=true;ready=false;t0=performance.now();clearTimeout(endT);d.removeAttribute('data-falcon-intro');for(var i=0;i<evs.length;i++)addEventListener(evs[i],skip,{capture:true,passive:true});addEventListener('popstate',skip);safeT=setTimeout(onReady,${SAFETY_MS});watch()}if(location.pathname==='/'){try{history.scrollRestoration='manual';if(!location.hash)scrollTo(0,0)}catch(e){}begin()}else{fin()}addEventListener('click',function(e){if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;var t=e.target;var a=t&&t.closest?t.closest('a[href]'):null;if(!a||a.getAttribute('href')!=='/'||a.target==='_blank')return;if(location.pathname==='/')return;begin()},true);})();`;

/* CSS حرج سطريّ في <head>: الغطاء ظاهر افتراضياً؛ «leaving» يبدأ تلاشي الخروج،
   و«done» يخفيه نهائياً. أنيميشن الاحتياط المؤجَّل (7s) يضمن الانكشاف حتى بلا JS. */
export const INTRO_CRITICAL_CSS =
  "#falcon-intro{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;background:#070707;animation:falconIntroOut 1200ms 7s cubic-bezier(.4,0,.2,1) forwards}" +
  `html[data-falcon-intro="leaving"] #falcon-intro{animation:falconIntroLeave ${FADE_MS}ms cubic-bezier(.4,0,.2,1) forwards}` +
  'html[data-falcon-intro="done"] #falcon-intro{display:none}' +
  "@keyframes falconIntroOut{to{opacity:0;visibility:hidden}}" +
  "@keyframes falconIntroLeave{to{opacity:0;visibility:hidden}}" +
  `@media (prefers-reduced-motion:reduce){html[data-falcon-intro="leaving"] #falcon-intro{animation-duration:${FADE_REDUCED_MS}ms}}`;

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
