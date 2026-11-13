// Timón · Fase 7: Tiempo (TMN-037). Gantt de tres vistas: Calendario (todos), Etapas y Piezas (de un proyecto).
// Sin dependencias ni ruta crítica: solo cuándo pasó cada cosa, contra lo que se planeó.
const DIA=864e5,fD=s=>Date.parse(s+'T12:00:00'),sumD=(s,n)=>new Date(fD(s)+n*DIA).toISOString().slice(0,10);
const MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const fCorta=s=>s?fFecha(s):'';
const ETAPA_COLOR={brief:'e-brief',descubrimiento:'e-desc',cotizacion:'e-cot',aceptado:'e-acep',construccion:'e-cons',entregado:'e-ent',mantenimiento:'e-mant'};
const nomEtapa=e=>(ETAPAS_UI.find(x=>x[0]===e)||[0,e])[1];
// escala: de "ini" a "fin"; pos() da el % horizontal de una fecha
function escala(ini,fin){const t=Math.max(1,(fD(fin)-fD(ini))/DIA);return {ini,fin,dias:t,pos:f=>Math.max(0,Math.min(100,(fD(f)-fD(ini))/DIA/t*100)),ancho:(a,b)=>Math.max(.4,(Math.min(fD(b),fD(fin))-Math.max(fD(a),fD(ini)))/DIA/t*100),dentro:(a,b)=>!(b<ini||a>fin)}}
function cabeceraMeses(E){
  let h='<div class="gt-meses">',d=new Date(fD(E.ini));d.setDate(1);
  while(d.toISOString().slice(0,10)<=E.fin){const s=d.toISOString().slice(0,10),x=E.pos(s<E.ini?E.ini:s);d.setMonth(d.getMonth()+1);const s2=d.toISOString().slice(0,10),w=E.pos(s2>E.fin?E.fin:s2)-x;
    if(w>0)h+='<span style="left:'+x+'%;width:'+w+'%">'+MESES[+s.slice(5,7)-1]+(s.slice(5,7)==='01'||x===0?' '+s.slice(0,4):'')+'</span>'}
  return h+'</div>';
}
const lineaHoy=(E,hoy)=>hoy>=E.ini&&hoy<=E.fin?'<i class="gt-hoy" style="left:'+E.pos(hoy)+'%" title="Hoy"></i>':'';
const rombo=(E,p)=>E.dentro(p.fecha,p.fecha)?'<i class="gt-pago '+p.estado+'" style="left:'+E.pos(p.fecha)+'%" title="'+esc(fCorta(p.fecha)+' · '+p.concepto+' · $'+fmtN(p.monto)+' · '+p.estado)+'"></i>':'';
function gbarra(E,a,b,cls,txt,titulo){if(!E.dentro(a,b))return '';return '<i class="gt-b '+cls+'" style="left:'+E.pos(a<E.ini?E.ini:a)+'%;width:'+E.ancho(a,b)+'%" title="'+esc(titulo||txt||'')+'">'+(txt?'<span>'+esc(txt)+'</span>':'')+'</i>'}
const leyendaEtapas='<div class="gt-ley">'+ETAPAS_UI.map(([k,n])=>'<span><i class="gt-b '+ETAPA_COLOR[k]+'"></i>'+n+'</span>').join('')+'<span><i class="gt-b plan"></i>Planeado</span><span><i class="gt-pago pagado"></i>Pago cobrado</span><span><i class="gt-pago pendiente"></i>Por cobrar</span><span><i class="gt-pago vencido"></i>Vencido</span><span><i class="gt-hito"></i>Hito</span></div>';

