// Timón · Fase 5: Resumen del proyecto, Tabla, consola de lanzadores, diálogo y + Pieza (tablero 07)

// ---------------- Diálogo (ventana encima de todo) ----------------
function abrirDialogo(html,cls){
  cerrarDialogo();
  const d=document.createElement('div');d.className='dialogo-fondo';d.id='dialogo';
  d.innerHTML='<div class="dialogo '+(cls||'')+'" role="dialog" aria-modal="true">'+html+'</div>';
  d.addEventListener('mousedown',e=>{if(e.target===d)cerrarDialogo()});
  document.body.appendChild(d);
  const f=d.querySelector('[autofocus],input,textarea,select,button');if(f)f.focus();
}
function cerrarDialogo(){const d=$('#dialogo');if(d)d.remove()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#dialogo')){e.preventDefault();cerrarDialogo()}});

// ---------------- + Pieza (desde la barra del proyecto o desde ⌘K) ----------------
function dialogoPieza(texto){
  if(!S||!S.changelog)return toast('Este proyecto no tiene changelog todavía');
  abrirDialogo('<h2>'+ic('nuevo',22)+'Nueva pieza en '+esc(S.proyecto.codigo)+'</h2>'
    +'<label class="campo"><span>Qué se pide</span><textarea id="dpDesc" rows="3" autofocus placeholder="Ej. Filtro por fechas en la tabla de rentas">'+esc(texto||'')+'</textarea><small>Una línea. El detalle va en el spec.</small></label>'
    +'<div class="campos"><label class="campo"><span>Tipo</span><select id="dpTipo"><option value="">Elige…</option>'+(S.tiposSolicitud||[]).map(t=>'<option>'+t+'</option>').join('')+'</select></label>'
    +'<label class="campo"><span>Dónde</span><select id="dpDonde">'+opcionesDonde('').replace('<option value="">—</option>','<option value="">Sin lugar todavía</option>')+'</select></label>'
    +'<label class="campo"><span>Quién la pidió</span><input type="text" id="dpQuien" value="Yanga"></label></div>'
    +'<div class="fila-form"><button class="btn" onclick="crearPiezaDialogo()">Registrar como Pendiente</button><button class="btn sec" onclick="cerrarDialogo()">Cancelar</button></div>');
  const t=$('#dpDesc');t.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();crearPiezaDialogo()}});
}
async function crearPiezaDialogo(){
  const d=$('#dpDesc').value.trim();if(!d)return toast('Escribe qué se pide');
  const r=await api('/api/changelog/nueva'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({descripcion:d,tipo:$('#dpTipo').value,donde:$('#dpDonde').value,quien:$('#dpQuien').value,modulo:''})});
  cerrarDialogo();toast('Registrada como '+r.id);S=await api('/api/estado'+qp());abrirPieza(r.id);
}

