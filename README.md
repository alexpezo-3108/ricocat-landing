# Ricocat · Landing (deploy)

Sitio estático, sin build. Listo para Vercel.

## Publicar
1. Sube esta carpeta (`deploy/`) a un repositorio o arrástrala en vercel.com/new.
2. Framework preset: **Other**. Build command: vacío. Output directory: `.` (raíz).

## Estructura
- `index.html` — la landing.
- `support.js`, `image-slot.js` — runtime de la página.
- `src/` — lógica (animaciones, tienda, panel "Dónde comprar", plato).
- `data/ricocat-links-v3.json` — **único lugar con los links de compra**. Editar solo este archivo para actualizarlos.
- `assets/` — imágenes. `assets/bowl-v6/` es la secuencia del plato (860 px escritorio, `m/` 560 px celular, `crops.json` con el recorte de cada cuadro).

## Caché
`vercel.json`: secuencia del plato inmutable (1 año, se versiona con `?v=`), resto de imágenes 7 días, links sin caché.