// ---------------- Calendario: todos los proyectos ----------------
let TG=null,tgMeses=6,tgMover=0;
async function pintarCalendario(m){
  if(!TG){m.innerHTML='<section class="seccion">Cargando el calendario…</section>';TG=await api('/api/tiempo')}
  const hoy=TG.hoy,antes=Math.round(tgMeses*30/3),ini=sumD(hoy,-antes+tgMover*30),fin=sumD(ini,tgMeses*30),E=escala(ini,fin);
  let h='<div class="gt-barra"><span class="seg">'+[[3,'3 meses'],[6,'6 meses'],[12,'Año']].map(([n,l])=>'<button class="'+(tgMeses===n?'on':'')+'" onclick="tgMeses='+n+';pintar()">'+l+'</button>').join('')+'</span>'
    +'<span class="seg"><button onclick="tgMover--;pintar()" aria-label="Antes">'+ic('anterior',16)+'</button><button onclick="tgMover=0;pintar()">Hoy</button><button onclick="tgMover++;pintar()" aria-label="Después">'+ic('siguiente',16)+'</button></span>'
    +'<span class="aviso" style="margin:0 0 0 auto">'+fCorta(ini)+' a '+fCorta(fin)+'</span></div>';
  const P=TG.proyectos.filter(x=>x.estado!=='idea'),grupos={};
  P.forEach(x=>{(grupos[x.cliente||'Sin cliente']=grupos[x.cliente||'Sin cliente']||[]).push(x)});
  h+='<section class="seccion gt">'+'<div class="gt-fila gt-cab"><div class="gt-lbl"></div><div class="gt-lane">'+cabeceraMeses(E)+'</div></div>';
  for(const g of Object.keys(grupos).sort((a,b)=>a.localeCompare(b,'es'))){
    const c=colorCliente(g);
    h+='<div class="gt-grupo"><span class="sw" style="background:'+c[0]+'"></span>'+esc(g)+'</div>';
    for(const x of grupos[g]){
      h+='<button class="gt-fila" onclick="entrar(\''+x.id+'\',\'etapas\')"><div class="gt-lbl"><code style="background:'+(x.color||c[0])+'">'+esc(x.codigo)+'</code><span>'+esc(x.nombre)+'</span></div><div class="gt-lane">'
        +Object.entries(x.plan).filter(([,v])=>v.inicio&&v.fin).map(([k,v])=>gbarra(E,v.inicio,v.fin,'plan','',nomEtapa(k)+' planeado: '+fCorta(v.inicio)+' a '+fCorta(v.fin))).join('')
        +x.real.map(r=>gbarra(E,r.desde,r.hasta,ETAPA_COLOR[r.etapa]+(r.aprox?' aprox':'')+(r.abierta?' abierta':''),nomEtapa(r.etapa),nomEtapa(r.etapa)+': '+fCorta(r.desde)+' a '+(r.abierta?'hoy':fCorta(r.hasta))+(r.aprox?' (inicio aproximado)':''))).join('')
        +x.pagos.map(p=>rombo(E,p)).join('')+(x.hitos||[]).filter(t=>E.dentro(t.fecha,t.fecha)).map(t=>'<i class="gt-hito'+(t.hecho?' hecho':'')+'" style="left:'+E.pos(t.fecha)+'%" title="'+esc(t.nombre+' · '+fCorta(t.fecha))+'"></i>').join('')+lineaHoy(E,hoy)+'</div></button>';
    }
  }
  if(!P.length)h+='<div class="aviso" style="padding:14px">Todavía no hay etapas ni pagos con fecha.</div>';
  // carga: proyectos en construcción por mes
  const meses=[];let d=new Date(fD(ini));d.setDate(1);while(d.toISOString().slice(0,10)<=fin){meses.push(d.toISOString().slice(0,7));d.setMonth(d.getMonth()+1)}
  const max=Math.max(1,...meses.map(k=>TG.carga[k]||0));
  h+='<div class="gt-fila gt-carga"><div class="gt-lbl"><span>En construcción</span></div><div class="gt-lane">'+meses.map(k=>{const a=k+'-01'<ini?ini:k+'-01',n=TG.carga[k]||0;const s=new Date(fD(k+'-01'));s.setMonth(s.getMonth()+1);const b=s.toISOString().slice(0,10);return n?'<i class="gt-c" style="left:'+E.pos(a)+'%;width:'+(E.pos(b>fin?fin:b)-E.pos(a))+'%"><b style="height:'+(n/max*100)+'%"></b><span>'+n+'</span></i>':''}).join('')+lineaHoy(E,hoy)+'</div></div>';
  h+='</section>'+leyendaEtapas;
  m.innerHTML=h;
}

