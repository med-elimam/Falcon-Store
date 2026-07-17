import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface HeroSceneHandle {
  setPaused(paused: boolean): void;
  dispose(): void;
}

const CRIMSON_HOT = 0xc81743;
const GOLD = 0xcaa35f;

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

function makeBackdropTexture(bgCss: string): THREE.CanvasTexture {
  /* لون مسطح مطابق لخلفية الـHero؛ إضاءة الزجاجة والظل يصنعان العمق بلا مستطيل لوني منفصل. */
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bgCss;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSpriteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255, 232, 186, 1)");
  g.addColorStop(0.4, "rgba(255, 220, 160, 0.45)");
  g.addColorStop(1, "rgba(255, 220, 160, 0)");
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

function makeLabelTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 512);

  const x = 64, y = 96, w = 384, h = 320, r = 18;
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
  ctx.fillStyle = "rgba(16, 12, 10, 0.94)";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#caa35f";
  ctx.stroke();
  ctx.save();
  plaque();
  ctx.clip();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(202, 163, 95, 0.55)";
  ctx.strokeRect(x + 12, y + 12, w - 24, h - 24);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#d9b877";
  ctx.font = "600 58px Georgia, 'Times New Roman', serif";
  ctx.fillText("F A L C O N", 256, 226);

  ctx.strokeStyle = "rgba(202, 163, 95, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(176, 256);
  ctx.lineTo(336, 256);
  ctx.stroke();

  ctx.fillStyle = "rgba(230, 214, 180, 0.85)";
  ctx.font = "26px Georgia, serif";
  ctx.fillText("E A U   D E   P A R F U M", 256, 300);

  ctx.fillStyle = "#e8dcc4";
  ctx.font = "34px 'Segoe UI', Tahoma, sans-serif";
  ctx.fillText("متجر الصقر", 256, 360);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function lathe(points: [number, number][], segments = 48): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([px, py]) => new THREE.Vector2(px, py)),
    segments
  );
}

