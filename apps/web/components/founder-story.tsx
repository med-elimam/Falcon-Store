import Image from "next/image";
import { ArrowLeft, FalconMark } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { waLink } from "@/lib/format";
import styles from "./founder-story.module.css";

export function FounderStory({ whatsapp }: { whatsapp: string | null }) {
  const contactUrl = whatsapp
    ? waLink(whatsapp, "السلام عليكم، أريد الاستفسار عن عطور فالكون ستور.")
    : null;

  return (
    <section className={styles.section} aria-labelledby="founder-story-title">
      <div className={styles.frame}>
        <Reveal className={styles.media}>
          <Image
            src="/images/falcon-founder.jpg"
            alt="مؤسس فالكون ستور في نواكشوط"
            fill
            sizes="(max-width: 760px) calc(100vw - 28px), (max-width: 1200px) 54vw, 720px"
          />
        </Reveal>

        <Reveal className={styles.content} delay={0.1}>
          <div className={styles.brandLine} aria-hidden="true">
            <FalconMark />
            <span />
          </div>
          <p className={styles.label}>خلف فالكون</p>
          <h2 id="founder-story-title">من شغف بالعطور إلى اختيارات نثق بها.</h2>
          <p className={styles.copy}>
            بدأ فالكون ستور من شغفٍ بالعطور ورغبةٍ في تقديم اختيارات أصلية ومدروسة في
            نواكشوط، مع تعبئة دقيقة وخدمة تهتم بالتفاصيل قبل الطلب وبعده.
          </p>
          <div className={styles.signature}>
            <strong>مؤسس Falcon Store</strong>
            <span>نواكشوط، موريتانيا</span>
          </div>
          {contactUrl && (
            <a
              href={contactUrl}
              className={`btn btn-crimson ${styles.cta}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              تواصل مع فالكون <ArrowLeft />
            </a>
          )}
        </Reveal>
      </div>
    </section>
  );
}
