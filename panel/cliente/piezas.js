// Timón · Fase 3: Piezas, la pieza como expediente, Probar en sesión y SQL a un lado (TMN-034, TMN-035, TMN-022, TMN-041)
const post=(u,b)=>api(u+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})});
const ESTADO_CORTO=e=>e?{v:'Verificada',d:'Descartada',b:'Por probar',c:'En el taller',p:'Pendiente'}[grupoEst(e)]:'—';
const fechaCorta=f=>/^\d{4}-?\d{2}-?\d{2}/.test(isoLocal(f))?fFecha(f):'';

// ---------------- Lista de piezas ----------------
let pzEstado='abiertas',pzTipo='',pzTxt='',piezaAbierta=null,PZ=null;
function pintarPiezas(m){
  if(piezaAbierta)return pintarPieza(m);
  const todas=piezas(),pts={};(S.puntos?S.puntos.filas:[]).forEach(f=>pts[f.id]=f);
  const cambio=id=>(S.cambios||{})[id],hoyPz=hoyLocal(),movidaHoy=x=>{const c=cambio(x.id);return !!c&&isoLocal(c.f).slice(0,10)===hoyPz};
  const filtro=x=>(pzEstado==='todas'||(pzEstado==='hoy'?movidaHoy(x):pzEstado==='abiertas'?abierta(x):ESTADO_CORTO(x.estado)===pzEstado))&&(!pzTipo||x.tipo===pzTipo)&&(!pzTxt||(x.id+' '+x.desc).toLowerCase().includes(pzTxt.toLowerCase()));
  const L=todas.filter(filtro);
  const chip=(v,l,n)=>'<button class="chipf'+(pzEstado===v?' on':'')+'" onclick="pzEstado=\''+v+'\';pintar()">'+l+(n!==undefined?' <span class="n">'+n+'</span>':'')+'</button>';
  const cuenta=e=>todas.filter(x=>ESTADO_CORTO(x.estado)===e).length;
  let h='<div class="pz-barra"><div class="pz-chips">'+chip('abiertas','Abiertas',todas.filter(abierta).length)+chip('Pendiente','Pendientes',cuenta('Pendiente'))+chip('En el taller','En el taller',cuenta('En el taller'))+chip('Por probar','Por probar',cuenta('Por probar'))+chip('Verificada','Verificadas',cuenta('Verificada'))+chip('todas','Todas',todas.length)+(todas.some(movidaHoy)?chip('hoy','Movidas hoy',todas.filter(movidaHoy).length):'')+'</div>'
    +'<div class="pz-chips"><select aria-label="Tipo" onchange="pzTipo=this.value;pintar()"><option value="">Tipo: todos</option>'+(S.tiposSolicitud||[]).map(t=>'<option'+(t===pzTipo?' selected':'')+'>'+t+'</option>').join('')+'</select>'
    +'<input type="text" placeholder="Buscar por ID o texto" value="'+esc(pzTxt)+'" oninput="pzTxt=this.value;clearTimeout(window._pzT);window._pzT=setTimeout(pintar,250)" aria-label="Buscar pieza">'
    +'</div></div>';
  const fila=x=>{const f=pts[x.id];return '<button class="pz-fila" onclick="abrirPieza(\''+esc(x.id)+'\')"><code><b>'+esc(x.id)+'</b></code><span class="t">'+esc(tituloPieza(x.desc))+(partesLugar(x.donde||'')[1]?' <small class="pz-pg">'+esc(partesLugar(x.donde)[1])+'</small>':'')+'</span>'+(x.tipo?'<span class="tipo">'+esc(x.tipo)+'</span>':'')+(saltoPz(x)?'<span class="pz-salto" title="Pasó a Verificada sin haber estado en Por probar">'+ic('alerta',14)+'Sin construir</span>':'')+'<span class="pts">'+(f?fmtN(f.puntos)+' pts':'')+'</span>'+(cambio(x.id)?'<span class="pz-cuando" title="Último cambio de estado">'+esc(fFecha(cambio(x.id).f))+'</span>':'<span class="pz-cuando"></span>')+'<span class="est '+claseEst(x.estado)+'">'+ESTADO_CORTO(x.estado)+'</span></button>'};
  const grupos=[];
  for(const md of arbolMapa()){const g=L.filter(x=>dentroDe(x.donde,{cod:md.cod}));if(g.length)grupos.push([md.modulo,md.cod,g])}
  const sin=L.filter(x=>!x.donde||!moduloDe(partesLugar(x.donde)[0]));if(sin.length)grupos.push(['Sin lugar asignado','',sin]);
  if(!L.length)h+='<div class="seccion"><div class="aviso" style="margin:0">No hay piezas con este filtro.</div></div>';
  for(const [tit,cod,g] of grupos){
    const sumPts=g.reduce((a,x)=>a+(pts[x.id]?pts[x.id].puntos:0),0);
    h+='<section class="seccion pz-grupo"><div class="pz-gcab">'+(cod?'<code class="cod">'+esc(cod)+'</code>':'')+'<h2>'+esc(tit)+'</h2><span class="aviso" style="margin:0">'+g.length+' pieza'+(g.length===1?'':'s')+(sumPts?' · '+fmtN(sumPts)+' pts':'')+'</span></div>';
    const recientes=(x,y)=>String((cambio(y.id)||{}).f||'').localeCompare(String((cambio(x.id)||{}).f||''))||y.id.localeCompare(x.id,undefined,{numeric:true});
    for(const e of ['En el taller','Por probar','Pendiente','Verificada','Descartada']){
      const xs=g.filter(x=>ESTADO_CORTO(x.estado)===e).sort(recientes);if(!xs.length)continue;
      h+='<div class="pz-sub est-'+({'En el taller':'c','Por probar':'b','Pendiente':'p','Verificada':'v','Descartada':'d'})[e]+'"><span>'+e+'</span><b>'+xs.length+'</b></div>'+xs.map(fila).join('');
    }
    h+='</section>';
  }
  m.innerHTML=h;
}
async function abrirPieza(id){piezaAbierta=id;PZ=null;if(tab!=='piezas'){tab='piezas';pintarNav()}else recordarRuta();await pintar();window.scrollTo(0,0)}
function cerrarPieza(){piezaAbierta=null;PZ=null;recordarRuta();pintar()}