export function createHeroScene(
  container: HTMLElement,
  onReady: () => void,
  opts?: { staticMode?: boolean }
): HeroSceneHandle {
  /* staticMode: لمن يفضّلون تقليل الحركة — إطار واحد ثابت بلا دوران ولا جزيئات متحركة */
  const staticMode = opts?.staticMode === true;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
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

  /* الألوان تُقرأ من ثيم الصفحة الفعلي (فاتح/داكن) حتى يندمج المشهد بلا أي حواف */
  const heroEl = container.closest<HTMLElement>(".hero") ?? document.body;
  const [bgR, bgG, bgB] = cssColorToRGB(getComputedStyle(heroEl).backgroundColor);
  const bgCss = `rgb(${bgR}, ${bgG}, ${bgB})`;
  const isLight = (0.2126 * bgR + 0.7152 * bgG + 0.0722 * bgB) / 255 > 0.5;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bgCss);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.set(0, 1.55, 7.2);
  camera.lookAt(0, 1.3, 0);

  /* إضاءة استوديو طبيعية: مفتاح أبيض دافئ، تعبئة ذهبية ناعمة، ولمسة قرمزية خفيفة على الحافة */
  const crimsonLight = new THREE.PointLight(CRIMSON_HOT, 22, 0, 2);
  crimsonLight.position.set(-4.5, 2.2, 1.5);
  const goldLight = new THREE.PointLight(0xffe2b8, 40, 0, 2);
  goldLight.position.set(4.2, 3.2, 3);
  const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.5);
  keyLight.position.set(1.5, 5, 6);
  scene.add(crimsonLight, goldLight, keyLight, new THREE.AmbientLight(0x28262a, 0.9));

  const root = new THREE.Group();
  scene.add(root);

  /* toneMapped: false حتى تبقى الخلفية مطابقة بالبكسل للون الصفحة */
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 22),
    new THREE.MeshBasicMaterial({ map: makeBackdropTexture(bgCss), toneMapped: false })
  );
  backdrop.position.set(0, 2, -10);
  root.add(backdrop);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
      map: makeShadowTexture(),
      transparent: true,
      opacity: isLight ? 0.28 : 0.6,
      depthWrite: false,
      toneMapped: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  root.add(shadow);

  const bottle = new THREE.Group();
  root.add(bottle);

  const glass = new THREE.Mesh(
    lathe([
      [0.001, 0.0], [0.56, 0.0], [0.66, 0.06], [0.71, 0.22], [0.73, 0.6],
      [0.73, 1.2], [0.71, 1.62], [0.63, 1.9], [0.46, 2.06], [0.28, 2.15],
      [0.21, 2.24], [0.19, 2.38], [0.23, 2.46], [0.23, 2.52], [0.001, 2.52],
    ]),
    new THREE.MeshPhysicalMaterial({
      color: 0xfaf3ea,
      metalness: 0,
      roughness: 0.05,
      transmission: 1,
      thickness: 0.7,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    })
  );

  /* السائل بدون transmission حتى يظهر عبر الزجاج (قيد معروف في three) */
  const liquid = new THREE.Mesh(
    lathe([
      [0.001, 0.055], [0.48, 0.055], [0.57, 0.1], [0.61, 0.24], [0.63, 0.6],
      [0.63, 1.2], [0.61, 1.52], [0.58, 1.58], [0.001, 1.58],
    ]),
    new THREE.MeshPhysicalMaterial({
      color: 0x570a1d,
      roughness: 0.12,
      clearcoat: 0.8,
      emissive: 0x24040b,
      emissiveIntensity: 0.45,
    })
  );

  const goldMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28 });
  const cap = new THREE.Mesh(
    lathe([
      [0.001, 0.0], [0.37, 0.0], [0.4, 0.08], [0.4, 0.52], [0.33, 0.64], [0.18, 0.7], [0.001, 0.72],
    ], 40),
    goldMat
  );
  cap.position.y = 2.34;

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 12, 40), goldMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = 2.28;

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.85, 24, 1, true, -0.6, 1.2),
    new THREE.MeshStandardMaterial({ map: makeLabelTexture(), transparent: true, metalness: 0.15, roughness: 0.5 })
  );
  label.position.y = 1.05;

  bottle.add(glass, liquid, cap, band, label);

  /* غبار ذهبي متصاعد */
  const COUNT = 140;
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  const phases = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 5.4;
    positions[i * 3 + 1] = -0.4 + Math.random() * 5;
    positions[i * 3 + 2] = -2.2 + Math.random() * 3.8;
    speeds[i] = 0.08 + Math.random() * 0.18;
    phases[i] = Math.random() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  /* في الوضع الفاتح: جزيئات برونزية داكنة بمزج عادي (الإضافي لا يظهر على خلفية فاتحة) */
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      size: 0.055,
      map: makeSpriteTexture(),
      color: isLight ? 0x8a6c3f : 0xe3bd7a,
      transparent: true,
      opacity: isLight ? 0.4 : 0.85,
      depthWrite: false,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    })
  );
  root.add(dust);

  const renderOnce = () => renderer.render(scene, camera);

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 0.9 ? 8.8 : 7.2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (staticMode) renderOnce();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /* تفاعل: سحب للتدوير + انجراف خفيف مع الماوس */
  let dragging = false;
  let lastX = 0;
  let dragVel = 0;
  let mouseX = 0;
  let mouseY = 0;
  const canvas = renderer.domElement;
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
    bottle.rotation.y += dx * 0.007;
    dragVel = dx * 0.007 * 60;
    if (staticMode) renderOnce();
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

  const clock = new THREE.Clock();
  let announced = false;
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!dragging) {
      bottle.rotation.y += (0.22 + dragVel) * dt;
      dragVel *= Math.exp(-2.5 * dt);
    }
    bottle.position.y = Math.sin(t * 0.8) * 0.06;

    root.rotation.x += (mouseY * 0.05 - root.rotation.x) * Math.min(1, dt * 3);
    root.rotation.y += (mouseX * 0.1 - root.rotation.y) * Math.min(1, dt * 3);

    const pos = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      let y = pos.getY(i) + speeds[i] * dt;
      if (y > 4.8) y = -0.4;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.6 + phases[i]) * 0.0012);
    }
    pos.needsUpdate = true;

    renderer.render(scene, camera);
    if (!announced) {
      announced = true;
      onReady();
    }
  };
  if (staticMode) {
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
      if (!paused) clock.getDelta();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
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
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
