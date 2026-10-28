// Carrusel de sabores por etapa ([data-flavors]): flechas, dots, swipe y teclado.
// Al cambiar, la escena completa (fondo, palabra, gato y bolsa) sale por la izquierda y
// la siguiente aparece donde el fondo ya pasó; los textos laterales salen antes y entran al final.
// Cada sabor también cambia palabra grande, gato, textos, beneficios y color de fondo.

const BEHIND = 'translate3d(0, 1.2%, 0) scale(0.93)';
const OUT = 'translate3d(-64%, 5%, 0) rotate(-16deg) scale(0.88)';
const E_OUT = 'cubic-bezier(.22,1,.36,1)', E_IO = 'cubic-bezier(.65,0,.35,1)', E_IN = 'cubic-bezier(.5,0,.75,0)';

// Varias etapas ([data-flavors]) apiladas en cortina (sticky); el borde en blobs solo en la primera.
// Las etapas 2 y 3 ([data-fl-reveal]) quedan fijas detrás y se descubren al subir la anterior.
// Freno de scroll: al soltar cerca del inicio de una etapa, el scroll se asienta en ella.
export function createFlavors(root, opts = {}) {
  const secs = [...root.querySelectorAll('[data-flavors]')];
  const stops = secs.map((sec, i) => initFlavors(sec, opts, i === 0));
  const { reduce = false } = opts;
  // al soltar el scroll con una cortina a medio camino, se cierra (o se abre) rápido y queda fija
  const curtains = [...root.querySelectorAll('[data-fl-reveal]')];
  let idle = 0, snapping = false;
  let touching = false;
  const onTS = () => { touching = true; clearTimeout(idle); }, onTE = () => { touching = false; clearTimeout(idle); idle = setTimeout(snap, 70); };
  addEventListener('touchstart', onTS, { passive: true });
  addEventListener('touchend', onTE, { passive: true });
  stops.push(() => { removeEventListener('touchstart', onTS); removeEventListener('touchend', onTE); });
  // mobile: cada etapa es más alta que la pantalla; si la cortina de la siguiente quedó a medias
  // (entre "base de la etapa alineada abajo" y "inicio de la siguiente"), se asienta en el extremo más cercano
  const snapMobile = () => {
    const ih = innerHeight, first = secs[0], prev = first.previousElementSibling;
    if (!prev) return;
    let top = prev.getBoundingClientRect().bottom + scrollY;
    for (let i = 0; i < secs.length - 1; i++) {
      const h = secs[i].offsetHeight, a = top + h - ih, b = top + h, y = scrollY;
      if (y > a + 2 && y < b - 2) {
        snapping = true;
        scrollToY(opts.smooth, (y - a) < (b - y) ? a : b, 380);
        setTimeout(() => { snapping = false; }, 440);
        return;
      }
      top += h;
    }
    // última etapa (Esterilizados): al salir hacia la tienda, si aún se ve más de la mitad, vuelve a quedar entera
    const last = secs[secs.length - 1], h = last.offsetHeight, a = top + h - ih, y = scrollY;
    if (y > a + 2 && y < a + ih * 0.5) {
      snapping = true;
      scrollToY(opts.smooth, a, 380);
      setTimeout(() => { snapping = false; }, 440);
    }
  };
  const snap = () => {
    if (touching) return;
    if (innerWidth <= 1100) return snapMobile();
    const ih = innerHeight;
    for (const c of curtains) {
      const t = c.getBoundingClientRect().top;
      if (t <= 3 || t >= ih - 3) continue;
      const y = scrollY + (t < ih * 0.5 ? t : t - ih);
      snapping = true;
      scrollToY(opts.smooth, y, 480);
      setTimeout(() => { snapping = false; }, 560);
      return;
    }
  };
  // la última etapa sale con scroll normal: al pasar su inicio, su escena deja de estar fija
  const lastStage = curtains.filter(c => !c.nextElementSibling?.matches('[data-flavors]')).pop();
  const syncExit = () => {
    if (!lastStage) return;
    const past = lastStage.getBoundingClientRect().top < 0;
    if (past !== lastStage.hasAttribute('data-fl-past')) lastStage.toggleAttribute('data-fl-past', past);
  };
  syncExit();
  addEventListener('scroll', syncExit, { passive: true });
  stops.push(() => removeEventListener('scroll', syncExit));
  const onScroll = () => { if (snapping) return; clearTimeout(idle); idle = setTimeout(snap, 90); };
  if (!reduce) addEventListener('scroll', onScroll, { passive: true });
  return () => { stops.forEach(f => f()); clearTimeout(idle); removeEventListener('scroll', onScroll); };
}

