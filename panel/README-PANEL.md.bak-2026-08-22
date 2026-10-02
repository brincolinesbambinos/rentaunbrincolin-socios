# Panel Timón

Tablero local del proyecto en el navegador. Un solo archivo (`timon-panel.mjs`), cero dependencias — solo necesitas Node 18+ instalado. Solo escucha en tu propia máquina (127.0.0.1), nadie más puede entrar.

**El principio:** los `.md` del proyecto (CHANGELOG, INBOX, specs) siguen siendo la fuente de verdad. El panel no tiene base de datos propia — lee y escribe los mismos archivos que las IAs usan, así que panel y chats nunca se desincronizan.

## Cómo abrirlo

- **Mac, doble clic:** `Panel-Timon.command`. La primera vez macOS puede bloquearlo → clic derecho → Abrir. Si no ejecuta, corre una vez en Terminal: `chmod +x panel/Panel-Timon.command`
- **Cualquier sistema:** `node panel/timon-panel.mjs` desde la carpeta del proyecto.

Se abre solo en `http://localhost:4444` (si el puerto está ocupado, prueba el siguiente automáticamente).

## Qué hace cada tab

- **Tablero** — contadores por estado con alertas de las reglas 17-19 (frentes abiertos de más, ✅ sin verificar), captura rápida al inbox, y el changelog completo con cambio de estado por fila. Marcar ✔️ Verificado pide confirmación de que TÚ corriste el checklist; marcar 🔄 avisa si ya hay frentes abiertos (regla 18).
- **Inbox** — el INBOX del proyecto rendereado + captura rápida.
- **Specs** — lista con su estado; cada spec se puede ver rendereado o editar y guardar; botón para crear uno nuevo desde la plantilla estándar.
- **SQL** — lista los `.sql` del proyecto (carpetas en `timon.config.json`), los muestra y los copia con un botón para pegarlos en Supabase/tu editor de BD. El check de "aplicado" es tu registro personal (se guarda en `panel/sql-aplicados.json`). **El panel no ejecuta SQL contra ninguna base — a propósito (v1 segura).**
- **Docs** — los `.md` de la raíz del proyecto (Marco, Arquitectura, Memoria…) rendereados, solo lectura.
- **▶ Correr** — arranca/detiene el comando del proyecto (`comandoRun` en `timon.config.json`, default `npm run dev`) y muestra los logs ahí mismo — sin ventana de terminal abierta.

## Configuración (`timon.config.json` en la raíz del proyecto)

```json
{
  "puerto": 4444,
  "comandoRun": "npm run dev",
  "cwdRun": ".",
  "carpetasSql": ["sql", "migrations", "db", "database", "supabase/migrations"]
}
```

`cwdRun` es la subcarpeta desde donde se corre el comando (ej. `"app"` si tu código vive en `/app`). Se puede agregar `"codigo": "XXX"` si el panel no detecta bien el código del proyecto desde el nombre del changelog.

## Límites conocidos (v1)

- Las descripciones del changelog no pueden llevar el carácter `|` (es el separador de la tabla markdown — mismo límite que ya tiene el archivo).
- Si una IA edita un archivo mientras lo tienes abierto en el editor de specs, gana el último que guarde. El panel refresca el resto de las vistas solo cada 20 segundos.
- Ejecutar SQL directo contra la base quedó explícitamente fuera de alcance de la v1.
