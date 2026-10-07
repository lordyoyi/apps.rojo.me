/* Formato para LinkedIn: negrita y cursiva con letras Unicode, listas, historial y vista previa del feed. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var U = Apps.unicode;
  var editor = $('#editor'), postTexto = $('#post-texto'), post = $('#post');
  var CLAVE = 'rojo-apps-linkedin-draft-v1', LIMITE = 3000;
  var CORTE = { movil: 140, escritorio: 210 }, pantalla = Apps.leer('rojo-apps-linkedin-pantalla', 'movil'), abierto = false;
  var SIMBOLOS = ['→', '↳', '✓', '✗', '•', '◦', '★', '✦', '①', '②', '③', '④', '⑤', '«', '»', '¿', '💡', '🚀', '🔥', '✨', '🎯', '💥', '🤯', '👇', '📌', '✅', '❌', '⚠️', '🧠', '🤖', '♻️', '🔴'];
  var EJEMPLO = 'Probé 3 formas de escribir el gancho de un post.\nLa tercera duplicó los comentarios.\n\nTodas decían lo mismo. Lo único que cambió fue la primera línea:\n\n1. Una pregunta: «¿Usas IA en tu trabajo?»\n2. Un dato: «El 70 % no pasa de la primera línea.»\n3. Una historia: «Ayer mi jefa me pidió algo imposible.»\n\nGanó la historia, lejos.\n\n→ La gente sigue leyendo cuando quiere saber qué pasó.\n→ Las preguntas se responden con un «sí» y se olvidan.\n\nTu turno: ¿cuál habrías elegido?\n\n#LinkedIn #Escritura';

  // Historial propio: setRangeText no entra al deshacer del navegador
  var historia = [''], pos = 0, espera = null;
  function apilar() { var v = editor.value; if (historia[pos] === v) return; historia = historia.slice(0, pos + 1); historia.push(v); if (historia.length > 100) historia.shift(); pos = historia.length - 1; botonesHistoria(); }
  function asentar() { if (espera) { clearTimeout(espera); espera = null; apilar(); } }
  function ir(i) { asentar(); if (i < 0 || i >= historia.length) return; pos = i; editor.value = historia[pos]; todo(); botonesHistoria(); editor.focus(); }
  function botonesHistoria() { $('#deshacer').disabled = pos <= 0; $('#rehacer').disabled = pos >= historia.length - 1; }

  function reemplazar(transformar) {
    var a = editor.selectionStart, b = editor.selectionEnd;
    if (a === b) { Apps.avisar('Primero selecciona el texto que quieres cambiar.'); editor.focus(); return; }
    asentar(); editor.setRangeText(transformar(editor.value.slice(a, b)), a, b, 'select'); apilar(); todo(); editor.focus();
  }

  function formato(estilo) {
    reemplazar(function (t) {
      if (estilo === 'subrayado' || estilo === 'tachado') {
        var marca = estilo === 'subrayado' ? '̲' : '̶';
        var gs = U.grafemas(t).filter(function (g) { return !/^\s+$/.test(g); });
        return gs.length && gs.every(function (g) { return g.indexOf(marca) > -1; }) ? t.split(marca).join('') : U.conMarca(t, marca);
      }
      return U.esEstilo(t, estilo) ? U.sinEstilo(t).normalize('NFC') : U.conEstilo(t, estilo);
    });
  }

  function lista(tipo) {
    asentar();
    var v = editor.value, a = editor.selectionStart, b = editor.selectionEnd;
    var ini = v.lastIndexOf('\n', a - 1) + 1, fin = v.indexOf('\n', b); if (fin < 0) fin = v.length;
    var lineas = v.slice(ini, fin).split('\n'), llenas = lineas.filter(function (l) { return l.trim(); });
    var patron = tipo === 'flecha' ? /^\s*→\s+/ : /^\s*\d+[.)]\s+/;
    var quitar = llenas.length && llenas.every(function (l) { return patron.test(l); }), n = 0;
    var nuevo = lineas.map(function (l) {
      if (!l.trim()) return l;
      var limpia = l.replace(/^\s*(?:→|•|\d+[.)])\s+/, '');
      if (quitar) return limpia;
      return tipo === 'flecha' ? '→ ' + limpia : (++n) + '. ' + limpia;
    }).join('\n');
    editor.setRangeText(nuevo, ini, fin, 'select'); apilar(); todo(); editor.focus();
  }

  function insertar(t) { asentar(); editor.setRangeText(t, editor.selectionStart, editor.selectionEnd, 'end'); apilar(); todo(); editor.focus(); }

  // Dónde corta LinkedIn: 3 líneas o el límite de caracteres de la pantalla, lo que llegue primero (aproximado)
  function corte(texto) {
    var cs = Array.from(texto), limite = CORTE[pantalla], saltos = 0;
    for (var i = 0; i < cs.length; i++) {
      if (cs[i] === '\n' && ++saltos === 3) { limite = Math.min(limite, i); break; }
    }
    if (cs.length <= limite) return -1;
    var pre = cs.slice(0, limite).join(''), esp = pre.search(/\s\S*$/);
    return esp > limite * 0.6 ? esp : pre.length;
  }

  function vista() {
    var t = editor.value.replace(/\s+$/, ''), c = corte(t);
    postTexto.textContent = '';
    if (c < 0 || abierto) { postTexto.textContent = t; }
    else {
      postTexto.textContent = t.slice(0, c).replace(/[\s.…]+$/, '') + '… ';
      var mas = document.createElement('button'); mas.type = 'button'; mas.className = 'li-post__mas'; mas.textContent = 'más';
      mas.addEventListener('click', function () { abierto = true; vista(); });
      postTexto.appendChild(mas);
    }
    var g = $('#gancho-texto');
    if (!t) { g.textContent = 'Lo que la gente lee antes de «…más». Ahí decide si sigue leyendo.'; return; }
    if (c < 0) { g.innerHTML = '<strong>Se lee completo, sin «…más».</strong> Los posts cortos funcionan bien cuando la idea es una sola.'; return; }
    var gancho = t.slice(0, c).replace(/\s+$/, '');
    g.textContent = ''; var s = document.createElement('strong'); s.textContent = Array.from(U.aPlano(gancho)).length + ' caracteres antes del corte. ';
    g.append(s, '¿Dan ganas de tocar «más»? Si empieza con un saludo o con tu nombre, prueba partir con el resultado.');
  }

  function todo() {
    var v = editor.value, n = v.length, palabras = (U.aPlano(v).match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
    $('#palabras').textContent = palabras.toLocaleString('es-CL') + (palabras === 1 ? ' palabra' : ' palabras');
    var c = $('#caracteres'); c.textContent = n.toLocaleString('es-CL') + ' / 3.000';
    c.setAttribute('data-estado', n > LIMITE ? 'error' : n > 2700 ? 'alerta' : '');
    if (n > LIMITE) c.textContent += ' · sobran ' + (n - LIMITE).toLocaleString('es-CL');
    var conFormato = U.cuentaConEstilo(v);
    $('#aviso-formato').hidden = conFormato < 35 || conFormato / Math.max(Array.from(v).length, 1) < 0.18;
    $('#guardado').textContent = Apps.guardar(CLAVE, v) ? 'Se guarda en este navegador' : 'No se pudo guardar: copia tu texto antes de cerrar';
    vista();
  }

  // Eventos
  document.querySelectorAll('[data-formato]').forEach(function (b) { b.addEventListener('click', function () { formato(b.dataset.formato); }); });
  document.querySelectorAll('[data-lista]').forEach(function (b) { b.addEventListener('click', function () { lista(b.dataset.lista); }); });
  document.querySelectorAll('.li-barra button').forEach(function (b) { b.addEventListener('pointerdown', function (e) { e.preventDefault(); }); });
  $('#quitar').addEventListener('click', function () { reemplazar(U.aPlano); });
  $('#deshacer').addEventListener('click', function () { ir(pos - 1); });
  $('#rehacer').addEventListener('click', function () { ir(pos + 1); });

  var pop = $('#simbolos-pop'), btnSim = $('#simbolos');
  function cerrarPop() { pop.hidden = true; btnSim.setAttribute('aria-expanded', 'false'); }
  SIMBOLOS.forEach(function (s) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.setAttribute('aria-label', 'Insertar ' + s);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () { insertar(s); cerrarPop(); });
    $('#simbolos-grilla').appendChild(b);
  });
  btnSim.addEventListener('click', function (e) { e.stopPropagation(); pop.hidden = !pop.hidden; btnSim.setAttribute('aria-expanded', String(!pop.hidden)); });
  document.addEventListener('click', function (e) { if (!pop.contains(e.target)) cerrarPop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { cerrarPop(); btnSim.focus(); } });

  editor.addEventListener('input', function () {
    if (pos < historia.length - 1) { historia = historia.slice(0, pos + 1); botonesHistoria(); }
    abierto = false; todo(); clearTimeout(espera); espera = setTimeout(function () { espera = null; apilar(); }, 400);
  });
  editor.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    var k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); formato('negrita'); }
    else if (k === 'i') { e.preventDefault(); formato('cursiva'); }
    else if (k === 'z' && !e.shiftKey) { e.preventDefault(); ir(pos - 1); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); ir(pos + 1); }
  });

  $('#ejemplo').addEventListener('click', function () {
    asentar(); editor.value = U.conEstilo('Probé 3 formas de escribir el gancho de un post.', 'negrita') + EJEMPLO.slice(EJEMPLO.indexOf('\n'));
    apilar(); abierto = false; todo(); editor.focus(); editor.setSelectionRange(0, 0); editor.scrollTop = 0;
  });
  $('#limpiar').addEventListener('click', function () {
    if (editor.value && !confirm('¿Borrar todo el texto? Puedes recuperarlo con Deshacer.')) return;
    asentar(); editor.value = ''; apilar(); todo(); editor.focus();
  });

  var marcarPantalla = Apps.segmentado($('#pantalla'), function (v) { pantalla = v; post.dataset.pantalla = v; Apps.guardar('rojo-apps-linkedin-pantalla', v); abierto = false; vista(); });
  marcarPantalla(pantalla); post.dataset.pantalla = pantalla;

  $('#copiar').addEventListener('click', function () {
    if (!editor.value.trim()) { Apps.avisar('Primero escribe algo para copiar.'); editor.focus(); return; }
    Apps.copiar(editor.value).then(function (ok) {
      if (!ok) { Apps.avisar('No pude copiar. Selecciona el texto y usa Copiar.'); return; }
      var sobra = editor.value.length - LIMITE;
      Apps.avisar(sobra > 0 ? 'Copiado, pero LinkedIn acepta 3.000 caracteres: te sobran ' + sobra.toLocaleString('es-CL') + '.' : 'Copiado. Pégalo en LinkedIn y publica.');
      $('#copiar-txt').textContent = '¡Copiado!'; setTimeout(function () { $('#copiar-txt').textContent = 'Copiar para LinkedIn'; }, 1800);
    });
  });

  var guardado = Apps.leer(CLAVE, '');
  editor.value = guardado; historia = [guardado]; pos = 0;
  botonesHistoria(); todo();
})();
