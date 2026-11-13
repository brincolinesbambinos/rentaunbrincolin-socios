# Panel Timón

Tablero local en el navegador para ver y mover tus proyectos Timón sin abrir terminal ni archivo por archivo. Un solo archivo (`timon-panel.mjs`), cero dependencias — solo necesitas Node 18+. Escucha únicamente en tu máquina (127.0.0.1).

**El principio:** los `.md` de cada proyecto (CHANGELOG, INBOX, specs) siguen siendo la fuente de verdad. El panel no tiene base de datos propia — lee y escribe los mismos archivos que las IAs, así que panel y chats nunca se desincronizan.

## Dos modos (se detecta solo)

**Modo multi — recomendado.** Pon el panel en la carpeta que contiene todos tus proyectos (ej. `~/Downloads/Plataformas/`) y ábrelo desde ahí: descubre todos los proyectos Timón que cuelgan de ahí (hasta 3 niveles) y los controla desde un mismo lugar. Un solo panel para todo.

**Modo sencillo.** Si el panel vive dentro de un proyecto, controla solo ese.

En ambos casos: doble clic en `Panel-Timon.command`, o `node timon-panel.mjs` desde esa carpeta. También puedes pasarle la carpeta: `node timon-panel.mjs ~/Downloads/Plataformas`. Se abre solo en `http://localhost:4444` (si el puerto está ocupado, usa el siguiente).

## Pestaña ⚙ Timón — el centro de mando

Desde aquí manejas el sistema sin abrir terminal:

- **Carpeta de Timón** — dónde vive `sistema-timon` (la que tiene `plantilla-proyecto-nuevo` y `actualizar-timon.mjs`). El panel la detecta sola en los lugares típicos; si no, la eliges con el explorador de carpetas.
- **Actualizar Timón en los proyectos** — marca los proyectos y corre el actualizador desde el navegador, con los logs en vivo ahí mismo. **Simular (--dry)** te dice qué haría sin escribir nada; **Actualizar seleccionados** lo aplica. Lleva reglas, skills y metodología; no toca changelog, inbox, specs, Marco, Arquitectura ni la Parte 2 de tu CLAUDE.md, y deja respaldos `.bak`.
- **Agregar un proyecto que ya usa Timón** — para proyectos que viven fuera de la carpeta base. Quedan guardados en el `timon.config.json` del panel, así que siguen ahí la próxima vez.
- **Incorporar una carpeta nueva a Timón** — le das una carpeta y un código (ej. `RB`) y copia el kit completo ya renombrado: CLAUDE.md con las reglas, Marco, Arquitectura, changelog, inbox, memoria, specs, metodología y skills. Nunca pisa archivos que ya existan. Es el arranque de proyecto nuevo, hecho desde el panel.

Cada campo de ruta trae un botón **📂 Buscar…** que abre un explorador de carpetas — marca con 🧭 las que ya son proyectos Timón, así no tienes que escribir rutas a mano.

El botón **Quitar** solo saca al proyecto de la lista del panel; no borra ningún archivo.

## Inicio: Hoy y proyectos

Arriba, **Hoy te toca**: hasta 5 tarjetas por urgencia en todos los proyectos (pago vencido, pieza que falló, piezas por probar, cobros por decidir, pago en los próximos 7 días, ideas acumuladas, proyecto en Construcción sin moverse). Clic y llegas a la acción. Abajo, lo que está corriendo y las tarjetas de proyectos agrupadas por cliente, con su etapa.

- **⌘K Buscar y hacer:** proyectos, piezas (por ID o texto), ideas y acciones ("nueva pieza en RB", "arrancar PartyBot", "cobro de Idea", "probar RB-295").
- **Calendario:** todos los proyectos por etapa, lo planeado contra lo real, los pagos y la carga de proyectos en construcción por mes.
- **⌘N Proyecto:** empezar uno de cero o traer uno empezado (diagnóstico, kit sin pisar nada y cada corrección como pieza Interno).

## Dentro de un proyecto

Siete secciones; lo demás vive como subpestaña:

- **Resumen** — "Lo que sigue" (un botón con la siguiente acción), etapas, contadores, avisos, por módulo y actividad reciente. Subpestañas **Etapas en el tiempo** (plan contra real y proyección al ritmo actual) y **Piezas en el tiempo** (cuánto pasó cada pieza en cada estado).
- **Piezas** — Lista, Por lugar (mapa) y Tabla (el changelog de siempre, con cambio de estado por fila). Cada pieza abre su expediente.
- **Ideas** — el INBOX en tarjetas: anotar, promover a pieza, descartar. El archivo no se borra nunca.
- **Probar** — sesión de verificación, una pieza a la vez.
- **Cobro** — contrato, pagos, iguala, Por decidir, por módulo, cortes y Puntos.
- **Taller** — Archivos (árbol y visor dentro de Timón, edición a mano con respaldo), Corregir textos (buscar y reemplazar una frase en todo el proyecto, sin IA), SQL, Documentos, Specs y Ordenar y salud. Los botones "Abrir en el editor" abren VS Code o Cursor en la línea exacta (se elige en Ajustes).
- **Configuración** — ficha, montos, módulos, fechas planeadas y lanzadores.

La barra del proyecto tiene Abrir, Arrancar o Detener, Finder, Terminal, **Consola** (los logs abajo, sin salir de donde estás) y **+ Pieza**. **El panel no ejecuta SQL contra ninguna base, a propósito.**

