// Preloader: sobre blanco, el logo de Ricocat se pinta en cian a brochazos (punta azul que avanza
// solo en celeste), exactamente en la posición/tamaño del logo del hero. Al terminar, el fondo
// pasa a cian y el logo a blanco; entonces se retira y el hero sigue (franjas → productos).
const LOGO = new URL('../../assets/brand/logo-ricocat.png', import.meta.url).href;
const NS = 'http://www.w3.org/2000/svg';
const W = 477, H = 105;
// regiones de cada letra en el PNG del logo (x0, x1, y0, y1) — R i c o c a t(+®)
const LETTERS = [[0, 94, 0, 103], [101, 141, 5, 104], [145, 207, 36, 104], [212, 278, 36, 104], [283, 345, 36, 104], [350, 430, 36, 104], [430, 476, 13, 104]];
const CYAN = '#00C8DC', NAVY = '#00326E';
const EASE = 'cubic-bezier(.55,.05,.35,1)', BACK = 'cubic-bezier(.34,1.56,.64,1)';

// brochazos por letra: pasadas casi verticales que alternan sentido y cubren todo el ancho
function strokesFor([x0, x1, y0, y1], k) {
  const w = x1 - x0, n = Math.max(2, Math.ceil(w / 30)), step = w / n, out = [];
  for (let i = 0; i < n; i++) {
    const cx = x0 + step * (i + 0.5), lean = ((i + k) % 2 ? 1 : -1) * 5;
    const top = y0 - 12, bot = y1 + 12;
    out.push(i % 2 ? `M${cx + lean} ${bot} L${cx - lean} ${top}` : `M${cx - lean} ${top} Q${cx + lean * 2} ${(top + bot) / 2} ${cx + lean} ${bot}`);
  }
  return out;
}

export function createPreloader({ reduce = false, minMs = 2000, target = null } = {}) {
  if (reduce) return { setProgress() {}, finish: () => Promise.resolve(), remove() {} };
  const t0 = performance.now();
  const el = document.createElement('div');
  el.setAttribute('data-preloader', '');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed; inset:0; z-index:9999; background:#fff; overflow:hidden;';

  // orden de pintado: letras mezcladas (no estrictamente de izquierda a derecha), con solapamiento
  // 3 pasadas horizontales de pincel: izquierda→derecha, derecha→izquierda, izquierda→derecha
  const band = (H + 24) / 3;
  const list = [0, 1, 2].map(n => {
    const y = -12 + band * (n + 0.5), ltr = n % 2 === 0;
    return { d: ltr ? `M-30 ${y} L${W + 30} ${y}` : `M${W + 30} ${y} L-30 ${y}`, delay: 60 + n * 360 };
  });
  const masks = (id, lag) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="-30" y="-30" width="${W + 60}" height="${H + 60}">${list.map(b => `<path d="${b.d}" data-delay="${b.delay + lag}" pathLength="1" fill="none" stroke="#fff" stroke-width="${(band + 6).toFixed(1)}" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1"></path>`).join('')}</mask>`;
  el.innerHTML = `
    <div data-pl-logo style="position:absolute; left:50%; top:50%; width:${W}px; height:${H}px; transform-origin:50% 50%;">
      <svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block; overflow:visible;">
        <defs>
          <mask id="pl-logo" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><image href="${LOGO}" width="${W}" height="${H}"></image></mask>
          ${masks('pl-body', 0)}
        </defs>
        <g mask="url(#pl-logo)">
          <rect x="-30" y="-30" width="${W + 60}" height="${H + 60}" fill="${CYAN}" mask="url(#pl-body)"></rect>
          <rect data-pl-white x="-30" y="-30" width="${W + 60}" height="${H + 60}" fill="#fff" opacity="0"></rect>
        </g>
      </svg>
    </div>
  `;
  document.body.appendChild(el);

  const logo = el.querySelector('[data-pl-logo]');
  // misma caja que el logo del hero (posición y escala reales); si no hay, centrado
  // 1) se pinta centrado en pantalla, al tamaño del logo del hero; 2) sube a la posición del hero
  logo.style.transformOrigin = '0 0';
  const heroBox = () => {
    const r = (typeof target === 'function' ? target() : target)?.getBoundingClientRect();
    const k = r && r.width > 10 ? r.width / W : Math.min(innerWidth * 0.72, 520) / W;
    return { k, left: r && r.width > 10 ? r.left : innerWidth / 2 - W * k / 2, top: r && r.width > 10 ? r.top : innerHeight * 0.2 };
  };
  const centerBox = () => { const { k } = heroBox(); return { k, left: innerWidth / 2 - W * k / 2, top: innerHeight / 2 - H * k / 2 }; };
  const apply = b => { logo.style.left = `${b.left}px`; logo.style.top = `${b.top}px`; logo.style.transform = `scale(${b.k})`; };
  let atHero = false;
  const place = () => apply(atHero ? heroBox() : centerBox());
  place();
  addEventListener('resize', place);

  const anims = [...el.querySelectorAll('mask path')].map(p => p.animate(
    [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    { duration: 520, delay: +p.dataset.delay, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'forwards' }));
  // la subida arranca cuando la última pasada está casi completa (su tramo final es lento y ya no se percibe)
  const lastEnd = Math.max(...list.map(b => b.delay)) + 520;
  const wait = ms => el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: Math.max(0, ms) }).finished.catch(() => {});
  const painted = wait(lastEnd - 170);
  logo.firstElementChild.style.transformOrigin = '50% 50%';

  let shown = 0, target01 = 0, raf = 0;
  const tick = () => {
    const goal = Math.min(target01, Math.min(1, (performance.now() - t0) / minMs));
    shown += (goal - shown) * 0.14;
    if (goal - shown < 0.002) shown = goal;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const waitFull = () => new Promise(res => { const chk = () => (shown >= 0.999 ? res() : requestAnimationFrame(chk)); chk(); });

  return {
    setProgress(p) { target01 = Math.max(target01, Math.min(1, p)); },
    // se resuelve cuando el fondo ya es cian y el logo blanco (idéntico al hero): momento del relevo
    async finish() {
      target01 = 1;
      // sube apenas termina de pintarse; tope de seguridad por si alguna animación no llega a terminar
      await Promise.race([painted, new Promise(r => setTimeout(r, 4000))]);
      cancelAnimationFrame(raf);
      // sube a su lugar en el hero; el fondo pasa a celeste rápido (antes de que termine la subida)
      const a = centerBox(), b = heroBox();
      atHero = true; apply(b);
      const RISE = 560, LEAD = 100; // el hero arranca LEAD ms antes de que el logo llegue
      const C = { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' };
      el.querySelector('[data-pl-white]').animate([{ opacity: 0 }, { opacity: 1 }], C);
      el.animate([{ backgroundColor: '#fff' }, { backgroundColor: CYAN }], C);
      this.done = logo.animate([
        { left: `${a.left}px`, top: `${a.top}px`, transform: `scale(${a.k})` },
        { left: `${b.left}px`, top: `${b.top}px`, transform: `scale(${b.k})` }
      ], { duration: RISE, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }).finished.catch(() => {});
      await wait(RISE - LEAD);
      // desde aquí el overlay se vuelve transparente: las líneas del hero se ven mientras el logo termina de llegar
      el.getAnimations().forEach(x => x.cancel());
      el.style.background = 'transparent';
      el.style.pointerEvents = 'none';
    },
    remove() {
      removeEventListener('resize', place);
      el.remove(); // relevo instantáneo: el logo ya coincide con el del hero
    }
  };
}