const scrollToY = (smooth, y, ms) => {
  if (smooth?.scrollTo) smooth.scrollTo(y, ms); else scrollTo({ top: y, behavior: 'smooth' });
};

function initFlavors(sec, { reduce = false, smooth = null } = {}, withEdge = true) {
  const q = (k, i) => sec.querySelector(`[data-fl-${k}="${i}"]`);
  const bags = [...sec.querySelectorAll('[data-fl-bag]')];
  const n = bags.length;
  const dots = [...sec.querySelectorAll('[data-fl-dot]')];
  const count = sec.querySelector('[data-fl-count]');
  const bgs = bags.map(b => b.dataset.bg);
  const label = sec.dataset.stage || '';
  const D = ms => (reduce ? 0 : ms);
  let cur = 0, busy = false;

  // borde superior en "blobs" (como la entrada del bowl): sobresale un poco sobre la sección
  // anterior y sube con el scroll, con el color del sabor activo
  const EH = 180, N = 48;
  const edge = document.createElement('div');
  edge.setAttribute('aria-hidden', 'true');
  Object.assign(edge.style, { position: 'absolute', left: '0', right: '0', top: `-${EH}px`, height: `${EH + 1}px`, zIndex: '8', pointerEvents: 'none', clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)' });
  sec.prepend(edge);
  if (!withEdge) edge.style.display = 'none';
  const wave = (x, ph) => {
    const t = x * Math.PI * 2;
    return 0.5 * Math.sin(t * 1.15 + ph) + 0.32 * Math.sin(t * 2.6 - ph * 1.4 + 1.1) + 0.18 * Math.sin(t * 4.3 + ph * 0.8 + 2.3);
  };
  const sm = t => t * t * (3 - 2 * t);
  const drawEdge = () => {
    if (!withEdge) return;
    const ih = innerHeight, top = sec.getBoundingClientRect().top;
    if (top > ih + 50 || top < -ih) return;
    const e = Math.min(1, Math.max(0, (ih - top) / ih));
    const lift = Math.min(110, ih * 0.11) * sm(e), amp = Math.min(55, ih * 0.055);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const y = Math.max(0, Math.min(EH + 1, EH - lift + amp * wave(i / N, e * 2 + 1.7)));
      pts.push(`${(i / N * 100).toFixed(2)}% ${y.toFixed(1)}px`);
    }
    edge.style.clipPath = `polygon(${pts.join(', ')}, 100% 100%, 0% 100%)`;
  };
  let edgeRaf = 0;
  const onEdge = () => { if (!edgeRaf) edgeRaf = requestAnimationFrame(() => { edgeRaf = 0; drawEdge(); }); };
  addEventListener('scroll', onEdge, { passive: true });
  addEventListener('resize', onEdge);

  const show = (el, on) => { if (el) el.style.visibility = on ? '' : 'hidden'; };
  const anim = (el, kf, o) => el ? el.animate(kf, { ...o, duration: D(o.duration), delay: D(o.delay || 0), fill: 'both' }) : null;
  const wrap = i => (i + n) % n;
  const lines = i => [...(q('copy', i)?.querySelectorAll('[data-line]') || [])];
  const items = i => [...(q('bens', i)?.querySelectorAll('[data-ben-item]') || [])];

  const setBag = (i, pose, z) => {
    const b = bags[i]; if (!b) return;
    b.getAnimations().forEach(a => a.cancel());
    b.style.transform = pose === 'front' ? 'none' : pose === 'behind' ? BEHIND : OUT;
    b.style.opacity = pose === 'hidden' ? '0' : '1';
    b.style.zIndex = z;
    show(b, pose !== 'hidden');
  };
  const paintNav = i => {
    dots.forEach((d, k) => {
      const on = k === i;
      d.style.width = on ? '40px' : '6px';
      d.style.background = on ? '#00326E' : 'rgba(0,50,110,0.28)';
      d.setAttribute('aria-current', on ? 'true' : 'false');
    });
    if (count) count.textContent = `Sabor ${i + 1} de ${n}`;
  };

  // estado inicial
  bags.forEach((_, i) => setBag(i, i === 0 ? 'front' : 'hidden', i === 0 ? 3 : 1));
  for (let i = 1; i < n; i++) ['word', 'cat', 'kib', 'still', 'copy', 'bens'].forEach(k => show(q(k, i), false));
  sec.style.background = bgs[0];
  edge.style.background = bgs[0];
  drawEdge();
  paintNav(0);

  // distancia para sacar un elemento por completo por la izquierda de la pantalla
  const offLeft = el => {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return -(r.right + 60);
  };
  const SLIDE_MS = 560;
  const LEAD = 120; // los textos laterales desaparecen primero; luego arranca el deslizamiento

  // recorta los elementos de la escena "de abajo" para que solo se vean donde el fondo ya
  // dejó paso (a la derecha del borde del barrido)
  const clipUnder = (els, layer) => {
    els = els.filter(Boolean);
    const step = () => {
      const alive = layer.isConnected;
      const ex = alive ? layer.getBoundingClientRect().right : -1e5;
      els.forEach(el => {
        if (!alive) { el.style.clipPath = ''; return; }
        const b = el.getBoundingClientRect();
        if (!b.width) return;
        const L = Math.max(0, ex - b.left) * (el.offsetWidth / b.width);
        el.style.clipPath = `inset(0 0 0 ${Math.min(el.offsetWidth + 1, L).toFixed(1)}px)`;
      });
      if (alive) requestAnimationFrame(step);
    };
    step();
  };

  const go = (to, dir) => {
    to = wrap(to);
    if (busy || to === cur || n < 2) return;
    busy = true;
    const from = cur; cur = to;
    dir = dir || (to > from ? 1 : -1);
    paintNav(to);

    const parts = i => ({ word: q('word', i), cat: q('cat', i), kib: q('kib', i), still: q('still', i), copy: q('copy', i), bens: q('bens', i), bag: bags[i] });
    const P = parts(from), N2 = parts(to);
    // el bodegón se anima pieza por pieza: animar/recortar su contenedor crearía un contexto
    // de apilamiento y las latas quedarían detrás de la bolsa durante la transición
    const ex = list => list.filter(Boolean).flatMap(el => el.hasAttribute('data-fl-still') ? [...el.children] : [el]);
    bags.forEach((_, i) => { if (i !== from && i !== to) setBag(i, 'hidden', 1); });
    // cualquier resto de otro sabor (transición previa interrumpida) queda oculto
    for (let i = 0; i < n; i++) if (i !== from && i !== to) ['word', 'cat', 'kib', 'still', 'copy', 'bens'].forEach(k => { const el = q(k, i); if (el) { el.getAnimations().forEach(a => a.cancel()); el.style.clipPath = ''; show(el, false); } });

    // 1) al hacer clic, los textos de los lados se van de inmediato
    [P.copy, P.bens].forEach(el => {
      if (!el) return;
      anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-24px)' }], { duration: 140, easing: E_IN })
        ?.finished.then(() => { el.getAnimations().forEach(x => x.cancel()); if (cur !== from) show(el, false); }).catch(() => {});
    });

    // 2) barrido: la escena completa (fondo + palabra + gato + bolsa) sale por la izquierda
    //    y la siguiente aparece recién donde el fondo ya pasó
    const layer = (host, before, color) => {
      const c = document.createElement('div');
      Object.assign(c.style, { position: 'absolute', inset: '0', pointerEvents: 'none', background: color });
      before ? host.insertBefore(c, before) : host.appendChild(c);
      return c;
    };
    const sweepKF = dir > 0
      ? [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }]
      : [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }];
    const color = dir > 0 ? bgs[from] : bgs[to];
    const L1 = layer(sec, edge.nextSibling, color), L2 = layer(edge, null, color);
    if (dir > 0) { sec.style.background = bgs[to]; edge.style.background = bgs[to]; }
    const sweeps = [L1, L2].map(c => c.animate(sweepKF, { duration: D(SLIDE_MS), delay: D(LEAD), easing: E_IO, fill: 'both' }));
    Promise.all(sweeps.map(s => s.finished.catch(() => {}))).then(() => {
      if (cur === to) { sec.style.background = bgs[to]; edge.style.background = bgs[to]; }
      // al volver, la escena saliente se oculta ANTES de quitar el barrido (si no, asoma un instante)
      if (dir < 0 && cur === to) { setBag(from, 'hidden', 1); setBag(to, 'front', 3); [P.word, P.cat, P.kib, P.still].forEach(el => show(el, false)); }
      L1.remove(); L2.remove();
    });

    if (dir > 0) {
      // la nueva escena ya está en su sitio, recortada por el barrido
      // primero se recorta (todo tapado) y recién después se muestra: así no asoma ni un cuadro
      setBag(to, 'front', 3); show(N2.bag, false);
      clipUnder(ex([N2.word, N2.cat, N2.bag, N2.kib, N2.still]), L1);
      [N2.word, N2.cat, N2.kib, N2.still, N2.bag].forEach(el => show(el, true));
      ex([N2.still]).forEach(el => show(el, true));
      // la palabra grande nueva entra desde la izquierda, detrás de la que sale
      if (N2.word) {
        N2.word.getAnimations().forEach(x => x.cancel());
        anim(N2.word, [{ transform: `translateX(${-innerWidth * 0.9}px)`, opacity: 0 }, { transform: 'none', opacity: 1, offset: 1 }],
          { duration: 820, delay: LEAD + 80, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
      P.bag.style.zIndex = 4;
      // toda la escena sale como un solo bloque: misma distancia y mismo tiempo
      const outEls = ex([P.word, P.cat, P.bag, P.still, P.kib]);
      const dxOut = Math.min(...outEls.map(offLeft));
      outEls.forEach(el => {
        anim(el, [{ transform: 'none' }, { transform: `translateX(${dxOut}px)` }], { duration: SLIDE_MS, delay: LEAD, easing: E_IO })
          ?.finished.then(() => {
            el.getAnimations().forEach(x => x.cancel());
            if (el === P.bag) setBag(from, 'hidden', 1); else show(el, false);
          }).catch(() => {});
      });
    } else {
      // vuelve: la escena anterior entra completa desde la izquierda y tapa a la actual
      clipUnder(ex([P.word, P.cat, P.bag, P.kib, P.still]), L1);
      setBag(to, 'front', 4);
      if (N2.still) show(N2.still, true);
      const inEls = ex([N2.word, N2.cat, N2.bag, N2.still, N2.kib]);
      inEls.forEach(el => show(el, true));
      const dxIn = Math.min(...inEls.map(offLeft));
      inEls.forEach(el => {
        el.style.zIndex = el === N2.bag ? '4' : el.style.zIndex;
        anim(el, [{ transform: `translateX(${dxIn}px)` }, { transform: 'none' }], { duration: SLIDE_MS, delay: LEAD, easing: E_IO })
          ?.finished.then(x => { x?.cancel?.(); }).catch(() => {});
      });
      setTimeout(() => {
        if (cur !== to) return;
        setBag(from, 'hidden', 1); setBag(to, 'front', 3);
        [P.word, P.cat, P.kib, P.still].forEach(el => show(el, false));
      }, D(LEAD + SLIDE_MS + 40));
    }

    // 3) al final, los textos de los lados del nuevo sabor
    // entran desde la izquierda, línea por línea: llegada lenta y suave (salida fue rápida)
    const E_SOFT = 'cubic-bezier(.16,1,.3,1)';
    [N2.copy, N2.bens].forEach((el, k) => {
      if (!el) return;
      show(el, true);
      const rows = [...el.querySelectorAll('[data-line], [data-fl-benlabel], [data-ben-item]')];
      (rows.length ? rows : [el]).forEach((r, j) => {
        r.getAnimations().forEach(x => x.cancel());
        anim(r, [{ transform: 'translateX(-90px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 760, delay: LEAD + SLIDE_MS - 160 + k * 80 + j * 50, easing: E_SOFT });
      });
    });

    setTimeout(() => { busy = false; }, D(LEAD + SLIDE_MS + 380));
  };

  // si la etapa aún no está encuadrada (p. ej. a media cortina), primero se lleva la pantalla
  // a esta etapa y luego cambia el sabor
  const framed = fn => () => {
    const t = sec.getBoundingClientRect().top;
    if (innerWidth > 1100 && Math.abs(t) > 3) {
      scrollToY(smooth, scrollY + t, 520);
      setTimeout(fn, D(600));
    } else fn();
  };
  const next = framed(() => go(cur + 1, 1));
  const prev = framed(() => go(cur - 1, -1));
  const offs = [];
  const on = (el, ev, fn, opt) => { if (!el) return; el.addEventListener(ev, fn, opt); offs.push(() => el.removeEventListener(ev, fn, opt)); };
  on(sec.querySelector('[data-fl-next]'), 'click', next);
  on(sec.querySelector('[data-fl-prev]'), 'click', prev);
  dots.forEach((d, k) => on(d, 'click', framed(() => go(k))));
  on(sec, 'keydown', e => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); });
  // autoplay cada 5 s (solo en la etapa con data-fl-autoplay): se pausa con hover, fuera de vista o tras interactuar
  if (false && !reduce && n > 1 && sec.hasAttribute('data-fl-autoplay')) { // autoplay desactivado
    let inView = false, hover = false, last = performance.now();
    const io = new IntersectionObserver(([e]) => { inView = e.intersectionRatio > 0.6; last = performance.now(); }, { threshold: [0, 0.6, 1] });
    io.observe(sec);
    const bump = () => { last = performance.now(); };
    on(sec, 'pointerenter', () => { hover = true; });
    on(sec, 'pointerleave', () => { hover = false; bump(); });
    // foco en "Ver productos" también pausa el autoplay
    on(sec, 'focusin', e => { if (e.target.closest('[data-fl-go]')) hover = true; });
    on(sec, 'focusout', e => { if (e.target.closest('[data-fl-go]')) { hover = false; bump(); } });
    on(sec, 'click', bump); on(sec, 'keydown', bump);
    const t = setInterval(() => {
      if (!inView || hover || document.hidden || busy) return;
      if (performance.now() - last < 5000) return;
      last = performance.now(); next();
    }, 250);
    offs.push(() => { clearInterval(t); io.disconnect(); });
  }

  // swipe / arrastre horizontal
  let x0 = null, y0 = 0;
  on(sec, 'pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
  on(window, 'pointerup', e => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) (dx < 0 ? next : prev)();
  });
  on(window, 'pointercancel', () => { x0 = null; });

  // croquetas: parallax suave con el mouse (como en el home)
  const pars = reduce ? [] : [...sec.querySelectorAll('[data-fl-par]')].map(el => ({ el, d: parseFloat(el.dataset.flPar) || 16, x: 0, y: 0 }));
  let mx = 0, my = 0, parRaf = 0;
  const parTick = () => {
    let moving = false;
    pars.forEach(p => {
      p.x += (mx * p.d - p.x) * 0.08; p.y += (my * p.d - p.y) * 0.08;
      if (Math.abs(mx * p.d - p.x) > 0.05 || Math.abs(my * p.d - p.y) > 0.05) moving = true;
      p.el.style.translate = `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`;
    });
    parRaf = moving ? requestAnimationFrame(parTick) : 0;
  };
  if (pars.length && matchMedia('(pointer: fine)').matches) {
    on(sec, 'pointermove', e => {
      mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1;
      if (!parRaf) parRaf = requestAnimationFrame(parTick);
    });
    on(sec, 'pointerleave', () => { mx = 0; my = 0; if (!parRaf) parRaf = requestAnimationFrame(parTick); });
  }

  return () => {
    cancelAnimationFrame(parRaf);
    offs.forEach(f => f());
    removeEventListener('scroll', onEdge);
    removeEventListener('resize', onEdge);
    cancelAnimationFrame(edgeRaf);
    edge.remove();
  };
}
