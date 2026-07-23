/* استخراج الشفافية + تدريج سينمائي مخبوز.
   الشخص مصوَّر بضوء نهار محايد على أبيض؛ المشهد ليل دافئ منخفض المفتاح.
   نخبز تدريجاً معتدلاً هنا (لا يمكن للـ CSS استبدال اللون بهذه الدقة)
   ونترك الضبط الدقيق لمتغيّرات CSS. */
const sharp = require("sharp");
const DIR = "apps/web/public/images";
const OUT =
  "C:/Users/HPZBOO~1/AppData/Local/Temp/claude/C--Users-HP-ZBOOK-Desktop-falcon-store/ef605263-0599-4196-b284-4a85e383b7c3/scratchpad";

/* صندوق المحتوى: صفٌّ أو عمودٌ يُحسب محتوى فقط إذا تجاوز عدداً أدنى من
   البكسلات العتبة — وإلا عدّت شوائب ضغط JPEG المعزولة محتوى فاتّسع الصندوق. */
function bboxFromAlpha(rgba, W, H, thr, minCount = 1) {
  const cols = new Int32Array(W);
  const rows = new Int32Array(H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (rgba[(y * W + x) * 4 + 3] > thr) { cols[x]++; rows[y]++; }
  let x0 = 0, x1 = W - 1, y0 = 0, y1 = H - 1;
  while (x0 < W && cols[x0] < minCount) x0++;
  while (x1 > x0 && cols[x1] < minCount) x1--;
  while (y0 < H && rows[y0] < minCount) y0++;
  while (y1 > y0 && rows[y1] < minCount) y1--;
  if (x1 <= x0 || y1 <= y0) return { x: 0, y: 0, w: W, h: H };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

async function cutFigure() {
  const { data, info } = await sharp(DIR + "/falcon-figure.jpg")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const isBg = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn > 205 && mx - mn < 26;
  };

  const alpha = new Uint8Array(W * H).fill(255);
  const seen = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  let sp = 0;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (seen[p]) return;
    seen[p] = 1;
    if (!isBg(p * C)) return;
    alpha[p] = 0;
    stack[sp++] = p;
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (sp > 0) {
    const p = stack[--sp];
    push((p % W) + 1, (p / W) | 0);
    push((p % W) - 1, (p / W) | 0);
    push(p % W, ((p / W) | 0) + 1);
    push(p % W, ((p / W) | 0) - 1);
  }

  /* تآكل بكسلين: يقتل هالة JPEG البيضاء على الحافة تماماً */
  let cur = alpha;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(cur);
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x;
        if (!cur[p]) continue;
        if (!cur[p - 1] || !cur[p + 1] || !cur[p - W] || !cur[p + W]) next[p] = 0;
      }
    cur = next;
  }

  const maskPng = await sharp(Buffer.from(cur), { raw: { width: W, height: H, channels: 1 } })
    .png()
    .toBuffer();
  const softOut = await sharp(maskPng).blur(1.2).raw().toBuffer({ resolveWithObject: true });
  const soft = softOut.data;
  const MS = softOut.info.channels;

  const rgba = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const a = soft[p * MS];
    if (a < 6) continue; /* يبقى أسود شفافاً */
    let r = data[p * C], g = data[p * C + 1], b = data[p * C + 2];

    /* ١) نزع أغلب التشبّع: الأزرق الساطع للدرّاعة يجب ألا يقاتل المشهد */
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const DE = 0.58;
    r += (luma - r) * DE;
    g += (luma - g) * DE;
    b += (luma - b) * DE;

    /* ٢) ميلان دافئ: أحمر أعلى، أزرق مكبوح */
    r *= 1.1;
    g *= 0.95;
    b *= 0.68;

    /* ٣) سحق الظلال ورفع التباين — الوجه يبقى أنصع شيء في الكادر */
    const CN = 1.16, PV = 118;
    r = (r - PV) * CN + PV * 0.82;
    g = (g - PV) * CN + PV * 0.82;
    b = (b - PV) * CN + PV * 0.82;

    rgba[p * 4] = Math.max(0, Math.min(255, r));
    rgba[p * 4 + 1] = Math.max(0, Math.min(255, g));
    rgba[p * 4 + 2] = Math.max(0, Math.min(255, b));
    rgba[p * 4 + 3] = a;
  }

  const box = bboxFromAlpha(rgba, W, H, 10, 4);
  const buf = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .png()
    .toBuffer();

  await sharp(buf)
    .resize({ width: 860, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 92, effort: 5 })
    .toFile(DIR + "/falcon-figure.webp");
  console.log(`figure -> ${box.w}x${box.h}`);

  await sharp({
    create: { width: 860, height: Math.round((860 * box.h) / box.w), channels: 3, background: "#080605" },
  })
    .composite([{ input: DIR + "/falcon-figure.webp" }])
    .png()
    .toFile(OUT + "/check-figure.png");
}

