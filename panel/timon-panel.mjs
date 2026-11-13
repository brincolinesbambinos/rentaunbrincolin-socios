#!/usr/bin/env node
/**
 * Panel Timón v2 — tablero local, uno o varios proyectos.
 * Un solo archivo, cero dependencias. Requiere Node 18+.
 *
 * Dos modos, se detecta solo:
 *   • MULTI — si lo abres en una carpeta que CONTIENE proyectos (ej. /Plataformas/):
 *     descubre todos los proyectos Timón adentro y los controla desde un mismo panel.
 *   • SENCILLO — si lo abres dentro de un proyecto: solo ese, como siempre.
 *
 * Arranque:  node timon-panel.mjs [carpeta]   (o doble clic en Panel-Timon.command)
 *            node timon-panel.mjs --central   (panel único: busca fichas .tmn en tus carpetas raíz)
 * Se abre en http://localhost:4444
 *
 * Los .md de cada proyecto siguen siendo la fuente de verdad — el panel solo los lee
 * y escribe. Solo escucha en 127.0.0.1.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// Base de cobro de Timón (Ajustes): cada proyecto la usa salvo que tenga su precio especial (TMN-042)
const cobroBase = () => ({ valorPunto: num((CONFIG_BASE || {}).valorPunto) || 400, bolsaPct: (CONFIG_BASE || {}).bolsaPct === undefined ? 12 : num(CONFIG_BASE.bolsaPct), costoHora: num((CONFIG_BASE || {}).costoHora) || 0, iaMensual: num((CONFIG_BASE || {}).iaMensual) || 0 });
const DEFAULTS = {
  puerto: 4444,
  comandoRun: 'npm run dev',
  cwdRun: '.',
  carpetasSql: ['sql', 'migrations', 'db', 'database', 'supabase/migrations'],
};
const IGNORAR = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.venv', 'vendor', 'Library', '.cache', 'coverage', '.turbo', 'panel', '_to_delete', 'archivo', 'archivo-v1', 'respaldo-v1', 'Claude outputs', '__pycache__', '_respaldos', 'plantilla-proyecto-nuevo', 'nuevo proyecto', '.timon']);

// ---------- detección de proyectos ----------
const leer = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
function esProyecto(d) {
  try {
    const f = fs.readdirSync(d);
    return f.includes('00-MARCO.md') || f.includes('CLAUDE.md') || f.some(x => x.endsWith('.tmn'))
      || f.some(x => /^CHANGELOG-.+\.md$/i.test(x)) || f.some(x => /^INBOX-.+\.md$/i.test(x));
  } catch { return false; }
}
// Raíz de proyecto para la búsqueda: tiene .tmn, o es Timón (changelog o Marco). Un CLAUDE.md solo no basta:
// así una carpeta contenedora (ej. Idea/ con su CLAUDE.md) no tapa al proyecto real que vive adentro.
function esRaizProyecto(d) {
  try {
    const f = fs.readdirSync(d);
    return f.some(x => x.endsWith('.tmn')) || f.includes('00-MARCO.md')
      || f.some(x => /^CHANGELOG-.+\.md$/i.test(x) && !/\[CODIGO\]|archivo/i.test(x));
  } catch { return false; }
}
function buscarProyectos(padre, prof = 0, out = []) {
  if (prof > 4) return out;
  let entradas; try { entradas = fs.readdirSync(padre, { withFileTypes: true }); } catch { return out; }
  for (const e of entradas) {
    if (!e.isDirectory() || e.name.startsWith('.') || IGNORAR.has(e.name)) continue;
    const d = path.join(padre, e.name);
    if (esRaizProyecto(d)) out.push(d); else buscarProyectos(d, prof + 1, out);
  }
  return out;
}
function cargarConfig(dir) {
  try { return { ...DEFAULTS, ...JSON.parse(leer(path.join(dir, 'timon.config.json')) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

// dónde buscar: argumento, o la carpeta del script / su padre
// Modo central (--central): un solo panel para todo; busca proyectos en las carpetas raíz y guarda su
// configuración en ~/.timon/panel.json. Sin --central funciona como siempre.
const MODO_CENTRAL = process.argv.includes('--central');
const argRuta = process.argv.slice(2).find(a => !a.startsWith('-'));
let BASE = MODO_CENTRAL ? os.homedir() : argRuta ? path.resolve(argRuta.replace(/^~/, os.homedir())) : SCRIPT_DIR;
if (!MODO_CENTRAL && !argRuta && !esProyecto(BASE) && esProyecto(path.dirname(BASE))) BASE = path.dirname(BASE);
const CONFIG_FILE = MODO_CENTRAL ? path.join(os.homedir(), '.timon', 'panel.json') : path.join(BASE, 'timon.config.json');
const RAICES_DEFAULT = ['~/Downloads/Plataformas', '~/Developer', '~/Downloads/Sistemas'];
function leerConfigBase() {
  let c; try { c = JSON.parse(leer(CONFIG_FILE) || '{}'); } catch { c = {}; }
  if (MODO_CENTRAL && !Array.isArray(c.carpetasProyectos)) c.carpetasProyectos = RAICES_DEFAULT;
  if (MODO_CENTRAL && !c.puerto) c.puerto = 4400; // así no choca con los paneles de cada proyecto (4444)
  return { ...DEFAULTS, ...c };
}
let CONFIG_BASE = leerConfigBase();
const abs = r => path.resolve(BASE, String(r).replace(/^~/, os.homedir()));
function guardarConfigBase() {
  const { comandoRun, cwdRun, carpetasSql, ...propio } = CONFIG_BASE; // no persistir los defaults heredados
  const guardar = { puerto: CONFIG_BASE.puerto, ...propio };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(guardar, null, 2));
  CONFIG_BASE = leerConfigBase();
}

// ---------- dónde vive Timón (la plantilla + el actualizador) ----------
function detectarTimon() {
  if (CONFIG_BASE.rutaTimon) { const r = abs(CONFIG_BASE.rutaTimon); if (esTimonValido(r)) return r; }
  const candidatos = [
    path.join(BASE, 'sistema-timon'), path.join(path.dirname(BASE), 'sistema-timon'),
    path.join(os.homedir(), 'Downloads', 'sistema-timon'), path.join(os.homedir(), 'Downloads', 'Sistemas', 'sistema-timon'), path.join(os.homedir(), 'sistema-timon'),
    path.join(BASE, 'timon'), path.join(path.dirname(BASE), 'timon'),
  ];
  return candidatos.find(esTimonValido) || null;
}
const NOMBRES_PLANTILLA = ['plantilla-proyecto-nuevo', 'nuevo proyecto'];
const carpetaPlantilla = d => { try { return NOMBRES_PLANTILLA.map(n => path.join(d, n)).find(x => fs.existsSync(x)) || null; } catch { return null; } };
const esTimonValido = d => !!carpetaPlantilla(d);
let RUTA_TIMON = detectarTimon();
const plantillaDir = () => RUTA_TIMON ? carpetaPlantilla(RUTA_TIMON) : null;

let PROYECTOS = [];
function descubrir() {
  CONFIG_BASE = leerConfigBase();
  const rutas = [];
  const registrados = Array.isArray(CONFIG_BASE.proyectos) ? CONFIG_BASE.proyectos : [];
  const quitados = new Set((Array.isArray(CONFIG_BASE.ocultos) ? CONFIG_BASE.ocultos : []).map(abs));

  if (Array.isArray(CONFIG_BASE.carpetasProyectos) && CONFIG_BASE.carpetasProyectos.length) {
    for (const r of CONFIG_BASE.carpetasProyectos) {
      const d = abs(r);
      if (esRaizProyecto(d)) rutas.push(d); else rutas.push(...buscarProyectos(d));
    }
  } else if (esProyecto(BASE)) rutas.push(BASE);
  else {
    rutas.push(...buscarProyectos(BASE));
    if (!rutas.length && esProyecto(path.dirname(BASE))) rutas.push(path.dirname(BASE));
  }
  for (const r of registrados) { const d = abs(r); if (fs.existsSync(d)) rutas.push(d); }
  for (let i = rutas.length - 1; i >= 0; i--) if (quitados.has(rutas[i])) rutas.splice(i, 1);
  PROYECTOS = [...new Set(rutas)].map(ruta => {
    const cfg = cargarConfig(ruta);
    const cl = archivoRaiz(ruta, /^CHANGELOG-[^.]+\.md$/i);
    const m = cl && path.basename(cl).match(/^CHANGELOG-(.+)\.md$/i);
    const t = leerTmn(ruta), d = (t && t.datos) || {};
    const codigo = d.codigo || cfg.codigo || (m ? m[1] : path.basename(ruta).slice(0, 6).toUpperCase());
    return {
      id: Buffer.from(ruta).toString('base64url').slice(-24), ruta, cfg, codigo,
      nombre: d.nombre || path.basename(ruta),
      tmn: t ? d : null, tmnFile: t ? t.file : null, tmnError: t ? t.error || null : null,
      cliente: d.cliente || '', marca: d.marca || '', estado: d.estado || '', color: d.color || '', descripcion: d.descripcion || '',
      etapa: d.etapa || '', timonVersion: d.timonVersion || '',
    };
  }).sort((a, b) => (a.cliente || '~').localeCompare(b.cliente || '~') || a.nombre.localeCompare(b.nombre));
}
function archivoRaiz(raiz, re) {
  try { const f = fs.readdirSync(raiz).find(f => re.test(f) && !/archivo/i.test(f)); return f ? path.join(raiz, f) : null; } catch { return null; }
}
const proyPorId = id => PROYECTOS.find(p => p.id === id) || PROYECTOS[0];

// ---------- archivo .tmn (ficha del proyecto) ----------
// JSON en la raíz del proyecto (proyecto.tmn). Ver README-PANEL.md para el formato.
const tmnDe = d => { try { const f = fs.readdirSync(d).find(x => x.endsWith('.tmn')); return f ? path.join(d, f) : null; } catch { return null; } };
function leerTmn(d) {
  const f = tmnDe(d);
  if (!f) return null;
  try { return { file: f, datos: JSON.parse(leer(f) || '{}') }; }
  catch (e) { return { file: f, datos: {}, error: 'El .tmn no es JSON válido: ' + e.message }; }
}
const ESTADOS_TMN = ['activo', 'pausado', 'entregado', 'idea'];
function lanzadoresDe(p) {
  const l = p.tmn && Array.isArray(p.tmn.lanzadores) ? p.tmn.lanzadores.filter(x => x && x.comando) : [];
  if (l.length) return l.map(x => ({ nombre: x.nombre || x.comando, comando: x.comando, carpeta: x.carpeta || '.', url: x.url || '' }));
  return [{ nombre: 'Desarrollo', comando: p.cfg.comandoRun || DEFAULTS.comandoRun, carpeta: p.cfg.cwdRun || '.', url: '', sugerido: !p.tmn }];
}
function sugerirTmn(p) {
  const ls = d => { try { return fs.readdirSync(d); } catch { return []; } };
  const raiz = ls(p.ruta);
  const lanzadores = [];
  const deNpm = (dir, rel) => {
    let pkg; try { pkg = JSON.parse(leer(path.join(dir, 'package.json')) || 'null'); } catch { pkg = null; }
    if (!pkg || !pkg.scripts) return false;
    const deps = JSON.stringify({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
    const url = /"next"/.test(deps) ? 'http://localhost:3000' : /"vite"/.test(deps) ? 'http://localhost:5173' : '';
    if (pkg.scripts.dev) lanzadores.push({ nombre: rel === '.' ? 'Desarrollo' : 'Desarrollo · ' + rel, comando: 'npm run dev', carpeta: rel, url });
    else if (pkg.scripts.start) lanzadores.push({ nombre: rel === '.' ? 'Iniciar' : 'Iniciar · ' + rel, comando: 'npm start', carpeta: rel, url });
    else return false;
    return true;
  };
  if (p.cfg.comandoRun && p.cfg.comandoRun !== DEFAULTS.comandoRun) lanzadores.push({ nombre: 'Desarrollo', comando: p.cfg.comandoRun, carpeta: p.cfg.cwdRun || '.', url: '' });
  if (!lanzadores.length && !deNpm(p.ruta, '.')) {
    for (const sub of raiz.filter(x => !IGNORAR.has(x) && !x.startsWith('.')).slice(0, 40))
      if (lanzadores.length < 3 && fs.existsSync(path.join(p.ruta, sub, 'package.json'))) deNpm(path.join(p.ruta, sub), sub);
  }
  for (const c of raiz.filter(x => x.endsWith('.command') && !/diagn|crear|empaquet|mudar|actualizar|adelgazar|panel-timon/i.test(x)))
    lanzadores.push({ nombre: c.replace(/\.command$/, ''), comando: 'zsh "./' + c + '"', carpeta: '.', url: '' });
  if (!lanzadores.length) for (const h of ['index.html', 'app/index.html', 'public/index.html'])
    if (fs.existsSync(path.join(p.ruta, h))) { lanzadores.push({ nombre: 'Abrir en el navegador', comando: 'open "' + h + '"', carpeta: '.', url: '' }); break; }
  const marco = leer(path.join(p.ruta, '00-MARCO.md')) || '';
  const titulo = (marco.match(/^#\s+(.+)$/m) || [])[1] || '';
  const partes = titulo.split(/\s+[—·-]\s+/).map(x => x.trim()).filter(Boolean);
  const nombre = (partes.length > 1 ? partes[partes.length - 1] : '').replace(/\s*\([^)]*\)\s*$/, '') || path.basename(p.ruta);
  const que = (marco.match(/##\s*Qu[eé] es[^\n]*\n+([^\n#][^\n]*)/i) || [])[1] || '';
  const padre = path.dirname(p.ruta);
  const raices = (CONFIG_BASE.carpetasProyectos || []).map(abs);
  const cliente = raices.includes(padre) ? '' : path.basename(padre);
  return {
    timon: 1, nombre, codigo: p.codigo, cliente, marca: '', estado: 'activo', color: '',
    descripcion: que.replace(/\*\*/g, '').slice(0, 220), lanzadores, ligas: [], relacionados: [],
  };
}
function guardarTmn(p, datos) {
  const prev = (leerTmn(p.ruta) || {}).datos || {};
  const limpio = {
    ...prev,
    timon: 1,
    nombre: String(datos.nombre || p.nombre).trim(), codigo: String(datos.codigo || p.codigo).trim(),
    cliente: String(datos.cliente || '').trim(), marca: String(datos.marca || '').trim(),
    estado: ESTADOS_TMN.includes(datos.estado) ? datos.estado : 'activo',
    etapa: ETAPAS.includes(datos.etapa) ? datos.etapa : (prev.etapa || ''),
    tamano: TAMANOS.includes(datos.tamano) ? datos.tamano : (prev.tamano || ''),
    color: /^#[0-9a-f]{6}$/i.test(datos.color || '') ? datos.color : '',
    descripcion: String(datos.descripcion || '').trim(),
    lanzadores: (Array.isArray(datos.lanzadores) ? datos.lanzadores : []).filter(x => x && String(x.comando || '').trim())
      .map(x => ({ nombre: String(x.nombre || '').trim() || String(x.comando).trim(), comando: String(x.comando).trim(), carpeta: String(x.carpeta || '.').trim() || '.', url: String(x.url || '').trim() })),
    ligas: (Array.isArray(datos.ligas) ? datos.ligas : []).filter(x => x && /^https?:\/\//.test(x.url || '')).map(x => ({ nombre: String(x.nombre || x.url).trim(), url: x.url.trim() })),
    relacionados: (Array.isArray(datos.relacionados) ? datos.relacionados : String(datos.relacionados || '').split(','))
      .map(x => String(x).trim()).filter(Boolean),
  };
  const file = p.tmnFile || path.join(p.ruta, 'proyecto.tmn');
  fs.writeFileSync(file, JSON.stringify(limpio, null, 2) + '\n');
  return path.basename(file);
}

// ---------- Biblioteca (lector de archivos) ----------
// El panel usa el editor de Sistemas (editor-servidor.mjs) como lector: lo arranca si no está corriendo
// y lo abre apuntado a la carpeta del proyecto (?raiz=…&todos=1).
const PUERTO_BIB = 4410;
let procBib = null;
function rutaBiblioteca() {
  const cand = [CONFIG_BASE.biblioteca && abs(CONFIG_BASE.biblioteca), RUTA_TIMON && path.join(path.dirname(RUTA_TIMON), 'editor-servidor.mjs'),
    path.join(os.homedir(), 'Downloads', 'Sistemas', 'editor-servidor.mjs'), path.join(SCRIPT_DIR, '..', '..', '..', 'editor-servidor.mjs')].filter(Boolean);
  return cand.find(f => fs.existsSync(f)) || null;
}
const pingBib = async () => { try { const r = await fetch(`http://127.0.0.1:${PUERTO_BIB}/api/ping`, { signal: AbortSignal.timeout(800) }); return r.ok; } catch { return false; } };
async function asegurarBiblioteca() {
  if (await pingBib()) return true;
  const f = rutaBiblioteca();
  if (!f) throw new Error('No encontré editor-servidor.mjs (la Biblioteca de Sistemas)');
  if (!procBib) {
    procBib = spawn(process.execPath, [f], { cwd: path.dirname(f), stdio: 'ignore', env: { ...process.env, PORT: String(PUERTO_BIB) } });
    procBib.on('exit', () => { procBib = null; });
  }
  for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 150)); if (await pingBib()) return true; }
  throw new Error('La Biblioteca no respondió');
}

// ---------- archivos del proyecto ----------
const EXT_TEXTO = /\.(md|markdown|txt|json|tmn|js|mjs|cjs|ts|tsx|jsx|css|scss|html|htm|py|sql|yml|yaml|toml|ini|env\.example|sh|command|csv|svg|xml|gitignore|prisma|vue|svelte|rb|go|rs|swift|kt|java|c|h|cpp)$/i;
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', mp4: 'video/mp4', mov: 'video/quicktime', ico: 'image/x-icon' };
function listarCarpeta(p, rel) {
  const dir = dentro(p.ruta, rel || '.');
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error('Esa carpeta no existe en el proyecto');
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store' || e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name), r = path.relative(p.ruta, full);
    let size = 0, mtime = 0;
    try { const st = fs.statSync(full); size = st.size; mtime = st.mtimeMs; } catch { }
    out.push({ nombre: e.name, rel: r, dir: e.isDirectory(), size, mtime, oculto: e.name.startsWith('.') || IGNORAR.has(e.name) });
  }
  return out.sort((a, b) => (b.dir - a.dir) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }));
}
function esTexto(full) {
  if (EXT_TEXTO.test(full)) return true;
  try { const fd = fs.openSync(full, 'r'); const b = Buffer.alloc(4096); const n = fs.readSync(fd, b, 0, 4096, 0); fs.closeSync(fd); return n === 0 || !b.subarray(0, n).includes(0); } catch { return false; }
}
function leerArchivoProyecto(p, rel) {
  const full = dentro(p.ruta, rel || '');
  if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) throw new Error('No existe ese archivo');
  const size = fs.statSync(full).size, ext = (path.extname(full).slice(1) || '').toLowerCase();
  if (MIME[ext] && ext !== 'svg') return { tipo: 'medio', mime: MIME[ext], size };
  if (size > 1.5 * 1024 * 1024) return { tipo: 'grande', size };
  if (!esTexto(full)) return { tipo: 'binario', size };
  return { tipo: 'texto', contenido: leer(full), size, ext };
}
function guardarArchivoProyecto(p, rel, contenido) {
  const full = dentro(p.ruta, rel || '');
  if (!full || full === p.ruta) throw new Error('Ruta fuera del proyecto');
  if (fs.existsSync(full) && !esTexto(full)) throw new Error('Solo se pueden editar archivos de texto');
  if (!fs.existsSync(full) && !/\.(md|txt|tmn|json)$/i.test(full)) throw new Error('Desde el panel solo se crean archivos .md, .txt, .json o .tmn');
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const existia = fs.existsSync(full);
  if (existia && (leer(full) ?? '') === String(contenido ?? '')) return;
  const resp = existia ? respaldarArchivo(p, full) : null;
  fs.writeFileSync(full, String(contenido ?? ''));
  if (!/^\.timon[\\/]/.test(path.relative(p.ruta, full))) anotarEdicion(p, (existia ? 'Editado a mano: ' : 'Creado: ') + '`' + path.relative(p.ruta, full) + '`' + (resp ? ' · respaldo `' + resp + '`' : ''));
}
// abrir en la Mac: carpeta en Finder, archivo con su app, Terminal en la carpeta, o una URL
function abrirEnMac(p, { tipo, rel, url }) {
  const bin = process.platform === 'darwin' ? 'open' : 'xdg-open';
  let args;
  if (tipo === 'url') { if (!/^https?:\/\//.test(url || '')) throw new Error('URL inválida'); args = [url]; }
  else {
    const full = dentro(p.ruta, rel || '.');
    if (!full || !fs.existsSync(full)) throw new Error('No existe esa ruta en el proyecto');
    if (tipo === 'finder') args = fs.statSync(full).isDirectory() ? [full] : ['-R', full];
    else if (tipo === 'terminal') args = process.platform === 'darwin' ? ['-a', 'Terminal', fs.statSync(full).isDirectory() ? full : path.dirname(full)] : [full];
    else if (tipo === 'app') args = [full];
    else throw new Error('Tipo de apertura desconocido');
  }
  spawn(bin, args, { stdio: 'ignore', detached: true }).unref();
}

// ---------- rutas seguras ----------
const dentro = (raiz, p) => { const r = path.resolve(raiz, p); return r === raiz || r.startsWith(raiz + path.sep) ? r : null; };
const changelogDe = p => archivoRaiz(p.ruta, /^CHANGELOG-[^.]+\.md$/i);
const inboxDe = p => archivoRaiz(p.ruta, /^INBOX-[^.]+\.md$/i);

// ---------- changelog ----------
// Parte una fila de tabla markdown en celdas, respetando \| y los | dentro de `código`.
function celdasFila(l) {
  const t = l.trim().replace(/^\|/, '').replace(/\|$/, '');
  const out = []; let cur = '', code = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '\\' && t[i + 1] === '|') { cur += '\\|'; i++; continue; }
    if (ch === '`') code = !code;
    if (ch === '|' && !code) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
function parseChangelog(p) {
  const file = changelogDe(p);
  if (!file) return { file: null, headers: [], rows: [], lines: [] };
  const lines = (leer(file) || '').split('\n');
  let headers = [], rows = [], headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) continue;
    const cells = celdasFila(l);
    if (headerIdx === -1) { headers = cells; headerIdx = i; continue; }
    if (/^[-:\s|]+$/.test(l)) continue;
    if (cells.length && cells.some(c => c !== '')) rows.push({ i, cells });
  }
  // TMN-056: filas con columnas de más (una columna extra o barras sin escapar dentro del texto).
  // Se busca dónde quedó el Estado y lo que sobra se junta en la Descripción; al escribir se usa la fila original (raw).
  const iE = colIndex(headers, 'estado', 5), iDsc = (i => i >= 0 && i < iE ? i : Math.max(0, iE - 1))(idxCol(headers, /descrip|solicitud/i));
  for (const r of rows) {
    r.raw = r.cells; r.d = 0;
    if (RE_ESTADO_CELDA.test(r.cells[iE] || '')) continue;
    const k = r.cells.findIndex((c, j) => j > iE && RE_ESTADO_CELDA.test(c));
    if (k < 0) continue;
    const d = k - iE;
    r.d = d; r.dsc = iDsc;
    r.cells = [...r.raw.slice(0, iDsc), r.raw.slice(iDsc, iDsc + d + 1).filter(Boolean).join(' · '), ...r.raw.slice(iDsc + d + 1)];
  }
  return { file, headers, rows, lines };
}
const RE_ESTADO_CELDA = /^(🔲|🔄|🔨|✅|✔️|✔|🚫|⏸️?|❌|✖️|🟡|🕓|📋|↪️|⏳)|^(pendiente|verificad|construid|en construcci|descartad|pausad)/i;
// índice de la fila original para una columna del encabezado
const iRaw = (r, h) => (r.d && h > r.dsc ? h + r.d : h);
const colIndex = (h, n, fb) => { const i = h.findIndex(x => x.toLowerCase().includes(n)); return i >= 0 ? i : fb; };
function actualizarEstado(p, id, estado, nota, agregar = false) {
  const cl = parseChangelog(p);
  if (!cl.file) throw new Error('Este proyecto no tiene changelog');
  const row = cl.rows.find(r => r.cells[0] === id);
  if (!row) throw new Error(`No encontré la fila ${id}`);
  const R = [...row.raw];
  R[iRaw(row, colIndex(cl.headers, 'estado', 5))] = estado;
  if (nota) { const iv = iRaw(row, colIndex(cl.headers, 'verificaci', 7)), prev = (R[iv] || '').trim(); R[iv] = agregar && prev ? prev + ' · ' + nota : nota; }
  cl.lines[row.i] = '| ' + R.join(' | ') + ' |';
  fs.writeFileSync(cl.file, cl.lines.join('\n'));
  return row.cells;
}
function agregarFila(p, { modulo = '', quien = '', descripcion, herramienta = '', tipo = '', donde = '' }) {
  if (tipo || donde) asegurarColumnas(p);
  const cl = parseChangelog(p);
  if (!cl.file) throw new Error('Este proyecto no tiene changelog');
  let max = 0;
  for (const r of cl.rows) { const m = r.cells[0].match(/-(\d+)\s*$/); if (m) max = Math.max(max, +m[1]); }
  const id = `${p.codigo}-${String(max + 1).padStart(3, '0')}`;
  // cada valor va a su columna por nombre (no todos los changelogs tienen el mismo orden)
  const H = cl.headers.length ? cl.headers : ['ID', 'Fecha', 'Módulo/Área', 'Quién pidió', 'Descripción', 'Estado', 'Herramienta', 'Verificación'];
  const valores = [[/^id$/i, id], [/^fecha/i, HOY_ISO()], [/m[oó]dulo|[aá]rea/i, sinBarras(modulo)], [/qui[eé]n/i, sinBarras(quien)], [/descrip|solicitud/i, sinBarras(descripcion)], [/^estado/i, '🔲 Pendiente'],
    [/herramienta/i, sinBarras(herramienta)], [/verificaci/i, '—'], [/^tipo$/i, TIPOS_SOL.includes(tipo) ? tipo : ''], [/^d[oó]nde$/i, sinBarras(donde)]];
  const celdas = H.map(h => { const v = valores.find(([re]) => re.test(String(h).trim())); return v ? v[1] : ''; });
  if (!celdas.includes(id)) celdas[0] = id;
  const fila = '| ' + celdas.join(' | ') + ' |';
  let after = -1;
  for (let i = 0; i < cl.lines.length; i++) if (cl.lines[i].trim().startsWith('|')) after = i;
  if (after === -1) throw new Error('El changelog no tiene tabla');
  cl.lines.splice(after + 1, 0, fila);
  fs.writeFileSync(cl.file, cl.lines.join('\n'));
  return id;
}
function capturarInbox(p, texto) {
  let file = inboxDe(p);
  if (!file) { file = path.join(p.ruta, `INBOX-${p.codigo}.md`); fs.writeFileSync(file, `# INBOX — ${p.codigo}\n\nCaptura sin procesar.\n\n---\n`); }
  fs.appendFileSync(file, `\n## ${new Date().toISOString().slice(0, 10)} — Captura rápida (Panel)\n\n${texto.trim()}\n\n_Sin procesar._\n`);
}

