// Timón · Pestañas de proyectos y memoria de ruta (TMN-012, TMN-013)
// ---- Pestañas de proyectos y ruta (TMN-012, TMN-013): se recuerda dónde estabas ----
// Se guarda en el navegador y, de respaldo, en el panel (/api/ui): la app de Mac a veces pierde el almacenamiento del navegador.
let UI_SRV={},uiPend={},uiTimer=null;
function uiEnviar(){const b=JSON.stringify(uiPend);uiPend={};uiTimer=null;try{fetch('/api/ui',{method:'POST',body:b,keepalive:true})}catch(e){}}
const LS={get(k,d){try{const v=localStorage.getItem(k);if(v)return JSON.parse(v)}catch(e){}return UI_SRV[k]!==undefined?UI_SRV[k]:d},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}UI_SRV[k]=v;uiPend[k]=v;if(!uiTimer)uiTimer=setTimeout(uiEnviar,400)}};
async function cargarUiServidor(){try{UI_SRV=await (await fetch('/api/ui')).json()||{}}catch(e){UI_SRV={}}if(!TABS.length)TABS=LS.get('timon.tabs',[])}
const VISTAS_G=['general','vtodos','cobranza','tiempo','nuevo','timon'];
const TABS_P=['tablero','metricas','etapas','tpiezas','mapa','piezas','carriles','tabla','textos','verificar','salud','inbox','specs','sql','docs','archivos','puntos','cobros','run','proyecto'];
const FONDO_G={general:'#4F46E5',timon:'#E3E7FF',vtodos:'#FFE9C7',cobranza:'#C9EEDD',tiempo:'#DCE4FF',nuevo:'#FAD3E4'};
let TABS=LS.get('timon.tabs',[]),SCROLL={};
function rutaActual(){return actual?'#/p/'+encodeURIComponent(actual)+'/'+tab+(tab==='piezas'&&typeof piezaAbierta!=='undefined'&&piezaAbierta?'/'+encodeURIComponent(piezaAbierta):''):'#/'+(VISTAS_G.includes(tab)?tab:'general')}
function recordarRuta(){
  const h=rutaActual();
  // cada cambio de lugar queda en el historial: Atrás y Adelante funcionan (al abrir o restaurar solo se reemplaza)
  if(location.hash!==h){if(!location.hash||RESTAURANDO)history.replaceState(null,'',h);else{ALTURAS[location.hash]=window.scrollY;history.pushState(null,'',h)}}
  LS.set('timon.ruta',h);
  if(actual){const t=TABS.find(x=>x.id===actual);if(t)t.tab=tab;else TABS.push({id:actual,tab});LS.set('timon.tabs',TABS)}
  else if(VISTAS_G.includes(tab))LS.set('timon.vistaG',tab);
  pintarTabs();
}
function leerRuta(h){
  const m=String(h||'').match(/^#\/p\/([^/]+)\/([a-z]+)(?:\/([^/]+))?$/);
  if(m)return {id:decodeURIComponent(m[1]),tab:TABS_P.includes(m[2])?m[2]:'tablero',pieza:m[3]&&m[2]==='piezas'?decodeURIComponent(m[3]):null};
  const g=String(h||'').match(/^#\/([a-z]+)$/);
  return g&&VISTAS_G.includes(g[1])?{vista:g[1]}:null;
}
async function irRuta(r){
  if(r&&r.id&&PROY.some(p=>p.id===r.id))return entrar(r.id,r.tab,r.tab==='piezas'?r.pieza:undefined);
  if(r&&r.vista==='timon')return irTimon();
  if(r&&r.vista&&r.vista!=='general')return irVista(r.vista);
  return irGeneral();
}
function irInicio(){if(actual)SCROLL[actual]=window.scrollY;const v=LS.get('timon.vistaG','general');irRuta({vista:v})}
async function irTab(i){
  const t=TABS[i];if(!t)return;
  if(actual===t.id)return;
  if(actual)SCROLL[actual]=window.scrollY;
  await entrar(t.id,t.tab);
  const y=SCROLL[t.id];if(y)volverAltura(y);
}
function cerrarTab(i,e){
  if(e){e.stopPropagation();e.preventDefault()}
  const t=TABS[i];if(!t)return;
  TABS.splice(i,1);LS.set('timon.tabs',TABS);delete SCROLL[t.id];
  if(t.id!==actual)return pintarTabs();
  const n=TABS[i]||TABS[i-1];
  if(n)entrar(n.id,n.tab);else irInicio();
}
function moverTab(d){
  const orden=[null].concat(TABS.map(t=>t.id)),i=orden.indexOf(actual);
  const n=orden[(i+d+orden.length)%orden.length];
  if(n===null)irInicio();else irTab(TABS.findIndex(t=>t.id===n));
}
// TMN-067: reordenar pestañas arrastrándolas; el orden se guarda igual que las pestañas (timon.tabs)
let TAB_ARR=null;
const tabLado=e=>{const r=e.currentTarget.getBoundingClientRect();return e.clientX>r.left+r.width/2?'der':'izq'};
function tabLimpiarDrop(){document.querySelectorAll('#tabs .drop-izq,#tabs .drop-der').forEach(x=>x.classList.remove('drop-izq','drop-der'))}
function tabArrastre(i,e){TAB_ARR=i;try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i))}catch(_){}e.currentTarget.classList.add('arrastrando')}
function tabSobre(i,e){if(TAB_ARR===null)return;e.preventDefault();try{e.dataTransfer.dropEffect='move'}catch(_){}const lado=tabLado(e);tabLimpiarDrop();if(i!==TAB_ARR)e.currentTarget.classList.add('drop-'+lado)}
function tabSoltar(i,e){
  e.preventDefault();const de=TAB_ARR;TAB_ARR=null;tabLimpiarDrop();
  if(de===null||de===i){pintarTabs();return}
  let a=i+(tabLado(e)==='der'?1:0);if(a>de)a--;
  const [t]=TABS.splice(de,1);TABS.splice(a,0,t);LS.set('timon.tabs',TABS);pintarTabs();
}
function tabFinArrastre(){if(TAB_ARR===null)return;TAB_ARR=null;tabLimpiarDrop();pintarTabs()}
function pintarTabs(){
  const el=$('#tabs');if(!el)return;
  TABS=TABS.filter(t=>PROY.some(p=>p.id===t.id));
  if(!TABS.length){el.innerHTML='';el.style.display='none';return}
  el.style.display='';
  const casaOn=!actual,fg=FONDO_G[tab]||FONDO_G.general;
  let h='<button class="tab casa'+(casaOn?' on':'')+'"'+(casaOn?' style="background:'+fg+';color:'+(tab==='general'?'#fff':'var(--tx)')+'"':'')+' onclick="irInicio()" title="Inicio (⌃⇧Tab / ⌃Tab para moverte entre pestañas)">'+ICO.casa+'<span>Inicio</span></button>';
  TABS.forEach((t,i)=>{
    const p=PROY.find(x=>x.id===t.id),c=colorCliente(p.cliente),on=actual===t.id,vivo=p.lanzadores.some(l=>l.corriendo);
    h+='<div class="tab'+(on?' on':'')+'"'+(on?' style="background:'+c[2]+'"':'')+' role="button" tabindex="0" draggable="true" ondragstart="tabArrastre('+i+',event)" ondragover="tabSobre('+i+',event)" ondragleave="this.classList.remove(\'drop-izq\',\'drop-der\')" ondrop="tabSoltar('+i+',event)" ondragend="tabFinArrastre()" onclick="irTab('+i+')" onauxclick="if(event.button===1)cerrarTab('+i+',event)" title="'+esc(p.nombre)+(p.cliente?' · '+esc(p.cliente):'')+'">'
      +'<button class="x" draggable="false" aria-label="Cerrar pestaña de '+esc(p.nombre)+'" onclick="cerrarTab('+i+',event)">×</button>'
      +'<span class="pt" style="background:'+(p.color||c[0])+'"></span><span class="nm">'+esc(p.nombre)+'</span>'+(vivo?'<span class="dot on" title="Corriendo"></span>':'')+'</div>';
  });
  el.innerHTML=h;
  const on=el.querySelector('.tab.on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest',inline:'nearest'});
}
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&!e.metaKey&&e.key==='Tab'){e.preventDefault();moverTab(e.shiftKey?-1:1)}
  else if(e.metaKey&&e.shiftKey&&(e.key===']'||e.key==='}')){e.preventDefault();moverTab(1)}
  else if(e.metaKey&&e.shiftKey&&(e.key==='['||e.key==='{')){e.preventDefault();moverTab(-1)}
});
let RESTAURANDO=false;const ALTURAS={};
async function alNavegar(){if(location.hash===rutaActual())return;const h=location.hash;RESTAURANDO=true;try{await irRuta(leerRuta(h))}finally{RESTAURANDO=false}if(ALTURAS[h])volverAltura(ALTURAS[h])}
window.addEventListener('popstate',alNavegar);
window.addEventListener('hashchange',alNavegar);
function atras(){history.back()}
function adelante(){history.forward()}
document.addEventListener('keydown',e=>{if(e.metaKey&&!e.shiftKey&&!e.altKey&&(e.key==='['||e.key==='ArrowLeft')&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')){e.preventDefault();atras()}else if(e.metaKey&&!e.shiftKey&&!e.altKey&&(e.key===']'||e.key==='ArrowRight')&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')){e.preventDefault();adelante()}});
window.addEventListener('beforeunload',()=>{const v={h:rutaActual(),y:window.scrollY};try{localStorage.setItem('timon.scroll',JSON.stringify(v))}catch(e){}uiPend['timon.scroll']=v;const b=JSON.stringify(uiPend);uiPend={};try{navigator.sendBeacon('/api/ui',b)}catch(e){}});
let scrollT=null;window.addEventListener('scroll',()=>{clearTimeout(scrollT);scrollT=setTimeout(()=>LS.set('timon.scroll',{h:rutaActual(),y:window.scrollY}),600)},{passive:true});
async function restaurarRuta(){RESTAURANDO=true;try{await restaurarRuta0()}finally{RESTAURANDO=false}}
async function restaurarRuta0(){
  const destino=leerRuta(location.hash)?location.hash:LS.get('timon.ruta','');
  const s=LS.get('timon.scroll',null),conAltura=!!(s&&s.y&&s.h===destino);
  if(conAltura)document.body.classList.add('restaurando');
  try{await irRuta(leerRuta(destino))}finally{if(conAltura&&s.h===rutaActual())volverAltura(s.y,true);else document.body.classList.remove('restaurando')}
}
// Las secciones cargan su contenido después de pintar: se espera a que la página sea lo bastante alta (hasta 4 s).
// Al abrir o recargar, el contenido queda oculto mientras tanto para que no se vea el brinco (sin parpadeo).
function volverAltura(y,ocultar){const t0=Date.now();if(ocultar)document.body.classList.add('restaurando');
  const fin=()=>{document.body.classList.remove('restaurando')};
  const paso=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;
    if(max>=y-2||Date.now()-t0>4000){window.scrollTo(0,Math.min(y,Math.max(0,max)));requestAnimationFrame(fin);return}setTimeout(paso,60)};paso()}
