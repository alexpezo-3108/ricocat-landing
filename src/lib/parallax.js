// Parallax por movimiento del mouse.
// Cada [data-depth] se desplaza en sentido opuesto al cursor, proporcional a su profundidad.
// data-rot añade una leve rotación. Interpolación suave con rAF que se detiene en reposo.

const clamp = v => Math.max(-1, Math.min(1, v));

export function createParallax(scope, { strength = 26, ease = 0.075 } = {}) {
  const layers = [...scope.querySelectorAll('[data-depth]')].map(el => ({
    el,
    depth: parseFloat(el.dataset.depth) || 0,
    rot: parseFloat(el.dataset.rot) || 0,
    bx: 0,
    by: 0
  }));
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  let raf = 0;

  const render = () => {
    cur.x += (target.x - cur.x) * ease;
    cur.y += (target.y - cur.y) * ease;
    for (const l of layers) {
      const x = l.bx - cur.x * l.depth * strength;
      const y = l.by - cur.y * l.depth * strength * 0.7;
      l.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(cur.x * l.rot).toFixed(2)}deg)`;
    }
    const moving = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.0005;
    raf = moving ? requestAnimationFrame(render) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(render); };

  const onMove = e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    target.x = clamp((e.clientX / innerWidth) * 2 - 1);
    target.y = clamp((e.clientY / innerHeight) * 2 - 1);
    kick();
  };
  const onLeave = () => { target.x = 0; target.y = 0; kick(); };

  addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave);

  return {
    // Desplazamiento base por capa (p. ej. acercar ingredientes en mobile)
    setBase(fn) {
      for (const l of layers) {
        const b = fn(l.el) || {};
        l.bx = b.x || 0;
        l.by = b.y || 0;
      }
      cancelAnimationFrame(raf);
      raf = 0;
      render();
    },
    setStrength(v) { strength = v; kick(); },
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    }
  };
}