// ---------- puntos (cotización) ----------
// PUNTOS-[CODIGO].md: tabla de parámetros + registro por solicitud (ID · Tipo · Puntos · Cobrado · Nota).
const puntosDe = p => archivoRaiz(p.ruta, /^PUNTOS-[^.]+\.md$/i);
const TIPOS_PUNTOS = ['Contratado', 'Garantía', 'Cortesía', 'Extra', 'Iguala', 'Por decidir'];
const num = v => { const n = parseFloat(String(v ?? '').replace(/,/g, '').replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
const normTipo = v => { const t = String(v || '').toLowerCase(); return t.startsWith('contrat') ? 'Contratado' : t.startsWith('garant') ? 'Garantía' : t.startsWith('cortes') ? 'Cortesía' : t.startsWith('extra') ? 'Extra' : t.startsWith('iguala') ? 'Iguala' : t.startsWith('por decidir') ? 'Por decidir' : null; };
function parsePuntos(p) {
  const file = puntosDe(p);
  if (!file) return null;
  const lines = (leer(file) || '').split('\n');
  const params = {}, filas = [];
  let modo = null, cols = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) { modo = null; continue; }
    if (/^[-:\s|]+$/.test(l)) continue;
    const c = l.split('|').slice(1, -1).map(x => x.trim());
    if (!modo) {
      const h = c.map(x => x.toLowerCase());
      if (h.includes('tipo')) { modo = 'registro'; cols = { id: Math.max(0, h.indexOf('id')), tipo: h.indexOf('tipo'), pts: h.findIndex(x => x.startsWith('punto')), cob: h.findIndex(x => x.startsWith('cobrad')), nota: h.findIndex(x => x.startsWith('nota')) }; }
      else modo = 'params';
      continue;
    }
    if (modo === 'params') params[(c[0] || '').toLowerCase()] = c[1];
    else filas.push({ i, id: c[cols.id] || '', tipo: normTipo(c[cols.tipo]) || c[cols.tipo] || '', puntos: num(c[cols.pts]), cobrado: cols.cob >= 0 && /^s[ií]/i.test(c[cols.cob] || ''), nota: cols.nota >= 0 ? (c[cols.nota] || '') : '' });
  }
  const param = k => { const e = Object.entries(params).find(([n]) => n.includes(k)); return e ? num(e[1]) : 0; };
  const totales = Object.fromEntries(TIPOS_PUNTOS.map(t => [t, 0]));
  for (const f of filas) if (totales[f.tipo] !== undefined) totales[f.tipo] += f.puntos;
  const porCobrar = filas.filter(f => f.tipo === 'Extra' && !f.cobrado).reduce((a, f) => a + f.puntos, 0);
  const desde = ((Object.entries(params).find(([n]) => n.includes('desde')) || [])[1] || '').trim();
  const crudo = ((Object.entries(params).find(([n]) => n.includes('valor')) || [])[1] || '').trim();
  const valorPropio = !!crudo && !/tim[oó]n|base/i.test(crudo) && num(crudo) > 0;
  return { file, lines, filas, contratados: param('contratad'), bolsa: param('cortes'), valor: valorPropio ? num(crudo) : cobroBase().valorPunto, valorPropio, totales, porCobrar, desde };
}
function resumenPuntos(p) {
  const P = parsePuntos(p);
  if (!P) return null;
  const cl = parseChangelog(p), ie = colIndex(cl.headers, 'estado', 5), idd = (i => i >= 0 ? i : 4)(cl.headers.findIndex(x => /descrip|solicitud/i.test(x))), ifc = colIndex(cl.headers, 'fecha', 1);
  const clasificados = new Set(P.filas.map(f => f.id));
  // «Registrar desde»: lo anterior a esa fecha no se pide clasificar (proyectos que arrancaron el registro en cero)
  const sinPuntos = cl.rows
    .filter(r => r.cells[0] && !clasificados.has(r.cells[0]) && !(r.cells[ie] || '').includes('🚫') && !(P.desde && (r.cells[ifc] || '') < P.desde))
    .map(r => ({ id: r.cells[0], descripcion: (r.cells[idd] || '').slice(0, 160) }));
  return {
    file: path.basename(P.file), desde: P.desde, contratados: P.contratados, bolsa: P.bolsa, valor: P.valor, valorPropio: P.valorPropio, totales: P.totales, porCobrar: P.porCobrar,
    filas: P.filas.map(({ i, ...f }) => f), sinPuntos,
  };
}
const PLANTILLA_PUNTOS = (cod, c, b, v, desde = '') => `# Puntos · ${cod}

Registro de puntos por solicitud. Lo lee el Panel Timón (pestaña Puntos).
Tipos: **Contratado** (dentro de la cotización) · **Garantía** (corrige algo entregado, no se cobra) · **Cortesía** (sale de la bolsa de regalo) · **Extra** (fuera de alcance, se cobra).
Los puntos se cuentan con el catálogo del skill cotizar-proyecto.

| Parámetro | Valor |
|---|---:|
| Puntos contratados | ${c} |
| Bolsa de cortesía | ${b} |
| Valor del punto | ${v} |${desde ? `\n| Registrar desde | ${desde} |` : ''}

| ID | Tipo | Puntos | Cobrado | Nota |
|---|---|---:|---|---|
`;
function crearPuntos(p, { contratados, bolsa, valor }) {
  if (puntosDe(p)) throw new Error('Este proyecto ya tiene su registro de puntos');
  const c = num(contratados);
  if (contratados === undefined || String(contratados).trim() === '') throw new Error('Faltan los puntos contratados (puede ser 0)');
  const b = num(bolsa) || Math.round(c * cobroBase().bolsaPct / 100), v = num(valor) > 0 ? num(valor) : 'Timón';
  const file = path.join(p.ruta, `PUNTOS-${p.codigo}.md`);
  fs.writeFileSync(file, PLANTILLA_PUNTOS(p.codigo, c, b, v));
  return path.basename(file);
}
function guardarFilaPuntos(p, { id, tipo, puntos, nota, cobrado }) {
  const P = parsePuntos(p);
  if (!P) throw new Error('Este proyecto no tiene PUNTOS-*.md');
  const t = normTipo(tipo);
  if (!t) throw new Error('Tipo inválido: usa Contratado, Garantía, Cortesía, Extra, Iguala o Por decidir');
  if (!id) throw new Error('Falta el ID');
  const limpio = v => String(v ?? '').replace(/\|/g, '/').replace(/\n/g, ' ').trim();
  const prev = P.filas.find(f => f.id === id);
  const cob = t !== 'Extra' ? '' : (cobrado === undefined ? (prev && prev.cobrado ? 'sí' : '') : (cobrado ? 'sí' : ''));
  const fila = `| ${limpio(id)} | ${t} | ${num(puntos)} | ${cob} | ${limpio(nota === undefined && prev ? prev.nota : nota)} |`;
  if (prev) P.lines[prev.i] = fila;
  else {
    let after = -1;
    for (let i = 0; i < P.lines.length; i++) if (P.lines[i].trim().startsWith('|')) after = i;
    if (after === -1) throw new Error('El registro de puntos no tiene tabla');
    P.lines.splice(after + 1, 0, fila);
  }
  fs.writeFileSync(P.file, P.lines.join('\n'));
}

// ---------- versión de Timón ----------
const VERSION_TIMON = () => { const f = RUTA_TIMON && path.join(RUTA_TIMON, 'VERSION'); return (f && (leer(f) || '').trim()) || ''; };
const desactualizado = p => { const v = VERSION_TIMON(); return !!(v && p.tmn && String(p.timonVersion || '') < v); };
// A la vista: DD MMMM YY. Como identificador (archivos, respaldos, cortes): AAAAMMDD.
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fFecha = f => { const m = String(f || '').match(/^(\d{4})-?(\d{2})-?(\d{2})/); return m ? m[3] + ' ' + MESES_L[+m[2] - 1] + ' ' + m[1].slice(2) : String(f || ''); };
const ID_HOY = () => HOY_ISO().replace(/-/g, '');
const HOY_ISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const sinBarras = v => String(v ?? '').replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim();

// ---------- etapas del proyecto (ficha .tmn) ----------
const ETAPAS = ['brief', 'descubrimiento', 'cotizacion', 'aceptado', 'construccion', 'entregado', 'mantenimiento'];
function escribirTmnCrudo(p, cambios) {
  const t = leerTmn(p.ruta);
  const datos = { ...((t && !t.error && t.datos) || (typeof sugerirTmn === 'function' ? sugerirTmn(p) : {})), ...cambios };
  fs.writeFileSync((t && t.file) || path.join(p.ruta, 'proyecto.tmn'), JSON.stringify(datos, null, 2) + '\n');
}