// ---------------- Consola: los logs de lo que corre, desplegable abajo ----------------
const CONSOLA={abierta:false,l:0,next:0,timer:null,pid:null};
function alternarConsola(v){
  CONSOLA.abierta=v===undefined?!CONSOLA.abierta:!!v;
  try{localStorage.setItem('timon.consola',CONSOLA.abierta?'1':'')}catch(e){}
  pintarConsola();pintarBanner();
}
function pintarConsola(){
  let el=$('#consola');
  if(!CONSOLA.abierta||!actual||!S){if(el)el.remove();document.body.classList.remove('con-consola');clearTimeout(CONSOLA.timer);return}
  const nuevo=CONSOLA.pid!==actual||!el;
  if(CONSOLA.pid!==actual){CONSOLA.pid=actual;CONSOLA.next=0;CONSOLA.l=Math.max(0,S.lanzadores.findIndex(l=>l.corriendo))}
  const L=S.lanzadores,l=L[CONSOLA.l]||L[0];
  if(!el){el=document.createElement('section');el.id='consola';el.className='consola';el.setAttribute('aria-label','Consola');el.innerHTML='<div class="consola-cab"></div><pre id="consolaLog"></pre>';document.body.appendChild(el)}
  document.body.classList.add('con-consola');
  el.querySelector('.consola-cab').innerHTML='<span class="tit">'+ic('codigo',16)+'Consola · '+esc(S.proyecto.codigo)+'</span>'
    +L.map((x,i)=>'<button class="'+(i===CONSOLA.l?'on':'')+'" onclick="cambiarLanzConsola('+i+')"><span class="dot'+(x.corriendo?' on':'')+'"></span>'+esc(x.nombre)+'</button>').join('')
    +'<span class="der">'+(l?(l.corriendo?'<button class="det" onclick="runStop('+CONSOLA.l+')">'+ic('stop',14)+'Detener</button>':(l.sugerido?'':'<button class="arr" onclick="runStart('+CONSOLA.l+')">'+ic('play',14)+'Arrancar</button>')):'')
    +(l&&l.url&&l.corriendo?'<button onclick="abrirUrl(actual,\''+esc(l.url)+'\')">'+ic('abrirFuera',14)+esc(sinHost(l.url)||l.url)+'</button>':'')
    +'<button onclick="alternarConsola(false)" aria-label="Cerrar consola">'+ic('cerrar',16)+'</button></span>';
  const pre=$('#consolaLog');
  if(nuevo){CONSOLA.next=0;pre.textContent=l&&l.corriendo?'':'Nada corriendo en '+(l?l.nombre:'este proyecto')+'. Dale Arrancar.';leerConsola()}
  else if(!CONSOLA.next&&!(l&&l.corriendo))pre.textContent='Nada corriendo en '+(l?l.nombre:'este proyecto')+'. Dale Arrancar.';
}
function cambiarLanzConsola(i){CONSOLA.l=i;CONSOLA.pid=null;pintarConsola()}
async function leerConsola(){
  clearTimeout(CONSOLA.timer);
  if(!CONSOLA.abierta||!actual)return;
  try{
    const r=await api('/api/run/logs'+qp()+'&l='+CONSOLA.l+'&since='+CONSOLA.next);
    const el=$('#consolaLog');
    if(el&&r.lines.length){const abajo=el.scrollTop+el.clientHeight>=el.scrollHeight-30;if(!CONSOLA.next)el.textContent='';el.textContent+=r.lines.map(x=>x.t).join('\n')+'\n';if(abajo||!CONSOLA.next)el.scrollTop=el.scrollHeight}
    CONSOLA.next=r.next;
  }catch(e){}
  CONSOLA.timer=setTimeout(leerConsola,1500);
}
try{CONSOLA.abierta=localStorage.getItem('timon.consola')==='1'}catch(e){}

