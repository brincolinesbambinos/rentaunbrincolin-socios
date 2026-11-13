// Timón · Fase 6: Taller. Archivos nativo (TMN-030), Corregir textos sin IA (TMN-025) y Abrir en el editor (TMN-026)

// ---------------- Abrir en VS Code o Cursor, en la línea exacta ----------------
async function abrirEditor(rel,linea){try{const r=await post('/api/editor/abrir',{f:rel||'.',linea:linea||0});toast('Abriendo en '+r.editor+(linea?' · línea '+linea:''))}catch(e){}}
const botonEditor=(rel,linea,txt)=>'<button class="btn sec" onclick="abrirEditor(\''+esc(rel)+'\','+(linea||0)+')">'+ic('codigo',16)+(txt||'Abrir en el editor')+'</button>';

// ---------------- Archivos: árbol y visor dentro de Timón ----------------
let arcCodigo=false,arcLinea=0,arcOcultos=false,arcFiltro='',arcFormato='',arcEditando=false,ARC=null;
function irArchivo(rel,linea){
  archivoSel=rel;arcLinea=linea||0;ARC=null;arcEditando=false;
  const partes=String(rel).split('/');for(let i=1;i<partes.length;i++)abiertos[partes.slice(0,i).join('/')]=true;
  if(tab==='archivos')pintar();else irA('archivos');
}
function pintarArchivos(m){
  m.innerHTML='<div class="arc-barra"><input type="text" id="arcFiltro" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Buscar archivo: contrato, .pdf, logo .png" value="'+esc(arcFiltro)+'" aria-label="Buscar archivos" oninput="arcFiltro=this.value;clearTimeout(window._arcT);window._arcT=setTimeout(pintarArbol,200)">'
    +'<span class="arc-fmt">'+[['','Todos'],['md','Textos'],['img','Imágenes'],['pdf','PDF'],['codigo','Código'],['sql','SQL'],['hoja','Hojas'],['video','Video']].map(([k,l])=>'<button class="'+(arcFormato===k?'on':'')+'" onclick="arcFormato=\''+k+'\';pintarArchivos($(\'#main\'))">'+l+'</button>').join('')+'</span>'
    +'<label class="interruptor"><input type="checkbox" '+(arcOcultos?'checked':'')+' onchange="arcOcultos=this.checked;pintarArbol()">Ocultos</label>'
    +'<span class="der"><button class="btn sec" onclick="abrirEn(actual,\'finder\',\'.\')">'+ic('finder',16)+'Finder</button><button class="btn sec" onclick="abrirEn(actual,\'terminal\',\'.\')">'+ic('terminal',16)+'Terminal</button>'+botonEditor('.',0,'Proyecto en el editor')+'</span></div>'
    +'<div class="archivos"><nav class="arbol" id="arbol" aria-label="Archivos del proyecto">Cargando…</nav><div id="visor">'+(archivoSel?'<div class="seccion">Abriendo…</div>':'<div class="seccion arc-vacio">'+ic('archivos',28)+'<div>Elige un archivo de la izquierda.<div class="aviso">Markdown, imágenes, PDF, video y código se ven aquí. Los textos se pueden editar con respaldo.</div></div></div>')+'</div></div>';
  pintarArbol();if(archivoSel)verArchivo(archivoSel);
}
async function pintarArbol(){
  if(arcFiltro.trim()||arcFormato)return pintarHallados();
  NODOS=[];const out=[],f='';
  async function nivel(rel,prof){
    let ents=[];try{ents=await cargarCarpeta(rel)}catch(e){}
    for(const e of ents){
      if(e.oculto&&!arcOcultos)continue;
      const abre=e.dir&&(abiertos[e.rel]||(f&&prof<2));
      if(f&&!e.dir&&!e.nombre.toLowerCase().includes(f))continue;
      const i=NODOS.push(e)-1;
      out.push('<button class="nodo'+(e.oculto?' tenue':'')+(archivoSel===e.rel?' sel':'')+'" style="padding-left:'+(8+prof*14)+'px" onclick="clicNodo('+i+')" title="'+esc(e.rel)+'">'+(e.dir?ic(abre?'finder':'carpeta',16):icono(e.nombre))+'<span>'+esc(e.nombre)+'</span>'+(!e.dir&&e.size>1048576?'<small>'+Math.round(e.size/1048576)+' MB</small>':'')+'</button>');
      if(abre)await nivel(e.rel,prof+1);
    }
  }
  await nivel('.',0);
  const el=$('#arbol');if(el)el.innerHTML=out.join('')||'<div class="aviso" style="padding:10px">Carpeta vacía.</div>';
}
function clicNodo(i){const e=NODOS[i];if(e.dir){abiertos[e.rel]=!abiertos[e.rel];pintarArbol()}else{archivoSel=e.rel;arcLinea=0;ARC=null;arcEditando=false;pintarArbol();verArchivo(e.rel)}}
const fmtTam=b=>b>1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
async function verArchivo(rel){
  const v=$('#visor');if(!v)return;
  if(!ARC||ARC.rel!==rel){try{ARC={rel,...await api('/api/archivo'+qp()+'&f='+encodeURIComponent(rel))}}catch(e){v.innerHTML='<div class="seccion">No pude abrir <code>'+esc(rel)+'</code>.</div>';return}}
  const r=ARC,raw='/api/raw'+qp()+'&f='+encodeURIComponent(rel),esMd=/\.(md|markdown)$/i.test(rel),esSvg=/\.svg$/i.test(rel);
  const migas=rel.split('/').map((x,i,a)=>i<a.length-1?'<span>'+esc(x)+'</span>':'<b>'+esc(x)+'</b>').join('<span class="sep">/</span>');
  let h='<section class="seccion arc-visor"><div class="arc-cab"><div class="migas">'+migas+'</div><span class="aviso" style="margin:0">'+fmtTam(r.size||0)+'</span></div><div class="subtabs">';
  if(r.tipo==='texto'){
    if(arcEditando)h+='<button class="btn" onclick="guardarArchivo()">'+ic('guardar',16)+'Guardar</button><button class="btn sec" onclick="arcEditando=false;verArchivo(archivoSel)">Cancelar</button>';
    else h+='<button class="btn sec" onclick="arcEditando=true;verArchivo(archivoSel)">'+ic('editar',16)+'Editar aquí</button>';
    if(esSvg&&!arcEditando)h+='<button class="btn sec" onclick="arcCodigo=!arcCodigo;verArchivo(archivoSel)">'+ic(arcCodigo?'imagen':'codigo',16)+(arcCodigo?'Ver la imagen':'Ver el código')+'</button>';
    h+=botonEditor(rel,arcLinea||0);
  }
  h+='<button class="btn sec" onclick="abrirEn(actual,\'finder\',archivoSel)">'+ic('finder',16)+'Finder</button><button class="btn sec" onclick="abrirEn(actual,\'app\',archivoSel)">'+ic('abrirFuera',16)+'Con su app</button></div>';
  if(r.tipo==='texto'){
    if(arcEditando)h+='<textarea class="editorArea" id="arcTxt" spellcheck="false">'+esc(r.contenido)+'</textarea><div class="aviso">Al guardar queda un respaldo en <code>.timon/respaldos/</code> y la edición se anota en <code>.timon/ediciones.md</code>.</div>';
    else if(esSvg&&!arcCodigo)h+='<div class="svg-vista"><img src="'+raw+'&t='+Date.now()+'" alt="'+esc(rel)+'"></div>';
    else if(esMd)h+='<div class="md" id="arcVista">'+md(r.contenido)+'</div>';
    else{const L=String(r.contenido).split('\n');h+='<div class="codigo-vista" role="table" aria-label="Contenido de '+esc(rel)+'">'+L.map((l,i)=>'<div class="cl'+(arcLinea===i+1?' on':'')+'" id="cl'+(i+1)+'"><button class="ln" title="Abrir en el editor en la línea '+(i+1)+'" onclick="abrirEditor(archivoSel,'+(i+1)+')">'+(i+1)+'</button><code>'+(esc(l)||' ')+'</code></div>').join('')+'</div>'}
  }else if(r.tipo==='medio'){
    h+='<div class="visor">'+(/^image/.test(r.mime)?'<img src="'+raw+'" alt="'+esc(rel)+'">':/pdf/.test(r.mime)?'<iframe src="'+raw+'" title="'+esc(rel)+'"></iframe>':'<video controls src="'+raw+'"></video>')+'</div>';
  }else h+='<div class="aviso">'+(r.tipo==='grande'?'Archivo grande':'Archivo binario')+' ('+fmtTam(r.size)+'). Ábrelo con su app.</div>';
  v.innerHTML=h+'</section>';
  if(arcLinea){const l=$('#cl'+arcLinea);if(l)l.scrollIntoView({block:'center'})}
}
async function guardarArchivo(){const t=$('#arcTxt');if(!t)return;await api('/api/archivo'+qp(),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({f:archivoSel,contenido:t.value})});toast('Guardado con respaldo: '+archivoSel.split('/').pop());ARC=null;arcEditando=false;verArchivo(archivoSel)}

