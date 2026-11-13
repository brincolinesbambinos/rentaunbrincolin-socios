// Timón · Fase 4: Cobro (Por decidir, por módulo y corte) · TMN-019, TMN-020
// Se envuelven las pantallas de Cobro que ya existían: lo nuevo va arriba, lo de antes (pagos, iguala) sigue abajo.
const _cobrosBase=pintarCobros,_cobranzaBase=pintarCobranza;
const DECIDE=[['Cobrar','Cobrar'],['Regalar','Regalar'],['Parcial','Mitad y mitad'],['Garantia','Garantía'],['Contrato','Dentro del contrato'],['Iguala','Iguala']];

pintarCobros=async function(m){
  const base=document.createElement('div');await _cobrosBase(base);
  const P=S.puntos,valor=P?P.valor:400,D=S.porDecidir||[],hayIguala=!!(S.cobros&&S.cobros.iguala);
  let h='';
  // ---- Cotización en curso (proyecto en Brief, Descubrimiento o Cotización) ----
  if(S.cotizacion)h+=seccionCotizacion();
  // ---- Por decidir ----
  if(D.length&&!S.cotizacion){
    const sinP=D.filter(x=>x.puntos===null);
    h+='<section class="seccion cobro-decidir"><div class="pz-gcab"><h2>Por decidir</h2><span class="aviso" style="margin:0">'+D.length+' pieza'+(D.length===1?'':'s')+' sin decisión de cobro. Regalar también es una decisión: que quede escrita.</span></div>';
    if(P&&P.desde)h+='<div class="aviso" style="margin:-4px 0 10px">Solo desde el '+esc(P.desde)+' (Registrar desde, en Configuración).</div>';
    const listas=D.map((x,i)=>({x,i})).filter(o=>o.x.puntos!==null&&o.x.sugerencia&&o.x.sugerencia.d);
    if(listas.length)h+='<div class="fila-form" style="margin:0 0 8px"><span class="aviso" style="margin:0;align-self:center">'+listas.length+(listas.length===1?' tiene':' tienen')+' una decisión clara (Arreglo → Garantía, Cambio → Cobrar, Soporte → Iguala).</span><button class="btn" onclick="aplicarSugeridos()">'+ic('verificada',16)+'Aplicar lo sugerido ('+listas.length+')</button></div>';
    if(sinP.length)h+='<div class="fila-form" style="margin:0 0 8px"><span class="aviso" style="margin:0;align-self:center">'+sinP.length+' sin puntos todavía.</span><button class="btn sec" onclick="pedirPuntosIA()">'+ic('copiar',16)+'Pedir puntos a la IA</button></div>';
    D.slice(0,30).forEach((x,i)=>{
      const lug=partesLugar(x.donde)[0]||'';
      h+='<div class="decidir"><div class="d-info"><div><code><b>'+esc(x.id)+'</b></code> <span>'+esc(tituloPieza(x.descripcion))+'</span>'+edadDesde(x.fecha,'espera desde')+'</div><div class="aviso" style="margin:2px 0 0">'+[x.tipo?'<span class="tipo">'+esc(x.tipo)+'</span>':'<span class="tipo" style="color:var(--mal)">sin tipo</span>',lug?'<code>'+esc(lug)+'</code>':'',esc(ESTADO_CORTO(x.estado))].filter(Boolean).join(' · ')+(x.sugerencia.t?' · <i>sugerido: '+esc(x.sugerencia.t)+'</i>':'')+'</div></div>'
        +'<label class="d-pts"><input type="number" min="0" step="0.5" id="pd'+i+'" placeholder="pts" value="'+(x.puntos===null?'':x.puntos)+'" oninput="$(\'#pdm'+i+'\').textContent=\'$\'+fmtN((+this.value||0)*'+valor+')" aria-label="Puntos de '+esc(x.id)+'"><span id="pdm'+i+'">$'+fmtN((x.puntos||0)*valor)+'</span></label>'
        +'<div class="d-btns">'+DECIDE.filter(([k])=>k!=='Iguala'||hayIguala).map(([k,l])=>'<button class="'+(x.sugerencia.d===k?'btn':'mini')+'" onclick="decidir('+i+',\''+k+'\')">'+l+'</button>').join('')+'<button class="mini" title="Ver la pieza" onclick="abrirPieza(\''+esc(x.id)+'\')">···</button></div></div>';
    });
    if(D.length>30)h+='<div class="aviso">Y '+(D.length-30)+' más. Decide primero estas.</div>';
    h+='<div class="aviso">Los puntos se cuentan con el catálogo del skill cotizar-proyecto. Pídele a la IA "cuenta los puntos de las piezas por decidir" si no los tienes.</div></section>';
  }else if(P&&!S.cotizacion)h+='<section class="seccion" style="background:var(--tinte-ok)"><b style="color:#0B5E40">Nada por decidir.</b> <span class="aviso" style="color:#0B5E40">Todas las piezas tienen su decisión de cobro.</span></section>';
  // ---- Por módulo ----
  if(P&&(S.mapa&&S.mapa.lugares||[]).length){
    const pz=piezas(),dondeDe={};pz.forEach(x=>dondeDe[x.id]=x.donde);
    const filas=arbolMapa().map(md=>{const t={Contratado:0,Extra:0,'Cortesía':0,'Garantía':0,Iguala:0};P.filas.forEach(f=>{if(dentroDe(dondeDe[f.id],{cod:md.cod})&&t[f.tipo]!==undefined)t[f.tipo]+=f.puntos});return [md,t]}).filter(([,t])=>Object.values(t).some(v=>v));
    if(filas.length)h+='<section class="seccion"><div class="pz-gcab"><h2>Por módulo</h2><span class="aviso" style="margin:0">en puntos, salvo Regalado · clic para ver sus piezas</span></div><div class="tablewrap"><table><tr><th>Módulo</th><th>Contratado</th><th>Extra</th><th>Cortesía</th><th>Garantía</th><th>Regalado</th></tr>'
      +filas.map(([md,t])=>'<tr style="cursor:pointer" onclick="mapaSel={cod:\''+esc(md.cod)+'\'};irA(\'mapa\')"><td><code class="cod">'+esc(md.cod)+'</code> '+esc(md.modulo)+'</td><td>'+fmtN(t.Contratado)+'</td><td>'+fmtN(t.Extra)+'</td><td>'+fmtN(t['Cortesía'])+'</td><td>'+fmtN(t['Garantía'])+'</td><td><b>$'+fmtN(t['Cortesía']*valor)+'</b></td></tr>').join('')+'</table></div></section>';
  }
  // ---- Corte ----
  if(P){
    const mes=hoyLocal().slice(0,7),ext=P.filas.filter(f=>f.tipo==='Extra'&&!f.cobrado&&!/Corte \d{4}-\d{2}/.test(f.nota)),reg=P.filas.filter(f=>f.tipo==='Cortesía'&&f.nota.includes('Decidido el '+mes));
    h+='<section class="seccion"><div class="pz-gcab"><h2>Corte de cobro</h2></div><div class="aviso" style="margin-top:0">'+ext.length+' extra'+(ext.length===1?'':'s')+' por cobrar ($'+fmtN(ext.reduce((a,f)=>a+f.puntos,0)*valor)+') · '+reg.length+' cortesía'+(reg.length===1?'':'s')+' de este mes con su valor ($'+fmtN(reg.reduce((a,f)=>a+f.puntos,0)*valor)+'). Se guarda como documento para el cliente y se agrega como pago pendiente; al marcar ese pago como pagado, sus extras quedan cobrados.</div>'
      +'<div class="fila-form"><input type="month" id="ctMes" value="'+mes+'" aria-label="Mes del corte"><button class="btn"'+(ext.length||reg.length?'':' disabled')+' onclick="generarCorteUI()">Generar corte</button></div>'
      +((S.cortes||[]).length?'<div class="lista" style="margin-top:12px">'+S.cortes.map(c=>'<details class="corte"><summary>'+ic('documento',16)+'<code>'+esc(c.file.split('/').pop())+'</code></summary><div class="md" data-corte="'+esc(c.file)+'">Cargando…</div></details>').join('')+'</div>':'')+'</section>';
  }
  m.innerHTML=h+base.innerHTML;
  m.querySelectorAll('details.corte').forEach(d=>d.addEventListener('toggle',async()=>{const el=d.querySelector('[data-corte]');if(d.open&&el.textContent==='Cargando…'){const r=await api('/api/archivo'+qp()+'&f='+encodeURIComponent(el.dataset.corte));el.innerHTML=md(r.contenido||'')}}));
};
async function decidir(i,decision){
  const x=S.porDecidir[i],v=$('#pd'+i).value;
  if(v===''){$('#pd'+i).focus();return toast('Escribe los puntos de '+x.id+' (pueden ser 0)')}
  let pct=50;
  if(decision==='Parcial'){const r=prompt('¿Qué porcentaje se cobra? (el resto se regala)','50');if(r===null)return;pct=+r||50}
  if(decision==='Regalar'&&S.puntos){const queda=S.puntos.bolsa-S.puntos.totales['Cortesía'];if(+v>queda&&!confirm('La bolsa de cortesía tiene '+fmtN(queda)+' pts y vas a regalar '+v+'. ¿Regalarlo de todos modos?'))return}
  await post('/api/puntos/decidir',{id:x.id,decision,puntos:v,pct});
  toast(x.id+': '+(DECIDE.find(d=>d[0]===decision)||[0,decision])[1]);S=await api('/api/estado'+qp());pintarNav();pintar();
}
async function generarCorteUI(){
  const mes=$('#ctMes').value;if(!confirm('Se genera el corte de '+fMes(mes)+' y se agrega como pago pendiente. ¿Continuar?'))return;
  const r=await post('/api/corte',{mes});toast('Corte listo: '+r.file+(r.cobrar?' · $'+fmtN(r.cobrar)+' por cobrar':''));S=await api('/api/estado'+qp());pintar();
}

