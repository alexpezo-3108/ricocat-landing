// Animación de entrada del hero (Web Animations API).
// Targets: [data-intro="header|stripe|glow|logo|product|food|line|fade"].

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const EASE_BACK = 'cubic-bezier(.34,1.45,.64,1)';

export function playIntro(scope, center = { x: 615, y: 640 }, { afterPreloader = false } = {}) {
  // tras el preloader el logo ya está en su sitio: no se anima; franjas más lentas y productos después
  const P = afterPreloader ? 1 : 0;
  const all = name => [...scope.querySelectorAll(`[data-intro="${name}"]`)];
  const made = [];
  // si se repite la secuencia, se cancelan las animaciones anteriores para que no se pisen
  scope.querySelectorAll('[data-intro]').forEach(el => el.getAnimations().forEach(a => a.cancel()));
  const run = (el, keyframes, opts) => { const a = el.animate(keyframes, { fill: 'backwards', easing: EASE_OUT, ...opts }); made.push(a); return a; };
  const idx = el => parseFloat(el.dataset.i) || 0;
  // tras el preloader todo cae en una grilla de pulsos de 150 ms (ritmo constante)
  const B = 150;

  all('header').forEach(el => run(el,
    [{ opacity: 0, transform: 'translateY(-24px)' }, { opacity: 1, transform: 'none' }],
    { duration: P ? 700 : 900, delay: P ? 2 * B : 150 }));

  // escala inicial para que la franja arranque exactamente en el borde visible (nada pintado al empezar)
  const edgeScale = el => {
    const r = el.getBoundingClientRect(), fromRight = getComputedStyle(el).transformOrigin.startsWith(String(el.offsetWidth));
    const hidden = fromRight ? r.right - innerWidth : -r.left;
    return Math.max(0, Math.min(1, hidden / r.width - 0.003));
  };
  all('stripe').forEach(el => run(el,
    [{ transform: `scaleX(${P && idx(el) > 0 ? edgeScale(el) : 0})` }, { transform: 'scaleX(1)' }], // franjas largas: arrancan justo en el borde de la pantalla
    { duration: P ? [900, 1000, 1100][idx(el)] ?? 1100 : 1300, delay: P ? idx(el) * B : idx(el) * 120, /* tras el preloader: lados → medio → abajo, encadenadas */ easing: P ? 'cubic-bezier(.33,0,.15,1)' : EASE_OUT }));

  all('glow').forEach(el => run(el,
    [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }],
    { duration: P ? 1200 : 1800, delay: P ? 7 * B : 300 })); // la luz aparece después de los productos

  if (!P) all('logo').forEach(el => run(el,
    [{ opacity: 0, transform: 'translateY(40px) scale(.82)' }, { opacity: 1, transform: 'none' }],
    { duration: 1100, delay: 250, easing: EASE_BACK }));

  all('product').forEach(el => run(el,
    // tras el preloader: entran deslizando desde abajo con peso (pasan 14px y asientan), sin fundido
    P ? [{ transform: 'translateY(75vh)' }, { transform: 'translateY(-14px)', offset: 0.72 }, { transform: 'none' }]
      : [{ opacity: 0, transform: 'translateY(180px) scale(.94)' }, { opacity: 1, transform: 'none' }],
    { duration: P ? 1450 : 1400, delay: (P ? 3 * B : 450) + (parseFloat(el.dataset.order) || 0) * (P ? B : 130), easing: P ? 'cubic-bezier(.3,.9,.3,1)' : EASE_OUT } /* tras las franjas */));

  // Ingredientes: "explotan" desde el centro del grupo de productos
  all('food').forEach((el, i) => {
    const layer = el.closest('[data-depth]');
    const cx = parseFloat(layer?.dataset.cx) || center.x;
    const cy = parseFloat(layer?.dataset.cy) || center.y;
    const dx = (center.x - cx) * 0.55;
    const dy = (center.y - cy) * 0.55;
    const r = (i % 2 ? 1 : -1) * 40;
    run(el, [
      { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.2) rotate(${r}deg)` },
      { opacity: 1, offset: 0.3 },
      { opacity: 1, transform: 'none' }
    ], { duration: P ? 1200 : 1500, delay: (P ? 6 * B : 1000) + i * (P ? 25 : 45) });
  });

  all('line').forEach(el => run(el,
    [{ transform: 'translateY(110%)' }, { transform: 'none' }],
    { duration: P ? 800 : 1000, delay: (P ? 4 * B : 950) + idx(el) * (P ? B / 2 : 130) }));

  all('fade').forEach(el => run(el,
    [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }],
    { duration: P ? 700 : 900, delay: (P ? 5 * B : 1250) + idx(el) * (P ? B / 2 : 100) }));
  return made;
}
