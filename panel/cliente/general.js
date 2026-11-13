// Timón · Vista general (todos los proyectos), Ajustes de Timón y explorador de carpetas
// ---- Vista general (todos los proyectos) ----
function pintarGeneral(){pintarNav();pintarInicio()}
function pintarTarjetas(){
  const t=filtroTxt.toLowerCase();
  const lista=PROY.filter(p=>(!filtroEst||(p.estado||'activo')===filtroEst)&&(!t||(p.nombre+' '+p.codigo+' '+p.cliente+' '+p.marca).toLowerCase().includes(t)));
  const grupos={};for(const p of lista)(grupos[p.cliente||'Sin cliente']=grupos[p.cliente||'Sin cliente']||[]).push(p);
  const orden=Object.keys(grupos).sort((a,b)=>(a==='Sin cliente')-(b==='Sin cliente')||(a==='Personal')-(b==='Personal')||a.localeCompare(b));
  let h='';
  for(const g of orden){
    const c=colorCliente(g),ps=grupos[g],nv=ps.filter(p=>p.corriendo).length;
    h+='<section class="cliente" style="background:'+c[1]+'"><div class="wrap"><div class="cab"><span class="sw" style="background:'+c[0]+'"></span><h2>'+esc(g)+'</h2><span class="res">'+ps.length+' proyecto'+(ps.length>1?'s':'')+(nv?' · '+nv+' corriendo':'')+'</span></div><div class="grid-proy">';
    for(const p of ps){
      const a=p.alertas,l0=p.lanzadores[0],vivoI=p.lanzadores.findIndex(l=>l.corriendo),url=(p.lanzadores.find(l=>l.url)||{}).url;
      h+='<article class="pcard'+(vivoI>=0?' vivo':'')+'" onclick="entrar(\''+p.id+'\')">'+(p.color?'<span class="franja" style="background:'+esc(p.color)+'"></span>':'')
        +'<div class="top"><span class="codigo" style="background:'+c[2]+';color:'+c[3]+'">'+esc(p.codigo)+'</span>'+(p.estado?'<span class="est-'+esc(p.estado)+'" style="font-size:12.5px;font-weight:600">'+esc(p.estado)+'</span>':'')
        +(vivoI>=0?'<span class="vivo-tag"><span class="dot on"></span>Corriendo</span>':'')+(p.etapa?'<span class="etapa-tag">'+etapaMini(p.etapa)+'<span>'+esc((ETAPAS_UI.find(x=>x[0]===p.etapa)||[0,''])[1])+'</span></span>':'')+'</div>'
        +'<div><h3>'+esc(p.nombre)+'</h3>'+(p.descripcion?'<div class="desc">'+esc(p.descripcion)+'</div>':'')+'</div>'
        +'<div class="pills">'
        +(a.construidosSinVerificar?'<span class="pill w"><b>'+a.construidosSinVerificar+'</b> sin verificar</span>':'')
        +(a.enConstruccion?'<span class="pill a"><b>'+a.enConstruccion+'</b> en construcción</span>':'')
        +(a.pendientes?'<span class="pill"><b>'+a.pendientes+'</b> pendientes</span>':'')
        +(a.porDecidir?'<span class="pill w"><b>'+a.porDecidir+'</b> por decidir</span>':'')
        +(a.inboxSinProcesar?'<span class="pill"><b>'+a.inboxSinProcesar+'</b> en ideas</span>':'')
        +(a.puntos&&a.puntos.porCobrarMxn>0?'<span class="pill g"><b>$'+a.puntos.porCobrarMxn.toLocaleString('es-MX')+'</b> por cobrar</span>':'')
        +(a.cobros&&a.cobros.vencido?'<span class="pill w"><b>$'+a.cobros.vencido.toLocaleString('es-MX')+'</b> vencido</span>':'')+(p.desactualizado?'<span class="pill">Timón por actualizar</span>':'')+(p.tieneTmn?'':'<span class="pill">sin .tmn</span>')+(p.tmnError?'<span class="pill w">.tmn con error</span>':'')
        +'</div><div class="acciones">'
        +(vivoI>=0?'<button class="acc-main det" onclick="event.stopPropagation();rapido(\''+p.id+'\','+vivoI+',1)">'+ICO.stop+' Detener</button>'
          :(l0&&!l0.sugerido?'<button class="acc-main" onclick="event.stopPropagation();rapido(\''+p.id+'\',0,0)">'+ICO.play+' '+esc(l0.nombre)+'</button>':'<span class="acc-sin">Sin lanzador</span>'))
        +(url?'<button class="acc-ico" aria-label="Abrir en el navegador" title="Abrir en el navegador" onclick="event.stopPropagation();abrirUrl(\''+p.id+'\',\''+esc(url)+'\')">'+ICO.ext+'</button>':'')
        +'<button class="acc-ico" aria-label="Archivos" title="Archivos" onclick="event.stopPropagation();entrar(\''+p.id+'\',\'archivos\')">'+ICO.doc+'</button>'
        +'<button class="acc-ico" aria-label="Abrir en Finder" title="Abrir en Finder" onclick="event.stopPropagation();abrirEn(\''+p.id+'\',\'finder\',\'.\')">'+ICO.dir+'</button>'
        +'</div></article>';
    }
    h+='</div></div></section>';
  }
  if(!lista.length)h='<div class="filtros"><div class="seccion" style="width:100%">Nada coincide con la búsqueda.</div></div>';
  $('#tarjetas').innerHTML=h;
}
async function rapido(id,n,detener){await api('/api/run/'+(detener?'stop':'start')+'?p='+encodeURIComponent(id)+'&l='+n,{method:'POST'});toast(detener?'Deteniendo…':'Arrancando…');setTimeout(refrescarGeneral,900)}
async function abrirEn(id,tipo,rel){await api('/api/abrir?p='+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo,rel})})}
async function abrirUrl(id,url){await api('/api/abrir?p='+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:'url',url})})}
const card=(n,l,cls='')=>'<div class="card '+cls+'"><div class="num">'+n+'</div><div class="lbl">'+l+'</div></div>';
// ---- Pestaña Timón: gestionar proyectos y actualizar la metodología ----
let T=null, explorador=null, actLogNext=0, actTimer=null, modoElegir=null;
async function pintarTimon(){
  T=await api('/api/timon');
  const m=$('#main');
  let h='';
  // apariencia (TMN-036)
  const P={};P.editor='<div class="seccion"><h2>Editor de código</h2><div class="aviso" style="margin:-4px 0 12px">Los botones "Abrir en el editor" de Archivos, Corregir textos y las piezas abren el archivo en la línea exacta.</div><div class="seg">'+Object.entries(T.editores||{code:'VS Code',cursor:'Cursor'}).map(([k,n])=>'<button class="'+((T.editor||'code')===k?'on':'')+'" onclick="guardarEditor(\''+k+'\')">'+n+'</button>').join('')+'</div></div>';
  P.apariencia='<div class="seccion"><h2>Apariencia</h2><label class="interruptor"><input type="checkbox" '+(TRAZO_MANO?'checked':'')+' onchange="cambiarTrazo(this.checked)">Íconos con trazo a mano</label>'
    +'<div class="muestra-ic">'+['hoy','probar','cobro','piezas','sql','calendario','alerta','verificada'].map(n=>ic(n,24)).join('')+'</div>'
    +'<div class="aviso">Apagado, Timón usa los mismos íconos Tabler con trazo limpio.</div></div>';
  // cobro base (TMN-042): cada proyecto la usa salvo que tenga precio especial en su Configuración
  const CB=T.cobroBase||{valorPunto:400,bolsaPct:12},V=T.valores||[],propios=V.filter(v=>v.propio);
  P.cobro='<div class="seccion"><h2>Cobro base</h2><div class="aviso" style="margin:-4px 0 12px">Lo usan todos los proyectos. Un proyecto con precio especial lo pone en su Configuración › Montos.</div><div class="campos">'
    +'<label class="campo"><span>Valor del punto</span><input type="number" min="1" step="any" id="cbValor" value="'+CB.valorPunto+'"><small>pesos por punto</small></label>'
    +'<label class="campo"><span>Bolsa de cortesía</span><input type="number" min="0" step="any" id="cbBolsa" value="'+CB.bolsaPct+'"><small>% de lo contratado, para proyectos nuevos</small></label></div>'
    +'<div class="aviso" style="margin:14px 0 8px"><b>Tu costo real</b> (para Métricas › Dinero: cuánto ganas de verdad). Las horas salen del tiempo que cada proyecto pasa encendido desde Timón.</div><div class="campos">'
    +'<label class="campo"><span>Tu costo por hora</span><input type="number" min="0" step="any" id="cbHora" value="'+(CB.costoHora||'')+'" placeholder="0"><small>pesos por hora encendido</small></label>'
    +'<label class="campo"><span>Gasto mensual en IA</span><input type="number" min="0" step="any" id="cbIA" value="'+(CB.iaMensual||'')+'" placeholder="0"><small>pesos al mes; se reparte entre proyectos por sus horas</small></label></div>';
  if(propios.length)P.cobro+='<div class="aviso" style="margin-top:14px"><b>Con precio especial:</b> marca los que deben usar la base.</div><div class="lista" style="margin-top:6px">'+propios.map(v=>'<label class="item" style="cursor:pointer"><input type="checkbox" class="cbUsar" value="'+esc(v.id)+'" style="width:18px;height:18px"><span style="flex:1"><b>'+esc(v.nombre)+'</b> <span class="aviso">'+esc(v.cliente||'')+'</span></span><span class="meta">$'+fmtN(v.valor)+' por punto</span></label>').join('')+'</div>';
  P.cobro+='<div class="aviso">'+(V.length-propios.length)+' proyecto(s) usan la base.</div><div class="fila-form"><button class="btn" onclick="guardarCobroBase()">Guardar cobro base</button></div></div>';
  // dónde vive Timón
  P.carpeta='<div class="seccion"><h2>Carpeta de Timón</h2>'
    +(T.valida
      ? '<div class="item" style="cursor:default"><span>'+ic('hoy',16)+' <code>'+esc(T.rutaTimon)+'</code></span><span class="meta">'+(T.tieneActualizador?'<span class="est est-v">lista</span>':'<span class="est est-b">sin actualizador</span>')+'</span></div>'
      : '<div class="aviso" style="color:var(--warn)">No encontré la carpeta de Timón (la que tiene <code>plantilla-proyecto-nuevo</code>). Indícala para poder actualizar proyectos e incorporar carpetas nuevas.</div>')
    +'<div class="fila-form"><input type="text" id="rutaTimon" placeholder="/Users/tu/Downloads/sistema-timon" value="'+esc(T.rutaTimon||'')+'"><button class="btn sec" onclick="elegir(\'timon\')">'+ic('finder',16)+'Buscar…</button><button class="btn sec" onclick="guardarRutaTimon()">Guardar</button></div></div>';

  // versión
  P.version='<div class="seccion"><h2>Versión de Timón</h2>'+(T.version?'<div style="font-size:22px;font-weight:700">'+esc(T.version)+'</div>':'<div class="aviso">La plantilla no tiene archivo VERSION.</div>')+((T.atrasados||[]).length?'<div class="aviso" style="margin-top:8px"><b>'+T.atrasados.length+' proyecto(s) con versión anterior:</b> '+T.atrasados.map(a=>esc(a.nombre)+' ('+esc(a.version)+')').join(', ')+'</div><div class="fila-form"><button class="btn" onclick="actualizarAtrasados()">Actualizar los atrasados</button></div>':(T.version?'<div class="aviso">Todos tus proyectos están al día.</div>':''))+'</div>';
  // actualizar
  P.actualizar='<div class="seccion"><h2>Actualizar Timón en los proyectos</h2>'
    +'<div class="aviso" style="margin-bottom:12px">Lleva las reglas, skills y metodología de la plantilla a cada proyecto. No toca changelog, inbox, specs, Marco, Arquitectura ni la Parte 2 de tu CLAUDE.md, y guarda respaldos en <code>.timon/respaldos/</code> de cada proyecto.</div>'
    +'<div class="lista">';
  for(const p of T.proyectos)
    P.actualizar+='<div class="item" style="cursor:default"><input type="checkbox" class="chkProy" value="'+esc(p.id)+'" checked><span>'+esc(p.nombre)+'</span><span class="meta"><code style="font-size:11.5px;color:var(--tx2)">'+esc(p.ruta)+'</code><button class="btn sec" style="padding:4px 10px;font-size:12px" onclick="quitarProyecto(\''+esc(p.ruta)+'\')">Quitar</button></span></div>';
  if(!T.proyectos.length)P.actualizar+='<div class="aviso">Sin proyectos todavía — agrégalos abajo.</div>';
  P.actualizar+='</div><div class="fila-form">'
    +'<button class="btn sec" onclick="correrActualizacion(true)" '+(T.tieneActualizador?'':'disabled')+'>Simular (--dry)</button>'
    +'<button class="btn" onclick="correrActualizacion(false)" '+(T.tieneActualizador?'':'disabled')+'>Actualizar seleccionados</button>'
    +'<button class="btn sec" onclick="marcarTodos()">Marcar/desmarcar todos</button></div>'
    +'<div id="actLogs" style="display:none"><div style="height:12px"></div><div id="logsAct" class="md"><pre><code></code></pre></div></div></div>';

  // carpetas raíz (modo central) y .tmn
  P.raices='';if(T.central){
    P.raices='<div class="seccion"><h2>Carpetas donde busco proyectos</h2><div class="lista">'
      +T.raices.map((r,i)=>'<div class="item" style="cursor:default"><span>'+(r.existe?ic('finder',16):ic('alerta',16))+' <code>'+esc(r.ruta)+'</code></span><span class="meta">'+(r.existe?'':'no existe')+'<button class="btn sec" style="padding:4px 10px;font-size:12px" onclick="quitarRaiz('+i+')">Quitar</button></span></div>').join('')
      +'</div><div class="fila-form"><input type="text" id="nuevaRaiz" placeholder="~/Documents/Proyectos" style="flex:3"><button class="btn sec" onclick="elegir(\'raiz\')">'+ic('finder',16)+'Buscar…</button><button class="btn" onclick="agregarRaiz()">Agregar carpeta</button></div>'
      +'<div class="aviso">Busco hasta 5 niveles adentro. Un proyecto aparece si tiene un archivo <code>.tmn</code>, un <code>CHANGELOG-*.md</code> o un <code>00-MARCO.md</code>.</div></div>';
  }
  P.fichas='<div class="seccion"><h2>Fichas .tmn</h2>'+(T.sinTmn?'<b>'+T.sinTmn+' proyecto(s) sin ficha .tmn.</b> Puedo crearlas con lo que detecto en cada carpeta (lanzadores, nombre del Marco, cliente por la carpeta). Después las ajustas en Ficha.<div class="fila-form"><button class="btn" onclick="generarTmn()">'+ic('sugerir',16)+'Crear las '+T.sinTmn+' fichas faltantes</button></div>':'Todos los proyectos tienen su ficha .tmn. ✔️')+'</div>';

  // agregar / incorporar
  P.agregar='<div class="seccion"><h2>Agregar un proyecto'+(T.central?'':' que ya usa Timón')+'</h2>'
    +'<div class="fila-form"><input type="text" id="rutaAgregar" placeholder="/Users/tu/otra-carpeta/mi-proyecto" style="flex:3"><button class="btn sec" onclick="elegir(\'agregar\')">'+ic('finder',16)+'Buscar…</button><button class="btn" onclick="agregarProy()">Agregar</button></div>'
    +'<div class="aviso">Para proyectos que viven fuera de <code>'+esc(T.base)+'</code>. Los de adentro se detectan solos.</div></div>';

  P.traer='<div class="seccion"><h2>Traer un proyecto empezado</h2><div class="aviso" style="margin-bottom:10px">Para una carpeta que no tenía Timón: reviso su estructura, agrego el kit sin pisar nada y cada corrección queda como pieza.</div><div class="fila-form"><button class="btn" onclick="nwModo=\'adoptar\';irNuevo()">'+ic('carpeta',16)+'Traer uno empezado <kbd>⌘N</kbd></button></div></div>';
  const PB=T.planBase||{},DU=T.duraciones||{},EPL=[['brief','Brief'],['descubrimiento','Descubrimiento'],['cotizacion','Cotización'],['aceptado','Aceptado'],['construccion','Construcción'],['entregado','Entregado']];
  P.plan='<div class="seccion"><h2>Plantilla de fechas</h2><div class="aviso" style="margin:-4px 0 12px">Días que dura cada etapa según el tamaño del proyecto. Timón la usa para llenar las fechas planeadas de los proyectos nuevos, al traer uno empezado y con "Sugerir fechas". Cuando tengas 3 proyectos con una etapa cerrada, usa tu promedio real en lugar de la plantilla.</div>'
    +'<div class="tablewrap"><table><tr><th>Etapa</th><th>Chico</th><th>Mediano</th><th>Grande</th><th>Tu promedio</th></tr>'
    +EPL.map(([k,n])=>'<tr><td><b>'+n+'</b></td>'+['chico','mediano','grande'].map(t=>'<td><input type="number" min="1" class="pbIn" data-t="'+t+'" data-e="'+k+'" value="'+((PB[t]||{})[k]||'')+'" style="width:80px"> <span class="aviso">días</span></td>').join('')+'<td>'+(DU[k]?DU[k].dias+' días ('+DU[k].casos+')':'<span class="aviso">sin datos</span>')+'</td></tr>').join('')
    +'</table></div><div class="aviso">'+(T.puntosSemana?'Construcción con cotización: puntos ÷ '+String(T.puntosSemana).replace('.',',')+' puntos verificados por semana, más una semana de margen.':'Construcción con cotización: puntos ÷ tus puntos verificados por semana (todavía sin datos: usa la plantilla).')+'</div><div class="fila-form"><button class="btn" onclick="guardarPlanBase()">Guardar plantilla</button></div></div>';
  const G=[['aj-timon','Timón',P.version+P.actualizar+P.carpeta],['aj-cobro','Cobro y fechas',P.cobro+P.plan],['aj-proy','Proyectos',P.raices+P.agregar+P.traer+P.fichas+'<div class="seccion" id="ajPiezas"><h2>Piezas abiertas</h2><div class="aviso">Revisando todos los proyectos…</div></div><div class="seccion" id="ajSpecs"><h2>Specs abiertos</h2><div class="aviso">Revisando todos los proyectos…</div></div>'],['aj-apar','Apariencia y editor',P.editor+P.apariencia]];
  h='<nav class="aj-indice" aria-label="Secciones de Ajustes">'+G.map(g=>'<button onclick="document.getElementById(\''+g[0]+'\').scrollIntoView({behavior:\'smooth\',block:\'start\'})">'+g[1]+'</button>').join('')+'</nav>'
    +G.map(g=>'<div class="aj-grupo" id="'+g[0]+'"><div class="aj-tit">'+g[1]+'</div>'+g[2]+'</div>').join('');
  m.innerHTML=h;
  cargarSpecsAbiertos();cargarPiezasAbiertas();
  if(explorador)pintarExplorador();
  if(T.actualizando){$('#actLogs').style.display='block';pollAct()}
}
function marcarTodos(){const ch=[...document.querySelectorAll('.chkProy')];const v=!ch.every(c=>c.checked);ch.forEach(c=>c.checked=v)}
async function guardarRaices(l){await api('/api/raices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({raices:l})});await refrescarListas();pintarTimon()}
function agregarRaiz(){const v=$('#nuevaRaiz').value.trim();if(!v)return toast('Escribe o elige una carpeta');guardarRaices(T.raices.map(r=>r.ruta).concat(v));toast('Carpeta agregada')}
function quitarRaiz(i){const l=T.raices.map(r=>r.ruta);l.splice(i,1);guardarRaices(l);toast('Carpeta quitada (no se borra nada)')}
async function generarTmn(){const r=await api('/api/tmn/generar',{method:'POST'});toast(r.creados+' ficha(s) .tmn creadas');await refrescarListas();pintarTimon()}
async function guardarRutaTimon(){await api('/api/timon/ruta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ruta:$('#rutaTimon').value.trim()})});toast('Carpeta de Timón guardada');pintarTimon()}
async function agregarProy(){const r=$('#rutaAgregar').value.trim();if(!r)return toast('Escribe o elige una ruta');await api('/api/proyectos/agregar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ruta:r})});toast('Proyecto agregado');await refrescarListas();pintarTimon()}
async function quitarProyecto(r){if(!confirm('¿Quitar este proyecto del panel?\n\nSolo se quita de la lista, no se borra ningún archivo.'))return;await api('/api/proyectos/quitar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ruta:r})});toast('Quitado del panel');await refrescarListas();pintarTimon()}
async function incorporarProy(){
  const r=$('#rutaIncorporar').value.trim(),cod=$('#codIncorporar').value.trim();
  if(!r||!cod)return toast('Falta la carpeta o el código');
  if(!confirm('Se copiará el kit de Timón a:\n'+r+'\n\ncon código '+cod.toUpperCase()+'. ¿Continuar?'))return;
  const res=await api('/api/proyectos/incorporar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ruta:r,codigo:cod})});
  toast('Incorporado: '+res.archivos+' archivos como '+res.codigo);await refrescarListas();pintarTimon();
}
async function refrescarListas(){const r=await api('/api/proyectos');PROY=r.proyectos;MULTI=r.multi;$('#selProy').innerHTML='<option value="">Hoy (todos los proyectos)</option>'+PROY.map(p=>'<option value="'+p.id+'">'+esc(p.nombre)+'</option>').join('')}
async function correrActualizacion(dry){
  const ids=[...document.querySelectorAll('.chkProy')].filter(c=>c.checked).map(c=>c.value);
  if(!ids.length)return toast('No seleccionaste ningún proyecto');
  if(!dry&&!confirm('Se actualizarán '+ids.length+' proyecto(s).\n\nSe modifican reglas, skills y metodología (con respaldo .bak). Changelog, inbox y specs no se tocan.\n\n¿Continuar?'))return;
  await api('/api/timon/actualizar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,dry})});
  arrancarLogAct();
}
async function pollAct(){
  if(tab!=='timon')return;
  try{
    const r=await api('/api/timon/logs?since='+actLogNext);
    if(r.lines.length){const code=$('#logsAct')?.querySelector('code');if(code){code.textContent+=r.lines.map(l=>l.t).join('\n')+'\n';actLogNext=r.next;code.parentElement.scrollTop=code.parentElement.scrollHeight}}
    if(!r.corriendo){if(r.fin)toast(r.fin.dry?'Simulación terminada':'Actualización terminada');const txt=($('#logsAct')?.querySelector('code')||{}).textContent||'';await refrescarListas();await pintarTimon();mostrarLogAct(txt);return}
  }catch(e){return}
  clearTimeout(actTimer);actTimer=setTimeout(pollAct,900);
}
// explorador de carpetas
async function elegir(destino){modoElegir=destino;explorador=await api('/api/explorar');pintarExplorador()}
function pintarExplorador(){
  const e=explorador;
  let h='<div class="seccion" id="expl" style="border-color:var(--acc)"><h2>Elegir carpeta</h2>'
    +'<div class="fila-form" style="margin:0 0 10px"><code style="flex:1;background:var(--bg1);padding:8px 12px;border-radius:9px;font-size:12.5px;overflow-x:auto">'+esc(e.dir)+'</code>'
    +'<button class="btn" onclick="usarCarpeta()">Usar esta carpeta</button><button class="btn sec" onclick="explorador=null;pintarTimon()">Cancelar</button></div><div class="lista">'
    +(e.padre?'<div class="item" onclick="navegar(\''+esc(e.padre)+'\')"><span>⬆️ ..</span></div>':'');
  for(const c of e.carpetas)h+='<div class="item" onclick="navegar(\''+esc(c.ruta)+'\')"><span>'+(c.esProyecto?ic('proyecto',16):ic('carpeta',16))+' '+esc(c.nombre)+'</span>'+(c.esProyecto?'<span class="meta"><span class="est est-v">proyecto Timón</span></span>':'')+'</div>';
  if(!e.carpetas.length)h+='<div class="aviso">Sin subcarpetas.</div>';
  h+='</div></div>';
  const prev=$('#expl');if(prev)prev.outerHTML=h;else $('#main').insertAdjacentHTML('afterbegin',h);
  $('#expl').scrollIntoView({behavior:'smooth',block:'start'});
}
async function navegar(d){explorador=await api('/api/explorar?dir='+encodeURIComponent(d));pintarExplorador()}
function usarCarpeta(){
  const d=explorador.dir,destino=modoElegir;explorador=null;
  pintarTimon().then(()=>{
    const campo=destino==='timon'?'#rutaTimon':destino==='agregar'?'#rutaAgregar':destino==='raiz'?'#nuevaRaiz':'#rutaIncorporar';
    const el=$(campo);if(el){el.value=d;el.focus()}
    if(destino==='timon')toast('Dale Guardar para fijarla');
  });
}
function cambiarTrazo(v){try{localStorage.setItem('timon.trazo',v?'mano':'limpio')}catch(e){}location.reload()}
// Después de actualizar se vuelve a pintar Ajustes (versión y atrasados al día) sin perder lo que pasó.
function mostrarLogAct(txt){const box=$('#actLogs');if(!box||!txt)return;box.style.display='block';box.querySelector('code').textContent=txt;box.scrollIntoView({block:'nearest'})}
function arrancarLogAct(){actLogNext=0;const box=$('#actLogs');box.style.display='block';box.querySelector('code').textContent='Actualizando…\n';box.scrollIntoView({behavior:'smooth',block:'center'});pollAct()}
async function guardarCobroBase(){const usar=[...document.querySelectorAll('.cbUsar')].filter(c=>c.checked).map(c=>c.value);await api('/api/timon/cobro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({valorPunto:$('#cbValor').value,bolsaPct:$('#cbBolsa').value,costoHora:$('#cbHora').value,iaMensual:$('#cbIA').value,usarBase:usar})});toast('Cobro base guardado'+(usar.length?' · '+usar.length+' proyecto(s) ahora usan la base':''));pintarTimon()}
// Specs abiertos de todos los proyectos: cerrarlos en bloque cuando todo ya está en producción
let SPA=[];
async function cargarSpecsAbiertos(){
  const el=$('#ajSpecs');if(!el)return;
  try{SPA=(await api('/api/specs/abiertos')).specs}catch(e){SPA=[]}
  if(!$('#ajSpecs'))return;
  if(!SPA.length){el.innerHTML='<h2>Specs abiertos</h2><div class="aviso" style="margin:0">Todos los specs de todos los proyectos están cerrados.</div>';return}
  const grupos={};SPA.forEach((x,i)=>{(grupos[x.proyecto]=grupos[x.proyecto]||[]).push([x,i])});
  el.innerHTML='<h2>Specs abiertos · '+SPA.length+'</h2><div class="aviso" style="margin:-4px 0 12px">Si ya todo está en producción, ciérralos de una vez. Cada spec queda "Cerrado el '+hoyLocal()+' en bloque"; si algo falla, se reabre cambiando su Estado. Las piezas del changelog no cambian.</div>'
    +'<div class="fila-form" style="margin:0 0 12px"><button class="btn sec" onclick="marcarSpecs()">Marcar o desmarcar todos</button></div>'
    +Object.entries(grupos).map(([p,xs])=>'<div class="spa-grupo"><b>'+esc(p)+'</b> <span class="aviso">'+xs.length+'</span><div class="lista" style="margin-top:6px">'+xs.map(([x,i])=>'<label class="item" style="cursor:pointer"><input type="checkbox" class="spaChk" value="'+i+'" checked style="width:18px;height:18px"><span style="flex:1;min-width:0">'+esc(x.nombre)+'</span><span class="meta">'+esc(String(x.estado).slice(0,50))+'</span></label>').join('')+'</div></div>').join('')
    +'<div class="fila-form"><button class="btn" onclick="cerrarSpecsUI()">Cerrar los seleccionados</button></div>';
}
function marcarSpecs(){const c=[...document.querySelectorAll('.spaChk')];const v=!c.every(x=>x.checked);c.forEach(x=>x.checked=v)}
async function cerrarSpecsUI(){
  const sel=[...document.querySelectorAll('.spaChk')].filter(c=>c.checked).map(c=>SPA[+c.value]);
  if(!sel.length)return toast('No marcaste ningún spec');
  if(!confirm('Se cerrarán '+sel.length+' spec(s) en '+new Set(sel.map(x=>x.pid)).size+' proyecto(s).\n\nSolo cambia la línea de Estado de cada spec. ¿Continuar?'))return;
  const r=await api('/api/specs/cerrar-todos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({specs:sel.map(x=>({pid:x.pid,file:x.file}))})});
  toast(r.cerrados+' spec(s) cerrados');cargarSpecsAbiertos();
}
async function guardarEditor(k){await api('/api/timon/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({editor:k})});toast('Editor: '+(T.editores||{})[k]);pintarTimon()}
async function guardarPlanBase(){const pb={};document.querySelectorAll('.pbIn').forEach(i=>{(pb[i.dataset.t]=pb[i.dataset.t]||{})[i.dataset.e]=i.value});await api('/api/timon/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({planBase:pb})});toast('Plantilla de fechas guardada');pintarTimon()}
// Piezas abiertas de todos los proyectos: pasarlas a Verificado en bloque cuando ya está todo en producción
let PZA=[];
async function cargarPiezasAbiertas(){
  const el=$('#ajPiezas');if(!el)return;
  try{PZA=(await api('/api/piezas/abiertas')).piezas}catch(e){PZA=[]}
  if(!$('#ajPiezas'))return;
  if(!PZA.length){el.innerHTML='<h2>Piezas abiertas</h2><div class="aviso" style="margin:0">No hay piezas abiertas en ningún proyecto.</div>';return}
  const G={probar:'Por probar',taller:'En el taller',pendiente:'Pendientes'},grupos={};PZA.forEach((x,i)=>{(grupos[x.proyecto]=grupos[x.proyecto]||[]).push([x,i])});
  el.innerHTML='<h2>Piezas abiertas · '+PZA.length+'</h2><div class="aviso" style="margin:-4px 0 12px">Si ya están en producción, márcalas como verificadas de una vez. Por probar y En el taller vienen marcadas; las Pendientes no (todavía no se construyen). Cada una queda "Verificado en lote el '+fFecha(hoyLocal())+'"; si el Estado traía una nota, pasa a la Verificación.</div>'
    +'<div class="fila-form" style="margin:0 0 12px">'+Object.entries(G).map(([k,l])=>'<button class="btn sec" onclick="marcarGrupoPz(\''+k+'\')">'+l+'</button>').join('')+'<button class="btn sec" onclick="marcarPz(null)">Todas o ninguna</button></div>'
    +Object.entries(grupos).map(([p,xs])=>'<div class="spa-grupo"><b>'+esc(p)+'</b> <span class="aviso">'+xs.length+'</span><div class="lista" style="margin-top:6px">'+xs.map(([x,i])=>'<label class="item" style="cursor:pointer"><input type="checkbox" class="pzaChk" data-g="'+x.grupo+'" value="'+i+'"'+(x.grupo==='pendiente'?'':' checked')+' style="width:18px;height:18px"><code style="flex:none"><b>'+esc(x.id)+'</b></code><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.desc)+'</span><span class="meta"><span class="est '+claseEst(x.estado)+'">'+G[x.grupo]+'</span></span></label>').join('')+'</div></div>').join('')
    +'<div class="fila-form"><button class="btn" onclick="cerrarPiezasUI()">Marcar como verificadas</button></div>';
}
function marcarPz(){const c=[...document.querySelectorAll('.pzaChk')];const v=!c.every(x=>x.checked);c.forEach(x=>x.checked=v)}
function marcarGrupoPz(g){const c=[...document.querySelectorAll('.pzaChk[data-g="'+g+'"]')];const v=!c.every(x=>x.checked);c.forEach(x=>x.checked=v)}
async function cerrarPiezasUI(){
  const sel=[...document.querySelectorAll('.pzaChk')].filter(c=>c.checked).map(c=>PZA[+c.value]);
  if(!sel.length)return toast('No marcaste ninguna pieza');
  if(!confirm('Se marcarán '+sel.length+' pieza(s) de '+new Set(sel.map(x=>x.pid)).size+' proyecto(s) como ✔️ Verificado.\n\nRegla de Timón: Verificado lo marcas tú. ¿Confirmas que ya están en producción?'))return;
  const r=await api('/api/piezas/cerrar-todas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({piezas:sel.map(x=>({pid:x.pid,id:x.id}))})});
  toast(r.cerradas+' pieza(s) verificadas');INI=null;cargarPiezasAbiertas();
}
