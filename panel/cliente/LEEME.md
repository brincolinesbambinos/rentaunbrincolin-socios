# Interfaz del panel (cliente)

Desde TMN-038 la interfaz de Timón vive aquí, separada del servidor (`../timon-panel.mjs`).
El servidor no necesita `npm install`: solo sirve estos archivos.

| Archivo | Qué tiene |
|---|---|
| `index.html` | Esqueleto: barra superior, pestañas, secciones, banda y contenido |
| `estilos.css` | Sistema Astillero: colores, tipografías, bordes y componentes. Ninguna pantalla escribe colores a mano. |
| `iconos.js` | Íconos Tabler con trazo a mano. **Generado**: no se edita a mano (ver `herramientas/generar-iconos.mjs`). |
| `nucleo.js` | Estado, llamadas al servidor, las 7 secciones del proyecto con sus subpestañas, banda superior y notas a mano |
| `general.js` | Tarjetas de proyectos, Ajustes (agrupado) y explorador de carpetas |
| `proyecto.js` | Specs, Puntos, Documentos, Lanzadores, Archivos y Ficha |
| `vistas.js` | Etapas, Probar y Cobro de todos los proyectos |
| `rutas.js` | Pestañas de proyectos y memoria de dónde estabas |
| `salud-sql.js` | Salud, Ordenar y SQL por entorno |
| `mapa-config.js` | Mapa por lugar, Configuración, Tipo y Dónde (Fase 2) |
| `carriles.js` | Carriles e hilos: límite de Por probar, carriles ocupados, choques de lugar, todos los hilos y Tomar pieza (TMN-068) |
| `cobro.js` | Cobro: Por decidir, por módulo y corte (Fase 4) |
| `piezas.js` | Piezas, la pieza como expediente, Probar en sesión y el panel lateral de SQL (Fase 3) |
| `resumen.js` | Resumen con "lo que sigue", Tabla del changelog, consola, diálogo y + Pieza (Fase 5) |
| `inicio.js` | Hoy: lo urgente de todos los proyectos (Fase 5) |
| `ideas.js` | Ideas en tarjetas: promover a pieza y descartar (Fase 5, TMN-028) |
| `buscar.js` | ⌘K Buscar y hacer (Fase 5) |
| `nuevo.js` | ⌘N Proyecto: de cero o traer uno empezado (Fase 5, TMN-040) |
| `taller.js` | Taller: Archivos nativo, Corregir textos y abrir en el editor (Fase 6) |
| `tiempo.js` | Calendario, Etapas y Piezas en el tiempo: el Gantt (Fase 7) |
| `markdown.js` | Lector de markdown |
| `arranque.js` | Arranque (siempre se carga al final) |
| `fuentes/` | Archivo, Archivo Narrow, Space Mono y Caveat (licencia SIL OFL 1.1), para funcionar sin internet |

Los archivos `.js` se cargan en el orden de `index.html` y comparten variables globales.
