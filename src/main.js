// Punto de entrada del comportamiento de la landing.
// La vista (Ricocat Landing.dc.html) solo marca elementos con data-*; aquí se orquesta todo.

import { computeLayout, BLOCKS } from './config/layout.js';
import { applyLayout } from './lib/stage.js';
import { createParallax } from './lib/parallax.js';
import { playIntro } from './lib/intro.js';
import { createPreloader } from './lib/preloader.js';
import { startAmbient } from './lib/ambient.js';
import { waitForImages } from './lib/images.js';
import { createCtas } from './lib/cta.js';
import { createFishSwim } from './lib/fish.js';
import { createSmoothScroll } from './lib/smooth-scroll.js';
import { loadLinks } from './lib/store-links.js';
import { createReveal } from './lib/reveal.js';
import { createScrollParallax } from './lib/scroll-parallax.js';
import { createBowlScene } from './lib/bowl3d.js';
import { createCurtain } from './lib/curtain.js';
import { createFlavors } from './lib/flavors.js';
import { createShop } from './lib/shop.js';
import { createDrawer } from './lib/drawer.js';
import { createAdopt } from './lib/adopt.js';

export function mountLanding(root, { reduce = false, options = {} } = {}) {
  const hero = root.querySelector('[data-hero]');
  const content = root.querySelector('[data-hero-content]');
  const parallax = reduce ? null : createParallax(hero, { strength: options.parallax ?? 14 });
  let ambient = null;
  let layout = null;
  let last = { w: 0, h: 0 };
  let destroyed = false;

  const update = (force = false) => {
    const vw = root.clientWidth;
    const vh = hero.clientHeight;
    if (!force && vw === last.w && vh === last.h) return;
    last = { w: vw, h: vh };
    layout = computeLayout(vw, vh);
    applyLayout(root, layout);
    // En mobile cada ingrediente se reubica con data-mx / data-my (unidades del cluster)
    parallax?.setBase(el => (layout.mobile && el.dataset.mx)
      ? { x: parseFloat(el.dataset.mx), y: parseFloat(el.dataset.my) || 0 }
      : null);
  };

  const ro = new ResizeObserver(() => update());
  ro.observe(root);
  ro.observe(hero);
  update(true);

  function setOptions(o = {}) {
    options = { ...options, ...o };
    root.style.setProperty('--glow', String(options.glow ?? 0.8));
    parallax?.setStrength(options.parallax ?? 14);
    ambient?.setEnabled(options.float !== false);
  }
  setOptions();

  const heroLogo = () => hero.querySelector('[data-intro="logo"] img');
  // el preloader se ve una sola vez por sesión; en visitas siguientes la página entra directo con la intro del hero
  const SEEN_KEY = 'ricocat-preloader-seen';
  let seen = false; try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}
  const pre = createPreloader({ reduce: reduce || seen, target: heroLogo });
  // pantalla blanca de arranque (evita el flash celeste antes del preloader); el preloader ya la cubre
  document.querySelectorAll('[data-boot-cover]').forEach(el => el.remove());
  { // progreso real: imágenes del hero cargadas
    const imgs = [...content.querySelectorAll('img')];
    const upd = () => pre.setProgress(imgs.length ? imgs.filter(i => i.complete).length / imgs.length * 0.95 : 0.95);
    imgs.forEach(i => { if (!i.complete) i.addEventListener('load', upd, { once: true }); i.addEventListener('error', upd, { once: true }); });
    upd();
  }
  // tope: si las imágenes tardan demasiado, el preloader no se queda pegado
  // también espera lo esencial del plato (entrada + muestra de cada escena); tope de 8 s
  const bowlReady = () => window.__ricocatBowlReady || Promise.resolve();
  const imagesOrTimeout = seen
    ? Promise.race([waitForImages(content), new Promise(r => setTimeout(r, 1200))]) // repetida: no espera el plato
    : Promise.race([Promise.all([waitForImages(content), new Promise(r => setTimeout(r, 0)).then(bowlReady)]), new Promise(r => setTimeout(r, 8000))]);
  // relevo: el logo del hero se oculta mientras el del preloader termina de llegar encima
  const handoff = p => {
    const lg = heroLogo(); if (lg) lg.style.opacity = '0';
    let gone = false;
    const end = () => { if (gone) return; gone = true; if (lg) lg.style.opacity = ''; p.remove(); };
    (p.done || Promise.resolve()).then(end);
    setTimeout(end, 1500); // tope: nunca queda un preloader encima
  };
  // red de seguridad: si la intro no terminó (pestaña oculta, etc.), se completa al volver a la pestaña
  const intro = () => {
    let anims = [];
    try { anims = playIntro(hero, { x: BLOCKS.clusterCenterX, y: BLOCKS.clusterCenterY }, { afterPreloader: !seen }) || []; } catch (e) { console.error(e); }
    const check = () => { if (document.hidden) return; if (anims.some(a => a.playState !== 'finished')) setTimeout(() => { if (!document.hidden) anims.forEach(a => { try { a.finish(); } catch (e) {} }); }, 3500); document.removeEventListener('visibilitychange', check); };
    if (document.hidden) document.addEventListener('visibilitychange', check); else check();
  };
  imagesOrTimeout.then(() => pre.finish()).catch(() => {}).then(() => {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
    content.style.visibility = '';
    if (destroyed) { pre.remove(); return; }
    handoff(pre);
    if (reduce) return;
    intro();
    ambient = startAmbient(root, { enabled: options.float !== false });
  });

  const stopCtas = createCtas(root);
  const stopFish = [
    createFishSwim(root, { scene: '[data-fish-scene="desktop"]', reduce }),
    // mobile: tamaño fijo en px (~26px de largo) sin importar el ancho del arco
    createFishSwim(root, { scene: '[data-fish-scene="mobile"]', pxSize: 26, reduce })
  ];
  const smooth = reduce ? null : createSmoothScroll();
  loadLinks(); // precarga los links de compra
  const stopCurtain = createCurtain({ smooth, reduce });
  const stopReveal = createReveal(root, { reduce });
  const stopScrollParallax = createScrollParallax(root, { reduce });
  const stopBowl = createBowlScene(root, { reduce, smooth });
  const stopFlavors = createFlavors(root, { reduce, smooth });
  const stopShop = createShop(root, { reduce, smooth });
  const stopDrawer = createDrawer(root, { reduce });
  const stopAdopt = createAdopt(root, { reduce });

  // vista previa del preloader (tweak): repetir la secuencia completa o dejar el logo pintándose en bucle
  let previewBusy = false, holdPre = null;
  const replayPreloader = async () => {
    if (previewBusy || reduce) return;
    previewBusy = true;
    scrollTo(0, 0);
    document.querySelectorAll('[data-preloader]').forEach(el => el.remove());
    const p = createPreloader({ minMs: 2200, target: heroLogo });
    p.setProgress(1);
    content.style.visibility = 'hidden';
    try { await p.finish(); } catch (e) {}
    content.style.visibility = '';
    handoff(p);
    intro();
    previewBusy = false;
  };
  const setPreloaderHold = on => {
    if (reduce || !on === !holdPre) return;
    if (!on) { holdPre.stop(); holdPre = null; return; }
    let alive = true, cur = null;
    const loop = () => {
      if (!alive) return;
      cur?.remove();
      content.style.visibility = '';
      cur = createPreloader({ minMs: 2600, target: heroLogo });
      cur.setProgress(1);
      setTimeout(loop, 3000);
    };
    loop();
    holdPre = { stop() { alive = false; cur?.remove(); } };
  };

  return {
    setOptions,
    replayPreloader,
    setPreloaderHold,
    destroy() {
      holdPre?.stop();
      destroyed = true;
      ro.disconnect();
      parallax?.destroy();
      ambient?.destroy();
      stopCtas();
      stopFish.forEach(stop => stop());
      smooth?.destroy();
      stopReveal();
      stopCurtain();
      stopScrollParallax();
      stopBowl();
      stopFlavors();
      stopShop();
      stopDrawer();
      stopAdopt();
    }
  };
}
