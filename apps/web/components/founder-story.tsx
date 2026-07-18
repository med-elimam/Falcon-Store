import Image from "next/image";
import { ArrowLeft, FalconMark } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { waLink } from "@/lib/format";
import styles from "./founder-story.module.css";

/* لا يظهر هذا القسم إلا إذا كتب صاحب المتجر قصته فعلاً من لوحة التحكم —
   بلا نص أو صورة افتراضية. */
export function FounderStory({
  titleAr,
  bodyAr,
  whatsapp,
  imageUrl,
}: {
  titleAr: string | null;
  bodyAr: string;
  whatsapp: string | null;
  imageUrl: string;
}) {
  const contactUrl = whatsapp
    ? waLink(whatsapp, "السلام عليكم، أريد الاستفسار عن عطور فالكون ستور.")
    : null;

  return (
    <section className={styles.section} aria-labelledby="founder-story-title">
      <div className={styles.frame}>
        <Reveal className={styles.media}>
          <Image
            src={imageUrl}
            alt="فريق فالكون ستور في نواكشوط"
            fill
            sizes="(max-width: 760px) calc(100vw - 28px), (max-width: 1200px) 54vw, 720px"
          />
        </Reveal>

        <Reveal className={styles.content} delay={0.1}>
          <div className={styles.brandLine} aria-hidden="true">
            <FalconMark />
            <span />
          </div>
          <p className={styles.label}>قصتنا</p>
          <h2 id="founder-story-title">{titleAr ?? "قصتنا"}</h2>
          <p className={styles.copy} style={{ whiteSpace: "pre-line" }}>
            {bodyAr}
          </p>
          {contactUrl && (
            <a
              href={contactUrl}
              className={`btn btn-crimson ${styles.cta}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              تواصل معنا <ArrowLeft />
            </a>
          )}
        </Reveal>
      </div>
    </section>
  );
}
