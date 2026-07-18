import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export interface HeroSceneHandle {
  setPaused(paused: boolean): void;
  dispose(): void;
}

/* ذهب عتيق غير لامع بإفراط — يظهر على الطوق والبخاخ فقط (الذهب تفصيل لا كسوة) */
const GOLD = 0xc8a25e;

/* أبعاد الفلاكون: جسم مستطيل سميك بحواف مشطوفة — لغة العطور الفاخرة لا القوارير المستديرة */
const BODY_W = 1.6;
const BODY_H = 2.3;
const BODY_D = 0.6;
const BODY_R = 0.1;
/* السائل منخفض عن فوهة الزجاجة: قاعدة زجاج سميكة تحته وفراغ هواء فوقه — علامتا الزجاج الثقيل */
const LIQ_BOTTOM = 0.24;
const LIQ_TOP = 1.72;
const LIQ_H = LIQ_TOP - LIQ_BOTTOM;

/* يحوّل أي لون CSS (بما فيه oklch) إلى RGB عبر كانفاس 2D */
function cssColorToRGB(color: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [9, 7, 7];
  ctx.fillStyle = "#090707";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

function makeSpriteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255, 236, 200, 1)");
  g.addColorStop(0.4, "rgba(255, 224, 170, 0.45)");
  g.addColorStop(1, "rgba(255, 224, 170, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(0, 0, 0, 0.85)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* هالة إشعاع دائرية ناعمة تُوضع خلف الزجاجة فيلتقطها انكسار الزجاج — أثر «الإضاءة الخلفية» */
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255, 190, 120, 0.55)");
  g.addColorStop(0.35, "rgba(220, 140, 70, 0.22)");
  g.addColorStop(0.7, "rgba(160, 90, 40, 0.06)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* قناع دائري بلون الخلفية يطفئ الانعكاس الأرضي تدريجياً كلما ابتعد عن القاعدة */
function makeReflectionFadeTexture(bg: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.globalCompositeOperation = "destination-out";
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.92)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* لوحة معدنية قاتمة بإطار ذهبي مزدوج — تُثبت على الوجه الأمامي المسطح فتظهر حادة بلا تشوه */
function makeLabelTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 1024, 1024);

  const x = 192, y = 288, w = 640, h = 448, r = 24;
  const plaque = () => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  plaque();
  ctx.fillStyle = "rgba(13, 10, 8, 0.97)";
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#c8a25e";
  ctx.stroke();
  ctx.save();
  plaque();
  ctx.clip();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(200, 162, 94, 0.5)";
  ctx.strokeRect(x + 22, y + 22, w - 44, h - 44);
  /* لمعة قطرية خفيفة كأنها معدن مصقول */
  const sheen = ctx.createLinearGradient(x, y, x + w, y + h);
  sheen.addColorStop(0.3, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.06)");
  sheen.addColorStop(0.7, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#d9b877";
  ctx.font = "600 104px Georgia, 'Times New Roman', serif";
  ctx.fillText("F A L C O N", 512, 468);

  /* فاصل بمعيّن صغير في المنتصف */
  ctx.strokeStyle = "rgba(200, 162, 94, 0.65)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(340, 516);
  ctx.lineTo(492, 516);
  ctx.moveTo(532, 516);
  ctx.lineTo(684, 516);
  ctx.stroke();
  ctx.fillStyle = "rgba(200, 162, 94, 0.85)";
  ctx.save();
  ctx.translate(512, 516);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();

  ctx.fillStyle = "rgba(232, 216, 184, 0.9)";
  ctx.font = "44px Georgia, serif";
  ctx.fillText("E A U   D E   P A R F U M", 512, 596);

  ctx.fillStyle = "#ece0c8";
  ctx.font = "58px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("متجر الصقر", 512, 686);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* بيئة استوديو تصوير منتجات: أشرطة ضوء عمودية طويلة تنساب على حواف الزجاج،
   سوفت بوكس علوي، وشريط خلفي بلون العلامة — هذا ما يصنع «لمعة العطر» الحقيقية */
function makeStudioEnvironment(renderer: THREE.WebGLRenderer, accent: THREE.Color): THREE.Texture {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(24, 16, 24),
    new THREE.MeshBasicMaterial({ color: 0x090807, side: THREE.BackSide })
  );
  env.add(room);

  const panel = (w: number, h: number, color: number | THREE.Color, intensity: number) => {
    const mat = new THREE.MeshBasicMaterial();
    mat.color.set(color).multiplyScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    env.add(mesh);
    return mesh;
  };

  /* شريط رئيسي طويل يسار — الومضة العمودية الكبرى على الزجاج */
  const keyStrip = panel(1.4, 10, 0xfff0dd, 14);
  keyStrip.position.set(-6.5, 3, 0.8);
  keyStrip.rotation.y = Math.PI / 2;
  /* شريط مقابل أدفأ وأخف */
  const fillStrip = panel(1.0, 9, 0xffe3b5, 8);
  fillStrip.position.set(6.5, 3, 1.2);
  fillStrip.rotation.y = -Math.PI / 2;
  /* سوفت بوكس علوي واسع */
  const top = panel(7, 7, 0xfff5e8, 3.2);
  top.position.set(0, 7.4, 0);
  top.rotation.x = Math.PI / 2;
  /* تعبئة أمامية ناعمة على وجه الزجاجة */
  const front = panel(5, 3, 0xfdeede, 1.5);
  front.position.set(0.5, 2, 7.6);
  front.rotation.y = Math.PI;
  /* قبلة لونية خلفية بلون العلامة على الحافة */
  const brand = panel(3, 0.8, accent, 2.6);
  brand.position.set(-2, 2.6, -7);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  env.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) (mesh.material as THREE.Material).dispose();
  });
  return tex;
}

