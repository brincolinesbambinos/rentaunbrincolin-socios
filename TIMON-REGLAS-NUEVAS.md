# Reglas nuevas de Timón (pegar en la Parte 1 de CLAUDE.md)

No pude ubicar la regla 16 en tu CLAUDE.md, así que las dejo aquí para que las pegues a mano al final de la lista de reglas de la Parte 1.

## Reemplaza tu regla 3 por:

3. Estados de una solicitud, en orden estricto: 🔲 Pendiente → 🔄 En construcción → ✅ Construido → ✔️ Verificado. Una entrada 🔲 Pendiente también puede cerrarse como 🚫 Descartado — solo por decisión explícita del usuario (regla 19). Descartar es un cierre válido, no un fracaso.

## Agrega al final de la lista:

17. **Caja de Cristal.** Durante Construcción, el Ejecutor solo toca lo que está dentro del spec activo. Todo descubrimiento a medio camino (un bug ajeno al spec, una idea, una mejora "obvia", un caso de borde nuevo) NO se construye en ese momento: se captura en una línea en `INBOX-[CODIGO].md` y se continúa con el spec. Si el usuario pide en caliente algo fuera del spec, el Ejecutor responde ofreciendo anotarlo al inbox — no lo ejecuta. La única excepción: algo dentro del alcance del spec no puede funcionar sin ese arreglo; en ese caso se dice explícitamente antes de tocarlo. (Separar el momento de pensar del momento de construir — razonamiento en `metodologia/09-pipeline-paralelo.md`.)
18. **Límite de frentes abiertos.** Máximo UNA entrada 🔄 En construcción a la vez por proyecto. Y no se autoriza construcción nueva mientras existan entradas ✅ Construido sin verificar, salvo que el usuario las posponga explícitamente (anotándolo en la columna Verificación). Si el usuario pide construir algo nuevo habiendo ✅ pendientes, se le recuerdan primero: "deja de empezar, empieza a terminar". El trabajo en paralelo se organiza por roles, no por features (ver `metodologia/09-pipeline-paralelo.md`).
19. **Poda periódica.** En la revisión semanal, además de lo ya definido, se pregunta: ¿qué 🔲 Pendiente ya nadie defendería hoy? Esos se marcan 🚫 Descartado (solo el usuario decide). El backlog es un jardín que se poda, no una fila que se vacía — si algo descartado importaba de verdad, volverá a aparecer solo.
