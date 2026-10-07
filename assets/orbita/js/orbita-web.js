/* Órbita web · Rodrigo Rojo ® · comportamiento mínimo, sin dependencias.
   1. Menú móvil (botón .ob-nav__abrir). 2. Muro de logos con peso óptico parejo (port de MuroLogos).
   3. Selector de tema Sol / Luna (.ob-tema): cambia <html data-theme>, invierte los bloques [data-contraste] y lo recuerda.
   4. «Ver más artículos» ([data-mas]): trae tarjetas de las páginas de /articulos/ y las suma a la grilla, sin repetir.
   5. Mapa de expedición ([data-viaje]): el cohete recorre la ruta y enciende las paradas.
   6. Fachada de YouTube ([data-yt-lista]): miniatura del último video al acercarse; el reproductor real solo al hacer clic.
   7. Método animado ([data-metodo]): marca [data-visible] mientras está en pantalla (la animación es CSS). */
(function () {
  var d = document;
  d.documentElement.setAttribute('data-js', '');

  // 1 · Menú móvil
  var nav = d.querySelector('.ob-nav'), boton = nav && nav.querySelector('.ob-nav__abrir');
  if (boton) {
    var menu = d.getElementById(boton.getAttribute('aria-controls'));
    var cerrar = function () { boton.setAttribute('aria-expanded', 'false'); menu.removeAttribute('data-abierto'); };
    boton.addEventListener('click', function () {
      var abierto = boton.getAttribute('aria-expanded') === 'true';
      if (abierto) { cerrar(); } else { boton.setAttribute('aria-expanded', 'true'); menu.setAttribute('data-abierto', ''); }
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
    d.addEventListener('click', function (e) { if (!nav.contains(e.target)) cerrar(); });
  }

  // 2 · Muro de logos: cada logo ocupa más o menos la misma área de su celda (data-area, 0.42 por defecto)
  function equilibrar(img) {
    var caja = img.parentNode; if (!caja || !img.naturalWidth) return;
    var cs = getComputedStyle(caja);
    var W = caja.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var H = caja.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (W <= 0 || H <= 0) return;
    var r = img.naturalWidth / img.naturalHeight, area = W * H * (parseFloat(caja.getAttribute('data-area')) || 0.42);
    var w = Math.sqrt(area * r), h = w / r;
    if (w > W) { w = W; h = w / r; } if (h > H) { h = H; w = h * r; }
    img.style.maxWidth = 'none'; img.style.maxHeight = 'none'; img.style.width = w + 'px'; img.style.height = h + 'px';
  }
  [].forEach.call(d.querySelectorAll('.ob-muro__grilla'), function (g) {
    var todo = function () { [].forEach.call(g.querySelectorAll('img'), function (im) { if (im.complete) equilibrar(im); else im.addEventListener('load', function () { equilibrar(im); }, { once: true }); }); };
    todo();
    if (window.ResizeObserver) new ResizeObserver(todo).observe(g);
  });

  // 3 · Selector de tema Sol / Luna. Por defecto Luna; el cuerpo de los artículos va en Sol en ambos (data-theme fijo).
  var raiz = d.documentElement, botonesTema = d.querySelectorAll('.ob-tema [data-tema]');
  var aplicarTema = function (tema) {
    raiz.setAttribute('data-theme', tema);
    var tc = d.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', tema === 'sol' ? '#f2eadb' : '#13100f');
    d.querySelectorAll('[data-contraste]').forEach(function (el) { el.setAttribute('data-theme', tema === 'sol' ? 'luna' : 'sol'); });
    botonesTema.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tema') === tema)); });
  };
  if (botonesTema.length) {
    aplicarTema(raiz.getAttribute('data-theme') === 'sol' ? 'sol' : 'luna');
    botonesTema.forEach(function (b) {
      b.addEventListener('click', function () {
        var tema = b.getAttribute('data-tema');
        aplicarTema(tema);
        try { localStorage.setItem('ob-tema', tema); } catch (e) {}
      });
    });
  }

  // 4 · «Ver más artículos». Lee las páginas de /articulos/ (HTML que ya arma Ghost con post-card), guarda las tarjetas
  //     que no están en pantalla y suma una tanda por clic: 3 en escritorio y móvil, 4 con dos columnas.
  [].forEach.call(d.querySelectorAll('[data-mas]'), function (boton) {
    var grilla = d.getElementById(boton.getAttribute('data-mas')); if (!grilla || !window.fetch || !window.DOMParser) return;
    var estado = boton.parentNode.querySelector('[data-mas-estado]'), etiqueta = boton.querySelector('span');
    var siguiente = boton.getAttribute('href'), reserva = [], vistos = {};
    [].forEach.call(grilla.querySelectorAll('a.ob-articulo'), function (a) { vistos[a.getAttribute('href')] = 1; });
    var tanda = function () { var cols = getComputedStyle(grilla).gridTemplateColumns.split(' ').length; return cols === 2 ? 4 : 3; };
    var traer = function () {
      return fetch(siguiente, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw r; return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        [].forEach.call(doc.querySelectorAll('.ob-articulos > a.ob-articulo:not([data-destacado])'), function (a) {
          var url = a.getAttribute('href'); if (!vistos[url]) { vistos[url] = 1; reserva.push(a); }
        });
        var prox = doc.querySelector('a[rel="next"]'); siguiente = prox ? prox.getAttribute('href') : null;
      });
    };
    var terminar = function () { boton.parentNode.hidden = true; };
    boton.addEventListener('click', function (e) {
      e.preventDefault(); if (boton.getAttribute('aria-busy') === 'true') return;
      var n = tanda(); boton.setAttribute('aria-busy', 'true'); etiqueta.textContent = 'Cargando…';
      var llenar = function () { return (reserva.length >= n || !siguiente) ? Promise.resolve() : traer().then(llenar); };
      llenar().then(function () {
        var nuevas = reserva.splice(0, n);
        nuevas.forEach(function (a) { var t = d.importNode(a, true); t.setAttribute('data-nuevo', ''); grilla.appendChild(t); });
        // El foco pasa a la primera tarjeta nueva: con teclado o lector de pantalla se sigue leyendo desde ahí
        if (nuevas.length) { var todas = grilla.querySelectorAll('[data-nuevo]'); todas[todas.length - nuevas.length].focus({ preventScroll: true }); }
        estado.textContent = nuevas.length ? 'Se sumaron ' + nuevas.length + ' artículos.' : 'No hay más artículos.';
        boton.removeAttribute('aria-busy'); etiqueta.textContent = 'Ver más artículos';
        if (!reserva.length && !siguiente) terminar();
      }).catch(function () { window.location.href = boton.href; });
    });
  });

  // 5 · Viaje del cohete, en loop: recorre la ruta, enciende las paradas, entra detrás del destino, descansa y vuelve a partir.
  //     Liviano: solo cambia transform (sin recalcular la página), anima solo mientras el mapa está en pantalla
  //     y el navegador lo detiene solo con la pestaña oculta. Sin JS o con «reducir movimiento»: quieto y todo encendido.
  [].forEach.call(d.querySelectorAll('.ob-mapa[data-viaje]'), function (mapa) {
    var ruta = mapa.querySelector('.ob-mapa__ruta path'), cohete = mapa.querySelector('.ob-mapa__cohete');
    var paradas = mapa.querySelectorAll('.ob-mapa__parada[data-en]');
    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ruta || !cohete || !ruta.getTotalLength || !window.IntersectionObserver || quieto) {
      [].forEach.call(paradas, function (p) { p.setAttribute('data-visitada', ''); }); return;
    }
    var vb = ruta.ownerSVGElement.viewBox.baseVal, largo = ruta.getTotalLength();
    var VIAJE = 3600, DESCANSO = 2600, VUELTA = 700;   // ms: recorrido, quieto en el destino, reaparición en el inicio
    var suave = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    cohete.style.left = '0'; cohete.style.top = '0';
    var ubicar = function (t) {   // t: fracción de la ruta (0 a 1)
      var p = ruta.getPointAtLength(largo * t), q = ruta.getPointAtLength(Math.min(largo, largo * t + 2));
      if (t >= 1) q = { x: p.x + (p.x - ruta.getPointAtLength(largo - 2).x), y: p.y + (p.y - ruta.getPointAtLength(largo - 2).y) };
      var ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + 90;   // el cohete apunta hacia arriba en su dibujo
      var x = p.x / vb.width * mapa.clientWidth, y = p.y / vb.height * mapa.clientHeight;
      cohete.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) rotate(' + ang + 'deg)';
      [].forEach.call(paradas, function (pa) { if (t >= parseFloat(pa.getAttribute('data-en'))) pa.setAttribute('data-visitada', ''); });
    };
    var reiniciar = function () {
      mapa.removeAttribute('data-llegada');
      [].forEach.call(paradas, function (pa) { pa.removeAttribute('data-visitada'); });
      ubicar(0);
    };
    mapa.setAttribute('data-viaje', 'listo'); reiniciar();
    // Reloj del ciclo: «t» avanza solo mientras se anima, así al volver a la pantalla sigue donde quedó
    var visible = false, raf = 0, ultimo = null, t = -400, fase = 'viaje';
    var cuadro = function (ts) {
      raf = 0; if (!visible) { ultimo = null; return; }
      if (ultimo !== null) t += Math.min(ts - ultimo, 100); ultimo = ts;
      if (fase === 'viaje') {
        var x = Math.max(0, Math.min(1, t / VIAJE)); ubicar(suave(x));
        if (x >= 1) { fase = 'descanso'; t = 0; mapa.setAttribute('data-llegada', ''); }
        raf = requestAnimationFrame(cuadro);
      } else if (fase === 'descanso') {
        // Quieto: no hay nada que dibujar, se espera con un temporizador en vez de cuadro a cuadro
        ultimo = null;
        setTimeout(function () { if (fase !== 'descanso') return; fase = 'vuelta'; reiniciar(); cohete.style.opacity = '0';
          requestAnimationFrame(function () { cohete.style.opacity = ''; }); t = 0; if (visible && !raf) raf = requestAnimationFrame(cuadro); }, DESCANSO);
      } else if (fase === 'vuelta') {
        if (t >= VUELTA) { fase = 'viaje'; t = 0; }
        raf = requestAnimationFrame(cuadro);
      }
    };
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible && !raf && fase !== 'descanso') raf = requestAnimationFrame(cuadro);
    }, { threshold: 0.35 }).observe(mapa);
    // Si cambia el ancho, se recalcula la posición en píxeles
    if (window.ResizeObserver) new ResizeObserver(function () { if (fase !== 'viaje') ubicar(fase === 'descanso' ? 1 : 0); }).observe(mapa);
  });

  // 6 · Fachada de YouTube. Nada de YouTube (JS, cookies, fuentes) carga hasta el clic. Al acercarse, el oEmbed de la lista
  //     devuelve la miniatura del video más reciente (sin credenciales); el título sale del oEmbed de ese video.
  //     Con data-yt-video (en vez de data-yt-lista) muestra un video fijo elegido.
  [].forEach.call(d.querySelectorAll('[data-yt-lista], [data-yt-video]'), function (caja) {
    var lista = caja.getAttribute('data-yt-lista'), fijo = caja.getAttribute('data-yt-video'), poster = caja.querySelector('.ob-yt__poster');
    var titulo = caja.querySelector('[data-yt-titulo]');
    var oe = function (u) { return fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u), { credentials: 'omit' }).then(function (r) { if (!r.ok) throw r; return r.json(); }); };
    var cargar = function () {
      if (!window.fetch) return;
      (fijo ? Promise.resolve({ thumbnail_url: '/vi/' + fijo + '/' }) : oe('https://www.youtube.com/playlist?list=' + lista)).then(function (p) {
        var m = /\/vi\/([^/]+)\//.exec(p.thumbnail_url || ''); if (!m) return;
        var img = new Image(); img.className = 'ob-yt__img'; img.alt = ''; img.width = 480; img.height = 360;
        img.onload = function () { poster.insertBefore(img, poster.firstChild); }; img.src = 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg';
        return oe('https://www.youtube.com/watch?v=' + m[1]).then(function (v) {
          if (v.title) { titulo.textContent = v.title; poster.setAttribute('aria-label', 'Ver el video: ' + v.title); }
        });
      }).catch(function () {});
    };
    if (window.IntersectionObserver) {
      var o = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { o.disconnect(); cargar(); } }, { rootMargin: '600px 0px' });
      o.observe(caja);
    } else { cargar(); }
    poster.addEventListener('click', function (e) {
      e.preventDefault();
      var f = d.createElement('iframe');
      f.src = fijo ? 'https://www.youtube-nocookie.com/embed/' + fijo + '?autoplay=1' : 'https://www.youtube-nocookie.com/embed/videoseries?list=' + lista + '&autoplay=1';
      f.title = titulo.textContent; f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.referrerPolicy = 'strict-origin-when-cross-origin'; f.allowFullscreen = true;
      caja.replaceChild(f, poster); f.focus();
    });
  });

  // 7 · Método animado: la animación (CSS) corre solo mientras el bloque está en pantalla
  if (window.IntersectionObserver) {
    [].forEach.call(d.querySelectorAll('[data-metodo]'), function (m) {
      new IntersectionObserver(function (e) { if (e[0].isIntersecting) m.setAttribute('data-visible', ''); else m.removeAttribute('data-visible'); }, { threshold: 0.4 }).observe(m);
    });
  }
})();

