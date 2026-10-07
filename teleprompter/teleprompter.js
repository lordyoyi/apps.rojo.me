/* Teleprompter: el texto avanza a N palabras por minuto; con cámara, graba en el navegador (MediaRecorder). */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var K = 'rojo-apps-teleprompter-';
  var guion = $('#guion'), escena = $('#escena'), ventana = $('#ventana'), rollo = $('#rollo'), textoEl = $('#texto');
  var EJEMPLO = 'Hola, soy Ana y hoy te muestro tres atajos de IA que uso cada semana.\n\n[pausa]\n\nEl primero es para tus correos. Pegas un hilo largo y le pides: dime qué me piden, para cuándo y quién decide. En diez segundos sabes qué hacer.\n\nEl segundo es para tus reuniones. Antes de entrar, le pasas la agenda y le preguntas qué datos te van a pedir. Llegas con las respuestas.\n\n[muestra el celular]\n\nY el tercero es mi favorito: grabas un audio con tu idea, lo pasas a texto y le pides que lo ordene sin cambiar tus palabras. Así escribo este guion.\n\n[sonríe]\n\n¿Cuál vas a probar primero? Cuéntame en los comentarios.';

  var cfg = { vel: +Apps.leer(K + 'vel', 150), tam: +Apps.leer(K + 'tam', 56), camara: Apps.leer(K + 'camara', '0') === '1', espejo: Apps.leer(K + 'espejo', '0') === '1', cuenta: Apps.leer(K + 'cuenta', '1') === '1' };

  function contar(t) { return (t.replace(/\[[^\]]*\]/g, ' ').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length; }
  function reloj(seg) { seg = Math.max(0, Math.round(seg)); return Math.floor(seg / 60) + ':' + String(seg % 60).padStart(2, '0'); }
  function ritmo(v) { return v < 120 ? 'pausado, para explicar' : v < 165 ? 'ritmo de conversación' : v < 200 ? 'energético, para redes' : 'muy rápido'; }

  function resumen() {
    var n = contar(guion.value), seg = n / cfg.vel * 60;
    $('#palabras').textContent = n.toLocaleString('es-CL') + (n === 1 ? ' palabra' : ' palabras');
    $('#duracion').textContent = reloj(seg);
    var nota = $('#duracion-nota');
    if (!n) nota.textContent = 'Un Reel o un Short de 60 segundos son unas 150 palabras.';
    else if (seg <= 60) nota.textContent = 'Cabe en un Reel, un Short o un TikTok de un minuto.';
    else if (seg <= 90) nota.textContent = 'Sirve para un Reel de 90 segundos. Para un Short, recorta ' + Math.ceil(n - cfg.vel).toLocaleString('es-CL') + ' palabras.';
    else nota.textContent = 'Para un video corto de 60 segundos te sobran ' + Math.ceil(n - cfg.vel).toLocaleString('es-CL') + ' palabras.';
  }

  // ── Ajustes ──
  var vel = $('#velocidad'), tam = $('#tamano');
  function pintarAjustes() {
    vel.value = cfg.vel; tam.value = cfg.tam;
    $('#velocidad-txt').textContent = cfg.vel + ' palabras por minuto · ' + ritmo(cfg.vel);
    $('#tamano-txt').textContent = cfg.tam + ' px';
    $('#c-vel').textContent = cfg.vel + ' ppm';
    escena.style.setProperty('--tp-tam', cfg.tam + 'px');
    $('#nota-camara').hidden = !cfg.camara;
    $('#empezar-txt').textContent = cfg.camara ? 'Abrir cámara y leer' : 'Empezar a leer';
    resumen();
  }
  vel.addEventListener('input', function () { cfg.vel = +vel.value; Apps.guardar(K + 'vel', cfg.vel); pintarAjustes(); });
  tam.addEventListener('input', function () { cfg.tam = +tam.value; Apps.guardar(K + 'tam', cfg.tam); pintarAjustes(); });
  [['camara', 'camara'], ['espejo', 'espejo'], ['cuenta', 'cuenta']].forEach(function (p) {
    var el = $('#' + p[0]); el.checked = cfg[p[1]];
    el.addEventListener('change', function () { cfg[p[1]] = el.checked; Apps.guardar(K + p[1], el.checked ? '1' : '0'); pintarAjustes(); });
  });
  guion.addEventListener('input', function () { $('#guardado').textContent = Apps.guardar(K + 'guion', guion.value) ? 'Se guarda en este navegador' : 'No se pudo guardar: copia tu guion antes de cerrar'; resumen(); });
  $('#ejemplo').addEventListener('click', function () {
    if (guion.value.trim() && guion.value !== EJEMPLO && !confirm('¿Reemplazar tu guion por el ejemplo?')) return;
    guion.value = EJEMPLO; Apps.guardar(K + 'guion', EJEMPLO); resumen();
  });
  $('#limpiar').addEventListener('click', function () { if (guion.value && !confirm('¿Borrar todo el guion?')) return; guion.value = ''; Apps.guardar(K + 'guion', ''); resumen(); guion.focus(); });

  // ── Escena ──
  var y = 0, corriendo = false, ultimo = 0, palabrasTotal = 1, altoTexto = 1, inicio = 0, anim = 0, quietoT, bloqueo = null, flujo = null;

  function armarTexto() {
    textoEl.textContent = '';
    guion.value.trim().split(/\n\s*\n/).forEach(function (par) {
      var p = document.createElement('p');
      par.split(/(\[[^\]]*\])/).forEach(function (tr) {
        if (!tr) return;
        if (/^\[[^\]]*\]$/.test(tr)) { var s = document.createElement('span'); s.className = 'tp-nota'; s.textContent = tr.slice(1, -1); p.appendChild(s); }
        else p.appendChild(document.createTextNode(tr));
      });
      textoEl.appendChild(p);
    });
    palabrasTotal = Math.max(1, contar(guion.value));
  }
  function medidas() {
    var g = $('#guia').getBoundingClientRect(), v = ventana.getBoundingClientRect();
    inicio = g.top + g.height / 2 - v.top - cfg.tam * 0.7;
    rollo.style.paddingTop = Math.max(0, inicio) + 'px';
    rollo.style.paddingBottom = v.height + 'px';
    altoTexto = Math.max(1, textoEl.offsetHeight);
  }
  function mover() {
    y = Math.max(0, Math.min(y, altoTexto));
    rollo.style.transform = 'translate3d(0,' + (-y) + 'px,0)';
    var f = y / altoTexto; $('#progreso').style.width = (f * 100).toFixed(1) + '%';
    $('#restante').textContent = reloj((1 - f) * palabrasTotal / cfg.vel * 60);
  }
  function paso(t) {
    if (!corriendo) return;
    var dt = Math.min(0.1, (t - ultimo) / 1000); ultimo = t;
    y += altoTexto / palabrasTotal * cfg.vel / 60 * dt; mover();
    if (y >= altoTexto) { pausar(); return; }
    anim = requestAnimationFrame(paso);
  }
  function correr() { if (corriendo) return; corriendo = true; ultimo = performance.now(); anim = requestAnimationFrame(paso); botonPlay(); }
  function pausar() { corriendo = false; cancelAnimationFrame(anim); botonPlay(); despertar(); }
  function alternar() { corriendo ? pausar() : (y >= altoTexto ? (y = 0, mover(), correr()) : correr()); }
  function botonPlay() { var b = $('#c-play'); b.textContent = corriendo ? '❚❚' : '▶'; b.setAttribute('aria-label', corriendo ? 'Pausar' : 'Seguir'); }

  var cuentaT;
  function cuentaRegresiva(listo) {
    if (!cfg.cuenta) { listo(); return; }
    var n = 3, el = $('#numero'); clearInterval(cuentaT); el.textContent = n;
    cuentaT = setInterval(function () { n--; if (n > 0) el.textContent = n; else { clearInterval(cuentaT); el.textContent = ''; listo(); } }, 800);
  }

  function despertar() {
    escena.removeAttribute('data-quieto'); clearTimeout(quietoT);
    quietoT = setTimeout(function () { if (corriendo) escena.setAttribute('data-quieto', ''); }, 2500);
  }

  function abrir() {
    if (!guion.value.trim()) { Apps.avisar('Primero pega tu guion.'); guion.focus(); return; }
    armarTexto(); escena.hidden = false; document.body.style.overflow = 'hidden';
    escena.toggleAttribute('data-espejo', cfg.espejo); $('#c-espejo').setAttribute('aria-pressed', String(cfg.espejo));
    pintarAjustes();
    if (escena.requestFullscreen) escena.requestFullscreen().catch(function () {});
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { bloqueo = w; }).catch(function () {});
    var seguir = function () { requestAnimationFrame(function () { medidas(); y = 0; mover(); $('#c-play').focus(); despertar(); cuentaRegresiva(correr); }); };
    if (cfg.camara) camara().then(seguir, function () { escena.removeAttribute('data-camara'); seguir(); });
    else { escena.removeAttribute('data-camara'); $('#c-grabar').hidden = true; seguir(); }
  }
  function cerrar() {
    if (grabadora && grabadora.state === 'recording') { detener(); }
    pausar(); clearInterval(cuentaT); $('#numero').textContent = '';
    escena.hidden = true; document.body.style.overflow = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    if (bloqueo) { bloqueo.release().catch(function () {}); bloqueo = null; }
    apagarCamara(); $('#empezar').focus();
  }

  // ── Cámara y grabación ──
  var grabadora = null, trozos = [], recT, recInicio = 0, urlVideo = null;
  function camara() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { Apps.avisar('Tu navegador no permite usar la cámara. Sigue sin grabar.'); return Promise.reject(); }
    return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true } })
      .then(function (s) {
        flujo = s; var v = $('#video'); v.srcObject = s; v.play().catch(function () {});
        escena.setAttribute('data-camara', ''); $('#c-grabar').hidden = !window.MediaRecorder;
      }, function (e) {
        Apps.avisar(e && e.name === 'NotAllowedError' ? 'Sin permiso para la cámara. Puedes leer igual, sin grabar.' : 'No encontré una cámara. Puedes leer igual, sin grabar.');
        throw e;
      });
  }
  function apagarCamara() { if (flujo) { flujo.getTracks().forEach(function (t) { t.stop(); }); flujo = null; } $('#video').srcObject = null; }
  function tipoVideo() {
    var ops = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < ops.length; i++) if (MediaRecorder.isTypeSupported(ops[i])) return ops[i];
    return '';
  }
  function grabar() {
    if (!flujo || !window.MediaRecorder) return;
    if (grabadora && grabadora.state === 'recording') { detener(); return; }
    var tipo = tipoVideo(); trozos = [];
    try { grabadora = new MediaRecorder(flujo, tipo ? { mimeType: tipo, videoBitsPerSecond: 6e6 } : undefined); }
    catch (e) { Apps.avisar('Tu navegador no puede grabar video aquí.'); return; }
    grabadora.ondataavailable = function (e) { if (e.data.size) trozos.push(e.data); };
    grabadora.onstop = terminado;
    var empezarGrabacion = function () {
      grabadora.start(1000); recInicio = Date.now(); $('#rec').hidden = false;
      var b = $('#c-grabar'); b.setAttribute('data-grabando', ''); b.querySelector('span').textContent = 'Detener'; b.setAttribute('aria-label', 'Detener grabación');
      recT = setInterval(function () { var s = Math.floor((Date.now() - recInicio) / 1000); $('#rec-tiempo').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 500);
      y = 0; mover(); correr();
    };
    pausar(); y = 0; mover(); cuentaRegresiva(empezarGrabacion);
  }
  function detener() {
    clearInterval(recT); $('#rec').hidden = true;
    var b = $('#c-grabar'); b.removeAttribute('data-grabando'); b.querySelector('span').textContent = 'Grabar'; b.setAttribute('aria-label', 'Grabar');
    if (grabadora && grabadora.state !== 'inactive') grabadora.stop();
    pausar();
  }
  function terminado() {
    var tipo = (grabadora.mimeType || 'video/webm').split(';')[0], ext = tipo.indexOf('mp4') > -1 ? 'mp4' : 'webm';
    var blob = new Blob(trozos, { type: tipo });
    if (urlVideo) URL.revokeObjectURL(urlVideo);
    urlVideo = URL.createObjectURL(blob);
    var hoy = new Date(), nombre = 'video-' + hoy.toISOString().slice(0, 10) + '-' + String(hoy.getHours()).padStart(2, '0') + String(hoy.getMinutes()).padStart(2, '0') + '.' + ext;
    $('#video-final').src = urlVideo; $('#bajar').href = urlVideo; $('#bajar').download = nombre;
    $('#formato-video').textContent = ext === 'webm'
      ? 'Se guarda en formato WebM (' + (blob.size / 1048576).toFixed(1) + ' MB). LinkedIn, YouTube y la mayoría de los editores lo aceptan; si tu celular no lo abre, conviértelo a MP4 en tu editor.'
      : 'Se guarda en MP4 (' + (blob.size / 1048576).toFixed(1) + ' MB), listo para subir a cualquier red.';
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    $('#listo').hidden = false; $('#bajar').focus();
  }
  $('#otra').addEventListener('click', function () { $('#listo').hidden = true; if (escena.hidden) abrir(); else { y = 0; mover(); $('#c-grabar').focus(); } });
  $('#bajar').addEventListener('click', function () { setTimeout(function () { Apps.avisar('Video descargado. Revisa tu carpeta de descargas.'); }, 300); });

  // ── Controles ──
  function cambiarVel(d) { cfg.vel = Math.max(60, Math.min(300, cfg.vel + d)); Apps.guardar(K + 'vel', cfg.vel); pintarAjustes(); despertar(); }
  function cambiarTam(d) { var f = y / altoTexto; cfg.tam = Math.max(24, Math.min(140, cfg.tam + d)); Apps.guardar(K + 'tam', cfg.tam); pintarAjustes(); medidas(); y = f * altoTexto; mover(); despertar(); }
  $('#empezar').addEventListener('click', abrir);
  $('#c-play').addEventListener('click', alternar);
  $('#c-lento').addEventListener('click', function () { cambiarVel(-10); });
  $('#c-rapido').addEventListener('click', function () { cambiarVel(10); });
  $('#c-reiniciar').addEventListener('click', function () { y = 0; mover(); despertar(); });
  $('#c-espejo').addEventListener('click', function () { cfg.espejo = !cfg.espejo; Apps.guardar(K + 'espejo', cfg.espejo ? '1' : '0'); $('#espejo').checked = cfg.espejo; escena.toggleAttribute('data-espejo', cfg.espejo); this.setAttribute('aria-pressed', String(cfg.espejo)); });
  $('#c-grabar').addEventListener('click', grabar);
  $('#c-salir').addEventListener('click', cerrar);
  escena.addEventListener('pointermove', despertar);
  document.addEventListener('fullscreenchange', function () { if (!escena.hidden) requestAnimationFrame(function () { var f = y / altoTexto; medidas(); y = f * altoTexto; mover(); }); });
  window.addEventListener('resize', function () { if (!escena.hidden) { var f = y / altoTexto; medidas(); y = f * altoTexto; mover(); } });

  document.addEventListener('keydown', function (e) {
    if (escena.hidden || !$('#listo').hidden) { if (e.key === 'Escape' && !$('#listo').hidden) $('#listo').hidden = true; return; }
    var k = e.key;
    if (k === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); alternar(); }
    else if (k === 'ArrowUp') { e.preventDefault(); cambiarVel(10); }
    else if (k === 'ArrowDown') { e.preventDefault(); cambiarVel(-10); }
    else if (k === '+' || k === '=') cambiarTam(4);
    else if (k === '-' || k === '_') cambiarTam(-4);
    else if (k === 'r' || k === 'R') grabar();
    else if (k === 'Home') { y = 0; mover(); }
    else if (k === 'Escape') cerrar();
    else return;
    despertar();
  });
  // Rueda y arrastre para ajustar a mano
  ventana.addEventListener('wheel', function (e) { e.preventDefault(); y += e.deltaY; mover(); despertar(); }, { passive: false });
  var arrastre = null;
  ventana.addEventListener('pointerdown', function (e) { arrastre = { y0: e.clientY, pos: y, mueve: false }; ventana.setPointerCapture(e.pointerId); });
  ventana.addEventListener('pointermove', function (e) { if (!arrastre) return; var d = arrastre.y0 - e.clientY; if (Math.abs(d) > 6) arrastre.mueve = true; y = arrastre.pos + d; mover(); });
  ventana.addEventListener('pointerup', function () { if (arrastre && !arrastre.mueve) alternar(); arrastre = null; });

  guion.value = Apps.leer(K + 'guion', '');
  pintarAjustes();
})();
