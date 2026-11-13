// Timón · Fase 2: Mapa por lugar, Configuración, Tipo y Dónde (TMN-031, TMN-032, TMN-033)

// ---- lugares ----
// Un lugar se escribe "COD › /pagina › Sección". El primer pedazo puede ser el código o el nombre del módulo.
const SEP_LUGAR=' › ';
const textoLugar=l=>[l.cod||l.modulo,l.pagina,l.seccion].filter(Boolean).join(SEP_LUGAR);
const partesLugar=t=>String(t||'').split(/\s*›\s*|\s*>\s*/).map(x=>x.trim()).filter(Boolean);
const igual=(a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();
function moduloDe(cod){return (S.mapa.lugares||[]).find(l=>!l.pagina&&(igual(l.cod,cod)||igual(l.modulo,cod)))||(S.mapa.lugares||[]).find(l=>igual(l.cod,cod)||igual(l.modulo,cod))}
// ¿la pieza con este Dónde cae dentro del lugar elegido?
function dentroDe(donde,sel){
  const t=partesLugar(donde);if(!t.length)return false;
  const m=moduloDe(t[0]);const codPieza=m?(m.cod||m.modulo):t[0];
  if(!igual(codPieza,sel.cod))return false;
  if(sel.pagina&&!igual(t[1],sel.pagina))return false;
  if(sel.seccion&&!igual(t[2],sel.seccion))return false;
  return true;
}
// piezas del changelog con lo que necesita el mapa
function piezas(){
  const c=S.changelog;if(!c)return [];
  return c.rows.filter(r=>/^[A-Za-z0-9_]+-\d+/.test(r[0]||'')).map(r=>r.length>c.headers.length?{id:r[0],fecha:r[c.iFecha]||'',desc:r[c.iDesc]||'',estado:r[c.iEstado]||'',tipo:'',donde:''}:({id:r[0],fecha:r[c.iFecha]||'',desc:r[c.iDesc]||'',estado:r[c.iEstado]||'',tipo:c.iTipo>=0&&(S.tiposSolicitud||[]).includes(r[c.iTipo])?r[c.iTipo]:'',donde:c.iDonde>=0?(r[c.iDonde]||''):''}));
}
const abierta=x=>!/[vd]/.test(grupoEst(x.estado));
const tituloPieza=d=>{const m=String(d).match(/\*\*([^*]+)\*\*/);return (m?m[1]:String(d)).replace(/:$/,'').slice(0,90)};

// ---- árbol del mapa: módulo › página › sección ----
function arbolMapa(){
  const L=S.mapa.lugares||[],mods=[];
  for(const l of L){
    const cod=l.cod||l.modulo;let m=mods.find(x=>igual(x.cod,cod));
    if(!m){m={cod,modulo:l.modulo||cod,nota:'',paginas:[]};mods.push(m)}
    if(!l.pagina){m.nota=l.nota;if(l.modulo)m.modulo=l.modulo;continue}
    let pg=m.paginas.find(x=>igual(x.pagina,l.pagina));
    if(!pg){pg={pagina:l.pagina,nota:'',secciones:[]};m.paginas.push(pg)}
    if(!l.seccion){pg.nota=l.nota;continue}
    if(!pg.secciones.some(x=>igual(x.seccion,l.seccion)))pg.secciones.push({seccion:l.seccion,nota:l.nota});
  }
  return mods;
}
let mapaSel=null,mapaAbiertos={};
function pintarMapa(m){
  const mods=arbolMapa(),P=piezas();
  const cuenta=sel=>P.filter(x=>abierta(x)&&dentroDe(x.donde,sel)).length;
  const sinLugar=P.filter(x=>!x.donde||!moduloDe(partesLugar(x.donde)[0])).length;
  if(!mods.length){
    m.innerHTML='<div class="seccion"><h2>Mapa del proyecto</h2><p style="font-size:16px;line-height:1.5;max-width:720px">Aquí se ven las piezas por <b>lugar</b>: módulo › página › sección, por ejemplo <code>REN › /rentas › Tabla</code>. Este proyecto todavía no tiene mapa.</p>'
      +'<div class="aviso">Lo más rápido: en Claude, con la carpeta del proyecto conectada, pide <b>"mapea el proyecto"</b>. El skill <code>mapear-proyecto</code> lee el código y te propone los módulos y páginas para aprobar. También puedes agregar módulos a mano en Configuración.</div>'
      +'<div class="fila-form"><button class="btn" onclick="irA(\'proyecto\')">'+ic('configuracion',16)+'Agregar módulos a mano</button></div></div>'
      +'<div class="seccion"><h2>Sin lugar asignado</h2><div class="aviso">'+sinLugar+' piezas todavía no tienen Dónde.</div></div>';
    return;
  }
  if(!mapaSel)mapaSel={cod:mods[0].cod};
  let t='<div class="mapa-arbol"><div class="mapa-cab">MÓDULO › PÁGINA › SECCIÓN</div>';
  for(const md of mods){
    const sel={cod:md.cod},ab=mapaAbiertos[md.cod]!==false,on=igual(mapaSel.cod,md.cod)&&!mapaSel.pagina;
    t+='<button class="nodo-m'+(on?' on':'')+'" onclick="elegirLugar(\''+esc(md.cod)+'\')"><span class="tri" onclick="event.stopPropagation();mapaAbiertos[\''+esc(md.cod)+'\']='+(ab?'false':'true')+';pintar()">'+(ab?'▾':'▸')+'</span><code>'+esc(md.cod)+'</code><b>'+esc(md.modulo)+'</b><span class="n">'+(cuenta(sel)||'')+'</span></button>';
    if(!ab)continue;
    for(const pg of md.paginas){
      const s2={cod:md.cod,pagina:pg.pagina},on2=igual(mapaSel.cod,md.cod)&&igual(mapaSel.pagina,pg.pagina)&&!mapaSel.seccion;
      t+='<button class="nodo-p'+(on2?' on':'')+'" onclick="elegirLugar(\''+esc(md.cod)+'\',\''+esc(pg.pagina)+'\')"><code>'+esc(pg.pagina)+'</code><span class="n">'+(cuenta(s2)||'')+'</span></button>';
      for(const sc of pg.secciones){
        const s3={cod:md.cod,pagina:pg.pagina,seccion:sc.seccion},on3=igual(mapaSel.seccion,sc.seccion)&&igual(mapaSel.pagina,pg.pagina)&&igual(mapaSel.cod,md.cod);
        t+='<button class="nodo-s'+(on3?' on':'')+'" onclick="elegirLugar(\''+esc(md.cod)+'\',\''+esc(pg.pagina)+'\',\''+esc(sc.seccion)+'\')">'+esc(sc.seccion)+'<span class="n">'+(cuenta(s3)||'')+'</span></button>';
      }
    }
  }
  t+='<button class="nodo-m sin'+(mapaSel.sin?' on':'')+'" onclick="mapaSel={sin:true};pintar()">Sin lugar asignado<span class="n">'+sinLugar+'</span></button></div>';
  m.innerHTML='<div class="mapa">'+t+'<div class="mapa-det">'+detalleLugar(P)+'</div></div>';
}
function elegirLugar(cod,pagina,seccion){mapaSel={cod,pagina:pagina||'',seccion:seccion||''};pintar()}
function detalleLugar(P){
  if(mapaSel.sin){
    const L=P.filter(x=>!x.donde||!moduloDe(partesLugar(x.donde)[0]));
    return '<div class="ruta-lugar">'+esc(S.proyecto.codigo)+SEP_LUGAR+'Sin lugar</div><h2 class="lugar-tit">Sin lugar asignado</h2><div class="aviso">Elige el Dónde de cada pieza en el Resumen (columna Dónde) o pide a la IA que las acomode con el mapa.</div>'
      +'<div class="lista" style="margin-top:14px">'+L.filter(abierta).slice(0,40).map(filaPieza).join('')+'</div>'+(L.filter(abierta).length>40?'<div class="aviso">Y '+(L.filter(abierta).length-40)+' más.</div>':'');
  }
  const md=arbolMapa().find(x=>igual(x.cod,mapaSel.cod));if(!md)return '';
  const pg=mapaSel.pagina?md.paginas.find(x=>igual(x.pagina,mapaSel.pagina)):null;
  const sc=pg&&mapaSel.seccion?pg.secciones.find(x=>igual(x.seccion,mapaSel.seccion)):null;
  const nota=sc?sc.nota:pg?pg.nota:md.nota;
  const titulo=sc?sc.seccion:pg?pg.pagina:md.modulo;
  const aqui=P.filter(x=>dentroDe(x.donde,mapaSel)),ab=aqui.filter(abierta),ver=aqui.filter(x=>/✔️/.test(x.estado));
  const ids=new Set(aqui.map(x=>x.id));
  const sql=(S.sql||[]).filter(s=>s.id&&ids.has(s.id));
  const sqlFalta=sql.filter(s=>!s.produccion).length;
  const valor=S.puntos?S.puntos.valor:0;
  const regalado=S.puntos?S.puntos.filas.filter(f=>ids.has(f.id)&&f.tipo==='Cortesía').reduce((a,f)=>a+f.puntos,0)*valor:0;
  let h='<div class="ruta-lugar">'+esc(S.proyecto.codigo)+SEP_LUGAR+esc(md.modulo)+(pg?SEP_LUGAR+esc(pg.pagina):'')+(sc?SEP_LUGAR+esc(sc.seccion):'')+'</div>'
    +'<h2 class="lugar-tit">'+esc(titulo)+'</h2>'+(nota?notaTuya(nota):'');
  h+='<div class="cards" style="margin-top:14px">'+card(aqui.length,'piezas en total')+card(ab.length,'abiertas',ab.length?'azul':'')+card(sqlFalta,'SQL sin ejecutar en producción',sqlFalta?'alerta':'')+card('$'+fmtN(regalado),'regalado aquí')+'</div>';
  h+='<section class="seccion"><h2>Abiertas aquí</h2>'+(ab.length?'<div class="lista">'+ab.map(filaPieza).join('')+'</div>':'<div class="aviso">Nada abierto en este lugar.</div>')+'</section>';
  if(ver.length)h+='<section class="seccion"><h2>Verificadas aquí · '+ver.length+'</h2><div class="aviso" style="margin:0">'+ver.slice(0,12).map(x=>'<b>'+esc(x.id)+'</b> '+esc(tituloPieza(x.desc))).join(' · ')+(ver.length>12?' …':'')+'</div></section>';
  if(sql.length)h+='<section class="seccion"><h2>SQL de este lugar</h2><div class="lista">'+sql.map(s=>'<div class="item" onclick="irA(\'sql\')">'+ic('sql',16)+'<code>'+esc(s.rel.split('/').pop())+'</code><span class="meta">'+(s.produccion?'<span class="est est-v">en producción</span>':'<span class="est est-c">falta en producción</span>')+'</span></div>').join('')+'</div></section>';
  // agregar lugares debajo de este
  const sub=sc?'':pg?'sección':'página';
  h+='<section class="seccion"><h2>Editar este lugar</h2><div class="fila-form"><input type="text" id="lgNota" placeholder="Nota de este lugar (ej. el cliente siempre cambia esta tabla)" value="'+esc(nota||'')+'" style="flex:3"><button class="btn sec" onclick="guardarNotaLugar()">Guardar nota</button></div>'
    +(sub?'<div class="fila-form"><input type="text" id="lgNuevo" placeholder="'+(sub==='página'?'Ruta de la página, ej. /rentas':'Nombre de la sección, ej. Tabla')+'"><button class="btn sec" onclick="agregarLugar()">'+ic('nuevo',16)+'Agregar '+sub+'</button></div>':'')
    +'<div class="aviso">Se guarda en <code>'+esc(S.mapa.file||'MAPA-'+S.proyecto.codigo+'.md')+'</code>, que también lee la IA.</div></section>';
  return h;
}
function filaPieza(x){
  const spec=(S.specs||[]).find(s=>s.file&&s.file.includes(x.id));
  return '<div class="item pieza"'+(spec?' onclick="irA(\'specs\');setTimeout(()=>abrirSpec(\''+esc(spec.file)+'\'),50)"':' style="cursor:default"')+'><code><b>'+esc(x.id)+'</b></code><span style="flex:1;min-width:0">'+esc(tituloPieza(x.desc))+'</span>'+(x.tipo?'<span class="tipo">'+esc(x.tipo)+'</span>':'')+'<span class="est '+claseEst(x.estado)+'">'+esc(x.estado.replace(/^\S+\s/,''))+'</span></div>';
}
async function guardarLugares(L){await api('/api/mapa'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lugares:L})});await recargar()}
async function guardarNotaLugar(){
  const L=JSON.parse(JSON.stringify(S.mapa.lugares)),n=$('#lgNota').value.trim();
  let l=L.find(x=>igual(x.cod||x.modulo,mapaSel.cod)&&igual(x.pagina,mapaSel.pagina||'')&&igual(x.seccion,mapaSel.seccion||''));
  if(!l){const m=moduloDe(mapaSel.cod);l={cod:m?m.cod:mapaSel.cod,modulo:m?m.modulo:'',pagina:mapaSel.pagina||'',seccion:mapaSel.seccion||'',nota:''};L.push(l)}
  l.nota=n;await guardarLugares(ordenarLugares(L));toast('Nota guardada');
}
async function agregarLugar(){
  const v=$('#lgNuevo').value.trim();if(!v)return;
  const L=JSON.parse(JSON.stringify(S.mapa.lugares)),m=moduloDe(mapaSel.cod)||{cod:mapaSel.cod,modulo:''};
  if(mapaSel.pagina)L.push({cod:m.cod,modulo:m.modulo,pagina:mapaSel.pagina,seccion:v,nota:''});
  else L.push({cod:m.cod,modulo:m.modulo,pagina:v.startsWith('/')?v:'/'+v,seccion:'',nota:''});
  await guardarLugares(ordenarLugares(L));toast('Agregado al mapa');
}
// módulo, luego sus páginas, luego sus secciones (en el orden en que se agregaron)
function ordenarLugares(L){
  const out=[],cods=[];for(const l of L){const c=(l.cod||l.modulo).toUpperCase();if(!cods.includes(c))cods.push(c)}
  for(const c of cods){const de=L.filter(l=>(l.cod||l.modulo).toUpperCase()===c);
    out.push(...de.filter(l=>!l.pagina));const pgs=[];for(const l of de)if(l.pagina&&!pgs.some(p=>igual(p,l.pagina)))pgs.push(l.pagina);
    for(const pg of pgs){out.push(...de.filter(l=>igual(l.pagina,pg)&&!l.seccion));out.push(...de.filter(l=>igual(l.pagina,pg)&&l.seccion))}}
  return out;
}

