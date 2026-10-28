// Parallax ligado al scroll: cada [data-scroll-speed] se desplaza en Y según la distancia
// de su contenedor al centro del viewport (positivo = más lento, negativo = más rápido).

export function createScrollParallax(root, { reduce = false } = {}) {
  const els = [...root.querySelectorAll('[data-scroll-speed]')];
  if (reduce || !els.length) return () => {};
  let raf = 0;

  const update = () => {
    raf = 0;
    const mid = innerHeight / 2;
    for (const el of els) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      const d = r.top + r.height / 2 - mid;
      const speed = parseFloat(el.dataset.scrollSpeed) || 0;
      el.style.transform = `translate3d(0, ${(d * speed).toFixed(1)}px, 0)`;
    }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
  return () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    cancelAnimationFrame(raf);
  };
}