// ---------------- La pieza como expediente ----------------
async function pintarPieza(m){
  const id=piezaAbierta;
  const yAntes=window.scrollY,mismo=!!m.querySelector('.pz-cab[data-id="'+id+'"]');
  if(!PZ||PZ.id!==id){if(!mismo)m.innerHTML='<div class="seccion">Cargando '+esc(id)+'…</div>';try{PZ=await api('/api/pieza'+qp()+'&id='+encodeURIComponent(id))}catch(e){piezaAbierta=null;return pintarPiezas(m)}}
  const x=PZ,tit=tituloPieza(x.descripcion),lugar=partesLugar(x.donde),md0=lugar.length?moduloDe(lugar[0]):null;
  const ruta=[S.proyecto.codigo,...(md0?[md0.modulo,...lugar.slice(1)]:lugar)].map(esc).join(SEP_LUGAR)+SEP_LUGAR+'<b>'+esc(id)+'</b>';
  // pasos del estado con su fecha (del historial)
  const fechaDe=re=>{const e=[...x.historial].reverse().find(e=>re.test(e.a||''));return e?fechaCorta(e.f):''};
  const pasos=[['Pendiente',/🔲/],['En el taller',/🔄/],['Construida',/✅/],['Verificada',/✔️/]];
  const iAct=['p','c','b','v'].indexOf(grupoEst(x.estado));
  let h='<div class="pz-volver"><span class="volver" onclick="cerrarPieza()">'+ic('anterior',16)+'Todas las piezas</span><span class="ruta-lugar">'+ruta+'</span></div>';
  h+='<div class="pz-cab" data-id="'+esc(id)+'"><div class="pz-id"><code>'+esc(id)+'</code>'+(x.tipo?'<span class="tipo">'+esc(x.tipo)+'</span>':'')+'</div><h1>'+esc(tit)+'</h1>'+lineaFechasPz(x)
    +'<ol class="pz-pasos">'+pasos.map(([n,re],i)=>{const st=grupoEst(x.estado)==='d'?'':i<iAct?'hecho':i===iAct?'ahora':'';return '<li class="'+st+'"><button '+(st==='ahora'?'aria-current="step" disabled':'onclick="estadoPieza('+i+')" title="Pasar a '+n+'"')+'>'+(st==='hecho'?'✓ ':'')+n+(fechaDe(re)?' · '+fechaDe(re):'')+(st==='ahora'&&i===2?' · falta probar':'')+'</button></li>'}).join('')+(grupoEst(x.estado)==='d'?'<li class="ahora"><button disabled>Descartada</button></li>':'')+'</ol></div>';
  h+='<div class="pz-cuerpo"><div class="pz-main">';
  const sec=(n,t,cuerpo,extra)=>'<section class="seccion pz-sec"><div class="pz-sec-cab"><span class="num">'+n+'</span><h2>'+t+'</h2>'+(extra||'')+'</div>'+cuerpo+'</section>';
  // 01 lo que se pidió
  const pedido=x.spec&&x.spec.pedido&&!/^\[/.test(x.spec.pedido)?x.spec.pedido:x.descripcion;
  h+=sec('01','Lo que se pidió','<div class="md">'+md(pedido)+'</div>','<span class="aviso" style="margin:0">'+esc(x.quien||'')+(x.fecha?' · '+esc(fechaCorta(x.fecha)):'')+'</span>');
  // 02 dónde
  h+=sec('02','Dónde','<div class="fila-form" style="margin:0">'+celdaDonde(id,x.donde).replace('onchange="','onchange="PZ=null;')+celdaTipo(id,x.tipo).replace('onchange="','onchange="PZ=null;')+'</div>'+(x.modulo?'<div class="aviso">Módulo o área escrito a mano: '+esc(x.modulo)+'</div>':''));
  // 03 spec
  h+=sec('03','Spec',x.spec?'<details class="pz-spec"'+(pzSpecAbierto?' open':'')+' ontoggle="pzSpecAbierto=this.open"><summary>Leer el spec completo</summary>'+specPorPartes(x)+'</details>':'<div class="aviso" style="margin:0">Esta pieza no tiene spec. La IA lo arma con <code>armar-spec</code>; si solo quieres anotar algo, crea uno corto.</div><div class="fila-form"><button class="btn sec" onclick="crearSpecPieza()">'+ic('spec',16)+'Crear spec corto</button></div>',x.spec?'<code class="pz-file">'+esc(x.spec.file)+'</code><button class="mini" onclick="irA(\'specs\');setTimeout(()=>abrirSpec(\''+esc(x.spec.file)+'\'),60)">'+ic('editar',16)+'Editar</button>':'');
  // 04 lo que se hizo
  const hecho=x.spec&&x.spec.hecho&&!/^\[/.test(x.spec.hecho)?x.spec.hecho:'';
  h+=sec('04','Lo que se hizo',hecho?'<div class="md">'+md(hecho)+'</div>'+(x.spec?comentariosDe(x,'Sección: Lo que se hizo')+botonComentar(x.spec.file,'Sección: Lo que se hizo'):''):'<div class="aviso" style="margin:0">Lo escribe la IA al construir, en la sección "Lo que se hizo" del spec.</div>','<span class="aviso" style="margin:0">lo escribe la IA</span>');
  // 05 checklist
  const items=x.checklists.flatMap((c,j)=>c.items.map(it=>({...it,file:c.file})));
  const hechos=items.filter(i=>i.hecho).length;
  let chk='';
  if(items.length){chk=items.map(it=>pasoChecklist(it,'pz')).join('');if(x.checklistEnSpec)chk+='<div class="aviso">Estos pasos están dentro del spec. Para tenerlos aparte: <span class="volver" style="margin:0" onclick="crearChecklistPieza()">crear checklist</span>.</div>'}
  else chk='<div class="aviso" style="margin:0">Sin checklist todavía.</div><div class="fila-form"><button class="btn sec" onclick="crearChecklistPieza()">'+ic('probar',16)+'Crear checklist'+(x.spec?' con los criterios del spec':'')+'</button></div>';
  if(x.checklistFiles.length)chk+='<div id="chkEdit"></div>';
  h+=sec('05','Checklist',chk,(items.length?'<span class="pill'+(hechos===items.length?' g':' w')+'"><b>'+hechos+'/'+items.length+'</b></span>':'')+(/✅/.test(x.estado)?'<button class="mini" onclick="probarPieza(\''+esc(id)+'\')">Probar en sesión →</button>':'')+(x.checklistFiles.length?'<button class="mini" onclick="editarChecklist()">'+ic('editar',16)+'Editar</button>':''));
  // 06 SQL
  if(x.sql.length)h+=sec('06','SQL',x.sql.map((s,k)=>'<div class="pz-sql"><button class="mini" onclick="abrirPanelSql(\''+esc(s.rel)+'\')">'+ic('sql',16)+'<code>'+esc(s.rel.split('/').pop())+'</code></button>'
    +['desarrollo','produccion'].map(e=>'<label class="pz-env"><input type="checkbox"'+(s[e]?' checked':'')+' onchange="marcarSqlRel(\''+esc(s.rel)+'\',\''+e+'\',this.checked)">'+(e==='produccion'?'producción':'desarrollo')+(s[e]?' <small>'+esc(fechaCorta(s[e]))+'</small>':'')+'</label>').join('')+'</div>').join(''));
  // 07 cobro
  const P=x.puntos;
  h+=sec('07','Cobro',P?'<div class="pz-cobro"><b>'+fmtN(P.puntos)+' pts</b><span>$'+fmtN(P.puntos*(P.valor||0))+'</span><span class="tipo">'+esc(P.tipo)+(P.tipo==='Extra'?(P.cobrado?' · cobrado':' · por cobrar'):'')+'</span><button class="mini" onclick="irA(\'puntos\')">Cambiar en Puntos</button></div>':'<div class="aviso" style="margin:0">Sin puntos todavía. La decisión de cobrar o regalar llega en la Fase 4; por ahora se registra en Puntos.</div><div class="fila-form"><button class="btn sec" onclick="irA(\'puntos\')">'+ic('puntos',16)+'Ir a Puntos</button></div>');
  // 08 historial
  h+=sec('08','Historial',x.historial.length?'<ul class="pz-hist">'+x.historial.map(e=>'<li><span>'+esc(fechaCorta(e.f))+(fHora(e.f)?' '+esc(fHora(e.f)):'')+'</span>'+(e.de?esc(ESTADO_CORTO(e.de))+' → ':'')+'<b>'+esc(ESTADO_CORTO(e.a))+'</b>'+(e.aprox?' <small>(registro)</small>':'')+'</li>').join('')+'</ul>':'<div class="aviso" style="margin:0">Todavía sin movimientos registrados.</div>');
  // 09 hilos (TMN-068)
  const HL=x.hilos||[];
  h+=sec('09','Hilos',HL.length?'<div class="car-pz-hilos">'+HL.map(e=>'<div class="car-hilo"><code class="car-cod">'+esc(e.hilo)+'</code><button class="mini" onclick="copiarTexto(\''+esc(e.hilo)+'\')">'+ic('copiar',14)+'Copiar</button>'+(e.enlace&&/^https?:/.test(e.enlace)?'<button class="mini" onclick="window.open(\''+esc(e.enlace)+'\',\'_blank\')">'+ic('enlace',14)+'Abrir el chat</button>':'<button class="mini" onclick="enlaceHilo(\''+esc(e.hilo)+'\')">'+ic('enlace',14)+'Guardar enlace</button>')+'<span class="aviso" style="margin:0">'+(e.carril?'Carril '+e.carril+' · ':'')+esc(e.estado||'')+(e.fecha?' · '+esc(fechaCorta(e.fecha)):'')+'</span></div>').join('')+'</div><div class="aviso">Busca el código en tus chats para encontrar dónde se trabajó.</div>':'<div class="aviso" style="margin:0">Todavía no se trabaja en ningún chat. El hilo lo pone la IA sola al empezar (regla 25).</div>');
  h+='</div>';
  // lateral: comentarios + acciones
  const ab=x.comentarios.filter(c=>!c.atendido);
  const destinos=[...(x.spec?[x.spec.file]:[]),...x.checklistFiles];
  h+='<aside class="pz-lado"><section class="seccion pz-coment"><h2>Tus comentarios'+(ab.length?' <span class="n">'+ab.length+' abiertos</span>':'')+'</h2><div class="aviso" style="margin:-4px 0 10px">Se guardan dentro del spec o del checklist. La IA los lee antes de tocar esta pieza y los marca como atendidos.</div>'
    +(x.comentarios.length?x.comentarios.map(c=>'<div class="coment'+(c.atendido?' at':'')+'"><label><input type="checkbox"'+(c.atendido?' checked':'')+' onchange="marcarComent(\''+esc(c.archivo)+'\','+c.linea+',this.checked)" aria-label="Atendido"></label><div>'+(c.sobre?'<div class="sobre">'+esc(c.sobre)+'</div>':'')+'<div class="nota-mano tuya" style="font-size:22px">'+esc(c.texto)+'</div><small>'+esc(fechaCorta(c.fecha))+' · '+esc(c.archivo.split('/').pop())+(c.atendido?' · atendido':'')+'</small></div></div>').join(''):'')
    +(destinos.length?'<textarea id="pzComent" rows="3" placeholder="Ej. el botón queda muy abajo en el celular; el texto de la alerta suena regañón"></textarea><div class="fila-form"><select id="pzDestino" aria-label="Dónde guardarlo">'+destinos.map(d=>'<option value="'+esc(d)+'">en '+esc(d.split('/').pop())+'</option>').join('')+'</select><button class="btn" onclick="agregarComent()">Anotar</button></div>'
      :'<div class="aviso">Para anotar comentarios, la pieza necesita un spec o un checklist.</div><div class="fila-form"><button class="btn sec" onclick="crearSpecPieza()">Crear spec corto</button></div>')
    +'</section>';
  h+='<section class="seccion pz-acc"><h2>Acciones</h2>'
    +'<div class="pz-estado"><div class="lbl">Estado</div><div class="pz-est-btns">'+[['🔲 Pendiente','Pendiente'],['🔄 En construcción','En el taller'],['✅ Construido','Construida'],['✔️ Verificado','Verificada']].map(([e,n],i)=>{const on=grupoEst(x.estado)===['p','c','b','v'][i];return '<button class="e'+i+(on?' on':'')+'" '+(on?'aria-current="true" disabled':'onclick="estadoPieza('+i+')"')+'>'+n+'</button>'}).join('')+'</div>'
    +(/🚫/.test(x.estado)?'':'<button class="lnk pz-desc" onclick="estadoPieza(4)">Descartar la pieza</button>')+'</div>'
    +'<div class="pz-probar"><div class="lbl">Para probarlo</div>'+accesoProbar(x.probarEn,actual,S.lanzadores,id)+'</div>'
    +(/✅/.test(x.estado)?'<button class="btn sec" onclick="probarPieza(\''+esc(id)+'\')">'+ic('probar',16)+'Probar en sesión</button>':'')
    +(x.spec?'<button class="btn sec" onclick="abrirEditor(\''+esc(x.spec.file)+'\',0)">'+ic('codigo',16)+'Abrir el spec en el editor</button>':'')
    +(/🔲/.test(x.estado)&&!HL.length?'<button class="btn" onclick="tomarPiezaPanel(\''+esc(id)+'\')" title="Le da hilo y carril y copia el mensaje para un chat nuevo">'+ic('play',16)+'Tomar pieza</button>':'')
    +'<button class="btn sec" onclick="copiarParaIA()">'+ic('copiar',16)+'Copiar '+esc(id)+' para la IA</button>'

    +(ab.length?notaTimon(ab.length===1?'tienes 1 comentario sin atender':'tienes '+ab.length+' comentarios sin atender'):'')+'</section></aside></div>';
  m.innerHTML=h;if(mismo)window.scrollTo(0,yAntes);
}
const EST_PZ=['🔲 Pendiente','🔄 En construcción','✅ Construido','✔️ Verificado','🚫 Descartado'];
async function estadoPieza(i){const ok=await cambiarEstadoA(piezaAbierta,EST_PZ[i]);if(ok){PZ=null;pintar()}}
// un paso de checklist: casilla + detalle + botón de SQL si el paso nombra un archivo .sql
function pasoChecklist(it,ctx){
  const sq=sqlDelTexto(it.texto+' '+it.detalle.join(' '));
  return '<div class="chk'+(it.hecho?' ok':'')+(sq?' con-sql':'')+'" onclick="clicChk(event,this)"><input type="checkbox"'+(it.hecho?' checked':'')+' aria-label="Paso hecho" onchange="marcarPaso(\''+esc(it.file)+'\','+it.linea+',this.checked,\''+ctx+'\')"><span style="flex:1"><span>'+fmtTxt(it.texto)+'</span>'+(it.detalle.length?'<div class="det">'+it.detalle.map(fmtTxt).join('<br>')+'</div>':'')+'</span>'
    +(sq?'<button class="mini sql-btn" onclick="abrirPanelSql(\''+esc(sq.rel)+'\',{file:\''+esc(it.file)+'\',linea:'+it.linea+',ctx:\''+ctx+'\'})">'+ic('sql',16)+'Ver SQL</button>':'')
    +botonComentar(it.file,'Paso: '+it.texto,ctx,true)+'</div>'+(ctx==='pz'&&PZ?comentariosDe(PZ,'Paso: '+it.texto):'');
}
// Toda la tarjeta del paso marca la casilla (menos sus botones y si estás seleccionando texto para comentar)
function clicChk(e,el){
  if(e.target.closest('button,a,input,textarea,select,label,.coment-form'))return;
  const sel=window.getSelection&&String(window.getSelection());if(sel&&sel.trim())return;
  const c=el.querySelector('input[type=checkbox]');if(c){c.checked=!c.checked;c.dispatchEvent(new Event('change',{bubbles:true}))}
}
function sqlDelTexto(t){const m=String(t).match(/[\w\-./]+\.sql\b/i);if(!m)return null;const base=m[0].split('/').pop().toLowerCase();return (S.sql||[]).find(s=>s.rel.toLowerCase().endsWith('/'+base)||s.rel.toLowerCase()===base)||null}
async function marcarPaso(file,linea,v,ctx){await post('/api/verificar/marcar',{file,linea,hecho:v});if(ctx==='pz'){PZ=null;pintar()}else{VER=[];pintar()}}
async function crearChecklistPieza(){const r=await post('/api/pieza/checklist',{id:piezaAbierta});toast('Checklist creado: '+r.file);PZ=null;S=await api('/api/estado'+qp());pintar()}
async function crearSpecPieza(){const r=await post('/api/pieza/spec',{id:piezaAbierta,titulo:tituloPieza(PZ?PZ.descripcion:'')});toast('Spec creado: '+r.file);PZ=null;S=await api('/api/estado'+qp());pintar()}
async function editarChecklist(){
  const f=PZ.checklistFiles[0];const r=await api('/api/archivo'+qp()+'&f='+encodeURIComponent(f));
  $('#chkEdit').innerHTML='<textarea id="chkTxt" class="editorArea" style="min-height:260px">'+esc(r.contenido||'')+'</textarea><div class="fila-form"><button class="btn" onclick="guardarChecklistTxt(\''+esc(f)+'\')">Guardar checklist</button><button class="btn sec" onclick="$(\'#chkEdit\').innerHTML=\'\'">Cancelar</button></div>';
}
async function guardarChecklistTxt(f){await api('/api/checklist'+qp(),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:f,contenido:$('#chkTxt').value})});toast('Checklist guardado');PZ=null;pintar()}
async function agregarComent(){const t=$('#pzComent').value.trim();if(!t)return toast('Escribe el comentario');await post('/api/pieza/comentario',{archivo:$('#pzDestino').value,texto:t});toast('Anotado. La IA lo verá al tocar esta pieza');PZ=null;pintar()}
async function marcarComent(archivo,linea,v){await post('/api/pieza/comentario/estado',{archivo,linea,atendido:v});PZ=null;pintar()}
async function copiarParaIA(){
  const x=PZ,ab=x.comentarios.filter(c=>!c.atendido);
  const t=[x.id+' · '+tituloPieza(x.descripcion),'Proyecto: '+S.proyecto.nombre+' ('+S.proyecto.codigo+')',x.donde?'Dónde: '+x.donde:'',x.tipo?'Tipo: '+x.tipo:'','Estado: '+x.estado,x.spec?'Spec: '+x.spec.file:'',x.checklistFiles.length?'Checklist: '+x.checklistFiles.join(', '):'',
    ab.length?'Tengo '+ab.length+' comentario(s) sin atender en "Comentarios de Yanga" de esos archivos; léelos antes de tocar la pieza y márcalos como Atendido al resolverlos:\n'+ab.map(c=>'- '+(c.sobre?'['+c.sobre+'] ':'')+c.texto).join('\n'):''].filter(Boolean).join('\n');
  try{await navigator.clipboard.writeText(t);toast('Copiado: pégalo en Claude')}catch(e){prompt('Copia esto:',t)}
}
async function marcarSqlRel(rel,entorno,v){await post('/api/sql/aplicado',{rel,entorno,aplicado:v});toast(rel.split('/').pop()+' · '+(entorno==='produccion'?'producción':'desarrollo')+(v?' ✓':' ✗'));S=await api('/api/estado'+qp());PZ=null;pintar()}

