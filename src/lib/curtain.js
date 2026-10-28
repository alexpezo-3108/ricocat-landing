// Transición entre secciones (GSAP): dos capas con borde curvo (cian y azul) suben desde abajo
// como una ola corta, tapan la pantalla, se salta a la sección y la ola sigue hacia arriba.
// Si GSAP aún no cargó, la misma animación corre con un tween propio (no se espera la descarga).
// Tipos de alimento (#bowl) aterriza directo en "Alimento seco" con el plato lleno.
const GSAP_URL = 'https://esm.sh/gsap@3.12.5';
let gsapP = null, gsapLib = null;
const loadGsap = () => (gsapP ||= import(GSAP_URL).then(m => { gsapLib = m.gsap || m.default; return gsapLib; }).catch(() => null));

// borde curvo: y = altura del borde en los lados, c = control central (más bajo = curva hacia arriba)
const ENTER = (y, c) => `M0 ${y} Q50 ${c} 100 ${y} L100 100 L0 100 Z`;
const EXIT = (y, c) => `M0 0 L100 0 L100 ${y} Q50 ${c} 0 ${y} Z`;
const inOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function createCurtain({ smooth = null, reduce = false } = {}) {
  if (reduce) return () => {};
  let busy = false;
  loadGsap();

  const destY = dest => {
    if (dest.hasAttribute('data-hero')) return 0;
    const top = dest.getBoundingClientRect().top + scrollY;
    if (dest.hasAttribute('data-bowl')) return top + 0.32 * Math.max(0, dest.offsetHeight - innerHeight);
    return top;
  };
  const jump = dest => {
    const y = destY(dest);
    if (smooth?.jump) smooth.jump(y);
    else { const el = document.documentElement, b = el.style.scrollBehavior; el.style.scrollBehavior = 'auto'; scrollTo(0, y); el.style.scrollBehavior = b; }
    dispatchEvent(new CustomEvent('ricocat:jump', { detail: { id: dest.id } }));
  };

  // tween de borde: {y,c} de a → b sobre un path
  const wave = (path, tpl, a, b, dur, delay) => {
    const g = gsapLib;
    if (g) {
      // el centro (c) va más rápido que los lados (y): así el borde se curva mientras avanza
      const o = { ...a };
      const upd = () => path.setAttribute('d', tpl(o.y, o.c));
      return new Promise(res => g.timeline({ delay, onUpdate: upd, onComplete: res })
        .to(o, { y: b.y, duration: dur, ease: 'power3.inOut' }, 0)
        .to(o, { c: b.c, duration: dur * 0.72, ease: 'power3.inOut' }, 0));
    }
    return new Promise(res => {
      const t0 = performance.now() + delay * 1000;
      const f = now => {
        const t = Math.min(1, Math.max(0, (now - t0) / (dur * 1000))), e = inOut(t), ec = inOut(Math.min(1, t / 0.72));
        path.setAttribute('d', tpl(a.y + (b.y - a.y) * e, a.c + (b.c - a.c) * ec));
        t < 1 ? requestAnimationFrame(f) : res();
      };
      requestAnimationFrame(f);
    });
  };

  // transición clásica (ola cian + azul que sube); se conserva para volver a ella con MODE = 'wave'
  const runWave = async dest => {
    busy = true;
    const NS = 'http://www.w3.org/2000/svg';
    const wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '300', pointerEvents: 'all' });
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
    Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    const mk = fill => { const p = document.createElementNS(NS, 'path'); p.setAttribute('fill', fill); p.setAttribute('d', ENTER(100, 100)); svg.appendChild(p); return p; };
    const cyan = mk('#00C8DC'), blue = mk('#00326E');
    wrap.append(svg);
    document.body.appendChild(wrap);
    try {
      // entra: el borde sube curvado (centro adelantado) y se aplana al cubrir
      await Promise.all([
        wave(cyan, ENTER, { y: 100, c: 100 }, { y: 0, c: 0 }, 0.5, 0),
        wave(blue, ENTER, { y: 100, c: 100 }, { y: 0, c: 0 }, 0.5, 0.08)
      ]);
      jump(dest);
      await new Promise(r => setTimeout(r, 90));
      // sale: el borde inferior sube curvado y descubre la sección
      blue.setAttribute('d', EXIT(100, 100)); cyan.setAttribute('d', EXIT(100, 100));
      await Promise.all([
        wave(blue, EXIT, { y: 100, c: 100 }, { y: 0, c: 0 }, 0.5, 0),
        wave(cyan, EXIT, { y: 100, c: 100 }, { y: 0, c: 0 }, 0.5, 0.07)
      ]);
    } finally { wrap.remove(); busy = false; }
  };

  // transición pescadito: nada en curva por la pantalla dejando una estela cian que se engrosa
  // hasta cubrirla; se salta a la sección y la estela se recoge tras él mientras sale por la derecha
  const runFish = async dest => {
    busy = true;
    const NS = 'http://www.w3.org/2000/svg';
    const W = innerWidth, H = innerHeight;
    const wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '300', pointerEvents: 'all' });
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'visible' });
    const trail = document.createElementNS(NS, 'path');
    trail.setAttribute('d', `M${-0.3 * W} ${0.64 * H} C${0.18 * W} ${0.26 * H} ${0.55 * W} ${0.8 * H} ${1.3 * W} ${0.38 * H}`);
    Object.assign(trail.style, { fill: 'none', stroke: '#00C8DC', strokeLinecap: 'round' });
    const fish = document.createElementNS(NS, 'g');
    fish.innerHTML = '<path d="M-18 0 L-38 -14 L-33 0 L-38 14 Z" fill="#fff"></path><ellipse cx="0" cy="0" rx="24" ry="13" fill="#fff"></ellipse><circle cx="11" cy="-3" r="2.8" fill="#00326E"></circle>';
    svg.append(trail, fish);
    wrap.append(svg);
    document.body.appendChild(wrap);
    const len = trail.getTotalLength();
    const WMAX = Math.hypot(W, H) * 1.5; // grosor final: cubre toda la pantalla
    const FS = Math.min(2.6, Math.max(1.5, W / 620)); // tamaño del pez
    const HEAD_COVER = 0.8; // donde va el pez cuando la estela ya tapa todo
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const frame = (tail, head, width) => {
      trail.style.strokeWidth = width.toFixed(1);
      trail.style.strokeDasharray = `${Math.max(0.01, (head - tail) * len).toFixed(1)} ${(len * 4).toFixed(0)}`;
      trail.style.strokeDashoffset = (-tail * len).toFixed(1);
      const d = head * len, a = trail.getPointAtLength(Math.max(0, d - 2)), b = trail.getPointAtLength(Math.min(len, d + 2));
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const wob = Math.sin(performance.now() / 70) * 6; // coleteo
      fish.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${(ang + wob).toFixed(1)}) scale(${FS})`);
    };
    const tween = (ms, fn) => new Promise(res => {
      const t0 = performance.now();
      const f = now => { const t = Math.min(1, (now - t0) / ms); fn(t); t < 1 ? requestAnimationFrame(f) : res(); };
      requestAnimationFrame(f);
    });
    try {
      frame(0, 0, 40);
      // 1) entra: el pez avanza y la estela crece hasta cubrir
      await tween(620, t => {
        const e = ease(t);
        frame(0, e * HEAD_COVER, 40 + (WMAX - 40) * Math.pow(e, 1.8));
      });
      jump(dest);
      await new Promise(r => setTimeout(r, 80));
      // 2) sale: el pez sigue hasta salir y la estela se recoge tras él
      await tween(560, t => {
        const e = ease(t);
        frame(e * 1.02, HEAD_COVER + (1 - HEAD_COVER) * e, WMAX);
      });
    } finally { wrap.remove(); busy = false; }
  };
  // transición de franjas diagonales azules: aparecen finas, se ensanchan hasta tapar la pantalla,
  // se salta a la sección y se adelgazan por el otro lado descubriéndola
  const runStripes = async dest => {
    busy = true;
    const NS = 'http://www.w3.org/2000/svg';
    const W = innerWidth, H = innerHeight, D = Math.hypot(W, H);
    const N = W < 700 ? 4 : 7, SP = D / N;
    // paleta de marca: azul y cian alternados
    const PAL = ['#00326E', '#00C8DC'];
    const wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '300', pointerEvents: 'all' });
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `rotate(-28 ${W / 2} ${H / 2})`);
    const x0 = W / 2 - D / 2 - SP, y0 = H / 2 - D / 2 - SP, h = D + SP * 2;
    const bars = [...Array(N + 2)].map((_, i) => {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('y', y0.toFixed(1)); r.setAttribute('height', h.toFixed(1)); r.setAttribute('fill', PAL[i % PAL.length]); r.setAttribute('shape-rendering', 'crispEdges');
      r.setAttribute('x', (x0 + i * SP).toFixed(1)); r.setAttribute('width', '0');
      g.appendChild(r); return r;
    });
    svg.appendChild(g); wrap.appendChild(svg); document.body.appendChild(wrap);
    const easeIn = t => t * t * t, easeOut = t => 1 - Math.pow(1 - t, 3), io = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const tween = (ms, fn) => new Promise(res => {
      const t0 = performance.now();
      const f = now => { const t = Math.min(1, (now - t0) / ms); fn(t); t < 1 ? requestAnimationFrame(f) : res(); };
      requestAnimationFrame(f);
    });
    // color: cian al aparecer → azul al cubrir → cian al irse (se distingue sobre fondos azules)
    const STAG = 0.35; // desfase entre franjas (fracción del tiempo total)
    const local = (t, i) => Math.min(1, Math.max(0, (t - (i / (bars.length - 1)) * STAG) / (1 - STAG)));
    try {
      // 1) entran finas y se ensanchan hasta juntarse (de izquierda a derecha)
      await tween(560, t => bars.forEach((r, i) => {
        const e = io(local(t, i));
        r.setAttribute('width', (Math.max(0.0001, 2 + e * (SP - 2)) + (e > 0.98 ? 1 : 0)).toFixed(1));
        r.setAttribute('opacity', local(t, i) > 0 ? '1' : '0');
      }));
      jump(dest);
      await new Promise(r => setTimeout(r, 70));
      // 2) se adelgazan por su borde izquierdo y desaparecen, descubriendo la sección
      await tween(520, t => bars.forEach((r, i) => {
        const e = io(local(t, i));
        const w = (SP + 1) * (1 - e);
        r.setAttribute('x', (x0 + i * SP + (SP + 1) - w).toFixed(1));
        r.setAttribute('width', Math.max(0, w).toFixed(1));
      }));
    } finally { wrap.remove(); busy = false; }
  };
  const MODE = 'stripes'; // 'wave' = ola anterior · 'fish' = pescadito
  const run = dest => ({ fish: runFish, stripes: runStripes }[MODE] || runWave)(dest);

  const onClick = e => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    // "#" sin destino (Comprar, Ver más, redes, etc.) no navega: lo manejan sus propios scripts
    if (!id && !a.hasAttribute('data-backtop')) { e.preventDefault(); return; }
    // volver arriba: misma transición y aterriza en el hero
    const top = !id;
    const dest = top ? document.querySelector('[data-hero]') : document.getElementById(id);
    if (!dest) return;
    e.preventDefault();
    if (busy) return;
    if (top) history.replaceState(null, '', location.pathname + location.search);
    else history.replaceState(null, '', `#${id}`);
    run(dest);
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