// ---------- verificar ----------
function archivosMd(p) {
  const out = [];
  for (const d of ['.', 'specs', 'checklists']) {
    try { for (const f of fs.readdirSync(path.join(p.ruta, d))) if (/\.md$/i.test(f) && !/^readme\.md$/i.test(f) && !/\.bak/i.test(f)) out.push(d === '.' ? f : d + '/' + f); } catch { }
  }
  return out;
}
const claveIdTexto = (p, id) => { const k = claveId(id); return k ? `${p.codigo}-${k.n.padStart(3, '0')}` : null; };
const claveId = id => { const m = String(id).match(/^([A-Za-z0-9_]+)-(\d+)/); return m ? { cod: m[1].toUpperCase(), n: m[2] } : null; };
function archivosDeId(lista, id) {
  const k = claveId(id);
  if (!k) return { checklists: [], specs: [] };
  const re = new RegExp('(^|[^0-9])' + k.n + '([^0-9]|$)');
  const de = lista.filter(f => { const b = path.basename(f).toUpperCase(), i = b.indexOf(k.cod + '-'); return i >= 0 && re.test(b.slice(i + k.cod.length + 1)); });
  const chk = de.filter(f => f.startsWith('checklists/') || /check/i.test(path.basename(f)));
  return { checklists: chk.sort((a, b) => (b.startsWith('checklists/') - a.startsWith('checklists/'))), specs: de.filter(f => f.startsWith('specs/') && !/check/i.test(path.basename(f))) };
}
const RE_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s?(.*)$/;
function leerChecklist(p, file) {
  const lines = (leer(path.join(p.ruta, file)) || '').split('\n');
  const items = []; let cur = null, seccion = '';
  lines.forEach((l, i) => {
    const m = l.match(RE_ITEM);
    if (m) { cur = { linea: i, hecho: m[2] !== ' ', texto: m[3].trim(), detalle: [], seccion }; items.push(cur); return; }
    if (/^#{1,4}\s/.test(l)) { seccion = l.replace(/^#+\s*/, '').trim(); cur = null; return; }
    if (cur && /^\s{2,}\S/.test(l)) cur.detalle.push(l.trim().replace(/^[-*]\s+/, ''));
    else if (cur && l.trim() !== '') cur = null;
  });
  return { file, items };
}
function porVerificar(p, conItems = true) {
  const cl = parseChangelog(p);
  if (!cl.file) return [];
  const ie = colIndex(cl.headers, 'estado', 5), idd = (i => i >= 0 ? i : 4)(cl.headers.findIndex(x => /descrip|solicitud/i.test(x))), ifc = colIndex(cl.headers, 'fecha', 1), iv = colIndex(cl.headers, 'verificaci', 7), im = cl.headers.findIndex(x => /m[óo]dulo/i.test(x));
  const lista = archivosMd(p), iDo = idxCol(cl.headers, /^d[oó]nde$/i);
  // cuándo pasó a ✅ Construido (último cambio real del historial); si no se sabe, la fecha de registro (TMN-061)
  const hist = leerJson(histDe(p), []), construida = {};
  for (const e of hist) if (e.tipo === 'pieza' && e.id && /✅/.test(e.a || '')) construida[e.id] = { f: e.f, aprox: !!e.aprox };
  const sqls = conItems ? listaSql(p) : [];
  return cl.rows.filter(r => (r.cells[ie] || '').includes('✅')).map(r => {
    const a = archivosDeId(lista, r.cells[0]);
    let checklists = a.checklists.map(f => leerChecklist(p, f)).filter(c => c.items.length);
    if (!checklists.length) checklists = a.specs.map(f => leerChecklist(p, f)).filter(c => c.items.length); // criterios de aceptación con casillas dentro del spec
    const items = checklists.flatMap(c => c.items);
    const donde = iDo >= 0 && r.cells.length <= cl.headers.length ? r.cells[iDo] || '' : '';
    return {
      donde, probarEn: probarEnDe(p, donde, [...a.checklists, ...a.specs]),
      construida: construida[r.cells[0]] && !construida[r.cells[0]].aprox ? construida[r.cells[0]].f : '',
      id: r.cells[0], fecha: r.cells[ifc] || '', modulo: (((r.cells[idd] || '').match(/^\s*\*\*(.+?):?\*\*/) || [])[1] || (im >= 0 && r.cells[im]) || ((r.cells[idd] || '').match(/\*\*(.+?)\*\*/) || [0, (r.cells[idd] || '').split(/[.:(]/)[0]])[1]).replace(/:$/, '').slice(0, 160), area: im >= 0 ? r.cells[im] || '' : '', descripcion: (r.cells[idd] || '').slice(0, 700), nota: r.cells[iv] || '',
      specs: a.specs, checklists: conItems ? checklists : [], sqlPendientes: sqls.filter(s => s.id === claveIdTexto(p, r.cells[0]) && !s.produccion).map(s => s.rel), total: items.length, hechos: items.filter(x => x.hecho).length,
    };
  });
}
// ---------- Dónde se prueba lo construido (TMN-059) ----------
// 1) La línea "**Probar en:**" del checklist o del spec (URL, /ruta de la app, #/ruta del panel o archivos del proyecto).
// 2) Si no hay, la página del Dónde (COD › /pagina › Sección) con el lanzador del proyecto.
// 3) Y los archivos que el spec cita en "Lo que se hizo", si existen.
const RE_PROBAR_EN = /^[ \t]*(?:[-*][ \t]*)?\**[ \t]*probar en[ \t]*:?[ \t]*\**[ \t]*:?[ \t]*(.*)$/im;
function probarEnDe(p, donde, archivos) {
  let txt = '';
  for (const f of archivos) { const m = (leer(path.join(p.ruta, f)) || '').match(RE_PROBAR_EN); if (m) { txt = m[1].replace(/\*\*/g, '').trim(); break; } }
  const out = { declarado: txt, url: '', ruta: '', archivos: [] };
  const existe = rel => { const full = dentro(p.ruta, rel); return full && fs.existsSync(full) && fs.statSync(full).isFile(); };
  for (let x of txt.split(/\s*[,;·]\s*|\s+y\s+/)) {
    x = x.replace(/^[`<"«]+|[`>"».]+$/g, '').trim(); if (!x) continue;
    if (/^https?:\/\//i.test(x) || /^#\//.test(x)) { if (!out.url) out.url = x; }
    else if (existe(x.replace(/^\.?\//, ''))) out.archivos.push(x.replace(/^\.?\//, ''));
    else if (x.startsWith('/') && !out.ruta) out.ruta = x.split('/[')[0];
  }
  if (!out.url && !out.ruta && donde) { const pg = (String(donde).split('›')[1] || '').trim(); if (pg.startsWith('/')) out.ruta = pg.split('/[')[0]; }
  if (!out.archivos.length) for (const f of archivos.filter(f => /(^|\/)specs\//.test(f))) {
    const hecho = seccionMd(leer(path.join(p.ruta, f)) || '', /lo que se hizo/i);
    for (const m of hecho.matchAll(/`([^`\s]+\.[a-z0-9]{1,5})`/gi)) { const rel = m[1].replace(/^\.?\//, ''); if (existe(rel) && !out.archivos.includes(rel)) out.archivos.push(rel); if (out.archivos.length >= 4) break; }
  }
  return out;
}
// Guarda o cambia la línea "Probar en" en el checklist de la pieza (lo crea si no hay)
function ponerProbarEn(p, id, valor) {
  valor = sinBarras(String(valor || '').trim()).slice(0, 300);
  let rel = archivosDeId(archivosMd(p), id).checklists[0];
  if (!rel) rel = crearChecklist(p, id);
  const full = dentro(p.ruta, rel); let t = leer(full) || '';
  const linea = '**Probar en:** ' + valor;
  if (RE_PROBAR_EN.test(t)) t = valor ? t.replace(RE_PROBAR_EN, linea) : t.replace(RE_PROBAR_EN, '').replace(/\n{3,}/g, '\n\n');
  else if (valor) t = /^#.*\n/.test(t) ? t.replace(/^(#.*\n)/, '$1\n' + linea + '\n') : linea + '\n\n' + t;
  fs.writeFileSync(full, t);
  return rel;
}
function marcarItem(p, file, linea, hecho) {
  const full = /\.md$/i.test(file || '') && dentro(p.ruta, file);
  if (!full || !fs.existsSync(full)) throw new Error('No encontré ese checklist');
  const lines = (leer(full) || '').split('\n'), l = lines[+linea];
  if (l === undefined || !RE_ITEM.test(l)) throw new Error('El checklist cambió en el disco; recarga la página');
  lines[+linea] = l.replace(/\[([ xX])\]/, hecho ? '[x]' : '[ ]');
  fs.writeFileSync(full, lines.join('\n'));
}
function cerrarSpec(p, file, id) {
  const full = dentro(p.ruta, file);
  if (!full || !fs.existsSync(full)) return false;
  let s = leer(full) || '';
  const linea = `Cerrado, verificado el ${HOY_ISO()}, ver ${id}`;
  if (/##\s*Estado\s*\r?\n/i.test(s)) s = s.replace(/(##\s*Estado\s*\r?\n+)[^\n]*/i, `$1${linea}`);
  else s = s.replace(/\s*$/, '') + `\n\n## Estado\n${linea}\n`;
  fs.writeFileSync(full, s);
  return true;
}
function cerrarVerificacion(p, id, { nota, forzar } = {}) {
  const it = porVerificar(p).find(x => x.id === id);
  if (!it) throw new Error('Esa solicitud ya no está como ✅ Construido');
  if (it.total && it.hechos < it.total && !forzar) throw new Error(`Faltan ${it.total - it.hechos} punto(s) del checklist`);
  actualizarEstado(p, id, '✔️ Verificado', (nota ? sinBarras(nota) + ' · ' : '') + `verificado en el panel el ${HOY_ISO()}`, true);
  return { specs: it.specs.filter(f => cerrarSpec(p, f, id)) };
}
function reportarFallo(p, id, nota) {
  if (!String(nota || '').trim()) throw new Error('Escribe qué falló');
  actualizarEstado(p, id, '✅ Construido', `Falló el ${HOY_ISO()}: ${sinBarras(nota)}`, true);
}

// ---------- cobranza (COBROS-[CODIGO].md) ----------
const cobrosDe = p => archivoRaiz(p.ruta, /^COBROS-[^.]+\.md$/i);
function parseCobros(p) {
  const file = cobrosDe(p);
  if (!file) return null;
  const lines = (leer(file) || '').split('\n');
  const params = {}, filas = [];
  let modo = null, cols = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) { modo = null; continue; }
    if (/^[-:\s|]+$/.test(l)) continue;
    const c = l.split('|').slice(1, -1).map(x => x.trim());
    if (!modo) {
      const h = c.map(x => x.toLowerCase());
      if (h.includes('concepto')) { modo = 'pagos'; cols = { fecha: h.indexOf('fecha'), concepto: h.indexOf('concepto'), monto: h.findIndex(x => x.startsWith('monto')), estado: h.indexOf('estado'), nota: h.findIndex(x => x.startsWith('nota')) }; }
      else modo = 'params';
      continue;
    }
    if (modo === 'params') params[(c[0] || '').toLowerCase()] = c[1];
    else filas.push({ i, fecha: cols.fecha >= 0 ? (c[cols.fecha] || '') : '', concepto: c[cols.concepto] || '', monto: num(c[cols.monto]), pagado: /pagad|cobrad/i.test(c[cols.estado] || ''), nota: cols.nota >= 0 ? (c[cols.nota] || '') : '' });
  }
  const param = k => { const e = Object.entries(params).find(([n]) => n.includes(k)); return e ? num(e[1]) : 0; };
  return { file, lines, filas, contratado: param('contratad'), iguala: param('iguala mensual'), igualaPuntos: param('puntos de iguala') };
}
function resumenCobros(p) {
  const C = parseCobros(p), P = resumenPuntos(p);
  if (!C) return P && P.porCobrar ? { file: null, contratado: 0, cobrado: 0, pendiente: 0, vencido: 0, sinProgramar: 0, porCobrar: 0, extras: Math.round(P.porCobrar * P.valor), proximo: null, iguala: 0, igualaPuntos: 0, igualaUsados: 0, filas: [] } : null;
  const hoy = HOY_ISO(), f = C.filas;
  const suma = arr => arr.reduce((a, x) => a + x.monto, 0);
  const cobrado = suma(f.filter(x => x.pagado)), pendiente = suma(f.filter(x => !x.pagado));
  const vencido = suma(f.filter(x => !x.pagado && /^\d{4}-\d{2}-\d{2}/.test(x.fecha) && x.fecha < hoy));
  const proximo = f.filter(x => !x.pagado && /^\d{4}-\d{2}-\d{2}/.test(x.fecha) && x.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null;
  const sinProgramar = Math.max(0, C.contratado - cobrado - pendiente);
  let igualaUsados = 0;
  if (C.igualaPuntos && P) {
    const cl = parseChangelog(p), ifc = colIndex(cl.headers, 'fecha', 1), mes = hoy.slice(0, 7);
    const fechas = new Map(cl.rows.map(r => [r.cells[0], r.cells[ifc] || '']));
    for (const x of P.filas) if (x.tipo !== 'Garantía' && (fechas.get(x.id) || '').startsWith(mes)) igualaUsados += x.puntos;
  }
  return {
    file: path.basename(C.file), contratado: C.contratado, cobrado, pendiente, vencido, sinProgramar, porCobrar: pendiente + sinProgramar,
    extras: P ? Math.round(P.porCobrar * P.valor) : 0, proximo: proximo ? { fecha: proximo.fecha, concepto: proximo.concepto, monto: proximo.monto } : null,
    iguala: C.iguala, igualaPuntos: C.igualaPuntos, igualaUsados, filas: f.map(({ i, ...x }) => x),
  };
}
const PLANTILLA_COBROS = (cod, c, ig, igp) => `# Cobranza · ${cod}

Pagos del proyecto. Lo lee el Panel Timón (pestaña Cobranza y la vista global de Cobranza).
Estado: **Pagado** o **Pendiente**. Un pendiente con fecha pasada aparece como vencido. Fechas en formato AAAA-MM-DD.

| Parámetro | Valor |
|---|---:|
| Total contratado | ${c} |
| Iguala mensual | ${ig} |
| Puntos de iguala por mes | ${igp} |

| Fecha | Concepto | Monto | Estado | Nota |
|---|---|---:|---|---|
`;
function crearCobros(p, { contratado, iguala, igualaPuntos }) {
  if (cobrosDe(p)) throw new Error('Este proyecto ya tiene su registro de cobranza');
  const file = path.join(p.ruta, `COBROS-${p.codigo}.md`);
  fs.writeFileSync(file, PLANTILLA_COBROS(p.codigo, num(contratado), num(iguala), num(igualaPuntos)));
  return path.basename(file);
}
function guardarCobro(p, { indice, fecha, concepto, monto, pagado, nota }) {
  const C = parseCobros(p);
  if (!C) throw new Error('Este proyecto no tiene COBROS-*.md');
  const prev = indice === undefined || indice === null || indice === '' ? null : C.filas[+indice];
  if (prev === undefined) throw new Error('Ese pago ya no existe; recarga');
  const v = (x, d) => x === undefined ? d : x;
  const f = String(v(fecha, prev ? prev.fecha : '')).trim();
  if (f && !/^\d{4}-\d{2}-\d{2}$/.test(f)) throw new Error('La fecha va como AAAA-MM-DD');
  const con = sinBarras(v(concepto, prev ? prev.concepto : ''));
  if (!con) throw new Error('Falta el concepto');
  const fila = `| ${f} | ${con} | ${num(v(monto, prev ? prev.monto : 0))} | ${v(pagado, prev ? prev.pagado : false) ? 'Pagado' : 'Pendiente'} | ${sinBarras(v(nota, prev ? prev.nota : ''))} |`;
  if (prev) C.lines[prev.i] = fila;
  else {
    let after = -1;
    for (let i = 0; i < C.lines.length; i++) if (C.lines[i].trim().startsWith('|')) after = i;
    C.lines.splice(after + 1, 0, fila);
  }
  fs.writeFileSync(C.file, C.lines.join('\n'));
  if (v(pagado, prev ? prev.pagado : false)) cobrarCorte(p, con);
}

// ---------- proyecto nuevo de punta a punta ----------
function crearProyectoNuevo(b) {
  const padre = abs(b.padre || '');
  const enRaiz = (CONFIG_BASE.carpetasProyectos || []).map(abs).some(r => padre === r || padre.startsWith(r + path.sep));
  if (!fs.existsSync(padre) && enRaiz) fs.mkdirSync(padre, { recursive: true });
  if (!fs.existsSync(padre) || !fs.statSync(padre).isDirectory()) throw new Error('La carpeta donde se crea no existe');
  const nombre = String(b.nombre || '').trim();
  if (!nombre) throw new Error('Falta el nombre del proyecto');
  const dir = path.join(padre, String(b.carpeta || nombre).trim().replace(/[\/\\:]/g, '-'));
  if (fs.existsSync(dir) && fs.readdirSync(dir).filter(x => x !== '.DS_Store').length) throw new Error('Ya existe una carpeta con ese nombre y no está vacía');
  const r = incorporarProyecto(dir, b.codigo);
  const brief = String(b.brief || '').trim();
  fs.writeFileSync(path.join(dir, 'proyecto.tmn'), JSON.stringify({
    timon: 1, nombre, codigo: r.codigo, cliente: String(b.cliente || '').trim(), marca: String(b.marca || '').trim(),
    estado: 'activo', etapa: 'brief', color: '', descripcion: brief.replace(/\s+/g, ' ').slice(0, 220),
    lanzadores: [], ligas: [], relacionados: [], timonVersion: VERSION_TIMON(),
  }, null, 2) + '\n');
  if (brief) {
    const inbox = archivoRaiz(dir, /^INBOX-[^.]+\.md$/i) || path.join(dir, `INBOX-${r.codigo}.md`);
    fs.appendFileSync(inbox, `\n## ${HOY_ISO()} · Brief inicial (Panel)\n\n${brief}\n\n_Sin procesar._\n`);
  }
  descubrir();
  const pr = PROYECTOS.find(x => x.ruta === dir);
  if (pr) try { planAutomatico(pr); descubrir(); } catch { }
  return { id: pr ? pr.id : null, ruta: dir, codigo: r.codigo };
}

// ---------- specs / docs / sql ----------
function listaSpecs(p) {
  const dir = path.join(p.ruta, 'specs'); const out = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md') || f.toLowerCase() === 'readme.md') continue;
      const full = path.join(dir, f); if (!fs.statSync(full).isFile()) continue;
      const m = (leer(full) || '').match(/##\s*Estado\s*\r?\n+\s*([^\n]+)/i);
      out.push({ file: 'specs/' + f, nombre: f.replace(/\.md$/, ''), estado: m ? m[1].trim() : '—', mtime: fs.statSync(full).mtimeMs });
    }
  } catch { }
  return out.sort((a, b) => b.mtime - a.mtime);
}
const PLANTILLA_SPEC = n => `# Spec: ${n}

**Dónde:** COD › /pagina › Sección · **Tipo:** Nueva función | Mejora | Arreglo | Cambio | Soporte | Interno

## Lo que se pidió
[en palabras de quien lo pidió, tal cual]

## Objetivo
[1-2 líneas: qué problema resuelve]

## Alcance
- Incluye: ...
- No incluye (fuera de alcance): ...

## Contexto / arquitectura relevante
[tablas, módulos, o flujos que toca]

## Migraciones
[archivos SQL con el ID en el nombre, o "ninguna"]

## Criterios de aceptación (verificables sin leer código — máximo 7)
- [ ] Cuando hago X, veo Y
- [ ] ...

## Restricciones
[stack, convenciones, límites conocidos]

## Lo que se hizo
[lo escribe la IA al construir: qué cambió, archivos tocados, decisiones y lo que quedó fuera]

## Estado
Abierto
`;
function listaDocs(p) {
  const out = [];
  try { for (const f of fs.readdirSync(p.ruta)) if (f.endsWith('.md') && fs.statSync(path.join(p.ruta, f)).isFile()) out.push(f); } catch { }
  const orden = ['00-MARCO.md', '01-ARQUITECTURA.md'];
  return out.sort((a, b) => ((orden.indexOf(a) + 1 || 99) - (orden.indexOf(b) + 1 || 99)) || a.localeCompare(b));
}
const LEDGER = path.join(SCRIPT_DIR, 'sql-aplicados.json');
const leerLedger = () => { try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch { return {}; } };
function listaSql(p) {
  const out = [], reg = leerSqlReg(p).archivos, vistos = new Set();
  const walk = (dir, rel, d) => {
    if (d > 4) return;
    let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const full = path.join(dir, e.name), r = (rel + '/' + e.name).replace(/^\//, '');
      if (e.isDirectory()) walk(full, r, d + 1);
      else if (e.name.endsWith('.sql') && !vistos.has(r)) { vistos.add(r); const g = reg[r] || {}; out.push({ rel: r, mtime: fs.statSync(full).mtimeMs, id: idDeArchivo(p, e.name), desarrollo: g.desarrollo || null, produccion: g.produccion || null, aplicado: g.produccion || null }); }
    }
  };
  const principal = rutaSqlDe(p);
  for (const c of [principal, ...(p.cfg.carpetasSql || DEFAULTS.carpetasSql)].filter((c, i, a) => a.indexOf(c) === i)) walk(path.join(p.ruta, c), c, 0);
  for (const d of ['', 'specs', 'docs']) { try { for (const f of fs.readdirSync(path.join(p.ruta, d))) if (f.endsWith('.sql')) walk(path.join(p.ruta, d), d, 4); } catch { } } // sueltos (hasta que se ordenen)
  return out.sort((a, b) => (!a.id - !b.id) || String(a.id || '').localeCompare(String(b.id || ''), 'es', { numeric: true }) || b.mtime - a.mtime);
}

// ---------- estructura fija, salud y ordenar (TMN-015, TMN-016) ----------
// Regla 20: specs/  checklists/  sql/ (o la carpeta de migraciones del proyecto)  docs/  .timon/
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function idDeArchivo(p, nombre) {
  const m = String(nombre).match(new RegExp('(?:^|[^A-Za-z0-9])' + escRe(p.codigo) + '[-_ ]?(\\d{1,4})(?!\\d)', 'i'));
  return m ? `${p.codigo}-${m[1].padStart(3, '0')}` : null;
}
const cuentaSql = dir => { let n = 0; const w = (d, k) => { if (k > 3) return; let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { if (e.isDirectory()) { if (e.name !== 'node_modules') w(path.join(d, e.name), k + 1); } else if (e.name.endsWith('.sql')) n++; } }; w(dir, 0); return n; };
function rutaSqlDe(p) {
  if (p.tmn && p.tmn.rutaSql) return String(p.tmn.rutaSql).replace(/^\.?\/+|\/+$/g, '');
  const cands = ['sql', ...(p.cfg.carpetasSql || DEFAULTS.carpetasSql).filter(c => c !== 'sql')];
  let mejor = null, max = 0;
  for (const c of cands) { const n = cuentaSql(path.join(p.ruta, c)); if (n > max) { max = n; mejor = c; } }
  if (mejor) return mejor;
  return fs.existsSync(path.join(p.ruta, 'supabase')) ? 'supabase/migrations' : 'sql';
}
function diagnosticoOrden(p) {
  const rutaSql = rutaSqlDe(p), mover = [];
  const ocupado = new Set();
  const revisar = relDir => {
    let es = []; try { es = fs.readdirSync(path.join(p.ruta, relDir), { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      if (!e.isFile()) continue;
      const rel = relDir ? relDir + '/' + e.name : e.name;
      let destDir = null, tipo = null;
      if (/\.md$/i.test(e.name) && /check/i.test(e.name) && !/^readme/i.test(e.name)) { destDir = 'checklists'; tipo = 'checklist'; }
      else if (/\.sql$/i.test(e.name)) { destDir = rutaSql; tipo = 'sql'; }
      if (!destDir || relDir === destDir) continue;
      const destino = destDir + '/' + e.name;
      const conflicto = fs.existsSync(path.join(p.ruta, destino)) || ocupado.has(destino);
      ocupado.add(destino);
      mover.push({ tipo, desde: rel, a: destino, id: idDeArchivo(p, e.name), conflicto });
    }
  };
  // solo donde suelen quedar sueltos: la raíz, specs/ y docs/ (sin entrar a subcarpetas)
  for (const d of ['', 'specs', 'docs']) revisar(d);
  const enRaiz = mover;
  const otrasSql = (p.cfg.carpetasSql || DEFAULTS.carpetasSql).concat(['migrations', 'db']).filter((c, i, a) => a.indexOf(c) === i && c !== rutaSql)
    .map(c => ({ carpeta: c, n: cuentaSql(path.join(p.ruta, c)) })).filter(x => x.n);
  return { rutaSql, mover: enRaiz, otrasSql };
}
function saludProyecto(p) {
  const d = diagnosticoOrden(p);
  const ver = porVerificar(p, false);
  const pts = resumenPuntos(p);
  const sql = listaSql(p);
  const lanz = (p.tmn && Array.isArray(p.tmn.lanzadores)) ? p.tmn.lanzadores.length : 0;
  return {
    rutaSql: d.rutaSql, fuera: d.mover.length, otrasSql: d.otrasSql,
    sinChecklist: ver.filter(x => !x.total).map(x => x.id),
    sinPuntos: pts ? pts.sinPuntos.length : null,
    sqlSinProduccion: sql.filter(s => !s.produccion).length,
    sinLanzador: !lanz,
    ids: (() => { try { return integridadIds(p); } catch { return { saltados: [], repetidos: [], sinFila: [] }; } })(),
    hilos: (() => { try { const K = carrilesProyecto(p); return { sinHilo: K.sinHilo, repetidos: K.repetidos, sinCarril: K.sinCarril.map(h => h.hilo), cerrables: K.hilos.filter(h => h.cerrable).map(h => h.hilo) }; } catch { return null; } })(),
  };
}
function ordenarProyecto(p, desdeLista) {
  const d = diagnosticoOrden(p), elegidos = new Set(desdeLista || []);
  const hechos = [];
  const reg = leerSqlReg(p);
  for (const m of d.mover) {
    if (!elegidos.has(m.desde) || m.conflicto) continue;
    const de = dentro(p.ruta, m.desde), a = dentro(p.ruta, m.a);
    if (!de || !a || !fs.existsSync(de) || fs.existsSync(a)) continue;
    fs.mkdirSync(path.dirname(a), { recursive: true });
    fs.renameSync(de, a);
    if (reg.archivos[m.desde]) { reg.archivos[m.a] = reg.archivos[m.desde]; delete reg.archivos[m.desde]; }
    hechos.push(m);
  }
  if (!hechos.length) return { movidos: 0, referencias: 0 };
  guardarSqlReg(p, reg);
  // referencias: changelog, specs, checklists y docs que mencionaban la ruta vieja
  let referencias = 0;
  const textos = [];
  for (const dir of ['', 'specs', 'checklists', 'docs']) {
    try { for (const f of fs.readdirSync(path.join(p.ruta, dir))) if (/\.md$/i.test(f)) textos.push(path.join(p.ruta, dir, f)); } catch { }
  }
  for (const f of textos) {
    let t = leer(f); if (t === null) continue;
    const antes = t;
    for (const m of hechos) {
      if (m.desde.includes('/')) t = t.split(m.desde).join(m.a);
      else t = t.replace(new RegExp('(^|[\\s\x60(\\[])(?:\\./)?' + escRe(m.desde) + '(?=[\\s\x60)\\]]|$)', 'gm'), (x, pre) => pre + m.a);
    }
    if (t !== antes) { fs.writeFileSync(f, t); referencias++; }
  }
  // bitácora para poder deshacer a mano
  const dirLog = path.join(p.ruta, '.timon', 'orden');
  fs.mkdirSync(dirLog, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  fs.writeFileSync(path.join(dirLog, `${stamp}.md`), `# Ordenar · ${p.codigo} · ${stamp}\n\n| Antes | Después |\n|---|---|\n` + hechos.map(m => `| ${m.desde} | ${m.a} |`).join('\n') + `\n\nReferencias actualizadas en ${referencias} archivo(s).\n`);
  return { movidos: hechos.length, referencias };
}

// ---------- registro de SQL dentro del proyecto (TMN-017) ----------
const ENTORNOS_SQL = ['desarrollo', 'produccion'];
const sqlRegDe = p => path.join(p.ruta, '.timon', 'sql.json');
function leerSqlReg(p) {
  let r = null; try { r = JSON.parse(fs.readFileSync(sqlRegDe(p), 'utf8')); } catch { }
  if (r && r.archivos) return r;
  // primera vez: se trae lo que el panel guardaba en su propia carpeta (contaba como aplicado en producción)
  const viejo = leerLedger()[p.ruta] || {};
  r = { version: 1, archivos: {} };
  for (const [rel, f] of Object.entries(viejo)) r.archivos[rel] = { produccion: f };
  if (Object.keys(viejo).length) guardarSqlReg(p, r);
  return r;
}
function guardarSqlReg(p, r) {
  fs.mkdirSync(path.dirname(sqlRegDe(p)), { recursive: true });
  fs.writeFileSync(sqlRegDe(p), JSON.stringify(r, null, 2) + '\n');
}
function marcarSqlEntorno(p, rel, entorno, aplicado) {
  if (!ENTORNOS_SQL.includes(entorno)) throw new Error('Entorno desconocido');
  const r = leerSqlReg(p);
  const e = r.archivos[rel] = r.archivos[rel] || {};
  if (aplicado) e[entorno] = HOY_ISO(); else delete e[entorno];
  if (!Object.keys(e).length) delete r.archivos[rel];
  guardarSqlReg(p, r);
}

// ---------- Fase 2: tipo y dónde, mapa, montos, etapas planeadas e historial (TMN-031, 032, 033, 039) ----------
const TIPOS_SOL = ['Nueva función', 'Mejora', 'Arreglo', 'Cambio', 'Soporte', 'Interno'];
const idxCol = (h, re) => h.findIndex(x => re.test(String(x).trim()));
// Agrega las columnas Tipo y Dónde al final de la tabla si no están (las filas viejas quedan con esas celdas vacías).
function asegurarColumnas(p) {
  const cl = parseChangelog(p);
  if (!cl.file) throw new Error('Este proyecto no tiene changelog');
  const falta = [];
  if (idxCol(cl.headers, /^tipo$/i) < 0) falta.push('Tipo');
  if (idxCol(cl.headers, /^d[oó]nde$/i) < 0) falta.push('Dónde');
  if (!falta.length) return false;
  let hi = -1;
  for (let i = 0; i < cl.lines.length; i++) if (cl.lines[i].trim().startsWith('|')) { hi = i; break; }
  const todas = [...cl.headers, ...falta];
  cl.lines[hi] = '| ' + todas.join(' | ') + ' |';
  if (cl.lines[hi + 1] && /^[-:\s|]+$/.test(cl.lines[hi + 1].trim())) cl.lines[hi + 1] = '|' + todas.map(() => '---').join('|') + '|';
  fs.writeFileSync(cl.file, cl.lines.join('\n'));
  return true;
}
function ponerCelda(p, id, col, valor) {
  asegurarColumnas(p);
  const cl = parseChangelog(p);
  const row = cl.rows.find(r => r.cells[0] === id);
  if (!row) throw new Error(`No encontré la fila ${id}`);
  const i = col === 'tipo' ? idxCol(cl.headers, /^tipo$/i) : idxCol(cl.headers, /^d[oó]nde$/i);
  if (i < 0) throw new Error('No encontré la columna');
  if (col === 'tipo' && valor && !TIPOS_SOL.includes(valor)) throw new Error('Tipo desconocido');
  const R = [...row.raw];
  while (R.length < cl.headers.length + row.d) R.push('');
  R[iRaw(row, i)] = sinBarras(valor);
  cl.lines[row.i] = '| ' + R.join(' | ') + ' |';
  fs.writeFileSync(cl.file, cl.lines.join('\n'));
}

// MAPA-[COD].md: una fila por lugar. Código | Módulo | Página | Sección | Nota
const mapaDe = p => archivoRaiz(p.ruta, /^MAPA-[^.]+\.md$/i);
const PLANTILLA_MAPA = cod => `# Mapa · ${cod}

Las partes del proyecto, de lo general a lo particular: **Módulo** (con su código corto) › **Página** (la ruta, como \`/rentas\`) › **Sección** (una parte de la página, como la tabla).
Lo lee el Panel Timón (Mapa y Configuración) y la IA al registrar piezas: la columna **Dónde** del changelog se escribe con estos nombres, por ejemplo \`REN › /rentas › Tabla\`.
Una fila por lugar. Una fila sin página es el módulo; una fila sin sección es la página.

| Código | Módulo | Página | Sección | Nota |
|---|---|---|---|---|
`;
function parseMapa(p) {
  const file = mapaDe(p);
  if (!file) return { file: null, lugares: [] };
  const lugares = [];
  let enTabla = false;
  for (const l of (leer(file) || '').split('\n').map(x => x.trim())) {
    if (!l.startsWith('|')) { enTabla = false; continue; }
    if (/^[-:\s|]+$/.test(l)) continue;
    const c = l.split('|').slice(1, -1).map(x => x.trim());
    if (!enTabla) { enTabla = /c[oó]digo/i.test(c[0] || ''); continue; }
    if (!c[0] && !c[1]) continue;
    lugares.push({ cod: (c[0] || '').toUpperCase(), modulo: c[1] || '', pagina: c[2] || '', seccion: c[3] || '', nota: c[4] || '' });
  }
  return { file, lugares };
}
function guardarMapa(p, lugares) {
  const file = mapaDe(p) || path.join(p.ruta, `MAPA-${p.codigo}.md`);
  const previo = leer(file) || PLANTILLA_MAPA(p.codigo);
  const ini = previo.search(/^\|\s*C[oó]digo\s*\|/mi);
  const cabeza = ini >= 0 ? previo.slice(0, ini) : previo.replace(/\s*$/, '\n\n');
  const limpio = (Array.isArray(lugares) ? lugares : []).map(x => ({ cod: sinBarras(x.cod).toUpperCase(), modulo: sinBarras(x.modulo), pagina: sinBarras(x.pagina), seccion: sinBarras(x.seccion), nota: sinBarras(x.nota) }))
    .filter(x => x.cod || x.modulo);
  const tabla = '| Código | Módulo | Página | Sección | Nota |\n|---|---|---|---|---|\n' + limpio.map(x => `| ${x.cod} | ${x.modulo} | ${x.pagina} | ${x.seccion} | ${x.nota} |`).join('\n') + (limpio.length ? '\n' : '');
  fs.writeFileSync(file, cabeza + tabla);
  return path.basename(file);
}

// Montos: viven en los parámetros de PUNTOS- y COBROS- (ahí los leen Puntos y Cobro). Configuración los edita.
function ponerParam(file, nombre, valor) {
  const lines = (leer(file) || '').split('\n');
  let ultima = -1, cabeza = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) { if (cabeza >= 0) break; continue; }
    if (cabeza < 0) { if (/par[aá]metro/i.test(l)) cabeza = i; continue; }
    if (/^[-:\s|]+$/.test(l)) { if (ultima < 0) ultima = i; continue; }
    ultima = i;
    const c = l.split('|').slice(1, -1).map(x => x.trim());
    if ((c[0] || '').toLowerCase() === nombre.toLowerCase()) { lines[i] = `| ${c[0]} | ${valor} |`; fs.writeFileSync(file, lines.join('\n')); return; }
  }
  if (cabeza < 0) throw new Error('No encontré la tabla de parámetros en ' + path.basename(file));
  lines.splice((ultima >= 0 ? ultima : cabeza) + 1, 0, `| ${nombre} | ${valor} |`);
  fs.writeFileSync(file, lines.join('\n'));
}
function guardarMontos(p, b) {
  const n = k => (b[k] === undefined || b[k] === null || String(b[k]).trim() === '' ? null : num(b[k]));
  if (!puntosDe(p)) crearPuntos(p, { contratados: n('contratados') ?? 0, bolsa: n('bolsa') ?? 0, valor: n('valor') ?? 0 });
  if (!cobrosDe(p)) crearCobros(p, { contratado: n('totalContratado') ?? 0, iguala: n('iguala') ?? 0, igualaPuntos: n('igualaPuntos') ?? 0 });
  const fp = puntosDe(p), fc = cobrosDe(p);
  ponerParam(fp, 'Valor del punto', n('valor') ? n('valor') : 'Timón'); // vacío = usa la base de Timón
  if (n('contratados') !== null) ponerParam(fp, 'Puntos contratados', n('contratados'));
  if (n('bolsa') !== null) ponerParam(fp, 'Bolsa de cortesía', n('bolsa'));
  const desde = String(b.desde || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) ponerParam(fp, 'Registrar desde', desde);
  if (n('totalContratado') !== null) ponerParam(fc, 'Total contratado', n('totalContratado'));
  if (n('iguala') !== null) ponerParam(fc, 'Iguala mensual', n('iguala'));
  if (n('igualaPuntos') !== null) ponerParam(fc, 'Puntos de iguala por mes', n('igualaPuntos'));
}
function guardarEtapasPlan(p, plan) {
  const limpio = {}, ok = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
  for (const e of ETAPAS) {
    const x = (plan || {})[e] || {};
    if (ok(x.inicio) || ok(x.fin)) limpio[e] = { inicio: ok(x.inicio), fin: ok(x.fin) };
  }
  escribirTmnCrudo(p, { etapasPlan: limpio, etapasPlanAuto: false });
}

// Historial con fechas (TMN-039): .timon/historial.json. Se compara contra la última foto (.timon/estados.json),
// así quedan registrados también los cambios que la IA hace directo en el changelog o en la ficha.
const histDe = p => path.join(p.ruta, '.timon', 'historial.json');
const fotoDe = p => path.join(p.ruta, '.timon', 'estados.json');
const leerJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
function sincronizarHistorial(p) {
  try {
    const cl = parseChangelog(p);
    if (!cl.file && !p.etapa) return;
    const iE = colIndex(cl.headers, 'estado', 5), iF = colIndex(cl.headers, 'fecha', 1);
    const ahora = { etapa: p.etapa || '', piezas: {} };
    for (const r of cl.rows) if (/^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '')) ahora.piezas[r.cells[0]] = r.cells[iE] || '';
    const foto = leerJson(fotoDe(p), null);
    const eventos = [], ts = new Date().toISOString();
    if (!foto) {
      // primera vez: se reconstruye aproximado con la fecha de registro de cada pieza
      for (const r of cl.rows) if (ahora.piezas[r.cells[0]] !== undefined)
        eventos.push({ f: /^\d{4}-\d{2}-\d{2}/.test(r.cells[iF] || '') ? r.cells[iF].slice(0, 10) : HOY_ISO(), tipo: 'pieza', id: r.cells[0], de: null, a: ahora.piezas[r.cells[0]], aprox: true });
      if (ahora.etapa) eventos.push({ f: HOY_ISO(), tipo: 'etapa', de: null, a: ahora.etapa, aprox: true });
    } else {
      if ((foto.etapa || '') !== ahora.etapa) eventos.push({ f: ts, tipo: 'etapa', de: foto.etapa || null, a: ahora.etapa });
      for (const [id, e] of Object.entries(ahora.piezas)) {
        const antes = (foto.piezas || {})[id];
        // si antes no era un estado (fila desalineada que ahora se lee bien, TMN-056) no cuenta como cambio
        if (antes !== e && (antes === undefined || RE_ESTADO_CELDA.test(antes))) eventos.push({ f: ts, tipo: 'pieza', id, de: antes === undefined ? null : antes, a: e });
      }
    }
    if (!foto || eventos.length) {
      fs.mkdirSync(path.join(p.ruta, '.timon'), { recursive: true });
      if (eventos.length) fs.writeFileSync(histDe(p), JSON.stringify([...leerJson(histDe(p), []), ...eventos], null, 1));
      fs.writeFileSync(fotoDe(p), JSON.stringify(ahora));
    }
  } catch { }
}

// ---------- Fase 3: la pieza como expediente, comentarios y checklist (TMN-034, TMN-035, TMN-022, TMN-041) ----------
const SEC_COMENTARIOS = 'Comentarios de Yanga';
// Texto de una sección "## Nombre" de un markdown (hasta la siguiente ## o el final)
function seccionMd(txt, re) {
  const L = String(txt || '').split('\n'); let dentro = false; const out = [];
  for (const l of L) {
    if (/^##\s/.test(l)) { if (dentro) break; dentro = re.test(l.replace(/^##\s*/, '').trim()); continue; }
    if (dentro) out.push(l);
  }
  return out.join('\n').trim();
}
// Comentarios: "- 🟠 **Abierto** · AAAA-MM-DD · texto"  /  "- ✅ **Atendido** · AAAA-MM-DD · texto"
function leerComentarios(p, rel) {
  const full = rel && dentro(p.ruta, rel);
  if (!full || !fs.existsSync(full)) return [];
  const L = (leer(full) || '').split('\n'); const out = []; let en = false;
  L.forEach((l, i) => {
    if (/^##\s/.test(l)) { en = new RegExp(SEC_COMENTARIOS, 'i').test(l); return; }
    if (!en) return;
    const m = l.match(/^\s*[-*]\s+(?:🟠|✅)?\s*\*\*(Abierto|Atendido)\*\*\s*·\s*(\d{4}-\d{2}-\d{2})\s*·\s*(?:Sobre «([^»]*)»\s*·\s*)?(.*)$/);
    if (m) out.push({ archivo: rel, linea: i, atendido: m[1] === 'Atendido', fecha: m[2], sobre: (m[3] || '').trim(), texto: m[4].trim() });
  });
  return out;
}
function agregarComentario(p, rel, texto, sobre) {
  const t = String(texto || '').replace(/\r?\n+/g, ' ').trim();
  const sb = String(sobre || '').replace(/[«»\r\n]+/g, ' ').trim().slice(0, 140);
  if (!t) throw new Error('Escribe el comentario');
  const full = /\.md$/i.test(rel || '') && dentro(p.ruta, rel);
  if (!full || !fs.existsSync(full)) throw new Error('No encontré ese archivo');
  let s = (leer(full) || '').replace(/\s*$/, '');
  const linea = `- 🟠 **Abierto** · ${HOY_ISO()} · ${sb ? `Sobre «${sb}» · ` : ''}${t}`;
  const re = new RegExp('^##\\s*' + SEC_COMENTARIOS + '.*$', 'mi');
  if (re.test(s)) {
    const L = s.split('\n'); let i = L.findIndex(l => re.test(l)); let fin = i + 1;
    while (fin < L.length && !/^##\s/.test(L[fin])) fin++;
    let ult = fin - 1; while (ult > i && L[ult].trim() === '') ult--;
    L.splice(ult + 1, 0, linea); s = L.join('\n');
  } else {
    // va antes de "## Estado" si existe (para que el estado siga al final), si no al final
    const iEst = s.search(/^##\s*Estado\s*$/mi);
    const bloque = `## ${SEC_COMENTARIOS}\n\nLo que anotó Yanga al revisar. La IA los lee antes de tocar esta pieza y los marca como Atendido.\n\n${linea}\n`;
    s = iEst >= 0 ? s.slice(0, iEst) + bloque + '\n' + s.slice(iEst) : s + '\n\n' + bloque;
  }
  fs.writeFileSync(full, s.replace(/\s*$/, '\n'));
}
function marcarComentario(p, rel, linea, atendido) {
  const full = dentro(p.ruta, rel || '');
  if (!full || !fs.existsSync(full)) throw new Error('No encontré ese archivo');
  const L = (leer(full) || '').split('\n'), l = L[+linea];
  if (!l || !/\*\*(Abierto|Atendido)\*\*/.test(l)) throw new Error('El archivo cambió en el disco; recarga');
  L[+linea] = l.replace(/(?:🟠|✅)?\s*\*\*(Abierto|Atendido)\*\*/, atendido ? '✅ **Atendido**' : '🟠 **Abierto**');
  fs.writeFileSync(full, L.join('\n'));
}
// Checklist nuevo desde la plantilla; si el spec trae criterios con casillas, se copian como pasos
function crearChecklist(p, id) {
  const lista = archivosMd(p), a = archivosDeId(lista, id);
  if (a.checklists.length) return a.checklists[0];
  const rel = `checklists/${id}-checklist.md`, full = path.join(p.ruta, rel);
  const spec = a.specs[0] ? leer(path.join(p.ruta, a.specs[0])) || '' : '';
  const pasos = spec.split('\n').filter(l => RE_ITEM.test(l)).map(l => l.replace(/\[[xX]\]/, '[ ]'));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `# Checklist ${id}\n\n**Probar en:** \n\nSe prueba en la app, sin leer código. Si un paso pide ejecutar un SQL, escribe el nombre del archivo (\`${id}-algo.sql\`) y el panel lo abre a un lado.\n\n## Pasos\n${pasos.length ? pasos.join('\n') : '- [ ] Cuando hago X, veo Y\n- [ ] ...'}\n`);
  return rel;
}
function expedientePieza(p, id) {
  const cl = parseChangelog(p);
  const row = cl.rows.find(r => r.cells[0] === id);
  if (!row) throw new Error(`No encontré ${id} en el changelog`);
  const H = cl.headers, c = row.cells, col = re => { const i = idxCol(H, re); return i >= 0 ? (c[i] || '') : ''; };
  const raro = c.length > H.length;
  const lista = archivosMd(p), a = archivosDeId(lista, id);
  const specRel = a.specs[0] || null, spec = specRel ? leer(path.join(p.ruta, specRel)) || '' : '';
  let checklists = a.checklists.map(f => leerChecklist(p, f)).filter(x => x.items.length);
  const enSpec = !checklists.length && specRel ? [leerChecklist(p, specRel)].filter(x => x.items.length) : [];
  const P = resumenPuntos(p), fp = P ? P.filas.find(f => f.id === id) : null;
  const k = claveIdTexto(p, id);
  return {
    id, fecha: col(/^fecha/i), quien: col(/qui[eé]n/i), modulo: col(/m[oó]dulo|[aá]rea/i), descripcion: col(/descrip|solicitud/i),
    estado: col(/^estado/i), verificacion: col(/verificaci/i), tipo: raro ? '' : col(/^tipo$/i), donde: raro ? '' : col(/^d[oó]nde$/i),
    spec: specRel ? { file: specRel, contenido: spec, hecho: seccionMd(spec, /lo que se hizo/i), pedido: seccionMd(spec, /lo que se pidi/i), estado: seccionMd(spec, /^estado$/i) } : null,
    specs: a.specs, checklistFiles: a.checklists, probarEn: probarEnDe(p, raro ? '' : col(/^d[oó]nde$/i), [...a.checklists, ...a.specs]),
    checklists: checklists.length ? checklists : enSpec, checklistEnSpec: !checklists.length && !!enSpec.length,
    sql: listaSql(p).filter(s => s.id === k),
    puntos: fp ? { tipo: fp.tipo, puntos: fp.puntos, cobrado: fp.cobrado, nota: fp.nota, valor: P.valor } : null, valorPunto: P ? P.valor : null,
    historial: leerJson(histDe(p), []).filter(e => e.id === id),
    hilos: (() => { try { return hilosDePieza(p, id); } catch { return []; } })(),
    comentarios: [...(specRel ? leerComentarios(p, specRel) : []), ...a.checklists.flatMap(f => leerComentarios(p, f))],
  };
}

// ---------- Fase 4: Por decidir y corte de cobro (TMN-019, TMN-020) ----------
// Lo que la IA o tú registraron y todavía no tiene decisión de cobro.
function sugerenciaCobro(tipo, conIguala) {
  return ({ 'Arreglo': { d: 'Garantia', t: 'Garantía: algo entregado no funciona como se acordó' },
    'Cambio': { d: 'Cobrar', t: 'Cobrar: el cliente cambió de idea sobre algo hecho' },
    'Soporte': conIguala ? { d: 'Iguala', t: 'Iguala: operación del mes' } : { d: 'Cobrar', t: 'Cobrar: no hay iguala' },
    'Nueva función': { d: '', t: 'Dentro del contrato si está en la cotización; si no, cobrar' },
    'Mejora': { d: '', t: 'Tú decides: cobrar o regalar' } })[tipo] || { d: '', t: '' };
}
function porDecidir(p) {
  const P = resumenPuntos(p); if (!P) return [];
  const cl = parseChangelog(p), H = cl.headers;
  const iT = idxCol(H, /^tipo$/i), iD = idxCol(H, /^d[oó]nde$/i), iE = colIndex(H, 'estado', 5);
  const C = parseCobros(p), conIguala = !!(C && C.iguala);
  const filas = new Map(cl.rows.map(r => [r.cells[0], r.cells]));
  const idd = (i => i >= 0 ? i : 4)(idxCol(H, /descrip|solicitud/i));
  const pendientes = P.filas.filter(f => f.tipo === 'Por decidir').map(f => ({ id: f.id, descripcion: ((filas.get(f.id) || [])[idd] || '').slice(0, 160), puntos: f.puntos }));
  const vistos = new Set();
  return [...pendientes, ...P.sinPuntos.map(x => ({ ...x, puntos: null }))].filter(x => !vistos.has(x.id) && vistos.add(x.id)).map(x => {
    const c = filas.get(x.id) || [], raro = c.length > H.length, tipo = !raro && iT >= 0 ? (c[iT] || '') : '';
    const fe = c[colIndex(H, 'fecha', 1)] || '';
    return { id: x.id, descripcion: x.descripcion, puntos: x.puntos, tipo, donde: !raro && iD >= 0 ? (c[iD] || '') : '', estado: c[iE] || '', fecha: /^\d{4}-\d{2}-\d{2}/.test(fe) ? fe.slice(0, 10) : '', sugerencia: sugerenciaCobro(tipo, conIguala) };
  }).filter(x => x.tipo !== 'Interno').sort((a, b) => (a.fecha || '9').localeCompare(b.fecha || '9'));
}
const DECISIONES = { Cobrar: 'Extra', Regalar: 'Cortesía', Garantia: 'Garantía', Contrato: 'Contratado', Iguala: 'Iguala' };
function decidirCobro(p, { id, decision, puntos, pct }) {
  if (!id) throw new Error('Falta el ID');
  if (decision !== 'Parcial' && !DECISIONES[decision]) throw new Error('Decisión desconocida');
  const pts = num(puntos);
  if (puntos === undefined || puntos === null || String(puntos).trim() === '' || pts < 0) throw new Error('Escribe los puntos de la pieza (pueden ser 0)');
  if (!puntosDe(p)) crearPuntos(p, { contratados: 0, bolsa: 0, valor: 0 });
  const P = parsePuntos(p);
  const quitar = new Set(P.filas.filter(f => f.id === id).map(f => f.i));
  const lines = P.lines.filter((_, i) => !quitar.has(i));
  const nota = `Decidido el ${HOY_ISO()}`;
  let nuevas;
  if (decision === 'Parcial') {
    const q = Math.min(100, Math.max(0, num(pct) || 50)), cobra = Math.round(pts * q / 100 * 10) / 10, regala = Math.round((pts - cobra) * 10) / 10;
    nuevas = [`| ${id} | Extra | ${cobra} |  | ${nota} · parcial: se cobra el ${q}% |`, `| ${id} | Cortesía | ${regala} |  | ${nota} · parcial: se regala el ${100 - q}% |`];
  } else nuevas = [`| ${id} | ${DECISIONES[decision]} | ${pts} |  | ${nota} |`];
  let after = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].trim().startsWith('|')) after = i;
  if (after === -1) throw new Error('El registro de puntos no tiene tabla');
  lines.splice(after + 1, 0, ...nuevas);
  fs.writeFileSync(P.file, lines.join('\n'));
}
// Corte: los extras sin cobrar (y lo regalado en el mes, con su valor) en un documento, y un pago pendiente en COBROS.
const cortesDir = p => path.join(p.ruta, 'docs', 'cortes');
function listaCortes(p) {
  try { return fs.readdirSync(cortesDir(p)).filter(f => /^CORTE-.+\.md$/i.test(f)).sort().reverse().map(f => ({ file: 'docs/cortes/' + f, mes: ((f.match(/(\d{4})-?(\d{2})\.md$/) || []).slice(1, 3).join('-')) })); } catch { return []; }
}
function generarCorte(p, { mes }) {
  const m = /^\d{4}-\d{2}$/.test(String(mes || '')) ? mes : HOY_ISO().slice(0, 7);
  const P = parsePuntos(p); if (!P) throw new Error('Este proyecto no tiene registro de puntos');
  if (!cobrosDe(p)) throw new Error('Primero crea el registro de Cobro (total contratado)');
  const extras = P.filas.filter(f => f.tipo === 'Extra' && !f.cobrado && !/Corte \d{4}-?\d{2}/.test(f.nota));
  const regalos = P.filas.filter(f => f.tipo === 'Cortesía' && f.nota.includes('Decidido el ' + m));
  if (!extras.length && !regalos.length) throw new Error('No hay extras por cobrar ni cortesías de ese mes');
  const cl = parseChangelog(p), idd = (i => i >= 0 ? i : 4)(idxCol(cl.headers, /descrip|solicitud/i));
  const desc = new Map(cl.rows.map(r => [r.cells[0], ((r.cells[idd] || '').match(/\*\*([^*]+)\*\*/) || [0, (r.cells[idd] || '').slice(0, 90)])[1].replace(/:$/, '')]));
  const $ = n => '$' + Math.round(n).toLocaleString('es-MX');
  const totE = extras.reduce((a, f) => a + f.puntos, 0) * P.valor, totR = regalos.reduce((a, f) => a + f.puntos, 0) * P.valor;
  const idm = m.replace('-', ''), rel = `docs/cortes/CORTE-${p.codigo}-${idm}.md`, full = path.join(p.ruta, rel);
  if (fs.existsSync(full)) throw new Error(`Ya existe ${rel}; ábrelo en Archivos o borra ese archivo para rehacerlo`);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `# Corte de cobro · ${p.nombre} · ${MESES_L[+m.slice(5, 7) - 1]} ${m.slice(2, 4)}\n\nValor del punto: ${$(P.valor)}. Generado el ${fFecha(HOY_ISO())} desde Timón.\n\n## Se cobra\n\n| Pieza | Qué | Puntos | Monto |\n|---|---|---:|---:|\n${extras.map(f => `| ${f.id} | ${sinBarras(desc.get(f.id) || '')} | ${f.puntos} | ${$(f.puntos * P.valor)} |`).join('\n') || '| — | Nada por cobrar este mes | 0 | $0 |'}\n| **Total** | | **${extras.reduce((a, f) => a + f.puntos, 0)}** | **${$(totE)}** |\n\n## Se regaló (para que lo veas)\n\n| Pieza | Qué | Puntos | Valor |\n|---|---|---:|---:|\n${regalos.map(f => `| ${f.id} | ${sinBarras(desc.get(f.id) || '')} | ${f.puntos} | ${$(f.puntos * P.valor)} |`).join('\n') || '| — | Nada regalado este mes | 0 | $0 |'}\n| **Total** | | **${regalos.reduce((a, f) => a + f.puntos, 0)}** | **${$(totR)}** |\n`);
  // marca los extras como incluidos en este corte (para no cobrarlos dos veces)
  const lines = P.lines.slice();
  for (const f of extras) lines[f.i] = lines[f.i].replace(/\|\s*([^|]*)\|\s*$/, (_, n) => `| ${(n.trim() ? n.trim() + ' · ' : '')}Corte ${idm} |`);
  fs.writeFileSync(P.file, lines.join('\n'));
  if (totE > 0) guardarCobro(p, { fecha: HOY_ISO(), concepto: `Corte ${idm}`, monto: Math.round(totE), pagado: false, nota: rel });
  return { file: rel, extras: extras.length, cobrar: Math.round(totE), regalado: Math.round(totR) };
}
// Al marcar pagado un "Corte AAAA-MM", sus extras quedan como cobrados.
function cobrarCorte(p, concepto) {
  const m = (String(concepto || '').match(/^Corte (\d{4}-?\d{2})/) || [])[1]; if (!m) return;
  const P = parsePuntos(p); if (!P) return;
  const lines = P.lines.slice(); let n = 0;
  for (const f of P.filas) if (f.tipo === 'Extra' && !f.cobrado && f.nota.includes('Corte ' + m)) {
    const c = celdasFila(lines[f.i]); if (c.length < 5) continue; c[3] = 'sí'; lines[f.i] = '| ' + c.join(' | ') + ' |'; n++;
  }
  if (n) fs.writeFileSync(P.file, lines.join('\n'));
}

// ---------- Cotizar mientras se trabaja y proyectos para cotizar (TMN-043, TMN-044) ----------
const ETAPAS_COTIZA = ['brief', 'descubrimiento', 'cotizacion'];
const enCotizacion = p => ETAPAS_COTIZA.includes(p.etapa || '');
// Resumen de la cotización en curso: todas las piezas vivas con sus puntos, por módulo
function cotizacionEnCurso(p) {
  const P = parsePuntos(p), cl = parseChangelog(p), H = cl.headers;
  const iE = colIndex(H, 'estado', 5), iD = idxCol(H, /^d[oó]nde$/i), idd = (i => i >= 0 ? i : 4)(idxCol(H, /descrip|solicitud/i));
  const pts = new Map(); if (P) for (const f of P.filas) pts.set(f.id, (pts.get(f.id) || 0) + f.puntos);
  const piezas = cl.rows.filter(r => /^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '') && !(r.cells[iE] || '').includes('🚫'))
    .map(r => ({ id: r.cells[0], titulo: ((r.cells[idd] || '').match(/\*\*([^*]+)\*\*/) || [0, (r.cells[idd] || '').slice(0, 90)])[1].replace(/:$/, ''), donde: iD >= 0 && r.cells.length <= H.length ? (r.cells[iD] || '') : '', puntos: pts.has(r.cells[0]) ? pts.get(r.cells[0]) : null }));
  const total = piezas.reduce((a, x) => a + (x.puntos || 0), 0), valor = P ? P.valor : cobroBase().valorPunto;
  return { etapa: p.etapa, piezas, total, valor, monto: Math.round(total * valor), sinPuntos: piezas.filter(x => x.puntos === null).length };
}
function generarCotizacion(p) {
  const c = cotizacionEnCurso(p);
  if (!c.piezas.length) throw new Error('Todavía no hay piezas registradas');
  const mapa = parseMapa(p).lugares, mod = d => { const t = String(d || '').split(/\s*›\s*/)[0]; const m = mapa.find(l => l.cod.toUpperCase() === t.toUpperCase() || l.modulo.toLowerCase() === t.toLowerCase()); return m ? `${m.cod} · ${m.modulo}` : (t || 'Sin módulo'); };
  const grupos = {}; for (const x of c.piezas) (grupos[mod(x.donde)] = grupos[mod(x.donde)] || []).push(x);
  const $ = n => '$' + Math.round(n).toLocaleString('es-MX');
  let md = `# Cotización · ${p.nombre}\n\nGenerada el ${HOY_ISO()} desde Timón con las piezas registradas. Valor del punto: ${$(c.valor)}.\n\n`;
  for (const [g, xs] of Object.entries(grupos)) {
    const s = xs.reduce((a, x) => a + (x.puntos || 0), 0);
    md += `## ${g}\n\n| Pieza | Qué | Puntos | Monto |\n|---|---|---:|---:|\n${xs.map(x => `| ${x.id} | ${sinBarras(x.titulo)} | ${x.puntos === null ? 'sin contar' : x.puntos} | ${x.puntos === null ? '—' : $(x.puntos * c.valor)} |`).join('\n')}\n| **Subtotal** | | **${s}** | **${$(s * c.valor)}** |\n\n`;
  }
  md += `## Total\n\n**${c.total} puntos · ${$(c.monto)}**${c.sinPuntos ? `\n\nFaltan ${c.sinPuntos} pieza(s) por contar: el total puede subir.` : ''}\n\nPara la versión que se manda al cliente (plan de pagos, tiempos, alcance), pide en Claude "arma la cotización con el skill cotizar-proyecto" sobre este documento.\n`;
  const rel = `docs/cotizaciones/COTIZACION-${p.codigo}-${ID_HOY()}.md`;
  fs.mkdirSync(path.join(p.ruta, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(p.ruta, rel), md);
  return { file: rel, total: c.total, monto: c.monto };
}
// Aceptar: lo que estaba por decidir pasa a Contratado, los puntos contratados y el total van a Cobro, y la etapa a Aceptado
function aceptarCotizacion(p) {
  const c = cotizacionEnCurso(p);
  if (!puntosDe(p)) crearPuntos(p, { contratados: 0, bolsa: 0, valor: 0 });
  let P = parsePuntos(p); const lines = P.lines.slice();
  for (const f of P.filas) if (f.tipo === 'Por decidir') { const cc = celdasFila(lines[f.i]); cc[1] = 'Contratado'; lines[f.i] = '| ' + cc.join(' | ') + ' |'; }
  fs.writeFileSync(P.file, lines.join('\n'));
  P = parsePuntos(p);
  const contratados = P.filas.filter(f => f.tipo === 'Contratado').reduce((a, f) => a + f.puntos, 0);
  ponerParam(P.file, 'Puntos contratados', contratados);
  ponerParam(P.file, 'Bolsa de cortesía', Math.round(contratados * cobroBase().bolsaPct / 100));
  ponerParam(P.file, 'Registrar desde', HOY_ISO());
  if (!cobrosDe(p)) crearCobros(p, { contratado: 0, iguala: 0, igualaPuntos: 0 });
  ponerParam(cobrosDe(p), 'Total contratado', Math.round(contratados * P.valor));
  escribirTmnCrudo(p, { etapa: 'aceptado' });
  descubrir(); { const pr = PROYECTOS.find(x => x.ruta === p.ruta); if (pr) try { planAutomatico(pr); } catch { } }
  return { contratados, monto: Math.round(contratados * P.valor), sinContar: c.sinPuntos };
}

// ---------- correr proyectos (uno por proyecto, simultáneos) ----------
const corriendo = new Map(); // "id#n" -> {proc, buf, seq, exit}  (n = número de lanzador)
const claveRun = (id, n) => `${id}#${+n || 0}`;
function estadoRun(id) {
  const prefijo = id.includes('#') ? null : id + '#';
  if (!prefijo) { const r = corriendo.get(id); return { corriendo: !!(r && r.proc), exit: r ? r.exit : null, desde: r && r.proc ? r.desde || '' : '' }; }
  let algo = false; for (const [k, r] of corriendo) if (k.startsWith(prefijo) && r.proc) algo = true;
  return { corriendo: algo, exit: null };
}
const estadoLanzadores = p => lanzadoresDe(p).map((l, n) => ({ ...l, ...estadoRun(claveRun(p.id, n)) }));
// Los chunks pueden partir una línea a la mitad: se guarda el resto hasta que llegue su \n.
function pushLog(r, chunk, { fin = false } = {}) {
  const partes = ((r.resto || '') + chunk.toString().replace(/\x1b\[[0-9;]*m/g, '')).split('\n');
  r.resto = fin ? '' : partes.pop();
  if (fin && partes.length && partes[partes.length - 1] === '') partes.pop();
  for (const line of partes) {
    if (line.trim() === '' && r.buf.length && r.buf[r.buf.length - 1].t.trim() === '') continue;
    r.buf.push({ i: r.seq++, t: line });
  }
  if (fin && r.resto) { r.buf.push({ i: r.seq++, t: r.resto }); r.resto = ''; }
  if (r.buf.length > 1200) r.buf = r.buf.slice(-1000);
}
// Cada arranque que termina queda anotado para Métricas (horas encendido): .timon/arranques.json
function anotarArranque(p, nombre, desde) {
  try { const f = path.join(p.ruta, '.timon', 'arranques.json'), L = leerJson(f, []); L.push({ l: nombre || '', desde, hasta: new Date().toISOString() }); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(L.slice(-2000))); } catch { }
}
// TMN-066: antes de arrancar un lanzador de Node, revisa si faltan sus dependencias (proyecto nuevo)
// o si package.json / el archivo de bloqueo cambiaron después de la última instalación.
const MARCA_INSTALADO = '.timon-instalado';
function instalacionPendiente(dir, cmd) {
  if (process.platform === 'win32' || !/^\s*(npm|pnpm|yarn|bun|npx)\b/.test(cmd || '')) return null;
  const pkg = path.join(dir, 'package.json');
  if (!fs.existsSync(pkg)) return null;
  const mt = f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } };
  const hay = n => fs.existsSync(path.join(dir, n));
  const instalador = hay('pnpm-lock.yaml') ? 'pnpm install' : hay('yarn.lock') ? 'yarn install' : (hay('bun.lockb') || hay('bun.lock')) ? 'bun install' : 'npm install';
  const nm = path.join(dir, 'node_modules');
  if (!fs.existsSync(nm)) return { instalador, motivo: 'el proyecto todavía no tiene sus dependencias' };
  // Última instalación: la marca de Timón; si no hay, la que deja cada instalador.
  const marca = mt(path.join(nm, MARCA_INSTALADO));
  const ultima = marca || Math.max(mt(path.join(nm, '.package-lock.json')), mt(path.join(nm, '.modules.yaml')), mt(path.join(nm, '.yarn-integrity')), mt(path.join(nm, '.yarn-state.yml'))) + 5000;
  if (ultima <= 5000) return null; // instalado a mano sin marca reconocible: no se toca
  const cambio = Math.max(mt(pkg), ...['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock'].map(n => mt(path.join(dir, n))));
  if (cambio > ultima) return { instalador, motivo: 'package.json cambió desde la última instalación' };
  return null;
}
function runStart(p, n = 0) {
  const clave = claveRun(p.id, n);
  const prev = corriendo.get(clave);
  if (prev && prev.proc) return { ok: false, error: 'Ese lanzador ya está corriendo' };
  p.cfg = cargarConfig(p.ruta); // relee config y .tmn por si los editaste con el panel abierto
  const t = leerTmn(p.ruta); if (t && !t.error) p.tmn = t.datos;
  const l = lanzadoresDe(p)[+n || 0];
  if (!l) return { ok: false, error: 'Ese lanzador no existe' };
  const r = { proc: null, buf: [], seq: 0, exit: null, resto: '', desde: new Date().toISOString() };
  corriendo.set(clave, r);
  const cwd = path.resolve(p.ruta, l.carpeta || '.');
  let cmd = l.comando;
  const inst = instalacionPendiente(cwd, cmd);
  if (inst) {
    pushLog(r, `[Timón] Instalando dependencias con «${inst.instalador}» (${inst.motivo}). La primera vez puede tardar unos minutos…\n`);
    cmd = `${inst.instalador}; c=$?; if [ $c -ne 0 ]; then echo ""; echo "[Timón] La instalación falló (código $c). No arranqué el proyecto: revisa el error de arriba."; exit $c; fi; touch node_modules/${MARCA_INSTALADO}; echo ""; echo "[Timón] Dependencias listas. Arrancando…"; echo "$ ${l.comando.replace(/(["\\$`])/g, '\\$1')}"; ${l.comando}`;
    pushLog(r, `$ ${inst.instalador}\n`);
  } else pushLog(r, `$ ${cmd}\n`);
  r.proc = spawn(cmd, {
    cwd, shell: process.env.SHELL || true,
    detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0' },
  });
  r.proc.stdout.on('data', c => pushLog(r, c));
  r.proc.stderr.on('data', c => pushLog(r, c));
  r.proc.on('exit', (code, sig) => { anotarArranque(p, l.nombre, r.desde); r.exit = { code, sig }; pushLog(r, `\n[proceso terminó — código ${code ?? sig}]\n`, { fin: true }); r.proc = null; });
  r.proc.on('error', e => { pushLog(r, `\n[error al arrancar: ${e.message}]\n`); r.proc = null; });
  return { ok: true };
}
function runStop(p, n = 0) {
  const r = corriendo.get(claveRun(p.id, n));
  if (!r || !r.proc) return { ok: false, error: 'No está corriendo' };
  const pr = r.proc;
  try { process.kill(-pr.pid, 'SIGTERM'); } catch { try { pr.kill('SIGTERM'); } catch { } }
  setTimeout(() => { if (!r.proc) return; try { process.kill(-pr.pid, 'SIGKILL'); } catch { try { pr.kill('SIGKILL'); } catch { } } }, 3500);
  return { ok: true };
}

// ---------- resúmenes ----------
function alertasDe(p) {
  const cl = parseChangelog(p);
  const i = colIndex(cl.headers, 'estado', 5);
  const cuenta = s => cl.rows.filter(r => (r.cells[i] || '').includes(s)).length;
  const inbox = inboxDe(p), cont = inbox ? leer(inbox) : null;
  return {
    pendientes: cuenta('🔲'), enConstruccion: cuenta('🔄'), construidosSinVerificar: cuenta('✅'),
    verificados: cuenta('✔️'), descartados: cuenta('🚫'),
    inboxSinProcesar: (() => { try { return parseIdeas(p).ideas.filter(x => x.estado === 'sin').length; } catch { return 0; } })(),
    porDecidir: (() => { try { return resumenPuntos(p) ? porDecidir(p).length : 0; } catch { return 0; } })(),
    specsAbiertos: listaSpecs(p).filter(s => !/cerrado/i.test(s.estado)).length,
    sqlPendientes: listaSql(p).filter(s => !s.produccion).length,
    cobros: (() => { const c = resumenCobros(p); return c ? { porCobrar: c.porCobrar, vencido: c.vencido, cobrado: c.cobrado, extras: c.extras } : null; })(),
    puntos: (() => { const P = resumenPuntos(p); return P ? {
      porCobrarMxn: Math.round(P.porCobrar * P.valor),
      cortesiaRestante: Math.round(P.bolsa - P.totales['Cortesía']),
      contratadoPct: P.contratados ? Math.round(P.totales.Contratado / P.contratados * 100) : 0,
      sinClasificar: P.sinPuntos.length,
    } : null; })(),
  };
}
const resumenGeneral = () => PROYECTOS.map(p => ({
  id: p.id, nombre: p.nombre, codigo: p.codigo, ruta: p.ruta,
  cliente: p.cliente, marca: p.marca, estado: p.estado, color: p.color, descripcion: p.descripcion,
  tieneTmn: !!p.tmn, tmnError: p.tmnError, lanzadores: estadoLanzadores(p),
  etapa: p.etapa, timonVersion: p.timonVersion, desactualizado: desactualizado(p),
  alertas: alertasDe(p), corriendo: estadoRun(p.id).corriendo, tieneChangelog: !!changelogDe(p),
}));
function estadoProyecto(p) {
  sincronizarHistorial(p);
  const cl = parseChangelog(p);
  const inbox = inboxDe(p);
  return {
    proyecto: { id: p.id, nombre: p.nombre, codigo: p.codigo, ruta: p.ruta, cliente: p.cliente, marca: p.marca, estado: p.estado, color: p.color, descripcion: p.descripcion },
    tmn: p.tmn, tmnFile: p.tmnFile ? path.basename(p.tmnFile) : null, tmnError: p.tmnError,
    etapa: p.etapa, timonVersion: p.timonVersion, version: VERSION_TIMON(), desactualizado: desactualizado(p), cobros: resumenCobros(p),
    lanzadores: estadoLanzadores(p),
    relacionados: ((p.tmn && p.tmn.relacionados) || []).map(c => { const r = PROYECTOS.find(x => x.codigo === c); return { codigo: c, id: r ? r.id : null, nombre: r ? r.nombre : c }; }),
    changelog: cl.file ? { file: path.basename(cl.file), headers: cl.headers, rows: cl.rows.map(r => r.cells), iEstado: colIndex(cl.headers, 'estado', 5), iTipo: idxCol(cl.headers, /^tipo$/i), iDonde: idxCol(cl.headers, /^d[oó]nde$/i), iDesc: (i => i >= 0 ? i : 4)(idxCol(cl.headers, /descrip|solicitud/i)), iFecha: colIndex(cl.headers, 'fecha', 1) } : null,
    mapa: (() => { const m = parseMapa(p); return { file: m.file ? path.basename(m.file) : null, lugares: m.lugares }; })(),
    porDecidir: (() => { try { return porDecidir(p); } catch { return []; } })(), cortes: listaCortes(p),
    cobroBase: cobroBase(), cotizacion: enCotizacion(p) ? cotizacionEnCurso(p) : null, cotizaciones: (() => { try { return fs.readdirSync(path.join(p.ruta, 'docs', 'cotizaciones')).filter(f => f.endsWith('.md')).sort().reverse().map(f => 'docs/cotizaciones/' + f); } catch { return []; } })(),
    tiposSolicitud: TIPOS_SOL, etapasPlan: (p.tmn && p.tmn.etapasPlan) || {}, etapasPlanAuto: !!(p.tmn && p.tmn.etapasPlanAuto), tamano: (p.tmn && p.tmn.tamano) || '', etapas: ETAPAS,
    cobrosParam: (() => { const c = parseCobros(p); return c ? { contratado: c.contratado, iguala: c.iguala, igualaPuntos: c.igualaPuntos } : null; })(),
    inbox: inbox ? { file: path.basename(inbox), contenido: leer(inbox) } : null,
    ideas: (() => { try { return parseIdeas(p).ideas; } catch { return []; } })(),
    actividad: leerJson(histDe(p), []).filter(e => e.tipo === 'pieza' && !e.aprox).slice(-8).reverse(),
    cambios: (() => { const o = {}; for (const e of leerJson(histDe(p), [])) if (e.tipo === 'pieza' && !e.aprox && e.id) o[e.id] = { f: e.f, de: e.de || '', a: e.a || '' }; return o; })(),
    specs: listaSpecs(p), docs: listaDocs(p), sql: listaSql(p), rutaSql: rutaSqlDe(p), salud: (() => { try { return saludProyecto(p); } catch { return null; } })(), faltantes: (() => { try { return datosFaltantes(p); } catch { return null; } })(),
    run: { ...estadoRun(p.id), comando: lanzadoresDe(p)[0].comando },
    alertas: alertasDe(p),
    puntos: resumenPuntos(p),
    carriles: (() => { try { return carrilesProyecto(p); } catch { return null; } })(),
  };
}

// ---------- Fase 5: Hoy, Ideas, Buscar y adoptar un proyecto empezado (TMN-028, TMN-040, TMN-046) ----------
// Ideas: cada entrada del INBOX es un bloque "## …". Su estado sale de la marca al final:
//   _Sin procesar._  ·  _Procesado … → COD-012._  ·  _Descartado el … : motivo._
function parseIdeas(p) {
  const file = inboxDe(p);
  if (!file) return { file: null, ideas: [] };
  const txt = leer(file) || '', lineas = txt.split('\n'), ideas = [];
  let cur = null;
  const cerrar = fin => { if (cur) { cur.fin = fin; ideas.push(cur); cur = null; } };
  lineas.forEach((l, i) => { if (/^##\s+/.test(l)) { cerrar(i); cur = { ini: i, titulo: l.replace(/^##\s+/, '').trim() }; } });
  cerrar(lineas.length);
  return {
    file, lineas, ideas: ideas.map((x, n) => {
      const cuerpo = lineas.slice(x.ini + 1, x.fin).join('\n').trim();
      const fecha = (x.titulo.match(/\d{4}-\d{2}-\d{2}/) || [''])[0];
      let titulo = x.titulo.replace(/^\d{4}-\d{2}-\d{2}\s*[·—–-]?\s*/, '').trim();
      const origen = (titulo.match(/\((panel|nota de voz|voz|cliente|whatsapp|correo|ia|claude|llamada)\)\s*$/i) || [])[1] || '';
      if (origen) titulo = titulo.replace(/\s*\([^)]+\)\s*$/, '');
      const sinMarca = cuerpo.split('\n').filter(l => !/^_.*_\s*$/.test(l.trim())).join('\n').trim();
      const generico = !titulo || /^captura r[aá]pida$/i.test(titulo);
      const estado = /^_\s*sin procesar/im.test(cuerpo) ? 'sin' : /^_\s*descartad/im.test(cuerpo) ? 'descartada' : /^_\s*procesad/im.test(cuerpo) ? 'procesada' : 'nota';
      const marca = (cuerpo.match(/^_(?:\s*(?:procesad|descartad)).*_\s*$/im) || [''])[0].replace(/^_|_$/g, '');
      return {
        n, fecha, titulo: generico ? (sinMarca.split('\n').find(l => l.trim()) || 'Idea').replace(/^[-*>\s]+/, '').slice(0, 90) : titulo,
        origen, texto: sinMarca, estado, marca, ids: [...new Set((marca.match(/\b[A-Za-z][A-Za-z0-9_]*-\d{3}\b/g) || []))],
      };
    }).filter(x => x.texto || x.estado !== 'nota'),
  };
}
function marcarIdea(p, n, marca) {
  const I = parseIdeas(p);
  const x = I.ideas.find(i => i.n === +n);
  if (!x) throw new Error('No encontré esa idea');
  const bloques = []; let ini = -1;
  I.lineas.forEach((l, i) => { if (/^##\s+/.test(l)) { if (ini >= 0) bloques.push([ini, i]); ini = i; } });
  if (ini >= 0) bloques.push([ini, I.lineas.length]);
  const [a, b] = bloques[x.n];
  const j = I.lineas.slice(a, b).findIndex(l => /^_\s*sin procesar/i.test(l.trim()));
  if (j >= 0) I.lineas[a + j] = '_' + marca + '_';
  else { let fin = b; while (fin > a + 1 && !I.lineas[fin - 1].trim()) fin--; I.lineas.splice(fin, 0, '', '_' + marca + '_'); }
  fs.writeFileSync(I.file, I.lineas.join('\n'));
}
function promoverIdea(p, { n, descripcion, tipo, donde, quien }) {
  if (!String(descripcion || '').trim()) throw new Error('Escribe qué se pide (una línea)');
  const id = agregarFila(p, { descripcion, tipo, donde, quien: quien || 'Yanga', modulo: '' });
  marcarIdea(p, n, `Procesado el ${HOY_ISO()} → ${id} (Panel).`);
  return id;
}
function descartarIdea(p, { n, motivo }) { marcarIdea(p, n, `Descartado el ${HOY_ISO()}${String(motivo || '').trim() ? ': ' + sinBarras(motivo).trim() : ''}.`); }

// Hoy: lo que te toca en todos los proyectos, por urgencia (máximo 5 en pantalla, el resto en "ver todo").
function hoy() {
  const out = [], hoyD = HOY_ISO(), en7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  for (const p of PROYECTOS) {
    if (['pausado', 'idea'].includes(p.estado)) continue;
    const base = { pid: p.id, codigo: p.codigo, nombre: p.nombre, cliente: p.cliente };
    let C = null; try { C = resumenCobros(p); } catch { }
    const vencidas = C ? C.filas.filter(x => !x.pagado && /^\d{4}-\d{2}-\d{2}/.test(x.fecha) && x.fecha < hoyD).map(x => x.fecha).sort() : [];
    if (C && C.vencido) out.push({ ...base, tipo: 'vencido', peso: 100, monto: C.vencido, desde: vencidas[0] || '', titulo: '$' + Math.round(C.vencido).toLocaleString('es-MX') + ' vencido', detalle: 'Cobro de ' + p.nombre, ir: 'cobros' });
    else if (C && C.proximo && C.proximo.fecha && C.proximo.fecha >= hoyD && C.proximo.fecha <= en7) out.push({ ...base, tipo: 'pago', peso: 60, titulo: 'Pago el ' + fFecha(C.proximo.fecha) + ' · $' + Math.round(C.proximo.monto).toLocaleString('es-MX'), detalle: C.proximo.concepto + ' · ' + p.nombre, ir: 'cobros' });
    const cl = parseChangelog(p);
    if (cl.file) {
      const iE = colIndex(cl.headers, 'estado', 5), iV = colIndex(cl.headers, 'verificaci', 7);
      const fallas = cl.rows.filter(r => (r.cells[iE] || '').includes('✅') && /Fall[oó] el \d{4}/.test(r.cells[iV] || ''));
      const fFalla = fallas.map(r => ((r.cells[iV] || '').match(/Fall[oó] el (\d{4}-\d{2}-\d{2})/g) || []).pop() || '').map(t => t.slice(-10)).filter(Boolean).sort();
      if (fallas.length) out.push({ ...base, tipo: 'fallo', peso: 90, n: fallas.length, desde: fFalla[0] || '', titulo: fallas.length === 1 ? fallas[0].cells[0] + ' falló' : fallas.length + ' piezas fallaron', detalle: 'La IA las arregla; tú vuelves a probar', ir: 'piezas', pieza: fallas.length === 1 ? fallas[0].cells[0] : null });
    }
    let K = null; try { K = carrilesProyecto(p); } catch { }
    if (K && K.lleno) out.push({ ...base, tipo: 'limite', peso: 88, n: K.porProbar.length, titulo: K.porProbar.length + ' piezas por probar: llegaste al límite', detalle: 'Prueba antes de abrir más (regla 18, límite ' + K.limite + ')', ir: 'verificar' });
    if (K && K.choques.length) { const c = K.choques[0]; out.push({ ...base, tipo: 'choque', peso: 82, n: K.choques.length, titulo: K.choques.length === 1 ? 'Dos carriles en el mismo lugar' : K.choques.length + ' choques de lugar entre carriles', detalle: c.pa + ' (' + c.a + ') y ' + c.pb + ' (' + c.b + ') · ' + (c.donde || 'mismo módulo'), ir: 'carriles' }); }
    let ver = []; try { ver = porVerificar(p, false); } catch { }
    if (ver.length) {
      const corta = ver.filter(x => x.total).sort((a, b) => (a.total - a.hechos) - (b.total - b.hechos))[0];
      const fVer = ver.map(x => x.construida || x.fecha || '').filter(Boolean).sort();
      out.push({ ...base, tipo: 'probar', peso: 70 + Math.min(ver.length, 9), n: ver.length, desde: fVer[0] || '', titulo: ver.length + (ver.length === 1 ? ' pieza por probar' : ' piezas por probar'), detalle: corta ? 'Empieza por ' + corta.id + ' (' + (corta.total - corta.hechos) + ((corta.total - corta.hechos) === 1 ? ' paso)' : ' pasos)') : 'Sin checklist todavía', ir: 'verificar' });
    }
    let dec = []; try { dec = resumenPuntos(p) ? porDecidir(p) : []; } catch { }
    if (dec.length) out.push({ ...base, tipo: 'decidir', peso: 65, n: dec.length, desde: dec.map(x => x.fecha).filter(Boolean).sort()[0] || '', titulo: dec.length + (dec.length === 1 ? ' cobro por decidir' : ' cobros por decidir'), detalle: 'Cobrar, regalar o garantía', ir: 'cobros' });
    let I = { ideas: [] }; try { I = parseIdeas(p); } catch { }
    const sin = I.ideas.filter(x => x.estado === 'sin').length;
    if (sin >= 3) out.push({ ...base, tipo: 'ideas', peso: 40, n: sin, desde: I.ideas.filter(x => x.estado === 'sin').map(x => x.fecha).filter(Boolean).sort()[0] || '', titulo: sin + ' ideas sin procesar', detalle: 'Promuévelas a pieza o descártalas', ir: 'inbox' });
    if (p.etapa === 'construccion' && cl.file) {
      const h = leerJson(histDe(p), []), ult = h.length ? String(h[h.length - 1].f).slice(0, 10) : '';
      const dias = ult ? Math.floor((Date.parse(hoyD) - Date.parse(ult)) / 864e5) : 0;
      if (dias >= 10) out.push({ ...base, tipo: 'quieto', peso: 30, desde: ult, titulo: dias + ' días sin moverse', detalle: p.nombre + ' está en Construcción', ir: 'tablero' });
    }
  }
  return out.sort((a, b) => b.peso - a.peso);
}

// ---------- Inicio (TMN-057): lo de hoy, la semana y cada proyecto de un vistazo ----------
const NOM_ETAPA_S = { brief: 'Brief', descubrimiento: 'Descubrimiento', cotizacion: 'Cotización', aceptado: 'Aceptado', construccion: 'Construcción', entregado: 'Entregado', mantenimiento: 'Mantenimiento' };
const claveHoy = x => [x.tipo, x.pid, x.pieza || ''].join('|');
const pospuestosVivos = () => { const h = HOY_ISO(); return Object.fromEntries(Object.entries(CONFIG_BASE.pospuestos || {}).filter(([, f]) => String(f) > h)); };
function inicio() {
  const hoyD = HOY_ISO(), en14 = masDias(hoyD, 14), en60 = masDias(hoyD, 60), pos = pospuestosVivos();
  const todos = hoy().map(x => ({ ...x, clave: claveHoy(x) })), items = todos.filter(x => !pos[x.clave]);
  let porProbar = 0, porDecidirMxn = 0, vencido = 0;
  const semana = [], proyectos = [], fijados = CONFIG_BASE.fijados || [];
  for (const p of PROYECTOS) {
    const cl = parseChangelog(p), iE = colIndex(cl.headers, 'estado', 5);
    const ids = cl.file ? cl.rows.filter(r => /^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '')) : [];
    const cuenta = re => ids.filter(r => re.test(r.cells[iE] || '')).length;
    const total = ids.length - cuenta(/🚫/), verificadas = cuenta(/✔️/), construidas = cuenta(/✅/), pendientes = cuenta(/🔲/), taller = cuenta(/🔄|🔨/);
    let ver = 0; try { ver = porVerificar(p, false).length; } catch { }
    let pd = 0; try { const P = resumenPuntos(p); if (P) pd = porDecidir(p).reduce((a, x) => a + (+x.puntos || 0), 0) * (P.valor || 0); } catch { }
    let C = null; try { C = resumenCobros(p); } catch { }
    const vivo = !['pausado', 'entregado'].includes(p.estado);
    if (vivo) { porProbar += ver; porDecidirMxn += pd; vencido += (C && C.vencido) || 0; }
    const ev = [];
    try { for (const f of pagosDe(p)) if (f.estado !== 'pagado') ev.push({ fecha: f.fecha, tipo: 'pago', txt: (f.concepto || 'Pago') + ' · $' + Math.round(f.monto).toLocaleString('es-MX'), vencido: f.estado === 'vencido' }); } catch { }
    for (const h of hitosDe(p)) if (!h.hecho) ev.push({ fecha: h.fecha, tipo: 'hito', txt: h.nombre });
    const plan = (p.tmn && p.tmn.etapasPlan) || {}, iAct = ETAPAS.indexOf(p.etapa);
    for (const [e, x] of Object.entries(plan)) if (x && esDia(x.fin) && ETAPAS.indexOf(e) >= iAct) ev.push({ fecha: x.fin, tipo: 'etapa', txt: 'Termina ' + (NOM_ETAPA_S[e] || e) });
    if (vivo) for (const e of ev) if (e.fecha >= hoyD && e.fecha <= en14) semana.push({ ...e, pid: p.id, codigo: p.codigo, nombre: p.nombre, cliente: p.cliente });
    const proximo = ev.filter(e => e.fecha >= hoyD && e.fecha <= en60).sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null;
    const h = leerJson(histDe(p), []).filter(e => !e.aprox), ultH = h.length ? Date.parse(h[h.length - 1].f) || 0 : 0;
    let ultA = 0; for (const f of [cl.file, inboxDe(p), p.tmnFile]) { try { if (f) ultA = Math.max(ultA, fs.statSync(f).mtimeMs); } catch { } }
    const ultimo = Math.max(ultH, ultA);
    proyectos.push({ id: p.id, total, verificadas, construidas, pendientes, taller, porProbar: ver, porDecidirMxn: Math.round(pd), vencido: Math.round((C && C.vencido) || 0), proximo, ultimo: ultimo ? new Date(ultimo).toISOString() : '', fijo: fijados.includes(p.id) });
  }
  semana.sort((a, b) => a.fecha.localeCompare(b.fecha) || ['pago', 'hito', 'etapa'].indexOf(a.tipo) - ['pago', 'hito', 'etapa'].indexOf(b.tipo));
  return { hoy: hoyD, faltantes: (() => { try { return faltantesTodos(); } catch { return []; } })(), items, pospuestos: todos.length - items.length, kpis: { porProbar, porDecidirMxn: Math.round(porDecidirMxn), vencido: Math.round(vencido) }, semana, proyectos };
}
function posponerHoy(clave) { CONFIG_BASE.pospuestos = { ...pospuestosVivos(), [String(clave)]: masDias(HOY_ISO(), 1) }; guardarConfigBase(); }
function fijarProyecto(pid, fijo) { const f = new Set(CONFIG_BASE.fijados || []); fijo ? f.add(pid) : f.delete(pid); CONFIG_BASE.fijados = [...f].filter(id => PROYECTOS.some(p => p.id === id)); guardarConfigBase(); }

// ---------- Carriles e hilos (TMN-068, reglas 18 y 25) ----------
// HILOS-[COD].md: una fila por conversación de IA. Un carril está ocupado cuando su hilo tiene alguna pieza 🔄.
// Lo escribe la IA (regla 25); el panel lo lee y, con "Tomar pieza", agrega una fila.
const hilosArchivo = p => archivoRaiz(p.ruta, /^HILOS-[^.]+\.md$/i);
const RE_HILO = /HILO-[A-Za-z0-9_]+-\d+/gi;
const hilosEn = t => [...new Set((String(t || '').match(RE_HILO) || []).map(x => x.toUpperCase()))];
function parseHilos(p) {
  const file = hilosArchivo(p);
  if (!file) return { file: null, headers: [], hilos: [], lines: [] };
  const lines = (leer(file) || '').split('\n');
  let headers = [], hi = -1; const hilos = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim(); if (!l.startsWith('|')) continue;
    const c = celdasFila(l);
    if (hi < 0) { headers = c; hi = i; continue; }
    if (/^[-:\s|]+$/.test(l)) continue;
    const col = re => { const k = idxCol(headers, re); return k >= 0 ? (c[k] || '').trim() : ''; };
    const id = (col(/^hilo/i).match(RE_HILO) || [''])[0].toUpperCase(); if (!id) continue;
    const enl = col(/enlace|link/i), url = (enl.match(/https?:\/\/[^\s)>\]]+/) || [''])[0];
    hilos.push({ i, hilo: id, fecha: col(/^fecha/i), carril: parseInt(col(/carril/i), 10) || 0, piezas: col(/piezas?/i).split(/[,;\s]+/).map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9_]+-\d+$/.test(s)),
      donde: col(/^d[oó]nde/i), estado: col(/^estado/i) || 'Abierto', enlace: url || enl.replace(/^\(?opcional\)?$/i, '') });
  }
  return { file, headers, hilos, lines };
}
const cfgCarriles = p => ({ max: Math.max(1, +(p.cfg && p.cfg.maxCarriles) || 3), limite: Math.max(1, +(p.cfg && p.cfg.limitePorProbar) || 6) });
// Dónde a clave comparable: módulo y página (si la hay), sin mayúsculas ni espacios de más.
const lugarClave = d => String(d || '').split('›').map(s => s.trim().toLowerCase()).filter(Boolean);
function mismoLugar(a, b) {
  const A = lugarClave(a), B = lugarClave(b); if (!A.length || !B.length) return false;
  if (A[0] !== B[0]) return false;
  if (A.length < 2 || B.length < 2) return true; // uno se queda en el módulo: comparten módulo
  return A[1] === B[1];
}
function carrilesProyecto(p) {
  const { max, limite } = cfgCarriles(p), H = parseHilos(p), cl = parseChangelog(p), C = cl.headers;
  const iE = colIndex(C, 'estado', 5), iD = (i => i >= 0 ? i : 4)(idxCol(C, /descrip|solicitud/i)), iDo = idxCol(C, /^d[oó]nde$/i), iH = idxCol(C, /^hilos?$/i);
  const filas = (cl.file ? cl.rows : []).filter(r => /^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || ''));
  const pz = {}; for (const r of filas) { const raro = r.cells.length > C.length; pz[r.cells[0].toUpperCase()] = { id: r.cells[0], estado: r.cells[iE] || '', titulo: ((r.cells[iD] || '').match(/\*\*([^*]+)\*\*/) || [0, (r.cells[iD] || '').slice(0, 90)])[1].replace(/:$/, ''), donde: !raro && iDo >= 0 ? r.cells[iDo] || '' : '', hilos: iH >= 0 ? hilosEn(r.cells[iH]) : hilosEn(r.cells.join(' ')) }; }
  // un hilo junta las piezas de su fila en HILOS y las que lo nombran en el changelog
  const por = new Map();
  for (const h of H.hilos) por.set(h.hilo, { ...h, piezas: [...h.piezas] });
  for (const x of Object.values(pz)) for (const hid of x.hilos) { if (!por.has(hid)) por.set(hid, { hilo: hid, fecha: '', carril: 0, piezas: [], donde: '', estado: 'Abierto', enlace: '', soloChangelog: true }); const h = por.get(hid); if (!h.piezas.includes(x.id.toUpperCase())) h.piezas.push(x.id.toUpperCase()); }
  const hilos = [...por.values()].map(h => {
    const ps = h.piezas.map(id => pz[id] || { id, estado: '', titulo: '(no está en el changelog)', donde: '' });
    const taller = ps.filter(x => /🔄|🔨/.test(x.estado)), abiertas = ps.filter(x => !/✔|🚫/.test(x.estado));
    return { ...h, piezas: ps, taller, ocupado: taller.length > 0, cerrable: ps.length > 0 && !abiertas.length && !/cerrad/i.test(h.estado) };
  }).sort((a, b) => a.hilo.localeCompare(b.hilo, 'es', { numeric: true }));
  const ocupados = hilos.filter(h => h.ocupado);
  const carriles = []; for (let n = 1; n <= max; n++) carriles.push({ n, hilos: ocupados.filter(h => h.carril === n) });
  const sinCarril = ocupados.filter(h => !(h.carril >= 1 && h.carril <= max));
  const enTaller = filas.filter(r => /🔄|🔨/.test(r.cells[iE] || '')).map(r => r.cells[0]);
  const conHilo = new Set(ocupados.flatMap(h => h.taller.map(x => x.id)));
  const sinHilo = enTaller.filter(id => !conHilo.has(id));
  const porProbar = filas.filter(r => (r.cells[iE] || '').includes('✅')).map(r => r.cells[0]);
  const choques = [];
  for (let a = 0; a < ocupados.length; a++) for (let b = a + 1; b < ocupados.length; b++) {
    for (const x of ocupados[a].taller) for (const y of ocupados[b].taller) if (x.id !== y.id && mismoLugar(x.donde, y.donde)) choques.push({ a: ocupados[a].hilo, ca: ocupados[a].carril, pa: x.id, b: ocupados[b].hilo, cb: ocupados[b].carril, pb: y.id, donde: x.donde });
  }
  // números de hilo saltados o repetidos (dos sesiones tomaron el mismo)
  const cod = escRe(p.codigo), reN = new RegExp('^HILO-' + cod + '-(\\d+)$', 'i'), nums = H.hilos.map(h => (h.hilo.match(reN) || [])[1]).filter(Boolean).map(Number);
  const vistos = {}; nums.forEach(n => vistos[n] = (vistos[n] || 0) + 1);
  const repetidos = Object.keys(vistos).filter(n => vistos[n] > 1).map(n => 'HILO-' + p.codigo + '-' + String(n).padStart(3, '0'));
  const libres = carriles.filter(c => !c.hilos.length).map(c => c.n);
  return { archivo: H.file ? path.basename(H.file) : null, max, limite, porProbar, lleno: porProbar.length >= limite, carriles, sinCarril, libres, sinHilo, choques, repetidos,
    hilos: hilos.map(h => ({ hilo: h.hilo, fecha: h.fecha, carril: h.carril, estado: h.estado, enlace: h.enlace, donde: h.donde, ocupado: h.ocupado, cerrable: h.cerrable, soloChangelog: !!h.soloChangelog, piezas: h.piezas.map(x => ({ id: x.id, estado: x.estado, titulo: x.titulo, donde: x.donde })) })),
    siguiente: 'HILO-' + p.codigo + '-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0') };
}
function hilosDePieza(p, id) {
  const C = carrilesProyecto(p), u = String(id).toUpperCase();
  return C.hilos.filter(h => h.piezas.some(x => x.id.toUpperCase() === u)).map(h => ({ hilo: h.hilo, fecha: h.fecha, carril: h.carril, estado: h.estado, enlace: h.enlace }));
}
const HILOS_ENCABEZADO = cod => `# Hilos · ${cod}\n\nCada conversación de IA que trabaja una pieza recibe un código \`HILO-${cod}-NNN\` (regla 25). Lo pone la IA sola al empezar; tú solo buscas el código en tus chats para encontrar dónde se trabajó algo.\nUn carril está ocupado cuando su hilo tiene alguna pieza 🔄 En construcción (regla 18). Una fila por hilo; varias piezas se separan con coma. El Enlace es opcional: pégalo en el chat y la IA lo guarda aquí.\n\n| Hilo | Fecha | Carril | Piezas | Dónde | Estado | Enlace |\n|---|---|---|---|---|---|---|\n`;
// Agrega el hilo a la columna Hilo del changelog (la crea al final si no existe). Solo toca esa fila.
function ponerHiloEnChangelog(p, id, hilo) {
  let cl = parseChangelog(p); if (!cl.file) throw new Error('Este proyecto no tiene changelog');
  if (idxCol(cl.headers, /^hilos?$/i) < 0) {
    let hi = -1; for (let i = 0; i < cl.lines.length; i++) if (cl.lines[i].trim().startsWith('|')) { hi = i; break; }
    const todas = [...cl.headers, 'Hilo'];
    cl.lines[hi] = '| ' + todas.join(' | ') + ' |';
    if (cl.lines[hi + 1] && /^[-:\s|]+$/.test(cl.lines[hi + 1].trim())) cl.lines[hi + 1] = '|' + todas.map(() => '---').join('|') + '|';
    fs.writeFileSync(cl.file, cl.lines.join('\n')); cl = parseChangelog(p);
  }
  const row = cl.rows.find(r => r.cells[0] === id); if (!row) throw new Error(`No encontré la fila ${id}`);
  const i = idxCol(cl.headers, /^hilos?$/i), R = [...row.raw];
  while (R.length < cl.headers.length + row.d) R.push('');
  const prev = hilosEn(R[iRaw(row, i)]); if (!prev.includes(hilo)) prev.push(hilo);
  R[iRaw(row, i)] = prev.join(', ');
  cl.lines[row.i] = '| ' + R.join(' | ') + ' |';
  fs.writeFileSync(cl.file, cl.lines.join('\n'));
}
// "Tomar pieza" desde el panel: nuevo hilo con el primer carril libre, la pieza pasa a 🔄 y se devuelve el mensaje de arranque.
function tomarPieza(p, id, forzar) {
  const cl = parseChangelog(p), row = cl.rows.find(r => r.cells[0] === id);
  if (!row) throw new Error(`No encontré ${id} en el changelog`);
  const iE = colIndex(cl.headers, 'estado', 5), iDo = idxCol(cl.headers, /^d[oó]nde$/i);
  if (!/🔲|🔄|🔨/.test(row.cells[iE] || '')) throw new Error(`${id} no está Pendiente ni en el taller`);
  const C = carrilesProyecto(p), donde = iDo >= 0 && row.cells.length <= cl.headers.length ? row.cells[iDo] || '' : '';
  const avisos = [];
  if (C.lleno) avisos.push(`Hay ${C.porProbar.length} piezas por probar (límite ${C.limite}). Prueba antes de abrir más.`);
  if (!C.libres.length) avisos.push(`Los ${C.max} carriles están ocupados: ${C.carriles.map(c => c.hilos.map(h => h.hilo).join(', ')).join(' · ')}.`);
  const choque = C.hilos.filter(h => h.ocupado && h.piezas.some(x => /🔄|🔨/.test(x.estado) && x.id !== id && mismoLugar(x.donde, donde)));
  if (choque.length) avisos.push(`Otro carril trabaja el mismo lugar: ${choque.map(h => h.hilo + (h.carril ? ' (carril ' + h.carril + ')' : '')).join(', ')}.`);
  const bloquea = C.lleno || !C.libres.length;
  if (avisos.length && !forzar) return { ok: false, avisos, bloquea };
  const carril = C.libres[0] || 0, hilo = C.siguiente;
  // 1) la fila en HILOS (se relee justo antes de escribir, regla 23)
  let file = hilosArchivo(p);
  if (!file) { file = path.join(p.ruta, `HILOS-${p.codigo}.md`); fs.writeFileSync(file, HILOS_ENCABEZADO(p.codigo)); }
  const H = parseHilos(p);
  if (H.hilos.some(h => h.hilo === hilo)) throw new Error(`${hilo} ya existe; vuelve a intentar`);
  const lines = H.lines; let ult = -1; for (let i = 0; i < lines.length; i++) if (lines[i].trim().startsWith('|')) ult = i;
  lines.splice(ult + 1, 0, '| ' + [hilo, HOY_ISO(), carril || '', id, sinBarras(donde), 'Abierto', ''].join(' | ') + ' |');
  fs.writeFileSync(file, lines.join('\n'));
  // 2) la pieza: columna Hilo y estado
  ponerHiloEnChangelog(p, id, hilo);
  if (!/🔄|🔨/.test(row.cells[iE] || '')) actualizarEstado(p, id, '🔄 En construcción', `Tomada desde el panel el ${HOY_ISO()} · ${hilo}` + (avisos.length ? ' · con aviso: ' + avisos.join(' ') : ''), true);
  const linea = `**${hilo} · Carril ${carril || '—'} · ${id}${donde ? ' · ' + donde : ''}**`;
  const mensaje = `${linea}\n\nEste chat es ${hilo}. Trabaja ${id} en el carril ${carril || '—'} (regla 18): lee su spec en specs/ y sus comentarios antes de tocar nada, y anota ${hilo} en todo lo que registres (regla 25).`;
  return { ok: true, hilo, carril, linea, mensaje, nombreChat: `${hilo} · ${(row.cells[(i => i >= 0 ? i : 4)(idxCol(cl.headers, /descrip|solicitud/i))] || '').match(/\*\*([^*]+)\*\*/)?.[1]?.replace(/:$/, '') || id}`, avisos };
}
// Enlace opcional de un hilo
function ponerEnlaceHilo(p, hilo, enlace) {
  const H = parseHilos(p); if (!H.file) throw new Error('Este proyecto no tiene HILOS');
  const h = H.hilos.find(x => x.hilo === String(hilo).toUpperCase()); if (!h) throw new Error(`No encontré ${hilo}`);
  const c = celdasFila(H.lines[h.i]), k = idxCol(H.headers, /enlace|link/i); if (k < 0) throw new Error('HILOS no tiene columna Enlace');
  while (c.length < H.headers.length) c.push('');
  c[k] = sinBarras(enlace); H.lines[h.i] = '| ' + c.join(' | ') + ' |';
  fs.writeFileSync(H.file, H.lines.join('\n'));
}

