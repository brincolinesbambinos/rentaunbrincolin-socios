// Timón · Salud, Ordenar y SQL por entorno (TMN-016, TMN-017)
// ---- Salud y Ordenar (TMN-016) ----
let ORD=null;
async function pintarSalud(m){
  m.innerHTML='<div class="seccion">Revisando el proyecto…</div>';
  const [s,o]=await Promise.all([api('/api/salud'+qp()),api('/api/ordenar'+qp())]);ORD=o;
  const ok=v=>v?'bien':'alerta';
  let h='<div class="cards">'+card(s.fuera,'Archivos fuera de lugar',s.fuera?'alerta':'bien')+card(s.sinChecklist.length,'Construidos sin checklist',s.sinChecklist.length?'alerta':'bien')
    +card(s.sqlSinProduccion,'SQL sin aplicar en producción',s.sqlSinProduccion?'azul':'bien')+card(s.sinPuntos===null?'—':s.sinPuntos,s.sinPuntos===null?'Sin registro de puntos':'Solicitudes sin puntos',s.sinPuntos?'alerta':'bien')+'</div>';
  h+='<section class="seccion lila"><h2>Dónde va cada cosa</h2><div class="dos" style="margin:0;gap:10px">'
    +[['specs/','Qué se construye: [COD]-NNN-nombre.md'],['checklists/','Cómo se prueba: [COD]-NNN-checklist.md'],[s.rutaSql+'/','Migraciones: [COD]-NNN-descripcion.sql'],['docs/','Todo lo demás']].map(x=>'<div class="item" style="cursor:default;background:var(--blanco)"><code style="font-size:14px;font-weight:600">'+esc(x[0])+'</code><span class="meta">'+esc(x[1])+'</span></div>').join('')
    +'</div><div class="aviso">Regla 20 de Timón. La IA ya escribe en estas rutas; lo que quedó de antes se acomoda aquí abajo.</div></section>';
  if(o.mover.length){
    h+='<section class="seccion"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h2 style="margin:0">Ordenar</h2><span class="aviso" style="margin:0">'+o.mover.length+' archivo(s) sueltos. Revisa y mueve; nada se borra y queda bitácora en <code>.timon/orden/</code>.</span>'
      +'<button class="mini" style="margin-left:auto" onclick="document.querySelectorAll(\'.ordChk:not(:disabled)\').forEach(c=>c.checked=!c.checked)">Marcar/desmarcar todos</button></div><div class="tablewrap" style="margin-top:12px"><table><tr><th></th><th>Tipo</th><th>Está en</th><th>Va a</th><th>Solicitud</th></tr>';
    o.mover.forEach((x,i)=>{h+='<tr><td><input type="checkbox" class="ordChk" data-i="'+i+'"'+(x.conflicto?' disabled':' checked')+'></td><td>'+(x.tipo==='sql'?'SQL':'Checklist')+'</td><td><code>'+esc(x.desde)+'</code></td><td><code>'+esc(x.a)+'</code>'+(x.conflicto?' <span class="pill w">ya existe uno igual</span>':'')+'</td><td>'+(x.id?'<span class="codigo" style="background:var(--tinte-plano);color:var(--plano)">'+esc(x.id)+'</span>':'<span class="aviso">sin ID</span>')+'</td></tr>'});
    h+='</table></div><div class="fila-form"><button class="btn" onclick="ordenarYa()">Mover seleccionados</button></div><div class="aviso">También actualizo las menciones a esas rutas en el changelog, specs, checklists y docs.</div></section>';
  }else h+='<section class="seccion" style="background:var(--tinte-ok)"><h2 style="color:#0B5E40">Todo en su lugar</h2><div class="aviso" style="color:#0B5E40">No hay checklists ni SQL sueltos en la raíz, specs/ o docs/.</div></section>';
  if(o.otrasSql.length)h+='<section class="seccion alerta"><b>Otras carpetas con SQL:</b> '+o.otrasSql.map(x=>'<code>'+esc(x.carpeta)+'/</code> ('+x.n+')').join(', ')+'. La carpeta principal de este proyecto es <code>'+esc(s.rutaSql)+'/</code>. Estas no las muevo solo: si alguna herramienta las usa (Supabase CLI, scripts), moverlas la rompería. Para cambiar la principal, edita <code>rutaSql</code> en la Ficha .tmn.</section>';
  if(s.sinChecklist.length)h+='<section class="seccion"><h2>Construidos sin checklist</h2><div class="aviso">Pídele a la IA: "dame el checklist de '+esc(s.sinChecklist.slice(0,3).join(', '))+(s.sinChecklist.length>3?'…':'')+'". Se guarda en <code>checklists/</code> y aparece en Probar.</div><div class="pills" style="margin-top:8px">'+s.sinChecklist.map(i=>'<span class="pill">'+esc(i)+'</span>').join('')+'</div></section>';
  const FA=S.faltantes;
  if(FA&&(FA.sinPuntos.length||FA.sinTipo.length||FA.sinDonde.length)){const ids=l=>l.map(id=>'<button class="mini" onclick="abrirPieza(\''+esc(id)+'\')">'+esc(id)+'</button>').join(' ');
    h+='<section class="seccion alerta"><h2>Datos de las piezas</h2><div class="aviso" style="margin:-4px 0 10px;color:var(--grafito)">Cada pieza debe tener Tipo, Dónde (regla 21) y puntos (regla 24). La IA los completa al empezar su próxima sesión; si quieres que sea ya, copia la instrucción y pégasela.</div>'
      +(FA.sinPuntos.length?'<div class="falta-l"><b>Sin puntos ('+FA.sinPuntos.length+')</b> '+ids(FA.sinPuntos)+'</div>':'')+(FA.sinTipo.length?'<div class="falta-l"><b>Sin Tipo ('+FA.sinTipo.length+')</b> '+ids(FA.sinTipo)+'</div>':'')+(FA.sinDonde.length?'<div class="falta-l"><b>Sin Dónde ('+FA.sinDonde.length+')</b> '+ids(FA.sinDonde)+'</div>':'')
      +'<div class="fila-form"><button class="btn" onclick="copiarFaltantesProyecto()">'+ic('copiar',16)+'Copiar la instrucción para la IA</button></div></section>'}
  else if(FA)h+='<section class="seccion" style="background:var(--tinte-ok)"><b style="color:#0B5E40">Datos de las piezas completos:</b> <span class="aviso" style="color:#0B5E40">todas tienen Tipo, Dónde'+(FA.conPuntos?' y puntos':'')+'.</span></section>';
  const I=s.ids||{saltados:[],repetidos:[],sinFila:[]};
  if(I.saltados.length||I.repetidos.length||I.sinFila.length)h+='<section class="seccion alerta"><h2>Números del changelog</h2><div class="aviso" style="margin:-4px 0 10px;color:var(--grafito)">Puede pasar cuando dos sesiones de IA guardan el changelog al mismo tiempo y una borra lo de la otra. Revisa y, si falta una fila, pídele a la IA: "recupera la fila de [ID] con su spec y su checklist".</div>'
    +(I.saltados.length?'<div><b>Números saltados:</b> '+I.saltados.map(x=>'<code>'+esc(x)+'</code>').join(', ')+'</div>':'')
    +(I.repetidos.length?'<div style="margin-top:6px"><b>Números repetidos:</b> '+I.repetidos.map(x=>'<code>'+esc(x)+'</code>').join(', ')+'</div>':'')
    +(I.sinFila.length?'<div style="margin-top:6px"><b>Archivos sin fila en el changelog:</b><div class="lista" style="margin-top:6px">'+I.sinFila.map(x=>'<button class="item" onclick="irArchivo(\''+esc(x.archivo)+'\')"><code>'+esc(x.id)+'</code><span style="flex:1">'+esc(x.archivo)+'</span></button>').join('')+'</div></div>':'')
    +'</section>';
  else h+='<section class="seccion" style="background:var(--tinte-ok)"><b style="color:#0B5E40">Números del changelog en orden:</b> <span class="aviso" style="color:#0B5E40">sin saltos, sin repetidos y cada spec o checklist tiene su fila.</span></section>';
  const HI=s.hilos;
  if(HI&&(HI.sinHilo.length||HI.repetidos.length||HI.sinCarril.length||HI.cerrables.length))h+='<section class="seccion alerta"><h2>Hilos y carriles</h2><div class="aviso" style="margin:-4px 0 10px;color:var(--grafito)">Cada conversación que trabaja una pieza se anota con su hilo (regla 25). Si algo quedó suelto, la IA lo completa en su próxima sesión.</div>'
    +(HI.sinHilo.length?'<div class="falta-l"><b>En el taller sin hilo ('+HI.sinHilo.length+')</b> '+HI.sinHilo.map(id=>'<button class="mini" onclick="abrirPieza(\''+esc(id)+'\')">'+esc(id)+'</button>').join(' ')+'</div>':'')
    +(HI.repetidos.length?'<div class="falta-l"><b>Hilos repetidos:</b> '+HI.repetidos.map(x=>'<code>'+esc(x)+'</code>').join(', ')+' · dos sesiones tomaron el mismo número</div>':'')
    +(HI.sinCarril.length?'<div class="falta-l"><b>En el taller sin carril:</b> '+HI.sinCarril.map(x=>'<code>'+esc(x)+'</code>').join(', ')+'</div>':'')
    +(HI.cerrables.length?'<div class="falta-l"><b>Listos para cerrar:</b> '+HI.cerrables.map(x=>'<code>'+esc(x)+'</code>').join(', ')+' · todas sus piezas están verificadas o descartadas</div>':'')
    +'<div class="fila-form"><button class="btn sec" onclick="irA(\'carriles\')">'+ic('piezas',16)+'Ver carriles</button></div></section>';
  if(s.sinLanzador)h+='<section class="seccion"><b>Sin lanzador.</b> <span class="aviso">Cuando el proyecto tenga cómo correrse, agrégalo en <span class="volver" style="margin:0" onclick="irA(\'proyecto\')">Ficha .tmn</span>.</span></section>';
  m.innerHTML=h;
}
async function ordenarYa(){
  const sel=[...document.querySelectorAll('.ordChk:checked')].map(c=>ORD.mover[+c.dataset.i].desde);
  if(!sel.length)return toast('No marcaste nada');
  if(!confirm('Se moverán '+sel.length+' archivo(s) a su carpeta. ¿Continuar?'))return;
  const r=await api('/api/ordenar'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({desde:sel})});
  toast(r.movidos+' movido(s) · '+r.referencias+' archivo(s) con referencias actualizadas');S=await api('/api/estado'+qp());pintarNav();pintar();
}
// ---- SQL por entorno (TMN-017) ----
let sqlFiltro='pend';
function pintarSql(m){
  if(sqlAbierto)return pintarVerSql(m);
  const L=S.sql,pend=L.filter(s=>!s.produccion);
  const vis=sqlFiltro==='pend'?pend:L;
  let h='<div class="cards">'+card(L.length,'Archivos SQL')+card(pend.length,'Sin aplicar en producción',pend.length?'azul':'bien')+card(L.filter(s=>s.desarrollo&&!s.produccion).length,'Probados en desarrollo, faltan en producción',L.some(s=>s.desarrollo&&!s.produccion)?'alerta':'')+'</div>';
  h+='<section class="seccion"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px"><h2 style="margin:0">SQL del proyecto</h2><span class="aviso" style="margin:0">Carpeta principal: <code>'+esc(S.rutaSql||'sql')+'/</code></span><span style="margin-left:auto;display:flex;gap:6px"><button class="chipf'+(sqlFiltro==='pend'?' on':'')+'" onclick="sqlFiltro=\'pend\';pintar()">Pendientes</button><button class="chipf'+(sqlFiltro==='todos'?' on':'')+'" onclick="sqlFiltro=\'todos\';pintar()">Todos</button></span></div>'
    +'<div class="aviso" style="margin:8px 0 12px">Ábrelo, cópialo, pégalo en tu editor de base de datos y marca dónde lo aplicaste. El registro vive en <code>.timon/sql.json</code> del proyecto.</div>';
  if(!vis.length)h+='<div class="aviso">'+(L.length?'Todo está aplicado en producción.':'No hay archivos .sql en este proyecto.')+'</div>';
  else{
    h+='<div class="tablewrap"><table><tr><th>Archivo</th><th>Solicitud</th><th>Desarrollo</th><th>Producción</th></tr>';
    for(const s of vis){const k=L.indexOf(s);
      const t=e=>'<label class="aviso" style="display:flex;align-items:center;gap:6px;margin:0;white-space:nowrap"><input type="checkbox"'+(s[e]?' checked':'')+' onchange="marcarSql('+k+',\''+e+'\',this.checked)">'+(s[e]?esc(s[e]):'no')+'</label>';
      h+='<tr><td><span class="volver" style="margin:0" onclick="abrirSql('+k+')">'+esc(s.rel)+'</span></td><td>'+(s.id?'<span class="codigo" style="background:var(--tinte-plano);color:var(--plano)">'+esc(s.id)+'</span>':'<span class="aviso">sin ID</span>')+'</td><td>'+t('desarrollo')+'</td><td>'+t('produccion')+'</td></tr>'}
    h+='</table></div>';
  }
  m.innerHTML=h+'</section>';
}
async function abrirSql(k){const rel=S.sql[k].rel;const r=await api('/api/archivo'+qp()+'&f='+encodeURIComponent(rel));sqlAbierto={rel,contenido:r.contenido};pintar()}
async function marcarSql(k,entorno,v){await api('/api/sql/aplicado'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rel:S.sql[k].rel,entorno,aplicado:v})});toast(v?'Marcado como aplicado en '+(entorno==='produccion'?'producción':'desarrollo'):'Desmarcado');recargar()}
