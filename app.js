/* CodeLab — editor HTML/CSS/JS en vivo. Sin build, sin IA. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY_CODE = 'codelab:v1', KEY_SET = 'codelab:settings';
  const LANGS = ['html', 'css', 'js'];
  const MONACO_LANG = { html: 'html', css: 'css', js: 'javascript' };

  const DEFAULT = {
    html: `<main>\n  <h1>¡Hola, CodeLab! 👋</h1>\n  <p>Edita HTML, CSS y JS: la vista se actualiza al instante.</p>\n  <button id="btn">Clic: 0</button>\n</main>`,
    css: `body {\n  display: grid;\n  place-content: center;\n  min-height: 100vh;\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  background: #0f172a;\n  color: #e2e8f0;\n  text-align: center;\n}\n\nbutton {\n  font-size: 20px;\n  padding: 8px 22px;\n  border: 2px solid #38bdf8;\n  background: transparent;\n  color: #38bdf8;\n  border-radius: 999px;\n  cursor: pointer;\n}\n\nbutton:hover {\n  background: #38bdf8;\n  color: #0f172a;\n}\n`,
    js: `// Puedes importar librerías desde un CDN (requiere internet):\n// import confetti from 'https://esm.sh/canvas-confetti';\n\nconst btn = document.querySelector('#btn');\nlet n = 0;\n\nbtn.addEventListener('click', () => {\n  n++;\n  btn.textContent = \`Clic: \${n}\`;\n  console.log('clics:', n);\n});\n\nconsole.info('Listo ✔');\n`,
  };

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const settings = Object.assign(
    { layout: 'h', theme: 'dark', font: 14, auto: true, fmtSave: false, hidden: [], order: [] },
    store.get(KEY_SET, {}),
  );
  const saveSettings = () => store.set(KEY_SET, settings);

  const toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
  };

  /* ---------- compartir por URL (deflate + base64url) ---------- */
  const b64u = {
    enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
  };
  async function pipe(bytes, stream) {
    const out = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(out).arrayBuffer());
  }
  const pack = async (obj) => 'z' + b64u.enc(await pipe(new TextEncoder().encode(JSON.stringify(obj)), new CompressionStream('deflate-raw')));
  const unpack = async (s) => {
    if (!s.startsWith('z')) return JSON.parse(new TextDecoder().decode(b64u.dec(s)));
    return JSON.parse(new TextDecoder().decode(await pipe(b64u.dec(s.slice(1)), new DecompressionStream('deflate-raw'))));
  };

  /* ---------- script espía inyectado en la vista previa ---------- */
  function spy() {
    const OFF = 0;
    const post = (type, level, text) => parent.postMessage({ __cl: 1, type, level, text }, '*');
    const fmt = (v, top = true, depth = 0, seen = []) => {
      if (typeof v === 'string') return top ? v : JSON.stringify(v);
      if (v === null || v === undefined || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
      if (typeof v === 'symbol') return v.toString();
      if (typeof v === 'function') return 'ƒ ' + (v.name || '(anónima)') + '()';
      if (v instanceof Error) return v.stack || v.name + ': ' + v.message;
      if (typeof Node !== 'undefined' && v instanceof Node) return v.outerHTML ? v.outerHTML.slice(0, 300) : String(v.nodeName);
      if (seen.includes(v)) return '[Circular]';
      if (depth > 3) return Array.isArray(v) ? '[…]' : '{…}';
      seen = seen.concat([v]);
      try {
        if (v instanceof Map) return 'Map(' + v.size + ') {' + [...v].map(([k, x]) => fmt(k, false, depth + 1, seen) + ' => ' + fmt(x, false, depth + 1, seen)).join(', ') + '}';
        if (v instanceof Set) return 'Set(' + v.size + ') {' + [...v].map((x) => fmt(x, false, depth + 1, seen)).join(', ') + '}';
        if (Array.isArray(v)) return '[' + v.map((x) => fmt(x, false, depth + 1, seen)).join(', ') + ']';
        const name = v.constructor && v.constructor.name !== 'Object' ? v.constructor.name + ' ' : '';
        return name + '{' + Object.keys(v).map((k) => k + ': ' + fmt(v[k], false, depth + 1, seen)).join(', ') + '}';
      } catch (e) { return '[objeto]'; }
    };
    const line = (args) => args.map((a) => fmt(a)).join(' ');
    ['log', 'info', 'warn', 'error', 'debug'].forEach((l) => {
      const orig = console[l].bind(console);
      console[l] = (...a) => { orig(...a); post('console', l === 'debug' ? 'log' : l, line(a)); };
    });
    console.clear = () => post('clear');
    console.table = (d) => post('console', 'log', fmt(d));
    console.dir = (d) => post('console', 'log', fmt(d));
    console.assert = (c, ...a) => { if (!c) post('console', 'error', 'Assertion failed: ' + line(a)); };
    const timers = {}, counts = {};
    console.time = (l = 'default') => { timers[l] = performance.now(); };
    console.timeEnd = (l = 'default') => { post('console', 'log', l + ': ' + (performance.now() - timers[l]).toFixed(2) + ' ms'); delete timers[l]; };
    console.count = (l = 'default') => { counts[l] = (counts[l] || 0) + 1; post('console', 'log', l + ': ' + counts[l]); };
    addEventListener('error', (e) => post('console', 'error', (e.message || 'Error') + (e.lineno ? '  (línea ' + Math.max(1, e.lineno - OFF) + ')' : '')));
    addEventListener('unhandledrejection', (e) => post('console', 'error', 'Promesa rechazada: ' + fmt(e.reason)));
    addEventListener('message', async (e) => {
      if (!e.data || e.data.__cl !== 'eval') return;
      try { const r = await (0, eval)(e.data.code); post('console', 'result', fmt(r)); }
      catch (err) { post('console', 'error', fmt(err)); }
    });
  }

  function buildDoc(html, css, js, withSpy) {
    const doc = buildRaw(html, css, js, withSpy, 0);
    if (!withSpy) return doc;
    const i = doc.indexOf('<script type="module">');
    return buildRaw(html, css, js, withSpy, doc.slice(0, i).split('\n').length);
  }
  function buildRaw(html, css, js, withSpy, off) {
    const spyTag = withSpy ? `<script>(${spy.toString().replace('const OFF = 0;', 'const OFF = ' + off + ';')})()<\/script>` : '';
    const style = `<style>\n${css}\n</style>`;
    const script = `<script type="module">\n${js.replace(/<\/script/gi, '<\\/script')}\n<\/script>`;
    if (/<html[\s>]|<!doctype/i.test(html)) {
      let d = html;
      if (/<head[^>]*>/i.test(d)) d = d.replace(/<head[^>]*>/i, (m) => m + spyTag);
      else d = d.replace(/<html[^>]*>/i, (m) => m + '<head>' + spyTag + '</head>');
      d = /<\/head>/i.test(d) ? d.replace(/<\/head>/i, () => style + '</head>') : d + style;
      d = /<\/body>/i.test(d) ? d.replace(/<\/body>/i, () => script + '</body>') : d + script;
      return d;
    }
    return `<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${spyTag}\n${style}\n</head>\n<body>\n${html}\n${script}\n</body>\n</html>`;
  }

  /* ---------- consola ---------- */
  const conOut = $('#consoleOut'); let conN = 0;
  function conAdd(level, text) {
    const d = document.createElement('div');
    d.className = 'ln ' + level; d.textContent = text; conOut.appendChild(d);
    conOut.scrollTop = conOut.scrollHeight;
    if (level !== 'cmd' && level !== 'sys' && level !== 'result') $('#conCount').textContent = ++conN;
  }
  function conClear() { conOut.textContent = ''; conN = 0; $('#conCount').textContent = '0'; }
  $('#conClear').onclick = conClear;
  const preview = $('#preview');
  window.addEventListener('message', (e) => {
    const m = e.data;
    if (e.source !== preview.contentWindow || !m || m.__cl !== 1) return;
    if (m.type === 'clear') conClear(); else conAdd(m.level, m.text);
  });
  const hist = []; let hi = 0;
  $('#consoleInput').addEventListener('keydown', (e) => {
    const inp = e.target;
    if (e.key === 'Enter' && inp.value.trim()) {
      conAdd('cmd', '› ' + inp.value); hist.push(inp.value); hi = hist.length;
      preview.contentWindow.postMessage({ __cl: 'eval', code: inp.value }, '*'); inp.value = '';
    } else if (e.key === 'ArrowUp' && hi > 0) { inp.value = hist[--hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { inp.value = hist[++hi] ?? ''; hi = Math.min(hi, hist.length); }
  });

  /* ---------- layout y splitters ---------- */
  const workspace = $('#workspace');
  const dirOf = (container) => {
    const h = settings.layout === 'h';
    if (container === workspace) return h ? 'column' : 'row';
    if (container.id === 'editors') return h ? 'row' : 'column';
    return h ? 'row' : 'column';
  };
  const DEFAULT_ORDER = ['html', 'css', 'js', 'result', 'console'];
  function applyOrder() {
    let o = settings.order;
    if (!Array.isArray(o) || o.length !== 5 || DEFAULT_ORDER.some((x) => !o.includes(x))) o = settings.order = [...DEFAULT_ORDER];
    const byId = Object.fromEntries($$('.pane').map((p) => [p.dataset.pane, p]));
    o.forEach((id, i) => ($(i < 3 ? '#editors' : '#output')).appendChild(byId[id]));
  }
  function swapPanes(a, b) {
    const o = settings.order, i = o.indexOf(a), j = o.indexOf(b);
    [o[i], o[j]] = [o[j], o[i]]; saveSettings();
    $$('.pane,.split').forEach((p) => (p.style.flex = '')); rebuildGutters();
  }
  $$('.pane-title').forEach((t) => {
    const pane = t.parentElement; t.draggable = true; t.title = 'Arrastra sobre otro panel para intercambiar posiciones';
    t.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', pane.dataset.pane); e.dataTransfer.effectAllowed = 'move';
      document.body.classList.add('dragging');
    });
    t.addEventListener('dragend', () => { document.body.classList.remove('dragging'); $$('.drop-target').forEach((x) => x.classList.remove('drop-target')); });
  });
  $$('.pane').forEach((pane) => {
    pane.addEventListener('dragover', (e) => { e.preventDefault(); pane.classList.add('drop-target'); });
    pane.addEventListener('dragleave', (e) => { if (!pane.contains(e.relatedTarget)) pane.classList.remove('drop-target'); });
    pane.addEventListener('drop', (e) => {
      e.preventDefault(); pane.classList.remove('drop-target');
      const from = e.dataTransfer.getData('text/plain');
      if (from && from !== pane.dataset.pane) swapPanes(from, pane.dataset.pane);
    });
  });
  function rebuildGutters() {
    $$('.gutter').forEach((g) => g.remove());
    applyOrder();
    const hidden = new Set(settings.hidden);
    $$('.pane').forEach((p) => p.classList.toggle('hidden', hidden.has(p.dataset.pane)));
    for (const sec of [$('#editors'), $('#output')]) {
      sec.classList.toggle('hidden', !$$('.pane', sec).some((p) => !p.classList.contains('hidden')));
      sec.style.flexDirection = dirOf(sec);
    }
    workspace.className = 'layout-' + settings.layout;
    for (const c of [$('#editors'), $('#output'), workspace]) {
      const kids = [...c.children].filter((k) => !k.classList.contains('hidden') && !k.classList.contains('gutter'));
      kids.forEach((k, i) => {
        if (i === kids.length - 1) return;
        const g = document.createElement('div');
        g.className = 'gutter ' + (dirOf(c) === 'row' ? 'col' : 'row');
        k.after(g); attachDrag(g, k, kids[i + 1], dirOf(c) === 'row');
      });
    }
    window.dispatchEvent(new Event('resize'));
  }
  function attachDrag(g, a, b, horizontal) {
    g.addEventListener('pointerdown', (e) => {
      e.preventDefault(); g.setPointerCapture(e.pointerId);
      g.classList.add('drag'); document.body.classList.add('dragging');
      const prop = horizontal ? 'width' : 'height', coord = horizontal ? 'clientX' : 'clientY';
      const sa = a.getBoundingClientRect()[prop], sb = b.getBoundingClientRect()[prop], start = e[coord];
      const move = (ev) => {
        const d = Math.max(-sa + 60, Math.min(sb - 60, ev[coord] - start));
        a.style.flex = `${sa + d} 1 0`; b.style.flex = `${sb - d} 1 0`;
      };
      const up = () => {
        g.classList.remove('drag'); document.body.classList.remove('dragging');
        g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up);
      };
      g.addEventListener('pointermove', move); g.addEventListener('pointerup', up);
    });
    g.addEventListener('dblclick', () => { a.style.flex = b.style.flex = ''; });
  }
  function syncToggles() { $$('.tog').forEach((t) => t.classList.toggle('on', !settings.hidden.includes(t.dataset.pane))); }
  $$('.tog').forEach((t) => t.addEventListener('click', () => {
    const p = t.dataset.pane, i = settings.hidden.indexOf(p);
    i < 0 ? settings.hidden.push(p) : settings.hidden.splice(i, 1);
    saveSettings(); syncToggles(); rebuildGutters();
  }));
  $('#btnReset').onclick = () => {
    settings.order = [...DEFAULT_ORDER]; saveSettings();
    $$('.pane,.split').forEach((p) => (p.style.flex = '')); rebuildGutters(); toast('Posiciones restablecidas');
  };
  $('#btnLayout').onclick = () => {
    settings.layout = settings.layout === 'h' ? 'v' : 'h'; saveSettings();
    $$('.pane,.split').forEach((p) => (p.style.flex = '')); rebuildGutters();
  };

  /* ---------- tema / opciones ---------- */
  function applyTheme() {
    document.documentElement.dataset.theme = settings.theme;
    if (window.monaco) monaco.editor.setTheme(settings.theme === 'dark' ? 'vs-dark' : 'vs');
  }
  $('#btnTheme').onclick = () => { settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applyTheme(); };
  $('#chkAuto').checked = settings.auto; $('#chkFmtSave').checked = settings.fmtSave;
  $('#chkAuto').onchange = (e) => { settings.auto = e.target.checked; saveSettings(); };
  $('#chkFmtSave').onchange = (e) => { settings.fmtSave = e.target.checked; saveSettings(); };

  /* ---------- Monaco ---------- */
  require.config({ paths: { vs: 'vendor/monaco/vs' } });
  self.MonacoEnvironment = { getWorkerUrl: () => new URL('vendor/monaco/worker.js', location.href).href };

  require(['vs/editor/editor.main'], async () => {
    const ts = monaco.languages.typescript;
    ts.javascriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, allowNonTsExtensions: true,
      allowJs: true, checkJs: false, lib: ['esnext', 'dom', 'dom.iterable'],
    });
    ts.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false, diagnosticCodesToIgnore: [2307, 7016, 1375, 1378, 80001] });
    ts.javascriptDefaults.setEagerModelSync(true);
    try { emmetMonaco.emmetHTML(monaco); emmetMonaco.emmetCSS(monaco); } catch (e) { console.warn('Emmet no disponible', e); }

    // código inicial: hash compartido > localStorage > ejemplo
    let code = store.get(KEY_CODE, DEFAULT);
    const m = location.hash.match(/^#c=(.+)$/);
    if (m) { try { code = Object.assign({}, DEFAULT, await unpack(m[1])); toast('Proyecto cargado desde el enlace'); } catch { toast('Enlace inválido'); } }

    const editors = {}; let active = 'html';
    const common = {
      theme: settings.theme === 'dark' ? 'vs-dark' : 'vs', automaticLayout: true, minimap: { enabled: false },
      fontSize: settings.font, fontFamily: "'Cascadia Code','Fira Code',Consolas,monospace", fontLigatures: true,
      tabSize: 2, insertSpaces: true, wordWrap: 'on', scrollBeyondLastLine: false, bracketPairColorization: { enabled: true },
      autoClosingBrackets: 'always', autoClosingQuotes: 'always', autoSurround: 'languageDefined',
      quickSuggestions: { other: true, comments: false, strings: true }, suggestOnTriggerCharacters: true,
      tabCompletion: 'on', snippetSuggestions: 'top', formatOnPaste: false, smoothScrolling: true, padding: { top: 6 },
      lineNumbersMinChars: 3, renderLineHighlight: 'line', 'semanticHighlighting.enabled': true,
    };
    let timer;
    const persist = () => store.set(KEY_CODE, getCode());
    const getCode = () => Object.fromEntries(LANGS.map((l) => [l, editors[l].getValue()]));
    function run() {
      clearTimeout(timer); const c = getCode();
      conClear(); $('#status').textContent = 'actualizado ' + new Date().toLocaleTimeString();
      preview.srcdoc = buildDoc(c.html, c.css, c.js, true);
    }
    async function format(lang) {
      const ed = editors[lang], parser = { html: 'html', css: 'css', js: 'babel' }[lang];
      try {
        const out = await prettier.format(ed.getValue(), {
          parser, plugins: [prettierPlugins.html, prettierPlugins.postcss, prettierPlugins.babel, prettierPlugins.estree],
          tabWidth: 2, printWidth: 100, singleQuote: true, htmlWhitespaceSensitivity: 'ignore',
        });
        if (out !== ed.getValue()) ed.executeEdits('prettier', [{ range: ed.getModel().getFullModelRange(), text: out }]);
        return true;
      } catch (e) {
        conAdd('error', `Formato ${lang.toUpperCase()}: ${String(e.message).split('\n')[0]}`); toast('No se pudo formatear ' + lang.toUpperCase() + ' (revisa la consola)');
        return false;
      }
    }
    const formatAll = async () => { for (const l of LANGS) await format(l); };

    for (const l of LANGS) {
      const ed = editors[l] = monaco.editor.create($('#ed-' + l), { ...common, value: code[l] ?? '', language: MONACO_LANG[l] });
      ed.onDidFocusEditorText(() => (active = l));
      ed.onDidChangeModelContent(() => { persist(); if (settings.auto) { clearTimeout(timer); timer = setTimeout(run, 350); } });
      ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);
      ed.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => format(l));
      ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => { if (settings.fmtSave) await formatAll(); persist(); run(); toast('Guardado ✔'); });
    }
    $('#btnRun').onclick = run;
    $('#btnFormat').onclick = () => format(active);
    $('#btnFont').onclick = () => {
      settings.font = settings.font >= 20 ? 11 : settings.font + 1; saveSettings();
      LANGS.forEach((l) => editors[l].updateOptions({ fontSize: settings.font })); toast('Letra ' + settings.font + 'px');
    };

    $('#btnShare').onclick = async () => {
      const h = '#c=' + await pack(getCode()), url = location.origin + location.pathname + h;
      history.replaceState(null, '', h);
      try { await navigator.clipboard.writeText(url); toast('Enlace copiado (' + url.length + ' caracteres)'); } catch { prompt('Copia el enlace:', url); }
    };
    $('#btnDownload').onclick = () => {
      const c = getCode(), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buildDoc(c.html, c.css, c.js, false)], { type: 'text/html' }));
      a.download = 'codelab.html'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('#btnOpen').onclick = () => $('#fileOpen').click();
    $('#fileOpen').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const doc = new DOMParser().parseFromString(await f.text(), 'text/html');
      const css = $$('style', doc).map((s) => s.textContent.trim()).join('\n\n');
      const scripts = $$('script:not([src])', doc), js = scripts.map((s) => s.textContent.trim()).join('\n\n');
      const ext = [...$$('link[rel=stylesheet]', doc), ...$$('script[src]', doc)].map((n) => n.outerHTML).join('\n');
      $$('style,script:not([src])', doc).forEach((n) => n.remove());
      editors.html.setValue((ext ? ext + '\n' : '') + doc.body.innerHTML.trim());
      editors.css.setValue(css); editors.js.setValue(js); e.target.value = ''; run(); toast('Abierto: ' + f.name);
    };
    $('#btnNew').onclick = () => {
      if (!confirm('¿Empezar un proyecto vacío? Se perderá lo actual (descárgalo o compártelo antes).')) return;
      LANGS.forEach((l) => editors[l].setValue('')); history.replaceState(null, '', location.pathname); run();
    };
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') e.preventDefault();
    });

    syncToggles(); rebuildGutters(); applyTheme(); run();
    window.CodeLab = { editors, run, getCode };
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
