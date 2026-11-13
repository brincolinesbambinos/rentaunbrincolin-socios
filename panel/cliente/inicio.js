// Timón · Inicio (TMN-057): lo que te toca hoy, la semana, lo que se está moviendo y todos los proyectos.
let INI=null,INI_T=0,iniCargando=false,iniTxt='';
const HOY_TIPO={vencido:['Vencido','moneda','Ver cobro'],fallo:['Falló','fallo','Abrir pieza'],probar:['Probar','probar','Probar'],decidir:['Decidir','cobro','Decidir'],pago:['Pago','calendario','Ver cobro'],ideas:['Ideas','ideas','Ver ideas'],quieto:['Quieto','tiempo','Entrar'],limite:['Límite','alerta','Probar'],choque:['Choque','alerta','Ver carriles']};
const lsLeer=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}};
const lsPoner=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let iniArchivo=lsLeer('timon.iniArchivo',false),iniPlegados=lsLeer('timon.iniPlegados',{});
async function cargarInicio(){
  if(iniCargando)return;iniCargando=true;
  try{INI=await api('/api/inicio');INI_T=Date.now()}catch(e){INI=INI||{items:[],semana:[],proyectos:[],kpis:{},pospuestos:0,hoy:hoyLocal()}}finally{iniCargando=false}
  if(!actual&&tab==='general'){pintarBanner();pintar()}
}
const cargarHoy=cargarInicio;
const pesos=n=>'$'+Math.round(n||0).toLocaleString('es-MX');
const DIAS_C=['dom','lun','mar','mié','jue','vie','sáb'];
function hace(iso){
  if(!iso)return 'sin movimiento';const ms=Date.now()-Date.parse(iso);if(isNaN(ms))return '';
  const min=Math.round(ms/6e4),h=Math.max(1,Math.round(ms/36e5)),d=Math.round((Date.parse(hoyLocal())-Date.parse(isoLocal(iso).slice(0,10)))/864e5);
  if(min<2)return 'ahora';if(min<60)return 'hace '+min+' min';if(d<=0)return 'hace '+h+' h';if(d===1)return 'ayer';if(d<14)return 'hace '+d+' días';if(d<60)return 'hace '+Math.round(d/7)+' semanas';return fFecha(iso);
}
const diasDesde=iso=>iso?Math.floor((Date.now()-Date.parse(iso))/864e5):9999;
const fCortaI=f=>{const m=String(f||'').match(/^\d{4}-(\d{2})-(\d{2})/);return m?m[2]+' '+MESES_L[+m[1]-1].slice(0,3):''};
const datoI=id=>(INI&&INI.proyectos.find(x=>x.id===id))||{total:0,verificadas:0,pendientes:0,taller:0,porProbar:0};
const archivadoI=p=>['pausado','entregado'].includes(p.estado);
const sinAcentosC=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const piezasTxt=d=>d.porProbar?d.porProbar+' por probar':(d.pendientes+d.taller)?(d.pendientes+d.taller)+' abiertas':d.total?'todo cerrado':'sin piezas';
const proximoTxt=d=>d.proximo?fCortaI(d.proximo.fecha)+' · '+esc(d.proximo.txt):'';

// ---- franja de arriba: fecha, saludo y cuatro números ----
function heroInicio(){
  const k=(INI&&INI.kpis)||{},run=corriendoAhora().length;
  const kp=(n,l,cls,on)=>'<button class="ini-kpi '+cls+'" onclick="'+on+'"><b>'+n+'</b><span>'+l+'</span></button>';
  return '<section class="hero ini-hero"><div class="wrap"><div class="fila"><div><div class="fecha">'+fechaHoy()+'</div><h1>'+saludo()+'</h1></div>'
    +(INI?'<div class="ini-kpis">'+kp(k.porProbar||0,(k.porProbar===1?'pieza':'piezas')+' por probar','k-probar',"irVista('vtodos')")+kp(pesos(k.porDecidirMxn),'por decidir cobrar','k-decidir',"irVista('cobranza')")
      +kp(pesos(k.vencido),'vencido','k-vencido'+(k.vencido?' on':''),"irVista('cobranza')")+kp(run,'corriendo ahora','k-run',"var e=document.getElementById('iniCorre');if(e)e.scrollIntoView({behavior:'smooth',block:'center'})")+'</div>'
      :'<div class="hoy-cargando">Revisando tus proyectos…</div>')+'</div></div></section>';
}

