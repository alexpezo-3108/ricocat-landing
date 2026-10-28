// Links de compra: se leen SOLO de data/ricocat-links-v3.json (actualizar ese archivo, no el código).
// Relaciona productos por id o por nombre exacto (sin distinguir mayúsculas/tildes/guiones).
const URL_DATA = new URL('../../data/ricocat-links-v3.json', import.meta.url).href;
let cache = null;

export const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim().toUpperCase();

export function loadLinks() {
  if (!cache) cache = fetch(URL_DATA, { cache: 'no-cache' }).then(r => r.json()).then(d => {
    const tiendas = new Map((d.tiendas || []).map(t => [t.nombre, t]));
    const byId = new Map(), byName = new Map();
    (d.productos || []).forEach(p => { byId.set(p.id, p); byName.set(norm(p.nombre), p); });
    return { tiendas, find: (id, nombre) => (id && byId.get(id)) || byName.get(norm(nombre)) || null };
  }).catch(e => { console.warn('ricocat-links-v3.json no disponible', e); cache = null; return null; });
  return cache;
}

// distribuidores válidos (todos llevan a la página del producto), agrupados por tipo de tienda en orden fijo.
// Se ignora "revisar" (control interno). Grupos vacíos no se muestran.
const GROUPS = [['Supermercado', 'Supermercados'], ['Pet shop', 'Pet shops'], ['Otras tiendas', 'Otras tiendas'], ['Delivery', 'Delivery']];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function groupStores(data, producto) {
  const valid = (producto?.distribuidores || []).filter(d => d && typeof d.url === 'string' && /^https?:\/\//.test(d.url.trim()));
  // orden aleatorio dentro de cada grupo en cada apertura (ninguna tienda queda siempre primera)
  return GROUPS.map(([tipo, label]) => ({ label, items: shuffle(valid.filter(d => (data.tiendas.get(d.tienda)?.tipo || 'Otras tiendas') === tipo)) }))
    .filter(g => g.items.length);
}
