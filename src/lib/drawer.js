// Panel lateral de producto ([data-drawer]): al hacer clic en una tarjeta ([data-card]) se
// abre desde la derecha con la imagen, etiquetas, nombre, presentaciones y tiendas.
import { loadLinks, groupStores } from './store-links.js';
const E_OUT = 'cubic-bezier(.22,1,.36,1)', E_IN = 'cubic-bezier(.5,0,.75,0)';
// tiendas con logo de texto (el estilo que ya tenía el panel); el resto, círculo con inicial
const TEXT_LOGOS = new Set(['Metro', 'Tottus', 'Plaza Vea', 'Wong', 'Vivanda']);
const h = (tag, style, text) => { const e = document.createElement(tag); if (style) e.style.cssText = style; if (text != null) e.textContent = text; return e; };
const logoEl = name => TEXT_LOGOS.has(name)
  ? h('span', "flex:none; display:flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:12px; background:#F2F6FA; font-family:'Barlow Condensed', sans-serif; font-weight:700; font-size:13px; line-height:1; text-align:center; text-transform:uppercase; letter-spacing:0.02em; color:#00326E;", name)
  : h('span', "flex:none; display:flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:50%; background:#E5FBFD; font-family:'Barlow Condensed', sans-serif; font-weight:700; font-size:22px; line-height:1; color:#00326E;", name.charAt(0).toUpperCase());

export function createDrawer(root, { reduce = false } = {}) {
  const dw = root.querySelector('[data-drawer]');
  if (!dw) return () => {};
  const $ = s => dw.querySelector(s);
  const panel = $('[data-dw-panel]'), overlay = $('[data-dw-overlay]'), close = $('[data-dw-close]');
  const img = $('[data-dw-img]'), media = $('[data-dw-media]'), tags = $('[data-dw-tags]');
  const title = $('[data-dw-title]'), sizes = $('[data-dw-sizes]');
  const storesBox = $('[data-dw-stores]');
  let stores = [...dw.querySelectorAll('[data-dw-store]')];
  let renderId = 0;
  const offs = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
  let open = false, lastFocus = null, prevOverflow = '';

  const fill = card => {
    const slot = card.querySelector('image-slot');
    const src = slot?.getAttribute('src') || slot?.src || card.querySelector('[data-card-img] img')?.src || '';
    img.src = src; img.style.visibility = src ? '' : 'hidden';
    const h3 = card.querySelector('h3');
    title.textContent = h3?.textContent.trim() || '';
    img.alt = title.textContent;
    sizes.textContent = card.querySelector('h3 + p')?.textContent.trim() || '';
    media.style.background = getComputedStyle(card.querySelector('[data-card-media]')).backgroundColor;
    const chips = [...card.querySelectorAll('span')].filter(sp => sp.style.borderRadius === '999px');
    tags.replaceChildren(...chips.map(c => c.cloneNode(true)));
    renderStores(card.dataset.productId, title.textContent);
  };

  const renderStores = async (id, nombre) => {
    const my = ++renderId;
    storesBox.replaceChildren(); stores = [];
    const data = await loadLinks();
    if (my !== renderId || !data) return;
    const prod = data.find(id, nombre);
    const groups = prod ? groupStores(data, prod) : [];
    const out = [];
    groups.forEach(g => {
      out.push(h('p', "margin:10px 0 0; font-family:'Barlow', sans-serif; font-weight:600; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#6F8BA3;", g.label));
      g.items.forEach(d => {
        const row = h('div', 'display:flex; align-items:center; gap:16px; min-height:68px; padding:10px 12px 10px 14px; box-sizing:border-box; border-radius:16px; background:#fff; box-shadow:inset 0 0 0 1px #D5E9F0;');
        row.setAttribute('data-dw-store', '1');
        const txt = h('span', 'flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;');
        txt.append(h('span', "font-family:'Barlow', sans-serif; font-weight:600; font-size:17px; color:#00326E;", d.tienda));
        const a = h('a', "flex:none; display:inline-flex; align-items:center; justify-content:center; height:40px; padding:0 18px; border-radius:999px; background:#00326E; color:#fff; text-decoration:none; font-family:'Barlow Condensed', sans-serif; font-weight:600; font-size:16px; letter-spacing:0.02em; text-transform:uppercase; white-space:nowrap; transition:background .25s, transform .25s;", 'Ir a tienda');
        a.href = d.url.trim(); a.target = '_blank'; a.rel = 'noopener';
        a.dataset.producto = prod.id; a.dataset.tienda = d.tienda;
        a.addEventListener('mouseenter', () => { a.style.background = '#1A4F8A'; a.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)' }); });
        a.addEventListener('mouseleave', () => { a.style.background = '#00326E'; });
        row.append(logoEl(d.tienda), txt, a);
        out.push(row); stores.push(row);
      });
    });
    if (!out.length) out.push(h('p', "margin:0; font-family:'Barlow', sans-serif; font-weight:500; font-size:15px; color:#4A6B86;", 'Muy pronto disponible en tiendas.'));
    storesBox.replaceChildren(...out);
    // más de 6 tiendas: scroll interno en la lista (el resto del panel queda fijo)
    const many = stores.length > 6;
    Object.assign(storesBox.style, many
      ? { maxHeight: '488px', overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: '6px', marginRight: '-6px', scrollbarWidth: 'thin', scrollbarColor: '#C9DCE6 transparent' }
      : { maxHeight: '', overflowY: '', overscrollBehavior: '', paddingRight: '', marginRight: '', scrollbarWidth: '', scrollbarColor: '' });
    storesBox.scrollTop = 0;
    if (open && !reduce) out.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 120 + i * 40, easing: E_OUT, fill: 'both' }));
  };

  const show = () => {
    open = true;
    dw.style.visibility = 'visible'; dw.style.pointerEvents = 'auto';
    dw.setAttribute('aria-hidden', 'false');
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.scrollTop = 0;
    const d = reduce ? 0 : 1;
    overlay.getAnimations().forEach(a => a.cancel()); panel.getAnimations().forEach(a => a.cancel());
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380 * d, easing: 'ease-out', fill: 'forwards' });
    panel.animate([{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: 620 * d, easing: E_OUT, fill: 'forwards' });
    [img, tags, title, sizes].forEach((el, i) => el.animate(
      [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }],
      { duration: 520 * d, delay: (140 + i * 45) * d, easing: E_OUT, fill: 'both' }));
    setTimeout(() => close.focus({ preventScroll: true }), 50);
  };
  const hide = () => {
    if (!open) return;
    open = false;
    dw.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = prevOverflow;
    const d = reduce ? 0 : 1;
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 * d, easing: 'ease-in', fill: 'forwards' });
    const a = panel.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: 380 * d, easing: E_IN, fill: 'forwards' });
    a.finished.then(() => { if (!open) { dw.style.visibility = 'hidden'; dw.style.pointerEvents = 'none'; } }).catch(() => {});
    lastFocus?.focus?.({ preventScroll: true });
  };

  root.querySelectorAll('[data-card]').forEach(card => {
    card.style.cursor = 'pointer';
    on(card, 'click', e => {
      e.preventDefault(); e.stopPropagation();
      lastFocus = card.querySelector('a') || card;
      fill(card); show();
    }, true);
  });
  on(overlay, 'click', hide);
  on(close, 'click', hide);
  on(document, 'keydown', e => { if (open && e.key === 'Escape') hide(); });
  on(panel, 'wheel', e => e.stopPropagation(), { passive: true });

  return () => { offs.forEach(f => f()); if (open) document.body.style.overflow = prevOverflow; };
}