// ---------------- Resumen: en qué etapa va y qué sigue ----------------
function loQueSigue(){
  const a=S.alertas,e=S.etapa||'',cod=S.proyecto.codigo,P=typeof piezas==='function'?piezas():[];
  const CL=S.changelog,iV=CL?CL.headers.findIndex(h=>/verificaci/i.test(h)):-1;
  const fallas=iV<0?[]:CL.rows.filter(r=>/✅/.test(r[CL.iEstado]||'')&&/Fall[oó] el \d{4}/.test(r[iV]||'')).map(r=>({id:r[0]}));
  const iE=ETAPAS_UI.findIndex(x=>x[0]===e);
  if(a.enConstruccion>1)return {t:a.enConstruccion+' piezas en el taller a la vez',d:'Regla 18: una a la vez. Elige cuál sigue y congela las demás.',b:'Ver las del taller',f:"pzEstado='En el taller';irA('piezas')"};
  if(fallas.length)return {t:fallas.length===1?fallas[0].id+' falló al probar':fallas.length+' piezas fallaron al probar',d:'Pídele a la IA que las arregle; después vuelves a probar.',b:'Abrir '+fallas[0].id,f:"abrirPieza('"+fallas[0].id+"')"};
  if(a.construidosSinVerificar)return {t:'Probar '+a.construidosSinVerificar+(a.construidosSinVerificar===1?' pieza':' piezas'),d:'Lo construido sin probar no se cobra ni se cierra.',b:'Empezar a probar',f:"irA('verificar')"};
  if(S.porDecidir&&S.porDecidir.length)return {t:'Decidir '+S.porDecidir.length+(S.porDecidir.length===1?' cobro':' cobros'),d:'Cobrar, regalar o garantía. Ya traen sus puntos.',b:'Decidir',f:"irA('cobros')"};
  if(S.cotizacion&&S.cotizacion.total)return {t:'Cotización en curso: '+fmtN(S.cotizacion.total)+' pts',d:'Cuando el cliente acepte, sus puntos pasan a Contratado.',b:'Ver la cotización',f:"irA('cobros')"};
  if(e==='aceptado'&&!(S.cobros&&S.cobros.file))return {t:'Registrar el contrato',d:'Total contratado y plan de pagos, para que Cobro te avise.',b:'Crear cobranza',f:"irA('cobros')"};
  if(a.inboxSinProcesar>=3)return {t:a.inboxSinProcesar+' ideas sin procesar',d:'Promuévelas a pieza o descártalas.',b:'Ver ideas',f:"irA('inbox')"};
  const pend=P.find(x=>/🔲/.test(x.estado));
  if(!a.enConstruccion&&pend)return {t:'Siguiente pieza: '+pend.id,d:tituloPieza(pend.desc),b:'Abrir '+pend.id,f:"abrirPieza('"+pend.id+"')",ia:'Construye '+pend.id+' de '+cod};
  if(a.enConstruccion){const t=P.find(x=>/🔄/.test(x.estado));return {t:'En el taller: '+(t?t.id:''),d:t?tituloPieza(t.desc):'',b:'Abrir la pieza',f:t?"abrirPieza('"+t.id+"')":"irA('piezas')"}}
  if(iE>=0&&iE<ETAPAS_UI.length-1)return {t:'Pasar a '+ETAPAS_UI[iE+1][1],d:GUIA_ETAPA[e]?GUIA_ETAPA[e].replace('CODIGO',cod):'',b:'Pasar a '+ETAPAS_UI[iE+1][1],f:"cambiarEtapa('"+ETAPAS_UI[iE+1][0]+"')"};
  return {t:'Todo al día',d:'Nada pendiente en este proyecto.',b:'Anotar una idea',f:"irA('inbox')"};
}
function etapaMini(e){const i=ETAPAS_UI.findIndex(x=>x[0]===e);return '<span class="etapa-mini" title="'+esc(i>=0?ETAPAS_UI[i][1]:'Sin etapa')+'">'+ETAPAS_UI.map((x,j)=>'<i class="'+(j<i?'h':j===i?'on':'')+'"></i>').join('')+'</span>'}
function pintarTablero(m){
  const a=S.alertas,s=loQueSigue();
  let h='<section class="sigue"><div class="k">Lo que sigue</div><div class="fila"><div class="txt"><h2>'+esc(s.t)+'</h2>'+(s.d?'<p>'+esc(s.d)+'</p>':'')+'</div><div class="acc"><button class="btn-claro" onclick="'+s.f+'">'+esc(s.b)+ic('siguiente',16)+'</button>'
    +(s.ia?'<button class="btn-borde" onclick="copiarTexto(\''+esc(s.ia)+'\')">'+ic('copiar',16)+'Copiar para la IA</button>':'')+'</div></div></section>'+stepperEtapa();
  const nDec=S.porDecidir?S.porDecidir.length:0;
  const c=(n,l,cls,f)=>'<button class="card '+cls+'" onclick="'+f+'"><div class="num">'+n+'</div><div class="lbl">'+l+'</div></button>';
  h+='<div class="cards cards-btn">'+c(a.pendientes,'Pendientes','',"pzEstado='Pendiente';irA('piezas')")+c(a.enConstruccion,'En el taller',a.enConstruccion>1?'alerta':'azul',"pzEstado='En el taller';irA('piezas')")
    +c(a.construidosSinVerificar,'Por probar',a.construidosSinVerificar?'alerta':'bien',"irA('verificar')")+c(nDec,'Por decidir',nDec?'alerta':'',"irA('cobros')")+'</div>';
  // avisos (salud y estructura)
  const av=[];
  if(S.salud&&S.salud.fuera)av.push('<b>'+S.salud.fuera+' archivo(s) fuera de lugar.</b> <span class="volver" onclick="irA(\'salud\')">Ordenar</span>');
  if(S.salud&&S.salud.sqlSinProduccion)av.push('<b>'+S.salud.sqlSinProduccion+' SQL sin aplicar en producción.</b> <span class="volver" onclick="irA(\'sql\')">Ver SQL</span>');
  if(S.changelog&&(S.changelog.iTipo<0||S.changelog.iDonde<0))av.push('<b>El changelog no tiene las columnas Tipo y Dónde.</b> <span class="volver" onclick="agregarColumnas()">Agregarlas</span>');
  {const I=S.salud&&S.salud.ids;if(I&&(I.saltados.length||I.sinFila.length||I.repetidos.length))av.push('<b>Números del changelog con huecos'+(I.sinFila.length?' o archivos sin fila':'')+':</b> '+[...I.sinFila.map(x=>x.id),...I.saltados].slice(0,4).join(', ')+'. <span class="volver" onclick="irA(\'salud\')">Revisar</span>')}
  if(S.salud&&S.salud.sinLanzador)av.push('<b>Sin lanzador.</b> No sé cómo arrancar este proyecto. <span class="volver" onclick="irA(\'proyecto\')">Configurar</span>');
  if(av.length)h+='<section class="seccion alerta avisos">'+av.map(x=>'<div>'+ic('alerta',16)+' '+x+'</div>').join('')+'</section>';
  h+='<div class="dos">';
  // por módulo
  const P=piezas(),pts={};(S.puntos?S.puntos.filas:[]).forEach(f=>pts[f.id]=f);
  const mods=arbolMapa().map(md=>{const g=P.filter(x=>dentroDe(x.donde,{cod:md.cod}));const suma=t=>g.reduce((s,x)=>s+(pts[x.id]&&pts[x.id].tipo===t?pts[x.id].puntos:0),0);return {md,n:g.length,ab:g.filter(abierta).length,extra:suma('Extra'),cort:suma('Cortesía'),contr:suma('Contratado')}}).filter(x=>x.n);
  h+='<section class="seccion"><h2>Por módulo</h2>'+(mods.length?'<div class="mods">'+mods.map(x=>{const tot=x.extra+x.cort+x.contr||1;return '<button class="mod" onclick="mapaSel={cod:\''+esc(x.md.cod)+'\'};irA(\'mapa\')"><span class="nm"><code>'+esc(x.md.cod)+'</code> '+esc(x.md.modulo)+'</span><span class="cu">'+x.ab+' abiertas · '+x.n+' en total</span>'
      +'<span class="barra-mod"><i class="c" style="width:'+(x.contr/tot*100)+'%"></i><i class="e" style="width:'+(x.extra/tot*100)+'%"></i><i class="g" style="width:'+(x.cort/tot*100)+'%"></i></span></button>'}).join('')+'</div><div class="leyenda"><span><i class="c"></i>Contratado</span><span><i class="e"></i>Extra</span><span><i class="g"></i>Regalado</span></div>'
    :'<div class="aviso" style="margin:0">Todavía no hay piezas con lugar. Arma el mapa en Piezas › Por lugar (o pídele a la IA "mapea el proyecto").</div>')+'</section>';
  // actividad reciente
  const act=(S.actividad||[]).slice(0,7),vistos=new Set(act.map(e=>e.id));
  const extra=act.length>=5?[]:P.filter(x=>!vistos.has(x.id)).sort((x,y)=>String(y.fecha||'').localeCompare(String(x.fecha||''))).slice(0,6-act.length);
  const lista=act.map(e=>'<button class="act" onclick="abrirPieza(\''+esc(e.id)+'\')"><span class="f">'+fechaCorta(String(e.f).slice(0,10))+'</span><code>'+esc(e.id)+'</code><span class="t">'+esc(tituloPieza((P.find(x=>x.id===e.id)||{}).desc||''))+'</span><span class="est '+claseEst(e.a||'')+'">'+ESTADO_CORTO(e.a||'')+'</span></button>').join('')
    +extra.map(x=>'<button class="act" onclick="abrirPieza(\''+esc(x.id)+'\')"><span class="f">'+fechaCorta(x.fecha)+'</span><code>'+esc(x.id)+'</code><span class="t">'+esc(tituloPieza(x.desc))+'</span><span class="est '+claseEst(x.estado)+'">'+ESTADO_CORTO(x.estado)+'</span></button>').join('');
  h+='<section class="seccion"><h2>Actividad reciente</h2>'+(lista?'<div class="acts">'+lista+'</div>':'<div class="aviso" style="margin:0">Sin piezas todavía.</div>')+'</section></div>';
  h+='<section class="seccion lila"><label for="qc" style="display:block;font-size:17px;font-weight:700">Anotar una idea</label><div class="aviso" style="color:var(--gris);margin:4px 0 10px">¿Algo a media construcción? Una línea aquí y de regreso a tu spec.</div><div class="fila-form" style="margin:0"><textarea id="qc" rows="2" placeholder="Ej. el mapa no muestra el pin en celular" style="flex:1 1 420px;min-width:0"></textarea><button class="btn" style="align-self:flex-start;min-height:48px" onclick="capturar()">Anotar</button></div></section>';
  m.innerHTML=h;
}
async function copiarTexto(t){try{await navigator.clipboard.writeText(t);toast('Copiado: '+t)}catch(e){toast('No pude copiar: '+t)}}

