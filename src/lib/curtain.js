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

  const run = async dest => {
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

  const onClick = e => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const dest = id ? document.getElementById(id) : null;
    if (!dest) return; // "#" (volver arriba) sigue con el scroll suave
    e.preventDefault();
    if (busy) return;
    history.replaceState(null, '', `#${id}`);
    run(dest);
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