// ---------------- SQL a un lado (TMN-035) ----------------
let panelSql=null;
async function abrirPanelSql(rel,paso){
  const r=await api('/api/archivo'+qp()+'&f='+encodeURIComponent(rel));
  panelSql={rel,paso:paso||null,contenido:r.contenido||''};pintarPanelSql();
}
function pintarPanelSql(){
  let el=$('#panelSql');if(!el){el=document.createElement('aside');el.id='panelSql';el.className='panel-sql';el.setAttribute('aria-label','SQL');document.body.appendChild(el)}
  if(!panelSql){el.remove();return}
  const s=(S.sql||[]).find(x=>x.rel===panelSql.rel)||{};
  el.innerHTML='<div class="ps-cab">'+ic('sql',20)+'<code>'+esc(panelSql.rel.split('/').pop())+'</code><button aria-label="Cerrar panel de SQL" onclick="panelSql=null;pintarPanelSql()">×</button></div>'
    +'<pre>'+esc(panelSql.contenido)+'</pre><div class="ps-pie"><button class="btn-claro" onclick="copiarPanelSql()">'+ic('copiar',18)+'Copiar SQL</button><div class="ps-tit">¿DÓNDE LO EJECUTASTE?</div><div class="ps-env">'
    +['desarrollo','produccion'].map(e=>'<label'+(e==='produccion'?' class="prod"':'')+'><input type="checkbox"'+(s[e]?' checked':'')+' onchange="marcarSqlPanel(\''+e+'\',this.checked)">'+(e==='produccion'?'Producción':'Desarrollo')+(s[e]?'<small>'+esc(fechaCorta(s[e]))+'</small>':'')+'</label>').join('')+'</div>'
    +(panelSql.paso?'<div class="ps-nota">Al marcar Producción se palomea el paso del checklist.</div>':'')+'</div>';
}
async function copiarPanelSql(){try{await navigator.clipboard.writeText(panelSql.contenido);toast('SQL copiado')}catch(e){toast('No pude copiar: selecciónalo a mano')}}
async function marcarSqlPanel(entorno,v){
  await post('/api/sql/aplicado',{rel:panelSql.rel,entorno,aplicado:v});
  if(entorno==='produccion'&&v&&panelSql.paso)await post('/api/verificar/marcar',{file:panelSql.paso.file,linea:panelSql.paso.linea,hecho:true});
  S=await api('/api/estado'+qp());toast(entorno==='produccion'?(v?'Ejecutado en producción':'Producción desmarcada'):(v?'Ejecutado en desarrollo':'Desarrollo desmarcado'));
  PZ=null;VER=[];pintarPanelSql();pintar();
}