// 8 · Botón «Copiar»: [data-copiar="id"] copia el texto del elemento con ese id y confirma por 2 segundos
(function () {
  var d = document;
  [].forEach.call(d.querySelectorAll('[data-copiar]'), function (b) {
    b.addEventListener('click', function () {
      var el = d.getElementById(b.getAttribute('data-copiar')); if (!el) return;
      var s = b.querySelector('span') || b, antes = s.textContent, texto = el.textContent.trim();
      var listo = function () { s.textContent = '¡Copiada!'; setTimeout(function () { s.textContent = antes; }, 2000); };
      // Respaldo para sitios sin https (navigator.clipboard solo existe en contextos seguros)
      var respaldo = function () {
        var t = d.createElement('textarea'); t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        d.body.appendChild(t); t.select(); try { if (d.execCommand('copy')) listo(); } catch (e) {} d.body.removeChild(t);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(listo, respaldo); else respaldo();
    });
  });
})();

// 9 · Analítica con consentimiento: Google Analytics se carga solo si la persona acepta en el aviso (.ob-cookies[data-ga]).
//     La elección queda en localStorage («ob-analitica»); [data-analitica-cambiar] vuelve a preguntar.
(function () {
  var d = document, aviso = d.querySelector('.ob-cookies[data-ga]'); if (!aviso) return;
  var id = aviso.getAttribute('data-ga'), clave = 'ob-analitica';
  var leer = function () { try { return localStorage.getItem(clave); } catch (e) { return null; } };
  var guardar = function (v) { try { localStorage.setItem(clave, v); } catch (e) {} };
  var cargado = false;
  var cargar = function () {
    if (cargado || !/^G-[A-Z0-9]+$/.test(id)) return; cargado = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', id);
    var s = d.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id; d.head.appendChild(s);
  };
  var estado = leer();
  if (estado === 'si') cargar(); else if (estado !== 'no') aviso.hidden = false;
  [].forEach.call(aviso.querySelectorAll('[data-analitica]'), function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-analitica'); guardar(v); aviso.hidden = true;
      if (v === 'si') cargar();
      else if (cargado) { try { d.cookie.split(';').forEach(function (c) { var n = c.split('=')[0].trim(); if (/^_ga/.test(n)) d.cookie = n + '=; Max-Age=0; path=/; domain=.' + location.hostname.replace(/^www\./, ''); }); } catch (e) {} }
    });
  });
  [].forEach.call(d.querySelectorAll('[data-analitica-cambiar]'), function (b) {
    b.addEventListener('click', function () { aviso.hidden = false; var p = aviso.querySelector('[data-analitica="si"]'); if (p) p.focus(); });
  });
})();

