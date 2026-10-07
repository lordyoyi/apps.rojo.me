#!/usr/bin/env bash
# Copia Órbita desde rojo-ghost (la fuente de verdad) a assets/orbita/.
# No edites a mano lo que copia este script: lo propio de las apps va en assets/apps.css y assets/apps.js.
# Uso: ./herramientas/sincronizar-orbita.sh
set -euo pipefail
GHOST="${GHOST:-$HOME/Dev/rojo-ghost}/assets/orbita"
DEST="$(cd "$(dirname "$0")/.." && pwd)/assets/orbita"
mkdir -p "$DEST"/{css,fonts,js,img/marca,img/fotos}
cp "$GHOST"/css/orbita.css "$GHOST"/css/orbita-web.css "$DEST/css/"
cp "$GHOST"/fonts/*.woff2 "$DEST/fonts/"
cp "$GHOST"/js/orbita-web.js "$DEST/js/"
cp "$GHOST"/img/iconos.svg "$GHOST"/img/iconos.json "$DEST/img/"
cp "$GHOST"/img/marca/* "$DEST/img/marca/"
cp "$GHOST"/img/fotos/rodrigo-rojo-firma.webp "$DEST/img/fotos/"
cp "$GHOST"/version.json "$DEST/"
echo "Órbita $(python3 -c "import json;print(json.load(open('$DEST/version.json')).get('orbita','?'))") copiada en assets/orbita/"