async function cutFlacon() {
  const { data, info } = await sharp(DIR + "/falcon-falcon.jpg")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const rgba = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const r = data[p * C], g = data[p * C + 1], b = data[p * C + 2];
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const lift = 0.055;
    const t = (luma - lift) / (1 - lift);
    const a = t <= 0 ? 0 : Math.min(1, Math.pow(t, 0.5) * 2.6);
    rgba[p * 4] = r;
    rgba[p * 4 + 1] = g;
    rgba[p * 4 + 2] = b;
    rgba[p * 4 + 3] = Math.round(a * 255);
  }

  /* الشوائب والخطوط الرأسية في السواد تخدع أي عتبة مباشرة.
     الحل: تصغير قناة الشفافية وتمويهها بقوة — تختفي الشوائب المعزولة
     ويبقى جسم الزجاجة، فنقيس الصندوق هناك ثم نعيده إلى المقاس الأصلي. */
  const A = Buffer.alloc(W * H);
  for (let p = 0; p < W * H; p++) A[p] = rgba[p * 4 + 3];
  const SW = 180;
  const SH = Math.round((H * SW) / W);
  const small = await sharp(A, { raw: { width: W, height: H, channels: 1 } })
    .resize(SW, SH, { fit: "fill" })
    .blur(2.5)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sd = small.data, SC = small.info.channels;
  const srgba = Buffer.alloc(SW * SH * 4);
  for (let p = 0; p < SW * SH; p++) srgba[p * 4 + 3] = sd[p * SC];
  const sb = bboxFromAlpha(srgba, SW, SH, 92, 2);
  const sx = W / SW, sy = H / SH;
  const box = {
    x: Math.round(sb.x * sx),
    y: Math.round(sb.y * sy),
    w: Math.round(sb.w * sx),
    h: Math.round(sb.h * sy),
  };
  const pad = Math.round(box.w * 0.06);
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const w = Math.min(W - x, box.w + pad * 2);
  const h = Math.min(H - y, box.h + pad * 2);

  const buf = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x, top: y, width: w, height: h })
    .png()
    .toBuffer();

  await sharp(buf)
    .resize({ width: 700, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 94, effort: 5 })
    .toFile(DIR + "/falcon-flacon.webp");
  console.log(`flacon -> ${w}x${h}  (bottle bbox ${box.w}x${box.h} at ${box.x},${box.y})`);

  /* موضع الفوهة داخل الصورة المقصوصة — يُغذّى مباشرة إلى محرّك الرذاذ */
  const nozzleX = (box.x + box.w / 2 - x) / w;
  const nozzleY = (box.y - y + box.h * 0.012) / h;
  console.log(`NOZZLE_IN_IMAGE = { x: ${nozzleX.toFixed(3)}, y: ${nozzleY.toFixed(3)} }`);

  await sharp({
    create: { width: 700, height: Math.round((700 * h) / w), channels: 3, background: "#0b0806" },
  })
    .composite([{ input: DIR + "/falcon-flacon.webp" }])
    .png()
    .toFile(OUT + "/check-flacon.png");
}

(async () => {
  await cutFigure();
  await cutFlacon();
})();
