// Smooth scrolling con inercia para rueda / trackpad (sin transformar el DOM:
// mueve el scroll nativo, así sticky, IntersectionObserver y anclas siguen funcionando).
// Touch y teclado quedan nativos. Las anclas internas (#id) se animan con el mismo motor.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createSmoothScroll({ lerp = 0.055, wheelMultiplier = 0.85, anchorDuration = 1600 } = {}) {
  const el = document.scrollingElement || document.documentElement;
  const prevBehavior = el.style.scrollBehavior;
  el.style.scrollBehavior = 'auto';

  let target = el.scrollTop;
  let current = target;
  let raf = 0;
  let tween = null;
  let selfScroll = false;
  let last = 0;

  const max = () => el.scrollHeight - innerHeight;
  const write = y => { selfScroll = true; el.scrollTop = y; };

  const tick = now => {
    raf = 0;
    if (tween) {
      const p = clamp((now - tween.t0) / tween.duration, 0, 1);
      current = tween.from + (tween.to - tween.from) * easeInOutCubic(p);
      target = current;
      if (p >= 1) tween = null;
    } else {
      // lerp independiente del framerate (60/120/144 Hz se sienten igual)
      const dt = Math.min(64, now - (last || now));
      const k = 1 - Math.pow(1 - lerp, dt / 16.67);
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.3) current = target;
    }
    last = now;
    write(current);
    if (tween || current !== target) raf = requestAnimationFrame(tick);
    else last = 0;
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(tick); };

  const onWheel = e => {
    if (e.ctrlKey || e.defaultPrevented) return;
    if (document.body.style.overflow === 'hidden') return; // menú abierto
    if (e.target.closest?.('[data-native-scroll]')) return;
    e.preventDefault();
    tween = null;
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
    const next = clamp(target + e.deltaY * unit * wheelMultiplier, 0, max());
    // tope de escenas (plato): puede retener el destino un instante
    target = window.__ricocatScrollGate ? clamp(window.__ricocatScrollGate(target, next), 0, max()) : next;
    run();
  };

  // Scroll externo (teclado, barra, touch): sincroniza sin pelear
  const onScroll = () => {
    if (selfScroll) { selfScroll = false; return; }
    if (raf) return;
    target = current = el.scrollTop;
  };

  const scrollTo = (y, duration = anchorDuration) => {
    const to = clamp(y, 0, max());
    tween = { from: el.scrollTop, to, t0: performance.now(), duration };
    current = el.scrollTop;
    run();
  };

  const onClick = e => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const dest = id ? document.getElementById(id) : null;
    if (!id) { e.preventDefault(); if (a.hasAttribute('data-backtop')) scrollTo(0); return; }
    if (!dest) return;
    e.preventDefault();
    scrollTo(dest.getBoundingClientRect().top + el.scrollTop);
    history.replaceState(null, '', `#${id}`);
  };

  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onClick);

  // salto instantáneo que también reinicia la inercia (p. ej. tras plegar contenido)
  const jump = y => { tween = null; target = current = clamp(y, 0, max()); write(current); };

  return {
    scrollTo,
    jump,
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('wheel', onWheel);
      removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
      el.style.scrollBehavior = prevBehavior;
    }
  };
}