// ---------- Datos que faltan en las piezas (TMN-065) ----------
// Sin puntos (desde "Registrar desde"), sin Tipo o sin Dónde: las abiertas y las registradas en los últimos 30 días.
function datosFaltantes(p) {
  const cl = parseChangelog(p); if (!cl.file) return { sinPuntos: [], sinTipo: [], sinDonde: [], conPuntos: false };
  const H = cl.headers, iE = colIndex(H, 'estado', 5), iF = colIndex(H, 'fecha', 1), iT = idxCol(H, /^tipo$/i), iDo = idxCol(H, /^d[oó]nde$/i), hace30 = masDias(HOY_ISO(), -30);
  const filas = cl.rows.filter(r => /^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '') && !/🚫/.test(r.cells[iE] || '') && r.cells.length <= H.length);
  const recientes = filas.filter(r => /🔲|🔄|🔨|✅/.test(r.cells[iE] || '') || (r.cells[iF] || '') >= hace30);
  const tipoDe = r => iT >= 0 ? r.cells[iT] || '' : '';
  let P = null; try { P = resumenPuntos(p); } catch { }
  const sinPuntos = P ? P.sinPuntos.map(x => x.id).filter(id => { const r = filas.find(f => f.cells[0] === id); return r && tipoDe(r) !== 'Interno'; }) : [];
  return { sinPuntos, sinTipo: recientes.filter(r => !TIPOS_SOL.includes(tipoDe(r))).map(r => r.cells[0]), sinDonde: recientes.filter(r => !(iDo >= 0 && (r.cells[iDo] || '').trim())).map(r => r.cells[0]), conPuntos: !!P };
}
function faltantesTodos() {
  const out = [];
  for (const p of PROYECTOS) { if (['pausado', 'entregado'].includes(p.estado)) continue; let d; try { d = datosFaltantes(p); } catch { continue; } if (d.sinPuntos.length || d.sinTipo.length || d.sinDonde.length) out.push({ pid: p.id, codigo: p.codigo, nombre: p.nombre, ruta: p.ruta, ...d }); }
  return out;
}
// horas encendido de un proyecto entre dos días (arranques terminados y el que sigue corriendo)
function horasEntre(p, a, b) {
  const arr = leerJson(path.join(p.ruta, '.timon', 'arranques.json'), []);
  for (const [k, r] of corriendo) if (k.startsWith(p.id + '#') && r.proc && r.desde) arr.push({ desde: r.desde, hasta: new Date().toISOString() });
  let ms = 0; const ini0 = Date.parse(a + 'T00:00:00'), fin0 = Date.parse(b + 'T23:59:59');
  for (const x of arr) { const i = Math.max(Date.parse(x.desde), ini0), f = Math.min(Date.parse(x.hasta), fin0); if (f > i) ms += f - i; }
  return ms / 36e5;
}

