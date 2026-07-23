/* ============================================================================
   غلاف المحراب — محرّك WebGL خام للرذاذ والدخان.
   بلا three.js: برنامج واحد، نداءا رسم اثنان، وكل الحركة تُحسب في شيدر الرأس
   من عمر الجسيم. هذا ما يسمح بآلاف الحبيبات على الهاتف بلا أي حِمل على المعالج.

   يعمل في فضاء الشاشة (‎-1..1‎) مباشرة: الفوهة تُحدَّد بنسبة من الكادر،
   فينطلق الرذاذ من بكسل البخاخ نفسه في الصورة ويهبط حيث يقف الشخص تماماً.
   ========================================================================== */

export interface AtmosphereConfig {
  /* موضع فوهة البخاخ كنسبة من الكادر (0..1 من اليسار/الأعلى) */
  originX: number;
  originY: number;
  /* اتجاه الاندفاع الأول (فضاء شاشة، y موجب = لأسفل) */
  aimX: number;
  aimY: number;
  /* قوة الاندفاع وحجم الحبيبات */
  power: number;
  grain: number;
  /* انسياق الرذاذ بعد أن يفقد سرعته — يقوده نحو الوجه */
  windX: number;
  windY: number;
}

export interface AtmosphereHandle {
  configure(next: Partial<AtmosphereConfig>): void;
  /* 0→1 تقدّم التمرير: يُخفت المشهد ويبطئ الإيقاع عند المغادرة */
  setProgress(p: number): void;
  /* نبضة رشّ فورية (عند التحميل أو عند تفاعل المستخدم) */
  burst(): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

/* إيقاع الرشّ: نفثة تولد خلال EMIT، تعيش LIFE، ثم سكون REST قبل التالية. */
const LIFE = 3.0;
const EMIT = 0.3;
const REST = 2.1;
const CYCLE = LIFE + EMIT + REST;

const VERT = `#version 300 es
precision highp float;

in vec3  aSeed;
in float aSpeed;
in float aSize;
in float aBirth;

uniform float uTime;
uniform float uPhase;
uniform float uLife;
uniform float uStagger;
uniform vec2  uOrigin;
uniform vec2  uAim;
uniform vec2  uWind;
uniform float uPower;
uniform float uGrain;
uniform float uAspect;
uniform float uPixel;
uniform float uMode;   /* 0 = رذاذ، 1 = دخان محيط */
uniform float uFade;

out float vAlpha;
out float vHeat;

const float TAU = 6.2831853;

/* دوران المتجه حول محوره بزاوية صغيرة — يفتح المخروط */
vec2 spin(vec2 v, float a) {
  float c = cos(a), s = sin(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

void main() {
  if (uMode < 0.5) {
    /* ================= الرذاذ ================= */
    float age = uPhase - aBirth * uStagger;
    float f = age / uLife;
    if (age < 0.0 || f > 1.0) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vHeat = 0.0;
      return;
    }

    /* مخروط ضيق عند الفوهة يتسع مع الابتعاد */
    float openAngle = (aSeed.x - 0.5) * 0.62;
    vec2 dir = spin(normalize(uAim), openAngle);

    /* اندفاع مع مقاومة هواء: حاد عند الخروج ثم يستسلم */
    float k = 1.8;
    float travel = (1.0 - exp(-k * age)) / k;
    vec2 off = dir * (aSpeed * uPower) * travel;

    /* ثم تتولاه الجاذبية والانسياق فيرسم قوساً لا خطاً */
    off += uWind * (age * age * 0.5);

    /* اضطراب متنامٍ: هذا ما يحوّل المخروط إلى سحابة حبيبية حقيقية */
    off.x += sin(aSeed.y * TAU + age * 1.9) * 0.052 * age;
    off.y += cos(aSeed.z * TAU + age * 2.3) * 0.046 * age;

    /* الإزاحة وحدها تُصحَّح بالنسبة، فتقطع الحبيبة المسافة نفسها أفقياً وعمودياً */
    off.x /= uAspect;
    vec2 p = uOrigin + off;

    gl_Position = vec4(p.x, -p.y, 0.0, 1.0);

    float grow = 0.4 + 2.9 * f;
    gl_PointSize = clamp(aSize * uGrain * grow * uPixel, 1.0, 190.0);

    float rise = smoothstep(0.0, 0.04, f);
    float fall = 1.0 - smoothstep(0.18, 1.0, f);
    vAlpha = rise * fall * (0.16 + 0.62 * aSeed.z) * uFade;
    vHeat = 1.0 - smoothstep(0.0, 0.38, f);
  } else {
    /* ================= الدخان المحيط ================= */
    /* دوران بطيء لا نهائي حول مركز مزاح — يبقى الهواء حياً دائماً */
    float t = uTime * (0.014 + aSeed.x * 0.022) + aSeed.y * TAU;
    float r = 0.34 + aSeed.z * 0.72;
    vec2 off = vec2(cos(t) * r * 1.25, sin(t * 0.8) * r * 0.72);
    off.y += sin(uTime * 0.09 + aSeed.x * TAU) * 0.09;
    off.x += cos(uTime * 0.07 + aSeed.z * TAU) * 0.11;
    off.x /= uAspect;
    vec2 p = uOrigin + off;

    gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
    gl_PointSize = clamp(aSize * uGrain * uPixel * (16.0 + aSeed.y * 30.0), 1.0, 300.0);
    vAlpha = (0.012 + aSeed.z * 0.022) * uFade;
    vHeat = 0.18;
  }
}
`;

const FRAG = `#version 300 es
precision highp float;

in float vAlpha;
in float vHeat;

uniform vec3 uCore;
uniform vec3 uEdge;

out vec4 outColor;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = dot(uv, uv);
  /* سقوط أُسّي: مركز حادّ وهالة تذوب — الفرق بين «غبار» و«دائرة» */
  float a = exp(-d * 13.0);
  a *= a;
  if (a < 0.004) discard;
  vec3 col = mix(uEdge, uCore, clamp(vHeat * 0.72 + a * 0.5, 0.0, 1.0));
  outColor = vec4(col * a * vAlpha, a * vAlpha);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("shader: " + log);
  }
  return sh;
}

export function createAtmosphere(
  canvas: HTMLCanvasElement,
  opts: {
    tier?: "high" | "low";
    reduced?: boolean;
    config?: Partial<AtmosphereConfig>;
    /* يُستدعى مع كل ضغطة بخّاخ فتتزامن حركة الزجاجة مع النفثة */
    onBurst?: () => void;
  } = {}
): AtmosphereHandle | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const low = opts.tier === "low";
  const reduced = opts.reduced === true;
  const onBurst = opts.onBurst;

  const cfg: AtmosphereConfig = {
    originX: 0.28,
    originY: 0.2,
    aimX: 0.86,
    aimY: -0.42,
    power: 1.25,
    grain: 1,
    windX: 0.03,
    windY: 0.075,
    ...opts.config,
  };

  const SPRAY = low ? 1200 : 3000;
  const SMOKE = low ? 26 : 54;
  const TOTAL = SPRAY + SMOKE;

  const program = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("link: " + log);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.useProgram(program);

  /* ---- بيانات الجسيمات: تُكتب مرة واحدة ولا تُلمس بعدها أبداً ---- */
  const seed = new Float32Array(TOTAL * 3);
  const speed = new Float32Array(TOTAL);
  const size = new Float32Array(TOTAL);
  const birth = new Float32Array(TOTAL);
  for (let i = 0; i < TOTAL; i++) {
    seed[i * 3] = Math.random();
    seed[i * 3 + 1] = Math.random();
    seed[i * 3 + 2] = Math.random();
    /* قلب النفثة أسرع من أطرافها فتبدو مقذوفة لا منفوخة */
    speed[i] = (0.42 + Math.random() * 0.5) * (1 - Math.abs(seed[i * 3] - 0.5) * 0.9);
    size[i] = 0.5 + Math.random() * 1.6;
    birth[i] = Math.random();
  }

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buffers: WebGLBuffer[] = [];
  const attrib = (name: string, data: Float32Array, comps: number) => {
    const loc = gl.getAttribLocation(program, name);
    const buf = gl.createBuffer()!;
    buffers.push(buf);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    if (loc >= 0) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, comps, gl.FLOAT, false, 0, 0);
    }
  };
  attrib("aSeed", seed, 3);
  attrib("aSpeed", speed, 1);
  attrib("aSize", size, 1);
  attrib("aBirth", birth, 1);

  const U = (n: string) => gl.getUniformLocation(program, n);
  const uTime = U("uTime");
  const uPhase = U("uPhase");
  const uLife = U("uLife");
  const uStagger = U("uStagger");
  const uOrigin = U("uOrigin");
  const uAim = U("uAim");
  const uWind = U("uWind");
  const uPower = U("uPower");
  const uGrain = U("uGrain");
  const uAspect = U("uAspect");
  const uPixel = U("uPixel");
  const uMode = U("uMode");
  const uFade = U("uFade");
  const uCore = U("uCore");
  const uEdge = U("uEdge");

  gl.uniform1f(uLife, LIFE);
  gl.uniform1f(uStagger, EMIT);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  /* مزج إضافي مع ألوان مضروبة مسبقاً: الرذاذ يضيء ما تحته ولا يحجبه */
  gl.blendFunc(gl.ONE, gl.ONE);

  let dpr = 1;
  let aspect = 1;
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    dpr = Math.min(window.devicePixelRatio || 1, low ? 1 : 1.75);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    gl.viewport(0, 0, pw, ph);
    aspect = w / h;
    /* مقياس البكسل مربوط بارتفاع الكادر فيبقى حجم الحبيبة ثابتاً بصرياً */
    gl.uniform1f(uPixel, ph / 210);
    gl.uniform1f(uAspect, aspect);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let progress = 0;
  let phase = 0;
  /* طاقة الضغطة: ترتفع لحظة الرشّ ثم تخبو — تعطي النفثة دفعة إضافية */
  let burstEnergy = 0;
  let raf = 0;
  let last = performance.now();
  let elapsed = 0;
  let paused = false;

  const draw = (now: number) => {
    raf = requestAnimationFrame(draw);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    if (!reduced) {
      const prev = phase;
      phase = (phase + dt) % CYCLE;
      /* بداية دورة جديدة: نُعلم الواجهة لتضغط رأس البخاخ في اللحظة نفسها */
      if (phase < prev) onBurst?.();
      burstEnergy = Math.max(0, burstEnergy - dt * 1.6);
    }

    /* المشهد يخفت كلما غادره المستخدم — لا يبقى يرسم بلا داعٍ */
    const fade = 1 - progress * 0.85;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform1f(uTime, elapsed);
    gl.uniform1f(uFade, fade);
    /* الفوهة والاتجاه بفضاء ‎-1..1‎ */
    gl.uniform2f(uOrigin, cfg.originX * 2 - 1, cfg.originY * 2 - 1);
    gl.uniform2f(uAim, cfg.aimX, cfg.aimY);
    gl.uniform2f(uWind, cfg.windX, cfg.windY);
    gl.uniform1f(uPower, cfg.power * (1 + burstEnergy * 0.16));

    /* 1) الدخان المحيط خلف كل شيء */
    gl.uniform1f(uMode, 1);
    gl.uniform1f(uGrain, cfg.grain);
    gl.uniform3f(uCore, 0.92, 0.66, 0.44);
    gl.uniform3f(uEdge, 0.52, 0.2, 0.16);
    gl.drawArrays(gl.POINTS, SPRAY, SMOKE);

    /* 2) النفثة فوقه */
    gl.uniform1f(uMode, 0);
    gl.uniform1f(uPhase, phase);
    gl.uniform1f(uGrain, cfg.grain);
    gl.uniform3f(uCore, 1.0, 0.9, 0.74);
    gl.uniform3f(uEdge, 0.78, 0.46, 0.24);
    gl.drawArrays(gl.POINTS, 0, SPRAY);
  };

  if (reduced) {
    /* ساكن: إطار واحد بنفثة في منتصف عمرها */
    phase = LIFE * 0.45;
    draw(performance.now());
    cancelAnimationFrame(raf);
    raf = 0;
  } else {
    raf = requestAnimationFrame(draw);
  }

  let disposed = false;
  return {
    configure(next) {
      Object.assign(cfg, next);
    },
    setProgress(p) {
      progress = p < 0 ? 0 : p > 1 ? 1 : p;
    },
    burst() {
      if (!reduced) burstEnergy = 1;
    },
    setPaused(next) {
      if (disposed || reduced || next === paused) return;
      paused = next;
      if (paused) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const b of buffers) gl.deleteBuffer(b);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