// ---- Tipo y Dónde en la tabla del Resumen ----
function opcionesDonde(actualV){
  const L=(S.mapa&&S.mapa.lugares)||[],ops=L.map(textoLugar);
  if(actualV&&!ops.some(o=>igual(o,actualV)))ops.unshift(actualV);
  return '<option value="">—</option>'+ops.map(o=>'<option'+(igual(o,actualV)?' selected':'')+'>'+esc(o)+'</option>').join('');
}
function celdaTipo(id,v){return '<select class="sel-celda" aria-label="Tipo de '+esc(id)+'" onchange="ponerCelda(\''+esc(id)+'\',\'tipo\',this.value)"><option value="">—</option>'+S.tiposSolicitud.map(t=>'<option'+(t===v?' selected':'')+'>'+t+'</option>').join('')+'</select>'}
function celdaDonde(id,v){return '<select class="sel-celda" aria-label="Dónde de '+esc(id)+'" onchange="ponerCelda(\''+esc(id)+'\',\'donde\',this.value)">'+opcionesDonde(v)+'</select>'}
async function ponerCelda(id,col,valor){await api('/api/changelog/celda'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,col,valor})});toast(id+' · '+(col==='tipo'?'Tipo':'Dónde')+': '+(valor||'—'));S=await api('/api/estado'+qp())}
async function agregarColumnas(){await api('/api/changelog/columnas'+qp(),{method:'POST'});toast('Columnas Tipo y Dónde agregadas');recargar()}

