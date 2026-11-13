#!/usr/bin/env node
/**
 * Panel Timón v1 — tablero local del proyecto.
 * Un solo archivo, cero dependencias. Requiere Node 18+.
 *
 * Arranque:  node panel/timon-panel.mjs   (o doble clic en Panel-Timon.command en Mac)
 * Se abre en http://localhost:4444 (puerto configurable en timon.config.json)
 *
 * Los .md del proyecto (CHANGELOG, INBOX, specs) siguen siendo la fuente de
 * verdad — el panel solo los lee y escribe. Solo escucha en 127.0.0.1.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------- raíz del proyecto ----------
function looksLikeRoot(d) {
  try {
    const files = fs.readdirSync(d);
    return files.includes('timon.config.json')
      || files.includes('00-MARCO.md')
      || files.some(f => /^CHANGELOG-[^.]+\.md$/i.test(f) && !/archivo/i.test(f))
      || files.some(f => /^INBOX-[^.]+\.md$/i.test(f));
  } catch { return false; }
}
function findRoot() {
  let d = SCRIPT_DIR;
  for (let i = 0; i < 4; i++) {
    if (looksLikeRoot(d)) return d;
    const p = path.dirname(d);
    if (p === d) break;
    d = p;
  }
  return path.dirname(SCRIPT_DIR);
}
const ROOT = findRoot();

// ---------- config ----------
const DEFAULTS = {
  puerto: 4444,
  comandoRun: 'npm run dev',
  cwdRun: '.',
  carpetasSql: ['sql', 'migrations', 'db', 'database', 'supabase/migrations'],
};
let config = { ...DEFAULTS };
try {
  config = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(path.join(ROOT, 'timon.config.json'), 'utf8')) };
} catch { /* sin config: defaults */ }

// ---------- utilidades de archivos ----------
const inRoot = p => {
  const r = path.resolve(ROOT, p);
  return r === ROOT || r.startsWith(ROOT + path.sep) ? r : null;
};
const readIf = p => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

function findRootFile(re) {
  try {
    const f = fs.readdirSync(ROOT).find(f => re.test(f) && !/archivo/i.test(f));
    return f ? path.join(ROOT, f) : null;
  } catch { return null; }
}
const changelogPath = () => findRootFile(/^CHANGELOG-[^.]+\.md$/i);
const inboxPath = () => findRootFile(/^INBOX-[^.]+\.md$/i);
const memoriaPath = () => findRootFile(/^MEMORIA-[^.]+\.md$/i);

function codigoProyecto() {
  if (config.codigo) return config.codigo;
  const cl = changelogPath();
  if (cl) { const m = path.basename(cl).match(/^CHANGELOG-(.+)\.md$/i); if (m) return m[1]; }
  return 'PROY';
}