const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);

/* الوقفة الأساسية: ¾ view — دوران Y نحو 15° وميل Z طفيف بلا دوران كامل */
const BASE_YAW = -0.26;
const BASE_TILT = 0.04;
const ENTRY_DURATION = 1.5;

/* دورة الرشّة: ضغطة على البخاخ ثم نفثة رذاذ ناعمة تتبدد */
const MIST_COUNT = 140;
const MIST_PERIOD = 7;
const MIST_LIFE = 1.6;
/* اتجاه النفثة: نحو الكاميرا بميل يسار-أعلى — يبقى داخل الكادر فوق المنطقة المعتمة */
const MIST_DIR = new THREE.Vector3(-0.38, 0.24, 0.85).normalize();

export function createHeroScene(
  container: HTMLElement,
  onReady: () => void,
  opts?: { staticMode?: boolean }
): HeroSceneHandle {
  /* staticMode: لمن يفضّلون تقليل الحركة — الوقفة النهائية مباشرة بلا دخول ولا رذاذ */
  const staticMode = opts?.staticMode === true;
  const compactViewport = window.matchMedia("(max-width: 768px)").matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: !compactViewport || window.devicePixelRatio <= 1.5,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, compactViewport ? 1.35 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.className = "hero-3d-canvas";
  /* أبعاد inline حتى لا يشارك الكانفاس في تدفق التخطيط إطلاقاً */
  Object.assign(renderer.domElement.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    touchAction: "pan-y",
    cursor: "grab",
  });
  container.appendChild(renderer.domElement);

  /* الألوان تُقرأ من ثيم الصفحة الفعلي حتى يندمج المشهد بلا أي حواف */
  const heroEl = container.closest<HTMLElement>(".hero") ?? document.body;
  const heroStyle = getComputedStyle(heroEl);
  const [bgR, bgG, bgB] = cssColorToRGB(heroStyle.backgroundColor);
  const bgCss = `rgb(${bgR}, ${bgG}, ${bgB})`;
  const isLight = (0.2126 * bgR + 0.7152 * bgG + 0.0722 * bgB) / 255 > 0.5;

  /* لون العلامة الذي يختاره الأدمن — يلوّن إضاءة الحافة ويُشرب في السائل بلمسة خفيفة.
     السائل نفسه عنبري عسلي دائماً: هذا لون العطر الحقيقي، لا لون العصير. */
  const accentCss = heroStyle.getPropertyValue("--brand-accent").trim();
  const [acR, acG, acB] = accentCss ? cssColorToRGB(accentCss) : [162, 15, 53];
  const accent = new THREE.Color().setRGB(acR / 255, acG / 255, acB / 255, THREE.SRGBColorSpace);
  const accentLight = accent.clone().lerp(new THREE.Color(0xffffff), 0.2);
  const amber = new THREE.Color(0xc9791f).lerp(accent, 0.16);
  const liquidDeep = amber.clone().lerp(new THREE.Color(0x000000), 0.62);
  const liquidBright = amber.clone().lerp(new THREE.Color(0xffd9a0), 0.5);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bgCss);
  scene.environment = makeStudioEnvironment(renderer, accent);
  scene.environmentIntensity = isLight ? 0.65 : 0.95;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

  /* إضاءة عامة: مفتاح دافئ + محيط خافت. الأضواء الملتصقة بالزجاجة تُضاف لاحقاً داخل مجموعتها */
  const keyLight = new THREE.DirectionalLight(0xfff1e0, 1.15);
  keyLight.position.set(2.5, 4.5, 5);
  scene.add(keyLight, new THREE.AmbientLight(isLight ? 0x8f8b90 : 0x2a2724, isLight ? 0.5 : 0.7));

  const root = new THREE.Group();
  scene.add(root);

  /* ================= الفلاكون ================= */
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.03,
    transmission: 1,
    thickness: 0.5,
    ior: 1.5,
    attenuationColor: new THREE.Color(0xe8dcc8),
    attenuationDistance: 2.4,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    specularIntensity: 1.1,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.3 });
  const capMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a090b,
    metalness: 0.2,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });

  /* السائل: عنبري نصف مضيء بتدرّج عمودي يُحقن في الشيدر (أعمق عند القاعدة، أنصع قرب السطح)
     فيبدو كسائل ينفذه الضوء لا كطلاء معتم */
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.08,
    clearcoat: 0.7,
    emissive: amber.clone().lerp(new THREE.Color(0x000000), 0.35),
    emissiveIntensity: 0.34,
  });
  liquidMat.onBeforeCompile = (shader) => {
    shader.uniforms.uLiqDeep = { value: liquidDeep };
    shader.uniforms.uLiqBright = { value: liquidBright };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vLiqY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLiqY = position.y;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vLiqY;\nuniform vec3 uLiqDeep;\nuniform vec3 uLiqBright;"
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float liqT = smoothstep(-${(LIQ_H / 2).toFixed(3)}, ${(LIQ_H / 2).toFixed(3)}, vLiqY);
        diffuseColor.rgb = mix(uLiqDeep, uLiqBright, liqT);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= (0.35 + 0.85 * liqT);"
      );
  };

  const bottle = new THREE.Group();
  bottle.name = "bottle";

  const glass = new THREE.Mesh(new RoundedBoxGeometry(BODY_W, BODY_H, BODY_D, 6, BODY_R), glassMat);
  glass.position.y = BODY_H / 2;

  const liquid = new THREE.Mesh(
    new RoundedBoxGeometry(BODY_W - 0.26, LIQ_H, BODY_D - 0.2, 5, 0.07),
    liquidMat
  );
  liquid.position.y = LIQ_BOTTOM + LIQ_H / 2;

  /* الطوق الذهبي فوق الكتفين ثم ساق البخاخ ورأسه — الرشّاش الظاهر هو توقيع «هذا عطر» */
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.26, 40), goldMat);
  collar.position.y = BODY_H + 0.13;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.1, 24), goldMat);
  stem.position.y = BODY_H + 0.31;
  const sprayHead = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.001, 0),
        new THREE.Vector2(0.095, 0),
        new THREE.Vector2(0.105, 0.025),
        new THREE.Vector2(0.105, 0.13),
        new THREE.Vector2(0.08, 0.155),
        new THREE.Vector2(0.001, 0.16),
      ],
      36
    ),
    goldMat
  );
  const SPRAY_HEAD_Y = BODY_H + 0.36;
  sprayHead.position.y = SPRAY_HEAD_Y;
  /* فوهة الرذاذ: نقطة قاتمة على جانب الرأس */
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0x141210, metalness: 0.6, roughness: 0.5 })
  );
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(-0.1, 0.085, 0);
  sprayHead.add(nozzle);
  /* توجيه فوهة الرأس (المحفورة على جهة -x) نحو اتجاه النفثة */
  sprayHead.rotation.y = Math.atan2(MIST_DIR.z, -MIST_DIR.x);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 1.35),
    new THREE.MeshStandardMaterial({
      map: makeLabelTexture(),
      transparent: true,
      metalness: 0.25,
      roughness: 0.5,
    })
  );
  label.position.set(0, 1.02, BODY_D / 2 + 0.004);

  bottle.add(glass, liquid, collar, stem, sprayHead, label);
  bottle.rotation.set(0, BASE_YAW, BASE_TILT);

  /* الغطاء الأسود اللامع موضوع جانباً على الأرض — لقطة إعلانات العطور الكلاسيكية،
     وهو ما يكشف البخاخ الذهبي */
  const capGroup = new THREE.Group();
  capGroup.name = "cap";
  const capLiner = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.08, 0.5, 3, 0.05), goldMat);
  capLiner.position.y = 0.04;
  const capBody = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.82, 0.56, 5, 0.09), capMat);
  capBody.position.y = 0.48;
  capGroup.add(capLiner, capBody);
  capGroup.position.set(1.05, 0, 0.52);
  capGroup.rotation.y = 0.55;

  const product = new THREE.Group();
  product.add(bottle, capGroup);
  root.add(product);

  /* انعكاس أرضي زائف: نسخة شبحية مقلوبة تحت مستوى الأرض تُخمد تدريجياً بقناع دائري —
     أثر «المنصة المصقولة» في تصوير المنتجات بكلفة زهيدة */
  const ghostCache = new Map<THREE.Material, THREE.Material>();
  const ghostFor = (mat: THREE.Material): THREE.Material => {
    let g = ghostCache.get(mat);
    if (g) return g;
    if (mat === glassMat) {
      g = new THREE.MeshStandardMaterial({
        color: 0x0c0b0a,
        metalness: 1,
        roughness: 0.08,
        transparent: true,
        opacity: 0.5,
      });
    } else if (mat === liquidMat) {
      g = new THREE.MeshStandardMaterial({
        color: amber.clone().lerp(new THREE.Color(0x000000), 0.25),
        emissive: amber.clone().lerp(new THREE.Color(0x000000), 0.5),
        emissiveIntensity: 0.4,
        roughness: 0.15,
        transparent: true,
        opacity: 0.38,
      });
    } else {
      g = mat.clone();
      g.transparent = true;
      g.opacity = mat === goldMat ? 0.5 : 0.4;
    }
    g.depthWrite = false;
    g.side = THREE.DoubleSide;
    ghostCache.set(mat, g);
    return g;
  };
  const reflection = product.clone(true);
  reflection.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.material = ghostFor(mesh.material as THREE.Material);
      mesh.renderOrder = 1;
    }
  });
  reflection.scale.y = -1;
  root.add(reflection);
  const reflectedBottle = reflection.getObjectByName("bottle") as THREE.Group;

  /* هالة خلفية مضيئة خلف الزجاجة: transparent=false مع مزج إضافي كي تُرسم في الممر المعتم
     فيلتقطها عازل الـ transmission — هكذا يتوهج الزجاج الفارغ والسائل من الخلف */
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 4.8),
    new THREE.MeshBasicMaterial({
      map: makeGlowTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.position.set(0.2, 1.4, -2.1);
  product.add(glow);

  /* أضواء ملتصقة بالزجاجة (تُضاف بعد الاستنساخ حتى لا تتضاعف):
     توهج خلفي دافئ ينفذ عبر السائل + حافة بلون العلامة */
  const backGlow = new THREE.PointLight(0xffbe7a, isLight ? 12 : 24, 0, 2);
  backGlow.position.set(0.4, 1.3, -1.8);
  const rimLight = new THREE.PointLight(accentLight, isLight ? 14 : 26, 0, 2);
  rimLight.position.set(-2.4, 2.6, -0.6);
  const goldKiss = new THREE.PointLight(0xffe2b8, isLight ? 10 : 16, 0, 2);
  goldKiss.position.set(2.6, 3.2, 2.2);
  product.add(backGlow, rimLight, goldKiss);

  /* أرضية: قناع إخماد الانعكاس ثم ظلال تلامس ناعمة */
  const ground = new THREE.Group();
  const fade = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({
      map: makeReflectionFadeTexture(bgCss),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  );
  fade.rotation.x = -Math.PI / 2;
  fade.position.set(0.4, 0.002, 0.2);
  fade.renderOrder = 2;
  const shadowTexture = makeShadowTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: isLight ? 0.26 : 0.5,
      depthWrite: false,
      toneMapped: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  shadow.renderOrder = 3;
  const capShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: isLight ? 0.2 : 0.4,
      depthWrite: false,
      toneMapped: false,
    })
  );
  capShadow.rotation.x = -Math.PI / 2;
  capShadow.position.set(1.05, 0.004, 0.52);
  capShadow.renderOrder = 3;
  ground.add(fade, shadow, capShadow);
  root.add(ground);

  /* غبار ذهبي خفيف في عمق المشهد */
  const DUST_COUNT = 70;
  const dustPositions = new Float32Array(DUST_COUNT * 3);
  const dustSpeeds = new Float32Array(DUST_COUNT);
  const dustPhases = new Float32Array(DUST_COUNT);
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 6;
    dustPositions[i * 3 + 1] = 0.2 + Math.random() * 4.8;
    dustPositions[i * 3 + 2] = -2.6 + Math.random() * 3.4;
    dustSpeeds[i] = 0.07 + Math.random() * 0.16;
    dustPhases[i] = Math.random() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const spriteTexture = makeSpriteTexture();
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      size: 0.045,
      map: spriteTexture,
      color: isLight ? 0x8a6c3f : 0xe3bd7a,
      transparent: true,
      opacity: isLight ? 0.3 : 0.55,
      depthWrite: false,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    })
  );
  dust.renderOrder = 4;
  dust.frustumCulled = false;
  root.add(dust);

  /* نفثة الرذاذ: سحابة نقاط دقيقة تنطلق من الفوهة مع ضغطة الرأس ثم تتبدد */
  const mistPositions = new Float32Array(MIST_COUNT * 3);
  const mistVelocities = new Float32Array(MIST_COUNT * 3);
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPositions, 3));
  const mistMat = new THREE.PointsMaterial({
    size: 0.1,
    map: spriteTexture,
    color: 0xfff0d6,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mist = new THREE.Points(mistGeo, mistMat);
  mist.renderOrder = 5;
  mist.frustumCulled = false;
  mist.visible = false;
  root.add(mist);

  const tmpVec = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);
  const seedMist = () => {
    sprayHead.getWorldPosition(tmpVec);
    tmpVec.y += 0.1;
    root.worldToLocal(tmpVec);
    const dir = MIST_DIR.clone().applyAxisAngle(upAxis, bottle.rotation.y);
    for (let i = 0; i < MIST_COUNT; i++) {
      /* انطلاقة متدرجة على طول الاتجاه كي تتشكل مروحة لا كتلة */
      const head = Math.random() * 0.14;
      mistPositions[i * 3] = tmpVec.x + dir.x * head + (Math.random() - 0.5) * 0.02;
      mistPositions[i * 3 + 1] = tmpVec.y + dir.y * head + (Math.random() - 0.5) * 0.02;
      mistPositions[i * 3 + 2] = tmpVec.z + dir.z * head + (Math.random() - 0.5) * 0.02;
      const speed = 1.6 + Math.random() * 1.2;
      mistVelocities[i * 3] = (dir.x + (Math.random() - 0.5) * 0.55) * speed;
      mistVelocities[i * 3 + 1] = (dir.y + (Math.random() - 0.5) * 0.55) * speed;
      mistVelocities[i * 3 + 2] = (dir.z + (Math.random() - 0.5) * 0.55) * speed;
    }
    (mistGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  /* تكوين جانبي متجاوب: الزجاجة نحو حافة الشاشة والنص يأخذ الجهة المقابلة */
  let bottleTargetX = -1.4;
  let camZ = 7.4;
  let camY = 1.62;
  let lookY = 1.5;

  const renderOnce = () => renderer.render(scene, camera);

  const applyComposition = () => {
    const aspect = camera.aspect;
    if (window.matchMedia("(max-width: 768px)").matches) {
      /* هاتف: المسرح قصير وعريض والهيدر الثابت يغطي شريطه العلوي — نبعد الكاميرا قليلاً
         ونرفع نقطة النظر حتى ينزل الفلاكون في الكادر ويظهر البخاخ ونفثته كاملين تحت الهيدر */
      camZ = 8.3;
      bottleTargetX = Math.max(-2.3, -aspect * 1.02);
      camY = 1.82;
      lookY = 1.68;
    } else if (aspect < 0.9) {
      /* هاتف: الزجاجة ~55% من العرض في الجزء العلوي، حافتها اليسرى مقصوصة قليلاً،
         والثلث السفلي يبقى نظيفاً للوصف والأزرار */
      camZ = 9.4;
      const halfW = Math.tan((camera.fov * Math.PI) / 360) * camZ * aspect;
      bottleTargetX = -(halfW - 0.62);
      camY = 0.78;
      lookY = 0.68;
    } else {
      /* سطح المكتب: الزجاجة كبيرة من اليسار إلى المركز، النص في اليمين */
      camZ = 7.4;
      bottleTargetX = Math.max(-2.6, -aspect * 1.02);
      camY = 1.52;
      lookY = 1.36;
    }
    camera.position.set(0, camY, camZ);
    camera.lookAt(bottleTargetX * 0.4, lookY, 0);
    if (entryT >= ENTRY_DURATION) {
      product.position.x = bottleTargetX;
      reflection.position.x = bottleTargetX;
      ground.position.x = bottleTargetX;
    }
  };

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    applyComposition();
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (staticMode) renderOnce();
  };

  /* دخول المشهد: الزجاجة تنزلق من حافتها، الكاميرا تقترب، ولمعة تمر على الزجاج */
  let entryT = staticMode ? ENTRY_DURATION : 0;
  resize();
  if (staticMode) {
    product.position.x = bottleTargetX;
    reflection.position.x = bottleTargetX;
    ground.position.x = bottleTargetX;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /* تفاعل: سحب خفيف يعود بنابض إلى الوقفة الأساسية — لا دوران كامل */
  let dragging = false;
  let lastX = 0;
  let userYaw = 0;
  let mouseX = 0;
  let mouseY = 0;
  const canvas = renderer.domElement;
  const syncReflection = () => {
    reflectedBottle.rotation.copy(bottle.rotation);
    reflectedBottle.position.copy(bottle.position);
  };
  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    userYaw = THREE.MathUtils.clamp(userYaw + dx * 0.006, -0.9, 0.9);
    if (staticMode) {
      bottle.rotation.y = BASE_YAW + userYaw;
      syncReflection();
      renderOnce();
    }
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  const onPointer = (e: PointerEvent) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("pointermove", onPointer, { passive: true });

  const timer = new THREE.Timer();
  timer.connect(document);
  let announced = false;
  /* موقّت الرشّة: يبدأ سالباً حتى تأتي أول نفثة بعد استقرار الدخول بلحظة */
  let mistClock = -2.4;
  let mistCycle = -1;
  const frame = (timestamp?: number) => {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();

    if (entryT < ENTRY_DURATION) {
      entryT += dt;
      const k = easeOutCubic(Math.min(1, entryT / ENTRY_DURATION));
      /* تدخل من جهتها (اليسار في RTL) وتستقر في مكانها */
      const x = bottleTargetX - (1 - k) * 2.4;
      product.position.x = x;
      reflection.position.x = x;
      ground.position.x = x;
      camera.position.z = camZ + (1 - k) * 0.9;
      camera.lookAt(bottleTargetX * 0.4, lookY, 0);
      /* لمعة تمر على الزجاج بشكل قوس واحد */
      keyLight.position.x = -6 + k * 8.5;
    } else {
      product.position.x = bottleTargetX;
      reflection.position.x = bottleTargetX;
      ground.position.x = bottleTargetX;
      keyLight.position.x = 2.5;
    }

    /* تنفس بصري خفيف بعد الاستقرار + عودة نابضة بعد السحب */
    if (!dragging) userYaw *= Math.exp(-1.4 * dt);
    bottle.rotation.y = BASE_YAW + userYaw + Math.sin(t * 0.5) * 0.024;
    bottle.rotation.z = BASE_TILT;
    bottle.position.y = 0.05 + Math.sin(t * 0.7) * 0.03;
    syncReflection();

    root.rotation.x += (mouseY * 0.025 - root.rotation.x) * Math.min(1, dt * 3);
    root.rotation.y += (mouseX * 0.045 - root.rotation.y) * Math.min(1, dt * 3);

    /* دورة الرشّة بعد اكتمال الدخول */
    if (entryT >= ENTRY_DURATION) {
      mistClock += dt;
      if (mistClock >= 0) {
        const cycle = Math.floor(mistClock / MIST_PERIOD);
        const m = mistClock - cycle * MIST_PERIOD;
        if (cycle !== mistCycle) {
          mistCycle = cycle;
          seedMist();
        }
        /* ضغطة الرأس: هبوط سريع ثم عودة */
        const press = m < 0.12 ? easeOutCubic(m / 0.12) : m < 0.32 ? 1 - (m - 0.12) / 0.2 : 0;
        sprayHead.position.y = SPRAY_HEAD_Y - press * 0.045;
        if (m < MIST_LIFE) {
          mist.visible = true;
          const e = m < 0.1 ? m / 0.1 : Math.max(0, 1 - (m - 0.1) / (MIST_LIFE - 0.1));
          mistMat.opacity = 0.6 * e * Math.sqrt(e);
          const drag = Math.exp(-2.1 * dt);
          const pos = mistGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < MIST_COUNT; i++) {
            mistVelocities[i * 3] *= drag;
            mistVelocities[i * 3 + 1] = mistVelocities[i * 3 + 1] * drag - 0.2 * dt;
            mistVelocities[i * 3 + 2] *= drag;
            mistPositions[i * 3] += mistVelocities[i * 3] * dt;
            mistPositions[i * 3 + 1] += mistVelocities[i * 3 + 1] * dt;
            mistPositions[i * 3 + 2] += mistVelocities[i * 3 + 2] * dt;
          }
          pos.needsUpdate = true;
        } else {
          mist.visible = false;
        }
      }
    }

    const pos = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < DUST_COUNT; i++) {
      let y = pos.getY(i) + dustSpeeds[i] * dt;
      if (y > 5) y = 0.2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.6 + dustPhases[i]) * 0.001);
    }
    pos.needsUpdate = true;

    renderer.render(scene, camera);
    if (!announced) {
      announced = true;
      onReady();
    }
  };
  if (staticMode) {
    bottle.position.y = 0.05;
    syncReflection();
    renderOnce();
    onReady();
  } else {
    renderer.setAnimationLoop(frame);
  }

  let disposed = false;
  return {
    setPaused(paused: boolean) {
      if (disposed || staticMode) return;
      renderer.setAnimationLoop(paused ? null : frame);
      if (!paused) timer.reset();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      timer.dispose();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const m of mats) {
          for (const value of Object.values(m)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          m.dispose();
        }
      });
      scene.environment?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
