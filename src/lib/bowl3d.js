// Escena 3D del bowl Ricocat ([data-bowl]): sección alta con un stage sticky.
// 3 estados (Seco · Húmedo · Mix): texto a la izquierda ([data-bowl-scene] / [data-line]),
// beneficios flotando alrededor del plato ([data-bowl-bens] / [data-ben]) e indicador de 3 puntos.

const V = '0.160.0';
const THREE_URL = `https://esm.sh/three@${V}`;
const GLTF_URL = `https://esm.sh/three@${V}/examples/jsm/loaders/GLTFLoader.js?deps=three@${V}`;
const ROOM_URL = `https://esm.sh/three@${V}/examples/jsm/environments/RoomEnvironment.js?deps=three@${V}`;
const MODEL_URL = new URL('../../assets/3d/bowl-ricocat.glb', import.meta.url).href;
// monograma completo (la textura del GLB viene recortada al borde)
const LOGO_URL = new URL('../../assets/3d/ricocat-monograma.png', import.meta.url).href;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const rad = d => d * Math.PI / 180;

// Guion por umbrales: flotando → (stage fijo) se sienta y pasa a cenital → beneficios 1
//   → [STEPS[0]] vuelta → beneficios 2 → [STEPS[1]] vuelta → beneficios 3. Al volver se revierte.
const CAM = { az: 28, elFrom: 7, elSit: 14, elTo: 88.5 };
// umbrales de scroll (fracción del recorrido) para pasar a la escena 2 y 3
const STEPS = [0.36, 0.68];
// pausa por escena: al soltar el scroll cerca de una escena, se asienta en su punto de reposo
const RESTS = [0.18, 0.52, 0.84];
const SNAP_RANGE = 0.09, SNAP_IDLE = 160;
const seg = (p, [a, b]) => smooth(clamp((p - a) / (b - a)));
const TILT = { z: -24, x: 14, lift: 0.45 };
const SHADOW = 0.7;
// Mix: layout centrado ligado al scroll — el plato viaja al centro (x=960) y baja (y≈710),
// escala 1 → 1.3 y queda apenas recortado abajo. Empieza un poco después del umbral para que
// primero salga el texto de Húmedo; el texto de Mix entra al final del viaje.
const MIX = [0.7, 0.84];
const MIX_ZOOM = 0.1, MIX_X = 0, MIX_Y = 627 / 995 - 0.5;
const MIX_TEXT_AT = 0.94;
// al salir de la sección el plato vuelve a su pose inicial (diagonal, centrado, logo visible)
const EXIT = 0.97;
const REST_X = 1291 / 1920 - 0.5;
const WOBBLE = { deg: 3, ms: 20000 };
const bezier = (x1, y1, x2, y2) => t => {
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3 - t;
    const dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    u = Math.min(1, Math.max(0, u - x / dx));
  }
  return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
};
const zoomEase = bezier(0.22, 1, 0.36, 1);
const FADE = 0.05; // ancho del fundido entre escenas (fracción del recorrido)
const LIGHT = [0xE6, 0xFA, 0xFD], DARK = [0x00, 0x32, 0x6E];
const mix = t => `rgb(${LIGHT.map((c, i) => Math.round(c + (DARK[i] - c) * t)).join(',')})`;