// Con algo escrito o un formato elegido, el árbol muestra solo lo que coincide, en todo el proyecto
async function pintarHallados(){
  const el=$('#arbol');if(!el)return;const q=arcFiltro.trim(),fmt=arcFormato;
  let r;try{r=await (await fetch('/api/archivos/buscar'+qp()+'&q='+encodeURIComponent(q)+'&formato='+fmt+'&ocultos='+(arcOcultos?1:0))).json()}catch(e){r=null}
  if(!r||!r.items){el.innerHTML='<div class="aviso" style="padding:10px">Para buscar en todo el proyecto, cierra Timón.app con ⌘Q y vuelve a abrirla (se actualizó el panel).</div>';return}
  if(q!==arcFiltro.trim()||fmt!==arcFormato)return;
  NODOS=[];let h='<div class="arc-hall">'+r.items.length+(r.recortado?'+':'')+(r.items.length===1?' archivo':' archivos')+'</div>',ult=null;
  for(const e of r.items){
    if(e.carpeta!==ult){ult=e.carpeta;h+='<div class="arc-carp">'+ic('carpeta',14)+'<span>'+esc(e.carpeta==='.'?'(raíz)':e.carpeta)+'</span></div>'}
    const i=NODOS.push(e)-1;
    h+='<button class="nodo'+(e.oculto?' tenue':'')+(archivoSel===e.rel?' sel':'')+'" style="padding-left:22px" onclick="clicNodo('+i+')" title="'+esc(e.rel)+'">'+icono(e.nombre)+'<span>'+marcarHallado(e.nombre,q)+'</span><small>'+fmtTam(e.size)+'</small></button>';
  }
  el.innerHTML=r.items.length?h:'<div class="aviso" style="padding:10px">Ningún archivo'+(q?' con «'+esc(q)+'»':'')+(fmt?' de ese formato':'')+'.</div>';
}
function marcarHallado(n,q){const w=q.split(/\s+/).filter(x=>x&&!/^(\*?\.|ext:)/.test(x));let h=esc(n);for(const x of w){const i=n.toLowerCase().indexOf(x.toLowerCase());if(i>=0){h=esc(n.slice(0,i))+'<mark>'+esc(n.slice(i,i+x.length))+'</mark>'+esc(n.slice(i+x.length));break}}return h}