// ---------- Métricas del proyecto (TMN-064) ----------
// Todo sale de lo que ya hay: changelog (registro, tipo, dónde, notas de verificación), historial de estados, PUNTOS, COBROS, ideas y arranques.
const RE_FECHA_VER = /(?:verificad[oa]|confirmad[oa]|cerrad[oa])[^|]*?(\d{4}-\d{2}-\d{2})/i;
const semanaDe = f => { const d = new Date(f + 'T12:00:00'); const dd = (d.getDay() + 6) % 7; return masDias(f, -dd); };
function metricasProyecto(p, rango) {
  const hoyD = HOY_ISO(), cl = parseChangelog(p), H = cl.headers;
  const iE = colIndex(H, 'estado', 5), iF = colIndex(H, 'fecha', 1), iV = colIndex(H, 'verificaci', 7), iT = idxCol(H, /^tipo$/i), iDo = idxCol(H, /^d[oó]nde$/i), iD = (i => i >= 0 ? i : 4)(idxCol(H, /descrip|solicitud/i));
  const hist = leerJson(histDe(p), []).filter(e => e.tipo === 'pieza' && e.id && !e.aprox);
  const P = resumenPuntos(p), ptsDe = {}, tipoCobro = {}; if (P) for (const f of P.filas) { ptsDe[f.id] = f.puntos; tipoCobro[f.id] = f.tipo; }
  const valor = P ? P.valor : cobroBase().valorPunto;
  const piezas = (cl.file ? cl.rows : []).filter(r => /^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '')).map(r => {
    const id = r.cells[0], ev = hist.filter(e => e.id === id), ver = r.cells[iV] || '', raro = r.cells.length > H.length;
    const ult = re => { const e = [...ev].reverse().find(e => re.test(e.a || '')); return e ? dia(e.f) : ''; };
    let verif = /✔/.test(r.cells[iE] || '') ? ult(/✔/) : '';
    if (!verif && /✔/.test(r.cells[iE] || '')) { const m = ver.match(RE_FECHA_VER); if (m) verif = m[1]; }
    const fallos = (ver.match(/Fall[oó] el (\d{4}-\d{2}-\d{2})/g) || []).map(x => x.slice(-10));
    return { id, reg: esDia(r.cells[iF]) ? dia(r.cells[iF]) : '', con: ult(/✅/), verif, estado: r.cells[iE] || '', fallos,
      reabierta: ev.some(e => /✔/.test(e.de || '') && !/✔/.test(e.a || '')), tipo: !raro && iT >= 0 ? r.cells[iT] || '' : '',
      modulo: !raro && iDo >= 0 ? String(r.cells[iDo] || '').split('›')[0].trim() : '', pts: ptsDe[id] || 0, cobro: tipoCobro[id] || '',
      titulo: (((r.cells[iD] || '').match(/\*\*(.+?)\*\*/) || [])[1] || (r.cells[iD] || '').split(/[.:(]/)[0]).replace(/:$/, '').slice(0, 90),
      ultimo: ev.length ? dia(ev[ev.length - 1].f) : (esDia(r.cells[iF]) ? dia(r.cells[iF]) : '') };
  });
  const hecho = x => x.con || x.verif; // el día en que quedó hecho lo construido
  // días: registradas, construidas, verificadas y puntos
  const D = {}, al = f => (D[f] = D[f] || { reg: 0, con: 0, ver: 0, pts: 0 });
  for (const x of piezas) { if (x.reg) al(x.reg).reg++; if (x.con) al(x.con).con++; if (x.verif) al(x.verif).ver++; const h = hecho(x); if (h && x.pts) al(h).pts += x.pts; }
  // rango
  const dias = rango === '7' ? 7 : rango === '30' ? 30 : rango === '90' ? 90 : 0;
  const primero = Object.keys(D).sort()[0] || hoyD;
  const desde = dias ? masDias(hoyD, -(dias - 1)) : primero, antes = dias ? masDias(desde, -dias) : null;
  const en = (f, a, b) => f && f >= a && f <= b;
  const kpi = (a, b) => {
    const xs = piezas.filter(x => en(hecho(x), a, b)), vs = piezas.filter(x => en(x.verif, a, b));
    const pts = xs.reduce((t, x) => t + x.pts, 0), espera = vs.filter(x => x.con && x.verif >= x.con).map(x => diasEntre(x.con, x.verif));
    const probadas = piezas.filter(x => en(x.verif, a, b) || x.fallos.some(f => en(f, a, b)));
    return { pts, valor: Math.round(pts * valor), verificadas: vs.length, construidas: piezas.filter(x => en(x.con, a, b)).length,
      espera: espera.length ? Math.round(espera.reduce((t, v) => t + v, 0) / espera.length * 10) / 10 : null,
      fallan: probadas.length ? Math.round(probadas.filter(x => x.fallos.length).length / probadas.length * 100) : null };
  };
  const ahora = kpi(desde, hoyD), previo = antes ? kpi(antes, masDias(desde, -1)) : null;
  // calendario de calor: 13 semanas hasta hoy
  const lunes = semanaDe(hoyD), cal = [];
  for (let w = 12; w >= 0; w--) { const ini = masDias(lunes, -7 * w), sem = []; for (let d = 0; d < 7; d++) { const f = masDias(ini, d); sem.push(f > hoyD ? null : { f, ...(D[f] || { reg: 0, con: 0, ver: 0, pts: 0 }) }); } cal.push({ ini, dias: sem }); }
  // por día de la semana (en el rango) y mejor día
  const semanaDia = [0, 0, 0, 0, 0, 0, 0].map(() => ({ pts: 0, con: 0, ver: 0 }));
  let mejor = null;
  for (const [f, v] of Object.entries(D)) if (f >= desde && f <= hoyD) { const k = (new Date(f + 'T12:00:00').getDay() + 6) % 7; semanaDia[k].pts += v.pts; semanaDia[k].con += v.con; semanaDia[k].ver += v.ver; if (!mejor || v.pts > mejor.pts || (v.pts === mejor.pts && v.con + v.ver > mejor.con + mejor.ver)) mejor = { f, ...v }; }
  // rachas (días seguidos con algo construido o verificado; los fines de semana sin trabajo no la rompen)
  const activo = f => D[f] && (D[f].con || D[f].ver || D[f].reg);
  let racha = 0; for (let f = hoyD; ; f = masDias(f, -1)) { const fin = [0, 6].includes(new Date(f + 'T12:00:00').getDay()); if (activo(f)) racha++; else if (!(fin || f === hoyD)) break; if (f < primero) break; }
  let larga = 0, cur = 0; for (let f = primero; f <= hoyD; f = masDias(f, 1)) { const fin = [0, 6].includes(new Date(f + 'T12:00:00').getDay()); if (activo(f)) { cur++; larga = Math.max(larga, cur); } else if (!fin) cur = 0; }
  // puntos por semana (12) por tipo de cobro
  const semanas = []; for (let w = 11; w >= 0; w--) semanas.push({ ini: masDias(lunes, -7 * w), Contratado: 0, Extra: 0, 'Garantía': 0, 'Cortesía': 0, Otro: 0 });
  for (const x of piezas) { const h = hecho(x); if (!h || !x.pts) continue; const s0 = semanas.find(s => h >= s.ini && h <= masDias(s.ini, 6)); if (s0) s0[['Contratado', 'Extra', 'Garantía', 'Cortesía'].includes(x.cobro) ? x.cobro : 'Otro'] += x.pts; }
  // flujo
  const prom = arr => arr.length ? Math.round(arr.reduce((t, v) => t + v, 0) / arr.length * 10) / 10 : null;
  const regCon = prom(piezas.filter(x => x.reg && x.con && x.con >= x.reg && en(x.con, desde, hoyD)).map(x => diasEntre(x.reg, x.con)));
  const conVer = prom(piezas.filter(x => x.con && x.verif && x.verif >= x.con && en(x.verif, desde, hoyD)).map(x => diasEntre(x.con, x.verif)));
  let pila = []; try { const T = tiempoProyecto(p); for (let i = 29; i >= 0; i--) { const f = masDias(hoyD, -i); pila.push({ f, n: T.piezas.filter(x => x.tramos.some(t => /✅/.test(t.estado) && t.desde <= f && (t.hasta || hoyD) >= f && !(t.hasta === f && !t.abierto && t.hasta !== t.desde))).length }); } } catch { }
  const abiertas = piezas.filter(x => /🔲|🔄|🔨|✅/.test(x.estado));
  const viejas = abiertas.slice().sort((a, b) => String(a.ultimo).localeCompare(String(b.ultimo))).slice(0, 5).map(x => ({ id: x.id, titulo: x.titulo, estado: x.estado, dias: x.ultimo ? diasEntre(x.ultimo, hoyD) : null }));
  // calidad
  const mezcla = {}; for (const x of piezas) if (TIPOS_SOL.includes(x.tipo) && !/🚫/.test(x.estado)) mezcla[x.tipo] = (mezcla[x.tipo] || 0) + 1;
  const falloMod = {}; for (const x of piezas) if (x.fallos.length && x.modulo) falloMod[x.modulo] = (falloMod[x.modulo] || 0) + x.fallos.length;
  // dinero
  const C = (() => { try { return resumenCobros(p); } catch { return null; } })();
  const hechosPts = P ? (P.totales.Contratado || 0) + (P.totales.Extra || 0) + (P.totales.Iguala || 0) : 0;
  const mes = hoyD.slice(0, 7), regaladoMes = piezas.filter(x => x.cobro === 'Cortesía' && (hecho(x) || x.reg || '').startsWith(mes)).reduce((t, x) => t + x.pts, 0);
  // alcance
  const modulos = {}; for (const x of piezas) if (x.modulo && !/🚫/.test(x.estado)) modulos[x.modulo] = (modulos[x.modulo] || 0) + 1;
  let ideas = []; try { ideas = parseIdeas(p).ideas; } catch { }
  const fuera = P ? (P.totales.Extra || 0) + (P.totales['Por decidir'] || 0) : 0;
  // horas encendido, últimos 7 días
  const arr = leerJson(path.join(p.ruta, '.timon', 'arranques.json'), []);
  for (const [k, r] of corriendo) if (k.startsWith(p.id + '#') && r.proc && r.desde) arr.push({ l: '', desde: r.desde, hasta: new Date().toISOString(), vivo: true });
  const horas = []; for (let i = 6; i >= 0; i--) { const f = masDias(hoyD, -i); let ms = 0, n = 0; for (const a of arr) { if (dia(a.desde) === f) n++; const ini = Math.max(Date.parse(a.desde), Date.parse(f + 'T00:00:00')), fin = Math.min(Date.parse(a.hasta), Date.parse(f + 'T23:59:59')); if (fin > ini) ms += fin - ini; } horas.push({ f, h: Math.round(ms / 36e5 * 10) / 10, n }); }
  const larg = arr.reduce((m, a) => Math.max(m, Date.parse(a.hasta) - Date.parse(a.desde)), 0);
  // pronóstico
  const R = ritmo(p), plan = (p.tmn && p.tmn.etapasPlan) || {}, finPlan = p.etapa && plan[p.etapa] && plan[p.etapa].fin || '';
  return {
    hoy: hoyD, rango: rango || 'todo', desde, valorPunto: valor, ahora, previo,
    calendario: cal, semanaDia, mejor, racha, rachaLarga: larga, semanas,
    flujo: { regCon, conVer, pila, viejas },
    calidad: { fallan: ahora.fallan, reabiertas: piezas.filter(x => x.reabierta).length, mezcla, falloModulos: Object.entries(falloMod).sort((a, b) => b[1] - a[1]).slice(0, 4) },
    dinero: { semana: Math.round(semanas[semanas.length - 1] ? Object.entries(semanas[semanas.length - 1]).filter(([k]) => k !== 'ini').reduce((t, [, v]) => t + v, 0) * valor : 0),
      valorReal: P && P.contratados && C && C.contratado ? Math.round(C.contratado / P.contratados) : null, regaladoMes: Math.round(regaladoMes * valor), cobrado: C ? C.cobrado : 0, contratado: C ? C.contratado : 0, totales: P ? P.totales : null, conPuntos: !!P },
    alcance: { contratados: P ? P.contratados : 0, fuera, modulos: Object.entries(modulos).sort((a, b) => b[1] - a[1]).slice(0, 6),
      ideasEntraron: ideas.filter(x => en(x.fecha, desde, hoyD)).length, ideasProcesadas: ideas.filter(x => x.estado !== 'sin' && en(x.fecha, desde, hoyD)).length },
    pronostico: R ? { abiertas: R.abiertas, porSemana: R.porSemana, termina: R.termina, finPlan, etapa: p.etapa || '' } : null,
    horas: { dias: horas, total: Math.round(horas.reduce((t, x) => t + x.h, 0) * 10) / 10, arranques: horas.reduce((t, x) => t + x.n, 0), larga: Math.round(larg / 6e4), desde: arr.length ? dia(arr[0].desde) : '' },
    historialDesde: hist.length ? dia(hist[0].f) : '',
    costo: (() => {
      const CB = cobroBase(), hP = horasEntre(p, desde, hoyD); let hT = 0; for (const q of PROYECTOS) { try { hT += horasEntre(q, desde, hoyD); } catch { } }
      const nDias = diasEntre(desde, hoyD) + 1, ia = CB.iaMensual * nDias / 30 * (hT ? hP / hT : 0), horas = hP * CB.costoHora, total = horas + ia;
      return { configurado: !!(CB.costoHora || CB.iaMensual), costoHora: CB.costoHora, iaMensual: CB.iaMensual, horasPeriodo: Math.round(hP * 10) / 10, costoHoras: Math.round(horas), ia: Math.round(ia), total: Math.round(total), ganancia: Math.round(ahora.valor - total), porPunto: ahora.pts ? Math.round(total / ahora.pts) : null };
    })(),
  };
}