// ---- Cobro de todos los proyectos ----
pintarCobranza=async function(m){
  await _cobranzaBase(m);
  const r=await api('/api/cobranza'),D=r.porDecidir||[];
  const tarjeta='<div class="card'+(r.regaladoMes?' alerta':'')+'"><div class="num">$'+fmtN(r.regaladoMes)+'</div><div class="lbl">Regalado este mes</div></div>';
  const cards=m.querySelector('.cards');if(cards)cards.insertAdjacentHTML('beforeend',tarjeta);
  if(!D.length)return;
  let h='<section class="seccion cobro-decidir"><div class="pz-gcab"><h2>Por decidir de todos los proyectos</h2><span class="aviso" style="margin:0">'+D.length+' pieza'+(D.length===1?'':'s')+'</span></div>';
  D.slice(0,15).forEach(x=>{h+='<div class="decidir"><div class="d-info"><div><code class="cod">'+esc(x.codigo)+'</code> <code><b>'+esc(x.id)+'</b></code> <span>'+esc(tituloPieza(x.descripcion))+'</span>'+edadDesde(x.fecha,'espera desde')+'</div><div class="aviso" style="margin:2px 0 0">'+(x.tipo?'<span class="tipo">'+esc(x.tipo)+'</span>':'sin tipo')+(x.sugerencia.t?' · <i>sugerido: '+esc(x.sugerencia.t)+'</i>':'')+'</div></div><div class="d-btns"><button class="mini" onclick="entrar(\''+esc(x.pid)+'\',\'cobros\')">Decidir en '+esc(x.nombre)+' →</button></div></div>'});
  if(D.length>15)h+='<div class="aviso">Y '+(D.length-15)+' más en sus proyectos.</div>';
  h+='</section>';
  const cards2=m.querySelector('.cards');if(cards2)cards2.insertAdjacentHTML('afterend',h);else m.insertAdjacentHTML('afterbegin',h);
};

