// Timón · Vistas globales: etapas, Probar, Cobro, Proyecto nuevo
// ---- vistas globales: verificar, cobranza, proyecto nuevo ----
function irVista(t){actual=null;tab=t;$('#selProy').value='';pintarNav();pintarBanner();pintar();window.scrollTo(0,0)}
function irNuevo(){cerrarPaleta&&cerrarPaleta();irVista('nuevo')}
const idDom=s=>'v-'+String(s).replace(/[^A-Za-z0-9_-]/g,'_');
const fmtTxt=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>');
const hoyLocal=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const ETAPAS_UI=[['brief','Brief'],['descubrimiento','Descubrimiento'],['cotizacion','Cotización'],['aceptado','Aceptado'],['construccion','Construcción'],['entregado','Entregado'],['mantenimiento','Mantenimiento']];
const GUIA_ETAPA={
  brief:'Platica el Marco con la IA: "arranquemos el Marco de CODIGO". El brief inicial quedó en Ideas.',
  descubrimiento:'Arquitectura y alcance. Cuando esté claro, pide "cotiza este proyecto" (skill cotizar-proyecto).',
  cotizacion:'Cotización enviada. Cuando el cliente acepte, crea el registro de puntos y la cobranza.',
  aceptado:'Registra el anticipo en Cobro y arma el primer spec.',
  construccion:'Construye spec por spec y pruébalo en la sección Probar.',
  entregado:'Cierra lo pendiente de cobro y propón la iguala mensual.',
  mantenimiento:'Iguala activa: cada solicitud nueva se registra con sus puntos.'
};
function stepperEtapa(){
  const e=S.etapa||'',i=ETAPAS_UI.findIndex(x=>x[0]===e);
  let h='<section class="seccion" style="padding:16px 18px"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">';
  ETAPAS_UI.forEach((x,j)=>{const on=j===i,pas=i>=0&&j<i;h+='<button class="etapa'+(on?' on':pas?' hecha':'')+'" onclick="cambiarEtapa(\''+x[0]+'\')">'+(pas?'✓ ':'')+x[1]+'</button>'+(j<ETAPAS_UI.length-1?'<span class="flecha">›</span>':'')});
  h+='</div>';
  if(i<0)h+='<div class="aviso">Marca en qué etapa va este proyecto.</div>';
  else{
    h+='<div class="aviso" style="font-size:14px;color:var(--tx)">'+esc(GUIA_ETAPA[e].replace('CODIGO',S.proyecto.codigo))+'</div>';
    const b=[];
    if(e==='cotizacion'||e==='aceptado'){if(!S.puntos)b.push('<button class="btn sec" onclick="irA(\'puntos\')">Crear registro de puntos</button>');if(!(S.cobros&&S.cobros.file))b.push('<button class="btn sec" onclick="irA(\'cobros\')">Crear cobranza</button>')}
    if(i<ETAPAS_UI.length-1)b.push('<button class="btn" onclick="cambiarEtapa(\''+ETAPAS_UI[i+1][0]+'\')">Pasar a '+ETAPAS_UI[i+1][1]+'</button>');
    if(b.length)h+='<div class="fila-form">'+b.join('')+'</div>';
  }
  return h+'</section>';
}
async function cambiarEtapa(e){await api('/api/tmn/etapa'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({etapa:e})});toast('Etapa actualizada');const pr=await api('/api/proyectos');PROY=pr.proyectos;recargar()}
// ---- Verificar (por proyecto) ----
let vFoco=null,vFallo=null,VER=[];
// pintarVerificar, cerrarV y guardarFallo viven ahora en piezas.js (Probar en sesión)
// ---- Verificar (todos los proyectos) ----
let vCortos=false;
function irVerificar(pid,id){vFoco=id;VER=[];entrar(pid,'verificar')}
async function pintarVTodos(m){
  m.innerHTML='<div class="seccion">Cargando…</div>';
  const r=await api('/api/verificar/todos');
  r.proyectos.forEach(p=>p.items.sort(ordenProbar));r.proyectos.sort((a,b)=>ordenProbar(a.items[0]||{},b.items[0]||{}));
  const tot=r.proyectos.reduce((a,p)=>a+p.items.length,0),conChk=r.proyectos.reduce((a,p)=>a+p.items.filter(x=>x.total).length,0);
  const fila=(o,cod)=>'<div class="item" onclick="irVerificar(\''+o.p.id+'\',\''+esc(o.x.id)+'\')">'+(cod?'<span class="aviso" style="margin:0">'+esc(o.p.codigo)+'</span>':'')+'<span class="codigo" style="background:var(--tinte-res);color:var(--grafito)">'+esc(o.x.id)+'</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(o.x.modulo||o.x.descripcion)+'</span>'+edadProbarHtml(o.x)+accesoProbar(o.x.probarEn,o.p.id,(PROY.find(q=>q.id===o.p.id)||{}).lanzadores,o.x.id,true)+'<span class="meta">'+(o.x.total?o.x.hechos+'/'+o.x.total+' puntos':'sin checklist')+' →</span></div>';
  let h='<div class="cards">'+card(tot,'Por verificar',tot?'alerta':'bien')+card(r.proyectos.length,'Proyectos con pendientes')+card(conChk,'Con checklist listo','azul')+card(tot-conChk,'Sin checklist')+'</div>';
  h+='<div class="fila-form" style="margin:0 0 14px"><button class="chipf'+(vCortos?'':' on')+'" onclick="vCortos=false;pintar()">Por proyecto</button><button class="chipf'+(vCortos?' on':'')+'" onclick="vCortos=true;pintar()">Sesión de 15 minutos</button>'+ordenProbarBtns()+'</div>';
  if(vCortos){
    const todos=[];r.proyectos.forEach(p=>p.items.forEach(x=>{if(x.total)todos.push({p,x})}));
    todos.sort((a,b)=>(a.x.total-a.x.hechos)-(b.x.total-b.x.hechos));
    h+='<section class="seccion"><h2>Empieza por estos</h2><div class="lista">'+todos.slice(0,8).map(o=>fila(o,true)).join('')+'</div><div class="aviso">Los que tienen menos puntos pendientes. Cierra uno y regresa.</div></section>';
  }else for(const p of r.proyectos){
    const c=colorCliente(p.cliente);
    h+='<section class="seccion"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="codigo" style="background:'+c[2]+';color:'+c[3]+'">'+esc(p.codigo)+'</span><h2 style="margin:0">'+esc(p.nombre)+'</h2><span class="aviso" style="margin:0 0 0 auto">'+p.items.length+' por verificar</span></div><div class="lista">'+p.items.map(x=>fila({p,x},false)).join('')+'</div></section>';
  }
  if(!tot)h+='<section class="seccion" style="background:var(--tinte-ok)">Todo verificado en todos tus proyectos.</section>';
  m.innerHTML=h;
}
// ---- Cobranza (por proyecto) ----
async function pintarCobros(m){
  const C=S.cobros;
  if(!C||!C.file){
    m.innerHTML='<section class="seccion"><h2>Cobro</h2>Este proyecto aún no tiene <code>COBROS-'+esc(S.proyecto.codigo)+'.md</code>. Créalo con el total que se contrató y, si aplica, la iguala mensual.'+(C&&C.extras?'<div class="aviso">Ya hay $'+fmtN(C.extras)+' de extras por cobrar en Puntos.</div>':'')
      +'<div class="fila-form"><input type="text" id="coTot" placeholder="Total contratado (MXN)"><input type="text" id="coIg" placeholder="Iguala mensual (opcional)"><input type="text" id="coIgp" placeholder="Puntos de iguala al mes (opcional)"><button class="btn" onclick="crearCobrosUI()">Crear cobranza</button></div></section>';
    return;
  }
  let h='<div class="cards">'+card('$'+fmtN(C.cobrado),'Cobrado','bien')+card('$'+fmtN(C.porCobrar),'Por cobrar',C.porCobrar?'azul':'')+card('$'+fmtN(C.vencido),'Vencido',C.vencido?'alerta':'')+card('$'+fmtN(C.extras),'Extras por cobrar',C.extras?'alerta':'')+'</div><div class="dos">';
  h+='<section class="seccion"><h2>Contrato</h2><div style="display:flex;justify-content:space-between;font-size:14px"><b>Cobrado</b><span>$'+fmtN(C.cobrado)+' de $'+fmtN(C.contratado)+'</span></div>'+barra(C.cobrado,C.contratado,'g')
    +(C.sinProgramar?'<div class="aviso">$'+fmtN(C.sinProgramar)+' sin programar: agrégalos abajo como pagos con fecha.</div>':'')
    +(C.proximo?'<div class="item" style="margin-top:12px;cursor:default;background:var(--tinte-plano)"><span><b>Próximo pago · '+esc(fFecha(C.proximo.fecha))+'</b><br>'+esc(C.proximo.concepto)+'</span><span class="meta" style="font-size:16px;font-weight:700;color:var(--plano)">$'+fmtN(C.proximo.monto)+'</span></div>':'')+'</section>';
  h+='<section class="seccion"><h2>Iguala mensual</h2>'+(C.iguala?'<div style="font-size:24px;font-weight:700">$'+fmtN(C.iguala)+' <span class="aviso">al mes</span></div>'
    +(C.igualaPuntos?'<div style="display:flex;justify-content:space-between;font-size:14px;margin-top:10px"><b>Bolsa de este mes</b><span>'+fmtN(C.igualaUsados)+' / '+fmtN(C.igualaPuntos)+' pts</span></div>'+barra(C.igualaUsados,C.igualaPuntos,C.igualaUsados>C.igualaPuntos?'w':'')
      +(C.igualaUsados>C.igualaPuntos?'<div class="aviso" style="color:var(--mal)">Ya pasaste la bolsa: lo que siga este mes se cotiza aparte.</div>':'<div class="aviso">Cuenta los puntos (sin garantías) de las solicitudes registradas este mes.</div>'):'')
    :'<div class="aviso">Sin iguala. Al entregar, propón una para que el sistema siga creciendo sin regalarlo.</div>')+'</section></div>';
  const hoy=hoyLocal();
  h+='<section class="seccion"><h2>Pagos</h2><div class="tablewrap"><table><tr><th>Fecha</th><th>Concepto</th><th>Monto</th><th>Estado</th><th>Nota</th><th></th></tr>';
  C.filas.forEach((f,i)=>{const venc=!f.pagado&&f.fecha&&f.fecha<hoy;h+='<tr><td>'+esc(f.fecha?fFecha(f.fecha):'sin fecha')+'</td><td>'+esc(f.concepto)+'</td><td>$'+fmtN(f.monto)+'</td><td><span class="est '+(f.pagado?'est-v':venc?'est-b':'est-p')+'">'+(f.pagado?'Pagado':venc?'Vencido':'Pendiente')+'</span></td><td>'+esc(f.nota)+'</td><td>'+(f.pagado?'<button class="mini" onclick="marcarPago('+i+',false)">Deshacer</button>':'<button class="mini on" onclick="marcarPago('+i+',true)">Marcar pagado</button>')+'</td></tr>'});
  if(!C.filas.length)h+='<tr><td colspan="6" class="aviso">Todavía no hay pagos. Agrega el plan de pagos de la cotización.</td></tr>';
  h+='</table></div><div class="fila-form"><input type="text" id="pgFecha" placeholder="AAAA-MM-DD" style="max-width:150px"><input type="text" id="pgCon" placeholder="Concepto (ej. Anticipo 30%)" style="flex:2"><input type="text" id="pgMonto" placeholder="Monto" style="max-width:150px"><label class="aviso" style="display:flex;align-items:center;gap:6px;margin:0"><input type="checkbox" id="pgPag"> Pagado</label><button class="btn sec" onclick="agregarPago()">+ Agregar pago</button></div><div class="aviso">Archivo: <code>'+esc(C.file)+'</code></div></section>';
  m.innerHTML=h;
}
async function crearCobrosUI(){const t=$('#coTot').value.trim();if(!t)return toast('Escribe el total contratado');await api('/api/cobros/crear'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contratado:t,iguala:$('#coIg').value,igualaPuntos:$('#coIgp').value})});toast('Cobro creado');recargar()}
async function agregarPago(){const c=$('#pgCon').value.trim(),mo=$('#pgMonto').value.trim();if(!c||!mo)return toast('Falta concepto y monto');await api('/api/cobros/fila'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fecha:$('#pgFecha').value.trim(),concepto:c,monto:mo,pagado:$('#pgPag').checked})});toast('Pago agregado');recargar()}
async function marcarPago(i,v){await api('/api/cobros/fila'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({indice:i,pagado:v})});toast(v?'Marcado como pagado':'Regresado a pendiente');recargar()}
// ---- Cobranza (todos los clientes) ----
async function pintarCobranza(m){
  m.innerHTML='<div class="seccion">Cargando…</div>';
  const r=await api('/api/cobranza'),P=r.proyectos,s=k=>P.reduce((a,x)=>a+(x[k]||0),0);
  let h='<div class="cards">'+card('$'+fmtN(s('cobrado')),'Cobrado','bien')+card('$'+fmtN(s('porCobrar')),'Por cobrar','azul')+card('$'+fmtN(s('vencido')),'Vencido',s('vencido')?'alerta':'')+card('$'+fmtN(s('extras')),'Extras por cobrar',s('extras')?'alerta':'')+card('$'+fmtN(s('iguala')),'Igualas al mes')+'</div>';
  const prox=P.filter(x=>x.proximo).sort((a,b)=>String(a.proximo.fecha).localeCompare(String(b.proximo.fecha))).slice(0,5);
  if(prox.length)h+='<section class="seccion"><h2>Próximos pagos</h2><div class="lista">'+prox.map(x=>'<div class="item" onclick="entrar(\''+x.id+'\',\'cobros\')"><span><b>'+esc(x.proximo.fecha?fFecha(x.proximo.fecha):'sin fecha')+'</b> · '+esc(x.nombre)+'<br><span class="aviso">'+esc(x.proximo.concepto)+'</span></span><span class="meta" style="font-size:15px;font-weight:700;color:var(--tx)">$'+fmtN(x.proximo.monto)+'</span></div>').join('')+'</div></section>';
  const grupos={};P.forEach(x=>{const g=x.cliente||'Sin cliente';(grupos[g]=grupos[g]||[]).push(x)});
  if(P.length){
    h+='<section class="seccion"><h2>Por cliente</h2><div class="tablewrap"><table><tr><th>Proyecto</th><th>Contratado</th><th>Cobrado</th><th>Por cobrar</th><th>Vencido</th><th>Extras</th><th>Iguala</th></tr>';
    for(const g of Object.keys(grupos).sort()){
      const c=colorCliente(g);
      h+='<tr><td colspan="7" style="background:'+c[1]+';font-weight:700"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:'+c[0]+';margin-right:8px"></span>'+esc(g)+'</td></tr>';
      grupos[g].forEach(x=>{h+='<tr style="cursor:pointer" onclick="entrar(\''+x.id+'\',\'cobros\')"><td><b>'+esc(x.nombre)+'</b>'+(x.file?'':' <span class="aviso">solo extras</span>')+'</td><td>$'+fmtN(x.contratado)+'</td><td>$'+fmtN(x.cobrado)+'</td><td>$'+fmtN(x.porCobrar)+'</td><td>'+(x.vencido?'<b style="color:var(--mal)">$'+fmtN(x.vencido)+'</b>':'$0')+'</td><td>$'+fmtN(x.extras)+'</td><td>'+(x.iguala?'$'+fmtN(x.iguala):'sin iguala')+'</td></tr>'});
    }
    h+='</table></div></section>';
  }
  const sin=PROY.filter(p=>!P.some(x=>x.id===p.id&&x.file)&&p.cliente&&!['Propios','Personal','Sin cliente'].includes(p.cliente));
  if(sin.length)h+='<section class="seccion alerta"><b>'+sin.length+' proyecto(s) de clientes sin cobranza registrada:</b> '+sin.map(p=>'<span class="volver" style="margin:0 10px 0 0" onclick="entrar(\''+p.id+'\',\'cobros\')">'+esc(p.nombre)+'</span>').join('')+'</section>';
  if(!P.length&&!sin.length)h+='<section class="seccion">Aún no hay cobranza registrada.</section>';
  m.innerHTML=h;
}
// Proyecto nuevo y adoptar uno empezado viven en nuevo.js (Fase 5)
async function actualizarAtrasados(){
  const ids=(T.atrasados||[]).map(a=>a.id);if(!ids.length)return;
  if(!confirm('Se actualizarán '+ids.length+' proyecto(s) a Timón '+T.version+'. Changelog, inbox y specs no se tocan. ¿Continuar?'))return;
  await api('/api/timon/actualizar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,dry:false})});
  arrancarLogAct();
}

// ---- Cuándo se construyó lo que falta probar (TMN-061) ----
let vOrden=(()=>{try{return localStorage.getItem('timon.vOrden')||'nuevas'}catch(e){return 'nuevas'}})();
const fechaProbar=x=>x.construida||x.fecha||'';
function ordenProbar(a,b){const fa=fechaProbar(a),fb=fechaProbar(b);if(fa===fb)return String(b.id||'').localeCompare(String(a.id||''),undefined,{numeric:true})*(vOrden==='nuevas'?1:-1);if(!fa)return 1;if(!fb)return -1;return vOrden==='nuevas'?fb.localeCompare(fa):fa.localeCompare(fb)}
function edadProbarHtml(x,corto){
  const d=x.construida?Math.floor((Date.parse(hoyLocal())-Date.parse(isoLocal(x.construida).slice(0,10)))/864e5):null;
  const txt=x.construida?(corto?'':'construida ')+hace(x.construida):x.fecha?(corto?'':'registrada el ')+fFecha(x.fecha):'';
  if(!txt)return '';
  return '<span class="pr-edad'+(d!==null&&d>=7?' vieja':d!==null&&d<1?' nueva':'')+'" title="'+(x.construida?'Pasó a Construido el '+esc(fFecha(x.construida))+' '+esc(fHora(x.construida)):'No sé cuándo se construyó; esta es la fecha en que se registró')+'">'+esc(txt)+'</span>';
}
function ordenProbarBtns(){return '<span class="seg" style="margin-left:auto"><button class="'+(vOrden==='nuevas'?'on':'')+'" onclick="ponerOrdenProbar(\'nuevas\')">Más nuevas</button><button class="'+(vOrden==='viejas'?'on':'')+'" onclick="ponerOrdenProbar(\'viejas\')">Más viejas</button></span>'}
function ponerOrdenProbar(v){vOrden=v;try{localStorage.setItem('timon.vOrden',v)}catch(e){}if(typeof VER!=='undefined')VER=[];pintar()}
