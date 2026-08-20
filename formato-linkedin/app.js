(() => {
  const editor = document.querySelector('#postEditor');
  const charCount = document.querySelector('#charCount');
  const charStatus = document.querySelector('#charStatus');
  const wordCount = document.querySelector('#wordCount');
  const saveStatus = document.querySelector('#saveStatus');
  const accessibilityNote = document.querySelector('#accessibilityNote');
  const copyButton = document.querySelector('#copyButton');
  const copyLabel = document.querySelector('#copyLabel');
  const toast = document.querySelector('#toast');
  const symbolsPopover = document.querySelector('#symbolsPopover');
  const symbolsButton = document.querySelector('#symbolsButton');
  const moreButton = document.querySelector('#moreButton');
  const morePopover = document.querySelector('#morePopover');
  const symbolGrid = document.querySelector('#symbolGrid');
  const undoButton = document.querySelector('#undoButton');
  const redoButton = document.querySelector('#redoButton');

  const STORAGE_KEY = 'rojo-apps-linkedin-draft-v1';
  const THEME_KEY = 'rojo-apps-theme';
  const LIMIT = 3000;
  const symbols = ['→','←','↳','•','◦','▪','✓','✗','★','☆','✦','✱','◆','◇','—','“','”','¿','?','¡','!','✅','💡','⚠️','👇','📌','🔴','🟢','🧠','🤖','🚀','❤️'];

  const styles = {
    bold: { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
    italic: { upper: 0x1d434, lower: 0x1d44e },
    boldItalic: { upper: 0x1d468, lower: 0x1d482 }
  };
  const maps = {};
  const reverse = new Map();
  const styleOf = new Map();
  function safeGet(key) {
    try { return localStorage.getItem(key); }
    catch (_) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (_) { return false; }
  }

  function buildMaps() {
    for (const [name, bases] of Object.entries(styles)) {
      const map = new Map();
      for (let i = 0; i < 26; i++) {
        const upper = String.fromCharCode(65 + i);
        const lower = String.fromCharCode(97 + i);
        const styledUpper = String.fromCodePoint(bases.upper + i);
        let styledLower = String.fromCodePoint(bases.lower + i);
        if (name === 'italic' && lower === 'h') styledLower = 'ℎ';
        map.set(upper, styledUpper); map.set(lower, styledLower);
        reverse.set(styledUpper, upper); reverse.set(styledLower, lower);
        styleOf.set(styledUpper, name); styleOf.set(styledLower, name);
      }
      if (bases.digit) {
        for (let i = 0; i < 10; i++) {
          const plain = String(i), styled = String.fromCodePoint(bases.digit + i);
          map.set(plain, styled); reverse.set(styled, plain); styleOf.set(styled, name);
        }
      }
      maps[name] = map;
    }
  }
  buildMaps();

  function graphemes(text) {
    if (window.Intl && Intl.Segmenter) {
      return [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(text)].map(x => x.segment);
    }
    return Array.from(text);
  }

  function unstyleMath(text) {
    return Array.from(text).map(char => reverse.get(char) || char).join('');
  }

  function toPlain(text) {
    return unstyleMath(text).replace(/[\u0332\u0336]/g, '').normalize('NFC');
  }

  function applyUnicodeStyle(text, style) {
    const map = maps[style];
    return graphemes(text).map(cluster => {
      const decomposed = cluster.normalize('NFD');
      const chars = Array.from(decomposed);
      const first = chars.shift();
      return (map.get(first) || first) + chars.join('');
    }).join('');
  }

  function applyLineStyle(text, mark) {
    return graphemes(text).map(cluster => /^\s+$/.test(cluster) || cluster.includes(mark) ? cluster : cluster + mark).join('');
  }

  function selectionIsStyle(text, style) {
    const eligible = graphemes(text).map(cluster => Array.from(cluster.normalize('NFD'))[0]).filter(char => maps[style].has(reverse.get(char) || char));
    return eligible.length > 0 && eligible.every(char => styleOf.get(char) === style);
  }

  function replaceSelection(transform) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) { showToast('Selecciona primero el texto que quieres modificar.'); editor.focus(); return; }
    commitPendingHistory();
    const selected = editor.value.slice(start, end);
    const replacement = transform(selected);
    editor.setRangeText(replacement, start, end, 'select');
    pushHistory();
    updateAll();
    editor.focus();
  }

  function formatSelection(style) {
    replaceSelection(selected => {
      if (style === 'underline') {
        const clusters = graphemes(selected).filter(cluster => !/^\s+$/.test(cluster));
        return clusters.length && clusters.every(cluster => cluster.includes('\u0332')) ? selected.replace(/\u0332/g, '') : applyLineStyle(selected, '\u0332');
      }
      if (style === 'strike') {
        const clusters = graphemes(selected).filter(cluster => !/^\s+$/.test(cluster));
        return clusters.length && clusters.every(cluster => cluster.includes('\u0336')) ? selected.replace(/\u0336/g, '') : applyLineStyle(selected, '\u0336');
      }
      const shouldRemove = selectionIsStyle(selected, style);
      const plain = unstyleMath(selected);
      return shouldRemove ? plain : applyUnicodeStyle(plain, style);
    });
  }

  function formatList(type) {
    commitPendingHistory();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = editor.value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? editor.value.length : nextBreak;
    const block = editor.value.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const contentLines = lines.filter(line => line.trim());
    const sameMarker = contentLines.length > 0 && contentLines.every(line => type === 'bullet' ? /^\s*•\s+/.test(line) : /^\s*\d+[.)]\s+/.test(line));
    let number = 0;
    const replacement = lines.map(line => {
      if (!line.trim()) return line;
      const clean = line.replace(/^\s*(?:•|\d+[.)])\s+/, '');
      if (sameMarker) return clean;
      if (type === 'bullet') return `• ${clean}`;
      number += 1;
      return `${number}. ${clean}`;
    }).join('\n');
    editor.setRangeText(replacement, lineStart, lineEnd, 'select');
    pushHistory(); updateAll(); editor.focus();
  }

  function insertAtCursor(text) {
    commitPendingHistory();
    const start = editor.selectionStart, end = editor.selectionEnd;
    editor.setRangeText(text, start, end, 'end');
    pushHistory(); updateAll(); editor.focus();
  }

  let history = [''];
  let historyIndex = 0;
  let inputTimer;
  let toastTimer;

  function commitPendingHistory() {
    if (!inputTimer) return;
    clearTimeout(inputTimer);
    inputTimer = null;
    pushHistory();
  }

  function pushHistory() {
    const value = editor.value;
    if (history[historyIndex] === value) return;
    history = history.slice(0, historyIndex + 1);
    history.push(value);
    if (history.length > 80) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    editor.value = history[historyIndex];
    updateAll(); updateHistoryButtons(); editor.focus();
  }

  function updateHistoryButtons() {
    undoButton.disabled = historyIndex <= 0;
    redoButton.disabled = historyIndex >= history.length - 1;
    undoButton.style.opacity = undoButton.disabled ? '.35' : '1';
    redoButton.style.opacity = redoButton.disabled ? '.35' : '1';
  }

  function countWords(text) {
    const words = toPlain(text).trim().match(/[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*/gu);
    return words ? words.length : 0;
  }

  function styledCharacterCount(text) {
    return Array.from(text).filter(char => styleOf.has(char) || char === '\u0332' || char === '\u0336').length;
  }

  function updateAll() {
    const value = editor.value;
    const chars = value.length;
    const words = countWords(value);
    charCount.textContent = `${chars.toLocaleString('es-CL')} / 3.000`;
    wordCount.textContent = `${words.toLocaleString('es-CL')} ${words === 1 ? 'palabra' : 'palabras'}`;
    charCount.className = chars > LIMIT ? 'over' : chars > 2700 ? 'warning' : '';
    charStatus.textContent = chars > LIMIT ? `El texto excede el límite por ${(chars - LIMIT).toLocaleString('es-CL')} caracteres.` : '';
    const styled = styledCharacterCount(value);
    accessibilityNote.hidden = styled < 35 || styled / Math.max(Array.from(value).length, 1) < .18;
    const saved = safeSet(STORAGE_KEY, value);
    saveStatus.textContent = saved ? 'Guardado en este dispositivo' : 'Borrador activo, pero no se pudo guardar';
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }

  async function copyPost() {
    if (!editor.value.trim()) { showToast('Primero escribe algo para copiar.'); editor.focus(); return; }
    let copied = false;
    try {
      await navigator.clipboard.writeText(editor.value);
      copied = true;
    } catch (_) {
      const start = editor.selectionStart, end = editor.selectionEnd;
      editor.select();
      try { copied = document.execCommand('copy'); }
      catch (_) { copied = false; }
      editor.setSelectionRange(start, end);
    }
    if (!copied) { showToast('No pude copiar. Selecciona el texto y usa Copiar.'); editor.focus(); return; }
    copyLabel.textContent = 'Copiado';
    copyButton.style.background = '#1b8d62';
    const overBy = editor.value.length - LIMIT;
    showToast(overBy > 0 ? `Copiado, pero excede el límite por ${overBy.toLocaleString('es-CL')} caracteres.` : 'Copiado. Ya puedes pegarlo en LinkedIn.');
    setTimeout(() => { copyLabel.textContent = 'Copiar para LinkedIn'; copyButton.style.background = ''; }, 1800);
  }

  document.querySelectorAll('.format-tool').forEach(button => button.addEventListener('click', () => formatSelection(button.dataset.format)));
  document.querySelectorAll('.list-tool').forEach(button => button.addEventListener('click', () => formatList(button.dataset.list)));
  document.querySelector('#removeFormat').addEventListener('click', () => replaceSelection(toPlain));
  document.querySelectorAll('.toolbar button').forEach(button => button.addEventListener('pointerdown', event => event.preventDefault()));
  function closeMore() { morePopover.classList.remove('open'); moreButton.setAttribute('aria-expanded', 'false'); }
  moreButton.addEventListener('click', event => {
    event.stopPropagation();
    const willOpen = !morePopover.classList.contains('open');
    closeSymbols();
    morePopover.classList.toggle('open', willOpen);
    moreButton.setAttribute('aria-expanded', String(willOpen));
  });
  symbolsButton.addEventListener('click', event => {
    event.stopPropagation();
    closeMore();
    symbolsPopover.hidden = !symbolsPopover.hidden;
    symbolsButton.setAttribute('aria-expanded', String(!symbolsPopover.hidden));
  });
  symbols.forEach(symbol => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = symbol; button.title = `Insertar ${symbol}`;
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => { insertAtCursor(symbol); symbolsPopover.hidden = true; symbolsButton.setAttribute('aria-expanded', 'false'); }); symbolGrid.append(button);
  });
  function closeSymbols() { symbolsPopover.hidden = true; symbolsButton.setAttribute('aria-expanded', 'false'); }
  morePopover.addEventListener('click', event => { if (event.target.closest('button') && event.target.id !== 'symbolsButton') closeMore(); });
  document.querySelector('#menuClearAll').addEventListener('click', () => document.querySelector('#clearAll').click());
  document.addEventListener('click', event => {
    if (!symbolsPopover.contains(event.target) && event.target.id !== 'symbolsButton') closeSymbols();
    if (!morePopover.contains(event.target) && event.target.id !== 'moreButton') closeMore();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!symbolsPopover.hidden) { closeSymbols(); symbolsButton.focus(); }
    else if (morePopover.classList.contains('open')) { closeMore(); moreButton.focus(); }
  });

  editor.addEventListener('input', () => {
    if (historyIndex < history.length - 1) { history = history.slice(0, historyIndex + 1); updateHistoryButtons(); }
    updateAll();
    clearTimeout(inputTimer); inputTimer = setTimeout(() => { inputTimer = null; pushHistory(); }, 400);
  });
  editor.addEventListener('keydown', event => {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === 'b') { event.preventDefault(); formatSelection('bold'); }
    if (key === 'i') { event.preventDefault(); formatSelection('italic'); }
    if (key === 'z' && !event.shiftKey) { event.preventDefault(); commitPendingHistory(); restoreHistory(historyIndex - 1); }
    if (key === 'y' || (key === 'z' && event.shiftKey)) { event.preventDefault(); commitPendingHistory(); restoreHistory(historyIndex + 1); }
  });

  undoButton.addEventListener('click', () => { commitPendingHistory(); restoreHistory(historyIndex - 1); });
  redoButton.addEventListener('click', () => { commitPendingHistory(); restoreHistory(historyIndex + 1); });
  document.querySelector('#clearAll').addEventListener('click', () => {
    if (!editor.value || window.confirm('¿Quieres borrar todo el texto?')) {
      commitPendingHistory();
      editor.value = '';
      pushHistory();
      updateAll();
      editor.focus();
    }
  });
  copyButton.addEventListener('click', copyPost);

  const themeButton = document.querySelector('#themeButton');
  function setTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    safeSet(THEME_KEY, theme);
    themeButton.textContent = theme === 'dark' ? '☀' : '◐';
  }
  themeButton.addEventListener('click', () => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'));

  const saved = safeGet(STORAGE_KEY) || '';
  editor.value = saved;
  editor.setSelectionRange(saved.length, saved.length);
  history = [saved]; historyIndex = 0;
  setTheme(safeGet(THEME_KEY) || 'light');
  updateAll(); updateHistoryButtons();
})();
