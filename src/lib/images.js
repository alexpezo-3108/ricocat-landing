// Espera a que carguen las imágenes de un contenedor (con timeout de seguridad).
export function waitForImages(scope, timeout = 2500) {
  const imgs = [...scope.querySelectorAll('img')];
  const loaded = Promise.all(imgs.map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); })
  ));
  return Promise.race([loaded, new Promise(r => setTimeout(r, timeout))]);
}