// ---------- changelog (tabla markdown) ----------
function parseChangelog() {
  const file = changelogPath();
  if (!file) return { file: null, headers: [], rows: [] };
  const lines = readIf(file).split('\n');
  let headers = [], rows = [], headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) continue;
    const cells = l.split('|').slice(1, -1).map(c => c.trim());
    if (headerIdx === -1) { headers = cells; headerIdx = i; continue; }
    if (/^[-:\s|]+$/.test(l)) continue; // separador
    if (cells.length && cells.some(c => c !== '')) rows.push({ i, cells });
  }
  return { file, headers, rows, lines };
}
function colIndex(headers, nombre, fallback) {
  const i = headers.findIndex(h => h.toLowerCase().includes(nombre));
  return i >= 0 ? i : fallback;
}
function actualizarEstado(id, estado, nota) {
  const cl = parseChangelog();
  if (!cl.file) throw new Error('No hay changelog en el proyecto');
  const row = cl.rows.find(r => r.cells[0] === id);
  if (!row) throw new Error(`No encontré la fila con ID ${id}`);
  const iEstado = colIndex(cl.headers, 'estado', 5);
  const iVerif = colIndex(cl.headers, 'verificaci', 7);
  row.cells[iEstado] = estado;
  if (nota) row.cells[iVerif] = nota;
  cl.lines[row.i] = '| ' + row.cells.join(' | ') + ' |';
  fs.writeFileSync(cl.file, cl.lines.join('\n'));
  return row.cells;
}
function agregarFila({ modulo = '', quien = '', descripcion, herramienta = '' }) {
  const cl = parseChangelog();
  if (!cl.file) throw new Error('No hay changelog en el proyecto');
  const cod = codigoProyecto();
  let max = 0;
  for (const r of cl.rows) {
    const m = r.cells[0].match(/-(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const id = `${cod}-${String(max + 1).padStart(3, '0')}`;
  const fecha = new Date().toISOString().slice(0, 10);
  const fila = `| ${id} | ${fecha} | ${modulo} | ${quien} | ${descripcion} | 🔲 Pendiente | ${herramienta} | — |`;
  // insertar después de la última fila de la tabla (o después del separador si está vacía)
  let insertAfter = -1;
  for (let i = 0; i < cl.lines.length; i++) if (cl.lines[i].trim().startsWith('|')) insertAfter = i;
  if (insertAfter === -1) throw new Error('El changelog no tiene tabla');
  cl.lines.splice(insertAfter + 1, 0, fila);
  fs.writeFileSync(cl.file, cl.lines.join('\n'));
  return id;
}

// ---------- inbox ----------
function capturarInbox(texto) {
  const file = inboxPath();
  if (!file) throw new Error('No hay archivo INBOX en el proyecto');
  const fecha = new Date().toISOString().slice(0, 10);
  const bloque = `\n## ${fecha} — Captura rápida (Panel)\n\n${texto.trim()}\n\n_Sin procesar._\n`;
  fs.appendFileSync(file, bloque);
}

// ---------- specs ----------
function listaSpecs() {
  const dir = path.join(ROOT, 'specs');
  let out = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md') || f.toLowerCase() === 'readme.md') continue;
      const full = path.join(dir, f);
      if (!fs.statSync(full).isFile()) continue;
      const c = readIf(full) || '';
      const m = c.match(/##\s*Estado\s*\r?\n+\s*([^\n]+)/i);
      out.push({ file: 'specs/' + f, nombre: f.replace(/\.md$/, ''), estado: m ? m[1].trim() : '—', mtime: fs.statSync(full).mtimeMs });
    }
  } catch { /* sin specs */ }
  return out.sort((a, b) => b.mtime - a.mtime);
}
const PLANTILLA_SPEC = (nombre) => `# Spec: ${nombre}

## Objetivo
[1-2 líneas: qué problema resuelve]

## Alcance
- Incluye: ...
- No incluye (fuera de alcance): ...

## Contexto / arquitectura relevante
[tablas, módulos, o flujos que toca]

## Criterios de aceptación (verificables sin leer código — máximo 7)
- [ ] Cuando hago X, veo Y
- [ ] ...

## Restricciones
[stack, convenciones, límites conocidos]

## Estado
Abierto
`;

// ---------- docs raíz ----------
function listaDocs() {
  const out = [];
  try {
    for (const f of fs.readdirSync(ROOT)) {
      if (f.endsWith('.md') && fs.statSync(path.join(ROOT, f)).isFile()) out.push(f);
    }
  } catch { }
  const orden = ['00-MARCO.md', '01-ARQUITECTURA.md'];
  return out.sort((a, b) => {
    const ia = orden.indexOf(a), ib = orden.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
}

// ---------- SQL ----------
const LEDGER = path.join(SCRIPT_DIR, 'sql-aplicados.json');
const leerLedger = () => { try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch { return {}; } };
function listaSql() {
  const out = [];
  const ledger = leerLedger();
  const walk = (dir, rel, depth) => {
    if (depth > 4) return;
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name), r = rel + '/' + e.name;
      if (e.isDirectory()) walk(full, r, depth + 1);
      else if (e.name.endsWith('.sql')) out.push({ rel: r.replace(/^\//, ''), mtime: fs.statSync(full).mtimeMs, aplicado: ledger[r.replace(/^\//, '')] || null });
    }
  };
  for (const c of config.carpetasSql) walk(path.join(ROOT, c), c, 0);
  return out.sort((a, b) => b.mtime - a.mtime);
}

// ---------- correr el proyecto ----------
let proc = null, logBuf = [], logSeq = 0, exitInfo = null;
function pushLog(chunk) {
  for (const line of chunk.toString().split('\n')) {
    if (line.trim() === '' && logBuf.length && logBuf[logBuf.length - 1].t === '') continue;
    logBuf.push({ i: logSeq++, t: line });
  }
  if (logBuf.length > 1200) logBuf = logBuf.slice(-1000);
}
function runStart() {
  if (proc) return { ok: false, error: 'Ya hay un proceso corriendo' };
  exitInfo = null; logBuf = []; logSeq = 0;
  pushLog(`$ ${config.comandoRun}\n`);
  proc = spawn(config.comandoRun, {
    cwd: path.resolve(ROOT, config.cwdRun || '.'),
    shell: true,
    detached: process.platform !== 'win32',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  proc.stdout.on('data', pushLog);
  proc.stderr.on('data', pushLog);
  proc.on('exit', (code, sig) => { exitInfo = { code, sig, cuando: Date.now() }; pushLog(`\n[proceso terminó — código ${code ?? sig}]\n`); proc = null; });
  proc.on('error', err => { pushLog(`\n[error al arrancar: ${err.message}]\n`); proc = null; });
  return { ok: true };
}
function runStop() {
  if (!proc) return { ok: false, error: 'No hay proceso corriendo' };
  const p = proc;
  try { process.kill(-p.pid, 'SIGTERM'); } catch { try { p.kill('SIGTERM'); } catch { } }
  setTimeout(() => { if (proc === null) return; try { process.kill(-p.pid, 'SIGKILL'); } catch { try { p.kill('SIGKILL'); } catch { } } }, 3500);
  return { ok: true };
}

// ---------- estado general ----------
function estadoGeneral() {
  const cl = parseChangelog();
  const iEstado = colIndex(cl.headers, 'estado', 5);
  const rows = cl.rows.map(r => r.cells);
  const cuenta = pref => rows.filter(r => (r[iEstado] || '').includes(pref)).length;
  const inboxFile = inboxPath();
  const inboxContenido = inboxFile ? readIf(inboxFile) : null;
  const sinProcesar = inboxContenido ? (inboxContenido.match(/_?Sin procesar\.?_?/gi) || []).length : 0;
  return {
    proyecto: { codigo: codigoProyecto(), root: ROOT, nombre: path.basename(ROOT) },
    changelog: cl.file ? { file: path.basename(cl.file), headers: cl.headers, rows, iEstado } : null,
    inbox: inboxFile ? { file: path.basename(inboxFile), contenido: inboxContenido, sinProcesar } : null,
    specs: listaSpecs(),
    docs: listaDocs(),
    sql: listaSql(),
    memoria: memoriaPath() ? path.basename(memoriaPath()) : null,
    run: { corriendo: !!proc, comando: config.comandoRun, exit: exitInfo },
    alertas: {
      enConstruccion: cuenta('🔄'),
      construidosSinVerificar: cuenta('✅'),
      pendientes: cuenta('🔲'),
      verificados: cuenta('✔️'),
      descartados: cuenta('🚫'),
    },
  };
}

// ---------- HTTP ----------
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && p === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(HTML); }
    if (req.method === 'GET' && p === '/api/estado') return json(res, 200, estadoGeneral());
    if (req.method === 'GET' && p === '/api/archivo') {
      const f = url.searchParams.get('f') || '';
      if (!/\.(md|sql)$/i.test(f)) return json(res, 400, { error: 'Solo .md y .sql' });
      const full = inRoot(f);
      if (!full) return json(res, 400, { error: 'Ruta fuera del proyecto' });
      const c = readIf(full);
      return c === null ? json(res, 404, { error: 'No existe' }) : json(res, 200, { contenido: c });
    }
    if (req.method === 'POST' && p === '/api/inbox') { const b = await body(req); if (!b.texto?.trim()) return json(res, 400, { error: 'Texto vacío' }); capturarInbox(b.texto); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && p === '/api/changelog/estado') { const b = await body(req); return json(res, 200, { ok: true, cells: actualizarEstado(b.id, b.estado, b.nota) }); }
    if (req.method === 'POST' && p === '/api/changelog/nueva') { const b = await body(req); if (!b.descripcion?.trim()) return json(res, 400, { error: 'Falta descripción' }); return json(res, 200, { ok: true, id: agregarFila(b) }); }
    if (req.method === 'PUT' && p === '/api/spec') {
      const b = await body(req);
      const full = inRoot(b.file || '');
      if (!full || !full.startsWith(path.join(ROOT, 'specs') + path.sep) || !full.endsWith('.md')) return json(res, 400, { error: 'Solo archivos dentro de /specs/' });
      fs.writeFileSync(full, b.contenido ?? '');
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && p === '/api/spec/nuevo') {
      const b = await body(req);
      const slug = (b.nombre || '').trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/^-+|-+$/g, '');
      if (!slug) return json(res, 400, { error: 'Falta nombre' });
      const dir = path.join(ROOT, 'specs');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${codigoProyecto()}-${slug}.md`);
      if (fs.existsSync(file)) return json(res, 400, { error: 'Ya existe un spec con ese nombre' });
      fs.writeFileSync(file, PLANTILLA_SPEC(b.nombre.trim()));
      return json(res, 200, { ok: true, file: 'specs/' + path.basename(file) });
    }
    if (req.method === 'POST' && p === '/api/sql/aplicado') {
      const b = await body(req);
      const ledger = leerLedger();
      if (b.aplicado) ledger[b.rel] = new Date().toISOString().slice(0, 10); else delete ledger[b.rel];
      fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && p === '/api/run/start') return json(res, 200, runStart());
    if (req.method === 'POST' && p === '/api/run/stop') return json(res, 200, runStop());
    if (req.method === 'GET' && p === '/api/run/logs') {
      const since = parseInt(url.searchParams.get('since') || '0', 10);
      return json(res, 200, { corriendo: !!proc, exit: exitInfo, lines: logBuf.filter(l => l.i >= since), next: logSeq });
    }
    json(res, 404, { error: 'No existe ese endpoint' });
  } catch (e) { json(res, 500, { error: e.message }); }
});

// ---------- UI ----------
const HTML = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Panel Timón</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧭</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
:root{
  --bg1:#0e1420;--bg2:#131c2e;--panel:#1a2438;--panel2:#212e47;--line:#2e3f5e;
  --tx:#e8edf7;--tx2:#9fb0cc;--acc:#5eb7ff;--acc2:#8f7bff;
  --ok:#3ddc97;--warn:#ffb454;--rosa:#ff6f91;--gris:#7f8db0;
  --grad:linear-gradient(135deg,#5eb7ff,#8f7bff);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;background:linear-gradient(160deg,var(--bg1),var(--bg2) 60%,#1a1530);color:var(--tx);min-height:100vh}
header{display:flex;align-items:center;gap:14px;padding:16px 22px;border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(14,20,32,.92);backdrop-filter:blur(8px);z-index:5}
header h1{font-size:19px;font-weight:700}
header h1 b{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.chip{font-size:12px;padding:3px 10px;border-radius:99px;border:1px solid var(--line);color:var(--tx2)}
nav{display:flex;gap:6px;padding:12px 22px 0;flex-wrap:wrap}
nav button{font-family:inherit;font-size:14px;font-weight:500;background:transparent;color:var(--tx2);border:1px solid transparent;padding:8px 16px;border-radius:10px;cursor:pointer}
nav button:hover{color:var(--tx)}
nav button.on{background:var(--panel);border-color:var(--line);color:var(--tx)}
nav button .n{font-size:11px;margin-left:6px;padding:1px 7px;border-radius:99px;background:var(--panel2);color:var(--acc)}
main{padding:18px 22px 60px;max-width:1180px;margin:0 auto}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.card .num{font-size:26px;font-weight:700}
.card .lbl{font-size:12.5px;color:var(--tx2);margin-top:2px}
.card.alerta{border-color:var(--warn);background:linear-gradient(135deg,rgba(255,180,84,.12),var(--panel))}
.card.bien{border-color:rgba(61,220,151,.5)}
.seccion{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:16px}
.seccion h2{font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.seccion h2::before{content:'';width:9px;height:9px;border-radius:3px;background:var(--grad)}
.tablewrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13.5px}
th{color:var(--tx2);font-weight:500;text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:8px 10px;border-bottom:1px solid rgba(46,63,94,.5);vertical-align:top}
tr:hover td{background:rgba(94,183,255,.05)}
select,input[type=text],textarea{font-family:inherit;font-size:13.5px;background:var(--bg1);color:var(--tx);border:1px solid var(--line);border-radius:9px;padding:7px 10px}
select:focus,input:focus,textarea:focus{outline:none;border-color:var(--acc)}
textarea{width:100%;resize:vertical}
.btn{font-family:inherit;font-size:13.5px;font-weight:500;border:none;border-radius:10px;padding:9px 16px;cursor:pointer;background:var(--grad);color:#0b1020}
.btn.sec{background:var(--panel2);color:var(--tx);border:1px solid var(--line)}
.btn.rojo{background:linear-gradient(135deg,#ff6f91,#ff9b54);color:#20090d}
.btn:disabled{opacity:.45;cursor:default}
.est{white-space:nowrap;font-size:12.5px;padding:2px 9px;border-radius:99px;border:1px solid var(--line)}
.est-p{color:var(--tx2)} .est-c{color:var(--acc)} .est-b{color:var(--warn)} .est-v{color:var(--ok)} .est-d{color:var(--gris);text-decoration:line-through}
.fila-form{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.fila-form input{flex:1;min-width:120px}
.lista{display:flex;flex-direction:column;gap:8px}
.item{display:flex;align-items:center;gap:10px;background:var(--bg1);border:1px solid var(--line);border-radius:12px;padding:11px 14px;cursor:pointer}
.item:hover{border-color:var(--acc)}
.item .meta{margin-left:auto;font-size:12px;color:var(--tx2);white-space:nowrap;display:flex;gap:10px;align-items:center}
.md{line-height:1.65;font-size:14.5px;overflow-x:auto}
.md h1,.md h2,.md h3{margin:16px 0 8px}.md h1{font-size:20px}.md h2{font-size:17px}.md h3{font-size:15px}
.md p{margin:8px 0}.md ul,.md ol{margin:8px 0 8px 22px}
.md code{font-family:'JetBrains Mono',monospace;font-size:12.5px;background:var(--bg1);padding:2px 6px;border-radius:6px}
.md pre{background:var(--bg1);border:1px solid var(--line);border-radius:10px;padding:12px;overflow-x:auto;margin:10px 0}
.md pre code{background:none;padding:0}
.md table{margin:10px 0}.md hr{border:none;border-top:1px solid var(--line);margin:16px 0}
.md blockquote{border-left:3px solid var(--acc2);padding-left:12px;color:var(--tx2);margin:8px 0}
#logs{font-family:'JetBrains Mono',monospace;font-size:12px;background:#0a0f18;border:1px solid var(--line);border-radius:12px;padding:14px;height:420px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;line-height:1.5}
.editorArea{font-family:'JetBrains Mono',monospace;font-size:13px;min-height:420px;line-height:1.55}
.dot{width:9px;height:9px;border-radius:99px;display:inline-block;background:var(--gris)}
.dot.on{background:var(--ok);box-shadow:0 0 8px var(--ok)}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--panel2);border:1px solid var(--acc);border-radius:12px;padding:10px 18px;font-size:13.5px;opacity:0;transition:opacity .25s;pointer-events:none;z-index:20}
.toast.show{opacity:1}
.subtabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.subtabs .btn{padding:6px 12px;font-size:12.5px}
.volver{color:var(--acc);cursor:pointer;font-size:13px;margin-bottom:10px;display:inline-block}
.aviso{font-size:12.5px;color:var(--tx2);margin-top:8px}
@media(max-width:640px){main,header,nav{padding-left:12px;padding-right:12px}}
</style></head>
<body>
<header><h1>🧭 Panel <b id="hCodigo">Timón</b></h1><span class="chip" id="hNombre"></span><span class="chip" style="margin-left:auto"><span class="dot" id="hDot"></span> <span id="hRun">detenido</span></span></header>
<nav id="nav"></nav>
<main id="main">Cargando…</main>
<div class="toast" id="toast"></div>
<script>
let S=null, tab='tablero', specAbierto=null, docAbierto=null, sqlAbierto=null, logNext=0, logTimer=null;
const $=s=>document.querySelector(s);
const esc=s=>(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ESTADOS=['🔲 Pendiente','🔄 En construcción','✅ Construido','✔️ Verificado','🚫 Descartado'];
const claseEst=e=>e.includes('✔️')?'est-v':e.includes('✅')?'est-b':e.includes('🔄')?'est-c':e.includes('🚫')?'est-d':'est-p';
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
async function api(p,opt){const r=await fetch(p,opt);const j=await r.json();if(!r.ok||j.error){toast('⚠️ '+(j.error||r.status));throw new Error(j.error||r.status)}return j}
async function cargar(){S=await api('/api/estado');pintarHeader();pintarNav();pintar()}
function pintarHeader(){$('#hCodigo').textContent=S.proyecto.codigo;$('#hNombre').textContent=S.proyecto.nombre;$('#hDot').className='dot'+(S.run.corriendo?' on':'');$('#hRun').textContent=S.run.corriendo?'corriendo':'detenido'}
function pintarNav(){
  const tabs=[['tablero','Tablero'],['inbox','Inbox',S.inbox?.sinProcesar||0],['specs','Specs',S.specs.length],['sql','SQL',S.sql.filter(s=>!s.aplicado).length],['docs','Docs'],['run','▶ Correr']];
  $('#nav').innerHTML=tabs.map(([id,lbl,n])=>'<button class="'+(tab===id?'on':'')+'" onclick="irA(\\''+id+'\\')">'+lbl+(n?'<span class="n">'+n+'</span>':'')+'</button>').join('');
}
function irA(t){tab=t;specAbierto=docAbierto=sqlAbierto=null;pintarNav();pintar()}
function pintar(){
  const m=$('#main');
  if(tab==='tablero')return pintarTablero(m);
  if(tab==='inbox')return pintarInbox(m);
  if(tab==='specs')return pintarSpecs(m);
  if(tab==='sql')return pintarSql(m);
  if(tab==='docs')return pintarDocs(m);
  if(tab==='run')return pintarRun(m);
}
// ---- Tablero ----
function pintarTablero(m){
  const a=S.alertas;
  let html='<div class="cards">'
    +card(a.pendientes,'🔲 Pendientes')
    +card(a.enConstruccion,'🔄 En construcción',a.enConstruccion>1?'alerta':'')
    +card(a.construidosSinVerificar,'✅ Sin verificar',a.construidosSinVerificar>0?'alerta':'bien')
    +card(a.verificados,'✔️ Verificados','bien')+'</div>';
  if(a.enConstruccion>1)html+='<div class="seccion" style="border-color:var(--warn)"><b>⚠️ '+a.enConstruccion+' frentes abiertos.</b> La regla 18 dice máximo uno — congela los demás explícitamente.</div>';
  if(a.construidosSinVerificar>0)html+='<div class="seccion" style="border-color:var(--warn)"><b>⚠️ Hay '+a.construidosSinVerificar+' construido(s) sin verificar.</b> Deja de empezar, empieza a terminar: corre sus checklists antes de autorizar construcción nueva.</div>';
  html+='<div class="seccion"><h2>Captura rápida al Inbox (Caja de Cristal)</h2><textarea id="qc" rows="2" placeholder="¿Detectaste algo a media construcción? Una línea aquí y de regreso a tu spec…"></textarea><div class="fila-form"><button class="btn" onclick="capturar()">Anotar al inbox</button></div></div>';
  if(S.changelog){
    html+='<div class="seccion"><h2>Changelog — '+esc(S.changelog.file)+'</h2><div class="tablewrap"><table><tr>'+S.changelog.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'<th></th></tr>';
    for(const r of S.changelog.rows){
      html+='<tr>'+r.map((c,i)=>i===S.changelog.iEstado?'<td><span class="est '+claseEst(c)+'">'+esc(c)+'</span></td>':'<td>'+esc(c)+'</td>').join('');
      html+='<td><select onchange="cambiarEstado(\\''+esc(r[0])+'\\',this)"><option value="">cambiar…</option>'+ESTADOS.map(e=>'<option>'+e+'</option>').join('')+'</select></td></tr>';
    }
    html+='</table></div><div class="fila-form"><input type="text" id="nModulo" placeholder="Módulo/Área"><input type="text" id="nQuien" placeholder="Quién pidió"><input type="text" id="nDesc" placeholder="Descripción (sin usar | )" style="flex:3"><button class="btn sec" onclick="nuevaFila()">+ Registrar solicitud</button></div><div class="aviso">✔️ Verificado solo lo marcas tú después de correr el checklist. 🚫 Descartado es un cierre válido — el backlog es un jardín, no una fila.</div></div>';
  } else html+='<div class="seccion">No encontré un CHANGELOG-*.md en el proyecto.</div>';
  m.innerHTML=html;
}
const card=(n,l,cls='')=>'<div class="card '+cls+'"><div class="num">'+n+'</div><div class="lbl">'+l+'</div></div>';
async function capturar(){const t=$('#qc').value.trim();if(!t)return;await api('/api/inbox',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texto:t})});toast('Anotado al inbox — de regreso a tu spec 😉');cargar()}
async function cambiarEstado(id,sel){
  const e=sel.value;if(!e)return;sel.value='';
  if(e.includes('✔️')&&!confirm('Regla de Timón: solo tú puedes marcar Verificado.\\n¿Corriste el checklist de '+id+' y TODO pasó?'))return;
  if(e.includes('🔄')&&(S.alertas.enConstruccion>0||S.alertas.construidosSinVerificar>0)&&!confirm('Regla 18: ya hay '+S.alertas.enConstruccion+' en construcción y '+S.alertas.construidosSinVerificar+' construidos sin verificar.\\n¿Seguro que quieres abrir otro frente?'))return;
  if(e.includes('🚫')&&!confirm('¿Descartar '+id+'? Queda en el changelog como 🚫 (cierre válido, no se borra).'))return;
  let nota=null;
  if(e.includes('✔️'))nota=prompt('Nota corta de verificación (qué probaste):')||'verificado';
  if(e.includes('🚫'))nota=prompt('¿Por qué se descarta? (nota corta):')||'descartado en poda';
  await api('/api/changelog/estado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,estado:e,nota})});
  toast(id+' → '+e);cargar();
}
async function nuevaFila(){
  const d=$('#nDesc').value.trim();if(!d)return toast('Falta la descripción');
  const r=await api('/api/changelog/nueva',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modulo:$('#nModulo').value,quien:$('#nQuien').value,descripcion:d})});
  toast('Registrado como '+r.id);cargar();
}
// ---- Inbox ----
function pintarInbox(m){
  if(!S.inbox)return m.innerHTML='<div class="seccion">No encontré un INBOX-*.md en el proyecto.</div>';
  m.innerHTML='<div class="seccion"><h2>Captura rápida</h2><textarea id="qc" rows="3" placeholder="Pega aquí la idea/bug/solicitud tal cual — sin procesar."></textarea><div class="fila-form"><button class="btn" onclick="capturar()">Anotar al inbox</button></div></div>'
    +'<div class="seccion"><h2>'+esc(S.inbox.file)+'</h2><div class="md">'+md(S.inbox.contenido)+'</div></div>';
}
// ---- Specs ----
function pintarSpecs(m){
  if(specAbierto)return pintarEditorSpec(m);
  let html='<div class="seccion"><h2>Specs</h2><div class="fila-form" style="margin-bottom:12px"><input type="text" id="nSpec" placeholder="Nombre del spec nuevo…"><button class="btn sec" onclick="nuevoSpec()">+ Crear desde plantilla</button></div><div class="lista">';
  if(!S.specs.length)html+='<div class="aviso">Sin specs todavía.</div>';
  for(const s of S.specs)html+='<div class="item" onclick="abrirSpec(\\''+esc(s.file)+'\\')"><span>📄 '+esc(s.nombre)+'</span><span class="meta"><span class="est '+(/cerrado/i.test(s.estado)?'est-v':'est-c')+'">'+esc(s.estado)+'</span></span></div>';
  m.innerHTML=html+'</div></div>';
}
async function abrirSpec(f){const r=await api('/api/archivo?f='+encodeURIComponent(f));specAbierto={file:f,contenido:r.contenido};pintar()}
function pintarEditorSpec(m){
  m.innerHTML='<span class="volver" onclick="specAbierto=null;pintar()">← Volver a specs</span>'
    +'<div class="seccion"><h2>'+esc(specAbierto.file)+'</h2><div class="subtabs"><button class="btn sec" id="btnVer" onclick="modoSpec(0)">Vista</button><button class="btn sec" id="btnEd" onclick="modoSpec(1)">Editar</button><button class="btn" onclick="guardarSpec()">Guardar</button></div>'
    +'<div id="specVista" class="md">'+md(specAbierto.contenido)+'</div>'
    +'<textarea id="specTxt" class="editorArea" style="display:none">'+esc(specAbierto.contenido)+'</textarea></div>';
}
function modoSpec(ed){$('#specVista').style.display=ed?'none':'block';$('#specTxt').style.display=ed?'block':'none';if(!ed){specAbierto.contenido=$('#specTxt').value;$('#specVista').innerHTML=md(specAbierto.contenido)}}
async function guardarSpec(){specAbierto.contenido=$('#specTxt').style.display==='none'?specAbierto.contenido:$('#specTxt').value;await api('/api/spec',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:specAbierto.file,contenido:specAbierto.contenido})});toast('Spec guardado')}
async function nuevoSpec(){const n=$('#nSpec').value.trim();if(!n)return;const r=await api('/api/spec/nuevo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:n})});await cargar();abrirSpec(r.file)}
// ---- SQL ----
function pintarSql(m){
  if(sqlAbierto)return pintarVerSql(m);
  let html='<div class="seccion"><h2>SQL del proyecto</h2><div class="aviso" style="margin-bottom:10px">v1 segura: aquí los ves y los copias para pegarlos en Supabase/tu editor SQL. El check de "aplicado" es solo tu registro.</div><div class="lista">';
  if(!S.sql.length)html+='<div class="aviso">No hay archivos .sql en las carpetas configuradas (sql, migrations, db, database, supabase/migrations — se ajusta en timon.config.json).</div>';
  for(const s of S.sql)html+='<div class="item"><input type="checkbox" '+(s.aplicado?'checked':'')+' onclick="event.stopPropagation();marcarSql(\\''+esc(s.rel)+'\\',this.checked)"><span onclick="abrirSql(\\''+esc(s.rel)+'\\')" style="flex:1">🗄️ '+esc(s.rel)+'</span><span class="meta">'+(s.aplicado?'<span class="est est-v">aplicado '+esc(s.aplicado)+'</span>':'<span class="est est-b">pendiente</span>')+'</span></div>';
  m.innerHTML=html+'</div></div>';
}
async function abrirSql(rel){const r=await api('/api/archivo?f='+encodeURIComponent(rel));sqlAbierto={rel,contenido:r.contenido};pintar()}
function pintarVerSql(m){
  m.innerHTML='<span class="volver" onclick="sqlAbierto=null;pintar()">← Volver a SQL</span>'
    +'<div class="seccion"><h2>'+esc(sqlAbierto.rel)+'</h2><div class="subtabs"><button class="btn" onclick="copiarSql()">📋 Copiar todo</button></div><pre class="md"><code>'+esc(sqlAbierto.contenido)+'</code></pre></div>';
}
async function copiarSql(){await navigator.clipboard.writeText(sqlAbierto.contenido);toast('SQL copiado — pégalo en tu editor de base de datos')}
async function marcarSql(rel,v){await api('/api/sql/aplicado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rel,aplicado:v})});cargar()}
// ---- Docs ----
function pintarDocs(m){
  if(docAbierto)return;
  let html='<div class="seccion"><h2>Documentos del proyecto</h2><div class="lista">';
  for(const d of S.docs)html+='<div class="item" onclick="abrirDoc(\\''+esc(d)+'\\')"><span>📘 '+esc(d)+'</span></div>';
  m.innerHTML=html+'</div></div>';
}
async function abrirDoc(f){const r=await api('/api/archivo?f='+encodeURIComponent(f));$('#main').innerHTML='<span class="volver" onclick="pintar()">← Volver a docs</span><div class="seccion"><h2>'+esc(f)+'</h2><div class="md">'+md(r.contenido)+'</div></div>'}
// ---- Correr ----
function pintarRun(m){
  m.innerHTML='<div class="seccion"><h2>Correr el proyecto</h2><div class="fila-form" style="align-items:center"><code style="background:var(--bg1);padding:8px 12px;border-radius:9px;font-family:JetBrains Mono,monospace;font-size:13px">'+esc(S.run.comando)+'</code>'
    +'<button class="btn" id="btnStart" onclick="runStart()" '+(S.run.corriendo?'disabled':'')+'>▶ Iniciar</button>'
    +'<button class="btn rojo" id="btnStop" onclick="runStop()" '+(S.run.corriendo?'':'disabled')+'>■ Detener</button></div>'
    +'<div class="aviso">El comando se cambia en <code>timon.config.json</code> (campo <code>comandoRun</code>). Los logs aparecen abajo — sin ventana de terminal.</div></div>'
    +'<div class="seccion"><h2>Logs</h2><div id="logs"></div></div>';
  logNext=0;$('#logs').textContent='';pollLogs();
}
async function runStart(){await api('/api/run/start',{method:'POST'});toast('Arrancando…');setTimeout(cargarSiRun,600)}
async function runStop(){await api('/api/run/stop',{method:'POST'});toast('Deteniendo…');setTimeout(cargarSiRun,800)}
async function cargarSiRun(){S=await api('/api/estado');pintarHeader();if(tab==='run'){$('#btnStart').disabled=S.run.corriendo;$('#btnStop').disabled=!S.run.corriendo}}
async function pollLogs(){
  if(tab!=='run')return;
  try{
    const r=await api('/api/run/logs?since='+logNext);
    if(r.lines.length){const el=$('#logs');const abajo=el.scrollTop+el.clientHeight>=el.scrollHeight-30;el.textContent+=r.lines.map(l=>l.t).join('\\n')+'\\n';logNext=r.next;if(abajo)el.scrollTop=el.scrollHeight}
    const dot=$('#hDot');if(dot){dot.className='dot'+(r.corriendo?' on':'');$('#hRun').textContent=r.corriendo?'corriendo':'detenido'}
    if($('#btnStart')){$('#btnStart').disabled=r.corriendo;$('#btnStop').disabled=!r.corriendo}
  }catch(e){}
  clearTimeout(logTimer);logTimer=setTimeout(pollLogs,1500);
}
// ---- mini renderizador markdown ----
function md(src){
  if(!src)return'';
  const lines=src.split('\\n');let out=[],inCode=false,inList=false,tabla=[];
  const flushTabla=()=>{if(!tabla.length)return;let h='<div class="tablewrap"><table>';tabla.forEach((cells,i)=>{if(cells.every(c=>/^[-:\\s]*$/.test(c)))return;h+='<tr>'+cells.map(c=>(i===0?'<th>':'<td>')+inline(c)+(i===0?'</th>':'</td>')).join('')+'</tr>'});out.push(h+'</table></div>');tabla=[]};
  const cerrarLista=()=>{if(inList){out.push('</ul>');inList=false}};
  const inline=s=>esc(s).replace(/\\*\\*([^*]+)\\*\\*/g,'<b>$1</b>').replace(/\`([^\`]+)\`/g,'<code>$1</code>').replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g,'<a href="$2" target="_blank" style="color:var(--acc)">$1</a>');
  for(const raw of lines){
    const l=raw;
    if(l.trim().startsWith('\`\`\`')){flushTabla();cerrarLista();out.push(inCode?'</code></pre>':'<pre><code>');inCode=!inCode;continue}
    if(inCode){out.push(esc(l)+'\\n');continue}
    if(l.trim().startsWith('|')){cerrarLista();tabla.push(l.trim().split('|').slice(1,-1).map(c=>c.trim()));continue}
    flushTabla();
    if(/^#{1,4}\\s/.test(l)){cerrarLista();const n=l.match(/^#+/)[0].length;out.push('<h'+Math.min(n,3)+'>'+inline(l.replace(/^#+\\s*/,''))+'</h'+Math.min(n,3)+'>');continue}
    if(/^---+\\s*$/.test(l.trim())){cerrarLista();out.push('<hr>');continue}
    if(/^\\s*[-*]\\s/.test(l)){if(!inList){out.push('<ul>');inList=true}out.push('<li>'+inline(l.replace(/^\\s*[-*]\\s/,''))+'</li>');continue}
    if(/^>\\s?/.test(l)){cerrarLista();out.push('<blockquote>'+inline(l.replace(/^>\\s?/,''))+'</blockquote>');continue}
    if(l.trim()===''){cerrarLista();continue}
    cerrarLista();out.push('<p>'+inline(l)+'</p>');
  }
  flushTabla();cerrarLista();if(inCode)out.push('</code></pre>');
  return out.join('');
}
cargar();setInterval(()=>{if(tab!=='run'&&!specAbierto&&!docAbierto&&!sqlAbierto)cargar()},20000);
</script>
</body></html>`;

// ---------- arranque ----------
function listen(puerto, intentos = 0) {
  server.once('error', err => {
    if (err.code === 'EADDRINUSE' && intentos < 10) {
      console.log(`Puerto ${puerto} ocupado, probando ${puerto + 1}…`);
      listen(puerto + 1, intentos + 1);
    } else { console.error('No pude arrancar el panel:', err.message); process.exit(1); }
  });
  server.listen(puerto, '127.0.0.1', () => {
    const url = `http://localhost:${puerto}`;
    console.log(`\n  🧭 Panel Timón — proyecto ${codigoProyecto()}`);
    console.log(`  Carpeta: ${ROOT}`);
    console.log(`  Abierto en ${url}  (Ctrl+C para cerrar)\n`);
    try {
      const abrir = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      spawn(abrir, [url], { shell: process.platform === 'win32', stdio: 'ignore', detached: true }).unref();
    } catch { /* abrir manualmente */ }
  });
}
listen(config.puerto);
process.on('SIGINT', () => { if (proc) runStop(); setTimeout(() => process.exit(0), 300); });
