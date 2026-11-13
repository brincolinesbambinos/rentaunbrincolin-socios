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

## Vista general (modo multi)

La pantalla de inicio: una tarjeta por proyecto con sus contadores (✅ sin verificar, 🔄 en construcción, 🔲 pendientes, 📥 inbox sin procesar, 🗄️ SQL pendientes), punto verde si está corriendo, y arriba los totales cruzados. De un vistazo ves dónde se te está acumulando trabajo sin cerrar — que es justo el punto ciego que las reglas 17-19 atacan. Clic en cualquier tarjeta para entrar; el selector del encabezado cambia de proyecto sin volver al inicio.

## Dentro de un proyecto

- **Tablero** — contadores + alertas de las reglas 17-19, captura rápida al inbox, y el changelog completo con cambio de estado por fila. Marcar ✔️ Verificado pide confirmación de que TÚ corriste el checklist; marcar 🔄 avisa si ya hay frentes abiertos (regla 18); 🚫 pide la nota de por qué se descarta.
- **Inbox** — el INBOX rendereado + captura rápida (si el proyecto no tiene inbox, se crea con la primera captura).
- **Specs** — lista con su estado; ver rendereado, editar y guardar, o crear uno nuevo desde la plantilla estándar.
- **SQL** — lista los `.sql` del proyecto, los muestra y los copia con un botón para pegarlos en Supabase/tu editor de BD. El check de "aplicado" es tu registro personal. **El panel no ejecuta SQL contra ninguna base — a propósito (v1 segura).**
- **Docs** — los `.md` de la raíz (Marco, Arquitectura, Memoria…) rendereados, solo lectura.
- **▶ Correr** — arranca/detiene el comando del proyecto con logs en vivo, sin ventana de terminal. **Puedes tener varios proyectos corriendo a la vez** — cada uno con sus propios logs, y el punto verde en la vista general te dice cuáles están arriba.

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
