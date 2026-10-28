// Movimiento ambiental continuo: flotación de ingredientes ([data-float]="amplitud px",
// data-float-rot="grados") y línea punteada en movimiento ([data-dash]).

export function startAmbient(root, { enabled = true } = {}) {
  const anims = [];

  root.querySelectorAll('[data-float]').forEach(el => {
    const a = parseFloat(el.dataset.float) || 6;
    const r = parseFloat(el.dataset.floatRot) || 0;
    const duration = 2600 + Math.random() * 2400;
    anims.push(el.animate(
      [
        { transform: `translate3d(0, ${-a}px, 0) rotate(${-r}deg)` },
        { transform: `translate3d(0, ${a}px, 0) rotate(${r}deg)` }
      ],
      { duration, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: -Math.random() * duration }
    ));
  });

  root.querySelectorAll('[data-dash]').forEach(el => {
    anims.push(el.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -48 }],
      { duration: 2400, iterations: Infinity }
    ));
  });

  const setEnabled = on => anims.forEach(a => (on ? a.play() : a.pause()));
  setEnabled(enabled);

  return {
    setEnabled,
    destroy() { anims.forEach(a => a.cancel()); }
  };
}
