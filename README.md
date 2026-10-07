# apps.rojo.me

Apps chiquitas de Rodrigo Rojo para crear contenido. Corren 100 % en el navegador: sin servidor, sin registro, sin cuentas.
Sitio estático para GitHub Pages (`CNAME` → apps.rojo.me), con el sistema de diseño **Órbita**.

| App | Ruta | Qué hace |
|---|---|---|
| Formato para LinkedIn | `/formato-linkedin/` | Negrita, cursiva y listas con letras Unicode, historial y vista previa del feed con el corte «…más» |
| Carrusel en PDF | `/carrusel/` | Texto separado por `---` → láminas en canvas → PDF (LinkedIn) o ZIP de PNG (Instagram). PDF y ZIP escritos a mano en `carrusel/archivos.js` |
| Teleprompter | `/teleprompter/` | Guion a N palabras por minuto, espejo, cuenta regresiva y grabación con la cámara (MediaRecorder, MP4 o WebM) |

## Cómo está armado

- `assets/orbita/`: copia del kit Órbita desde `~/Dev/rojo-ghost`. **No se edita a mano**: `./herramientas/sincronizar-orbita.sh`.
- `assets/apps.css` y `assets/apps.js`: lo compartido de las apps (portada, paneles, controles, Unicode, copiar, descargar).
- Cada app vive en su carpeta con su `index.html`, su CSS y su JS. Color con intención: LinkedIn en calma, Carrusel en amancay, Teleprompter en quintral.
- Head, navegación y pie son parciales (`herramientas/parciales/`). Después de cambiarlos: `python3 herramientas/armar.py` (reemplaza lo que hay entre los marcadores `<!-- @nav -->` de cada página).
- Para sumar una app: carpeta nueva, copia la estructura de otra, agrégala a `PAGINAS` en `armar.py`, al menú en `parciales/nav.html` y al pie, y su tarjeta en `index.html`.

## Probar en local

```
python3 -m http.server 8765
```
y abre http://localhost:8765 (las rutas son absolutas, hay que servir desde la raíz).
