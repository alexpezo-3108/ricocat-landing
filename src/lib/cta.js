// Hover de botones [data-cta]: salto de escala sutil (el aclarado del fondo va en style-hover).

const HOP = [
  { transform: 'translate(0, 0)' },
  { transform: 'translate(4px, -6px)', offset: 0.35 },
  { transform: 'translate(-1px, 1px)', offset: 0.7 },
  { transform: 'translate(0, 0)' }
];

export function createCtas(root) {
  const offs = [];
  root.querySelectorAll('[data-cta]').forEach(cta => {
    const fills = [cta, ...cta.querySelectorAll('[data-cta-fill]')].filter(el => el.dataset.ctaFill);
    fills.forEach(el => { el.dataset.baseColor = el.style.color; });
    const arrow = cta.querySelector('[data-cta-arrow]');
    const enter = () => {
      fills.forEach(el => { el.style.backgroundSize = '100% 100%'; el.style.color = el.dataset.ctaFill; });
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cta.getAnimations().forEach(x => { if (x.id === 'cta-pop') x.cancel(); });
        const p = cta.animate([{ scale: '1' }, { scale: '0.965', offset: 0.4 }, { scale: '1' }], { duration: 420, easing: 'cubic-bezier(.33,1,.68,1)' });
        p.id = 'cta-pop';
      }
    };
    const leave = () => {
      fills.forEach(el => { el.style.backgroundSize = '0% 100%'; el.style.color = el.dataset.baseColor; });
    };
    cta.addEventListener('pointerenter', enter);
    cta.addEventListener('pointerleave', leave);
    cta.addEventListener('focus', enter);
    cta.addEventListener('blur', leave);
    offs.push(() => {
      cta.removeEventListener('pointerenter', enter);
      cta.removeEventListener('pointerleave', leave);
      cta.removeEventListener('focus', enter);
      cta.removeEventListener('blur', leave);
    });
  });
  return () => offs.forEach(f => f());
}