// ---- todo lo de abajo ----
function pintarInicio(){
  const m=$('#main');if(!m)return;
  if(!INI){m.innerHTML='<div class="ini"><div class="aviso">Revisando tus proyectos…</div></div>';cargarInicio();return}
  if(Date.now()-INI_T>60000)setTimeout(cargarInicio,0);
  m.innerHTML='<div class="ini">'+bloqueFaltantes()+'<div class="ini-dos">'+bloqueHoy()+'<div class="ini-lado">'+bloqueSemana()+bloqueCorre()+'</div></div>'+bloqueMov()+bloqueTodos()+'</div>';
}
function chipProy(cod,cliente){const c=colorCliente(cliente||'Sin cliente');return '<code class="ini-chip" style="background:'+c[2]+';color:'+c[3]+'">'+esc(cod)+'</code>'}
function bloqueHoy(){
  const L=INI.items;
  let h='<section class="seccion ini-hoy" aria-labelledby="tHoy"><div class="ini-cab"><h2 id="tHoy">Hoy te toca</h2><span class="aviso">'+(L.length?L.length+(L.length===1?' cosa':' cosas')+', lo más urgente arriba':'')+'</span></div>';
  if(!L.length)h+='<div class="ini-vacio">'+notaTimon(INI.pospuestos?'Lo demás lo dejaste para después.':'Nada urgente hoy. Buen momento para construir.')+'</div>';
  h+=L.map((x,i)=>{const t=HOY_TIPO[x.tipo]||['','info','Abrir'],p=PROY.find(q=>q.id===x.pid)||{};return '<div class="ini-fila t-'+x.tipo+'"><span class="ini-barra"></span>'+chipProy(x.codigo,p.cliente)
    +'<div class="ini-txt"><b>'+esc(x.titulo)+(x.tipo==='quieto'?'':edadDesde(x.desde,x.tipo==='vencido'?'venció':'desde'))+'</b><span>'+esc(x.detalle||'')+(x.nombre&&!(x.detalle||'').includes(x.nombre)?' · '+esc(x.nombre):'')+'</span></div>'
    +'<div class="ini-bts"><button class="btn" onclick="irHoyI('+i+')">'+ic(t[1],16)+t[2]+'</button><button class="btn sec" onclick="despuesHoy('+i+')" title="Lo vuelves a ver mañana">Después</button></div></div>'}).join('');
  if(INI.pospuestos)h+='<button class="lnk ini-mas" onclick="volverPospuestos()">Mostrar lo que dejé para después ('+INI.pospuestos+')</button>';
  return h+'</section>';
}
function irHoyI(i){const x=INI.items[i];if(!x)return;if(x.pieza)return entrar(x.pid,'piezas',x.pieza);if(x.ir==='verificar'){VER=[];vFoco=null}entrar(x.pid,x.ir)}
async function despuesHoy(i){const x=INI.items[i];if(!x)return;INI.items.splice(i,1);INI.pospuestos++;pintar();await api('/api/inicio/despues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clave:x.clave})});toast('Lo vuelves a ver mañana')}
async function volverPospuestos(){await api('/api/inicio/despues/limpiar',{method:'POST'});await cargarInicio()}
function bloqueSemana(){
  const L=INI.semana,por={};L.forEach(e=>(por[e.fecha]=por[e.fecha]||[]).push(e));
  let h='<section class="ini-semana" aria-labelledby="tSem"><div class="ini-cab"><h2 id="tSem">Esta semana</h2><button class="lnk" onclick="TG=null;irVista(\'tiempo\')">Calendario</button></div>';
  if(!L.length)h+='<div class="ini-sem-vacio">Nada con fecha en los próximos 14 días. Aquí aparecen los pagos, los hitos y los fines de etapa.</div>';
  for(const [f,xs] of Object.entries(por)){const d=new Date(f+'T12:00:00'),esHoy=f===INI.hoy;
    h+='<div class="ini-dia'+(esHoy?' hoy':'')+'"><div class="ini-fecha"><span>'+(esHoy?'hoy':DIAS_C[d.getDay()])+'</span><b>'+f.slice(8,10)+'</b></div><div class="ini-evs">'
      +xs.map(e=>'<button class="ini-ev" onclick="entrar(\''+e.pid+'\',\''+(e.tipo==='pago'?'cobros':'etapas')+'\')"><i class="m-'+e.tipo+'"></i><code>'+esc(e.codigo)+'</code><span>'+esc(e.txt)+'</span></button>').join('')+'</div></div>'}
  return h+'<div class="ini-ley"><span><i class="m-pago"></i>Pago</span><span><i class="m-hito"></i>Hito</span><span><i class="m-etapa"></i>Fin de etapa</span></div></section>';
}
function bloqueCorre(){
  const run=corriendoAhora();
  return '<section class="ini-corre" id="iniCorre" aria-label="Corriendo ahora"><div class="tit"><span class="dot'+(run.length?' on':'')+'"></span>Corriendo ahora</div>'
    +(run.length?run.map(x=>'<div class="ini-run"><span class="n">'+esc(x.p.nombre)+(x.p.lanzadores.length>1?' · '+esc(x.l.nombre):'')+(x.l.url?' <code>'+esc(sinHost(x.l.url))+'</code>':'')+(x.l.desde?' <small class="desde">desde '+esc(hace(x.l.desde).replace(/^hace /,'hace '))+'</small>':'')+'</span>'
      +(x.l.url?'<button onclick="abrirUrl(\''+x.p.id+'\',\''+esc(x.l.url)+'\')">Abrir</button>':'')
      +'<button onclick="entrar(\''+x.p.id+'\',\'run\')">Consola</button><button class="det" onclick="rapido(\''+x.p.id+'\','+x.i+',1)">Detener</button></div>').join('')
      :'<div class="vacio-run">Nada corriendo. Arranca un proyecto desde su tarjeta.</div>')+'</section>';
}
// En movimiento: fijados primero, luego lo que se movió en los últimos 14 días
function bloqueMov(){
  let L=PROY.filter(p=>datoI(p.id).fijo||(!archivadoI(p)&&diasDesde(datoI(p.id).ultimo)<=14));
  if(!L.length)L=PROY.filter(p=>!archivadoI(p)).sort((a,b)=>String(datoI(b.id).ultimo).localeCompare(String(datoI(a.id).ultimo))).slice(0,4);
  L=L.slice().sort((a,b)=>(datoI(b.id).fijo?1:0)-(datoI(a.id).fijo?1:0)||String(datoI(b.id).ultimo).localeCompare(String(datoI(a.id).ultimo)));
  if(!L.length)return '';
  return '<section class="ini-mov" aria-labelledby="tMov"><div class="ini-cab"><h2 id="tMov">En movimiento</h2><span class="aviso">Fijados primero, luego lo que tuvo actividad en los últimos 14 días. Fija un proyecto con la estrella.</span></div><div class="ini-cards">'+L.map(tarjetaMov).join('')+'</div></section>';
}
function tarjetaMov(p){
  const d=datoI(p.id),c=colorCliente(p.cliente||'Sin cliente'),vivoI=p.lanzadores.findIndex(l=>l.corriendo),l0=p.lanzadores[0];
  const pct=d.total?Math.round(d.verificadas/d.total*100):0;
  return '<article class="ini-card'+(vivoI>=0?' vivo':'')+'"><span class="ic-franja" style="background:'+(p.color||c[0])+'"></span><div class="ic-cuerpo">'
    +'<div class="ic-top">'+chipProy(p.codigo,p.cliente)+'<span class="ic-cli">'+esc(p.cliente||'Sin cliente')+'</span>'+(vivoI>=0?'<span class="vivo-tag"><span class="dot on"></span>Corriendo</span>':'')
    +'<button class="ic-estrella'+(d.fijo?' on':'')+'" aria-pressed="'+!!d.fijo+'" aria-label="'+(d.fijo?'Quitar de fijados':'Fijar arriba')+'" title="'+(d.fijo?'Quitar de fijados':'Fijar arriba')+'" onclick="fijarI(\''+p.id+'\','+!d.fijo+')">'+(d.fijo?'★':'☆')+'</button></div>'
    +'<button class="ic-nombre" onclick="entrar(\''+p.id+'\')">'+esc(p.nombre)+'</button>'
    +'<div class="ic-etapa">'+etapaMini(p.etapa)+'<span>'+esc(p.etapa?nomEtapaS(p.etapa):'Sin etapa')+'</span></div>'
    +'<div class="ic-avance"><div class="ic-fila"><span>'+d.verificadas+' de '+d.total+' verificadas</span><span>'+piezasTxt(d)+'</span></div><div class="ic-barra"><i style="width:'+pct+'%"></i></div></div>'
    +'<div class="ic-pie"><span><b>Próximo:</b> '+(proximoTxt(d)||'sin fechas planeadas')+'</span><span class="ic-hace">'+hace(d.ultimo)+'</span></div></div>'
    +'<div class="ic-acc"><button class="ic-entrar" onclick="entrar(\''+p.id+'\')">Entrar</button>'
    +(vivoI>=0?'<button class="ic-arr det" onclick="rapido(\''+p.id+'\','+vivoI+',1)">'+ICO.stop+'Detener</button>'
      :(l0&&!l0.sugerido?'<button class="ic-arr" onclick="rapido(\''+p.id+'\',0,0)" title="'+esc(l0.nombre)+'">'+ICO.play+'Arrancar</button>':'<button class="ic-arr sin" onclick="entrar(\''+p.id+'\',\'run\')">Sin lanzador</button>'))
    +'<button class="ic-ico" aria-label="Abrir en Finder" title="Abrir en Finder" onclick="abrirEn(\''+p.id+'\',\'finder\',\'.\')">'+ICO.dir+'</button></div></article>';
}
async function fijarI(pid,fijo){const d=INI.proyectos.find(x=>x.id===pid);if(d)d.fijo=fijo;pintar();await api('/api/inicio/fijar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pid,fijo})});toast(fijo?'Fijado arriba':'Ya no está fijado')}
// Todos los proyectos: tabla agrupada por cliente; pausados y entregados escondidos
function bloqueTodos(){
  const t=sinAcentosC(iniTxt),nArch=PROY.filter(archivadoI).length;
  const lista=PROY.filter(p=>(iniArchivo||!archivadoI(p))&&(!t||sinAcentosC(p.nombre+' '+p.codigo+' '+p.cliente+' '+p.marca).includes(t)));
  const grupos={};for(const p of lista)(grupos[p.cliente||'Sin cliente']=grupos[p.cliente||'Sin cliente']||[]).push(p);
  const orden=Object.keys(grupos).sort((a,b)=>(a==='Sin cliente')-(b==='Sin cliente')||a.localeCompare(b));
  const sinTmn=PROY.filter(p=>!p.tieneTmn).length;
  let h='<section class="seccion ini-todos" aria-labelledby="tTodos"><div class="ini-cab"><h2 id="tTodos">Todos los proyectos</h2>'
    +'<label class="ini-filtro"><span>Filtrar</span><input type="text" id="iniFiltro" value="'+esc(iniTxt)+'" placeholder="Proyecto, cliente o código" oninput="iniTxt=this.value;pintar()"></label>'
    +(nArch?'<button class="chipf'+(iniArchivo?' on':'')+'" onclick="iniArchivo=!iniArchivo;lsPoner(\'timon.iniArchivo\',iniArchivo);pintar()">'+(iniArchivo?'Ocultar pausados y entregados':'Mostrar pausados y entregados ('+nArch+')')+'</button>':'')+'</div>';
  if(sinTmn)h+='<div class="aviso ini-aviso"><b>'+sinTmn+' proyecto(s) sin ficha .tmn.</b> Sin ella no sé cómo lanzarlos ni de qué cliente son. <button class="lnk" onclick="irTimon()">Crearlas en Ajustes</button></div>';
  h+='<div class="ini-tabla"><div class="ini-tr cab"><span>Código</span><span>Proyecto</span><span>Etapa</span><span>Piezas</span><span>Próximo</span><span>Actividad</span></div>';
  orden.forEach((g,gi)=>{
    const c=colorCliente(g),ps=grupos[g],abierto=!iniPlegados[g]||!!t;
    h+='<button class="ini-grupo'+(abierto?'':' plegado')+'" aria-expanded="'+abierto+'" onclick="plegarI('+gi+')"><span class="fl">'+(abierto?'▾':'▸')+'</span><span class="sw" style="background:'+c[0]+'"></span>'+esc(g)+'<span class="n">'+ps.length+(ps.length===1?' proyecto':' proyectos')+'</span></button>';
    if(abierto)h+=ps.map(p=>{const d=datoI(p.id);
      return '<button class="ini-tr'+(archivadoI(p)?' arch':'')+'" onclick="entrar(\''+p.id+'\')"><code>'+esc(p.codigo)+'</code><span class="nm">'+esc(p.nombre)+(p.corriendo?' <span class="dot on" title="Corriendo"></span>':'')+'</span><span class="et">'+esc(archivadoI(p)?(p.estado==='pausado'?'Pausado':'Entregado'):p.etapa?nomEtapaS(p.etapa):'Sin etapa')+'</span><span class="pz">'+piezasTxt(d)+'</span><span class="px">'+(proximoTxt(d)||'—')+'</span><span class="ac">'+hace(d.ultimo)+'</span></button>'}).join('');
  });
  INI_GRUPOS=orden;
  if(!lista.length)h+='<div class="ini-vacio">Nada coincide con «'+esc(iniTxt)+'».</div>';
  return h+'</div></section>';
}
let INI_GRUPOS=[];
function plegarI(gi){const g=INI_GRUPOS[gi];if(g===undefined)return;const n={...iniPlegados};if(n[g])delete n[g];else n[g]=1;iniPlegados=n;lsPoner('timon.iniPlegados',n);pintar()}

// Etiqueta de antigüedad: "desde hace 3 días" (verde si es de hoy, naranja si pasa de 7 días) (TMN-062)
function edadDesde(f,pre){
  if(!f)return '';if(!/T\d/.test(f))f=String(f).slice(0,10)+'T12:00:00';const dd=Math.floor((Date.parse(hoyLocal())-Date.parse(f.slice(0,10)))/864e5);const t=!/Z|[+-]\d\d:?\d\d$/.test(f)&&dd===0?'hoy':hace(f);if(!t)return '';
  const d=Math.floor((Date.parse(hoyLocal())-Date.parse(isoLocal(f).slice(0,10)))/864e5);
  const txt=(pre?pre+' ':'')+(/^\d{2} /.test(t)?'el '+t:t);
  return ' <span class="pr-edad'+(d>=7?' vieja':d<1?' nueva':'')+'" title="'+esc(fFecha(f)+(fHora(f)?' '+fHora(f):''))+'">'+esc(txt)+'</span>';
}