// ---------------- Probar en sesión (P10) ----------------
let vActual=null,vSesion={};
function probarPieza(id){vActual=id;piezaAbierta=null;irA('verificar')}
async function pintarVerificar(m){
  if(!VER.length){m.innerHTML='<div class="seccion">Cargando…</div>';VER=(await api('/api/verificar'+qp())).items.sort(ordenProbar)}
  if(!VER.length){m.innerHTML='<div class="seccion" style="background:var(--tinte-ok)"><h2 style="color:#0B5E40">Nada por probar</h2><div class="aviso" style="color:#0B5E40">Todo lo construido en este proyecto ya está verificado.</div>'+(Object.keys(vSesion).length?'<div class="aviso" style="color:#0B5E40">En esta sesión: '+Object.entries(vSesion).map(([k,v])=>esc(k)+' '+(v==='ok'?'✓':v==='fallo'?'falló':'saltada')).join(' · ')+'</div>':'')+'</div>';return}
  if(vFoco){vActual=vFoco;vFoco=null}
  let i=VER.findIndex(x=>x.id===vActual);
  if(i<0){i=VER.findIndex(x=>!vSesion[x.id]);if(i<0)i=0;vActual=VER[i].id}
  const it=VER[i],items=it.checklists.flatMap(c=>c.items.map(x=>({...x,file:c.file}))),hechos=items.filter(x=>x.hecho).length,completo=items.length>0&&hechos===items.length;
  const L=S.lanzadores,l0=L[0],vivo=L.some(l=>l.corriendo),url=(L.find(l=>l.url)||{}).url;
  const fila=(VER.find(x=>x.id===it.id)||{}),pz=piezas().find(x=>x.id===it.id)||{};
  let h='<div class="pr-barra"><div class="pr-avance"><span class="ruta-lugar">PIEZA '+(i+1)+' DE '+VER.length+'</span><div class="pr-seg">'+VER.map(x=>'<span class="'+(x.id===it.id?'ahora':vSesion[x.id]==='ok'?'ok':vSesion[x.id]?'mal':'')+'"></span>').join('')+'</div></div>'
    +(vivo?(url?'<button class="btn sec" onclick="abrirUrl(actual,\''+esc(url)+'\')">'+ic('abrirFuera',16)+'Abrir la app</button>':''):(l0&&!l0.sugerido?'<button class="btn" onclick="runStart(0)">'+ic('play',16)+'Arrancar '+esc(S.proyecto.nombre)+'</button>':''))+'</div>';
  h+='<div class="pr-cuerpo"><section class="seccion pr-pieza"><div class="pz-id"><code>'+esc(it.id)+'</code>'+(pz.tipo?'<span class="tipo">'+esc(pz.tipo)+'</span>':'')+(pz.donde?'<span class="ruta-lugar">'+esc(pz.donde)+'</span>':'')+edadProbarHtml(it)+'<span class="volver" style="margin:0 0 0 auto" onclick="abrirPieza(\''+esc(it.id)+'\')">Ver la pieza completa →</span></div>'
    +'<h1 class="pr-tit">'+esc(it.modulo)+'</h1><div class="pr-probar"><span class="lbl">Para probarlo</span>'+accesoProbar(it.probarEn,actual,S.lanzadores,it.id)+'</div>';
  const fl=(it.nota.match(/Falló el [^·]+/g)||[]).pop();if(fl)h+='<div class="seccion alerta pr-aviso">'+esc(fl)+'</div>';
  if(it.sqlPendientes&&it.sqlPendientes.length)h+='<div class="seccion alerta pr-aviso"><b>Antes de probar:</b> '+it.sqlPendientes.map(x=>'<button class="mini" onclick="abrirPanelSql(\''+esc(x)+'\')">'+ic('sql',16)+esc(x.split('/').pop())+'</button>').join(' ')+' no está aplicado en producción. Aplícalo o prueba en desarrollo.</div>';
  let sec='';
  for(const x of items){if(x.seccion&&x.seccion!==sec&&!/^checklist|^pasos$/i.test(x.seccion)){sec=x.seccion;h+='<div class="pr-subt">'+fmtTxt(sec)+'</div>'}h+=pasoChecklist(x,'pr')}
  if(!items.length)h+='<div class="aviso">Esta pieza no tiene checklist. Créalo desde la pieza, o ciérrala si ya la probaste.</div>';
  h+='<div class="fila-form pr-acc">'+(items.length?'<button class="btn"'+(completo?'':' disabled')+' onclick="cerrarV('+i+',false)">Todo pasó · siguiente pieza</button>':'<button class="btn" onclick="cerrarV('+i+',true)">Ya lo probé · siguiente</button>')
    +'<button class="btn sec" onclick="vFallo='+i+';pintar()">Algo falló</button><button class="btn sec" onclick="saltarV('+i+')">Saltar por ahora</button>'+(items.length?'<span class="pill'+(completo?' g':' w')+'" style="margin-left:auto"><b>'+hechos+'/'+items.length+'</b> pasos</span>':'')+'</div>';
  if(vFallo===i)h+='<div class="fila-form"><textarea id="fallo" rows="2" placeholder="¿Qué paso falló y qué viste?" style="flex:1 1 360px"></textarea><button class="btn" onclick="guardarFallo('+i+')">Guardar falla</button></div>';
  h+='</section><aside class="seccion pr-lista"><h2>En esta sesión</h2><div class="pr-orden">'+ordenProbarBtns()+'</div>'+VER.map((x,k)=>{const s=vSesion[x.id],est=x.id===it.id?'ahora':s==='ok'?'✓':s==='fallo'?'falló':s==='saltada'?'después':x.total?'':'sin checklist';
      return '<button class="pr-item'+(x.id===it.id?' on':'')+'" onclick="vActual=\''+esc(x.id)+'\';vFallo=null;pintar()"><code>'+esc(x.id)+'</code><span>'+esc(x.modulo.slice(0,48))+edadProbarHtml(x,true)+'</span><small>'+est+'</small></button>'}).join('')
    +'<div class="aviso">Al cerrar: el changelog queda ✔️ y el spec cerrado, juntos.</div></aside></div>';
  const y=window.scrollY;m.innerHTML=h;window.scrollTo(0,y);
}
function siguienteV(i){const n=VER.slice(i+1).concat(VER.slice(0,i)).find(x=>!vSesion[x.id]);vActual=n?n.id:null}
function saltarV(i){vSesion[VER[i].id]='saltada';vFallo=null;siguienteV(i);pintar()}
async function cerrarV(i,forzar){
  const it=VER[i];
  if(forzar&&!confirm(it.id+' no tiene checklist. ¿Confirmas que ya lo probaste y funciona?'))return;
  const r=await post('/api/verificar/cerrar',{id:it.id,forzar});
  toast(it.id+' verificado'+(r.specs&&r.specs.length?' y su spec cerrado':''));vSesion[it.id]='ok';vFallo=null;siguienteV(i);VER=[];S=await api('/api/estado'+qp());pintarNav();pintar();
}
async function guardarFallo(i){const n=$('#fallo').value.trim();if(!n)return toast('Escribe qué falló');await post('/api/verificar/fallo',{id:VER[i].id,nota:n});toast('Falla anotada: sigue como Construido');vSesion[VER[i].id]='fallo';vFallo=null;siguienteV(i);VER=[];pintar()}

