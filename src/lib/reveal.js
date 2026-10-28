// Revelado al entrar en viewport ([data-reveal]="up|left|right|line|pop", data-delay en ms).
const KF = {
  up: [{ opacity: 0, transform: 'translateY(48px)' }, { opacity: 1, transform: 'none' }],
  left: [{ opacity: 0, transform: 'translateX(-80px)' }, { opacity: 1, transform: 'none' }],
  right: [{ opacity: 0, transform: 'translateX(80px)' }, { opacity: 1, transform: 'none' }],
  line: [{ transform: 'translateY(110%)' }, { transform: 'none' }],
  pop: [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }],
  hop: [
    { opacity: 0, transform: 'scale(.85)' },
    { opacity: 1, transform: 'scale(1)', offset: 0.3 },
    { opacity: 1, transform: 'scale(1.18)', offset: 0.55 },
    { opacity: 1, transform: 'scale(.96)', offset: 0.78 },
    { opacity: 1, transform: 'scale(1)' }
  ]
};

export function createReveal(root, { reduce = false, threshold = 0.08 } = {}) {
  const els = [...root.querySelectorAll('[data-reveal]')];
  if (reduce || !('IntersectionObserver' in window)) return () => {};

  const anims = new Map();
  for (const el of els) {
    const kind = el.dataset.reveal;
    const a = el.animate(KF[kind] || KF.up, {
      duration: kind === 'line' ? 1000 : kind === 'hop' ? 850 : 1200,
      delay: parseFloat(el.dataset.delay) || 0,
      easing: kind === 'pop' ? 'cubic-bezier(.34,1.56,.64,1)' : kind === 'hop' ? 'cubic-bezier(.45,0,.25,1)' : 'cubic-bezier(.16,1,.3,1)',
      fill: 'both'
    });
    a.pause();
    anims.set(el, a);
  }

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      anims.get(e.target)?.play();
      io.unobserve(e.target);
    }
  }, { threshold, rootMargin: '0px 0px -8% 0px' });
  // los elementos dentro de [data-reveal-group] se disparan juntos cuando entra el grupo
  const groups = [...root.querySelectorAll('[data-reveal-group]')];
  const grouped = new Set(groups.flatMap(g => [...g.querySelectorAll('[data-reveal]')]));
  els.filter(el => !grouped.has(el)).forEach(el => io.observe(el));

  const gio = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      (owner.get(e.target) || [e.target]).forEach(g => g.querySelectorAll('[data-reveal]').forEach(k => anims.get(k)?.play()));
      gio.unobserve(e.target);
    }
  }, { threshold, rootMargin: '0px 0px -8% 0px' });
  // grupos dentro de capas fijas (cortina): se observa la sección, no el elemento fijo
  const targetOf = g => (g.closest('[data-elige-inner], [data-fl-frame]') && g.closest('section')) || g;
  const owner = new Map();
  groups.forEach(g => { const t = targetOf(g); owner.set(t, [...(owner.get(t) || []), g]); gio.observe(t); });

  return () => { io.disconnect(); gio.disconnect(); };
}
