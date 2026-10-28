// Composición del hero en "unidades de diseño" (1u = 1px del diseño desktop 1920).
// Todo lo que vive dentro del stage se escala con --u; aquí solo se decide dónde va cada bloque.

export const BREAKPOINTS = {
  stageMobileMaxWidth: 820,   // por debajo: composición vertical
  stageMobileMaxAspect: 1.05, // o pantallas más altas que anchas (tablet vertical)
  compactHeaderMaxWidth: 1240 // por debajo: menú hamburguesa
};

// Medidas de referencia de los bloques (coordenadas del diseño)
// Fold del hero (borde inferior del 100vh) en coordenadas de diseño: corta los empaques.
export const FOLD = 1000;
// Aire entre la base de los empaques y la cima del arco de highlights (se ve al hacer scroll).
export const ARC_GAP = 110;

export const BLOCKS = {
  logoH: 105,
  copyH: 226,
  clusterTop: 375,     // borde superior visual de los productos ([data-products]: +40u y escala 1.03)
  clusterBottom: 1107, // base de los empaques (queda bajo el arco)
  clusterCenterX: 615,
  clusterCenterY: 640,
  bagCenterX: 642     // centro visual de la bolsa central (mobile la centra en pantalla)
};

export const STAGE = {
  desktop: {
    width: 1920,
    height: FOLD,
    verticalBias: 1, // 1 = stage anclado al fondo del viewport (fold fijo)
    logo: { x: 960, y: 193, s: 1 },
    copy: { x: 1562, y: 728, s: 1 },
    cluster: { x: 0, y: 0, s: 1 }
  },
  mobile: {
    width: 1100,
    headerPx: 130,     // logo y bajada más separados del header
    logoScale: 2.0,   // Ricocat protagonista
    copyScale: 2.15,    // botón legible; el título se achica aparte (CSS [data-hero-title])
    gapLogoCopy: 48,
    clusterMin: 1.0,   // productos más grandes: llenan el hero
    clusterMax: 1.85,
    bleed: 95,        // casi sin corte: se ven los productos de la fila inferior
    freeBias: 0.42,
  }
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function computeLayout(vw, vh) {
  const mobile = vw < BREAKPOINTS.stageMobileMaxWidth || vw / vh < BREAKPOINTS.stageMobileMaxAspect;
  const compact = vw < BREAKPOINTS.compactHeaderMaxWidth;
  return { mobile, compact, ...(mobile ? mobileLayout(vw, vh) : desktopLayout(vw, vh)) };
}

function desktopLayout(vw, vh) {
  const d = STAGE.desktop;
  const u = Math.min(vw / d.width, vh / d.height);
  const base = Math.max(0, (vh - d.height * u) * d.verticalBias);
  // pantallas más altas que el diseño (p. ej. laptop 1440×900): el sobrante quedaba arriba y el logo bajaba.
  // 1) todo el stage sube hasta dejar solo MIN_BLEED de empaques bajo el fold (la base sigue sin verse)
  // 2) los productos crecen con el sobrante (anclados a la base, crecen hacia arriba y a los lados)
  const MIN_BLEED = 45;
  const freeU = base / u;
  // solo se usa ~30% del sobrante para subir (en pantallas grandes el logo subía demasiado)
  const liftU = Math.min(freeU * 0.3, BLOCKS.clusterBottom - FOLD - MIN_BLEED);
  const cs = 1 + clamp(freeU * 0.0004, 0, 0.08);
  const AX = BLOCKS.clusterCenterX, AY = 1060;
  return {
    u, top: base - liftU * u, width: d.width,
    stripeLift: clamp(freeU * 0.18, 0, 36), // laptops: franjas del medio/abajo un poco más arriba
    logo: d.logo, copy: d.copy,
    cluster: { x: d.cluster.x - (cs - 1) * AX, y: d.cluster.y - (cs - 1) * AY, s: cs },
    highlightGap: (BLOCKS.clusterBottom - FOLD - liftU + ARC_GAP) * u
  };
}

function mobileLayout(vw, vh) {
  const m = STAGE.mobile;
  const u = vw / m.width;
  const H = vh / u;
  const bleed = m.bleed ?? (BLOCKS.clusterBottom - FOLD);
  const contentTop = m.headerPx / u + 24;
  const logoH = BLOCKS.logoH * m.logoScale;
  const copyH = BLOCKS.copyH * m.copyScale;
  const blockA = logoH + m.gapLogoCopy + copyH;
  const span = BLOCKS.clusterBottom - BLOCKS.clusterTop;

  const c = clamp((H - contentTop - blockA - 20) / (span - bleed), m.clusterMin, m.clusterMax);
  let clY = H - (BLOCKS.clusterBottom - bleed) * c;
  const free = clY + BLOCKS.clusterTop * c - contentTop - blockA;
  if (free < 30) clY += 30 - free;

  const logoY = contentTop + Math.max(0, free) * m.freeBias;
  const cx = m.width / 2;

  return {
    u, top: 0, width: m.width,
    logo: { x: cx, y: logoY, s: m.logoScale },
    copy: { x: cx, y: logoY + logoH + m.gapLogoCopy, s: m.copyScale },
    cluster: { x: cx - BLOCKS.bagCenterX * c, y: clY, s: c },
    highlightGap: ((BLOCKS.clusterBottom - FOLD) * c + ARC_GAP) * u
  };
}