// ---- comentarios sobre una parte (un paso del checklist o una sección del spec) ----
let pzSpecAbierto=false,nComent=0;
const sinComilla=t=>String(t).replace(/'/g,'’').replace(/"/g,'”').replace(/[«»\r\n]+/g,' ').trim().slice(0,140);
function botonComentar(archivo,sobre,ctx,chico){
  return '<button class="mini comentar'+(chico?' solo-ic':'')+'" title="Comentar esto" aria-label="Comentar esto" onclick="event.preventDefault();event.stopPropagation();abrirComentarParte(this,\''+esc(archivo)+'\',\''+esc(sinComilla(sobre))+'\',\''+(ctx||'pz')+'\')">'+ic('nota',16)+(chico?'':'Comentar esta parte')+'</button>';
}
function abrirComentarParte(btn,archivo,sobre,ctx){
  const cont=(btn.closest&&btn.closest('.chk,.spec-parte,.pz-sec'))||btn;
  const sig=cont.nextElementSibling;if(sig&&sig.classList.contains('coment-form')){sig.remove();return}
  const n=++nComent;
  cont.insertAdjacentHTML('afterend','<div class="coment-form"><div class="sobre">Sobre: '+esc(sobre)+'</div><textarea id="cp'+n+'" rows="2" placeholder="Qué no funciona o qué hay que cambiar aquí"></textarea><div class="fila-form"><button class="btn" onclick="guardarComentParte('+n+',\''+esc(archivo)+'\',\''+esc(sobre)+'\',\''+ctx+'\')">Anotar</button><button class="btn sec" onclick="this.closest(\'.coment-form\').remove()">Cancelar</button></div></div>');
  setTimeout(()=>{const t=$('#cp'+n);if(t)t.focus()},30);
}
async function guardarComentParte(n,archivo,sobre,ctx){
  const t=($('#cp'+n)||{}).value||'';if(!t.trim())return toast('Escribe el comentario');
  await post('/api/pieza/comentario',{archivo,texto:t.trim(),sobre});toast('Anotado sobre: '+sobre.slice(0,40));
  if(ctx==='pz'){PZ=null;pintar()}else{const f=$('#cp'+n);if(f)f.closest('.coment-form').remove()}
}
function comentariosDe(x,sobre){
  const base=sinComilla(sobre);const L=(x.comentarios||[]).filter(c=>c.sobre===base||(base.startsWith('Sección:')&&c.sobre.startsWith(base+' ›')));if(!L.length)return '';
  return '<div class="coment-parte">'+L.map(c=>'<div class="coment'+(c.atendido?' at':'')+'"><label><input type="checkbox"'+(c.atendido?' checked':'')+' onchange="marcarComent(\''+esc(c.archivo)+'\','+c.linea+',this.checked)" aria-label="Atendido"></label><div>'+(c.sobre.includes('“')?'<div class="sobre">'+esc(c.sobre.split(' › ').slice(1).join(' › '))+'</div>':'')+'<div class="nota-mano tuya" style="font-size:21px">'+esc(c.texto)+'</div><small>'+esc(fechaCorta(c.fecha))+(c.atendido?' · atendido':'')+'</small></div></div>').join('')+'</div>';
}
// el spec en partes (por sección ##), cada una con su botón de comentar
function specPorPartes(x){
  const txt=x.spec.contenido.replace(/^#\s.*\n/,''),partes=[];let cur={t:'',l:[]};
  for(const l of txt.split('\n')){if(/^##\s/.test(l)){if(cur.t||cur.l.join('').trim())partes.push(cur);cur={t:l.replace(/^##\s*/,'').trim(),l:[]}}else cur.l.push(l)}
  partes.push(cur);
  return partes.filter(p=>!/^(comentarios de yanga|estado)$/i.test(p.t)).map(p=>{const sobre='Sección: '+tpNorm(p.t||'Encabezado');
    return '<div class="spec-parte"><div class="spec-parte-cab">'+(p.t?'<h3>'+esc(p.t)+'</h3>':'')+botonComentar(x.spec.file,sobre)+'</div><div class="md">'+md(p.l.join('\n'))+'</div>'+comentariosDe(x,sobre)+'</div>'}).join('');
}
// abrir la app donde vive la pieza (lanzador con URL + la ruta del Dónde)
function botonAbrirApp(x){
  const L=S.lanzadores||[],l=L.find(z=>z.url&&z.corriendo)||L.find(z=>z.url),pg=partesLugar(x.donde)[1]||'';
  if(!l)return '';
  const ruta=pg.startsWith('/')?pg.split('/[')[0]:'';
  const url=l.url.replace(/\/$/,'')+ruta;
  if(!l.corriendo)return '<button class="btn" onclick="abrirAppPieza('+L.indexOf(l)+',\''+esc(url)+'\')">'+ic('play',16)+'Arrancar y abrir '+esc(ruta||l.nombre)+'</button>';
  return '<button class="btn" onclick="abrirUrl(actual,\''+esc(url)+'\')">'+ic('abrirFuera',16)+'Abrir '+esc(ruta||'la app')+' para probar</button>';
}
async function abrirAppPieza(i,url){await runStart(i);toast('Arrancando… se abre en unos segundos');setTimeout(()=>abrirUrl(actual,url),4000)}

// ---- comentar un pedazo seleccionado del spec (lo que se pidió, el spec por partes, lo que se hizo) ----
document.addEventListener('mouseup',()=>setTimeout(botonSeleccion,10));
document.addEventListener('keyup',e=>{if(e.shiftKey)setTimeout(botonSeleccion,10)});
function botonSeleccion(){
  const viejo=$('#btnSel');
  const sel=window.getSelection(),txt=sel?String(sel).replace(/\s+/g,' ').trim():'';
  if(!txt||tab!=='piezas'||!PZ||!PZ.spec||!sel.rangeCount){if(viejo&&!viejo.matches(':hover'))viejo.remove();return}
  const nodo=sel.getRangeAt(0).commonAncestorContainer,el=nodo.nodeType===1?nodo:nodo.parentElement;
  const zona=el&&el.closest('.spec-parte,.pz-sec');if(!zona||!zona.closest('.pz-main')){if(viejo)viejo.remove();return}
  const parte=zona.classList.contains('spec-parte')?((zona.querySelector('h3')||{}).textContent||'Encabezado'):((zona.querySelector('h2')||{}).textContent||'');
  const tp=tpNorm(parte),cupo=140-14-tp.length;const sobre=sinComilla('Sección: '+tp+' › “'+(txt.length>cupo?txt.slice(0,cupo-1)+'…':txt)+'”');
  const r=sel.getRangeAt(0).getBoundingClientRect();
  const b=viejo||document.createElement('button');b.id='btnSel';b.className='btn btn-sel';b.innerHTML=ic('nota',16)+'Comentar lo seleccionado';
  b.style.top=(window.scrollY+r.bottom+8)+'px';b.style.left=Math.max(12,Math.min(window.innerWidth-260,r.left))+'px';
  b.onmousedown=ev=>ev.preventDefault();
  b.onclick=()=>{b.remove();const destino=zona.classList.contains('spec-parte')?zona:zona.querySelector('.md')||zona;abrirComentarParte(destino.querySelector('.md')||destino,PZ.spec.file,sobre,'pz');window.getSelection().removeAllRanges()};
  if(!viejo)document.body.appendChild(b);
}

function tpNorm(t){return String(t).trim().replace(/^\d+\.\s*/,'').slice(0,36)}


// Verificada sin haber pasado por Por probar (o por En el taller): casi siempre es un clic por error
function saltoPz(x){const c=(S.cambios||{})[x.id];return grupoEst(x.estado)==='v'&&!!c&&/✔/.test(c.a)&&!!c.de&&/[pc]/.test(grupoEst(c.de))}

// ---- Acceso directo a lo construido, para probarlo (TMN-059) ----
// pe = probarEn del servidor: { declarado, url, ruta, archivos }. pid = proyecto; L = sus lanzadores.
function accesoProbar(pe,pid,L,id,chico){
  pe=pe||{};L=L||[];const b=[],cls=chico?'mini':'btn',q=s=>esc(String(s).replace(/'/g,"\\'"));
  if(pe.url){
    const interno=/^#\//.test(pe.url)||pe.url.startsWith(location.origin);
    b.push('<button class="'+cls+'" onclick="event.stopPropagation();'+(interno?'irInterno(\''+q(pe.url)+'\')':'abrirUrl(\''+pid+'\',\''+q(pe.url)+'\')')+'">'+ic('abrirFuera',16)+(interno?'Abrir en Timón':'Abrir '+esc(pe.url.replace(/^https?:\/\//,'').slice(0,40)))+'</button>');
  }else if(pe.ruta){
    const l=L.find(z=>z.url&&z.corriendo)||L.find(z=>z.url);
    if(l){const u=l.url.replace(/\/$/,'')+pe.ruta;
      b.push(l.corriendo?'<button class="'+cls+'" onclick="event.stopPropagation();abrirUrl(\''+pid+'\',\''+q(u)+'\')">'+ic('abrirFuera',16)+'Abrir '+esc(pe.ruta)+'</button>'
        :'<button class="'+cls+'" onclick="event.stopPropagation();arrancarYAbrir(\''+pid+'\','+L.indexOf(l)+',\''+q(u)+'\')">'+ic('play',16)+'Arrancar y abrir '+esc(pe.ruta)+'</button>');}
    else b.push('<button class="'+cls+' sec" onclick="event.stopPropagation();entrar(\''+pid+'\',\'run\')" title="El proyecto no tiene un lanzador con dirección (http://…)">'+ic('lanzador',16)+'Falta el lanzador para abrir '+esc(pe.ruta)+'</button>');
  }
  for(const f of (pe.archivos||[]).slice(0,4))b.push('<button class="'+cls+' sec" onclick="event.stopPropagation();abrirEnArchivos(\''+pid+'\',\''+q(f)+'\')" title="'+esc(f)+'">'+ic('documento',16)+'Ver '+esc(f.split('/').pop())+'</button>');
  const editar='<button class="lnk pr-donde" onclick="event.stopPropagation();editarProbarEn(\''+pid+'\',\''+q(id)+'\',\''+q(pe.declarado||'')+'\')">'+(b.length||pe.declarado?'Cambiar dónde se prueba':'¿Dónde se prueba? Agrégalo')+'</button>';
  return '<span class="acceso-probar">'+b.join('')+editar+'</span>';
}
function irInterno(u){let h=(u.startsWith('#')?u:u.slice(location.origin.length).replace(/^\/?/,'')).replace(/^#?/,'#');
  // #/p/CODIGO/… también sirve: se cambia el código por el proyecto
  h=h.replace(/^#\/p\/([^/]+)/,(m,c)=>{const p=PROY.find(x=>x.id===c||String(x.codigo).toLowerCase()===c.toLowerCase());return '#/p/'+(p?p.id:c)});location.hash=h}
async function arrancarYAbrir(pid,i,url){await api('/api/run/start?p='+encodeURIComponent(pid)+'&l='+i,{method:'POST'});toast('Arrancando… se abre en unos segundos');setTimeout(()=>abrirUrl(pid,url),4000)}
async function abrirEnArchivos(pid,rel){if(actual===pid)return irArchivo(rel);await entrar(pid,'archivos');irArchivo(rel)}
async function editarProbarEn(pid,id,actualV){
  const v=prompt('¿Dónde se prueba '+id+'?\n\nUna dirección (https://…), una página de la app (/reservas), una pantalla de Timón (#/…) o un archivo del proyecto (docs/guia.md). Puedes poner varias separadas por coma.',actualV||'');
  if(v===null)return;
  await api('/api/probar-en?p='+encodeURIComponent(pid),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,valor:v})});
  toast(v.trim()?'Guardado en el checklist de '+id:'Quitado');
  if(typeof VER!=='undefined')VER=[];PZ=null;if(actual)S=await api('/api/estado'+qp());pintar();
}

// Las fechas clave de la pieza y cuánto tardó (TMN-062)
function lineaFechasPz(x){
  const ult=re=>{const e=[...(x.historial||[])].reverse().find(e=>!e.aprox&&re.test(e.a||''));return e?e.f:''};
  const reg=/^\d{4}-\d{2}-\d{2}/.test(x.fecha||'')?x.fecha.slice(0,10):'',con=ult(/✅/),ver=grupoEst(x.estado)==='v'?ult(/✔/):'';
  const dia=f=>isoLocal(f).slice(0,10),dias=(a,b)=>Math.max(0,Math.round((Date.parse(dia(b))-Date.parse(dia(a)))/864e5));
  const p=[];
  if(reg)p.push('<span><b>Registrada</b> '+esc(fFecha(reg))+'</span>');
  if(con)p.push('<span><b>Construida</b> '+esc(fFecha(con))+(reg?' <small>('+dias(reg,con)+' d)</small>':'')+'</span>');
  if(ver)p.push('<span><b>Verificada</b> '+esc(fFecha(ver))+(con?' <small>('+dias(con,ver)+' d probando)</small>':'')+'</span>');
  if(reg&&ver)p.push('<span class="total">Tardó '+dias(reg,ver)+(dias(reg,ver)===1?' día':' días')+'</span>');
  else if(reg&&grupoEst(x.estado)!=='d'){const n=dias(reg,new Date().toISOString());p.push('<span class="total'+(n>=14?' vieja':'')+'">Lleva '+n+(n===1?' día':' días')+' abierta</span>')}
  return p.length?'<div class="pz-fechas">'+p.join('')+'</div>':'';
}
