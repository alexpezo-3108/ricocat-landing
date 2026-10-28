// Pescaditos de highlights: entran desde fuera de pantalla siguiendo su trayectoria
// ([data-trail]) al ritmo del scroll y van dejando la línea punteada detrás ([data-trail-mask]).
// El avance persigue al scroll con inercia (siguen deslizándose al parar) y, al llegar
// a su tope, los beneficios ([data-benefit]) dan un saltito.

const easeInOut = t => t * t * (3 - 2 * t);
const HOP = [
  { transform: 'translateY(0)' },
  { transform: 'translateY(-14px)', offset: 0.35 },
  { transform: 'translateY(0)', offset: 0.65 },
  { transform: 'translateY(-4px)', offset: 0.82 },
  { transform: 'translateY(0)' }
];

export function createFishSwim(root, { scene: sel = '[data-fish-scene]', range = 1, size: baseSize = 0.72, pxSize = 0, follow = 0.035, reduce = false } = {}) {
  const scene = root.querySelector(sel);
  if (!scene) return () => {};
  const benefits = [...root.querySelectorAll('[data-benefit]')];
  const swims = ['left', 'right'].map(side => {
    const path = scene.querySelector(`[data-trail="${side}"]`);
    const mask = scene.querySelector(`[data-trail-mask="${side}"]`);
    const fish = scene.querySelector(`[data-fish="${side}"]`);
    const len = path.getTotalLength();
    mask.style.strokeDasharray = `${len} ${len}`;
    return { path, mask, fish, len, mirror: side === 'right' };
  });

  let size = baseSize;
  const measure = () => {
    // pxSize: largo deseado del pez en px de pantalla (el pez mide ~62 unidades)
    if (pxSize && scene.clientWidth) size = (pxSize / 62) * (3000 / scene.clientWidth);
  };
  measure();
  const visible = () => scene.getClientRects().length > 0;

  const place = (s, p) => {
    if (!Number.isFinite(p)) p = 0;
    const d = s.len * p;
    const a = s.path.getPointAtLength(Math.max(0, d - 1));
    const b = s.path.getPointAtLength(Math.min(s.len, d + 1));
    const pt = s.path.getPointAtLength(d);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    s.fish.setAttribute('transform', s.mirror
      ? `translate(${pt.x} ${pt.y}) rotate(${ang + 180}) scale(${-size} ${size})`
      : `translate(${pt.x} ${pt.y}) rotate(${ang}) scale(${size})`);
    s.mask.style.strokeDashoffset = String(s.len * (1 - p));
  };

  if (reduce) { swims.forEach(s => place(s, 1)); return () => {}; }

  const section = scene.closest('section') || scene;
  const target = () => {
    const top = section.getBoundingClientRect().top;
    // la página termina en esta sección: el recorrido no puede exceder lo que se puede scrollear
    const dist = Math.min(innerHeight * range, section.offsetHeight);
    const v = dist > 0 ? (innerHeight - top) / dist : 0;
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
  };

  let cur = target(), raf = 0, last = 0, arrived = cur >= 0.999;
  swims.forEach(s => place(s, easeInOut(cur)));

  const hop = () => benefits.forEach((el, i) => el.animate(HOP, {
    duration: 700, delay: i * 90, easing: 'cubic-bezier(.3,.7,.4,1)'
  }));

  const tick = now => {
    const dt = Math.min(64, now - (last || now)); last = now;
    const t = target();
    // suavizado exponencial independiente del framerate → deslizamiento largo al soltar
    cur += (t - cur) * (1 - Math.pow(1 - follow, dt / 16.67));
    if (!Number.isFinite(cur) || Math.abs(t - cur) < 0.0005) cur = t;
    swims.forEach(s => place(s, easeInOut(cur)));
    if (!arrived && t >= 0.999 && cur >= 0.97) { arrived = true; if (visible()) hop(); }
    if (arrived && cur < 0.9) arrived = false; // vuelve a saltar si se sale y regresa
    raf = cur === t ? 0 : requestAnimationFrame(tick);
    if (!raf) last = 0;
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', onScroll, { passive: true });
  const onResize = () => { measure(); swims.forEach(s => place(s, easeInOut(cur))); onScroll(); };
  addEventListener('resize', onResize);

  return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
}
