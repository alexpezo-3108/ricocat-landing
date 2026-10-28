// Vuelca el layout calculado en CSS custom properties del root.
// El template lee estas variables (con fallback desktop), sin re-renders de React.

export function applyLayout(root, L) {
  const set = (k, v) => root.style.setProperty(k, String(v));
  set('--u', L.u.toFixed(5));
  set('--st-top', `${L.top.toFixed(1)}px`);
  set('--st-w', L.width);
  for (const key of ['logo', 'copy', 'cluster']) {
    const p = key === 'cluster' ? 'cl' : key;
    set(`--${p}-x`, `${L[key].x.toFixed(1)}px`);
    set(`--${p}-y`, `${L[key].y.toFixed(1)}px`);
    set(`--${p}-s`, L[key].s.toFixed(4));
  }
  // franjas del medio/abajo: viven dentro del cluster; en desktop se compensa su escala para que no se muevan
  const c = L.cluster, comp = !L.mobile && c.s !== 1, sl = L.mobile ? 0 : (L.stripeLift || 0);
  set('--st1-y', `${(comp ? (379 - sl - c.y) / c.s : 379 - sl).toFixed(1)}px`);
  set('--st2-y', `${(comp ? (555 - sl - c.y) / c.s : 555 - sl).toFixed(1)}px`);
  set('--st-h', `${(comp ? 96 / c.s : 96).toFixed(2)}px`);
  set('--hl-gap', `${Math.round(L.highlightGap)}px`);
  set('--nav-d', L.compact ? 'none' : 'flex');
  set('--social-d', L.compact ? 'none' : 'flex');
  set('--menu-d', L.compact ? 'flex' : 'none');
  set('--fish-d', L.compact ? 'none' : 'block');
  set('--fish-m-d', L.compact ? 'block' : 'none');
  // en compact los peces van por encima de los íconos: se les deja una franja libre
  set('--hl-pad', L.compact ? 'calc(40px + 3vw)' : 'max(34px, calc((max(196px, 13vw) - (clamp(52px, 4vw, 76px) + 8px + 2.4 * clamp(16px, 1.25vw, 24px))) / 2))');
}