## Configuración (`timon.config.json`)

Cada proyecto trae el suyo — de ahí sale su comando de arranque:

```json
{
  "puerto": 4444,
  "comandoRun": "npm run dev",
  "cwdRun": ".",
  "carpetasSql": ["sql", "migrations", "db", "database", "supabase/migrations"]
}
```

`cwdRun` es la subcarpeta desde donde correr el comando (ej. `"app"`). El comando se relee cada vez que le das ▶, así que puedes editarlo con el panel abierto.

En modo multi, el panel guarda su propio `timon.config.json` junto a él (lo escribe solo cuando agregas o quitas proyectos desde la pestaña ⚙ Timón):

```json
{
  "puerto": 4444,
  "rutaTimon": "/Users/tu/Downloads/sistema-timon",
  "proyectos": ["/Users/tu/OtroLugar/proyecto-externo"],
  "ocultos": []
}
```

`proyectos` son los que agregaste a mano (los que están dentro de la carpeta base se detectan solos), `ocultos` los que quitaste de la lista. También acepta `carpetasProyectos` si prefieres fijar la lista exacta en vez de la búsqueda automática.

## Límites conocidos

- Las descripciones del changelog no pueden llevar `|` (es el separador de la tabla markdown — mismo límite que ya tiene el archivo).
- Si una IA edita un archivo mientras lo tienes abierto en el editor de specs, gana el último que guarde. Las demás vistas se refrescan cada 20 segundos.
- Ejecutar SQL directo contra la base quedó explícitamente fuera de alcance de esta versión.
- Los procesos que arrancas mueren cuando cierras el panel (Ctrl+C los detiene a todos).

## Pestaña 💰 Puntos

Lee `PUNTOS-[CODIGO].md` en la raíz de cada proyecto (lo crea el skill `cotizar-proyecto` o el botón "Crear registro" de la pestaña). Muestra:

- **Contratado usado:** puntos registrados como Contratado contra los puntos de la cotización.
- **Cortesía usada:** lo regalado contra la bolsa de cortesía. Avisa al 80% y al agotarse.
- **Extras por cobrar:** puntos tipo Extra sin cobrar, en pesos con el valor del punto. Botón "Marcar cobrado".
- **Garantía:** correcciones, solo informativo.
- **Sin clasificar:** solicitudes del changelog que todavía no tienen tipo ni puntos, para clasificarlas ahí mismo.

En la vista general, cada proyecto con registro muestra lo que hay por cobrar, la cortesía restante y el % de lo contratado.

## Panel central y fichas `.tmn`

Un solo panel para todos tus proyectos, sin entrar a cada carpeta. Se abre con doble clic en **`Panel Timón.command`** (en `Downloads/Sistemas`) o con:

```
node timon-panel.mjs --central
```

- Busca proyectos en las carpetas raíz (por defecto `~/Downloads/Plataformas`, `~/Developer` y `~/Downloads/Sistemas`), hasta 5 niveles adentro. Las carpetas se cambian en la pestaña **⚙ Timón**.
- Un proyecto aparece si tiene una ficha `.tmn`, un `CHANGELOG-*.md` o un `00-MARCO.md`.
- La configuración del panel central vive en `~/.timon/panel.json`. Abre en `http://localhost:4400`.

### Qué hace

- **Vista general** agrupada por cliente, con buscador y filtro por estado. Cada tarjeta trae ▶ para lanzar, 🌐 para abrir la URL y 📁 para abrir la carpeta en Finder.
- **▶ Correr:** varios lanzadores por proyecto, cada uno con sus logs. Pueden correr varios proyectos a la vez.
- **📁 Archivos:** explorador de la carpeta del proyecto, visor de Markdown, imágenes y PDF, y editor de archivos de texto. Botones para mostrar en Finder, abrir con su app o abrir una Terminal ahí.
- **⚙ Proyecto:** edita la ficha `.tmn` (nombre, cliente, marca, estado, color, lanzadores, ligas, proyectos relacionados). "Sugerir desde el proyecto" la arma con lo que detecta en la carpeta.

### Formato `.tmn`

Un JSON en la raíz del proyecto, normalmente `proyecto.tmn`:

```json
{
  "timon": 1,
  "nombre": "Renta un Brincolín",
  "codigo": "RB",
  "cliente": "Brincolines Bambinos",
  "marca": "Midnite Atelier",
  "estado": "activo",
  "color": "#ff7a59",
  "descripcion": "Backoffice de rentas multi-sucursal",
  "lanzadores": [
    { "nombre": "Desarrollo", "comando": "npm run dev -- -p 4002", "carpeta": ".", "url": "http://localhost:4002" }
  ],
  "ligas": [ { "nombre": "Producción", "url": "https://…" } ],
  "relacionados": ["BB", "PTB"]
}
```

- `estado`: `activo`, `pausado`, `entregado` o `idea`.
- `lanzadores[].comando` corre en la `carpeta` indicada (relativa al proyecto). Sirve cualquier cosa que corra en Terminal: `npm run dev`, `zsh "./App.command"`, `open index.html`, `node server.mjs`.
- `relacionados`: códigos de otros proyectos; en ⚙ Proyecto aparecen como accesos directos.

## Dónde vive la interfaz

Desde la versión 2026.10.21.3 la interfaz está en `cliente/` (junto a `timon-panel.mjs`). El servidor solo la sirve. Detalle de cada archivo en `cliente/LEEME.md`.
