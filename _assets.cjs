/* توليد أصول المشهد:
   ١) الشخص: قصّ إلى نصف علوي (رأس وكتفان) — كان طويلاً يبتلع الكادر
   ٢) الخلفية: بيئة فالكون الحقيقية (الرخام والدخان الأحمر وشعار الصقر)
      خارج البؤرة — عمق تصويري حقيقي بدل تدرّجات CSS مسطّحة */
const sharp = require("sharp");
const DIR = "apps/web/public/images";
const OUT =
  "C:/Users/HPZBOO~1/AppData/Local/Temp/claude/C--Users-HP-ZBOOK-Desktop-falcon-store/ef605263-0599-4196-b284-4a85e383b7c3/scratchpad";

/* ---------- الشخص: نصف علوي فقط، يذوب أسفله في العتمة ---------- */
async function figure() {
  const src = DIR + "/falcon-figure.webp";
  const m = await sharp(src).metadata();
  /* نُبقي ٦٢٪ العلوية: الرأس والكتفان وأعلى الدرّاعة. الباقي كان طولاً بلا معنى. */
  const keep = Math.round(m.height * 0.62);

  /* قناع تلاشٍ سفلي مخبوز حتى لا تظهر حافة قصّ أفقية أبداً */
  const fade = Buffer.from(
    `<svg width="${m.width}" height="${keep}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
         <stop offset="62%" stop-color="#fff" stop-opacity="1"/>
         <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
       </linearGradient></defs>
       <rect width="100%" height="100%" fill="url(#g)"/>
     </svg>`
  );

  await sharp(src)
    .extract({ left: 0, top: 0, width: m.width, height: keep })
    .composite([{ input: fade, blend: "dest-in" }])
    .webp({ quality: 86, alphaQuality: 92, effort: 5 })
    .toFile(DIR + "/falcon-figure-crop.webp");

  const out = await sharp(DIR + "/falcon-figure-crop.webp").metadata();
  console.log(`figure ${m.width}x${m.height} -> ${out.width}x${out.height}`);

  await sharp({
    create: { width: out.width, height: out.height, channels: 3, background: "#080605" },
  })
    .composite([{ input: DIR + "/falcon-figure-crop.webp" }])
    .png()
    .toFile(OUT + "/check-figure.png");
}

/* ---------- الخلفية: عالم فالكون خارج البؤرة ---------- */
async function backdrop() {
  const src = DIR + "/hero-wide.jpg";
  const m = await sharp(src).metadata();
  /* الثلث الأيسر وحده: شعار الصقر في الدخان الأحمر على الرخام الأسود،
     بلا زجاجات المتجر — نريد بيئة لا لقطة منتجات. */
  const w = Math.round(m.width * 0.372);

  await sharp(src)
    .extract({ left: 0, top: 0, width: w, height: m.height })
    .resize(1100)
    .blur(7)
    .modulate({ brightness: 0.78, saturation: 0.9 })
    .linear(1.12, -16) /* سحق الظلال: العتمة يجب أن تبقى عتمة */
    .webp({ quality: 76, effort: 5 })
    .toFile(DIR + "/sanctum-backdrop.webp");

  const out = await sharp(DIR + "/sanctum-backdrop.webp").metadata();
  console.log(`backdrop ${m.width}x${m.height} -> ${out.width}x${out.height}`);
  await sharp(DIR + "/sanctum-backdrop.webp").png().toFile(OUT + "/check-backdrop.png");
}

(async () => {
  await figure();
  await backdrop();
})();
