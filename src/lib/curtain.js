// Transición entre secciones: al tocar un ancla (a[href^="#id"]) entra una cortina de 4 columnas
// desde la izquierda con desfase irregular, se salta a la sección por debajo y la cortina sale a la derecha.
const COLORS = ['#00326E', '#00C8DC', '#00326E', '#0A4789'];
const IN = [0, 110, 45, 160], OUT = [60, 0, 140, 90];
const EASE = 'cubic-bezier(.76,0,.24,1)';

export function createCurtain({ smooth = null, reduce = false } = {}) {
  if (reduce) return () => {};
  let busy = false;

  const run = dest => {
    busy = true;
    const wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '300', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', pointerEvents: 'all' });
    const cols = COLORS.map(c => {
      const d = document.createElement('div');
      Object.assign(d.style, { background: c, transform: 'translateX(-101%)', willChange: 'transform', marginRight: '-1px' });
      wrap.appendChild(d); return d;
    });
    document.body.appendChild(wrap);
    // al entrar, cada columna viaja desde fuera de pantalla por la izquierda (distancia proporcional a su posición)
    const ins = cols.map((d, i) => d.animate([{ transform: `translateX(${-101 - i * 100}%)` }, { transform: 'none' }],
      { duration: 560 + i * 40, delay: IN[i], easing: EASE, fill: 'forwards' }).finished);
    Promise.all(ins).then(() => {
      const y = dest.getBoundingClientRect().top + scrollY;
      if (smooth?.jump) smooth.jump(y);
      else { const el = document.documentElement, b = el.style.scrollBehavior; el.style.scrollBehavior = 'auto'; scrollTo(0, y); el.style.scrollBehavior = b; }
      return new Promise(r => setTimeout(r, 120));
    }).then(() => Promise.all(cols.map((d, i) => d.animate([{ transform: 'none' }, { transform: `translateX(${101 + (3 - i) * 100}%)` }],
      { duration: 560 + (3 - i) * 40, delay: OUT[i], easing: EASE, fill: 'forwards' }).finished)))
      .finally(() => { wrap.remove(); busy = false; });
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
