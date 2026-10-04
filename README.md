# CodeLab

Editor HTML / CSS / JS en vivo (estilo codi.link). Sin IA, sin build, 100 % estático.

- Monaco (el motor de VS Code): autocompletado, DOM types, Emmet (HTML/CSS), errores en vivo.
- Formato con Prettier (`Shift+Alt+F`, botón ✨, o automático al guardar con `Ctrl+S`).
- Vista previa en vivo + consola (log/warn/error, errores no capturados, REPL que evalúa dentro de la vista).
- Paneles activables, 2 layouts, splitters arrastrables (doble clic = restablecer), tema claro/oscuro.
- Compartir por URL (`#c=…`, comprimido), descargar/abrir `.html`, autoguardado local.
- JS es módulo ES: `import x from 'https://esm.sh/paquete'` (necesita internet solo para eso).

## Uso offline local
Doble clic en `iniciar.bat` (requiere Node) → http://localhost:5173.
Alternativa: `python -m http.server 5173` en esta carpeta.
(No abrir `index.html` con doble clic: los workers de Monaco no cargan desde `file://`.)

## Online (Netlify / GitHub Pages)
1. Sube esta carpeta a un repo (`node_modules` está en `.gitignore`; `vendor/` sí se sube).
2. **Netlify**: importa el repo; `netlify.toml` ya define todo. **GitHub Pages**: Settings → Pages → rama `main`, carpeta `/`.
3. Tras visitarlo una vez, un service worker lo guarda y funciona offline (instalable como app desde el navegador).

Si cambias archivos, ejecuta `node build-manifest.mjs` para regenerar `sw-manifest.js` (Netlify lo hace solo).

## Atajos
`Ctrl+Enter` ejecutar · `Ctrl+S` guardar · `Shift+Alt+F` formatear · `Tab` expandir Emmet
