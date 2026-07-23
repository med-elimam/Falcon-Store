import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { createDb } from "./index.js";
import { seedCore } from "./seed-core.js";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, "../.env") });
loadDotenv({ path: path.resolve(here, "../../../.env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Aborting seed.");
  process.exit(1);
}

/* حارس الإنتاج: الزرع خطوة تهيئة لمرة واحدة عند أول تركيب فقط. إن انطلق تلقائياً
   مع كل نشر على Railway فإنه يعيد كتابة بيانات المالك (طرق الدفع، رقم واتساب،
   الهوية، ويعيد إدراج الكتالوج الافتراضي) — وهو سبب «عودة القائمة» بعد كل push.
   لذلك نتخطّاه بهدوء في أي بيئة إنتاجية ما لم يُطلب صراحةً لمرة واحدة عبر
   ALLOW_PRODUCTION_SEED=1. نخرج بـ0 (لا خطأ) كي لا نُفشل النشر لو كان مُسَلسَلاً
   بالخطأ داخل أمر الإقلاع؛ فيصبح الزرع عندئذٍ بلا أثر بدل أن يُتلف البيانات. */
const looksProduction =
  process.env.NODE_ENV === "production" ||
  Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID
  );
if (looksProduction && process.env.ALLOW_PRODUCTION_SEED !== "1") {
  console.warn(
    "[seed] Production database detected — skipping seed. Seeding is a one-time bootstrap; " +
      "re-running it overwrites store data. It must NOT be part of the deploy/start command. " +
      "To force a single intentional seed, set ALLOW_PRODUCTION_SEED=1 for that run only."
  );
  process.exit(0);
}

const { db, pool } = createDb(url);
try {
  await seedCore(db);
  console.log("Seed completed: roles, permissions, catalog, payment options, delivery zone suggestions.");
} finally {
  await pool.end();
}
