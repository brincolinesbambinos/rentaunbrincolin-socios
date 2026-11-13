// Timón · Estado, API, navegación, banda superior y despachador de pantallas

let PROY=[], MULTI=false, actual=null, S=null, tab='general';
let specAbierto=null,sqlAbierto=null,logNext=0,logTimer=null,lanzSel=0,filtroTxt='',filtroEst='';
let NODOS=[],abiertos={},archivoSel=null,editTmn=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const ESTADOS=['🔲 Pendiente','🔄 En construcción','✅ Construido','✔️ Verificado','🚫 Descartado'];
// el estado se reconoce aunque la IA lo haya escrito a su modo (🔨, "en construcción (…)")
const grupoEst=e=>{e=String(e||'');return /✔️|verificad/i.test(e)?'v':/🚫|descartad/i.test(e)?'d':/✅|construid/i.test(e)?'b':/🔄|🔨|construcci|taller/i.test(e)?'c':'p'};
const claseEst=e=>'est-'+grupoEst(e);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
async function api(p,opt){const r=await fetch(p,opt);const j=await r.json();if(!r.ok||j.error){toast((j.error||r.status));throw new Error(j.error||r.status)}return j}
const qp=()=>'?p='+encodeURIComponent(actual);

async function inicio(){
  await cargarUiServidor();
  const r=await api('/api/proyectos');PROY=r.proyectos;MULTI=r.multi;
  $('#selProy').innerHTML='<option value="">Hoy (todos los proyectos)</option>'+PROY.map(p=>'<option value="'+p.id+'">'+esc(p.nombre)+'</option>').join('');
  if(!PROY.length){pintarNav();$('#main').innerHTML='<div class="seccion"><h2>Todavía no hay proyectos</h2>No encontré proyectos Timón bajo <code>'+esc(r.base)+'</code>.<div class="aviso">Busco carpetas con CLAUDE.md, 00-MARCO.md o CHANGELOG-*.md (hasta 3 niveles). Desde <b>Ajustes</b> puedes agregar proyectos que estén en otro lado, o incorporar una carpeta nueva.</div><div class="fila-form"><button class="btn" onclick="irTimon()">Ir a Ajustes</button></div></div>';return}
  if(!MULTI){actual=PROY[0].id;$('#selProy').value=actual;await entrar(actual,leerRuta(location.hash)?.tab||'tablero')}
  else await restaurarRuta();
}
function irGeneral(){actual=null;tab='general';$('#selProy').value='';refrescarGeneral()}
function irTimon(){actual=null;tab='timon';$('#selProy').value='';pintarNav();pintarBanner();pintarTimon()}
async function refrescarGeneral(){const r=await api('/api/proyectos');PROY=r.proyectos;pintarNav();pintarBanner();pintarGeneral();cargarInicio()}
async function elegirProyecto(id){if(!id)return irGeneral();await entrar(id,'tablero')}
async function entrar(id,t,pieza){const antes=rutaActual();if(actual!==id){NODOS=[];abiertos={};archivoSel=null;editTmn=null;lanzSel=0;piezaAbierta=null;PZ=null;VER=[];mapaSel=null}if(pieza!==undefined){piezaAbierta=pieza||null;PZ=null}actual=id;tab=t||'tablero';$('#selProy').value=id;S=await api('/api/estado'+qp());pintarNav();pintarBanner();pintar();if(antes!==rutaActual())window.scrollTo(0,0)}
async function recargar(){if(typeof TP!=='undefined')TP=null;if(!actual)return refrescarGeneral();S=await api('/api/estado'+qp());pintarNav();pintarBanner();pintar()}
function cabecera(){pintarBanner()}
function buscarGlobal(v){abrirPaleta(v)}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&!e.altKey){const k=e.key.toLowerCase();if(k==='k'){e.preventDefault();abrirPaleta()}else if(k==='n'){e.preventDefault();irNuevo()}}});
const PALETA_CL=[['#1C3F94','#DCE4FF','#C7D3FF','#14306F'],['#FF7A1A','#FFE6D2','#FFD4B3','#B4510B'],['#E5B800','#FFF6C7','#FFEC8F','#7A5F00'],['#0F8A5F','#DDF3EA','#BFE8D7','#0B5E40'],['#C02D78','#FBE1EE','#F5C3DC','#8A1C55'],['#0E8C9C','#DDF2F4','#BDE6EB','#0A5F6A'],['#6A3FD0','#E8E0FB','#D3C5F7','#4A2A99'],['#4B5160','#E4E7EC','#D3D7DF','#23272F']];
const GRIS_CL=['#4B5160','#E4E7EC','#D3D7DF','#23272F'];
function colorCliente(nombre){
  if(!nombre||nombre==='Sin cliente'||nombre==='Personal')return GRIS_CL;
  const lista=[...new Set(PROY.map(p=>p.cliente).filter(c=>c&&c!=='Personal'))].sort();
  const i=lista.indexOf(nombre);return PALETA_CL[(i<0?0:i)%PALETA_CL.length];
}
const ICO={casa:ic('hoy',16),play:ic('play',14),stop:ic('stop',14),ext:ic('abrirFuera',16),dir:ic('carpeta',18),doc:ic('documento',18)};
// Siete secciones por proyecto (TMN-027): lo demás vive como subpestaña dentro de su sección.
const GRUPOS=[
  {id:'tablero',l:'Resumen',ic:'tablero',sub:[['tablero','Resumen'],['metricas','Métricas'],['etapas','Etapas en el tiempo'],['tpiezas','Piezas en el tiempo']]},
  {id:'piezas',l:'Piezas',ic:'piezas',sub:[['piezas','Lista'],['carriles','Carriles'],['mapa','Por lugar'],['tabla','Tabla']]},
  {id:'inbox',l:'Ideas',ic:'ideas',sub:[['inbox','Ideas']]},
  {id:'verificar',l:'Probar',ic:'probar',sub:[['verificar','Probar']]},
  {id:'cobros',l:'Cobro',ic:'cobro',sub:[['cobros','Cobro'],['puntos','Puntos']]},
  {id:'taller',l:'Taller',ic:'taller',sub:[['archivos','Archivos'],['textos','Corregir textos'],['sql','SQL'],['docs','Documentos'],['specs','Specs'],['salud','Ordenar y salud']]},
  {id:'proyecto',l:'Configuración',ic:'configuracion',sub:[['proyecto','Proyecto'],['run','Lanzadores']]},
];
const grupoDe=t=>GRUPOS.find(g=>g.sub.some(s=>s[0]===t))||GRUPOS[0];
const SUBG={};
function irGrupo(id){const g=GRUPOS.find(x=>x.id===id);if(!g)return;const u=SUBG[id];irA(u&&g.sub.some(s=>s[0]===u)?u:g.sub[0][0])}
function cuentaNav(t){
  if(!S)return 0;const a=S.alertas||{};
  return {piezas:(a.pendientes||0)+(a.enConstruccion||0)+(a.construidosSinVerificar||0),inbox:a.inboxSinProcesar||0,verificar:a.construidosSinVerificar||0,
    cobros:S.porDecidir&&S.porDecidir.length?S.porDecidir.length:(S.cobros&&S.cobros.vencido?'$':0),taller:S.salud?S.salud.fuera:0,
    specs:S.specs?S.specs.length:0,sql:S.sql?S.sql.filter(s=>!s.produccion).length:0,salud:S.salud?S.salud.fuera:0,puntos:S.puntos?S.puntos.sinPuntos.length:0,
    carriles:S.carriles?(S.carriles.lleno||S.carriles.choques.length?'!':S.carriles.carriles.filter(c=>c.hilos.length).length):0,proyecto:0,run:S.lanzadores?S.lanzadores.filter(l=>l.corriendo).length:0}[t]||0;
}
// Barra lateral: arriba lo de Timón (todos los proyectos); abajo, anidado, el proyecto abierto con sus secciones.
let SIDE_MINI=false;try{SIDE_MINI=localStorage.getItem('timon.side')==='mini'}catch(e){}
const TIMON_NAV=[['general','Hoy','hoy',()=>'irGeneral()'],['vtodos','Probar','probar',()=>"irVista('vtodos')"],['cobranza','Cobro','cobro',()=>"irVista('cobranza')"],['tiempo','Calendario','calendario',()=>"TG=null;irVista('tiempo')"],['timon','Ajustes','ajustes',()=>'irTimon()']];
function alternarSide(){SIDE_MINI=!SIDE_MINI;try{localStorage.setItem('timon.side',SIDE_MINI?'mini':'')}catch(e){}pintarNav()}
function pintarNav(){
  document.body.classList.toggle('general',!actual&&tab==='general');
  document.body.classList.toggle('sin-rail',!actual);
  document.body.classList.toggle('side-mini',SIDE_MINI);
  recordarRuta();
  const it=(on,icn,l,f,n,cls)=>'<button class="s-it'+(on?' on':'')+(cls?' '+cls:'')+'"'+(on?' aria-current="page"':'')+' onclick="'+f+'" title="'+esc(l)+'">'+ic(icn,18)+'<span class="l">'+l+'</span>'+(n?'<span class="n">'+n+'</span>':'')+'</button>';
  let h='<div class="s-cab"><span class="s-tit">Timón</span><button class="s-mini" onclick="alternarSide()" aria-label="'+(SIDE_MINI?'Mostrar':'Ocultar')+' nombres" title="'+(SIDE_MINI?'Mostrar':'Ocultar')+' nombres">'+ic(SIDE_MINI?'siguiente':'anterior',16)+'</button></div>';
  h+=TIMON_NAV.map(([t,l,icn,f])=>it(!actual&&(tab===t||(t==='general'&&tab==='nuevo')),icn,l,f())).join('');
  if(actual&&S){
    const pr=S.proyecto,c=colorCliente(pr.cliente||'Sin cliente'),g=grupoDe(tab);SUBG[g.id]=tab;
    h+='<div class="s-proy"><span class="pt" style="background:'+(pr.color||c[0])+'"></span><span class="l"><b>'+esc(pr.nombre)+'</b><small>'+esc(pr.codigo)+(S.etapa?' · '+esc(nomEtapaS(S.etapa)):'')+'</small></span></div><div class="s-grupo">';
    for(const x of GRUPOS){
      const on=x===g,n=cuentaNav(x.id);
      h+=it(on&&x.sub.length===1,x.ic,x.l,"irGrupo('"+x.id+"')",n,on?'abierto':'');
      if(on&&x.sub.length>1)h+='<div class="s-sub">'+x.sub.map(([t,l])=>{const nn=t===x.sub[0][0]&&x.id!=='taller'?0:cuentaNav(t);return '<button class="s-it2'+(t===tab?' on':'')+'"'+(t===tab?' aria-current="page"':'')+' onclick="irA(\''+t+'\')"><span class="l">'+l+'</span>'+(nn?'<span class="n">'+nn+'</span>':'')+'</button>'}).join('')+'</div>';
    }
    h+='</div>';
    if(S.relacionados&&S.relacionados.some(r=>r.id))h+='<div class="s-rel"><span class="s-tit">Relacionados</span>'+S.relacionados.filter(r=>r.id).map(r=>it(false,'relacionados',esc(r.nombre),"entrar('"+r.id+"')")).join('')+'</div>';
  }
  $('#side').innerHTML=h;
  if(typeof pintarConsola==='function')pintarConsola();
}
const nomEtapaS=e=>({brief:'Brief',descubrimiento:'Descubrimiento',cotizacion:'Cotización',aceptado:'Aceptado',construccion:'Construcción',entregado:'Entregado',mantenimiento:'Mantenimiento'})[e]||e;
// Fechas a la vista: siempre DD MMMM YY ("05 noviembre 26"). Para ordenar o identificar se usa AAAAMMDD.
const MESES_L=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function isoLocal(s){const t=String(s||'');if(!/T\d/.test(t))return t;const d=new Date(t);return isNaN(d)?t:new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString()}
function fFecha(s){const m=isoLocal(s).match(/^(\d{4})-?(\d{2})-?(\d{2})/);return m?m[3]+' '+MESES_L[+m[2]-1]+' '+m[1].slice(2):String(s||'')}
function fMes(s){const m=String(s||'').match(/^(\d{4})-?(\d{2})/);return m?MESES_L[+m[2]-1]+' '+m[1].slice(2):String(s||'')}
function fHora(s){const t=isoLocal(s);return /T\d/.test(t)?t.slice(11,16):''}
function fechaHoy(){const d=new Date(),dia=d.toLocaleDateString('es-MX',{weekday:'long'});return dia.charAt(0).toUpperCase()+dia.slice(1)+' · '+fFecha(hoyLocal())}
function saludo(){const h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches'}
function corriendoAhora(){const out=[];for(const p of PROY)p.lanzadores.forEach((l,i)=>{if(l.corriendo)out.push({p,l,i})});return out}
const sinHost=u=>(u||'').replace(/^https?:\/\/(localhost|127\.0\.0\.1)/,'');
function pintarBanner(){
  const b=$('#banner'),r=$('#ruta');
  if(!actual&&tab==='general'){r.innerHTML='';b.innerHTML=heroInicio();return}
  if(!actual){const V={timon:['Ajustes','La versión de Timón, el cobro base, dónde busco proyectos y cómo se ve.','ajustes'],vtodos:['Probar','Todo lo construido que falta probar, en todos tus proyectos.','probar'],cobranza:['Cobro','Lo cobrado, lo que falta y lo vencido, por cliente.','cobro'],tiempo:['Calendario','Cada proyecto por etapa, lo planeado contra lo real y los pagos.','calendario'],nuevo:['Proyecto','Empieza uno de cero o trae uno que ya tenías empezado.','nuevo']}[tab]||['Ajustes','','ajustes'];r.innerHTML='';b.innerHTML='<section class="banda"><div class="wrap"><div class="kicker">'+ic(V[2],16)+'Todos los proyectos</div><h1>'+V[0]+'</h1><p>'+V[1]+'</p></div></section>';return}
  if(!S)return;
  const pr=S.proyecto,c=colorCliente(pr.cliente||'Sin cliente'),L=S.lanzadores,l0=L[0],vivo=L.find(l=>l.corriendo),url=(L.find(l=>l.url)||{}).url;
  r.innerHTML='<a onclick="irGeneral()">Proyectos</a><span class="sep">/</span>'+(pr.cliente?'<span>'+esc(pr.cliente)+'</span><span class="sep">/</span>':'')+'<b>'+esc(pr.nombre)+'</b>';
  b.innerHTML='<section class="banda"><div class="wrap"><div class="fila"><div style="flex:1 1 520px;min-width:0">'
    +'<div class="meta"><span class="codigo" style="background:'+(pr.color||c[0])+';color:#fff">'+esc(pr.codigo)+'</span>'+(pr.estado?'<span class="est-'+esc(pr.estado)+'" style="font-weight:600">'+esc(pr.estado)+'</span>':'')+(pr.marca?'<span class="marca">· '+esc(pr.marca)+'</span>':'')+(S.etapa?'<span class="pill a">'+esc((ETAPAS_UI.find(x=>x[0]===S.etapa)||[0,S.etapa])[1])+'</span>':'')+(S.desactualizado?'<span class="pill w" style="cursor:pointer" onclick="irTimon()">Timón por actualizar</span>':'')
    +(vivo?'<span class="vivo"><span class="dot on"></span>Corriendo'+(vivo.url?' en '+esc(sinHost(vivo.url)):'')+'</span>':'')+'</div>'
    +'<h1>'+esc(pr.nombre)+'</h1>'+(pr.descripcion?'<p>'+esc(pr.descripcion)+'</p>':'')+'</div><div class="acciones-b">'
    +(url?'<button class="b-osc" onclick="abrirUrl(actual,\''+esc(url)+'\')">'+ic('abrirFuera',16)+'Abrir '+esc(url.replace(/^https?:\/\//,''))+'</button>':'')
    +(vivo?'<button class="b-det" onclick="runStop('+L.indexOf(vivo)+')">Detener</button>':(l0&&!l0.sugerido?'<button class="b-osc" onclick="runStart(0)">'+ic('play',16)+esc(l0.nombre)+'</button>':''))
    +'<button class="b-bla" onclick="abrirEn(actual,\'finder\',\'.\')">'+ic('finder',16)+'Finder</button><button class="b-bla" onclick="abrirEn(actual,\'terminal\',\'.\')">'+ic('terminal',16)+'Terminal</button>'
    +'<button class="b-bla'+(CONSOLA.abierta?' on':'')+'" onclick="alternarConsola()" aria-pressed="'+CONSOLA.abierta+'">'+ic('codigo',16)+'Consola</button><button class="b-osc" onclick="dialogoPieza()">'+ic('nuevo',16)+'Pieza</button>'
    +'</div></div></div></section>';
}
function irA(t){tab=t;specAbierto=sqlAbierto=null;piezaAbierta=null;PZ=null;if(typeof panelSql!=='undefined'&&panelSql){panelSql=null;pintarPanelSql()}if(t!=='proyecto')editTmn=null;pintarNav();pintar()}
// Al volver a pintar el mismo lugar (marcar, guardar, recargar datos) la pantalla se queda donde estabas, en todo Timón.
let ULT_CLAVE='';
function pintar(){
  const clave=rutaActual(),y=window.scrollY,m=$('#main'),mismo=clave===ULT_CLAVE;ULT_CLAVE=clave;
  if(mismo&&m&&m.offsetHeight)m.style.minHeight=m.offsetHeight+'px';
  const foco=focoActual();
  const r=pintar0();
  volverFoco(foco);
  Promise.resolve(r).then(()=>{volverFoco(foco);if(mismo&&Math.abs(window.scrollY-y)>2)window.scrollTo(0,y);if(m)m.style.minHeight=''}).catch(()=>{if(m)m.style.minHeight=''});
  return r;
}
// Al repintar mientras escribes (por ejemplo el buscador de Piezas) el cursor se queda en su campo.
function focoActual(){const a=document.activeElement;if(!a||!/INPUT|TEXTAREA/.test(a.tagName)||!a.closest('#main'))return null;
  const k=a.id?'#'+CSS.escape(a.id):a.getAttribute('aria-label')?a.tagName.toLowerCase()+'[aria-label="'+CSS.escape(a.getAttribute('aria-label'))+'"]':a.placeholder?a.tagName.toLowerCase()+'[placeholder="'+CSS.escape(a.placeholder)+'"]':null;
  return k?{k,v:a.value,i:a.selectionStart,f:a.selectionEnd}:null}
function volverFoco(f){if(!f)return;const e=document.querySelector('#main '+f.k);if(!e||document.activeElement===e)return;if(e.value!==f.v&&f.v!==undefined)e.value=f.v;e.focus({preventScroll:true});try{e.setSelectionRange(f.i,f.f)}catch(x){}}
function pintar0(){
  const m=$('#main');
  if(tab==='timon')return pintarTimon();
  if(!actual&&tab==='vtodos')return pintarVTodos(m);
  if(!actual&&tab==='cobranza')return pintarCobranza(m);
  if(!actual&&tab==='nuevo')return pintarNuevo(m);
  if(!actual&&tab==='tiempo')return pintarCalendario(m);
  if(!actual)return pintarGeneral();
  if(tab==='verificar')return pintarVerificar(m);
  if(tab==='cobros')return pintarCobros(m);
  if(tab==='salud')return pintarSalud(m);
  if(tab==='tablero')return pintarTablero(m);
  if(tab==='inbox')return pintarInbox(m);
  if(tab==='specs')return pintarSpecs(m);
  if(tab==='sql')return pintarSql(m);
  if(tab==='docs')return pintarDocs(m);
  if(tab==='puntos')return pintarPuntos(m);
  if(tab==='archivos')return pintarArchivos(m);
  if(tab==='proyecto')return pintarConfig(m);
  if(tab==='mapa')return pintarMapa(m);
  if(tab==='piezas')return pintarPiezas(m);
  if(tab==='carriles')return pintarCarriles(m);
  if(tab==='tabla')return pintarTabla(m);
  if(tab==='textos')return pintarTextos(m);
  if(tab==='metricas')return pintarMetricas(m);
  if(tab==='etapas')return pintarEtapasTiempo(m);
  if(tab==='tpiezas')return pintarPiezasTiempo(m);
  if(tab==='run')return pintarRun(m);
}
// Notas a mano (TMN-036): naranja = habla Timón, azul = tu nota. Máximo una de Timón por pantalla.
function notaTimon(t){return '<div class="nota-mano en-banda">'+ic('alerta',22)+esc(t)+'</div>'}
function notaTuya(t){return '<div class="nota-mano tuya">'+ic('nota',22)+esc(t)+'</div>'}
