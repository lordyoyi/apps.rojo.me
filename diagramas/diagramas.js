/* Diagramas: Mermaid → SVG con Pele (vendor/pele.js, MIT), con los colores de Órbita. Todo en el navegador:
   el texto se guarda en localStorage y el link para compartir lleva el diagrama comprimido en el #. */
import { mount } from './vendor/pele.js';

const EJEMPLOS = {
 flujo: `flowchart TD
  A[Tengo una tarea repetitiva] --> B{¿La hago más de 3 veces a la semana?}
  B -- Sí --> C{¿Tiene pasos claros?}
  B -- No --> D[La sigo haciendo a mano]
  C -- Sí --> E([Se la delego a un agente 🤖])
  C -- No --> F[Primero escribo los pasos]
  F --> C`,
 secuencia: `sequenceDiagram
  actor Tú
  participant Claude
  participant Web as Copia local
  Tú->>Claude: Quiero una página de contacto
  Claude->>Web: La crea y la prueba
  Web-->>Claude: Capturas en celular y escritorio
  Claude-->>Tú: Te muestra cómo quedó
  Tú->>Claude: Cambia el botón a rojo
  Claude->>Web: Ajusta y vuelve a revisar`,
 mapa: `mindmap
  root((Mi próximo post))
    Qué probé
      Una herramienta nueva
      El resultado real
    Para quién
      Equipos
      Emprendedores
    Formato
      Carrusel
      Video corto`,
 linea: `timeline
  title Mi web nueva
  29 sep : Sistema de diseño Órbita
  4 oct : Taller en Notro
  5 oct : Lanzamiento de rojo.me
  7 oct : Tienda y apps.rojo.me`,
 gantt: `gantt
  title Lanzamiento de un curso
  dateFormat YYYY-MM-DD
  section Preparar
  Temario :a1, 2026-10-01, 5d
  Página de venta :a2, after a1, 3d
  section Vender
  Newsletter y redes :b1, after a2, 7d
  section Dictar
  Sesiones en vivo :crit, c1, 2026-10-19, 22d`,
 torta: `pie title En qué se me va la semana
  "Reuniones" : 35
  "Crear contenido" : 25
  "Clases" : 25
  "Correos" : 15`,
};
const $ = (s) => document.querySelector(s);
const codigo = $('#codigo'), destino = $('#diagrama'), lienzo = $('#lienzo');
const K = 'rojo-apps-diagramas-';
const NOMBRES = { flowchart: 'Diagrama de flujo', sequence: 'Diagrama de secuencia', mindmap: 'Mapa mental', timeline: 'Línea de tiempo', gantt: 'Carta Gantt', pie: 'Gráfico de torta', class: 'Diagrama de clases', state: 'Diagrama de estados', er: 'Diagrama entidad-relación', journey: 'Recorrido', quadrantChart: 'Cuadrante', xychart: 'Gráfico XY', kanban: 'Kanban', gitGraph: 'Git' };

let montado = null, espera = null;

function pintar() {
  const texto = codigo.value.trim();
  $('#guardado').textContent = Apps.guardar(K + 'texto', codigo.value) ? 'Se guarda en este navegador' : 'No se pudo guardar: copia tu texto antes de cerrar';
  if (!texto) { if (montado) { montado.destroy(); montado = null; } destino.innerHTML = ''; $('#tipo').textContent = ''; $('#di-error').hidden = true; return; }
  const opciones = {
    zoom: 'auto',
    onRender: (r) => { $('#di-error').hidden = true; $('#tipo').textContent = NOMBRES[r.type] || r.type; },
    onError: (e) => {
      const linea = e && e.line ? ` Revisa la línea ${e.line}.` : '';
      $('#error-txt').textContent = (e && e.code === 'unsupported-diagram' ? 'No reconozco ese tipo de diagrama.' : 'Hay algo en el código que no se puede dibujar.') + linea;
      $('#di-error').hidden = false;
    },
  };
  try {
    if (montado) montado.update(texto, opciones); else montado = mount(destino, texto, opciones);
  } catch (e) { opciones.onError(e); }
}
function pronto() { clearTimeout(espera); espera = setTimeout(pintar, 180); }
codigo.addEventListener('input', pronto);

// Ejemplos
const marcarEjemplo = Apps.segmentado($('#ejemplos'), (v) => {
  if (codigo.value.trim() && !Object.values(EJEMPLOS).includes(codigo.value) && !confirm('¿Reemplazar tu diagrama por el ejemplo?')) { marcarEjemplo(''); return; }
  codigo.value = EJEMPLOS[v]; pintar();
});
codigo.addEventListener('input', () => marcarEjemplo(''));

// Fondo (papel o noche): los colores cambian sin volver a dibujar
const marcarFondo = Apps.segmentado($('#fondo'), (v) => { lienzo.dataset.fondo = v; Apps.guardar(K + 'fondo', v); });