// Buscar (⌘K): proyectos, piezas e ideas de todos los proyectos.
const sinAcentos = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function buscar(qs) {
  const q = sinAcentos(qs).trim(); if (!q) return [];
  const palabras = q.split(/\s+/), ok = t => { const s = sinAcentos(t); return palabras.every(w => s.includes(w)); };
  const out = [];
  for (const p of PROYECTOS) {
    if (ok(p.nombre + ' ' + p.codigo + ' ' + p.cliente + ' ' + p.marca)) out.push({ tipo: 'proyecto', pid: p.id, codigo: p.codigo, titulo: p.nombre, detalle: p.cliente || '' });
    const cl = parseChangelog(p);
    if (cl.file) {
      const iE = colIndex(cl.headers, 'estado', 5), iD = (i => i >= 0 ? i : 4)(idxCol(cl.headers, /descrip|solicitud/i));
      const iHi = idxCol(cl.headers, /^hilos?$/i);
      for (const r of cl.rows) if (/^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '') && ok(r.cells[0] + ' ' + (r.cells[iD] || '') + ' ' + (iHi >= 0 ? r.cells[iHi] || '' : '')))
        out.push({ tipo: 'pieza', pid: p.id, codigo: p.codigo, id: r.cells[0], titulo: (r.cells[iD] || '').replace(/\*\*/g, '').slice(0, 120), detalle: p.nombre, estado: r.cells[iE] || '' });
    }
    try { for (const h of carrilesProyecto(p).hilos) if (ok(h.hilo + ' ' + h.piezas.map(x => x.id).join(' '))) out.push({ tipo: 'hilo', pid: p.id, codigo: p.codigo, id: h.hilo, titulo: h.piezas.map(x => x.id + ' ' + x.titulo).join(' · ').slice(0, 120) || 'Sin piezas', detalle: p.nombre + (h.carril ? ' · carril ' + h.carril : '') + ' · ' + (h.ocupado ? 'en el taller' : h.estado), enlace: h.enlace || '' }); } catch { }
    try { for (const x of parseIdeas(p).ideas) if (x.estado !== 'descartada' && ok(x.titulo + ' ' + x.texto)) out.push({ tipo: 'idea', pid: p.id, codigo: p.codigo, n: x.n, titulo: x.titulo, detalle: p.nombre + (x.estado === 'sin' ? ' · sin procesar' : '') }); } catch { }
    if (out.length > 200) break;
  }
  const rango = x => x.tipo === 'proyecto' ? 0 : x.tipo === 'hilo' ? (sinAcentos(x.id) === q ? -2 : 1.5) : x.tipo === 'pieza' ? (sinAcentos(x.id) === q ? -1 : 1) : 2;
  return out.sort((a, b) => rango(a) - rango(b)).slice(0, 40);
}

// Adoptar un proyecto empezado (TMN-040, método 08): diagnóstico, kit sin pisar nada y correcciones como piezas Interno.
const EXT_CODIGO = /\.(js|mjs|cjs|ts|tsx|jsx|vue|svelte|py|rb|go|rs|swift|kt|java|php|css|scss|html)$/i;
function diagnosticoAdopcion(ruta) {
  const d = abs(ruta);
  if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) throw new Error('Esa carpeta no existe');
  const ls = x => { try { return fs.readdirSync(x, { withFileTypes: true }); } catch { return []; } };
  const raiz = ls(d), nombres = raiz.map(e => e.name);
  const esTimon = nombres.some(x => /^CHANGELOG-.+\.md$/i.test(x) && !/\[CODIGO\]/.test(x)) || nombres.includes('00-MARCO.md') || nombres.some(x => x.endsWith('.tmn'));
  const grandes = []; let archivos = 0;
  const recorrer = (dir, prof) => {
    if (prof > 6 || archivos > 6000) return;
    for (const e of ls(dir)) {
      if (e.name.startsWith('.') || IGNORAR.has(e.name)) continue;
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { recorrer(f, prof + 1); continue; }
      archivos++;
      if (!EXT_CODIGO.test(e.name)) continue;
      let n = 0; try { const st = fs.statSync(f); if (st.size > 4e6) continue; n = (fs.readFileSync(f, 'utf8').match(/\n/g) || []).length + 1; } catch { continue; }
      if (n >= 800) grandes.push({ rel: path.relative(d, f), lineas: n });
    }
  };
  recorrer(d, 0);
  grandes.sort((a, b) => b.lineas - a.lineas);
  const sueltos = raiz.filter(e => e.isFile() && !e.name.startsWith('.') && !/^(readme|license|package(-lock)?\.json|claude\.md|tsconfig|next\.config|vite\.config|\.env)/i.test(e.name)).map(e => e.name);
  let pkg = null; try { pkg = JSON.parse(leer(path.join(d, 'package.json')) || 'null'); } catch { }
  const deps = pkg ? Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }) : [];
  const stack = ['next', 'react', 'vite', 'vue', 'svelte', '@supabase/supabase-js', 'prisma', 'tailwindcss', 'express'].filter(x => deps.includes(x)).map(x => x.replace('@supabase/supabase-js', 'supabase'));
  const tmp = { ruta: d, cfg: cargarConfig(d), codigo: '', nombre: path.basename(d) };
  const sug = sugerirTmn(tmp);
  const claude = leer(path.join(d, 'CLAUDE.md'));
  const problemas = [];
  if (!fs.existsSync(path.join(d, '.git'))) problemas.push({ clave: 'git', titulo: 'Sin Git', detalle: 'No hay historial de cambios: si algo se rompe no hay a dónde regresar.', pieza: 'Iniciar Git en el proyecto y hacer el primer commit con el estado actual' });
  if (grandes.length) problemas.push({ clave: 'grandes', titulo: grandes.length + (grandes.length === 1 ? ' archivo gigante' : ' archivos gigantes'), detalle: grandes.slice(0, 4).map(g => g.rel + ' (' + g.lineas.toLocaleString('es-MX') + ' líneas)').join(' · '), pieza: 'Partir los archivos gigantes en módulos: ' + grandes.slice(0, 3).map(g => g.rel).join(', ') });
  if (sueltos.length > 15) problemas.push({ clave: 'raiz', titulo: sueltos.length + ' archivos sueltos en la raíz', detalle: sueltos.slice(0, 6).join(', ') + (sueltos.length > 6 ? '…' : ''), pieza: 'Ordenar la raíz del proyecto en carpetas (docs, sql, checklists, código)' });
  const sqlSueltos = sueltos.filter(x => /\.sql$/i.test(x));
  if (sqlSueltos.length) problemas.push({ clave: 'sql', titulo: sqlSueltos.length + (sqlSueltos.length === 1 ? ' SQL suelto' : ' SQL sueltos'), detalle: sqlSueltos.slice(0, 4).join(', '), pieza: 'Mover los SQL sueltos a la carpeta de migraciones y marcar cuáles ya están en producción' });
  if (!sug.lanzadores.length) problemas.push({ clave: 'lanzador', titulo: 'Sin lanzador detectado', detalle: 'No encontré cómo arrancarlo (npm run dev, .command o index.html).', pieza: 'Definir cómo se arranca el proyecto (lanzador en la ficha)' });
  problemas.push({ clave: 'captura', titulo: 'Captura retroactiva', detalle: 'Marco y Arquitectura "como está construido" (método 08). Lo hace la IA leyendo el código.', pieza: 'Captura retroactiva: Marco, Arquitectura as-built y mapa del proyecto (método 08)', siempre: true });
  return {
    ruta: d, nombre: path.basename(d), esTimon, archivos, grandes: grandes.slice(0, 10), sueltos: sueltos.length, stack, lanzadores: sug.lanzadores,
    claude: claude ? (/Tim[oó]n/.test(claude) ? 'timon' : 'propio') : null, cliente: sug.cliente,
    codigo: path.basename(d).normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(), problemas,
  };
}
function adoptarProyecto(b) {
  const dg = diagnosticoAdopcion(b.ruta);
  if (dg.esTimon) { agregarProyecto(dg.ruta); const pr = PROYECTOS.find(x => x.ruta === dg.ruta); return { id: pr ? pr.id : null, ruta: dg.ruta, yaEra: true }; }
  const plantilla = plantillaDir();
  if (!plantilla) throw new Error('No sé dónde está Timón: configúralo en Ajustes');
  const cod = String(b.codigo || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cod) throw new Error('Falta el código del proyecto (2 a 6 letras)');
  const d = dg.ruta;
  // un CLAUDE.md propio no se pierde: se respalda y su contenido pasa a la Parte 2 del de Timón
  const claudeViejo = dg.claude === 'propio' ? leer(path.join(d, 'CLAUDE.md')) : null;
  if (claudeViejo) {
    const resp = path.join(d, '.timon', 'respaldos'); fs.mkdirSync(resp, { recursive: true });
    fs.writeFileSync(path.join(resp, 'CLAUDE.antes-de-timon.md'), claudeViejo);
    fs.renameSync(path.join(d, 'CLAUDE.md'), path.join(resp, 'CLAUDE.md.tmp'));
  }
  const copiados = [];
  const copiar = (origen, destino) => {
    for (const e of fs.readdirSync(origen, { withFileTypes: true })) {
      if (e.name === 'panel' || e.name === '.DS_Store') continue;
      const o = path.join(origen, e.name), dst = path.join(destino, e.name.replace(/\[CODIGO\]/g, cod));
      if (e.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); copiar(o, dst); continue; }
      if (fs.existsSync(dst)) continue;
      let c = leer(o); if (c !== null && /\.(md|json)$/i.test(dst)) c = c.replace(/\[CODIGO\]/g, cod);
      fs.writeFileSync(dst, c ?? fs.readFileSync(o)); copiados.push(path.relative(d, dst));
    }
  };
  copiar(plantilla, d);
  if (claudeViejo) {
    fs.rmSync(path.join(d, '.timon', 'respaldos', 'CLAUDE.md.tmp'), { force: true });
    const f = path.join(d, 'CLAUDE.md');
    fs.writeFileSync(f, (leer(f) || '').replace(/\n*$/, '\n\n### Lo que decía el CLAUDE.md anterior (pendiente de acomodar en la captura retroactiva)\n\n' + claudeViejo.trim() + '\n'));
  }
  const nombre = String(b.nombre || dg.nombre).trim();
  const tmp = { ruta: d, cfg: cargarConfig(d), codigo: cod, nombre };
  const tmn = { ...sugerirTmn(tmp), nombre, codigo: cod, cliente: String(b.cliente || dg.cliente || '').trim(), marca: String(b.marca || '').trim(), etapa: ETAPAS.includes(b.etapa) ? b.etapa : 'construccion', timonVersion: VERSION_TIMON() };
  fs.writeFileSync(path.join(d, 'proyecto.tmn'), JSON.stringify(tmn, null, 2) + '\n');
  agregarProyecto(d);
  const pr = PROYECTOS.find(x => x.ruta === d);
  if (!pr) return { id: null, ruta: d, codigo: cod, archivos: copiados.length };
  // COD-000: la captura de arranque (método 08, paso 6) y cada corrección elegida como pieza Interno
  const cl = parseChangelog(pr);
  if (cl.file && !cl.rows.some(r => /-000$/.test(r.cells[0] || ''))) {
    asegurarColumnas(pr);
    const c2 = parseChangelog(pr), H = c2.headers;
    const val = [[/^id$/i, cod + '-000'], [/^fecha/i, HOY_ISO()], [/m[oó]dulo|[aá]rea/i, 'Sistema'], [/qui[eé]n/i, 'Yanga'], [/descrip|solicitud/i, 'Proyecto incorporado a Timón ya empezado. El estado de hoy se captura en 00-MARCO y 01-ARQUITECTURA (método 08).'], [/^estado/i, '✔️ Verificado'], [/herramienta/i, 'Timón'], [/verificaci/i, 'Arranque: ya funcionaba antes de Timón.'], [/^tipo$/i, 'Interno'], [/^d[oó]nde$/i, '']];
    const fila = '| ' + H.map(h => { const v = val.find(([re]) => re.test(String(h).trim())); return v ? v[1] : ''; }).join(' | ') + ' |';
    let after = -1; c2.lines.forEach((l, i) => { if (l.trim().startsWith('|')) after = i; });
    if (after >= 0) { c2.lines.splice(after + 1, 0, fila); fs.writeFileSync(c2.file, c2.lines.join('\n')); }
  }
  const elegidas = new Set(b.correcciones || []), ids = [];
  for (const x of dg.problemas) if (x.siempre || elegidas.has(x.clave)) ids.push(agregarFila(pr, { descripcion: x.pieza, tipo: 'Interno', quien: 'Timón', modulo: 'Estructura' }));
  capturarInbox(pr, 'Proyecto adoptado desde Timón el ' + HOY_ISO() + '. Pídele a la IA: "incorpora este proyecto con el método 08" para escribir el Marco y la Arquitectura como está construido hoy.' + (claudeViejo ? ' Tu CLAUDE.md anterior quedó al final de la Parte 2 y respaldado en .timon/respaldos/.' : ''));
  descubrir();
  { const pr2 = PROYECTOS.find(x => x.ruta === d); if (pr2) try { planAutomatico(pr2); descubrir(); } catch { } }
  return { id: pr.id, ruta: d, codigo: cod, archivos: copiados.length, piezas: ids };
}