// ---- Cotizar mientras se trabaja (TMN-043) y proyectos para cotizar (TMN-044) ----
function pedirPuntosIA(soloCot){
  const ids=(soloCot?S.cotizacion.piezas.filter(x=>x.puntos===null).map(x=>x.id):(S.porDecidir||[]).filter(x=>x.puntos===null).map(x=>x.id));
  const t='Proyecto '+S.proyecto.nombre+' ('+S.proyecto.codigo+'). Cuenta los puntos de estas piezas con el catálogo del skill cotizar-proyecto y regístralos en PUNTOS-'+S.proyecto.codigo+'.md (una fila por pieza): '+ids.join(', ')+'.\nUsa la decisión de cobro solo si es clara (Contratado, Garantía, Iguala o Extra); si no, ponlas como "Por decidir". No marques nada como Cortesía.';
  navigator.clipboard.writeText(t).then(()=>toast('Copiado: pégalo en Claude con la carpeta del proyecto')).catch(()=>prompt('Copia esto:',t));
}
function seccionCotizacion(){
  const C=S.cotizacion,mods={},nombre=d=>{const t=partesLugar(d)[0];const m=t&&moduloDe(t);return m?m.cod+' · '+m.modulo:(t||'Sin módulo')};
  C.piezas.forEach(x=>{const k=nombre(x.donde);(mods[k]=mods[k]||{n:0,pts:0,sin:0});mods[k].n++;if(x.puntos===null)mods[k].sin++;else mods[k].pts+=x.puntos});
  let h='<section class="seccion cotizacion"><div class="pz-gcab"><h2>Cotización en curso</h2><span class="aviso" style="margin:0">el proyecto está en '+esc((ETAPAS_UI.find(e=>e[0]===C.etapa)||[0,C.etapa])[1])+': todo lo que la IA registra suma aquí</span></div>'
    +'<div class="cards">'+card(fmtN(C.total)+' pts','puntos contados','azul')+card('$'+fmtN(C.monto),'a $'+fmtN(C.valor)+' el punto','bien')+card(C.piezas.length,'piezas')+card(C.sinPuntos,'sin contar',C.sinPuntos?'alerta':'')+'</div>';
  const ks=Object.keys(mods);
  if(ks.length)h+='<div class="tablewrap"><table><tr><th>Módulo</th><th>Piezas</th><th>Puntos</th><th>Monto</th></tr>'+ks.map(k=>'<tr><td>'+esc(k)+'</td><td>'+mods[k].n+(mods[k].sin?' <span class="aviso">('+mods[k].sin+' sin contar)</span>':'')+'</td><td>'+fmtN(mods[k].pts)+'</td><td><b>$'+fmtN(mods[k].pts*C.valor)+'</b></td></tr>').join('')+'</table></div>';
  h+='<div class="fila-form">'+(C.sinPuntos?'<button class="btn sec" onclick="pedirPuntosIA(true)">'+ic('copiar',16)+'Pedir puntos a la IA ('+C.sinPuntos+')</button>':'')
    +'<button class="btn sec" onclick="generarCotizacionUI()">'+ic('documento',16)+'Generar cotización</button><button class="btn" onclick="aceptarCotizacionUI()">'+ic('verificada',16)+'El cliente aceptó</button></div>'
    +'<div class="aviso">"El cliente aceptó" pasa sus puntos a Contratado, pone el total en Cobro y cambia la etapa a Aceptado. Desde ahí lo nuevo se compara contra lo contratado.</div>';
  if((S.cotizaciones||[]).length)h+='<div class="lista" style="margin-top:12px">'+S.cotizaciones.map(f=>'<details class="corte"><summary>'+ic('documento',16)+'<code>'+esc(f.split('/').pop())+'</code></summary><div class="md" data-corte="'+esc(f)+'">Cargando…</div></details>').join('')+'</div>';
  return h+'</section>';
}
async function generarCotizacionUI(){const r=await post('/api/cotizacion',{});toast('Cotización: '+fmtN(r.total)+' pts · $'+fmtN(r.monto));S=await api('/api/estado'+qp());pintar()}
async function aceptarCotizacionUI(){
  const C=S.cotizacion;if(!confirm('¿El cliente aceptó la cotización de $'+fmtN(C.monto)+' ('+fmtN(C.total)+' pts)?\n\nSus puntos pasan a Contratado, el total va a Cobro y la etapa cambia a Aceptado.'+(C.sinPuntos?'\n\nOjo: '+C.sinPuntos+' pieza(s) siguen sin contar.':'')))return;
  const r=await post('/api/cotizacion/aceptar',{});toast('Aceptado: '+fmtN(r.contratados)+' pts contratados · $'+fmtN(r.monto));S=await api('/api/estado'+qp());pintarNav();pintarBanner();pintar();
}

// Aplica de una vez la decisión sugerida a las piezas que ya traen puntos y cuyo tipo deja clara la decisión (TMN-063)
async function aplicarSugeridos(){
  const L=(S.porDecidir||[]).filter(x=>x.puntos!==null&&x.sugerencia&&x.sugerencia.d);if(!L.length)return;
  if(!confirm('Se aplica lo sugerido a '+L.length+' pieza(s):\n'+L.map(x=>x.id+' → '+((DECIDE.find(d=>d[0]===x.sugerencia.d)||[0,x.sugerencia.d])[1])).join('\n')+'\n\n¿Continuar?'))return;
  for(const x of L)await post('/api/puntos/decidir',{id:x.id,decision:x.sugerencia.d,puntos:x.puntos,pct:50});
  toast(L.length+' decisión(es) aplicadas');S=await api('/api/estado'+qp());pintarNav();pintar();
}
