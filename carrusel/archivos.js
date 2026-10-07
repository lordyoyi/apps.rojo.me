/* PDF y ZIP mínimos, escritos a mano para no depender de librerías: todo se arma en el navegador.
   Archivos.pdf([{jpeg: Uint8Array, ancho, alto}]) → Blob · Archivos.zip([{nombre, datos: Uint8Array}]) → Blob */
(function () {
  var cod = new TextEncoder();

  function pdf(paginas) {
    var partes = [], largo = 0, offsets = [];
    function poner(x) { var b = typeof x === 'string' ? cod.encode(x) : x; partes.push(b); largo += b.length; }
    function objeto(n, cuerpo, flujo) {
      offsets[n] = largo; poner(n + ' 0 obj\n' + cuerpo);
      if (flujo) { poner('\nstream\n'); poner(flujo); poner('\nendstream'); }
      poner('\nendobj\n');
    }
    poner('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    var kids = paginas.map(function (_, i) { return (3 + i * 3) + ' 0 R'; }).join(' ');
    objeto(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objeto(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + paginas.length + ' >>');
    paginas.forEach(function (p, i) {
      var n = 3 + i * 3, w = p.ancho, h = p.alto, dibujo = cod.encode('q ' + w + ' 0 0 ' + h + ' 0 0 cm /Im0 Do Q');
      objeto(n, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + w + ' ' + h + '] /Resources << /XObject << /Im0 ' + (n + 2) + ' 0 R >> >> /Contents ' + (n + 1) + ' 0 R >>');
      objeto(n + 1, '<< /Length ' + dibujo.length + ' >>', dibujo);
      objeto(n + 2, '<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>', p.jpeg);
    });
    var total = 3 + paginas.length * 3, xref = largo, tabla = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (var i = 1; i < total; i++) tabla += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    poner(tabla + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(partes, { type: 'application/pdf' });
  }

  var tablaCrc = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(d) { var c = 0xffffffff; for (var i = 0; i < d.length; i++) c = tablaCrc[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

  // ZIP sin compresión (las imágenes ya vienen comprimidas)
  function zip(archivos) {
    var partes = [], central = [], offset = 0;
    archivos.forEach(function (a) {
      var nombre = cod.encode(a.nombre), crc = crc32(a.datos), n = a.datos.length;
      var cab = new DataView(new ArrayBuffer(30));
      cab.setUint32(0, 0x04034b50, true); cab.setUint16(4, 20, true); cab.setUint16(6, 0x0800, true); cab.setUint16(8, 0, true);
      cab.setUint16(10, 0, true); cab.setUint16(12, 0x21, true); cab.setUint32(14, crc, true); cab.setUint32(18, n, true); cab.setUint32(22, n, true);
      cab.setUint16(26, nombre.length, true); cab.setUint16(28, 0, true);
      partes.push(cab, nombre, a.datos);
      var cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true);
      cen.setUint16(12, 0, true); cen.setUint16(14, 0x21, true); cen.setUint32(16, crc, true); cen.setUint32(20, n, true); cen.setUint32(24, n, true);
      cen.setUint16(28, nombre.length, true); cen.setUint32(42, offset, true);
      central.push(cen, nombre);
      offset += 30 + nombre.length + n;
    });
    var tamCentral = central.reduce(function (s, x) { return s + x.byteLength; }, 0);
    var fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
    return new Blob(partes.concat(central, [fin]), { type: 'application/zip' });
  }

  window.Archivos = { pdf: pdf, zip: zip };
})();
