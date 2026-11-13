// Timón · Fase 5: ⌘K Buscar y hacer (tablero 05)
// Busca proyectos, piezas (por ID o texto) e ideas de todos los proyectos, y hace cosas:
// "nueva pieza en RB", "arrancar PartyBot", "cobro de Idea", "probar RB-295".
let PAL={abierta:false,q:'',res:[],sel:0,timer:null,seq:0};
const sa=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function abrirPaleta(q){
  if(PAL.abierta){const i=$('#palQ');if(i)i.focus();return}
  PAL={abierta:true,q:q||'',res:[],sel:0,timer:null,seq:0};
  const g=$('#gBuscar');if(g){g.value='';g.blur()}
  const d=document.createElement('div');d.className='paleta-fondo';d.id='paleta';
  d.innerHTML='<div class="paleta" role="dialog" aria-modal="true" aria-label="Buscar y hacer"><div class="pal-in">'+ic('buscar',20)+'<input id="palQ" type="text" autocomplete="off" spellcheck="false" placeholder="Proyecto, pieza, idea o acción: «nueva pieza en RB», «probar RB-295»" value="'+esc(PAL.q)+'"><kbd>esc</kbd></div><div class="pal-res" id="palRes" role="listbox"></div><div class="pal-pie"><span><kbd>↑</kbd><kbd>↓</kbd> moverte</span><span><kbd>↵</kbd> abrir</span><span><kbd>esc</kbd> cerrar</span></div></div>';
  d.addEventListener('mousedown',e=>{if(e.target===d)cerrarPaleta()});
  document.body.appendChild(d);
  const i=$('#palQ');i.focus();i.select();
  i.addEventListener('input',()=>{PAL.q=i.value;PAL.sel=0;buscarPaleta()});
  i.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();cerrarPaleta()}
    else if(e.key==='ArrowDown'){e.preventDefault();PAL.sel=Math.min(PAL.res.length-1,PAL.sel+1);pintarPaleta()}
    else if(e.key==='ArrowUp'){e.preventDefault();PAL.sel=Math.max(0,PAL.sel-1);pintarPaleta()}
    else if(e.key==='Enter'){e.preventDefault();ejecutarPaleta(PAL.sel)}
  });
  buscarPaleta();
}
function cerrarPaleta(){const d=$('#paleta');if(d)d.remove();PAL.abierta=false}
// acciones que no necesitan al servidor
function accionesPaleta(q){
  const A=[];
  const add=(t,d,icn,f,clave)=>A.push({tipo:'accion',titulo:t,detalle:d,ic:icn,f,clave:sa(clave||t+' '+d)});
  add('Hoy','todos los proyectos','hoy',()=>irGeneral(),'hoy inicio proyectos');
  add('Probar','lo que falta verificar en todo','probar',()=>irVista('vtodos'),'probar verificar');
  add('Cobro','cobrado, por cobrar y por decidir','cobro',()=>irVista('cobranza'),'cobro cobranza cobrar');
  add('Calendario','todos los proyectos por etapa','calendario',()=>{TG=null;irVista('tiempo')},'calendario gantt tiempo etapas fechas');
  add('Ajustes','versión, cobro base y carpetas','ajustes',()=>irTimon(),'ajustes configuracion actualizar timon');
  add('Proyecto nuevo','⌘N','nuevo',()=>irNuevo(),'nuevo proyecto crear');
  add('Traer un proyecto empezado','adoptar una carpeta que no tenía Timón','carpeta',()=>{nwModo='adoptar';irNuevo()},'traer adoptar incorporar empezado existente');
  if(actual&&S){
    const cod=S.proyecto.codigo;
    add('Nueva pieza en '+cod,S.proyecto.nombre,'nuevo',()=>dialogoPieza(),'nueva pieza registrar solicitud '+cod+' '+S.proyecto.nombre);
    add(CONSOLA.abierta?'Cerrar la consola':'Abrir la consola',S.proyecto.nombre,'codigo',()=>alternarConsola(),'consola logs');
    GRUPOS.forEach(g=>g.sub.forEach(([t,l])=>add((g.sub.length>1?g.l+' › ':'')+l,S.proyecto.nombre,g.ic,()=>irA(t),g.l+' '+l)));
  }
  for(const p of PROY){
    const nom=p.nombre+' '+p.codigo,l=p.lanzadores||[],vivo=l.findIndex(x=>x.corriendo);
    if(vivo>=0)add('Detener '+p.nombre,l[vivo].nombre,'stop',()=>rapido(p.id,vivo,1),'detener parar '+nom);
    else if(l[0]&&!l[0].sugerido)add('Arrancar '+p.nombre,l[0].nombre,'play',()=>rapido(p.id,0,0),'arrancar iniciar correr lanzar '+nom);
    add('Nueva pieza en '+p.nombre,p.codigo,'nuevo',async()=>{await entrar(p.id,'piezas');dialogoPieza()},'nueva pieza registrar solicitud en '+nom);
    add('Cobro de '+p.nombre,p.codigo,'cobro',()=>entrar(p.id,'cobros'),'cobro cobrar cobranza de '+nom);
    add('Probar en '+p.nombre,p.codigo,'probar',()=>entrar(p.id,'verificar'),'probar verificar en '+nom);
    add('Ideas de '+p.nombre,p.codigo,'ideas',()=>entrar(p.id,'inbox'),'ideas inbox de '+nom);
  }
  if(!q)return A.slice(0,actual?8:6);
  const w=sa(q).split(/\s+/).filter(x=>x&&!['de','en','el','la','a'].includes(x));
  return A.filter(a=>w.length&&w.every(x=>a.clave.includes(x)));
}
function buscarPaleta(){
  clearTimeout(PAL.timer);
  const q=PAL.q.trim(),acc=accionesPaleta(q);
  // "probar RB-295" → la pieza, directo a Probar
  const m=q.match(/^(probar|verificar)\s+([A-Za-z][A-Za-z0-9_]*-\d+)$/i);
  PAL.res=acc;pintarPaleta();
  if(!q)return;
  const seq=++PAL.seq;
  PAL.timer=setTimeout(async()=>{
    try{
      const r=await api('/api/buscar?q='+encodeURIComponent(m?m[2]:q));if(seq!==PAL.seq)return;
      let it=r.items;
      if(m)it=it.filter(x=>x.tipo==='pieza'&&(sa(x.id)===sa(m[2])||/✅/.test(x.estado||''))).sort((a,b)=>(sa(b.id)===sa(m[2]))-(sa(a.id)===sa(m[2]))).map(x=>({...x,probar:true}));
      PAL.res=(m?[]:acc.slice(0,6)).concat(it);if(m)PAL.res=PAL.res.concat(acc.slice(0,4));
      PAL.sel=Math.min(PAL.sel,Math.max(0,PAL.res.length-1));pintarPaleta();
    }catch(e){}
  },140);
}
function pintarPaleta(){
  const el=$('#palRes');if(!el)return;
  if(!PAL.res.length){el.innerHTML='<div class="pal-vacio">'+(PAL.q.trim()?'Nada con «'+esc(PAL.q)+'».':'Escribe para buscar.')+'</div>';return}
  let h='',ult='';
  const ETQ={accion:'Hacer',proyecto:'Proyectos',hilo:'Hilos',pieza:'Piezas',idea:'Ideas'},ICN={proyecto:'proyecto',hilo:'enlace',pieza:'piezas',idea:'ideas'};
  PAL.res.forEach((x,i)=>{
    if(x.tipo!==ult){h+='<div class="pal-sec">'+ETQ[x.tipo]+'</div>';ult=x.tipo}
    h+='<button class="pal-item'+(i===PAL.sel?' on':'')+'" role="option" aria-selected="'+(i===PAL.sel)+'" onmousemove="if(PAL.sel!=='+i+'){PAL.sel='+i+';pintarPaleta()}" onclick="ejecutarPaleta('+i+')">'
      +ic(x.ic||ICN[x.tipo]||'info',18)+(x.id?'<code>'+esc(x.id)+'</code>':x.codigo&&x.tipo!=='accion'?'<code>'+esc(x.codigo)+'</code>':'')
      +'<span class="t">'+esc(x.probar?'Probar · '+x.titulo:x.titulo)+'</span><span class="d">'+esc(x.detalle||'')+(x.estado?' · '+ESTADO_CORTO(x.estado):'')+'</span></button>';
  });
  el.innerHTML=h;
  const on=el.querySelector('.on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest'});
}
async function ejecutarPaleta(i){
  const x=PAL.res[i];if(!x)return;
  cerrarPaleta();
  if(x.tipo==='accion')return x.f();
  if(x.tipo==='proyecto')return entrar(x.pid,'tablero');
  if(x.tipo==='pieza'){if(x.probar){VER=[];vFoco=x.id;return entrar(x.pid,'verificar')}return entrar(x.pid,'piezas',x.id)}
  if(x.tipo==='hilo'){carFoco=x.id;return entrar(x.pid,'carriles')}
  if(x.tipo==='idea'){idFiltro='todas';idAbierta=x.n;return entrar(x.pid,'inbox')}
}
// el campo de la barra superior abre la paleta
(()=>{const g=document.getElementById('gBuscar');if(g){g.addEventListener('focus',()=>abrirPaleta(g.value));g.setAttribute('readonly','')}})();