// Exportar: el SVG lleva sus colores y la fuente SUSE incrustados, para que se vea igual fuera de la página
const fuentes = {};
async function fuenteBase64(archivo) {
  if (fuentes[archivo]) return fuentes[archivo];
  const r = await fetch('/assets/orbita/fonts/' + archivo); const b = new Uint8Array(await r.arrayBuffer());
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return (fuentes[archivo] = btoa(s));
}
async function svgListo() {
  const svg = destino.querySelector('svg'); if (!svg) return null;
  const copia = svg.cloneNode(true), estilo = getComputedStyle(lienzo);
  const vars = ['bg', 'fg', 'muted', 'line', 'surface', 'surface-alt', 'border', 'accent', 'critical', 'error', 'radius', 'font', 'font-mono']
    .concat([1, 2, 3, 4, 5, 6, 7, 8].map((n) => 'series-' + n))
    .map((v) => `--pele-${v}:${estilo.getPropertyValue('--pele-' + v).trim()}`).join(';');
  const pesos = [400, 600, 700, 800];
  const ff = (await Promise.all(pesos.map((p) => fuenteBase64(`SUSE-${p}.woff2`))))
    .map((b, i) => `@font-face{font-family:"SUSE";font-weight:${pesos[i]};src:url(data:font/woff2;base64,${b}) format("woff2")}`).join('');
  const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = ff;
  copia.insertBefore(st, copia.firstChild);
  copia.setAttribute('style', vars + ';' + (copia.getAttribute('style') || ''));
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const caja = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
  const w = vb && vb.width ? vb.width : caja.width, h = vb && vb.height ? vb.height : caja.height;
  copia.setAttribute('width', w); copia.setAttribute('height', h);
  return { texto: new XMLSerializer().serializeToString(copia), w, h, fondo: estilo.getPropertyValue('--pele-bg').trim() };
}
async function png() {
  const s = await svgListo(); if (!s) return null;
  const escala = 3, margen = 32;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.texto);
  await img.decode();
  const c = document.createElement('canvas'); c.width = Math.round((s.w + margen * 2) * escala); c.height = Math.round((s.h + margen * 2) * escala);
  const ctx = c.getContext('2d'); ctx.fillStyle = s.fondo; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, margen * escala, margen * escala, s.w * escala, s.h * escala);
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}
function nombre(ext) { return 'diagrama-' + new Date().toISOString().slice(0, 10) + '.' + ext; }
function sinDiagrama() { if (destino.querySelector('svg')) return false; Apps.avisar('Primero escribe o pega un diagrama.'); codigo.focus(); return true; }

$('#png').addEventListener('click', async () => { if (sinDiagrama()) return; Apps.descargar(await png(), nombre('png')); Apps.avisar('Imagen descargada.'); });
$('#svg').addEventListener('click', async () => { if (sinDiagrama()) return; const s = await svgListo(); Apps.descargar(new Blob([s.texto], { type: 'image/svg+xml' }), nombre('svg')); Apps.avisar('SVG descargado.'); });
$('#copiar-img').addEventListener('click', async () => {
  if (sinDiagrama()) return;
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': png() })]); Apps.avisar('Imagen copiada. Pégala donde quieras.'); }
  catch (e) { Apps.avisar('Tu navegador no deja copiar imágenes. Usa «Descargar imagen».'); }
});

// Link para compartir: el diagrama va comprimido en el # (no pasa por ningún servidor)
async function comprimir(t) {
  const s = new Blob([t]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const b = new Uint8Array(await new Response(s).arrayBuffer()); let x = ''; b.forEach((n) => (x += String.fromCharCode(n)));
  return btoa(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function descomprimir(c) {
  const b = Uint8Array.from(atob(c.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));
  return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
}
$('#link').addEventListener('click', async () => {
  if (!codigo.value.trim()) { Apps.avisar('Primero escribe o pega un diagrama.'); return; }
  const url = location.origin + location.pathname + '#d=' + (await comprimir(codigo.value)) + '&f=' + lienzo.dataset.fondo;
  Apps.copiar(url).then((ok) => Apps.avisar(ok ? 'Link copiado. Quien lo abra ve tu diagrama.' : 'No pude copiar el link.'));
});

$('#copiar-prompt').addEventListener('click', () => Apps.copiar($('#prompt').textContent).then((ok) => Apps.avisar(ok ? 'Copiado. Complétalo y pégalo en tu IA.' : 'No pude copiar.')));
$('#limpiar').addEventListener('click', () => { if (codigo.value && !confirm('¿Borrar todo el diagrama?')) return; codigo.value = ''; pintar(); codigo.focus(); });

// Inicio: primero un link compartido, después el borrador guardado, si no el ejemplo de flujo
(async () => {
  let fondo = Apps.leer(K + 'fondo', 'papel'), texto = Apps.leer(K + 'texto', '');
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('d')) { try { texto = await descomprimir(h.get('d')); if (h.get('f')) fondo = h.get('f'); } catch (e) { Apps.avisar('El link del diagrama está incompleto.'); } }
  if (!texto.trim()) { texto = EJEMPLOS.flujo; marcarEjemplo('flujo'); }
  codigo.value = texto; lienzo.dataset.fondo = fondo === 'noche' ? 'noche' : 'papel'; marcarFondo(lienzo.dataset.fondo);
  try { await document.fonts.load('600 16px SUSE'); } catch (e) {}
  pintar();
})();
