#!/usr/bin/env python3
"""Pone el head, la navegación y el pie compartidos en cada página.

Cada página lleva marcadores (`<!-- @head -->…<!-- /@head -->`, igual con nav y footer) y este script reemplaza lo que
hay entre ellos con herramientas/parciales/. Es idempotente: el HTML que se sube a GitHub Pages es el mismo que editas.
Uso: python3 herramientas/armar.py
"""
import datetime
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PARCIALES = RAIZ / "herramientas/parciales"
PAGINAS = ["index.html", "404.html", "formato-linkedin/index.html", "carrusel/index.html", "teleprompter/index.html"]


def parcial(nombre, pagina):
    t = (PARCIALES / f"{nombre}.html").read_text().rstrip("\n")
    t = t.replace("{{marca}}", (PARCIALES / "marca.html").read_text().strip())
    t = t.replace("{{anio}}", str(datetime.date.today().year))
    seccion = pagina.split("/")[0] if "/" in pagina else ""
    return re.sub(r"\{\{actual:([a-z-]+)\}\}", lambda m: ' aria-current="page"' if m.group(1) == seccion else "", t)


def main():
    for pagina in PAGINAS:
        ruta = RAIZ / pagina
        if not ruta.exists():
            continue
        html = ruta.read_text()
        for nombre in ("head", "nav", "footer", "sol", "planeta-rojo"):
            html = re.sub(rf"([ \t]*)<!-- @{nombre} -->.*?<!-- /@{nombre} -->",
                          lambda m: f"{m.group(1)}<!-- @{nombre} -->\n{parcial(nombre, pagina)}\n{m.group(1)}<!-- /@{nombre} -->",
                          html, flags=re.S)
        ruta.write_text(html)
        print("Armada:", pagina)


if __name__ == "__main__":
    main()