// ---------------- Etapas de un proyecto: plan contra real, editable aquí mismo ----------------
let TP=null,TPE=null,tpSug=null;
async function cargarTP(){if(!TP||TP.pid!==actual){TP=await api('/api/tiempo/proyecto'+qp());TP.pid=actual}return TP}
async function pintarEtapasTiempo(m){
  if(!TP||TP.pid!==actual)m.innerHTML='<section class="seccion">Cargando…</section>';
  const T=await cargarTP();if(tab!=='etapas')return;
  const hoy=T.hoy,plan=T.plan,R=T.ritmo||{},act=T.real.find(r=>r.abierta),hitos=T.hitos||[];
  const fechas=[hoy,...T.real.flatMap(r=>[r.desde,r.hasta]),...Object.values(plan).flatMap(v=>[v.inicio,v.fin]),...T.pagos.map(p=>p.fecha),...hitos.map(h=>h.fecha)].filter(Boolean).sort();
  let finE=fechas[fechas.length-1];if(R.termina&&R.termina>finE)finE=R.termina<sumD(hoy,120)?R.termina:sumD(hoy,120);
  const E=escala(sumD(fechas[0],-10),sumD(finE,21));TPE=E;
  const pe=act&&plan[act.etapa]&&plan[act.etapa].fin,dif=pe&&R.termina?Math.round((fD(R.termina)-fD(pe))/DIA):null;
  let h='<div class="gt-barra"><label class="gt-sel">Etapa actual <select onchange="cambiarEtapaGt(this.value)"><option value="">Sin etapa…</option>'+ETAPAS_UI.map(([k,n])=>'<option value="'+k+'"'+(T.etapa===k?' selected':'')+'>'+n+'</option>').join('')+'</select></label>'
    +'<label class="gt-sel">Tamaño <select id="gtTam">'+['chico','mediano','grande'].map(t=>'<option value="'+t+'"'+((T.tamano||'mediano')===t?' selected':'')+'>'+t[0].toUpperCase()+t.slice(1)+'</option>').join('')+'</select></label>'
    +'<button class="btn sec" onclick="sugerirGt()">'+ic('sugerir',16)+'Sugerir fechas</button><button class="btn sec" onclick="editarHito()">'+ic('etapa',16)+'Hito</button>'
    +'<span class="aviso" style="margin:0 0 0 auto">'+(Object.keys(plan).length?(T.planAuto?'Plan puesto por Timón':'Plan tuyo'):'Sin plan todavía')+'</span></div>';
  if(tpSug)h+=panelSugGt(tpSug,plan);
  h+='<div class="cards">'+card(act?nomEtapa(act.etapa):(T.etapa?nomEtapa(T.etapa):'—'),'Etapa actual'+(act?' · '+Math.max(0,Math.round((fD(hoy)-fD(act.desde))/DIA))+' días':''),'azul')
    +card(pe?fCorta(pe):'—','Fin planeado de la etapa')+card(R.termina?fCorta(R.termina):'—','Al ritmo actual'+(dif!==null?' · '+(dif>0?'+':'')+dif+' días':''),dif>7?'alerta':dif!==null?'bien':'')
    +card(R.porSemana!==undefined?String(R.porSemana).replace('.',','):'—','Piezas verificadas por semana ('+(R.abiertas||0)+' abiertas)')+'</div>';
  h+='<section class="seccion gt gt-edit"><div class="gt-fila gt-cab"><div class="gt-lbl"></div><div class="gt-lane">'+cabeceraMeses(E)+'</div></div>';
  for(const [k,n] of ETAPAS_UI){
    const p=plan[k],rs=T.real.filter(r=>r.etapa===k);
    h+='<div class="gt-fila gt-alta'+(T.etapa===k?' actual':'')+'"><div class="gt-lbl"><span>'+n+'</span><button class="gt-fechas" onclick="editarEtapa(\''+k+'\')" title="Cambiar las fechas planeadas">'+(p&&p.inicio?fCorta(p.inicio)+' a '+fCorta(p.fin):'+ fechas')+'</button></div><div class="gt-lane" data-e="'+k+'" onclick="clicCarril(event,\''+k+'\')">'
      +(p&&p.inicio&&p.fin&&E.dentro(p.inicio,p.fin)?'<i class="gt-b plan arriba mov" data-e="'+k+'" style="left:'+E.pos(p.inicio<E.ini?E.ini:p.inicio)+'%;width:'+E.ancho(p.inicio,p.fin)+'%" title="Arrastra para mover; los bordes cambian inicio y fin"><b class="h ini"></b><b class="h fin"></b></i>':'')
      +rs.map(r=>gbarra(E,r.desde,r.hasta,ETAPA_COLOR[k]+' abajo'+(r.aprox?' aprox':''),fCorta(r.desde)+(r.abierta?' → hoy':' a '+fCorta(r.hasta)),n+' real'+(r.aprox?' (inicio aproximado)':''))).join('')
      +(rs.some(r=>r.abierta)&&R.termina&&R.termina>hoy?gbarra(E,hoy,R.termina,'proy abajo','al ritmo actual: '+fCorta(R.termina),'Al ritmo actual ('+R.porSemana+' por semana) termina el '+fCorta(R.termina)):'')
      +lineaHoy(E,hoy)+'</div></div>';
  }
  if(hitos.length){h+='<div class="gt-grupo">Hitos</div>';hitos.forEach((x,i)=>{h+='<div class="gt-fila"><div class="gt-lbl"><button class="gt-hito-n'+(x.hecho?' hecho':'')+'" onclick="editarHito('+i+')">'+(x.hecho?'✓ ':'')+esc(x.nombre)+'</button><span class="gt-fechas">'+fCorta(x.fecha)+'</span></div><div class="gt-lane">'+(E.dentro(x.fecha,x.fecha)?'<i class="gt-hito mov'+(x.hecho?' hecho':'')+'" data-h="'+i+'" style="left:'+E.pos(x.fecha)+'%" title="'+esc(x.nombre+' · '+fCorta(x.fecha))+' (arrastra para moverlo)"></i>':'')+lineaHoy(E,hoy)+'</div></div>'})}
  if(T.pagos.length)h+='<div class="gt-fila"><div class="gt-lbl"><span>Pagos</span></div><div class="gt-lane">'+T.pagos.map(p=>rombo(E,p)).join('')+lineaHoy(E,hoy)+'</div></div>';
  m.innerHTML=h+'</section>'+leyendaEtapas+'<div class="aviso"><b>Cómo se usa:</b> la barra punteada de arriba es lo que planeas; la de color de abajo es lo que pasó de verdad. Arrastra la punteada para moverla, sus bordes para cambiar inicio o fin, o da clic en las fechas de la izquierda. En una etapa sin plan, da clic en su fila para crearle una semana ahí. Si la barra de color se pasa de la punteada, vas tarde.</div>';
  activarArrastre();
}
// ---- edición ----
async function guardarPlanGt(plan){await post('/api/config/etapas',{plan});TP=null;S=await api('/api/estado'+qp());pintar()}
function planActual(){return JSON.parse(JSON.stringify(TP.plan||{}))}
async function cambiarEtapaGt(e){if(!e)return;await api('/api/tmn/etapa'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({etapa:e})});toast('Etapa: '+nomEtapa(e));const pr=await api('/api/proyectos');PROY=pr.proyectos;TP=null;recargar()}
function editarEtapa(k){
  const p=(TP.plan||{})[k]||{};
  abrirDialogo('<h2>'+ic('calendario',22)+nomEtapa(k)+'</h2><div class="campos"><label class="campo"><span>Inicio</span><input type="date" id="deI" value="'+esc(p.inicio||TP.hoy)+'"></label><label class="campo"><span>Fin</span><input type="date" id="deF" value="'+esc(p.fin||sumD(p.inicio||TP.hoy,7))+'"></label></div>'
    +'<div class="fila-form"><button class="btn" onclick="guardarEtapaDlg(\''+k+'\')">Guardar</button>'+(p.inicio?'<button class="btn rojo" onclick="quitarEtapaDlg(\''+k+'\')">Quitar del plan</button>':'')+'<button class="btn sec" onclick="cerrarDialogo()">Cancelar</button></div>');
}
function guardarEtapaDlg(k){const a=$('#deI').value,b=$('#deF').value;if(!a||!b)return toast('Faltan fechas');if(b<a)return toast('El fin va después del inicio');const P=planActual();P[k]={inicio:a,fin:b};cerrarDialogo();guardarPlanGt(P)}
function quitarEtapaDlg(k){const P=planActual();delete P[k];cerrarDialogo();guardarPlanGt(P)}
function clicCarril(ev,k){
  if(ARR.movio||ev.target.closest('.gt-b,.gt-hito,.gt-pago'))return;
  if((TP.plan||{})[k])return;
  const r=ev.currentTarget.getBoundingClientRect(),d=Math.round((ev.clientX-r.left)/r.width*TPE.dias),ini=sumD(TPE.ini,d);
  const P=planActual();P[k]={inicio:ini,fin:sumD(ini,7)};guardarPlanGt(P);toast(nomEtapa(k)+': una semana desde el '+fCorta(ini));
}
function editarHito(i){
  const x=i===undefined?{nombre:'',fecha:TP.hoy,hecho:false}:TP.hitos[i];
  abrirDialogo('<h2>'+ic('etapa',22)+(i===undefined?'Nuevo hito':'Hito')+'</h2><label class="campo"><span>Qué pasa ese día</span><input type="text" id="hiN" value="'+esc(x.nombre)+'" placeholder="Ej. Presentación al cliente" autofocus></label><div class="campos"><label class="campo"><span>Fecha</span><input type="date" id="hiF" value="'+esc(x.fecha)+'"></label><label class="interruptor" style="align-self:end"><input type="checkbox" id="hiH"'+(x.hecho?' checked':'')+'>Ya pasó / cumplido</label></div>'
    +'<div class="fila-form"><button class="btn" onclick="guardarHitoDlg('+(i===undefined?'null':i)+')">Guardar</button>'+(i===undefined?'':'<button class="btn rojo" onclick="quitarHito('+i+')">Quitar</button>')+'<button class="btn sec" onclick="cerrarDialogo()">Cancelar</button></div>');
}
async function guardarHitos(L){await post('/api/hitos',{hitos:L});TP=null;pintar()}
function guardarHitoDlg(i){const n=$('#hiN').value.trim(),f=$('#hiF').value;if(!n||!f)return toast('Falta el nombre o la fecha');const L=(TP.hitos||[]).slice();const x={...(i===null?{}:L[i]),nombre:n,fecha:f,hecho:$('#hiH').checked};if(i===null)L.push(x);else L[i]=x;cerrarDialogo();guardarHitos(L)}
function quitarHito(i){const L=(TP.hitos||[]).slice();L.splice(i,1);cerrarDialogo();guardarHitos(L)}
// ---- arrastrar: mover la barra, estirar sus bordes o mover un hito ----
const ARR={on:false,movio:false};
function activarArrastre(){
  document.querySelectorAll('.gt-edit .mov').forEach(el=>el.addEventListener('pointerdown',ev=>{
    ev.preventDefault();ev.stopPropagation();
    const lane=el.closest('.gt-lane'),r=lane.getBoundingClientRect(),hito=el.classList.contains('gt-hito');
    const modo=hito?'hito':ev.target.classList.contains('ini')?'ini':ev.target.classList.contains('fin')?'fin':'mover';
    const k=el.dataset.e,hi=+el.dataset.h,p0=hito?{inicio:TP.hitos[hi].fecha,fin:TP.hitos[hi].fecha}:{...TP.plan[k]};
    Object.assign(ARR,{on:true,movio:false,el,k,hi,modo,p0,x0:ev.clientX,ancho:r.width,nuevo:{...p0}});
    el.setPointerCapture(ev.pointerId);el.classList.add('arrastrando');
  }));
}
document.addEventListener('pointermove',ev=>{
  if(!ARR.on)return;const d=Math.round((ev.clientX-ARR.x0)/ARR.ancho*TPE.dias);if(d)ARR.movio=true;
  const p=ARR.p0,n={...p};
  if(ARR.modo==='mover'||ARR.modo==='hito'){n.inicio=sumD(p.inicio,d);n.fin=sumD(p.fin,d)}else if(ARR.modo==='ini'){n.inicio=sumD(p.inicio,d);if(n.inicio>n.fin)n.inicio=n.fin}else{n.fin=sumD(p.fin,d);if(n.fin<n.inicio)n.fin=n.inicio}
  ARR.nuevo=n;ARR.el.style.left=TPE.pos(n.inicio)+'%';if(ARR.modo!=='hito')ARR.el.style.width=TPE.ancho(n.inicio,n.fin)+'%';
  ARR.el.dataset.txt=ARR.modo==='hito'?fCorta(n.inicio):fCorta(n.inicio)+' a '+fCorta(n.fin);
});
document.addEventListener('pointerup',()=>{
  if(!ARR.on)return;ARR.on=false;ARR.el.classList.remove('arrastrando');
  if(!ARR.movio){if(ARR.modo==='hito')editarHito(ARR.hi);else editarEtapa(ARR.k);setTimeout(()=>ARR.movio=false,0);return}
  if(ARR.modo==='hito'){const L=TP.hitos.slice();L[ARR.hi]={...L[ARR.hi],fecha:ARR.nuevo.inicio};guardarHitos(L)}
  else{const P=planActual();P[ARR.k]=ARR.nuevo;guardarPlanGt(P);toast(nomEtapa(ARR.k)+': '+fCorta(ARR.nuevo.inicio)+' a '+fCorta(ARR.nuevo.fin))}
  setTimeout(()=>ARR.movio=false,0);
});
// ---- sugerir fechas aquí mismo ----
async function sugerirGt(){
  const tam=$('#gtTam').value;
  if(tam!==(TP.tamano||'mediano')){await api('/api/tmn'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tmn:{...(S.tmn||{}),tamano:tam}})});S=await api('/api/estado'+qp());TP=null;await cargarTP()}
  tpSug=await api('/api/plan/sugerir'+qp());pintar();
}
function panelSugGt(G,EP){
  return '<div class="sug-plan"><div class="tablewrap"><table><tr><th>Etapa</th><th>Ahora</th><th>Sugerido</th><th>De dónde sale</th></tr>'
    +ETAPAS_UI.filter(([k])=>G.plan[k]).map(([k,n])=>{const a=EP[k]||{},b=G.plan[k],igual=a.inicio===b.inicio&&a.fin===b.fin;return '<tr><td><b>'+n+'</b></td><td>'+(a.inicio?fCorta(a.inicio)+' a '+fCorta(a.fin):'—')+'</td><td'+(igual?'':' class="cambia"')+'>'+fCorta(b.inicio)+' a '+fCorta(b.fin)+'</td><td class="aviso" style="margin:0">'+esc(G.fuentes[k])+'</td></tr>'}).join('')
    +'</table></div><div class="fila-form"><button class="btn" onclick="usarSugGt()">Usar estas fechas</button><button class="btn sec" onclick="tpSug=null;pintar()">Cancelar</button></div></div>';
}
async function usarSugGt(){
  if(Object.keys(TP.plan||{}).length&&!TP.planAuto&&!confirm('Este proyecto ya tiene fechas que pusiste tú. ¿Cambiarlas por las sugeridas?'))return;
  await post('/api/plan/aplicar',{tamano:$('#gtTam').value});toast('Fechas planeadas listas');tpSug=null;TP=null;S=await api('/api/estado'+qp());pintar();
}