// ---- Configuración: ficha + montos + módulos + fechas planeadas + lanzadores ----
function pintarConfig(m){
  pintarProyecto(m);
  const P=S.puntos||{},C=S.cobrosParam||{};
  const num=(id,lbl,v,ayuda)=>'<label class="campo"><span>'+lbl+'</span><input type="number" min="0" step="any" id="'+id+'" value="'+(v===undefined||v===null?'':v)+'">'+(ayuda?'<small>'+ayuda+'</small>':'')+'</label>';
  let h='<div class="seccion"><h2>Montos</h2><div class="aviso" style="margin:-4px 0 12px">Se guardan en <code>PUNTOS-'+esc(S.proyecto.codigo)+'.md</code> y <code>COBROS-'+esc(S.proyecto.codigo)+'.md</code>; Puntos y Cobro los leen de ahí.</div><div class="campos">'
    +num('mValor','Valor del punto',P.valorPropio?P.valor:'','vacío = la base de Timón ($'+fmtN(S.cobroBase?S.cobroBase.valorPunto:P.valor||400)+')')+num('mContr','Puntos contratados',P.contratados)+num('mBolsa','Bolsa de cortesía',P.bolsa,'puntos que puedes regalar')
    +num('mTotal','Total contratado',C.contratado,'pesos')+num('mIguala','Iguala mensual',C.iguala,'pesos al mes')+num('mIgPts','Puntos de iguala por mes',C.igualaPuntos)
    +'<label class="campo"><span>Registrar desde</span><input type="date" id="mDesde" value="'+esc(P.desde||'')+'"><small>lo anterior no se pide clasificar</small></label></div>'
    +'<div class="fila-form"><button class="btn" onclick="guardarMontosUI()">Guardar montos</button></div></div>';
  // módulos
  const mods=arbolMapa();
  h+='<div class="seccion"><h2>Módulos</h2><div class="aviso" style="margin:-4px 0 12px">La IA elige de esta lista al registrar piezas (columna Dónde). Las páginas y secciones se agregan desde el Mapa.</div>'
    +'<div class="tablewrap"><table><tr><th>Código</th><th>Módulo</th><th>Páginas o secciones</th><th></th></tr>'
    +mods.map(md=>'<tr><td><code><b>'+esc(md.cod)+'</b></code></td><td>'+esc(md.modulo)+'</td><td>'+(md.paginas.map(p=>esc(p.pagina)+(p.secciones.length?' ('+p.secciones.map(s=>esc(s.seccion)).join(', ')+')':'')).join(' · ')||'<span class="aviso">sin páginas</span>')+'</td><td><button class="mini" onclick="mapaSel={cod:\''+esc(md.cod)+'\'};irA(\'mapa\')">'+ic('mapa',16)+'Ver en el mapa</button></td></tr>').join('')
    +'</table></div><div class="fila-form"><input type="text" id="nmCod" placeholder="Código (ej. REN)" style="flex:0 1 140px;text-transform:uppercase" maxlength="6"><input type="text" id="nmNom" placeholder="Nombre del módulo (ej. Rentas)"><button class="btn sec" onclick="agregarModulo()">'+ic('nuevo',16)+'Módulo</button></div></div>';
  // fechas planeadas (TMN-049: Timón las sugiere; tú decides)
  const EU=ETAPAS_UI,EP=S.etapasPlan||{},tam=S.tamano||'mediano';
  h+='<div class="seccion" id="cfgFechas"><h2>Fechas planeadas por etapa</h2><div class="aviso" style="margin:-4px 0 12px">Las usa el Gantt para comparar lo planeado contra lo real. Lo real sale solo del historial.'+(Object.keys(EP).length&&S.etapasPlanAuto?' <b>Estas las puso Timón</b>: se ajustan solas al aceptar la cotización mientras no las cambies.':'')+'</div>'
    +'<div class="fila-form" style="margin:0 0 12px"><label class="campo" style="flex-direction:row;align-items:center;gap:8px">Tamaño <select id="cfgTam">'+['chico','mediano','grande'].map(t=>'<option value="'+t+'"'+(t===tam?' selected':'')+'>'+t[0].toUpperCase()+t.slice(1)+'</option>').join('')+'</select></label><button class="btn sec" onclick="sugerirFechas()">'+ic('sugerir',16)+'Sugerir fechas</button></div><div id="cfgSug"></div>'
    +'<div class="tablewrap"><table><tr><th>Etapa</th><th>Inicio</th><th>Fin</th></tr>'
    +EU.map(([k,n])=>'<tr><td><b>'+n+'</b></td><td><input type="date" id="epI_'+k+'" value="'+esc((EP[k]||{}).inicio||'')+'"></td><td><input type="date" id="epF_'+k+'" value="'+esc((EP[k]||{}).fin||'')+'"></td></tr>').join('')
    +'</table></div><div class="fila-form"><button class="btn" onclick="guardarEtapasUI()">Guardar fechas</button></div></div>';
  const ficha=m.querySelector('.seccion:not([style])')||m.firstElementChild;
  if(ficha)ficha.insertAdjacentHTML('afterend',h);else m.insertAdjacentHTML('afterbegin',h);
}
async function guardarMontosUI(){
  const v=id=>$('#'+id).value;
  await api('/api/config/montos'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({valor:v('mValor'),contratados:v('mContr'),bolsa:v('mBolsa'),totalContratado:v('mTotal'),iguala:v('mIguala'),igualaPuntos:v('mIgPts'),desde:v('mDesde')})});
  toast('Montos guardados');recargar();
}
async function agregarModulo(){
  const c=$('#nmCod').value.trim().toUpperCase(),n=$('#nmNom').value.trim();
  if(!c||!n)return toast('Falta el código o el nombre');
  if(arbolMapa().some(md=>igual(md.cod,c)))return toast('Ya existe el módulo '+c);
  await guardarLugares([...(S.mapa.lugares||[]),{cod:c,modulo:n,pagina:'',seccion:'',nota:''}]);toast('Módulo '+c+' agregado');
}
async function guardarEtapasUI(){
  const plan={};for(const [k] of ETAPAS_UI)plan[k]={inicio:$('#epI_'+k).value,fin:$('#epF_'+k).value};
  await api('/api/config/etapas'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan})});toast('Fechas guardadas');recargar();
}
// Sugerir fechas: de tu historial, de los puntos cotizados o de la plantilla por tamaño
let SUGP=null;
async function sugerirFechas(){
  const tam=$('#cfgTam').value;
  if(tam!==(S.tamano||'mediano')){await api('/api/tmn'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tmn:{...(S.tmn||{}),tamano:tam}})});S=await api('/api/estado'+qp())}
  SUGP=await api('/api/plan/sugerir'+qp());
  const EP=S.etapasPlan||{},fc=s=>s?fFecha(s):'—';
  $('#cfgSug').innerHTML='<div class="sug-plan"><div class="tablewrap"><table><tr><th>Etapa</th><th>Ahora</th><th>Sugerido</th><th>De dónde sale</th></tr>'
    +ETAPAS_UI.filter(([k])=>SUGP.plan[k]).map(([k,n])=>{const a=EP[k]||{},b=SUGP.plan[k],igual=a.inicio===b.inicio&&a.fin===b.fin;return '<tr><td><b>'+n+'</b></td><td>'+(a.inicio?fc(a.inicio)+' a '+fc(a.fin):'—')+'</td><td'+(igual?'':' class="cambia"')+'>'+fc(b.inicio)+' a '+fc(b.fin)+'</td><td class="aviso" style="margin:0">'+esc(SUGP.fuentes[k])+'</td></tr>'}).join('')
    +'</table></div><div class="fila-form"><button class="btn" onclick="aplicarSugerencia()">Usar estas fechas</button><button class="btn sec" onclick="$(\'#cfgSug\').innerHTML=\'\'">Cancelar</button></div>'
    +'<div class="aviso">'+(SUGP.ritmo?'Entregas en promedio '+String(SUGP.ritmo).replace('.',',')+' puntos verificados por semana.':'Todavía no hay puntos verificados con fecha: Construcción sale de la plantilla.')+' Las etapas que ya pasaron se quedan con sus fechas reales.</div></div>';
}
async function aplicarSugerencia(){
  const tieneManual=Object.keys(S.etapasPlan||{}).length&&!S.etapasPlanAuto;
  if(tieneManual&&!confirm('Este proyecto ya tiene fechas que pusiste tú. ¿Cambiarlas por las sugeridas?'))return;
  await post('/api/plan/aplicar',{tamano:$('#cfgTam').value});toast('Fechas planeadas listas');SUGP=null;await recargar();
  const el=$('#cfgFechas');if(el)el.scrollIntoView({block:'start'});
}
