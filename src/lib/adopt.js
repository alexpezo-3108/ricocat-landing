// "Adopta un gato" ([data-adopt]): escena fijada con el scroll, sobre fondo blanco.
// 1) Al entrar, el gatito sube desde dentro de un corazón cian (la cabeza sobresale por arriba).
// 2) Fijada al centro, la composición crece; al llegar arriba entra el título y abajo la bajada + botón.
// 3) Ya grande, el corazón late suave y salen corazoncitos a los lados.
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const E = 'cubic-bezier(.22,1,.36,1)';
const S_MIN = 0.58; // escala inicial de la composición

export function createAdopt(root, { reduce = false } = {}) {
  const sec = root.querySelector('[data-adopt]');
  if (!sec) return () => {};
  const track = sec.querySelector('[data-adopt-track]');
  const comp = sec.querySelector('[data-adopt-comp]');
  const heart = sec.querySelector('[data-adopt-heart]');
  const cat = sec.querySelector('[data-adopt-cat]');
  const line = sec.querySelector('[data-adopt-line]');
  const fades = [...sec.querySelectorAll('[data-adopt-fade]')];
  // compañeros: gatitos en círculos de color alrededor (aparecen con el título y flotan)
  const pals = [...sec.querySelectorAll('[data-adopt-pal]')];
  let floats = [];
  const hearts = createHearts(sec.querySelector('[data-adopt-hearts]'), reduce);
  // botón: el corazón blanco da un saltito al hover
  const btn = sec.querySelector('[data-adopt-btn]'), icon = sec.querySelector('[data-adopt-heart-icon]');
  const hop = () => {
    if (reduce || !icon) return;
    icon.getAnimations().forEach(a => a.cancel());
    icon.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-7px) scale(1.18)', offset: 0.35 },
      { transform: 'translateY(0) scale(0.92)', offset: 0.65 },
      { transform: 'translateY(0) scale(1.06)', offset: 0.82 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 620, easing: 'cubic-bezier(.34,1.3,.64,1)' });
  };
  btn?.addEventListener('pointerenter', hop);
  let raf = 0, shown = null, beat = null;

  // título + bajada: se disparan (no se arrastran con el scroll) y se revierten al volver
  const setShown = v => {
    if (v === shown) return;
    shown = v;
    hearts.setOn(v);
    pals.forEach((p, i) => {
      p.getAnimations().forEach(x => x.cancel());
      if (reduce) { p.style.opacity = 1; return; }
      p.animate([{ opacity: v ? 0 : 1, transform: v ? 'translateY(30px) scale(.6)' : 'none' }, { opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(16px) scale(.85)' }],
        { duration: v ? 900 : 320, delay: v ? 260 + i * 120 : 0, easing: v ? 'cubic-bezier(.34,1.4,.64,1)' : 'ease-in', fill: 'both' });
    });
    floats.forEach(x => x.cancel()); floats = [];
    if (v && !reduce) floats = pals.map((p, i) => p.querySelector('[data-adopt-float]').animate(
      [{ transform: 'translateY(0) rotate(0deg)' }, { transform: `translateY(${i % 2 ? 8 : -10}px) rotate(${i % 2 ? -2 : 2}deg)` }, { transform: 'translateY(0) rotate(0deg)' }],
      { duration: 4200 + i * 600, iterations: Infinity, easing: 'ease-in-out', delay: 1200 + i * 150 }));
    if (reduce) {
      line.style.transform = 'none';
      fades.forEach(f => { f.style.opacity = 1; f.style.transform = 'none'; });
      return;
    }
    line.getAnimations().forEach(a => a.cancel());
    line.animate([{ transform: v ? 'translateY(110%)' : 'none' }, { transform: v ? 'none' : 'translateY(110%)' }],
      { duration: v ? 900 : 380, easing: v ? E : 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    fades.forEach((f, i) => {
      f.getAnimations().forEach(a => a.cancel());
      f.animate([{ opacity: v ? 0 : 1, transform: v ? 'translateY(24px)' : 'none' }, { opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(16px)' }],
        { duration: v ? 800 : 300, delay: v ? 180 + i * 110 : 0, easing: v ? E : 'ease-in', fill: 'both' });
    });
    // latido suave del corazón cuando ya está grande
    beat?.forEach(b => b.cancel()); beat = null;
    // el gato (máscara) late junto al corazón con el mismo origen, así no aparecen bordes vacíos
    const mask = sec.querySelector('[data-adopt-mask]');
    if (mask) mask.style.transformOrigin = '50% 70%';
    if (v) beat = [heart, mask].filter(Boolean).map(el => el.animate([
      { transform: 'scale(1)' }, { transform: 'scale(1.035)', offset: 0.12 }, { transform: 'scale(1)', offset: 0.26 },
      { transform: 'scale(1.025)', offset: 0.38 }, { transform: 'scale(1)', offset: 0.55 }, { transform: 'scale(1)' }
    ], { duration: 2400, iterations: Infinity, easing: 'ease-in-out', delay: 700 }));
  };

  const paint = () => {
    raf = 0;
    const ih = innerHeight, r = track.getBoundingClientRect();
    if (reduce) { comp.style.transform = 'none'; cat.style.transform = 'none'; heart.style.opacity = 1; setShown(true); return; }
    // entrada: desde que la sección asoma abajo hasta que toca el borde superior
    const pin = clamp((ih - r.top) / ih);
    // sin tramo fijado: todo ocurre mientras la sección entra con scroll normal
    // el gatito sube dentro del corazón; el corazón aparece desde un poco más chico
    const up = easeOut(clamp((pin - 0.25) / 0.7));
    cat.style.transform = `translateY(${(70 * (1 - up)).toFixed(2)}%)`;
    const hIn = easeOut(clamp((pin - 0.1) / 0.6));
    heart.style.opacity = hIn.toFixed(3);
    // crecimiento: termina cuando la sección va ~70% dentro (antes de quedar centrada)
    const g = easeInOut(clamp((pin - 0.35) / 0.5));
    const s = S_MIN + (1 - S_MIN) * g;
    // mientras es chico se centra en pantalla; al crecer vuelve a su sitio entre título y bajada
    const ofs = comp.dataset.ofs ? parseFloat(comp.dataset.ofs) : 0;
    comp.style.transform = `translateY(${(ofs * (1 - g)).toFixed(1)}px) scale(${(s * (0.9 + 0.1 * hIn)).toFixed(4)})`;
    setShown(pin > 0.82);
  };
  // desplazamiento para centrar la composición en el viewport cuando aún es chica
  const measure = () => {
    const st = sec.querySelector('[data-adopt-stage]');
    const prev = comp.style.transform;
    comp.style.transform = 'none';
    const c = comp.getBoundingClientRect(), s = st.getBoundingClientRect();
    comp.style.transform = prev;
    comp.dataset.ofs = String((s.top + s.height / 2) - (c.top + c.height / 2));
    onScroll();
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
  measure();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  return () => {
    btn?.removeEventListener('pointerenter', hop);
    hearts.stop(); beat?.forEach(b => b.cancel()); floats.forEach(x => x.cancel()); cancelAnimationFrame(raf);
    removeEventListener('scroll', onScroll); removeEventListener('resize', measure);
  };
}

// Corazoncitos que suben a los lados del gato: nacen, crecen, se mecen y se desvanecen.
const HEART = 'M12 21s-7.5-4.6-9.6-9.3C.9 8.3 2.8 4.5 6.4 4.1c2.2-.3 4 .9 5.6 2.9 1.6-2 3.4-3.2 5.6-2.9 3.6.4 5.5 4.2 4 7.6C19.5 16.4 12 21 12 21Z';
const COLORS = ['#E63946', '#D62839', '#FF6B81', '#FF9BAA', '#F7B2C4'];
function createHearts(box, reduce) {
  if (!box || reduce) return { setOn() {}, stop() {} };
  const NS = 'http://www.w3.org/2000/svg';
  let timer = 0, on = false, alive = 0;
  const spawn = () => {
    if (!on || alive > 7) return;
    alive++;
    const size = 16 + Math.random() * 22;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', HEART);
    path.setAttribute('fill', COLORS[Math.floor(Math.random() * COLORS.length)]);
    svg.appendChild(path);
    const side = Math.random() < 0.5 ? 0 : 1;
    Object.assign(svg.style, { position: 'absolute', left: (side ? 86 : 14) + '%', bottom: '46%', marginLeft: (-size / 2) + 'px', width: size + 'px', height: size + 'px', overflow: 'visible' });
    box.appendChild(svg);
    const rise = 140 + Math.random() * 120, sway = (side ? 1 : -1) * (10 + Math.random() * 26);
    const rot = (Math.random() - 0.5) * 30, dur = 2600 + Math.random() * 1600;
    const an = svg.animate([
      { transform: `translate(0, 0) scale(0) rotate(${rot}deg)`, opacity: 0 },
      { transform: `translate(${sway * 0.4}px, ${-rise * 0.15}px) scale(1.1) rotate(${rot}deg)`, opacity: 1, offset: 0.14 },
      { transform: `translate(${-sway * 0.6}px, ${-rise * 0.55}px) scale(1) rotate(${-rot}deg)`, opacity: 0.95, offset: 0.55 },
      { transform: `translate(${sway}px, ${-rise}px) scale(0.85) rotate(${rot}deg)`, opacity: 0 }
    ], { duration: dur, easing: 'cubic-bezier(.33,0,.4,1)', fill: 'forwards' });
    an.finished.catch(() => {}).then(() => { svg.remove(); alive--; });
  };
  const loop = () => { spawn(); timer = setTimeout(loop, 700 + Math.random() * 700); };
  return {
    setOn(v) { if (v === on) return; on = v; clearTimeout(timer); if (v) timer = setTimeout(loop, 900); },
    stop() { clearTimeout(timer); box.replaceChildren(); }
  };
}