// ---------------- Piezas de un proyecto en el tiempo ----------------
let tpAbiertas=true,tpDias=90;
const EST_CLS=e=>({v:'p-ver',b:'p-prob',c:'p-tall',d:'p-desc',p:'p-pend'})[grupoEst(e)];
async function pintarPiezasTiempo(m){
  m.innerHTML='<section class="seccion">Cargando…</section>';const T=await cargarTP();if(tab!=='tpiezas')return;
  const hoy=T.hoy,E=escala(sumD(hoy,-tpDias),sumD(hoy,7));
  const L=T.piezas.filter(x=>!tpAbiertas||!/[vd]/.test(grupoEst(x.estado)));
  let h='<div class="gt-barra"><span class="seg"><button class="'+(tpAbiertas?'on':'')+'" onclick="tpAbiertas=true;pintar()">Abiertas</button><button class="'+(tpAbiertas?'':'on')+'" onclick="tpAbiertas=false;pintar()">Todas</button></span>'
    +'<span class="seg">'+[[30,'30 días'],[90,'90 días'],[180,'6 meses'],[365,'Año']].map(([n,l])=>'<button class="'+(tpDias===n?'on':'')+'" onclick="tpDias='+n+';pintar()">'+l+'</button>').join('')+'</span>'
    +'<span class="aviso" style="margin:0 0 0 auto">'+L.length+' pieza'+(L.length===1?'':'s')+'</span></div>';
  const grupos=[],usadas=new Set();
  for(const md of arbolMapa()){const g=L.filter(x=>dentroDe(x.donde,{cod:md.cod}));g.forEach(x=>usadas.add(x.id));if(g.length)grupos.push([md.cod+' · '+md.modulo,g])}
  const sin=L.filter(x=>!usadas.has(x.id));if(sin.length)grupos.push([grupos.length?'Sin lugar asignado':'Piezas',sin]);
  h+='<section class="seccion gt"><div class="gt-fila gt-cab"><div class="gt-lbl"></div><div class="gt-lane">'+cabeceraMeses(E)+'</div></div>';
  for(const [t,g] of grupos){
    h+='<div class="gt-grupo">'+esc(t)+' <span class="aviso" style="margin:0">'+g.length+'</span></div>';
    for(const x of g.slice().sort((a,b)=>String(a.alta).localeCompare(String(b.alta)))){
      h+='<button class="gt-fila gt-pz" onclick="abrirPieza(\''+esc(x.id)+'\')"><div class="gt-lbl"><code class="id">'+esc(x.id)+'</code><span>'+esc(tituloPieza(x.desc))+'</span></div><div class="gt-lane">'
        +x.tramos.map(r=>r.desde===r.hasta?(E.dentro(r.desde,r.desde)?'<i class="gt-punto '+EST_CLS(r.estado)+'" style="left:'+E.pos(r.desde)+'%" title="'+esc(ESTADO_CORTO(r.estado)+' · '+fCorta(r.desde))+'"></i>':''):gbarra(E,r.desde,r.hasta,EST_CLS(r.estado)+(r.aprox?' aprox':''),'',ESTADO_CORTO(r.estado)+': '+fCorta(r.desde)+' a '+(r.abierto?'hoy':fCorta(r.hasta))+(r.aprox?' (aproximado)':''))).join('')
        +lineaHoy(E,hoy)+'</div></button>';
    }
  }
  if(!L.length)h+='<div class="aviso" style="padding:14px">'+(tpAbiertas?'No hay piezas abiertas.':'Sin piezas.')+'</div>';
  m.innerHTML=h+'</section><div class="gt-ley"><span><i class="gt-b p-pend"></i>Pendiente</span><span><i class="gt-b p-tall"></i>En el taller</span><span><i class="gt-b p-prob"></i>Por probar</span><span><i class="gt-punto p-ver"></i>Verificada</span><span><i class="gt-b p-pend aprox"></i>Aproximado (antes del historial)</span></div>';
}
