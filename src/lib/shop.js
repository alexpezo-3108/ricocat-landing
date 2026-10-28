// Catálogo "Elige tu Ricocat" ([data-shop]): filtros por etapa y formato, contador y
// hover de tarjeta (el fondo de la imagen intensifica su color).


export function createShop(root, { reduce = false, smooth = null } = {}) {
  const shop = root.querySelector('[data-shop]');
  if (!shop) return () => {};
  const cards = [...shop.querySelectorAll('[data-card]')];
  const btns = [...shop.querySelectorAll('[data-shop-filter]')];
  const count = shop.querySelector('[data-shop-count]');
  const more = shop.querySelector('[data-shop-more]');
  const BASE = parseInt(shop.dataset.limit, 10) || Infinity;
  // "Ver más" aparece tras 2 filas completas: se cuenta cuántas columnas tiene la grilla
  const cols = () => { const g = shop.querySelector('[data-card]')?.parentElement; const t = g && getComputedStyle(g).gridTemplateColumns; return t && t !== 'none' ? t.split(' ').filter(Boolean).length : 0; };
  let LIMIT = BASE;
  const state = { stage: 'todos', format: 'todos', sabor: 'todos', all: false };
  // filtro Sabor: solo visible con Etapa = Adultos
  const saborBox = shop.querySelector('[data-shop-sabor]'), saborSep = shop.querySelector('[data-shop-sabor-sep]');
  const offs = [];
  const on = (el, ev, fn) => { el.addEventListener(ev, fn); offs.push(() => el.removeEventListener(ev, fn)); };

  // hover de filtros: etapa con el tono de su etapa; formato en azul claro
  const TINT = { 'stage:gatitos': '#FBE3E6', 'stage:adultos': '#E3ECF8', 'stage:esterilizados': '#F2E6DD',
    // sabores de Adultos: mismo tono que su slide en Etapas de vida
    'sabor:atun-sardina-trucha': '#E3ECF8', 'sabor:festival-de-sabores': '#EEE7F7', 'sabor:pollo-sardina-salmon': '#FCEBDD', 'sabor:carne-salmon-leche': '#F9E3E3' };
  const SABOR = { 'atun-sardina-trucha': '#1F4E8C', 'festival-de-sabores': '#6A4A9C', 'pollo-sardina-salmon': '#B0521A', 'carne-salmon-leche': '#A63A3A' };
  // color activo por etapa (texto blanco); el filtro de formato activo toma el color de la etapa elegida
  const SOLID = { gatitos: '#D9667E', adultos: '#1F4E8C', esterilizados: '#8A5232', todos: '#00326E' };
  const keyOf = b => { const [k, v] = b.dataset.shopFilter.split(':'); return (k === 'stage' || k === 'sabor') && v !== 'todos' ? b.dataset.shopFilter : 'stage:' + state.stage; };
  const solidOf = b => { const [k, v] = b.dataset.shopFilter.split(':'); if (k === 'sabor' && SABOR[v]) return SABOR[v]; return SOLID[k === 'stage' ? v : state.stage] || '#00326E'; };
  const hoverTint = b => TINT[keyOf(b)] || '#E3ECF8';
  // texto en hover: el mismo tono, más fuerte (contraste ≥ 4.5:1 sobre su fondo)
  const INK = { 'stage:gatitos': '#8E1F38', 'stage:adultos': '#163F75', 'stage:esterilizados': '#6A3A1E',
    'sabor:atun-sardina-trucha': '#163F75', 'sabor:festival-de-sabores': '#4E3378', 'sabor:pollo-sardina-salmon': '#7E3A10', 'sabor:carne-salmon-leche': '#7C2626' };
  const hoverInk = b => INK[keyOf(b)] || '#1F4E8C';
  const label = more?.querySelector('[data-more-label]');
  const icon = more?.querySelector('[data-more-icon]');
  const vbar = more?.querySelector('[data-more-v]');
  // filtro Sabor: se despliega desde Etapa (y se recoge) para que se lea como parte de Adultos
  let saborOn = false, saborAnim = null;
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const toggleSabor = on => {
    if (!saborBox || on === saborOn) return;
    saborOn = on;
    saborAnim?.cancel();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (on) {
      saborBox.style.display = 'flex';
      if (saborSep) saborSep.style.display = '';
      if (still) return;
      saborAnim = saborBox.animate([
        { opacity: 0, transform: 'translateX(-18px)', clipPath: 'inset(0 100% 0 0)' },
        { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }
      ], { duration: 560, easing: EASE });
      // opciones en cascada
      saborBox.querySelectorAll('[data-shop-filter], [data-shop-select]').forEach((b, i) => b.animate(
        [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: 120 + i * 55, easing: EASE, fill: 'backwards' }));
      saborSep?.animate([{ opacity: 0, transform: 'scaleY(0)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: EASE });
    } else {
      const done = () => { if (!saborOn) { saborBox.style.display = 'none'; if (saborSep) saborSep.style.display = 'none'; } };
      if (still) return done();
      saborAnim = saborBox.animate([
        { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' },
        { opacity: 0, transform: 'translateX(-12px)', clipPath: 'inset(0 100% 0 0)' }
      ], { duration: 260, easing: 'cubic-bezier(.4,0,1,1)' });
      saborAnim.onfinish = done;
    }
  };
  const paint = () => {
    { const n = cols(); LIMIT = innerWidth <= 700 ? 4 : (n ? n * 2 : BASE); }
    // filtra y muestra los primeros LIMIT; "Ver más productos" revela el resto
    if (state.stage !== 'adultos') state.sabor = 'todos';
    toggleSabor(state.stage === 'adultos');
    const filtered = state.stage !== 'todos' || state.format !== 'todos' || state.sabor !== 'todos';
    let match = 0, shown = 0;
    cards.forEach(c => {
      const ok = (state.stage === 'todos' || c.dataset.stage === state.stage) && (state.format === 'todos' || c.dataset.format === state.format)
        && (state.sabor === 'todos' || c.dataset.sabor === state.sabor);
      // con un filtro activo se muestran todos los resultados (sin límite ni "Ver más")
      const vis = ok && (state.all || filtered || match < LIMIT);
      if (ok) match++;
      c.style.display = vis ? 'flex' : 'none'; // '' borraría el display:flex inline de la tarjeta
      if (vis) shown++;
    });
    // con todo desplegado el botón pasa a "Ver menos"; se oculta si no hay nada que plegar
    if (more) {
      more.style.display = !filtered && match > LIMIT ? 'inline-flex' : 'none'; // '' borraría el inline-flex del estilo
      if (label) label.textContent = state.all ? 'Ver menos' : 'Ver más productos'; else more.textContent = state.all ? 'Ver menos' : 'Ver más productos';
      if (vbar) vbar.style.display = state.all ? 'none' : ''; // + / −
    }
    btns.forEach(b => {
      const [k, v] = b.dataset.shopFilter.split(':');
      const act = state[k] === v;
      const hov = !act && b.matches(':hover');
      b.style.background = act ? solidOf(b) : (hov ? hoverTint(b) : '#fff');
      b.style.color = act ? '#fff' : (hov ? hoverInk(b) : '#00326E');
      b.setAttribute('aria-pressed', act ? 'true' : 'false');
    });
    if (count) count.textContent = `Mostrando ${shown} de ${match} productos`;
    // mobile: los <select> reflejan el filtro activo y se pintan con su color
    shop.querySelectorAll('[data-shop-select]').forEach(sel => {
      const k = sel.dataset.shopSelect, v = state[k] || 'todos';
      sel.value = v;
      const act = shop.querySelector(`[data-shop-filter="${k}:${v}"]`);
      const isOn = v !== 'todos' && act;
      const ink = isOn ? '#fff' : '#00326E';
      // una sola capa: color + chevron (antes se acumulaban dos)
      const chev = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(ink)}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;
      sel.style.background = `${isOn ? solidOf(act) : '#F2F6FA'} ${chev} no-repeat right 20px center`;
      sel.style.color = ink;
    });
  };
  // botones "Ver productos" de otras secciones ([data-shop-go]="stage:x" | "format:x"): el scroll lo hace la transición
  // de anclas (#elige); aquí solo se fija el filtro (la otra dimensión vuelve a "Todos")
  on(document, 'click', e => {
    const g = e.target.closest?.('[data-shop-go]');
    if (!g) return;
    // "stage:adultos|sabor:x": lo que no venga vuelve a "Todos"
    const set = Object.fromEntries(g.dataset.shopGo.split('|').map(p => p.split(':')));
    state.stage = set.stage || 'todos';
    state.format = set.format || 'todos';
    state.sabor = set.sabor || 'todos';
    state.all = false;
    paint();
  });
  shop.querySelectorAll('[data-shop-select]').forEach(sel => on(sel, 'change', () => {
    shop.querySelector(`[data-shop-filter="${sel.dataset.shopSelect}:${sel.value}"]`)?.click();
  }));
  btns.forEach(b => on(b, 'click', () => {
    const [k, v] = b.dataset.shopFilter.split(':');
    state[k] = v;
    paint();
    if (reduce) return;
    cards.filter(c => c.style.display !== 'none').forEach((c, i) =>
      c.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: i * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  }));
  paint();
  { let rt = 0; const onR = () => { clearTimeout(rt); rt = setTimeout(() => { const n = cols(); const want = innerWidth <= 700 ? 4 : n * 2; if (n && want !== LIMIT) paint(); }, 150); }; on(window, 'resize', onR); }
  btns.forEach(b => {
    on(b, 'pointerenter', () => { if (b.getAttribute('aria-pressed') !== 'true') { b.style.background = hoverTint(b); b.style.color = hoverInk(b); } });
    on(b, 'pointerleave', () => { if (b.getAttribute('aria-pressed') !== 'true') { b.style.background = '#fff'; b.style.color = '#00326E'; } });
  });
  // "+" que salta al lado del texto en hover
  if (more && icon) {
    on(more, 'pointerenter', () => {
      if (reduce) { Object.assign(icon.style, { width: '18px', marginLeft: '10px', opacity: 1 }); return; }
      icon.getAnimations().forEach(a => a.cancel());
      icon.animate([
        { width: '0px', marginLeft: '0px', opacity: 0, transform: 'scale(.3) rotate(-90deg)' },
        { width: '18px', marginLeft: '10px', opacity: 1, transform: 'scale(1.25) rotate(8deg)', offset: 0.6 },
        { width: '18px', marginLeft: '10px', opacity: 1, transform: 'scale(1) rotate(0deg)' }
      ], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' });
    });
    on(more, 'pointerleave', () => {
      if (reduce) { Object.assign(icon.style, { width: '0px', marginLeft: '0px', opacity: 0 }); return; }
      icon.getAnimations().forEach(a => a.cancel());
      icon.animate([
        { width: '18px', marginLeft: '10px', opacity: 1, transform: 'scale(1)' },
        { width: '0px', marginLeft: '0px', opacity: 0, transform: 'scale(.3) rotate(-90deg)' }
      ], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    });
  }
  if (more) on(more, 'click', e => {
    e.preventDefault();
    if (state.all) {
      // plegar: el botón se queda bajo el cursor, así la vista cae justo en el final de la tienda
      const before = more.getBoundingClientRect().top;
      state.all = false; paint();
      const y = scrollY + more.getBoundingClientRect().top - before;
      if (smooth?.jump) smooth.jump(y); else window.scrollTo({ top: y, behavior: 'auto' });
      // los últimos productos entran suavemente para que se note el cambio
      if (!reduce) cards.filter(c => c.style.display !== 'none').slice(-4).forEach((c, i) =>
        c.animate([{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, delay: i * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
      return;
    }
    const before = new Set(cards.filter(c => c.style.display !== 'none'));
    state.all = true; paint();
    if (reduce) return;
    cards.filter(c => c.style.display !== 'none' && !before.has(c)).forEach((c, i) =>
      c.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: i * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  });

  // hover: el fondo intensifica su color + glow suave detrás del producto (Motion, resorte)
  const motion = reduce ? Promise.resolve(null) : import('https://cdn.jsdelivr.net/npm/motion@11.11.17/+esm').catch(() => null);
  cards.forEach(card => {
    const panel = card.querySelector('[data-card-media]');
    const fill = card.querySelector('[data-card-fill]');
    const glow = card.querySelector('[data-card-glow]');
    const img = card.querySelector('[data-card-img]');
    if (!panel || !fill) return;
    const glowTo = async on => {
      if (!glow) return;
      const M = await motion;
      const g = { opacity: on ? 1 : 0, transform: `scale(${on ? 1 : 0.4})` }; // crece desde el centro
      const halo = on ? 'drop-shadow(0 6px 6px rgba(0,30,70,0.14)) drop-shadow(0 0 16px rgba(255,255,255,0.4))' : 'drop-shadow(0 6px 6px rgba(0,30,70,0.14)) drop-shadow(0 0 0px rgba(255,255,255,0))';
      if (M?.animate) {
        M.animate(glow, g, on ? { type: 'spring', stiffness: 160, damping: 20, mass: 0.9 } : { duration: 0.5, ease: [0.4, 0, 0.2, 1] });
        if (img) M.animate(img, { filter: halo }, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
      } else {
        Object.assign(glow.style, g, { transition: 'opacity .4s, transform .5s cubic-bezier(.22,1,.36,1)' });
        if (img) Object.assign(img.style, { filter: halo, transition: 'filter .45s' });
      }
    };
    // la opacidad actual se lee ANTES de cancelar la animación previa (si no, salta al valor base y se apaga de golpe)
    const fadeTo = (to, ms) => {
      const from = getComputedStyle(fill).opacity;
      fill.getAnimations().forEach(x => x.cancel());
      fill.animate([{ opacity: from }, { opacity: to }], { duration: reduce ? 0 : ms, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    };
    on(card, 'pointerenter', () => {
      fadeTo(1, 450);
      glowTo(true);
    });
    on(card, 'pointerleave', () => {
      fadeTo(0, 520);
      glowTo(false);
    });
  });

  // botón Comprar: al hover se encoge apenas y vuelve a su tamaño (sutil)
  shop.querySelectorAll('[data-buy-pop]').forEach(btn => on(btn, 'pointerenter', () => {
    if (reduce) return;
    btn.getAnimations().forEach(a => { if (a.id === 'buy-pop') a.cancel(); });
    const a = btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.965)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(.33,1,.68,1)' });
    a.id = 'buy-pop';
  }));

  return () => offs.forEach(f => f());
}
