/* Carrusel en PDF: el texto se dibuja en canvas (1080 px de ancho) con el lenguaje de Órbita y se exporta a PDF o ZIP. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var texto = $('#texto'), tira = $('#tira');
  var K = 'rojo-apps-carrusel-';
  var FORMATOS = { '4x5': [1080, 1350], '1x1': [1080, 1080], '9x16': [1080, 1920] };
  var TEMAS = {
    luna: { fondo: '#13100f', puntos: 'rgba(244,237,226,.13)', texto: '#f4ede2', texto2: '#c9c0b3', anillo: 'rgba(244,237,226,.18)' },
    sol: { fondo: '#f2eadb', puntos: 'rgba(20,18,17,.13)', texto: '#141211', texto2: '#46403a', anillo: 'rgba(20,18,17,.16)' },
    fuego: { fondo: ['#e51735', '#ff5a2a', '#ff8f2e'], puntos: 'rgba(255,255,255,.16)', texto: '#ffffff', texto2: 'rgba(255,255,255,.9)', anillo: 'rgba(255,255,255,.28)' }
  };
  // Cada acento tiene su versión para fondo oscuro y para papel (contraste)
  var ACENTOS = {
    fuego: { luna: ['#e51735', '#ff7a29', '#ffc933'], sol: ['#e51735', '#f2541d'], solido: { luna: '#ff7a29', sol: '#c4122f' } },
    amancay: { luna: ['#ffc933'], sol: ['#a86f00'], solido: { luna: '#ffc933', sol: '#a86f00' } },
    calma: { luna: ['#1fe6c4'], sol: ['#0f7a6c'], solido: { luna: '#1fe6c4', sol: '#0f7a6c' } },
    azul: { luna: ['#6fa3ff'], sol: ['#1f5fd6'], solido: { luna: '#6fa3ff', sol: '#1f5fd6' } },
    lima: { luna: ['#7dff5a'], sol: ['#2e8a17'], solido: { luna: '#7dff5a', sol: '#2e8a17' } }
  };
  var EJEMPLO = [
    '5 atajos de IA para tu *lunes*', 'Los uso cada semana. Cada uno te ahorra al menos 15 minutos.', '---',
    'Resume ese hilo *eterno*', 'Pega los correos y pide:', '- qué me piden', '- para cuándo', '- quién decide', '---',
    'Prepara tu reunión en *2 minutos*', 'Pásale la agenda y pregúntale qué datos te van a pedir. Llegas con las respuestas.', '---',
    'Escribe como *hablas*', 'Graba un audio con tu idea, pásalo a texto y pide que lo ordene sin cambiar tus palabras.', '---',
    'Convierte notas en *tareas*', '- pega tus notas de la reunión', '- pide una lista con responsable y fecha', '- cópiala a tu gestor de tareas', '---',
    '¿Cuál pruebas *primero*?', 'Guarda este post para el lunes y cuéntame en los comentarios.'
  ].join('\n');

  var estado = {
    tema: Apps.leer(K + 'tema', 'luna'), formato: Apps.leer(K + 'formato', '4x5'), acento: Apps.leer(K + 'acento', 'fuego'),
    numeros: Apps.leer(K + 'numeros', '1') === '1', foto: null
  };

  // ── Texto → láminas ──
  function laminas(t) {
    return t.split(/^\s*---+\s*$/m).map(function (s) { return s.replace(/^\s*\n|\s+$/g, ''); }).filter(Boolean).map(function (s) {
      var ls = s.split('\n'), titulo = ls.shift().replace(/^#+\s*/, '').trim();
      var cuerpo = ls.map(function (l) {
        var m;
        if (!l.trim()) return { tipo: 'espacio' };
        if ((m = l.match(/^\s*[-•→*]\s+(.*)$/))) return { tipo: 'item', t: m[1] };
        if ((m = l.match(/^\s*(\d+)[.)]\s+(.*)$/))) return { tipo: 'num', n: m[1], t: m[2] };
        return { tipo: 'p', t: l.trim() };
      });
      while (cuerpo.length && cuerpo[0].tipo === 'espacio') cuerpo.shift();
      return { titulo: titulo, cuerpo: cuerpo };
    });
  }
  // «*palabra*» → tramo con acento; devuelve palabras con su estilo
  function palabras(t) {
    var out = [];
    t.split(/(\*[^*]+\*)/).forEach(function (tramo) {
      if (!tramo) return;
      var acento = /^\*[^*]+\*$/.test(tramo); if (acento) tramo = tramo.slice(1, -1);
      tramo.split(/(\s+)/).forEach(function (w) { if (w) out.push({ t: w, acento: acento, esp: /^\s+$/.test(w) }); });
    });
    return out;
  }
  function envolver(ctx, ps, ancho, fuente, fuenteAcento) {
    var lineas = [[]], x = 0;
    ps.forEach(function (p) {
      ctx.font = p.acento ? fuenteAcento : fuente;
      var w = ctx.measureText(p.t).width;
      if (p.esp) { if (x > 0) { lineas[lineas.length - 1].push({ t: ' ', w: w, esp: true }); x += w; } return; }
      if (x + w > ancho && x > 0) {
        var l = lineas[lineas.length - 1]; while (l.length && l[l.length - 1].esp) { x -= l.pop().w; }
        lineas.push([]); x = 0;
      }
      lineas[lineas.length - 1].push({ t: p.t, w: w, acento: p.acento }); x += w;
    });
    return lineas.map(function (l) { return { tramos: l, ancho: l.reduce(function (s, x) { return s + x.w; }, 0) }; });
  }

  // ── Dibujo ──
  function relleno(ctx, colores, x, w) {
    if (colores.length === 1) return colores[0];
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    colores.forEach(function (c, i) { g.addColorStop(i / (colores.length - 1), c); });
    return g;
  }
  function fuente(peso, px, mono) { return peso + ' ' + Math.round(px) + 'px ' + (mono ? '"SUSE Mono", monospace' : 'SUSE, "Helvetica Neue", Arial, sans-serif'); }
  function espaciado(ctx, em, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = (em * px).toFixed(1) + 'px'; }

  function fondo(ctx, W, H, tema, portada) {
    var T = TEMAS[tema];
    if (Array.isArray(T.fondo)) { var g = ctx.createLinearGradient(0, 0, W, H); T.fondo.forEach(function (c, i) { g.addColorStop(i / (T.fondo.length - 1), c); }); ctx.fillStyle = g; }
    else ctx.fillStyle = T.fondo;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = T.puntos;
    for (var y = 18; y < H; y += 36) for (var x = 18; x < W; x += 36) { ctx.beginPath(); ctx.arc(x, y, 1.7, 0, 6.2832); ctx.fill(); }
    if (portada) { // órbitas con satélite asomando por la esquina
      ctx.save(); ctx.translate(W * 0.92, H * 0.14); ctx.rotate(-0.24); ctx.strokeStyle = T.anillo; ctx.lineWidth = 2;
      [[420, 150], [320, 114], [220, 78]].forEach(function (r) { ctx.beginPath(); ctx.ellipse(0, 0, r[0], r[1], 0, 0, 6.2832); ctx.stroke(); });
      ctx.restore();
    }
  }
  function estrella(ctx, x, y, r, color) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2; ctx.quadraticCurveTo(0, 0, Math.cos(a) * r, Math.sin(a) * r); ctx.quadraticCurveTo(0, 0, Math.cos(a + Math.PI / 4) * r * 0.12, Math.sin(a + Math.PI / 4) * r * 0.12); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function avatar(ctx, x, y, d, nombre, colorFondo, colorTexto) {
    ctx.save(); ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, 6.2832); ctx.closePath();
    if (estado.foto) { ctx.clip(); ctx.drawImage(estado.foto, x, y, d, d); }
    else {
      ctx.fillStyle = colorFondo; ctx.fill(); ctx.fillStyle = colorTexto; ctx.font = fuente(800, d * 0.42); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((nombre.trim().split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2) || '·').toUpperCase(), x + d / 2, y + d / 2 + d * 0.03);
    }
    ctx.restore();
  }

  function dibujar(lam, i, total, ctx, W, H) {
    var tema = estado.tema, T = TEMAS[tema], claro = tema === 'sol' ? 'sol' : 'luna', A = ACENTOS[estado.acento];
    var colAcento = tema === 'fuego' ? ['#141211'] : A[claro], solido = tema === 'fuego' ? '#141211' : A.solido[claro];
    var M = 90, portada = i === 0 && total > 1, ultima = i === total - 1 && total > 1;
    var nombre = $('#nombre').value.trim(), usuario = $('#usuario').value.trim(), firma = nombre || usuario || estado.foto;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    fondo(ctx, W, H, tema, portada);
    if (portada && tema !== 'fuego') estrella(ctx, W - 170, 250, 56, A.solido.luna === '#ff7a29' ? '#ffc933' : solido);

    // Cabecera con la firma (en la última lámina va grande, abajo del texto)
    var arriba = M;
    if (firma && !ultima) {
      avatar(ctx, M, M, 76, nombre || usuario, relleno(ctx, tema === 'fuego' ? ['#141211'] : A[claro], M, 76), tema === 'sol' || tema === 'fuego' ? '#fff' : '#141211');
      ctx.fillStyle = T.texto; ctx.font = fuente(700, 32); espaciado(ctx, -0.01, 32); ctx.fillText(nombre || usuario, M + 98, M + (nombre && usuario ? 32 : 48));
      if (nombre && usuario) { ctx.fillStyle = T.texto2; ctx.font = fuente(400, 27); ctx.fillText(usuario, M + 98, M + 68); }
      arriba = M + 76 + 30;
    }
    var abajo = H - M - 64, ancho = W - M * 2;

    // Medir y encajar: se achica todo junto hasta que cabe
    var tamT = portada ? 150 : 112, tamC = portada ? 52 : 48, minT = portada ? 64 : 50;
    var bloque, alto, s = 1;
    for (var intento = 0; intento < 14; intento++) {
      bloque = medir(ctx, lam, ancho, tamT * s, tamC * s, portada, ultima && firma);
      alto = bloque.alto;
      if (alto <= abajo - arriba || tamT * s <= minT) break;
      s *= 0.92;
    }
    var y = arriba + Math.max(0, (abajo - arriba - alto) / (portada ? 1.6 : 2));
    pintar(ctx, bloque, M, y, colAcento, solido, T, W);

    // Pie: número, «Desliza» y la línea de horizonte
    ctx.font = fuente(600, 26, true); espaciado(ctx, 0.08, 26); ctx.fillStyle = T.texto2;
    if (estado.numeros && total > 1) ctx.fillText(String(i + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0'), M, H - M + 6);
    if (i < total - 1) {
      ctx.font = fuente(700, 30); espaciado(ctx, -0.01, 30); var d = 'Desliza →', dw = ctx.measureText(d).width;
      ctx.fillStyle = tema === 'fuego' ? '#141211' : relleno(ctx, colAcento, W - M - dw, dw); ctx.fillText(d, W - M - dw, H - M + 6);
    }
    ctx.fillStyle = tema === 'fuego' ? '#141211' : relleno(ctx, colAcento.length > 1 ? colAcento : [colAcento[0], colAcento[0]], 0, W);
    ctx.fillRect(0, H - 14, W, 14);
    espaciado(ctx, 0, 1);
  }

  function medir(ctx, lam, ancho, tT, tC, portada, conFirma) {
    var items = [], alto = 0;
    espaciado(ctx, -0.045, tT);
    var lt = envolver(ctx, palabras(lam.titulo), ancho, fuente(800, tT), fuente(800, tT));
    items.push({ tipo: 'titulo', lineas: lt, tam: tT }); alto += lt.length * tT * 1.0;
    if (lam.cuerpo.length) { alto += tC * (portada ? 1.0 : 0.9); items.push({ tipo: 'hueco', alto: tC * (portada ? 1.0 : 0.9) }); }
    espaciado(ctx, -0.01, tC);
    var sangria = tC * 1.4, previo = null;
    lam.cuerpo.forEach(function (c) {
      if (c.tipo === 'espacio') { if (previo && previo !== 'espacio') { items.push({ tipo: 'hueco', alto: tC * 0.6 }); alto += tC * 0.6; } previo = 'espacio'; return; }
      var lista = c.tipo !== 'p', peso = portada ? 300 : 400;
      var ls = envolver(ctx, palabras(c.t), ancho - (lista ? sangria : 0), fuente(peso, tC), fuente(700, tC));
      if (lista && previo && previo !== 'espacio') { items.push({ tipo: 'hueco', alto: tC * 0.3 }); alto += tC * 0.3; }
      items.push({ tipo: c.tipo, lineas: ls, tam: tC, peso: peso, n: c.n, sangria: lista ? sangria : 0 }); alto += ls.length * tC * 1.32;
      previo = c.tipo;
    });
    if (conFirma) { items.push({ tipo: 'firma', tam: tC }); alto += tC * 1.4 + 120; }
    return { items: items, alto: alto };
  }

  function pintar(ctx, bloque, x0, y, colAcento, solido, T, W) {
    bloque.items.forEach(function (it) {
      if (it.tipo === 'hueco') { y += it.alto; return; }
      if (it.tipo === 'firma') {
        y += it.tam * 1.4; var nombre = $('#nombre').value.trim(), usuario = $('#usuario').value.trim();
        avatar(ctx, x0, y, 120, nombre || usuario, relleno(ctx, colAcento, x0, 120), estado.tema === 'luna' ? '#141211' : '#fff');
        ctx.fillStyle = T.texto; ctx.font = fuente(800, 40); espaciado(ctx, -0.02, 40); ctx.fillText(nombre || usuario, x0 + 148, y + (nombre && usuario ? 54 : 74));
        if (nombre && usuario) { ctx.fillStyle = T.texto2; ctx.font = fuente(400, 32); espaciado(ctx, 0, 32); ctx.fillText(usuario, x0 + 148, y + 98); }
        y += 120; return;
      }
      var titulo = it.tipo === 'titulo', lh = titulo ? it.tam : it.tam * 1.32;
      espaciado(ctx, titulo ? -0.045 : -0.01, it.tam);
      it.lineas.forEach(function (l, k) {
        y += titulo ? it.tam * 0.86 : it.tam * 1.0;
        var x = x0 + (it.sangria || 0);
        if (k === 0 && (it.tipo === 'item' || it.tipo === 'num')) {
          ctx.font = fuente(800, it.tam * 1.08); ctx.fillStyle = solido;
          ctx.fillText(it.tipo === 'item' ? '→' : it.n, x0, y);
        }
        l.tramos.forEach(function (tr) {
          ctx.font = titulo ? fuente(800, it.tam) : fuente(tr.acento ? 700 : it.peso, it.tam);
          ctx.fillStyle = tr.acento ? (titulo ? relleno(ctx, colAcento, x, tr.w) : solido) : (titulo ? T.texto : T.texto2);
          if (!titulo && !tr.acento && it.tipo !== 'p') ctx.fillStyle = T.texto;
          ctx.fillText(tr.t, x, y); x += tr.w;
        });
        y += titulo ? it.tam * 0.14 : it.tam * 0.32;
      });
    });
  }

  // ── Render de la vista previa ──
  var lienzos = [], actual = 0;
  function render() {
    var ls = laminas(texto.value), wh = FORMATOS[estado.formato];
    if (!ls.length) ls = [{ titulo: 'Escribe tu primera *lámina*', cuerpo: [{ tipo: 'p', t: 'La primera línea es el título. Las demás, el texto.' }] }];
    $('#cuenta').textContent = ls.length + (ls.length === 1 ? ' lámina' : ' láminas') + (ls.length > 20 ? ' · LinkedIn recomienda hasta 20' : '');
    while (lienzos.length > ls.length) lienzos.pop().remove();
    ls.forEach(function (lam, i) {
      var c = lienzos[i];
      if (!c) { c = document.createElement('canvas'); c.setAttribute('role', 'img'); tira.appendChild(c); lienzos.push(c); }
      c.width = wh[0]; c.height = wh[1]; c.setAttribute('aria-label', 'Lámina ' + (i + 1) + ': ' + lam.titulo.replace(/\*/g, ''));
      dibujar(lam, i, ls.length, c.getContext('2d'), wh[0], wh[1]);
    });
    if (actual >= ls.length) actual = ls.length - 1;
    marcar();
  }
  var pendiente; function pronto() { clearTimeout(pendiente); pendiente = setTimeout(render, 120); }

  function marcar() { $('#pagina').textContent = (actual + 1) + ' / ' + lienzos.length; $('#anterior').disabled = actual <= 0; $('#siguiente').disabled = actual >= lienzos.length - 1; }
  function ir(i) { actual = Math.max(0, Math.min(lienzos.length - 1, i)); tira.scrollTo({ left: lienzos[actual].offsetLeft - tira.offsetLeft, behavior: 'smooth' }); marcar(); }
  $('#anterior').addEventListener('click', function () { ir(actual - 1); });
  $('#siguiente').addEventListener('click', function () { ir(actual + 1); });
  tira.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual - 1); } });
  tira.addEventListener('scroll', function () { var i = Math.round(tira.scrollLeft / (tira.clientWidth + 16)); if (i !== actual) { actual = i; marcar(); } }, { passive: true });

  // ── Exportar ──
  function blob(c, tipo, q) { return new Promise(function (ok) { c.toBlob(function (b) { b.arrayBuffer().then(function (ab) { ok(new Uint8Array(ab)); }); }, tipo, q); }); }
  function nombreArchivo() { var l = laminas(texto.value)[0]; return ((l ? l.titulo : 'carrusel').replace(/\*/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'carrusel'); }
  $('#pdf').addEventListener('click', function () {
    render();
    Promise.all(lienzos.map(function (c) { return blob(c, 'image/jpeg', 0.93).then(function (j) { return { jpeg: j, ancho: c.width, alto: c.height }; }); }))
      .then(function (ps) { Apps.descargar(Archivos.pdf(ps), nombreArchivo() + '.pdf'); Apps.avisar('PDF listo. Súbelo en LinkedIn como documento.'); });
  });
  $('#zip').addEventListener('click', function () {
    render();
    Promise.all(lienzos.map(function (c, i) { return blob(c, 'image/png').then(function (d) { return { nombre: nombreArchivo() + '-' + String(i + 1).padStart(2, '0') + '.png', datos: d }; }); }))
      .then(function (as) { Apps.descargar(Archivos.zip(as), nombreArchivo() + '.zip'); Apps.avisar('Imágenes listas, en orden para subirlas.'); });
  });

  // ── Ajustes ──
  Apps.segmentado($('#tema'), function (v) { estado.tema = v; Apps.guardar(K + 'tema', v); render(); })(estado.tema);
  Apps.segmentado($('#formato'), function (v) { estado.formato = v; Apps.guardar(K + 'formato', v); render(); })(estado.formato);
  Apps.segmentado($('#acento'), function (v) { estado.acento = v; Apps.guardar(K + 'acento', v); render(); })(estado.acento);
  var numeros = $('#numeros'); numeros.checked = estado.numeros;
  numeros.addEventListener('change', function () { estado.numeros = numeros.checked; Apps.guardar(K + 'numeros', numeros.checked ? '1' : '0'); render(); });
  ['nombre', 'usuario'].forEach(function (id) { var el = $('#' + id); el.value = Apps.leer(K + id, ''); el.addEventListener('input', function () { Apps.guardar(K + id, el.value); pronto(); }); });
  texto.addEventListener('input', function () { $('#guardado').textContent = Apps.guardar(K + 'texto', texto.value) ? 'Se guarda en este navegador' : 'No se pudo guardar: copia tu texto antes de cerrar'; pronto(); });

  function ponerFoto(url) {
    if (!url) { estado.foto = null; $('#foto-vista').style.backgroundImage = ''; $('#quitar-foto').hidden = true; render(); return; }
    var im = new Image(); im.onload = function () { estado.foto = im; $('#foto-vista').style.backgroundImage = 'url(' + url + ')'; $('#quitar-foto').hidden = false; render(); }; im.src = url;
  }
  $('#foto').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    var im = new Image(), u = URL.createObjectURL(f);
    im.onload = function () { // recorte cuadrado al centro, 320 px: liviano para guardarlo en el navegador
      var c = document.createElement('canvas'), l = Math.min(im.width, im.height); c.width = c.height = 320;
      c.getContext('2d').drawImage(im, (im.width - l) / 2, (im.height - l) / 2, l, l, 0, 0, 320, 320);
      var url = c.toDataURL('image/jpeg', 0.88); URL.revokeObjectURL(u); Apps.guardar(K + 'foto', url); ponerFoto(url);
    };
    im.onerror = function () { Apps.avisar('No pude abrir esa imagen. Prueba con un JPG o PNG.'); };
    im.src = u; this.value = '';
  });
  $('#quitar-foto').addEventListener('click', function () { try { localStorage.removeItem(K + 'foto'); } catch (e) {} ponerFoto(null); });

  $('#ejemplo').addEventListener('click', function () {
    if (texto.value.trim() && texto.value !== EJEMPLO && !confirm('¿Reemplazar tu texto por el ejemplo?')) return;
    texto.value = EJEMPLO; Apps.guardar(K + 'texto', EJEMPLO); actual = 0; render(); ir(0);
  });
  $('#limpiar').addEventListener('click', function () {
    if (texto.value && !confirm('¿Borrar todo el texto?')) return;
    texto.value = ''; Apps.guardar(K + 'texto', ''); render(); texto.focus();
  });

  texto.value = Apps.leer(K + 'texto', EJEMPLO);
  texto.placeholder = 'Título de la portada\nUna línea que diga qué gana quien desliza\n---\nSegunda lámina\n- un punto\n- otro punto';
  var f = Apps.leer(K + 'foto', '');
  Promise.all(['800 40px SUSE', '700 40px SUSE', '400 40px SUSE', '300 40px SUSE', '600 26px "SUSE Mono"'].map(function (x) { return document.fonts.load(x); }))
    .catch(function () {}).then(function () { if (f) ponerFoto(f); else render(); });
})();
