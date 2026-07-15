# Falcon Store — The Scent Vault

منصة تجارة إلكترونية عربية أولًا لمتجر الصقر للعطور في نواكشوط:
واجهة Next.js على Vercel + واجهة برمجة TypeScript مستقلة على Railway + PostgreSQL.

## بنية المستودع (Monorepo)

```
apps/
  web/        واجهة المتجر + لوحة الإدارة (/manage) — Next.js App Router
  api/        الخادم الموثوق الوحيد — Fastify + Drizzle (مصادقة، كتالوج، طلبات، مخزون، إعدادات، وسائط، تدقيق)
packages/
  database/   مخطط Drizzle + الهجرات + أمر الزرع + PGlite للاختبارات
  shared/     أنواع وDTO وصلاحيات وTOTP مشتركة
  validation/ مخططات Zod لكل مدخلات API
  config/     ثوابت المنصة وتحميل متغيرات البيئة الموثّق
```

الواجهة لا تتصل بقاعدة البيانات إطلاقًا — كل شيء عبر `NEXT_PUBLIC_API_URL` بـHTTPS.

## التشغيل المحلي

```bash
npm install

# الخادم — خياران:
npm run dev -w @falcon/api         # يتطلب PostgreSQL محليًا (apps/api/.env)
npm run dev:local -w @falcon/api   # بدون تثبيت Postgres: PGlite داخل الذاكرة + هجرات + زرع تلقائي

# الواجهة:
npm run dev:web
```

ثم افتح `http://localhost:3000`. لإنشاء حساب المالك محليًا استخدم رمز
`BOOTSTRAP_TOKEN` الموجود في `apps/api/.env` عبر `POST /api/v1/bootstrap/owner`.

## أوامر الجودة

```bash
npm run typecheck   # فحص الأنواع في كل مساحات العمل
npm run lint        # ESLint للواجهة
npm test            # اختبارات API (مصادقة/صلاحيات/طلبات/أسعار ومخزون) على PGlite بهجرات حقيقية
npm run build       # بناء إنتاجي للواجهة والخادم
npm run db:generate # توليد هجرة جديدة من المخطط
npm run db:migrate  # تطبيق الهجرات (DATABASE_URL)
npm run db:seed     # زرع الأدوار والصلاحيات والكتالوج وخيارات الدفع/التوصيل
```

فحوص الأداء: `lighthouserc.json` يضبط ميزانيات LCP/CLS/TBT للهاتف — شغّلها مع
`npx @lhci/cli autorun` أثناء تشغيل الواجهة محليًا.

## النشر

- **Railway (API + PostgreSQL):** أنشئ خدمة من هذا المستودع؛ `apps/api/railway.toml`
  يضبط البناء والتشغيل (يشغّل الهجرات قبل الإقلاع) ومسار الفحص `/health`.
  اربط Volume على `MEDIA_DIR` لتخزين الصور المرفوعة. المتغيرات المطلوبة في
  `apps/api/.env.example`.
- **Vercel (الواجهة):** Root Directory = `apps/web`؛ `vercel.json` يضبط أوامر
  التثبيت والبناء لمساحات العمل. المتغيرات في `apps/web/.env.example`.
- **حساب المالك الأول:** يُنشأ مرة واحدة عبر رمز `BOOTSTRAP_TOKEN` في بيئة
  Railway، ثم يتعطل المسار نهائيًا — احذف الرمز من البيئة بعد الإنشاء.

## قواعد المحتوى

- الأسعار أعداد صحيحة بالأوقية الجديدة (MRU) في قاعدة البيانات؛ طريقة العرض
  (جديدة/قديمة) إعداد يحدده المالك.
- المنتج لا يُنشر للزبائن قبل اكتمال بياناته (اسم عربي، وصف، علامة، صورة،
  حجم مسعّر) — يفرضه الخادم.
- أقسام الموقع المرتبطة ببيانات تجارية (واتساب، توصيل، دفع، أصالة، تواصل)
  تظهر فقط بعد أن يُكملها المالك من معالج الإعداد في `/manage/setup`.