// 10 · Carrusel en móvil: [data-carrusel] con su barra [data-carrusel-nav="id"] (puntos y pista) y flechas
//      .ob-carrusel__flecha[data-dir="prev|next"][aria-controls="id"] sobre las tarjetas. Cada flecha se oculta en su extremo.
(function () {
  var d = document;
  [].forEach.call(d.querySelectorAll('[data-carrusel]'), function (c) {
    var id = c.id, items = c.children; if (!id || !items.length) return;
    var nav = d.querySelector('[data-carrusel-nav="' + id + '"]');
    var puntos = nav ? nav.querySelectorAll('.ob-carrusel__puntos i') : [], pista = nav && nav.querySelector('.ob-carrusel__pista');
    var prev = d.querySelector('.ob-carrusel__flecha[data-dir="prev"][aria-controls="' + id + '"]');
    var next = d.querySelector('.ob-carrusel__flecha[data-dir="next"][aria-controls="' + id + '"]');
    var alFinal = function () { return c.scrollLeft >= c.scrollWidth - c.clientWidth - 4; };
    var actual = function () { if (alFinal()) return items.length - 1; var ancho = items[0].getBoundingClientRect().width || 1; return Math.min(items.length - 1, Math.round(c.scrollLeft / ancho)); };
    var pintar = function () {
      var i = actual();
      [].forEach.call(puntos, function (p, k) { if (k === i) p.setAttribute('data-on', ''); else p.removeAttribute('data-on'); });
      if (prev) prev.hidden = i === 0;
      if (next) next.hidden = i >= items.length - 1;
      if (pista && i > 0) pista.hidden = true;
    };
    var ir = function (k) {
      k = Math.max(0, Math.min(items.length - 1, k));
      var destino = items[k].getBoundingClientRect().left - c.getBoundingClientRect().left + c.scrollLeft - parseFloat(getComputedStyle(c).paddingLeft || 0);
      var reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      c.scrollTo({ left: Math.max(0, destino), behavior: reducir ? 'auto' : 'smooth' });
    };
    c.addEventListener('scroll', function () { window.requestAnimationFrame(pintar); }, { passive: true });
    if (prev) prev.addEventListener('click', function () { ir(actual() - 1); });
    if (next) next.addEventListener('click', function () { ir(actual() + 1); });
  });
})();
