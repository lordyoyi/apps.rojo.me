# Publicar apps.rojo.me

El sitio ya está listo en GitHub Pages: el repo tiene Pages activado y el archivo `CNAME` con `apps.rojo.me`.
Solo falta que el DNS de rojo.me (GoDaddy) apunte el subdominio a GitHub. Son unos 10 minutos de trabajo más la espera del certificado.

| Qué | Dónde | Estado (7 oct 2026) |
|---|---|---|
| GitHub Pages activado | Repo › Settings › Pages | ✅ (lordyoyi.github.io/apps.rojo.me ya redirige a apps.rojo.me) |
| Registro DNS `apps` | GoDaddy | ❌ falta |
| Dominio verificado en GitHub | Tu perfil › Settings › Pages | ❓ revisar |
| HTTPS obligatorio | Repo › Settings › Pages | ❌ después del DNS |

## 1 · Verifica rojo.me en GitHub (recomendado, 5 min)

Así nadie más puede usar un subdominio de rojo.me en GitHub Pages.

1. Entra a https://github.com/settings/pages (tu perfil, no el repo).
2. «Add a domain» → escribe `rojo.me` → «Add domain».
3. GitHub te muestra un registro TXT. Copia el **nombre** (algo como `_github-pages-challenge-lordyoyi`) y el **valor** (un código largo).
4. En GoDaddy (paso 2) agrega ese registro: tipo **TXT**, nombre el que copiaste (sin `.rojo.me` al final), valor el código.
5. Vuelve a GitHub y toca «Verify». Si falla, espera 10 minutos y reintenta.

## 2 · Apunta el subdominio en GoDaddy (5 min)

1. https://dcc.godaddy.com → Mis productos → **rojo.me** → **DNS**.
2. Revisa que no exista ya un registro con nombre `apps`. Si existe, edítalo en vez de crear otro.
3. «Agregar nuevo registro»:

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| CNAME | `apps` | `lordyoyi.github.io` | 1 hora |

   El valor va **sin** el nombre del repo y sin `https://`.
4. Guarda. **No toques** los registros de `www` (Ghost), `tienda` (Shopify) ni los de correo (MX, TXT de SPF/DKIM).

## 3 · Activa HTTPS en GitHub (espera de 15 min a unas horas)

1. Repo → https://github.com/lordyoyi/apps.rojo.me/settings/pages
2. Revisa: **Source** = «Deploy from a branch», **Branch** = `main` y carpeta `/ (root)`.
3. En **Custom domain** debe decir `apps.rojo.me`. Si no aparece, escríbelo y guarda.
4. Espera el ✓ verde «DNS check successful».
5. Marca **Enforce HTTPS**. Si está gris, GitHub todavía está emitiendo el certificado: vuelve más tarde.

> HTTPS es obligatorio, no opcional: sin él, el navegador no deja usar la cámara (Teleprompter) ni copiar al portapapeles.

## 4 · Prueba

- https://apps.rojo.me abre la portada con el candado.
- Formato LinkedIn: «Ver un ejemplo» y «Copiar para LinkedIn».
- Carrusel: «Descargar PDF» y «Imágenes (.zip)».
- Teleprompter: «Grabar con mi cámara» pide permiso y graba.
- Una dirección que no existe (https://apps.rojo.me/xyz) muestra la página 404 de Órbita.

## Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| «DNS check unsuccessful» | El DNS aún no se propaga | Espera 30 min. Revisa que el valor sea `lordyoyi.github.io` |
| Error 404 de GitHub | Pages apunta a otra rama o carpeta | Paso 3.2 |
| «Enforce HTTPS» gris por horas | El certificado no se emitió | Borra el dominio en Custom domain, guarda, vuelve a escribirlo |
| El navegador avisa «no seguro» | Falta HTTPS | Paso 3.5 |

## Después de publicar

- Sumar el link en rojo.me (por ejemplo, en el footer, columna «Aprende»), si Rodrigo lo decide.
- Cada `git push` a `main` publica solo en uno o dos minutos. No hay que hacer nada más.