// Cerrar specs en bloque (desde Ajustes): para cuando todo ya está en producción. Se reabre editando "## Estado".
function specsAbiertos() {
  const out = [];
  for (const p of PROYECTOS) for (const s of listaSpecs(p)) if (!/cerrad|descartad/i.test(s.estado)) out.push({ pid: p.id, codigo: p.codigo, proyecto: p.nombre, file: s.file, nombre: s.nombre, estado: s.estado });
  return out;
}
function cerrarSpecsEnBloque(lista) {
  let n = 0;
  for (const { pid, file } of lista || []) {
    const p = PROYECTOS.find(x => x.id === pid); if (!p) continue;
    const full = dentro(p.ruta, file); if (!full || !fs.existsSync(full)) continue;
    let s = leer(full) || '';
    const linea = `Cerrado el ${HOY_ISO()} en bloque: ya está en producción. Si algo falla, se reabre.`;
    if (/##\s*Estado\s*\r?\n/i.test(s)) s = s.replace(/(##\s*Estado\s*\r?\n+)[^\n]*/i, `$1${linea}`);
    else s = s.replace(/\s*$/, '') + `\n\n## Estado\n${linea}\n`;
    fs.writeFileSync(full, s); n++;
  }
  return n;
}
// ---------- Fase 6: Taller (TMN-030 Archivos, TMN-025 Corregir textos, TMN-026 Abrir en el editor) ----------
// Cada edición hecha desde Timón deja respaldo en .timon/respaldos/ y una línea en .timon/ediciones.md.
function respaldarArchivo(p, full) {
  if (!fs.existsSync(full)) return null;
  const d = new Date(), ts = ID_HOY() + '-' + [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join('');
  const rel = path.relative(p.ruta, full).replace(/[\\/]/g, '__');
  const dir = path.join(p.ruta, '.timon', 'respaldos'); fs.mkdirSync(dir, { recursive: true });
  const dst = path.join(dir, ts + '__' + rel); fs.copyFileSync(full, dst);
  return path.relative(p.ruta, dst);
}
function anotarEdicion(p, linea) {
  const f = path.join(p.ruta, '.timon', 'ediciones.md'); fs.mkdirSync(path.dirname(f), { recursive: true });
  if (!fs.existsSync(f)) fs.writeFileSync(f, '# Ediciones hechas desde Timón\n\nCada cambio a mano (sin IA) con su respaldo en `.timon/respaldos/`.\n\n');
  fs.appendFileSync(f, '- ' + HOY_ISO() + ' ' + new Date().toTimeString().slice(0, 5) + ' · ' + linea + '\n');
}
// archivos de texto del proyecto, sin carpetas de dependencias ni compilados
function* archivosTexto(p) {
  const pila = [p.ruta]; let n = 0;
  while (pila.length && n < 8000) {
    const dir = pila.pop(); let es = [];
    try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of es) {
      if (e.name === '.DS_Store' || IGNORAR.has(e.name) || (e.name.startsWith('.') && e.name !== '.env.example')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { pila.push(full); continue; }
      if (!/\.(md|markdown|txt|json|tmn|js|mjs|cjs|ts|tsx|jsx|css|scss|html|htm|py|sql|yml|yaml|toml|csv|svg|xml|vue|svelte|rb|php|swift|kt|java|liquid|astro)$/i.test(e.name)) continue;
      if (/(package-lock|pnpm-lock|yarn\.lock)/i.test(e.name)) continue;
      let st; try { st = fs.statSync(full); } catch { continue; }
      if (st.size > 1.5 * 1024 * 1024) continue;
      n++; yield full;
    }
  }
}

function reTexto(q, { mayus, palabra } = {}) {
  const t = escRe(q);
  return new RegExp(palabra ? '(?<![\\p{L}\\p{N}_])' + t + '(?![\\p{L}\\p{N}_])' : t, 'g' + (mayus ? '' : 'i') + 'u');
}
function buscarTexto(p, q, opts = {}) {
  q = String(q || ''); if (q.trim().length < 2) throw new Error('Escribe al menos 2 letras');
  const re = reTexto(q, opts), out = []; let archivos = 0, total = 0;
  for (const full of archivosTexto(p)) {
    const txt = leer(full); if (txt === null || !re.test(txt)) continue;
    re.lastIndex = 0; archivos++;
    const rel = path.relative(p.ruta, full);
    txt.split('\n').forEach((l, i) => {
      re.lastIndex = 0; let m;
      while ((m = re.exec(l))) { total++; if (out.length < 600) out.push({ rel, linea: i + 1, col: m.index, largo: m[0].length, texto: l.length > 260 ? l.slice(Math.max(0, m.index - 100), m.index + 160) : l, corte: l.length > 260 ? Math.max(0, m.index - 100) : 0 }); if (!m[0].length) re.lastIndex++; }
    });
  }
  return { q, archivos, total, items: out, recortado: total > out.length };
}
function reemplazarTexto(p, { q, nuevo, items, mayus, palabra }) {
  q = String(q || ''); nuevo = String(nuevo ?? '');
  if (q.trim().length < 2) throw new Error('Falta el texto a buscar');
  if (!Array.isArray(items) || !items.length) throw new Error('No marcaste ninguna coincidencia');
  const re = reTexto(q, { mayus, palabra });
  const porArchivo = {}; for (const it of items) (porArchivo[it.rel] = porArchivo[it.rel] || []).push(it);
  let cambios = 0; const archivos = [];
  for (const [rel, its] of Object.entries(porArchivo)) {
    const full = dentro(p.ruta, rel); if (!full || !fs.existsSync(full)) continue;
    const lineas = (leer(full) || '').split('\n'); let n = 0;
    // de derecha a izquierda para que las columnas sigan valiendo
    its.sort((a, b) => b.linea - a.linea || b.col - a.col);
    for (const it of its) {
      const l = lineas[it.linea - 1]; if (l === undefined) continue;
      re.lastIndex = it.col; const m = re.exec(l);
      if (!m || m.index !== it.col) continue;          // el archivo cambió desde la búsqueda: se salta
      lineas[it.linea - 1] = l.slice(0, it.col) + nuevo + l.slice(it.col + m[0].length); n++;
    }
    if (!n) continue;
    const resp = respaldarArchivo(p, full);
    fs.writeFileSync(full, lineas.join('\n'));
    anotarEdicion(p, '«' + sinBarras(q) + '» → «' + sinBarras(nuevo) + '» · ' + n + ' en `' + rel + '` · respaldo `' + resp + '`');
    cambios += n; archivos.push(rel);
  }
  return { cambios, archivos };
}
const EDITORES = { code: { nombre: 'VS Code', url: 'vscode://file' }, cursor: { nombre: 'Cursor', url: 'cursor://file' } };
function abrirEnEditor(p, rel, linea) {
  const full = dentro(p.ruta, rel || '.');
  if (!full || !fs.existsSync(full)) throw new Error('No existe ese archivo');
  const ed = EDITORES[CONFIG_BASE.editor] || EDITORES.code;
  const u = ed.url + encodeURI(full).replace(/#/g, '%23') + (linea ? ':' + (+linea || 1) + ':1' : '');
  const bin = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(bin, [u], { stdio: 'ignore', detached: true }).unref();
  return ed.nombre;
}

// Buscar archivos por nombre y formato en todo el proyecto (Taller › Archivos)
const FORMATOS = { md: /\.(md|markdown|txt)$/i, img: /\.(png|jpe?g|gif|webp|svg|ico|heic)$/i, pdf: /\.pdf$/i, codigo: /\.(m?js|cjs|ts|tsx|jsx|vue|svelte|py|rb|php|swift|kt|java|css|scss|html?|json|tmn|sh|command)$/i, sql: /\.sql$/i, video: /\.(mp4|mov|webm|m4v)$/i, hoja: /\.(xlsx?|csv|numbers)$/i };
function buscarArchivos(p, q, formato, ocultos) {
  const palabras = [], exts = [];
  for (const w of sinAcentos(q).split(/\s+/).filter(Boolean)) { const m = w.match(/^(?:\*?\.|ext:)([a-z0-9]+)$/); if (m) exts.push(m[1]); else palabras.push(w); }
  const reF = FORMATOS[formato] || null, out = []; let n = 0;
  const pila = [p.ruta];
  while (pila.length && n < 20000 && out.length < 400) {
    const dir = pila.pop(); let es = [];
    try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of es) {
      if (e.name === '.DS_Store' || e.name === '.git' || e.name === 'node_modules') continue;
      const oculto = e.name.startsWith('.') || IGNORAR.has(e.name);
      if (oculto && !ocultos) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { pila.push(full); continue; }
      n++;
      const nom = sinAcentos(e.name), ext = (path.extname(e.name).slice(1) || '').toLowerCase();
      if (reF && !reF.test(e.name)) continue;
      if (exts.length && !exts.includes(ext)) continue;
      if (palabras.length && !palabras.every(w => nom.includes(w) || sinAcentos(path.relative(p.ruta, dir)).includes(w))) continue;
      let size = 0, mtime = 0; try { const st = fs.statSync(full); size = st.size; mtime = st.mtimeMs; } catch { }
      out.push({ nombre: e.name, rel: path.relative(p.ruta, full), carpeta: path.relative(p.ruta, dir) || '.', size, mtime, oculto });
    }
  }
  out.sort((a, b) => a.carpeta.localeCompare(b.carpeta, 'es') || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  return { items: out, recortado: out.length >= 400 };
}
// ---------- Fase 7: Tiempo (TMN-037). Gantt de tres vistas: Calendario, Etapas y Piezas ----------
// Lo real sale del historial (.timon/historial.json); lo anterior al historial se aproxima con las fechas del changelog.
// fecha local (el historial guarda la hora en UTC: de noche ya sería mañana)
const dia = f => { const t = String(f || ''); if (!/T\d/.test(t)) return t.slice(0, 10); const d = new Date(t); return isNaN(d) ? t.slice(0, 10) : new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const esDia = f => /^\d{4}-\d{2}-\d{2}$/.test(dia(f));
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const masDias = (f, n) => new Date(Date.parse(f) + n * 864e5).toISOString().slice(0, 10);
function inicioProyecto(p) {
  const cl = parseChangelog(p); if (!cl.file) return null;
  const iF = colIndex(cl.headers, 'fecha', 1);
  const f = cl.rows.map(r => dia(r.cells[iF])).filter(esDia).sort();
  return f[0] || null;
}
function etapasReales(p) {
  const h = leerJson(histDe(p), []).filter(e => e.tipo === 'etapa' && e.a && esDia(e.f));
  const hoy = HOY_ISO(), ini = inicioProyecto(p), out = [];
  h.forEach((e, i) => {
    let desde = dia(e.f);
    // la primera foto del historial no sabe cuándo empezó la etapa: se toma el inicio del proyecto
    if (i === 0 && e.aprox && ini && ini < desde) desde = ini;
    out.push({ etapa: e.a, desde, hasta: null, aprox: !!(i === 0 && e.aprox) });
    if (out.length > 1) out[out.length - 2].hasta = desde;
  });
  if (!out.length && p.etapa && ini) out.push({ etapa: p.etapa, desde: ini, hasta: null, aprox: true });
  out.forEach(x => { x.abierta = !x.hasta; x.hasta = x.hasta || hoy; });
  return out.filter(x => x.hasta >= x.desde);
}
function pagosDe(p) {
  const C = parseCobros(p); if (!C) return [];
  const hoy = HOY_ISO();
  return C.filas.filter(f => esDia(f.fecha)).map(f => ({ fecha: dia(f.fecha), concepto: f.concepto, monto: f.monto, estado: f.pagado ? 'pagado' : f.fecha < hoy ? 'vencido' : 'pendiente' }));
}
// ritmo: piezas verificadas por semana en las últimas 6 semanas → cuándo se acaban las abiertas
function ritmo(p) {
  const cl = parseChangelog(p); if (!cl.file) return null;
  const iE = colIndex(cl.headers, 'estado', 5);
  const abiertas = cl.rows.filter(r => /^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '') && /🔲|🔄|✅/.test(r.cells[iE] || '')).length;
  const hoy = HOY_ISO(), desde = masDias(hoy, -42);
  const hechas = new Set(leerJson(histDe(p), []).filter(e => e.tipo === 'pieza' && !e.aprox && /✔️/.test(e.a || '') && dia(e.f) >= desde).map(e => e.id)).size;
  const porSemana = hechas / 6;
  return { abiertas, verificadas6s: hechas, porSemana: Math.round(porSemana * 10) / 10, termina: porSemana > 0 && abiertas ? masDias(hoy, Math.ceil(abiertas / porSemana * 7)) : null };
}
// Hitos: fechas sueltas que importan (entrega al cliente, junta, lanzamiento). Viven en proyecto.tmn.
const hitosDe = p => ((p.tmn && Array.isArray(p.tmn.hitos)) ? p.tmn.hitos : []).filter(h => h && esDia(h.fecha)).sort((a, b) => a.fecha.localeCompare(b.fecha));
function guardarHitos(p, lista) {
  const limpio = (Array.isArray(lista) ? lista : []).filter(h => h && String(h.nombre || '').trim() && esDia(h.fecha))
    .map((h, i) => ({ id: String(h.id || ('h' + Date.now().toString(36) + i)), nombre: sinBarras(h.nombre).slice(0, 80), fecha: dia(h.fecha), hecho: !!h.hecho }));
  escribirTmnCrudo(p, { hitos: limpio });
}
function tiempoGeneral() {
  const proyectos = PROYECTOS.map(p => ({
    id: p.id, nombre: p.nombre, codigo: p.codigo, cliente: p.cliente, color: p.color, estado: p.estado, etapa: p.etapa,
    plan: (p.tmn && p.tmn.etapasPlan) || {}, real: etapasReales(p), pagos: pagosDe(p), hitos: hitosDe(p),
  })).filter(x => x.real.length || Object.keys(x.plan).length || x.pagos.length);
  // carga: cuántos proyectos estuvieron en construcción cada mes
  const carga = {};
  for (const x of proyectos) for (const r of x.real) if (r.etapa === 'construccion') {
    let m = r.desde.slice(0, 7); const fin = r.hasta.slice(0, 7);
    while (m <= fin) { (carga[m] = carga[m] || new Set()).add(x.id); const [a, mm] = m.split('-').map(Number); m = mm === 12 ? (a + 1) + '-01' : a + '-' + String(mm + 1).padStart(2, '0'); }
  }
  return { hoy: HOY_ISO(), proyectos, carga: Object.fromEntries(Object.entries(carga).map(([m, s]) => [m, s.size])) };
}
function tiempoProyecto(p) {
  const cl = parseChangelog(p), hoy = HOY_ISO();
  const iE = colIndex(cl.headers, 'estado', 5), iF = colIndex(cl.headers, 'fecha', 1), iD = (i => i >= 0 ? i : 4)(idxCol(cl.headers, /descrip|solicitud/i)), iDo = idxCol(cl.headers, /^d[oó]nde$/i), iT = idxCol(cl.headers, /^tipo$/i);
  const h = leerJson(histDe(p), []).filter(e => e.tipo === 'pieza' && esDia(e.f));
  const piezas = (cl.file ? cl.rows : []).filter(r => /^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '')).map(r => {
    const id = r.cells[0], raro = r.cells.length > cl.headers.length, alta = esDia(r.cells[iF]) ? dia(r.cells[iF]) : null;
    // tramos por estado: desde el registro, cada cambio del historial abre un tramo nuevo
    const ev = h.filter(e => e.id === id).sort((a, b) => String(a.f).localeCompare(String(b.f)));
    // el primer estado: el "de" del primer cambio real; si no hay cambios, la foto aproximada del primer día del historial
    const reales = ev.filter(e => !e.aprox), foto = ev.find(e => e.aprox);
    const tramos = []; let actual = { estado: reales.length ? (reales[0].de || '🔲 Pendiente') : (foto ? foto.a : '🔲 Pendiente'), desde: alta || (ev[0] ? dia(ev[0].f) : hoy), aprox: !reales.length && !!foto };
    for (const e of reales) {
      const f = dia(e.f); actual.hasta = f < actual.desde ? actual.desde : f; tramos.push(actual); actual = { estado: e.a, desde: actual.hasta };
    }
    actual.hasta = /✔️|🚫/.test(actual.estado) ? actual.desde : hoy; actual.abierto = !/✔️|🚫/.test(actual.estado); tramos.push(actual);
    return { id, alta, estado: r.cells[iE] || '', desc: (r.cells[iD] || '').slice(0, 160), donde: !raro && iDo >= 0 ? r.cells[iDo] || '' : '', tipo: !raro && iT >= 0 ? r.cells[iT] || '' : '', tramos: tramos.filter(t => esDia(t.desde)) };
  });
  return { hoy, plan: (p.tmn && p.tmn.etapasPlan) || {}, planAuto: !!(p.tmn && p.tmn.etapasPlanAuto), tamano: (p.tmn && p.tmn.tamano) || '', hitos: hitosDe(p), real: etapasReales(p), pagos: pagosDe(p), ritmo: ritmo(p), etapa: p.etapa, piezas };
}

// Fechas planeadas automáticas (TMN-049): de tu historial, de los puntos cotizados o de la plantilla por tamaño.
// El plan es la línea base: solo se reescribe solo si lo puso Timón y tú no lo has tocado (etapasPlanAuto).
const TAMANOS = ['chico', 'mediano', 'grande'];
const PLAN_BASE_DEF = {
  chico: { brief: 3, descubrimiento: 7, cotizacion: 3, aceptado: 3, construccion: 21, entregado: 7 },
  mediano: { brief: 7, descubrimiento: 14, cotizacion: 7, aceptado: 7, construccion: 42, entregado: 14 },
  grande: { brief: 7, descubrimiento: 21, cotizacion: 7, aceptado: 7, construccion: 84, entregado: 21 },
};
const ETAPAS_PLAN = ['brief', 'descubrimiento', 'cotizacion', 'aceptado', 'construccion', 'entregado'];
const planBase = () => { const c = (CONFIG_BASE || {}).planBase || {}; return Object.fromEntries(TAMANOS.map(t => [t, { ...PLAN_BASE_DEF[t], ...(c[t] || {}) }])); };
// cuánto te tarda cada etapa, en días, con lo cerrado de todos tus proyectos (desde 3 casos)
function duracionesHistoricas() {
  const acc = {};
  for (const p of PROYECTOS) for (const r of etapasReales(p)) if (!r.abierta && !r.aprox) { const d = diasEntre(r.desde, r.hasta); if (d > 0) (acc[r.etapa] = acc[r.etapa] || []).push(d); }
  return Object.fromEntries(Object.entries(acc).filter(([, v]) => v.length >= 3).map(([k, v]) => [k, { dias: Math.round(v.reduce((a, b) => a + b, 0) / v.length), casos: v.length }]));
}
// puntos que verificas por semana, en todos los proyectos, en las últimas 12 semanas
function puntosPorSemana() {
  const desde = masDias(HOY_ISO(), -84); let pts = 0;
  for (const p of PROYECTOS) {
    const P = resumenPuntos(p); if (!P) continue;
    const ver = new Set(leerJson(histDe(p), []).filter(e => e.tipo === 'pieza' && !e.aprox && /✔️/.test(e.a || '') && dia(e.f) >= desde).map(e => e.id));
    pts += P.filas.filter(f => ver.has(f.id)).reduce((a, f) => a + f.puntos, 0);
  }
  return pts > 0 ? Math.round(pts / 12 * 10) / 10 : null;
}
function puntosDelProyecto(p) {
  const P = resumenPuntos(p); if (P && P.contratados) return { pts: P.contratados, de: 'contratados' };
  try { const c = cotizacionEnCurso(p); if (c && c.total) return { pts: c.total, de: 'cotización en curso' }; } catch { }
  return null;
}
function sugerirPlan(p) {
  const tam = TAMANOS.includes(p.tmn && p.tmn.tamano) ? p.tmn.tamano : 'mediano';
  const base = planBase()[tam], hist = duracionesHistoricas(), ritmo = puntosPorSemana(), pp = puntosDelProyecto(p);
  const real = etapasReales(p), hoy = HOY_ISO(), plan = {}, fuentes = {};
  const iAct = ETAPAS_PLAN.indexOf(p.etapa || 'brief');
  let cursor = null;
  ETAPAS_PLAN.forEach((e, i) => {
    const r = real.find(x => x.etapa === e);
    // lo que ya pasó se queda como pasó
    if (i < iAct && r) { plan[e] = { inicio: r.desde, fin: r.hasta }; fuentes[e] = 'real'; cursor = r.hasta; return; }
    let dias = base[e], fuente = 'plantilla ' + tam;
    if (hist[e]) { dias = hist[e].dias; fuente = 'tu promedio (' + hist[e].casos + ' proyectos)'; }
    if (e === 'construccion' && pp && ritmo) { dias = Math.ceil(pp.pts / ritmo) * 7 + 7; fuente = fmtPts(pp.pts) + ' pts ' + pp.de + ' a ' + ritmo + ' por semana, más una de margen'; }
    const inicio = i === iAct && r ? r.desde : cursor || (r ? r.desde : hoy);
    let fin = masDias(inicio, Math.max(1, dias));
    // la etapa en curso no puede terminar en el pasado: se le da al menos una semana desde hoy
    if (i === iAct && fin < masDias(hoy, 7)) { fin = masDias(hoy, 7); fuente += '; ya iba atrasada: se da una semana desde hoy'; }
    plan[e] = { inicio, fin }; fuentes[e] = fuente; cursor = plan[e].fin;
  });
  return { tamano: tam, plan, fuentes, ritmo, puntos: pp };
}
const fmtPts = n => Math.round(n).toLocaleString('es-MX');
// se llena solo si está vacío, o si lo puso Timón y nadie lo ha tocado
function planAutomatico(p, { forzar } = {}) {
  const t = p.tmn || {}, tiene = t.etapasPlan && Object.keys(t.etapasPlan).length;
  if (tiene && !t.etapasPlanAuto && !forzar) return false;
  escribirTmnCrudo(p, { etapasPlan: sugerirPlan(p).plan, etapasPlanAuto: true });
  return true;
}


// Cerrar piezas en bloque (Ajustes): todo lo abierto pasa a Verificado cuando ya está en producción.
const ESTADO_STD = /^(🔲 Pendiente|🔄 En construcción|✅ Construido|✔️ Verificado|🚫 Descartado)$/;
function estadoGrupo(e) { e = String(e || ''); return /✔️|verificad/i.test(e) ? 'verificada' : /🚫|descartad/i.test(e) ? 'descartada' : /✅|construid/i.test(e) ? 'probar' : /🔄|🔨|construcci|taller/i.test(e) ? 'taller' : 'pendiente'; }
function piezasAbiertas() {
  const out = [];
  for (const p of PROYECTOS) {
    const cl = parseChangelog(p); if (!cl.file) continue;
    const iE = colIndex(cl.headers, 'estado', 5), iD = (i => i >= 0 ? i : 4)(idxCol(cl.headers, /descrip|solicitud/i));
    for (const r of cl.rows) {
      if (!/^[A-Za-z0-9_]+-\d+/.test(r.cells[0] || '')) continue;
      const g = estadoGrupo(r.cells[iE]); if (g === 'verificada' || g === 'descartada') continue;
      out.push({ pid: p.id, codigo: p.codigo, proyecto: p.nombre, id: r.cells[0], desc: String(r.cells[iD] || '').replace(/\*\*/g, '').slice(0, 140), estado: r.cells[iE] || '', grupo: g });
    }
  }
  return out;
}
function cerrarPiezasEnBloque(lista) {
  let n = 0; const nota = `Verificado en lote el ${HOY_ISO()}: ya está en producción. Si algo falla, se reabre.`;
  for (const { pid, id } of lista || []) {
    const p = PROYECTOS.find(x => x.id === pid); if (!p) continue;
    const cl = parseChangelog(p), row = cl.rows.find(r => r.cells[0] === id); if (!row) continue;
    const antes = String(row.cells[colIndex(cl.headers, 'estado', 5)] || '').trim();
    // si el Estado traía una nota larga, no se pierde: pasa a la Verificación
    try { actualizarEstado(p, id, '✔️ Verificado', ESTADO_STD.test(antes) || !antes ? nota : nota + ' Estado anterior: ' + sinBarras(antes), true); n++; } catch { }
  }
  return n;
}

// Integridad de los números: huecos, repetidos y archivos con ID que no tienen fila (TMN-054).
// Sirve para ver de inmediato si una sesión de IA borró filas al guardar el changelog con una copia vieja.
function integridadIds(p) {
  const cl = parseChangelog(p); if (!cl.file) return { saltados: [], repetidos: [], sinFila: [] };
  const cod = escRe(p.codigo), re = new RegExp('^' + cod + '-(\\d+)$', 'i'), nums = [], vistos = new Map();
  for (const r of cl.rows) { const m = String(r.cells[0] || '').trim().match(re); if (!m) continue; const n = +m[1]; nums.push(n); vistos.set(n, (vistos.get(n) || 0) + 1); }
  const repetidos = [...vistos].filter(([, c]) => c > 1).map(([n]) => n);
  const saltados = []; if (nums.length) { const max = Math.max(...nums), min = Math.min(...nums); for (let n = min; n <= max; n++) if (!vistos.has(n)) saltados.push(n); }
  const reArch = new RegExp(cod + '[-_](\\d{3,})', 'i'), sinFila = [];
  const dirs = ['specs', 'checklists', rutaSqlDe(p)];
  for (const d of dirs) { let fs0 = []; try { fs0 = fs.readdirSync(path.join(p.ruta, d)); } catch { } for (const f of fs0) { const m = f.match(reArch); if (m && !vistos.has(+m[1])) sinFila.push({ archivo: d + '/' + f, n: +m[1] }); } }
  const ancho = Math.max(3, ...nums.map(n => String(n).length));
  const id = n => p.codigo + '-' + String(n).padStart(ancho, '0');
  return { saltados: saltados.slice(0, 50).map(id), repetidos: repetidos.map(id), sinFila: sinFila.map(x => ({ ...x, id: id(x.n) })) };
}
// ---------- gestión de proyectos ----------
function agregarProyecto(ruta) {
  const d = abs(ruta);
  if (!fs.existsSync(d)) throw new Error('Esa carpeta no existe');
  if (!fs.statSync(d).isDirectory()) throw new Error('Eso no es una carpeta');
  if (!esProyecto(d)) {
    if (!MODO_CENTRAL) throw new Error('Esa carpeta no es un proyecto Timón todavía — usa "Incorporar a Timón"');
    const tmp = { ruta: d, cfg: cargarConfig(d), codigo: path.basename(d).replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase(), nombre: path.basename(d) };
    fs.writeFileSync(path.join(d, 'proyecto.tmn'), JSON.stringify(sugerirTmn(tmp), null, 2) + '\n');
  }
  const lista = new Set((CONFIG_BASE.proyectos || []).map(abs));
  lista.add(d);
  CONFIG_BASE.proyectos = [...lista];
  CONFIG_BASE.ocultos = (CONFIG_BASE.ocultos || []).map(abs).filter(x => x !== d);
  guardarConfigBase(); descubrir();
  return d;
}
function quitarProyecto(ruta) {
  const d = abs(ruta);
  CONFIG_BASE.proyectos = (CONFIG_BASE.proyectos || []).map(abs).filter(x => x !== d);
  const oc = new Set((CONFIG_BASE.ocultos || []).map(abs));
  oc.add(d); // por si lo encuentra la búsqueda automática
  CONFIG_BASE.ocultos = [...oc];
  guardarConfigBase(); descubrir();
}
function incorporarProyecto(ruta, codigo) {
  const plantilla = plantillaDir();
  if (!plantilla) throw new Error('No sé dónde está Timón — configúralo primero en la pestaña Timón');
  const d = abs(ruta);
  const cod = String(codigo || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cod) throw new Error('Falta el código del proyecto (3-5 letras, ej. RB, IDEA)');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  if (!fs.statSync(d).isDirectory()) throw new Error('Eso no es una carpeta');
  if (esProyecto(d)) throw new Error('Esa carpeta ya es un proyecto Timón — usa "Agregar existente"');

  const copiados = [];
  const copiar = (origen, destino) => {
    for (const e of fs.readdirSync(origen, { withFileTypes: true })) {
      if (e.name === 'panel' || e.name === '.DS_Store') continue;       // el panel es central
      const o = path.join(origen, e.name);
      let nombre = e.name.replace(/\[CODIGO\]/g, cod);
      const dst = path.join(destino, nombre);
      if (e.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); copiar(o, dst); continue; }
      if (fs.existsSync(dst)) continue;                                  // nunca pisa lo que ya existe
      let contenido = leer(o);
      if (contenido !== null && /\.(md|json)$/i.test(nombre)) contenido = contenido.replace(/\[CODIGO\]/g, cod);
      fs.writeFileSync(dst, contenido ?? fs.readFileSync(o));
      copiados.push(path.relative(d, dst));
    }
  };
  copiar(plantilla, d);
  agregarProyecto(d);
  return { ruta: d, codigo: cod, archivos: copiados.length };
}

// ---------- correr el actualizador de Timón ----------
let act = { corriendo: false, buf: [], seq: 0, fin: null };
function actualizarTimon(rutas, dry) {
  if (act.corriendo) return { ok: false, error: 'Ya hay una actualización en curso' };
  if (!RUTA_TIMON) return { ok: false, error: 'No sé dónde está Timón — configúralo en la pestaña Timón' };
  const script = path.join(RUTA_TIMON, 'actualizar-timon.mjs');
  if (!fs.existsSync(script)) return { ok: false, error: `No encontré actualizar-timon.mjs en ${RUTA_TIMON}` };
  if (!rutas.length) return { ok: false, error: 'No hay proyectos que actualizar' };

  act = { corriendo: true, buf: [], seq: 0, fin: null, resto: '' };
  const args = [script, ...(dry ? ['--dry'] : []), ...rutas];
  const push = (ch, o) => pushLog(act, ch, o);
  push(`$ node actualizar-timon.mjs ${dry ? '--dry ' : ''}${rutas.length} proyecto(s)\n`);
  const pr = spawn(process.execPath, args, { cwd: RUTA_TIMON });
  pr.stdout.on('data', push); pr.stderr.on('data', push);
  pr.on('exit', code => { act.corriendo = false; act.fin = { code, dry }; push(`\n[terminó — código ${code}]\n`, { fin: true }); descubrir(); });
  pr.on('error', e => { act.corriendo = false; act.fin = { code: -1 }; push(`\n[error: ${e.message}]\n`, { fin: true }); });
  return { ok: true };
}

// ---------- explorador de carpetas (para elegir sin escribir rutas) ----------
function explorar(dir) {
  const d = dir ? abs(dir) : os.homedir();
  if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) throw new Error('No existe esa carpeta');
  const carpetas = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.') || IGNORAR.has(e.name)) continue;
    const full = path.join(d, e.name);
    carpetas.push({ nombre: e.name, ruta: full, esProyecto: esProyecto(full) });
  }
  carpetas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { dir: d, padre: path.dirname(d) === d ? null : path.dirname(d), esProyecto: esProyecto(d), carpetas };
}

