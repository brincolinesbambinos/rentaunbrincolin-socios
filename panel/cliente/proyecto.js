// Timón · Pantallas dentro de un proyecto: Resumen, Ideas, Specs, Puntos, Documentos, Correr, Archivos, Ficha
// El Resumen y la Tabla viven en resumen.js (Fase 5)
async function capturar(){const t=$('#qc').value.trim();if(!t)return;await api('/api/inbox'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texto:t})});toast('Anotado en Ideas, de regreso a tu spec');recargar()}
async function cambiarEstado(id,sel){const e=sel.value;sel.value='';if(e)return cambiarEstadoA(id,e)}
async function cambiarEstadoA(id,e){
  if(!e)return;
  if(e.includes('✔️')&&!confirm('Regla de Timón: solo tú puedes marcar Verificado.\n¿Corriste el checklist de '+id+' y TODO pasó?'))return;
  if(e.includes('🔄')&&(S.alertas.enConstruccion>0||S.alertas.construidosSinVerificar>0)&&!confirm('Regla 18: ya hay '+S.alertas.enConstruccion+' en construcción y '+S.alertas.construidosSinVerificar+' construidos sin verificar.\n¿Seguro que quieres abrir otro frente?'))return;
  if(e.includes('🚫')&&!confirm('¿Descartar '+id+'? Queda en el changelog como 🚫 (cierre válido).'))return;
  let nota=null;
  if(e.includes('✔️'))nota=prompt('Nota corta de verificación (qué probaste):')||'verificado';
  if(e.includes('🚫'))nota=prompt('¿Por qué se descarta?')||'descartado en poda';
  await api('/api/changelog/estado'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,estado:e,nota})});
  toast(id+' → '+e);await recargar();return true;
}
async function nuevaFila(){
  const d=$('#nDesc').value.trim();if(!d)return toast('Falta la descripción');
  const r=await api('/api/changelog/nueva'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modulo:$('#nModulo').value,quien:$('#nQuien').value,descripcion:d,tipo:$('#nTipo').value,donde:$('#nDonde').value})});
  toast('Registrado como '+r.id);recargar();
}
// Ideas vive en ideas.js (Fase 5)
// ---- Specs ----
function pintarSpecs(m){
  if(specAbierto)return pintarEditorSpec(m);
  let h='<div class="seccion"><h2>Specs</h2><div class="fila-form" style="margin-bottom:12px"><input type="text" id="nSpec" placeholder="Nombre del spec nuevo…"><button class="btn sec" onclick="nuevoSpec()">+ Crear desde plantilla</button></div><div class="lista">';
  if(!S.specs.length)h+='<div class="aviso">Sin specs todavía.</div>';
  for(const s of S.specs)h+='<div class="item" onclick="abrirSpec(\''+esc(s.file)+'\')"><span>'+ic('spec',16)+' '+esc(s.nombre)+'</span><span class="meta"><span class="est '+(/cerrado/i.test(s.estado)?'est-v':'est-c')+'">'+esc(s.estado)+'</span></span></div>';
  m.innerHTML=h+'</div></div>';
}
async function abrirSpec(f){const r=await api('/api/archivo'+qp()+'&f='+encodeURIComponent(f));specAbierto={file:f,contenido:r.contenido};pintar()}
function pintarEditorSpec(m){
  m.innerHTML='<span class="volver" onclick="specAbierto=null;pintar()">← Volver a specs</span>'
    +'<div class="seccion"><h2>'+esc(specAbierto.file)+'</h2><div class="subtabs"><button class="btn sec" onclick="modoSpec(0)">Vista</button><button class="btn sec" onclick="modoSpec(1)">Editar</button><button class="btn" onclick="guardarSpec()">Guardar</button></div>'
    +'<div id="specVista" class="md">'+md(specAbierto.contenido)+'</div><textarea id="specTxt" class="editorArea" style="display:none">'+esc(specAbierto.contenido)+'</textarea></div>';
}
function modoSpec(ed){$('#specVista').style.display=ed?'none':'block';$('#specTxt').style.display=ed?'block':'none';if(!ed){specAbierto.contenido=$('#specTxt').value;$('#specVista').innerHTML=md(specAbierto.contenido)}}
async function guardarSpec(){if($('#specTxt').style.display!=='none')specAbierto.contenido=$('#specTxt').value;await api('/api/spec'+qp(),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:specAbierto.file,contenido:specAbierto.contenido})});toast('Spec guardado')}
async function nuevoSpec(){const n=$('#nSpec').value.trim();if(!n)return;const r=await api('/api/spec/nuevo'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:n})});S=await api('/api/estado'+qp());abrirSpec(r.file)}
// ---- SQL ----
function pintarVerSql(m){m.innerHTML='<span class="volver" onclick="sqlAbierto=null;pintar()">← Volver a SQL</span><div class="seccion"><h2>'+esc(sqlAbierto.rel)+'</h2><div class="subtabs"><button class="btn" onclick="copiarSql()">'+ic('copiar',16)+'Copiar todo</button></div><pre class="md"><code>'+esc(sqlAbierto.contenido)+'</code></pre></div>'}
async function copiarSql(){await navigator.clipboard.writeText(sqlAbierto.contenido);toast('SQL copiado — pégalo en tu editor de base de datos')}
// ---- Docs ----
// ---- Puntos: contratado, cortesía, extras y garantía ----
const TIPOS_P=['Contratado','Garantía','Cortesía','Extra','Iguala','Por decidir'];
const fmtN=n=>Math.round(n||0).toLocaleString('es-MX');
const barra=(v,max,cls)=>{const pct=max?Math.min(100,Math.round(v/max*100)):0;return '<div class="barra"><span class="'+(cls||'')+'" style="width:'+pct+'%"></span></div>'};
function pintarPuntos(m){
  const P=S.puntos;
  if(!P){
    m.innerHTML='<div class="seccion"><h2>Puntos del proyecto</h2>Este proyecto todavía no tiene <code>PUNTOS-'+esc(S.proyecto.codigo)+'.md</code>. Créalo con los puntos de la cotización aceptada (o pide al skill <b>cotizar-proyecto</b> que lo arme).'
      +'<div class="fila-form"><input type="text" id="pcContr" placeholder="Puntos contratados"><input type="text" id="pcBolsa" placeholder="Bolsa de cortesía (vacío = 12%)"><input type="text" id="pcValor" placeholder="Valor del punto" value="400"><button class="btn" onclick="crearPuntos()">Crear registro</button></div></div>';
    return;
  }
  const t=P.totales,pc=P.contratados?Math.round(t.Contratado/P.contratados*100):0,pb=P.bolsa?Math.round(t['Cortesía']/P.bolsa*100):0;
  let h='<div class="cards">'
    +card(fmtN(t.Contratado)+' / '+fmtN(P.contratados),'Contratado usado · '+pc+'%',pc>100?'alerta':'')
    +card(fmtN(t['Cortesía'])+' / '+fmtN(P.bolsa),'Cortesía usada · '+pb+'%',pb>=100?'alerta':'bien')
    +card('$'+fmtN(P.porCobrar*P.valor),'💰 Extras por cobrar · '+fmtN(P.porCobrar)+' pts',P.porCobrar>0?'alerta':'bien')
    +card(fmtN(t['Garantía']),'🛠 Garantía (pts, no se cobra)')+'</div>';
  h+='<div class="seccion"><h2>Avance</h2>'
    +'<div class="aviso">Contratado</div>'+barra(t.Contratado,P.contratados,pc>100?'w':'')
    +'<div class="aviso">Bolsa de cortesía</div>'+barra(t['Cortesía'],P.bolsa,pb>=100?'w':'g')
    +'<div class="aviso">Valor del punto: $'+fmtN(P.valor)+' · Archivo: <code>'+esc(P.file)+'</code></div></div>';
  if(pc>100)h+='<div class="seccion" style="border-color:var(--warn)"><b>'+ic('alerta',16)+' Ya pasaste lo contratado.</b> Lo que siga se registra como Extra o toca recotizar (skill cotizar-proyecto, modo recotización).</div>';
  if(pb>=100)h+='<div class="seccion" style="border-color:var(--warn)"><b>'+ic('regalo',16)+' La bolsa de cortesía se acabó.</b> Lo próximo que quieras regalar, propónlo con precio: tu emoción también vende.</div>';
  else if(pb>=80)h+='<div class="seccion"><b>'+ic('regalo',16)+' Quedan '+fmtN(P.bolsa-t['Cortesía'])+' puntos de cortesía.</b> Elige bien qué regalas.</div>';
  if(P.sinPuntos.length){
    h+='<div class="seccion"><h2>Sin clasificar ('+P.sinPuntos.length+')</h2><div class="aviso" style="margin-bottom:8px">Cada solicitud del changelog debe tener tipo y puntos. Los conteos salen del catálogo del skill cotizar-proyecto.</div><div class="tablewrap"><table><tr><th>ID</th><th>Descripción</th><th>Tipo</th><th>Puntos</th><th></th></tr>';
    P.sinPuntos.forEach((r,i)=>{h+='<tr><td>'+esc(r.id)+'</td><td>'+esc(r.descripcion)+'</td><td><select id="spT'+i+'"><option value="">tipo…</option>'+TIPOS_P.map(x=>'<option>'+x+'</option>').join('')+'</select></td><td><input type="text" id="spP'+i+'" style="width:70px" placeholder="0"></td><td><button class="btn sec" onclick="guardarPunto('+i+',\''+esc(r.id)+'\')">Guardar</button></td></tr>'});
    h+='</table></div></div>';
  }
  h+='<div class="seccion"><h2>Registro</h2>';
  if(!P.filas.length)h+='<div class="aviso">Todavía no hay solicitudes clasificadas.</div>';
  else{
    h+='<div class="tablewrap"><table><tr><th>ID</th><th>Tipo</th><th>Puntos</th><th>Monto</th><th>Nota</th><th></th></tr>';
    for(const f of P.filas.slice().reverse()){
      const cls=f.tipo==='Extra'?(f.cobrado?'est-v':'est-b'):f.tipo==='Cortesía'?'est-c':f.tipo==='Garantía'?'est-p':'';
      h+='<tr><td>'+esc(f.id)+'</td><td><span class="est '+cls+'">'+esc(f.tipo)+(f.tipo==='Extra'?(f.cobrado?' · cobrado':' · por cobrar'):'')+'</span></td><td>'+fmtN(f.puntos)+'</td><td>$'+fmtN(f.puntos*P.valor)+'</td><td>'+esc(f.nota)+'</td><td>'
        +(f.tipo==='Extra'&&!f.cobrado?'<button class="btn sec" onclick="marcarCobrado(\''+esc(f.id)+'\','+f.puntos+')">Marcar cobrado</button>':'')+'</td></tr>';
    }
    h+='</table></div>';
  }
  m.innerHTML=h+'</div>';
}
async function crearPuntos(){await api('/api/puntos/crear'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contratados:$('#pcContr').value,bolsa:$('#pcBolsa').value,valor:$('#pcValor').value})});toast('Registro de puntos creado');recargar()}
async function guardarPunto(i,id){const tipo=$('#spT'+i).value,pts=$('#spP'+i).value.trim();if(!tipo||pts==='')return toast('Elige tipo y puntos');await api('/api/puntos/fila'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,tipo,puntos:pts})});toast(id+' clasificado como '+tipo);recargar()}
async function marcarCobrado(id,pts){await api('/api/puntos/fila'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,tipo:'Extra',puntos:pts,cobrado:true})});toast(id+' marcado como cobrado');recargar()}
function pintarDocs(m){let h='<div class="seccion"><h2>Documentos del proyecto</h2><div class="lista">';for(const d of S.docs)h+='<div class="item" onclick="abrirDoc(\''+esc(d)+'\')"><span>'+ic('documento',16)+' '+esc(d)+'</span></div>';m.innerHTML=h+'</div></div>'}
async function abrirDoc(f){const r=await api('/api/archivo'+qp()+'&f='+encodeURIComponent(f));$('#main').innerHTML='<span class="volver" onclick="pintar()">← Volver a docs</span><div class="seccion"><h2>'+esc(f)+'</h2><div class="md">'+md(r.contenido)+'</div></div>'}
// ---- Correr ----
function pintarRun(m){
  const L=S.lanzadores;if(lanzSel>=L.length)lanzSel=0;
  let h='<div class="seccion"><h2>Lanzadores de '+esc(S.proyecto.nombre)+'</h2><div class="lista">';
  L.forEach((l,i)=>{
    h+='<div class="item" style="cursor:default'+(i===lanzSel?';border-color:var(--acc)':'')+'"><span class="dot'+(l.corriendo?' on':'')+'"></span><span><b>'+esc(l.nombre)+'</b><br><code style="font-size:12px;color:var(--tx2)">'+esc(l.comando)+(l.carpeta&&l.carpeta!=='.'?'  ·  en '+esc(l.carpeta):'')+'</code></span><span class="meta">'
      +(l.url?'<button class="mini" onclick="abrirUrl(actual,\''+esc(l.url)+'\')">'+ic('web',16)+' '+esc(l.url.replace(/^https?:\/\//,''))+'</button>':'')
      +'<button class="mini" onclick="verLogs('+i+')">Logs</button>'
      +(l.corriendo?'<button class="btn rojo" onclick="runStop('+i+')">■ Detener</button>':'<button class="btn" onclick="runStart('+i+')">▶ Iniciar</button>')+'</span></div>';
  });
  h+='</div>'+(L.length===1&&L[0].sugerido?'<div class="aviso" style="color:var(--warn)">Este proyecto no tiene ficha .tmn: el comando es una suposición. Configúralo en la sección Ficha.</div>':'<div class="aviso">Los lanzadores se definen en la ficha .tmn del proyecto (sección Ficha). Pueden correr varios a la vez.</div>')+'</div>';
  h+='<div class="seccion"><h2>Logs · '+esc((L[lanzSel]||{}).nombre||'')+'</h2><div id="logs"></div></div>';
  m.innerHTML=h;logNext=0;$('#logs').textContent='';pollLogs();
}
function verLogs(i){lanzSel=i;pintar()}
async function runStart(i){i=i||0;lanzSel=i;await api('/api/run/start'+qp()+'&l='+i,{method:'POST'});toast('Arrancando…');setTimeout(()=>recargar(),700)}
async function runStop(i){i=i||0;await api('/api/run/stop'+qp()+'&l='+i,{method:'POST'});toast('Deteniendo…');setTimeout(()=>recargar(),900)}
async function pollLogs(){
  if(tab!=='run'||!actual)return;
  try{
    const r=await api('/api/run/logs'+qp()+'&l='+lanzSel+'&since='+logNext);
    if(r.lines.length){const el=$('#logs');const abajo=el.scrollTop+el.clientHeight>=el.scrollHeight-30;el.textContent+=r.lines.map(l=>l.t).join('\n')+'\n';logNext=r.next;if(abajo)el.scrollTop=el.scrollHeight}
  }catch(e){}
  clearTimeout(logTimer);logTimer=setTimeout(pollLogs,1500);
}
// ---- Archivos: el árbol y el visor viven en taller.js (Fase 6) ----
async function cargarCarpeta(rel){const r=await api('/api/carpeta'+qp()+'&d='+encodeURIComponent(rel));return r.entradas}
const icono=n=>ic(/\.md$/i.test(n)?'documento':/\.(png|jpe?g|gif|webp|svg)$/i.test(n)?'imagen':/\.pdf$/i.test(n)?'pdf':/\.tmn$/i.test(n)?'proyecto':/\.(command|sh)$/i.test(n)?'rayo':/\.(xlsx?|csv)$/i.test(n)?'tabla':/\.sql$/i.test(n)?'sql':/\.(m?js|ts|tsx|jsx|py|css|html?)$/i.test(n)?'codigo':'documento',16);
// ---- Proyecto: ficha .tmn ----
function pintarProyecto(m){
  if(!editTmn)editTmn=JSON.parse(JSON.stringify(S.tmn||{nombre:S.proyecto.nombre,codigo:S.proyecto.codigo,estado:'activo',lanzadores:[],ligas:[],relacionados:[]}));
  const t=editTmn;t.lanzadores=t.lanzadores||[];t.ligas=t.ligas||[];
  // lista desplegable con los valores que ya usas, más "Otro…" para escribir uno nuevo
  const lista=(k,lbl,ops)=>{const v=t[k]||'',otro=v&&!ops.includes(v);return '<select aria-label="'+lbl+'" onchange="if(this.value===\'__otro\'){const n=prompt(\''+lbl+' nuevo:\');if(n){editTmn.'+k+'=n.trim()}pintar()}else editTmn.'+k+'=this.value"><option value="">'+lbl+'…</option>'+(otro?'<option selected>'+esc(v)+'</option>':'')+ops.sort((a,b)=>a.localeCompare(b,'es')).map(o=>'<option'+(o===v?' selected':'')+'>'+esc(o)+'</option>').join('')+'<option value="__otro">Otro…</option></select>'};
  const campo=(k,ph)=>'<input type="text" placeholder="'+ph+'" value="'+esc(t[k]||'')+'" oninput="editTmn.'+k+'=this.value">';
  let h='';
  if(S.tmnError)h+='<div class="seccion" style="border-color:var(--warn)"><b>'+ic('alerta',16)+' '+esc(S.tmnError)+'</b> Al guardar aquí se reescribe con un formato válido.</div>';
  if(!S.tmn)h+='<div class="seccion"><b>Este proyecto todavía no tiene ficha .tmn.</b> Llénala o pide una sugerencia a partir de lo que hay en la carpeta.<div class="fila-form"><button class="btn sec" onclick="sugerir()">'+ic('sugerir',16)+'Sugerir desde el proyecto</button></div></div>';
  h+='<div class="seccion"><h2>Ficha del proyecto</h2><div class="fila-form">'+campo('nombre','Nombre')+campo('codigo','Código')+'</div><div class="fila-form">'+lista('cliente','Cliente',[...new Set(PROY.map(x=>x.cliente).filter(Boolean))])+lista('marca','Marca',[...new Set(['Midnite Atelier','Invernadero Ads','Bonsai de Contenidos',...PROY.map(x=>x.marca)].filter(Boolean))])
    +'<select aria-label="Tamaño" onchange="editTmn.tamano=this.value"><option value="">Tamaño…</option>'+['chico','mediano','grande'].map(e=>'<option value="'+e+'"'+(t.tamano===e?' selected':'')+'>'+e[0].toUpperCase()+e.slice(1)+'</option>').join('')+'</select>'
    +'<select onchange="editTmn.estado=this.value">'+['activo','pausado','entregado','idea'].map(e=>'<option'+((t.estado||'activo')===e?' selected':'')+'>'+e+'</option>').join('')+'</select>'
    +'</div><div class="muestras" role="radiogroup" aria-label="Color del proyecto"><span class="aviso" style="margin:0 6px 0 0">Color</span>'+PALETA_CL.map(c=>c[0]).map(c=>'<button type="button" role="radio" aria-checked="'+(String(t.color||'').toUpperCase()===c?'true':'false')+'" title="'+c+'" style="background:'+c+'" onclick="editTmn.color=\''+c+'\';pintar()"></button>').join('')+'<input type="color" value="'+esc(t.color||'#1C3F94')+'" oninput="editTmn.color=this.value" title="Otro color" aria-label="Otro color"></div>'
    +'<div class="fila-form"><textarea rows="2" placeholder="Descripción corta" oninput="editTmn.descripcion=this.value">'+esc(t.descripcion||'')+'</textarea></div></div>';
  h+='<div class="seccion"><h2>Lanzadores</h2><div class="aviso" style="margin-bottom:8px">Cada uno es un botón para arrancar algo del proyecto: un servidor (<code>npm run dev</code>), una app (<code>zsh "./App.command"</code>) o una página (<code>open index.html</code>). La carpeta es relativa al proyecto.</div>';
  t.lanzadores.forEach((l,i)=>{h+='<div class="lanz"><input type="text" placeholder="Nombre" value="'+esc(l.nombre||'')+'" oninput="editTmn.lanzadores['+i+'].nombre=this.value"><input type="text" placeholder="Comando" value="'+esc(l.comando||'')+'" oninput="editTmn.lanzadores['+i+'].comando=this.value"><input type="text" placeholder="Carpeta" value="'+esc(l.carpeta||'.')+'" oninput="editTmn.lanzadores['+i+'].carpeta=this.value"><input type="text" placeholder="URL local (opcional)" value="'+esc(l.url||'')+'" oninput="editTmn.lanzadores['+i+'].url=this.value"><button class="mini" onclick="editTmn.lanzadores.splice('+i+',1);pintar()">✕</button></div>'});
  h+='<div class="fila-form"><button class="btn sec" onclick="editTmn.lanzadores.push({nombre:\'\',comando:\'\',carpeta:\'.\',url:\'\'});pintar()">+ Lanzador</button></div></div>';
  h+='<div class="seccion"><h2>Ligas</h2>';
  t.ligas.forEach((l,i)=>{h+='<div class="fila-form" style="margin-top:4px"><input type="text" placeholder="Nombre (Producción, Repo, Supabase…)" value="'+esc(l.nombre||'')+'" oninput="editTmn.ligas['+i+'].nombre=this.value"><input type="text" placeholder="https://…" value="'+esc(l.url||'')+'" oninput="editTmn.ligas['+i+'].url=this.value" style="flex:2">'+(l.url?'<button class="mini" onclick="abrirUrl(actual,editTmn.ligas['+i+'].url)">'+ic('web',16)+'</button>':'')+'<button class="mini" onclick="editTmn.ligas.splice('+i+',1);pintar()">✕</button></div>'});
  h+='<div class="fila-form"><button class="btn sec" onclick="editTmn.ligas.push({nombre:\'\',url:\'\'});pintar()">+ Liga</button></div></div>';
  h+='<div class="seccion"><h2>Proyectos relacionados</h2><div class="fila-form"><input type="text" placeholder="Códigos separados por coma (ej. RB, PTB)" value="'+esc((t.relacionados||[]).join(', '))+'" oninput="setRel(this.value)"></div>';
  if(S.relacionados.length)h+='<div class="acciones">'+S.relacionados.map(r=>r.id?'<button class="mini" onclick="entrar(\''+r.id+'\',\'proyecto\')">↗ '+esc(r.nombre)+'</button>':'<span class="pill">'+esc(r.codigo)+' (no encontrado)</span>').join('')+'</div>';
  h+='</div><div class="fila-form"><button class="btn" onclick="guardarTmnUI()">Guardar ficha</button>'+(S.tmn?'<button class="btn sec" onclick="sugerir()">'+ic('sugerir',16)+'Volver a sugerir</button>':'')+'<span class="aviso" style="margin:0 0 0 auto">'+(S.tmnFile?'Archivo: <code>'+esc(S.tmnFile)+'</code>':'Se creará <code>proyecto.tmn</code>')+' · <code>'+esc(S.proyecto.ruta)+'</code></span></div>';
  m.innerHTML=h;
}
function setRel(v){editTmn.relacionados=v.split(',').map(x=>x.trim()).filter(Boolean)}
async function sugerir(){const r=await api('/api/tmn/sugerencia'+qp());editTmn=r.tmn;toast('Sugerencia lista: revisa y guarda');pintar()}
async function guardarTmnUI(){const r=await api('/api/tmn'+qp(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tmn:editTmn})});editTmn=null;toast('Guardado en '+r.file);const pr=await api('/api/proyectos');PROY=pr.proyectos;await recargar()}