// ---------------- Tabla: el changelog de siempre ----------------
function pintarTabla(m){
  if(!S.changelog)return m.innerHTML='<section class="seccion">Este proyecto no tiene CHANGELOG-*.md todavía.</section>';
  const CL=S.changelog;
  let h='';
  if(CL.iTipo<0||CL.iDonde<0)h+='<div class="seccion alerta"><b>Este changelog todavía no tiene las columnas Tipo y Dónde.</b> Con ellas cada pieza dice si es nueva función, mejora o arreglo, y en qué lugar del proyecto vive. <span class="volver" style="margin:0" onclick="agregarColumnas()">Agregarlas</span></div>';
  h+='<section class="seccion"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><h2 style="margin:0">Changelog</h2><span class="aviso" style="margin:0">'+esc(CL.file)+' · '+CL.rows.length+' solicitudes</span></div><div class="tablewrap"><table><tr>'+CL.headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'<th></th></tr>';
  for(const r0 of CL.rows){const r=CL.headers.map((_,i)=>r0[i]||''),rara=r0.length>CL.headers.length;
    h+='<tr>'+r.map((c,i)=>i===0?'<td><button class="lnk" onclick="abrirPieza(\''+esc(c)+'\')">'+esc(c)+'</button></td>':i===CL.iEstado?'<td><span class="est '+claseEst(c)+'">'+esc(c)+'</span></td>':i===CL.iTipo&&!rara?'<td>'+celdaTipo(r[0],c)+'</td>':i===CL.iDonde&&!rara?'<td>'+celdaDonde(r[0],c)+'</td>':'<td>'+esc(c)+'</td>').join('');
    h+='<td><select onchange="cambiarEstado(\''+esc(r[0])+'\',this)"><option value="">cambiar…</option>'+ESTADOS.map(e=>'<option>'+e+'</option>').join('')+'</select></td></tr>';
  }
  h+='</table></div><div class="fila-form"><button class="btn" onclick="dialogoPieza()">'+ic('nuevo',16)+'Registrar pieza</button></div><div class="aviso">Verificado solo lo marcas tú tras correr el checklist. Descartado es un cierre válido.</div></section>';
  m.innerHTML=h;
}