// ---------- HTTP ----------
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = url.pathname;
  const p = () => { const pr = proyPorId(url.searchParams.get('p')); if (!pr) throw new Error('No hay proyectos detectados'); return pr; };
  try {
    if (req.method === 'GET' && (q === '/' || q === '/index.html')) return servirCliente(res, 'index.html');
    if (req.method === 'GET' && q.startsWith('/cliente/')) return servirCliente(res, decodeURIComponent(q.slice('/cliente/'.length)));
    if (req.method === 'GET' && q === '/api/ui') return json(res, 200, leerUi());
    if (req.method === 'POST' && q === '/api/ui') { const b = await body(req); guardarUi(b); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/proyectos') { descubrir(); PROYECTOS.forEach(sincronizarHistorial); return json(res, 200, { base: BASE, multi: PROYECTOS.length > 1, proyectos: resumenGeneral() }); }
    if (req.method === 'GET' && q === '/api/estado') return json(res, 200, estadoProyecto(p()));
    if (req.method === 'GET' && q === '/api/archivo') {
      const f = url.searchParams.get('f') || '';
      const r = leerArchivoProyecto(p(), f);
      if (r.tipo !== 'texto' && /\.(md|sql)$/i.test(f)) return json(res, 400, { error: 'No pude leer ese archivo' });
      return json(res, 200, r);
    }
    if (req.method === 'PUT' && q === '/api/archivo') { const b = await body(req); guardarArchivoProyecto(p(), b.f, b.contenido); descubrir(); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/verificar') return json(res, 200, { items: porVerificar(p()) });
    if (req.method === 'GET' && q === '/api/verificar/todos') return json(res, 200, { proyectos: PROYECTOS.map(x => ({ id: x.id, nombre: x.nombre, codigo: x.codigo, cliente: x.cliente, items: porVerificar(x, false) })).filter(x => x.items.length) });
    if (req.method === 'POST' && q === '/api/verificar/marcar') { const b = await body(req); marcarItem(p(), b.file, b.linea, !!b.hecho); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/probar-en') { const b = await body(req); return json(res, 200, { ok: true, file: ponerProbarEn(p(), String(b.id || ''), b.valor) }); }
    if (req.method === 'POST' && q === '/api/verificar/cerrar') { const b = await body(req); return json(res, 200, { ok: true, ...cerrarVerificacion(p(), b.id, b) }); }
    if (req.method === 'POST' && q === '/api/verificar/fallo') { const b = await body(req); reportarFallo(p(), b.id, b.nota); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/cobranza') {
      const mes = HOY_ISO().slice(0, 7);
      const decidir = PROYECTOS.flatMap(x => { const P = resumenPuntos(x); if (!P) return []; return porDecidir(x).map(d => ({ ...d, pid: x.id, codigo: x.codigo, nombre: x.nombre, valor: P.valor })); });
      const regalado = PROYECTOS.reduce((a, x) => { const P = resumenPuntos(x); return a + (P ? P.filas.filter(f => f.tipo === 'Cortesía' && f.nota.includes('Decidido el ' + mes)).reduce((b, f) => b + f.puntos, 0) * P.valor : 0); }, 0);
      return json(res, 200, { mes, porDecidir: decidir, regaladoMes: Math.round(regalado), proyectos: PROYECTOS.map(x => { const c = resumenCobros(x); return c ? { id: x.id, nombre: x.nombre, codigo: x.codigo, cliente: x.cliente, ...c, filas: undefined, cortes: listaCortes(x) } : null; }).filter(Boolean) });
    }
    if (req.method === 'POST' && q === '/api/cobros/crear') { const b = await body(req); return json(res, 200, { ok: true, file: crearCobros(p(), b) }); }
    if (req.method === 'POST' && q === '/api/cobros/fila') { const b = await body(req); guardarCobro(p(), b); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/nuevo') { const b = await body(req); return json(res, 200, { ok: true, ...crearProyectoNuevo(b) }); }
    if (req.method === 'POST' && q === '/api/tmn/etapa') { const b = await body(req); if (!ETAPAS.includes(b.etapa)) return json(res, 400, { error: 'Etapa desconocida' }); escribirTmnCrudo(p(), { etapa: b.etapa }); descubrir(); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/biblioteca') {
      const pr = p(); await asegurarBiblioteca();
      return json(res, 200, { url: `http://localhost:${PUERTO_BIB}/?raiz=${encodeURIComponent(pr.ruta)}&todos=1` });
    }
    if (req.method === 'GET' && q === '/api/carpeta') return json(res, 200, { entradas: listarCarpeta(p(), url.searchParams.get('d') || '.') });
    if (req.method === 'GET' && q === '/api/raw') {
      const pr = p(), full = dentro(pr.ruta, url.searchParams.get('f') || '');
      if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) return json(res, 404, { error: 'No existe' });
      const ext = path.extname(full).slice(1).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      return fs.createReadStream(full).pipe(res);
    }
    if (req.method === 'POST' && q === '/api/abrir') { const b = await body(req); abrirEnMac(p(), b); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/tmn/sugerencia') return json(res, 200, { tmn: sugerirTmn(p()) });
    if (req.method === 'POST' && q === '/api/tmn') { const b = await body(req); const f = guardarTmn(p(), b.tmn || {}); descubrir(); return json(res, 200, { ok: true, file: f }); }
    if (req.method === 'POST' && q === '/api/tmn/generar') {
      let n = 0;
      for (const pr of PROYECTOS) if (!pr.tmnFile) { fs.writeFileSync(path.join(pr.ruta, 'proyecto.tmn'), JSON.stringify(sugerirTmn(pr), null, 2) + '\n'); n++; }
      descubrir(); return json(res, 200, { ok: true, creados: n });
    }
    if (req.method === 'POST' && q === '/api/raices') {
      const b = await body(req);
      const lista = (Array.isArray(b.raices) ? b.raices : []).map(x => String(x).trim()).filter(Boolean);
      CONFIG_BASE.carpetasProyectos = lista; guardarConfigBase(); descubrir();
      return json(res, 200, { ok: true, raices: lista });
    }
    if (req.method === 'POST' && q === '/api/inbox') { const b = await body(req); if (!b.texto?.trim()) return json(res, 400, { error: 'Texto vacío' }); capturarInbox(p(), b.texto); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/changelog/estado') { const b = await body(req); return json(res, 200, { ok: true, cells: actualizarEstado(p(), b.id, b.estado, b.nota) }); }
    if (req.method === 'POST' && q === '/api/changelog/celda') { const b = await body(req); ponerCelda(p(), b.id, b.col === 'tipo' ? 'tipo' : 'donde', b.valor || ''); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/changelog/columnas') return json(res, 200, { ok: true, agregadas: asegurarColumnas(p()) });
    if (req.method === 'POST' && q === '/api/mapa') { const b = await body(req); return json(res, 200, { ok: true, file: guardarMapa(p(), b.lugares) }); }
    if (req.method === 'POST' && q === '/api/config/montos') { const b = await body(req); guardarMontos(p(), b); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/config/etapas') { const b = await body(req); guardarEtapasPlan(p(), b.plan); descubrir(); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/historial') return json(res, 200, { eventos: leerJson(histDe(p()), []) });
    if (req.method === 'GET' && q === '/api/carriles') return json(res, 200, carrilesProyecto(p()));
    if (req.method === 'POST' && q === '/api/hilos/tomar') { const b = await body(req); return json(res, 200, tomarPieza(p(), String(b.id || ''), !!b.forzar)); }
    if (req.method === 'POST' && q === '/api/hilos/enlace') { const b = await body(req); ponerEnlaceHilo(p(), String(b.hilo || ''), String(b.enlace || '')); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/pieza') return json(res, 200, expedientePieza(p(), url.searchParams.get('id') || ''));
    if (req.method === 'POST' && q === '/api/pieza/comentario') { const b = await body(req); agregarComentario(p(), b.archivo, b.texto, b.sobre); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/pieza/comentario/estado') { const b = await body(req); marcarComentario(p(), b.archivo, b.linea, !!b.atendido); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/pieza/checklist') { const b = await body(req); return json(res, 200, { ok: true, file: crearChecklist(p(), b.id) }); }
    if (req.method === 'POST' && q === '/api/pieza/spec') {
      const b = await body(req), pr = p(); const id = String(b.id || '');
      const lista = archivosMd(pr), a = archivosDeId(lista, id);
      if (a.specs.length) return json(res, 200, { ok: true, file: a.specs[0] });
      fs.mkdirSync(path.join(pr.ruta, 'specs'), { recursive: true });
      const rel = `specs/${id}.md`; fs.writeFileSync(path.join(pr.ruta, rel), PLANTILLA_SPEC(`${id} · ${String(b.titulo || '').trim()}`));
      return json(res, 200, { ok: true, file: rel });
    }
    if (req.method === 'PUT' && q === '/api/checklist') {
      const b = await body(req), pr = p(); const full = dentro(pr.ruta, b.file || '');
      if (!full || !full.startsWith(path.join(pr.ruta, 'checklists') + path.sep) || !full.endsWith('.md')) return json(res, 400, { error: 'Solo archivos dentro de /checklists/' });
      fs.writeFileSync(full, b.contenido ?? ''); return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && q === '/api/puntos/decidir') { const b = await body(req); decidirCobro(p(), b); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/cotizacion') return json(res, 200, { ok: true, ...generarCotizacion(p()) });
    if (req.method === 'GET' && q === '/api/piezas/abiertas') return json(res, 200, { piezas: piezasAbiertas() });
    if (req.method === 'POST' && q === '/api/piezas/cerrar-todas') { const b = await body(req); const n = cerrarPiezasEnBloque(b.piezas); descubrir(); return json(res, 200, { ok: true, cerradas: n }); }
    if (req.method === 'GET' && q === '/api/specs/abiertos') return json(res, 200, { specs: specsAbiertos() });
    if (req.method === 'POST' && q === '/api/specs/cerrar-todos') { const b = await body(req); return json(res, 200, { ok: true, cerrados: cerrarSpecsEnBloque(b.specs) }); }
    if (req.method === 'GET' && q === '/api/archivos/buscar') return json(res, 200, buscarArchivos(p(), url.searchParams.get('q') || '', url.searchParams.get('formato') || '', url.searchParams.get('ocultos') === '1'));
    if (req.method === 'GET' && q === '/api/textos/buscar') return json(res, 200, buscarTexto(p(), url.searchParams.get('q'), { mayus: url.searchParams.get('mayus') === '1', palabra: url.searchParams.get('palabra') === '1' }));
    if (req.method === 'POST' && q === '/api/textos/reemplazar') { const b = await body(req); return json(res, 200, { ok: true, ...reemplazarTexto(p(), b) }); }
    if (req.method === 'POST' && q === '/api/editor/abrir') { const b = await body(req); return json(res, 200, { ok: true, editor: abrirEnEditor(p(), b.f, b.linea) }); }
    if (req.method === 'POST' && q === '/api/timon/editor') { const b = await body(req); if (!EDITORES[b.editor]) return json(res, 400, { error: 'Editor desconocido' }); CONFIG_BASE.editor = b.editor; guardarConfigBase(); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/plan/sugerir') return json(res, 200, sugerirPlan(p()));
    if (req.method === 'POST' && q === '/api/plan/aplicar') { const pr = p(); const b = await body(req); if (b.tamano && TAMANOS.includes(b.tamano)) { escribirTmnCrudo(pr, { tamano: b.tamano }); descubrir(); } const pr2 = proyPorId(pr.id) || pr; planAutomatico(pr2, { forzar: true }); descubrir(); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/timon/plan') { const b = await body(req); const nb = {}; for (const t of TAMANOS) { nb[t] = {}; for (const e of ETAPAS_PLAN) { const v = Math.round(num((b.planBase || {})[t]?.[e])); if (v > 0) nb[t][e] = v; } } CONFIG_BASE.planBase = nb; guardarConfigBase(); return json(res, 200, { ok: true, planBase: planBase() }); }
    if (req.method === 'POST' && q === '/api/hitos') { const b = await body(req); guardarHitos(p(), b.hitos); descubrir(); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/tiempo') return json(res, 200, tiempoGeneral());
    if (req.method === 'GET' && q === '/api/tiempo/proyecto') return json(res, 200, tiempoProyecto(p()));
    if (req.method === 'GET' && q === '/api/inicio') return json(res, 200, inicio());
    if (req.method === 'POST' && q === '/api/inicio/despues') { const b = await body(req); posponerHoy(b.clave); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/inicio/despues/limpiar') { CONFIG_BASE.pospuestos = {}; guardarConfigBase(); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/inicio/fijar') { const b = await body(req); fijarProyecto(String(b.pid || ''), !!b.fijo); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/metricas') return json(res, 200, metricasProyecto(p(), url.searchParams.get('r') || '30'));
    if (req.method === 'GET' && q === '/api/hoy') return json(res, 200, { items: hoy() });
    if (req.method === 'GET' && q === '/api/buscar') return json(res, 200, { items: buscar(url.searchParams.get('q') || '') });
    if (req.method === 'POST' && q === '/api/ideas/promover') { const b = await body(req); return json(res, 200, { ok: true, id: promoverIdea(p(), b) }); }
    if (req.method === 'POST' && q === '/api/ideas/descartar') { const b = await body(req); descartarIdea(p(), b); return json(res, 200, { ok: true }); }
    if (req.method === 'GET' && q === '/api/adoptar/diagnostico') return json(res, 200, diagnosticoAdopcion(url.searchParams.get('ruta') || ''));
    if (req.method === 'POST' && q === '/api/adoptar') { const b = await body(req); return json(res, 200, { ok: true, ...adoptarProyecto(b) }); }
    if (req.method === 'POST' && q === '/api/cotizacion/aceptar') { const r = aceptarCotizacion(p()); descubrir(); return json(res, 200, { ok: true, ...r }); }
    if (req.method === 'POST' && q === '/api/corte') { const b = await body(req); return json(res, 200, { ok: true, ...generarCorte(p(), b) }); }
    if (req.method === 'POST' && q === '/api/changelog/nueva') { const b = await body(req); if (!b.descripcion?.trim()) return json(res, 400, { error: 'Falta descripción' }); return json(res, 200, { ok: true, id: agregarFila(p(), b) }); }
    if (req.method === 'POST' && q === '/api/puntos/crear') { const b = await body(req); return json(res, 200, { ok: true, file: crearPuntos(p(), b) }); }
    if (req.method === 'POST' && q === '/api/puntos/fila') { const b = await body(req); guardarFilaPuntos(p(), b); return json(res, 200, { ok: true }); }
    if (req.method === 'PUT' && q === '/api/spec') {
      const b = await body(req), pr = p();
      const full = dentro(pr.ruta, b.file || '');
      if (!full || !full.startsWith(path.join(pr.ruta, 'specs') + path.sep) || !full.endsWith('.md')) return json(res, 400, { error: 'Solo archivos dentro de /specs/' });
      fs.writeFileSync(full, b.contenido ?? ''); return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && q === '/api/spec/nuevo') {
      const b = await body(req), pr = p();
      const slug = (b.nombre || '').trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/^-+|-+$/g, '');
      if (!slug) return json(res, 400, { error: 'Falta nombre' });
      fs.mkdirSync(path.join(pr.ruta, 'specs'), { recursive: true });
      const file = path.join(pr.ruta, 'specs', `${pr.codigo}-${slug}.md`);
      if (fs.existsSync(file)) return json(res, 400, { error: 'Ya existe un spec con ese nombre' });
      fs.writeFileSync(file, PLANTILLA_SPEC(b.nombre.trim()));
      return json(res, 200, { ok: true, file: 'specs/' + path.basename(file) });
    }
    if (req.method === 'POST' && q === '/api/sql/aplicado') {
      const b = await body(req); marcarSqlEntorno(p(), b.rel, b.entorno || 'produccion', !!b.aplicado);
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET' && q === '/api/salud') return json(res, 200, saludProyecto(p()));
    if (req.method === 'GET' && q === '/api/ordenar') return json(res, 200, diagnosticoOrden(p()));
    if (req.method === 'POST' && q === '/api/ordenar') { const b = await body(req); return json(res, 200, { ok: true, ...ordenarProyecto(p(), b.desde) }); }
    // --- gestión de Timón y proyectos ---
    if (req.method === 'GET' && q === '/api/timon') {
      return json(res, 200, {
        planBase: planBase(), duraciones: duracionesHistoricas(), puntosSemana: puntosPorSemana(), editor: CONFIG_BASE.editor || 'code', editores: Object.fromEntries(Object.entries(EDITORES).map(([k, v]) => [k, v.nombre])), cobroBase: cobroBase(), valores: PROYECTOS.map(x => { const P = parsePuntos(x); return P ? { id: x.id, nombre: x.nombre, codigo: x.codigo, cliente: x.cliente, valor: P.valor, propio: P.valorPropio } : null; }).filter(Boolean),
        base: BASE, rutaTimon: RUTA_TIMON, valida: !!(RUTA_TIMON && esTimonValido(RUTA_TIMON)), central: MODO_CENTRAL,
        raices: (CONFIG_BASE.carpetasProyectos || []).map(r => ({ ruta: r, existe: fs.existsSync(abs(r)) })),
        sinTmn: PROYECTOS.filter(x => !x.tmnFile).length, version: VERSION_TIMON(),
        atrasados: PROYECTOS.filter(desactualizado).map(x => ({ id: x.id, nombre: x.nombre, version: x.timonVersion || 'sin versión' })),
        tieneActualizador: !!(RUTA_TIMON && fs.existsSync(path.join(RUTA_TIMON, 'actualizar-timon.mjs'))),
        registrados: (CONFIG_BASE.proyectos || []).map(abs),
        proyectos: PROYECTOS.map(p => ({ id: p.id, nombre: p.nombre, codigo: p.codigo, ruta: p.ruta })),
        actualizando: act.corriendo,
      });
    }
    if (req.method === 'POST' && q === '/api/timon/cobro') {
      const b = await body(req);
      if (num(b.valorPunto) > 0) CONFIG_BASE.valorPunto = num(b.valorPunto);
      if (b.bolsaPct !== undefined && String(b.bolsaPct).trim() !== '') CONFIG_BASE.bolsaPct = Math.max(0, num(b.bolsaPct));
      if (b.costoHora !== undefined) CONFIG_BASE.costoHora = Math.max(0, num(b.costoHora));
      if (b.iaMensual !== undefined) CONFIG_BASE.iaMensual = Math.max(0, num(b.iaMensual));
      guardarConfigBase();
      for (const id of (Array.isArray(b.usarBase) ? b.usarBase : [])) { const pr = PROYECTOS.find(x => x.id === id), f = pr && puntosDe(pr); if (f) ponerParam(f, 'Valor del punto', 'Timón'); }
      return json(res, 200, { ok: true, cobroBase: cobroBase() });
    }
    if (req.method === 'POST' && q === '/api/timon/ruta') {
      const b = await body(req); const d = abs(b.ruta || '');
      if (!esTimonValido(d)) return json(res, 400, { error: 'Ahí no encuentro plantilla-proyecto-nuevo' });
      RUTA_TIMON = d; CONFIG_BASE.rutaTimon = d; guardarConfigBase();
      return json(res, 200, { ok: true, rutaTimon: d });
    }
    if (req.method === 'POST' && q === '/api/proyectos/agregar') { const b = await body(req); return json(res, 200, { ok: true, ruta: agregarProyecto(b.ruta) }); }
    if (req.method === 'POST' && q === '/api/proyectos/quitar') { const b = await body(req); quitarProyecto(b.ruta); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && q === '/api/proyectos/incorporar') { const b = await body(req); return json(res, 200, { ok: true, ...incorporarProyecto(b.ruta, b.codigo) }); }
    if (req.method === 'POST' && q === '/api/timon/actualizar') {
      const b = await body(req);
      const rutas = b.todos ? PROYECTOS.map(x => x.ruta) : (b.ids || []).map(id => proyPorId(id)).filter(Boolean).map(x => x.ruta);
      return json(res, 200, actualizarTimon(rutas, !!b.dry));
    }
    if (req.method === 'GET' && q === '/api/timon/logs') {
      const since = +(url.searchParams.get('since') || 0);
      return json(res, 200, { corriendo: act.corriendo, fin: act.fin, lines: act.buf.filter(l => l.i >= since), next: act.seq });
    }
    if (req.method === 'GET' && q === '/api/explorar') return json(res, 200, explorar(url.searchParams.get('dir')));

    if (req.method === 'POST' && q === '/api/run/start') return json(res, 200, runStart(p(), +(url.searchParams.get('l') || 0)));
    if (req.method === 'POST' && q === '/api/run/stop') return json(res, 200, runStop(p(), +(url.searchParams.get('l') || 0)));
    if (req.method === 'GET' && q === '/api/run/logs') {
      const pr = p(), r = corriendo.get(claveRun(pr.id, url.searchParams.get('l') || 0)), since = +(url.searchParams.get('since') || 0);
      if (!r) return json(res, 200, { corriendo: false, exit: null, lines: [], next: 0 });
      return json(res, 200, { corriendo: !!r.proc, exit: r.exit, lines: r.buf.filter(l => l.i >= since), next: r.seq });
    }
    json(res, 404, { error: 'No existe ese endpoint' });
  } catch (e) { json(res, 500, { error: e.message }); }
});

// ---------- dónde estabas (TMN-012): respaldo del lado del servidor ----------
// La app de Mac no siempre conserva el almacenamiento del navegador; el panel guarda aquí la ruta, las pestañas y la altura.
const UI_FILE = path.join(path.dirname(CONFIG_FILE), MODO_CENTRAL ? 'ui.json' : '.timon-ui.json');
const leerUi = () => { try { return JSON.parse(fs.readFileSync(UI_FILE, 'utf8')) || {}; } catch { return {}; } };
function guardarUi(cambios) {
  const ui = { ...leerUi() };
  for (const [k, v] of Object.entries(cambios || {})) if (/^timon\.[a-zA-Z]+$/.test(k)) ui[k] = v;
  try { fs.mkdirSync(path.dirname(UI_FILE), { recursive: true }); fs.writeFileSync(UI_FILE, JSON.stringify(ui)); } catch { }
}

// ---------- UI (TMN-038): la interfaz vive en ./cliente/ ----------
const CLIENTE = path.join(SCRIPT_DIR, 'cliente');
const MIME_CLIENTE = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', woff2: 'font/woff2', svg: 'image/svg+xml', png: 'image/png', json: 'application/json; charset=utf-8' };
function servirCliente(res, rel) {
  const full = dentro(CLIENTE, rel);
  if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No existe'); }
  const ext = path.extname(full).slice(1).toLowerCase();
  // index.html pide cada archivo con su fecha (?v=…): al cambiar un archivo, la app de Mac no puede usar una copia vieja
  if (rel === 'index.html') {
    const html = (leer(full) || '').replace(/(\/cliente\/[\w.-]+\.(?:css|js|svg))(?=")/g, m => { try { return m + '?v=' + Math.round(fs.statSync(path.join(CLIENTE, m.slice(9))).mtimeMs); } catch { return m; } });
    res.writeHead(200, { 'Content-Type': MIME_CLIENTE.html, 'Cache-Control': 'no-store' });
    return res.end(html);
  }
  res.writeHead(200, { 'Content-Type': MIME_CLIENTE[ext] || 'application/octet-stream', 'Cache-Control': ext === 'woff2' ? 'max-age=31536000' : 'no-store' });
  fs.createReadStream(full).pipe(res);
}

// ---------- arranque ----------
descubrir();
function listen(puerto, intentos = 0) {
  server.once('error', err => {
    if (err.code === 'EADDRINUSE' && intentos < 10 && !process.env.TIMON_APP) { console.log(`Puerto ${puerto} ocupado, probando ${puerto + 1}…`); listen(puerto + 1, intentos + 1); }
    else { console.error('No pude arrancar el panel:', err.message); process.exit(1); }
  });
  server.listen(puerto, '127.0.0.1', () => {
    const url = `http://localhost:${puerto}`;
    console.log(`\n  🧭 Panel Timón`);
    console.log(MODO_CENTRAL ? `  Modo central · carpetas: ${(CONFIG_BASE.carpetasProyectos || []).join(', ')}` : `  Carpeta base: ${BASE}`);
    console.log(`  Proyectos detectados: ${PROYECTOS.length}${PROYECTOS.length ? ' — ' + PROYECTOS.map(p => p.nombre).join(', ') : ''}`);
    console.log(`  Abierto en ${url}  (Ctrl+C para cerrar)\n`);
    if (process.env.TIMON_APP) return; // dentro de Timón.app: la ventana nativa ya lo muestra
    try {
      const abrir = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      spawn(abrir, [url], { shell: process.platform === 'win32', stdio: 'ignore', detached: true }).unref();
    } catch { }
  });
}
listen(CONFIG_BASE.puerto);
function apagar() {
  for (const r of corriendo.values()) if (r.proc) { try { process.kill(-r.proc.pid, 'SIGTERM'); } catch { try { r.proc.kill('SIGTERM'); } catch { } } }
  if (procBib) { try { procBib.kill('SIGTERM'); } catch { } }
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
// Si Timón.app se cierra a la fuerza, el panel se apaga solo (y con él lo que lanzó).
if (process.env.TIMON_APP_PID) setInterval(() => { try { process.kill(+process.env.TIMON_APP_PID, 0); } catch { apagar(); } }, 3000);