export function createBowlScene(root, { reduce = false, follow = 0.08, smooth: scroller = null } = {}) {
  const section = root.querySelector('[data-bowl]');
  if (!section) return () => {};
  const stage = section.querySelector('[data-bowl-stage]');
  const scenes = [...section.querySelectorAll('[data-bowl-scene]')];
  const sticky = section.firstElementChild;
  // la sección anterior se oscurece hacia el azul al acercarse el bowl (sin corte de color)
  const prev = section.previousElementSibling?.tagName === 'SECTION' ? section.previousElementSibling : null;
  // "pintado": un frente azul sube desde el borde inferior de la pantalla y pinta a la vez
  // la sección anterior (azul plano) y el fondo del bowl (degradado que lo resalta).
  const layers = [];
  const addLayer = (host, bg, z) => {
    if (!host) return;
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, { position: 'absolute', inset: '0', zIndex: z, background: bg, pointerEvents: 'none', clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)' });
    host.insertBefore(el, z === '0' ? host.firstChild : null);
    layers.push(el);
  };
  addLayer(prev, '#00326E', '5');
  // brillo radial muy suave detrás del plato
  const GRAD = (x, y = 50, k = 1) => `radial-gradient(ellipse ${(42 * k).toFixed(2)}% ${(58 * k).toFixed(2)}% at ${x.toFixed(2)}% ${y.toFixed(2)}%, #0A4789 0%, #063F82 32%, #023878 62%, #00326E 100%)`;
  addLayer(sticky, GRAD(50), '0');
  const gradEl = layers[layers.length - 1];
  section.style.background = '#E6FAFD';

  // el frente avanza ligado al scroll: empieza cuando la sección asoma (90% del viewport)
  // y termina de pintar cuando su borde llega al 25%; al volver se retira igual.
  const PAINT_FROM = 0.9, PAINT_TO = 0.25;
  let front = 1, phase = 0;
  // borde orgánico tipo "blobs": suma de senos en coordenadas de viewport, continua entre capas
  const N = 48;
  const wave = x => {
    const t = x * Math.PI * 2;
    return 0.5 * Math.sin(t * 1.15 + phase) + 0.32 * Math.sin(t * 2.6 - phase * 1.4 + 1.1) + 0.18 * Math.sin(t * 4.3 + phase * 0.8 + 2.3);
  };
  const drawPaint = () => {
    const ih = innerHeight, amp = Math.min(55, ih * 0.055);
    const y = front * ih; // posición media del frente en px de viewport (0 = arriba)
    const edge = [];
    for (let i = 0; i <= N; i++) edge.push(y + amp * wave(i / N));
    layers.forEach(el => {
      const r = el.getBoundingClientRect();
      const pts = edge.map((ey, i) => `${(i / N * 100).toFixed(2)}% ${Math.max(0, Math.min(r.height, ey - r.top)).toFixed(1)}px`);
      el.style.clipPath = `polygon(${pts.join(', ')}, 100% 100%, 0% 100%)`;
    });
    // con el frente arriba de cada sección, su fondo base también pasa a azul (sin costuras)
    const full = y + amp <= 0;
    section.style.background = full || y + amp <= section.getBoundingClientRect().top ? '#00326E' : '#E6FAFD';
    if (prev) prev.style.background = full || y + amp <= prev.getBoundingClientRect().top ? '#00326E' : '#E6FAFD';
  };
  const paintRaf = 0;

  const paintEnter = () => {
    const top = section.getBoundingClientRect().top;
    const k = clamp((innerHeight * PAINT_FROM - top) / (innerHeight * (PAINT_FROM - PAINT_TO)));
    // el frente va pegado al borde superior de la sección del bowl y solo sobresale un poco
    // sobre la sección anterior (no la cubre): sube con ella al hacer scroll
    const e = clamp((innerHeight - top) / innerHeight);
    const lift = Math.min(110, innerHeight * 0.11) * smooth(e);
    front = (top - lift) / innerHeight;
    phase = e * 2;
    drawPaint();
    // entrada rápida desde abajo (sin fundido) cuando la sección ya cubre la pantalla
    if (!entered && top <= innerHeight * 0.3) enter();
    else if (entered && top > innerHeight) resetEnter();
  };

  const copy = section.querySelector('[data-bowl-copy]');
  const indicator = section.querySelector('[data-bowl-indicator]');
  const ENTER_MS = 650;
  let entered = false, enterT0 = 0, enterP = 0;
  const backOut = t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const slideIn = el => el?.animate(
    [{ translate: '0 110px' }, { translate: '0 0' }],
    { duration: ENTER_MS, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }
  );
  const enter = () => {
    entered = true; enterT0 = performance.now();
    [copy, indicator].forEach(el => { if (el) el.style.visibility = ''; });
    if (!reduce) slideIn(indicator);
    const step = now => {
      enterP = reduce ? 1 : clamp((now - enterT0) / ENTER_MS);
      three?.place();
      if (enterP < 1 && entered) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const resetEnter = () => {
    entered = false; enterP = 0;
    [copy, indicator].forEach(el => { if (el) { el.getAnimations().forEach(a => a.cancel()); el.style.visibility = 'hidden'; } });
    three?.place();
  };
  [copy, indicator].forEach(el => { if (el) el.style.visibility = 'hidden'; });

  let destroyed = false, raf = 0, last = 0, cur = 0, three = null, onScreen = false;
  let zm = 0, wobble = 0, wobbleT0 = 0;
  const camera0 = () => ({ narrow: innerWidth < 900 });

  const target = () => {
    const travel = section.offsetHeight - innerHeight;
    if (travel <= 0) return 0;
    const v = -section.getBoundingClientRect().top / travel;
    return Number.isFinite(v) ? clamp(v) : 0;
  };

  // Escenas por umbral (no scrub): al cruzar cada punto se dispara la transición completa
  // y al volver se revierte. 0 = flotando · 1..n = escena de texto activa.
  // espera a que el stage quede fijo (bowl centrado en pantalla) y un pequeño tramo más
  const START = 0.035;
  // la entrada (caída de croquetas → plato lleno → diagonal) va ligada al scroll entre START y ENTRY_END
  const ENTRY_END = 0.16;
  const stepFor = (top, p) => top > 0 || p < START ? 0 : 1 + STEPS.filter(x => p >= x).length;
  // scroll: progreso suavizado → respuesta continua (giro leve del plato + barra de progreso)
  const A = { sit: 0, spin: 0, scroll: 0, exit: 0 };
  const RATE = { sit: 0.045, spin: 0.05, scroll: 0.14, exit: 0.045, scrub: 0.35 };
  const SCROLL_YAW = 110; // grados de giro extra a lo largo de toda la sección
  const progressFill = section.querySelector('[data-bowl-progress]');
  let step = 0;
  const approach = (v, t, rate, dt) => {
    const nv = v + (t - v) * (1 - Math.pow(1 - rate, dt / 16.67));
    return Math.abs(t - nv) < 0.001 ? t : nv;
  };

  // ---- textos y beneficios por estado (Seco · Húmedo · Mix) ----
  // el texto sale hacia arriba con fade y el nuevo entra desde abajo línea por línea;
  // los beneficios se van hacia el centro del plato y los nuevos salen desde detrás de él.
  const bens = [...section.querySelectorAll('[data-bowl-bens]')];
  const dots = [...section.querySelectorAll('[data-bowl-dot]')];
  const unit = () => Math.min(innerWidth / 1920, innerHeight / 995);
  const EASE_OUT = 'cubic-bezier(.16,1,.3,1)', EASE_IN = 'cubic-bezier(.5,0,.75,0)';
  let shown = -1;
  const lines = i => scenes[i] ? [...scenes[i].querySelectorAll('[data-line]')] : [];
  const group = i => bens.find(g => +g.dataset.bowlBens === i);
  const settle = (anims, el, i) => Promise.all(anims.map(a => a.finished.catch(() => {})))
    .then(() => { if (shown !== i && el) el.style.visibility = 'hidden'; });
  const toCenter = el => `${(-parseFloat(el.dataset.dx) * unit()).toFixed(1)}px ${(-parseFloat(el.dataset.dy) * unit()).toFixed(1)}px`;

  const hideScene = i => settle(lines(i).map(l => {
    l.getAnimations().forEach(a => a.cancel());
    return l.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-28px)' }],
      { duration: reduce ? 0 : 300, easing: EASE_IN, fill: 'forwards' });
  }), scenes[i], i);
  const showScene = (i, delay) => {
    if (!scenes[i]) return;
    scenes[i].style.visibility = '';
    lines(i).forEach((l, k) => {
      l.getAnimations().forEach(a => a.cancel());
      l.animate([{ opacity: 0, transform: 'translateY(36px)' }, { opacity: 1, transform: 'none' }],
        { duration: reduce ? 0 : 650, delay: reduce ? 0 : delay + k * 80, easing: EASE_OUT, fill: 'both' });
    });
  };
  const hideBens = i => {
    const g = group(i); if (!g) return;
    settle([...g.querySelectorAll('[data-ben]')].map(el => {
      el.getAnimations().forEach(a => a.cancel());
      return el.animate([{ scale: '1', opacity: 1 }, { scale: '0.2', opacity: 0 }],
        { duration: reduce ? 0 : 320, easing: EASE_IN, fill: 'forwards' });
    }), g, i);
  };
  const showBens = (i, delay) => {
    const g = group(i); if (!g) return;
    g.style.visibility = '';
    [...g.querySelectorAll('[data-ben]')].forEach((el, k) => {
      el.getAnimations().forEach(a => a.cancel());
      // nacen en su sitio: pequeñitos → crecen con un leve rebote hasta su tamaño final
      el.animate([
        { scale: '0', opacity: 0 },
        { scale: '1.08', opacity: 1, offset: 0.65 },
        { scale: '1', opacity: 1 }
      ], { duration: reduce ? 0 : 700, delay: reduce ? 0 : delay + k * 110, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    });
  };
  const setDot = i => dots.forEach((dot, k) => {
    const on = k === Math.max(0, i);
    dot.style.height = on ? '28px' : '8px';
    dot.style.background = on ? '#fff' : 'rgba(255,255,255,0.4)';
  });
  const setShown = i => {
    if (i === shown) return;
    const was = shown; shown = i;
    if (was >= 0) { hideScene(was); hideBens(was); }
    const d = was >= 0 ? 220 : 0;
    if (i >= 0) { showScene(i, d); showBens(i, d + 120); }
  };
  // flotación idle: ±3 px, ciclo de 4 s, desfasados
  const floats = reduce ? [] : [...section.querySelectorAll('[data-ben-float]')].map((el, k) =>
    el.animate([{ transform: 'translateY(-3px)' }, { transform: 'translateY(3px)' }],
      { duration: 2000, delay: -k * 730, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));

  const tick = now => {
    try {
    const dt = reduce ? 1e4 : Math.min(64, now - (last || now)); last = now;
    const pNow = target();
    const exiting = pNow >= EXIT;
    step = exiting ? 0 : stepFor(section.getBoundingClientRect().top, pNow);
    const topNow = section.getBoundingClientRect().top;
    const entryP = topNow > 0 ? 0 : clamp((pNow - START) / (ENTRY_END - START));
    const tSit = exiting ? 0 : entryP;
    const tSpin = exiting ? STEPS.length : Math.max(0, step - 1);
    const tExit = exiting ? 1 : 0;
    A.exit = approach(A.exit, tExit, RATE.exit, dt);
    // en la salida sigue por tiempo; en la entrada sigue al scroll casi directo (sin saltos)
    A.sit = exiting ? approach(A.sit, tSit, RATE.sit, dt) : approach(A.sit, tSit, RATE.scrub, dt);
    A.spin = approach(A.spin, tSpin, RATE.spin, dt);
    zm = zoomEase(clamp((pNow - MIX[0]) / (MIX[1] - MIX[0]))) * (1 - smooth(A.exit));
    const tScroll = target();
    A.scroll = reduce ? tScroll : approach(A.scroll, tScroll, RATE.scroll, dt);
    if (progressFill) progressFill.style.transform = `scaleY(${A.scroll.toFixed(4)})`;
    // el estado 1 aparece apenas el bowl llega a cenital; Mix espera a que el plato termine su viaje
    const wanted = step > 0 && A.sit > 0.8 ? step - 1 : -1;
    setShown(wanted === 2 && (camera0().narrow ? false : zm < MIX_TEXT_AT) ? -1 : wanted);
    setDot(step - 1);
    // al terminar el zoom, rotación lenta de 3° en loop; al salir vuelve suave a 0
    let looping = false;
    if (zm >= 0.999 && step >= 3 && onScreen && !reduce) {
      if (!wobbleT0) wobbleT0 = now - Math.acos(1 - 2 * clamp(wobble / WOBBLE.deg)) / (2 * Math.PI) * WOBBLE.ms;
      wobble = WOBBLE.deg * (1 - Math.cos((now - wobbleT0) / WOBBLE.ms * Math.PI * 2)) / 2;
      looping = true;
    } else {
      wobbleT0 = 0;
      wobble = approach(wobble, 0, 0.06, dt);
    }
    const done = A.sit === tSit && A.spin === tSpin && A.scroll === tScroll && A.exit === tExit && !looping && wobble === 0;
    three?.place();
    raf = done ? 0 : requestAnimationFrame(tick);
    if (!raf) last = 0;
    } catch (err) { console.warn('[Ricocat] bowl tick', err); raf = 0; last = 0; }
  };
  const kick = () => { if (!raf && !destroyed) raf = requestAnimationFrame(tick); };

  paintEnter();
  let idle = 0;
  const snap = () => {
    const r = section.getBoundingClientRect();
    if (r.top > 0 || r.bottom < innerHeight) return; // solo mientras el stage está fijo
    const travel = section.offsetHeight - innerHeight;
    const p = target();
    // no retener al inicio ni al final: solo entre la primera y la última pausa
    if (p >= RESTS[RESTS.length - 1] || p <= ENTRY_END) return; // no retener durante la entrada
    const rest = RESTS.reduce((best, x) => Math.abs(x - p) < Math.abs(best - p) ? x : best, RESTS[0]);
    if (Math.abs(rest - p) > SNAP_RANGE || Math.abs(rest - p) * travel < 4) return;
    const y = scrollY + r.top + rest * travel;
    if (scroller?.scrollTo) scroller.scrollTo(y);
    else scrollTo({ top: y, behavior: 'smooth' });
  };
  const onScroll = () => {
    paintEnter(); kick(); three?.place();
    if (v3Loading) pump();
    clearTimeout(idle);
    if (!reduce) idle = setTimeout(snap, SNAP_IDLE);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) kick(); }, { rootMargin: '200px 0px' });
  io.observe(section);

  // ---- secuencias pre-renderizadas (assets/bowl-seq2, 900px): mismo encuadre que la cámara 3D ----
  // entrada (m 0→1, yaw 360·m) · seco/humedo/mix (diagonal 26°, 240 frames, 1.5° c/u) · salida (mix, m 0→1, yaw 468·m)
  const SEQ = new URL('../../assets/bowl-seq2/', import.meta.url).href;
  // humedo va sin la hojita; hoja (apoyada, gira con el plato) y hojacaida (cayendo) son capas encima
  const CLIPS = { entrada: 120, seco: 240, humedo: 240, mix: 240, salida: 120, hoja: 240, hojacaida: 48 };
  const ORDER = ['entrada', 'seco', 'humedo', 'hojacaida', 'hoja', 'mix', 'salida'];
  const TURN = ['seco', 'humedo', 'mix'];
  const frames = {};
  ORDER.forEach(k => { frames[k] = new Array(CLIPS[k]).fill(null); });
  const pad = n => String(n).padStart(3, '0');
  // plato y comida anteriores retirados; false para restaurar las secuencias viejas
  const HIDE_PLATE = true;
  // plato nuevo (v3): solo la entrada, 90 frames 1200×1233 con fondo transparente.
  // Al terminar la entrada queda el último frame fijo en las 3 escenas (hasta tener las secuencias con comida).
  // entrada (90): plato vacío entrando · seco (120): caída de croquetas → plato lleno, ligada al scroll
  // v6: igual que v5 (recorte + compresión) pero seco/húmedo/mix a 60 cuadros (1 de cada 2). v5 queda de respaldo.
  // crops.json guarda el recorte de cada cuadro en el espacio original de 1200 px.
  const V3 = { base: new URL(innerWidth < 900 ? '../../assets/bowl-v6/m/' : '../../assets/bowl-v6/', import.meta.url).href, clips: { entrada: 90, seco: 60, humedo: 60, mix: 60, salida: 90 }, w: 1200, h: 1233, cx: 752, cy: 765, bowlW: 680 };
  const v3 = {}; ['entrada', 'seco', 'humedo', 'mix', 'salida'].forEach(k => { v3[k] = new Array(V3.clips[k]).fill(null); });
  // carga por escena: primero la escena actual y la siguiente (1 de cada 3 cuadros), luego el resto
  const V3_ORDER = ['entrada', 'seco', 'humedo', 'mix', 'salida'];
  const v3State = {}; V3_ORDER.forEach(k => { v3State[k] = new Uint8Array(V3.clips[k]); });
  let v3Loading = false, inflight = 0;
  const clipNow = () => {
    const p = A.scroll;
    return p >= 0.9 ? 4 : p >= STEPS[1] - 0.04 ? 3 : p >= STEPS[0] - 0.04 ? 2 : p >= ENTRY_END - 0.03 ? 1 : 0;
  };
  // celular: la memoria es el límite (cada cuadro decodificado ocupa ~1 MB y Android puede vaciar el canvas).
  // Se carga 1 de cada 2 cuadros y solo la escena actual y sus vecinas; las lejanas se liberan.
  const LOW_MEM = innerWidth < 900;
  const STRIDE = LOW_MEM ? 2 : 1;
  const trim = c => {
    if (!LOW_MEM) return;
    V3_ORDER.forEach((k, ci) => {
      if (Math.abs(ci - c) <= 1) return;
      const a = v3[k], st = v3State[k];
      for (let i = 0; i < a.length; i++) if (a[i]) { a[i].src = ''; a[i] = null; st[i] = 0; } else if (st[i] === 1) st[i] = 0;
    });
  };
  const nextJob = () => {
    const c = clipNow();
    trim(c);
    const prio = (LOW_MEM ? [c, c + 1, c - 1] : [c, c + 1, c - 1, c + 2, c - 2, c + 3, c - 3, c + 4, c - 4]).filter(i => i >= 0 && i < V3_ORDER.length);
    // la entrada va primero (es lo que se ve apenas se llega a la sección)
    if (c <= 1) { const st = v3State.entrada; for (let i = 0; i < st.length; i += STRIDE) if (!st[i]) return ['entrada', i]; }
    for (const pass of LOW_MEM ? [6, 2] : [6, 3, 1]) for (const ci of prio) {
      const k = V3_ORDER[ci], st = v3State[k];
      for (let i = 0; i < st.length; i += pass) if (!st[i]) return [k, i];
    }
    return null;
  };
  const pump = () => {
    while (!destroyed && inflight < 6) {
      const job = nextJob(); if (!job) return;
      const [k, i] = job; v3State[k][i] = 1; inflight++;
      const im = new Image(); im.decoding = 'async';
      const done = ok => { inflight--; if (ok && v3State[k][i] === 1) { v3[k][i] = im; lastKey = ''; three?.place(); } pump(); };
      im.onload = () => (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => done(true));
      im.onerror = () => { v3State[k][i] = 2; done(false); };
      im.src = `${V3.base}${k}/${pad(i)}.webp?v=${k === 'salida' ? 6 : 5}`; im._clip = k; im._i = i;
    }
  };
  let crops = null;
  const cropsReady = fetch(new URL('../../assets/bowl-v6/crops.json?v=1', import.meta.url)).then(r => r.json()).then(j => { crops = j; }).catch(() => {});
  const preloadV3 = () => { if (v3Loading) return; v3Loading = true; cropsReady.then(pump); };
  let lastKey = '';
  const nearV3 = (k, i) => { const a = v3[k], n = a.length; i = Math.max(0, Math.min(n - 1, i)); for (let d = 0; d < n; d++) { const x = a[i - d] || a[i + d]; if (x) return x; } return null; };
  let loading = false;
  const preload = async () => {
    if (HIDE_PLATE) { preloadV3(); return; }
    if (loading) return; loading = true;
    for (const k of ORDER) {
      // dentro de cada clip: primero 1 de cada 4 (para tener algo pronto) y luego el resto
      const idx = [...Array(CLIPS[k]).keys()];
      const first = idx.filter(i => i % 4 === 0), rest = idx.filter(i => i % 4 !== 0);
      for (const group of [first, rest]) {
        await Promise.all(group.map(i => new Promise(res => {
          const im = new Image();
          im.decoding = 'async';
          im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { frames[k][i] = im; res(); }); };
          im.onerror = res;
          im.src = `${SEQ}${k}/${pad(i)}.webp?v=10`;
        })));
        if (destroyed) return;
        three?.place();
      }
    }
  };
  const nearIn = (k, i) => {
    const arr = frames[k], n = arr.length;
    for (let d = 0; d < n; d++) {
      const a = arr[(i + d) % n] || arr[(i - d + n) % n];
      if (a) return a;
    }
    return null;
  };
  const FALLBACK = { entrada: ['seco'], salida: ['mix', 'seco'], seco: ['entrada'], humedo: ['seco', 'entrada'], mix: ['seco', 'entrada'] };
  const near = (k, i) => {
    const own = nearIn(k, i);
    if (own) return own;
    for (const f of FALLBACK[k] || []) {
      const alt = nearIn(f, f === 'entrada' ? CLIPS.entrada - 1 : Math.min(i, CLIPS[f] - 1));
      if (alt) return alt;
    }
    return null;
  };

  const cv = document.createElement('canvas');
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  stage.appendChild(cv);
  const ctx = cv.getContext('2d');
  // si el navegador vacía el canvas por falta de memoria, se redibuja al recuperarlo
  cv.addEventListener('contextrestored', () => { lastKey = ''; three?.place(); });
  let W = 0, H = 0, DPR = 1;
  const resize = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    DPR = Math.min(1.5, devicePixelRatio || 1); // 1.5 basta para los cuadros de 860 px y aligera el dibujo
    lastKey = '';
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    three?.place();
  };

  const SWITCH = 0.97; // por debajo: clip de entrada/salida; por encima: giro cenital
  const draw = (im, cx, cy, size, rot, alpha) => {
    if (!im) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(im, -size / 2, -size / 2, size, size);
    ctx.restore();
  };

  three = {
    place() {
      if (!W || !H) return;
      const m = smooth(A.sit);
      const narrow = W < 900;
      // posición y escala del plato en pantalla (equivalente a setViewOffset + zoom de la cámara)
      let px = W / 2, py = H / 2, size = H, zoom = 1;
      // celular: en Mix (y la salida) el plato crece un poco y baja al centro, entre texto y borde superior
      if (narrow) { const mz = smooth(clamp(zm)); size = H / (1.55 - 0.25 * mz); py = H / 2 - H * (0.17 - 0.1 * mz); }
      else {
        const s = smooth(A.sit);
        const cx = REST_X * s + (MIX_X - REST_X) * zm, cy = MIX_Y * zm;
        zoom = 1 + MIX_ZOOM * zm;
        px += cx * W; py += cy * H;
        if (gradEl) gradEl.style.background = GRAD(50 + cx * 100, 50 + cy * 100, zoom);
      }
      size *= zoom;
      if (HIDE_PLATE) {
        // entrada ligada a m (mismo recorrido de scroll que antes); luego frame final fijo
        // entrada ligada a m; luego Seco avanza cuadro a cuadro con el scroll hasta pasar a Húmedo
        let im;
        // al salir (tras la Combinación completa) se usa el clip de salida con comida, nunca la entrada vacía
        if (m < SWITCH && A.scroll < 0.9) im = nearV3('entrada', Math.round(clamp(m / SWITCH) * 89));
        else {
          const sp = clamp((A.scroll - ENTRY_END) / (STEPS[0] - 0.04 - ENTRY_END));
          // húmedo: desde el paso a Húmedo hasta poco antes de Mix, cuadro a cuadro
          const hp = clamp((A.scroll - (STEPS[0] - 0.02)) / (STEPS[1] - 0.04 - (STEPS[0] - 0.02)));
          // mix: desde el paso a Mix hasta casi el final de la sección; luego queda el plato mix fijo
          const mp = clamp((A.scroll - (STEPS[1] - 0.02)) / (0.91 - (STEPS[1] - 0.02)));
          // salida: al irse de la sección el plato vuelve a su pose inicial (cuadros a 660 px, mismo encuadre)
          const xp = clamp((A.scroll - 0.92) / (1 - 0.92));
          im = (A.scroll >= 0.92 ? nearV3('salida', Math.round(xp * (V3.clips.salida - 1))) : null)
            || (A.scroll >= STEPS[1] - 0.02 ? nearV3('mix', Math.round(mp * (V3.clips.mix - 1))) : null)
            || (A.scroll >= STEPS[0] - 0.02 ? nearV3('humedo', Math.round(hp * (V3.clips.humedo - 1))) : null)
            || nearV3('seco', Math.round(sp * (V3.clips.seco - 1))) || nearV3('entrada', 89);
        }
        if (!im) return;
        // ancho del plato ≈ 47% del tamaño de escena; el centro del plato final cae en (px, py)
        const k = size * 0.47 / V3.bowlW;
        // solo se redibuja si cambia el cuadro o la posición
        const cr = crops?.[im._clip]?.[im._i] || [0, 0, V3.w, V3.h];
        const key = `${im.src}|${px.toFixed(1)}|${py.toFixed(1)}|${k.toFixed(4)}`;
        if (key === lastKey) return;
        lastKey = key;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium';
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(im, 0, 0, im.naturalWidth || im.width, im.naturalHeight || im.height, px - (V3.cx - cr[0]) * k, py - (V3.cy - cr[1]) * k, cr[2] * k, cr[3] * k);
        return;
      }
      const exiting = A.exit > 0.5;
      // sin ningún frame cargado todavía: conservar lo último dibujado
      if (!near(exiting ? 'salida' : 'entrada', 0)) return;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, W, H);
      if (m < SWITCH) {
        const k = exiting ? 'salida' : 'entrada';
        draw(near(k, Math.round(m * (CLIPS[k] - 1))), px, py, size, 0, 1);
        return;
      }
      // vista diagonal: frame por yaw (3° por frame) y fundido con el siguiente para el residuo
      const sNorm = clamp((A.scroll - START) / (1 - START));
      const ex = smooth(clamp((m - SWITCH) / (1 - SWITCH)));
      const yaw = 360 * (A.spin + m) + SCROLL_YAW * sNorm * ex + wobble;
      const yy = ((yaw % 360) + 360) % 360;
      // frame más cercano, sin fundir vecinos (el fundido generaba doble imagen / blur)
      const f0 = Math.round(yy / 1.5) % 240;
      // contenido según la vuelta en curso; fundido a mitad de giro
      const sp = clamp(A.spin, 0, 2), base = Math.floor(sp), f = sp - base;
      const a = TURN[base], bnext = TURN[Math.min(2, base + 1)];
      const t = smooth(clamp((f - 0.35) / 0.3));
      const layer = (clip, alpha) => draw(near(clip, f0), px, py, size, 0, alpha);
      layer(a, 1);
      if (t > 0 && bnext !== a) layer(bnext, t);
      // hojita: cae al centro durante la vuelta Seco → Húmedo; se va con el húmedo al pasar a Mix
      const own = (k, i) => nearIn(k, i);
      if (base === 0) {
        const lf = clamp((f - 0.4) / 0.55);
        if (lf > 0) {
          const land = smooth(clamp((lf - 0.9) / 0.1));
          if (land < 1) draw(own('hojacaida', Math.round(lf * (CLIPS.hojacaida - 1))), px, py, size, 0, 1 - land);
          if (land > 0) draw(own('hoja', f0), px, py, size, 0, land);
        }
      } else if (base === 1 && t < 1) {
        draw(own('hoja', f0), px, py, size, 0, 1 - t);
      }
    }
  };

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();
  // carga desde el arranque: lo esencial (entrada completa + 1 de cada 6 del resto) se espera en el preloader
  preload();
  const essentials = [...Array(V3.clips.entrada).keys()].filter(i => i % STRIDE === 0).map(i => ['entrada', i]);
  (LOW_MEM ? ['seco'] : ['seco', 'humedo', 'mix', 'salida']).forEach(k => { for (let i = 0; i < V3.clips[k]; i += (V3.clips[k] > 60 ? 6 : 3)) essentials.push([k, i]); });
  window.__ricocatBowlReady = new Promise(res => {
    const chk = () => (destroyed || essentials.every(([k, i]) => v3State[k][i] && (v3[k][i] || v3State[k][i] === 2)) ? res() : setTimeout(chk, 120));
    chk();
  });
  const pio = { disconnect() {} };
  const prevCleanup0 = () => { ro.disconnect(); pio.disconnect(); cv.remove(); };

  let cleanup = prevCleanup0;
  return () => {
    destroyed = true;
    clearTimeout(idle);
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    floats.forEach(a => a.cancel());
    io.disconnect();
    cancelAnimationFrame(raf);
    cleanup();
    layers.forEach(el => el.remove());
  };
}