// ---------------- Corregir textos sin IA ----------------
let TX={q:'',nuevo:'',mayus:false,palabra:false,res:null,quitar:{}};
function pintarTextos(m){
  let h='<section class="seccion tx-form"><h2>Corregir textos</h2><div class="aviso" style="margin:-4px 0 12px">Una frase, un dato o un nombre en todo el proyecto, sin pedírselo a la IA. Ves cada coincidencia y cambias solo las que marques. No es para cambiar código.</div>'
    +'<div class="campos"><label class="campo"><span>Buscar</span><input type="text" id="txQ" value="'+esc(TX.q)+'" placeholder="Ej. Brincolínes" onkeydown="if(event.key===\'Enter\')buscarTextos()"></label>'
    +'<label class="campo"><span>Reemplazar por</span><input type="text" id="txN" value="'+esc(TX.nuevo)+'" placeholder="Ej. Brincolines" oninput="TX.nuevo=this.value;pintarResTextos()" onkeydown="if(event.key===\'Enter\')buscarTextos()"></label></div>'
    +'<div class="fila-form"><label class="interruptor"><input type="checkbox" id="txM" '+(TX.mayus?'checked':'')+'>Distinguir mayúsculas</label><label class="interruptor"><input type="checkbox" id="txP" '+(TX.palabra?'checked':'')+'>Palabra completa</label>'
    +'<button class="btn" onclick="buscarTextos()">'+ic('buscar',16)+'Buscar</button><button class="lnk" style="margin-left:auto" onclick="irArchivo(\'.timon/ediciones.md\');arcOcultos=true">Ver las ediciones anteriores</button></div></section><div id="txRes"></div>';
  m.innerHTML=h;pintarResTextos();
  const q=$('#txQ');if(q&&!TX.res)q.focus();
}
async function buscarTextos(){
  TX.q=$('#txQ').value;TX.nuevo=$('#txN').value;TX.mayus=$('#txM').checked;TX.palabra=$('#txP').checked;TX.quitar={};
  if(TX.q.trim().length<2)return toast('Escribe al menos 2 letras');
  $('#txRes').innerHTML='<section class="seccion">Buscando «'+esc(TX.q)+'»…</section>';
  try{TX.res=await api('/api/textos/buscar'+qp()+'&q='+encodeURIComponent(TX.q)+'&mayus='+(TX.mayus?1:0)+'&palabra='+(TX.palabra?1:0))}catch(e){TX.res=null}
  pintarResTextos();
}
const txClave=x=>x.rel+':'+x.linea+':'+x.col;
function pintarResTextos(){
  const el=$('#txRes');if(!el)return;const R=TX.res;
  if(!R){el.innerHTML='';return}
  if(!R.items.length){el.innerHTML='<section class="seccion"><div class="aviso" style="margin:0">No encontré «'+esc(R.q)+'» en el proyecto.</div></section>';return}
  const marcadas=R.items.filter(x=>!TX.quitar[txClave(x)]).length,porArch={};
  R.items.forEach((x,i)=>(porArch[x.rel]=porArch[x.rel]||[]).push([x,i]));
  let h='<div class="tx-resumen"><b>'+R.total+(R.total===1?' coincidencia':' coincidencias')+'</b> en '+R.archivos+(R.archivos===1?' archivo':' archivos')+(R.recortado?' · muestro las primeras '+R.items.length:'')
    +'<span class="der"><button class="btn sec" onclick="marcarTextos(true)">Marcar todas</button><button class="btn sec" onclick="marcarTextos(false)">Ninguna</button><button class="btn" '+(marcadas?'':'disabled')+' onclick="reemplazarTextos()">Reemplazar '+marcadas+(TX.nuevo?' por «'+esc(TX.nuevo)+'»':'')+'</button></span></div>';
  for(const [rel,xs] of Object.entries(porArch)){
    const esCodigo=/\.(m?js|cjs|ts|tsx|jsx|vue|svelte|py|rb|php|swift|kt|java)$/i.test(rel);
    h+='<section class="seccion tx-arch"><div class="tx-acab"><label><input type="checkbox" '+(xs.every(([x])=>!TX.quitar[txClave(x)])?'checked':'')+' onchange="marcarArchivoTx(\''+esc(rel)+'\',this.checked)" aria-label="Todas en '+esc(rel)+'"></label><code>'+esc(rel)+'</code>'+(esCodigo?'<span class="pill w">código</span>':'')+'<span class="aviso" style="margin:0">'+xs.length+'</span>'
      +'<span class="der"><button class="mini" onclick="irArchivo(\''+esc(rel)+'\','+xs[0][0].linea+')">'+ic('ver',14)+'Ver</button><button class="mini" onclick="abrirEditor(\''+esc(rel)+'\','+xs[0][0].linea+')">'+ic('codigo',14)+'Editor</button></span></div>';
    for(const [x,i] of xs){
      const c=x.col-x.corte,antes=x.texto.slice(0,c),hit=x.texto.slice(c,c+x.largo),desp=x.texto.slice(c+x.largo),on=!TX.quitar[txClave(x)];
      h+='<label class="tx-l'+(on?'':' off')+'"><input type="checkbox" '+(on?'checked':'')+' onchange="TX.quitar[\''+esc(txClave(x))+'\']=!this.checked;pintarResTextos()"><span class="n">'+x.linea+'</span><span class="t">'+(x.corte?'…':'')+esc(antes.trimStart())+'<mark'+(TX.nuevo&&on?' class="viejo"':'')+'>'+esc(hit)+'</mark>'+(TX.nuevo&&on?'<mark class="nuevo">'+esc(TX.nuevo)+'</mark>':'')+esc(desp)+'</span></label>';
    }
    h+='</section>';
  }
  el.innerHTML=h;
}
function marcarTextos(v){TX.quitar={};if(!v)TX.res.items.forEach(x=>TX.quitar[txClave(x)]=true);pintarResTextos()}
function marcarArchivoTx(rel,v){TX.res.items.filter(x=>x.rel===rel).forEach(x=>{if(v)delete TX.quitar[txClave(x)];else TX.quitar[txClave(x)]=true});pintarResTextos()}
async function reemplazarTextos(){
  TX.nuevo=$('#txN').value;
  const items=TX.res.items.filter(x=>!TX.quitar[txClave(x)]);if(!items.length)return;
  if(!TX.nuevo&&!confirm('El reemplazo está vacío: se borrará «'+TX.res.q+'» en '+items.length+' lugar(es). ¿Seguro?'))return;
  if(TX.nuevo&&!confirm('Se cambiará «'+TX.res.q+'» por «'+TX.nuevo+'» en '+items.length+' lugar(es) de '+new Set(items.map(x=>x.rel)).size+' archivo(s).\n\nCada archivo queda respaldado en .timon/respaldos/. ¿Continuar?'))return;
  const r=await post('/api/textos/reemplazar',{q:TX.res.q,nuevo:TX.nuevo,mayus:TX.mayus,palabra:TX.palabra,items:items.map(x=>({rel:x.rel,linea:x.linea,col:x.col}))});
  toast(r.cambios+' cambio(s) en '+r.archivos.length+' archivo(s), con respaldo');
  buscarTextos();
}
