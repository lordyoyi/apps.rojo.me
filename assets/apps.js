/* Apps · Rodrigo Rojo · utilidades compartidas, sin dependencias. Expone window.Apps. */
(function () {
  var d = document, timer;

  function avisar(texto) {
    var t = d.querySelector('.ap-toast');
    if (!t) { t = d.createElement('div'); t.className = 'ap-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); d.body.appendChild(t); }
    t.textContent = texto; t.setAttribute('data-visible', '');
    clearTimeout(timer); timer = setTimeout(function () { t.removeAttribute('data-visible'); }, 2600);
  }

  function leer(clave, porDefecto) {
    try { var v = localStorage.getItem(clave); return v === null ? porDefecto : v; } catch (e) { return porDefecto; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, valor); return true; } catch (e) { return false; }
  }

  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarViejo(texto); });
    return Promise.resolve(copiarViejo(texto));
  }
  function copiarViejo(texto) {
    var a = d.createElement('textarea'); a.value = texto; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
    d.body.appendChild(a); a.select(); var ok = false; try { ok = d.execCommand('copy'); } catch (e) {} a.remove(); return ok;
  }

  function descargar(blob, nombre) {
    var url = URL.createObjectURL(blob), a = d.createElement('a');
    a.href = url; a.download = nombre; d.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  // Botones de opción (.ap-seg): marca aria-pressed y avisa con el valor
  function segmentado(grupo, alCambiar) {
    var botones = grupo.querySelectorAll('button');
    [].forEach.call(botones, function (b) {
      b.addEventListener('click', function () {
        [].forEach.call(botones, function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        alCambiar(b.getAttribute('data-valor'));
      });
    });
    return function (valor) { [].forEach.call(botones, function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-valor') === valor)); }); };
  }

  // Unicode «matemático»: así LinkedIn muestra negrita y cursiva (no son formato real, son otras letras)
  var estilos = { negrita: [0x1d5d4, 0x1d5ee, 0x1d7ec], cursiva: [0x1d608, 0x1d622], negritaCursiva: [0x1d63c, 0x1d656], serif: [0x1d400, 0x1d41a, 0x1d7ce], mono: [0x1d670, 0x1d68a, 0x1d7f6] };
  var mapas = {}, inverso = new Map(), estiloDe = new Map();
  Object.keys(estilos).forEach(function (nombre) {
    var b = estilos[nombre], m = new Map();
    for (var i = 0; i < 26; i++) {
      var M = String.fromCodePoint(b[0] + i), mi = String.fromCodePoint(b[1] + i);
      m.set(String.fromCharCode(65 + i), M); m.set(String.fromCharCode(97 + i), mi);
      inverso.set(M, String.fromCharCode(65 + i)); inverso.set(mi, String.fromCharCode(97 + i));
      estiloDe.set(M, nombre); estiloDe.set(mi, nombre);
    }
    if (b[2]) for (var n = 0; n < 10; n++) { var c = String.fromCodePoint(b[2] + n); m.set(String(n), c); inverso.set(c, String(n)); estiloDe.set(c, nombre); }
    mapas[nombre] = m;
  });
  var segmentador = window.Intl && Intl.Segmenter ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;
  function grafemas(t) { return segmentador ? Array.from(segmentador.segment(t), function (x) { return x.segment; }) : Array.from(t); }
  function sinEstilo(t) { return Array.from(t, function (c) { return inverso.get(c) || c; }).join(''); }
  // Las tildes se mantienen: la letra base cambia de estilo y el acento queda encima (á → 𝗮́)
  function conEstilo(t, nombre) {
    var m = mapas[nombre];
    return grafemas(sinEstilo(t)).map(function (g) { var cs = Array.from(g.normalize('NFD')), p = cs.shift(); return (m.get(p) || p) + cs.join(''); }).join('');
  }
  function conMarca(t, marca) { return grafemas(t).map(function (g) { return /^\s+$/.test(g) || g.indexOf(marca) > -1 ? g : g + marca; }).join(''); }
  function esEstilo(t, nombre) {
    var letras = grafemas(t).map(function (g) { return Array.from(g.normalize('NFD'))[0]; }).filter(function (c) { return mapas[nombre].has(inverso.get(c) || c); });
    return letras.length > 0 && letras.every(function (c) { return estiloDe.get(c) === nombre; });
  }
  function aPlano(t) { return sinEstilo(t).replace(/[̶̲]/g, '').normalize('NFC'); }
  function conEstiloCuenta(t) { return Array.from(t).filter(function (c) { return estiloDe.has(c) || c === '̲' || c === '̶'; }).length; }

  window.Apps = {
    avisar: avisar, leer: leer, guardar: guardar, copiar: copiar, descargar: descargar, segmentado: segmentado,
    unicode: { conEstilo: conEstilo, conMarca: conMarca, esEstilo: esEstilo, aPlano: aPlano, sinEstilo: sinEstilo, grafemas: grafemas, cuentaConEstilo: conEstiloCuenta }
  };
})();
