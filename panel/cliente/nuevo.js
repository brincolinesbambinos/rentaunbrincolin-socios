// Timón · Fase 5: ⌘N Proyecto (tablero 06). Dos caminos: empezar de cero o traer uno empezado (TMN-040).
let nwModo='cero',nwExpl=null,nwDiag=null,nwRuta='';
async function pintarNuevo(m){
  if(!T)T=await api('/api/timon');
  const seg='<div class="nw-modo seg" role="tablist"><button role="tab" aria-selected="'+(nwModo==='cero')+'" class="'+(nwModo==='cero'?'on':'')+'" onclick="nwModo=\'cero\';pintar()">'+ic('nuevo',16)+'Empezar de cero</button><button role="tab" aria-selected="'+(nwModo==='adoptar')+'" class="'+(nwModo==='adoptar'?'on':'')+'" onclick="nwModo=\'adoptar\';pintar()">'+ic('carpeta',16)+'Traer uno empezado</button></div>';
  m.innerHTML='<div class="nw-modo-fila">'+seg+'<button class="btn sec" onclick="cancelarNuevo()">'+ic('cerrar',16)+'Cancelar <kbd>esc</kbd></button></div>'+(nwModo==='adoptar'?pintarAdoptar():pintarCero());
  if(nwModo==='cero'){const n=$('#nwNom');if(n&&!n.value)n.focus()}
}
function opcionesClientes(id,ph){const cl=[...new Set(PROY.map(p=>p.cliente).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));return '<input type="text" id="'+id+'" list="'+id+'L" placeholder="'+ph+'"><datalist id="'+id+'L">'+cl.map(c=>'<option value="'+esc(c)+'"></option>').join('')+'</datalist>'}
const MARCAS=['Midnite Atelier','Invernadero Ads','Bonsai de Contenidos'];
function pintarCero(){
  const raices=(T.raices||[]).filter(r=>r.existe).map(r=>r.ruta);
  return '<section class="seccion"><h2>1 · Datos</h2><div class="fila-form"><input type="text" id="nwNom" placeholder="Nombre del proyecto" oninput="sugerirCodigo(this.value)"><input type="text" id="nwCod" placeholder="Código (2 a 6 letras)" style="max-width:220px;text-transform:uppercase" maxlength="6"></div>'
    +'<div class="fila-form">'+opcionesClientes('nwCli','Cliente')+'<input type="text" id="nwMar" list="nwMarL" placeholder="Marca"><datalist id="nwMarL">'+MARCAS.map(x=>'<option value="'+x+'"></option>').join('')+'</datalist></div></section>'
    +'<section class="seccion"><h2>2 · Dónde vive</h2><div class="fila-form"><select id="nwPadre" aria-label="Carpeta raíz">'+(raices.length?raices:[T.base]).map(r=>'<option>'+esc(r)+'</option>').join('')+'</select><input type="text" id="nwSub" placeholder="Subcarpeta (opcional, ej. Brincolines Bambinos)"></div><div class="aviso">Se crea la carpeta con el kit completo de Timón ya renombrado con el código, su ficha .tmn y el brief en Ideas.</div></section>'
    +'<section class="seccion lila"><h2>3 · Brief</h2><textarea id="nwBrief" rows="6" style="width:100%" placeholder="Pega lo que te pidió el cliente: mensaje, notas de la llamada o tu nota de voz transcrita."></textarea></section>'
    +'<section class="seccion oscura"><h2>Lo que sigue</h2><div class="aviso" style="font-size:14px;line-height:1.6">Brief › Descubrimiento (Marco y Arquitectura con la IA) › Cotización ("cotiza este proyecto") › Aceptado (puntos y cobranza) › Construcción › Entregado › Mantenimiento. El Resumen del proyecto te va guiando en cada etapa.</div><div class="fila-form"><button class="btn-claro" onclick="crearNuevo()">'+ic('nuevo',16)+'Crear proyecto</button></div></section>';
}
function sugerirCodigo(v){const c=$('#nwCod');if(!c||c.dataset.tocado)return;c.value=v.normalize('NFD').replace(/[^A-Za-z ]/g,'').split(/\s+/).filter(Boolean).map((w,i,a)=>a.length>1?w[0]:w.slice(0,3)).join('').slice(0,4).toUpperCase();c.oninput=()=>c.dataset.tocado=1}
async function crearNuevo(){
  const padre=$('#nwPadre').value,sub=$('#nwSub').value.trim();
  const b={nombre:$('#nwNom').value,codigo:$('#nwCod').value,cliente:$('#nwCli').value,marca:$('#nwMar').value,brief:$('#nwBrief').value,padre:sub?padre.replace(/\/$/,'')+'/'+sub:padre};
  if(!b.nombre.trim()||!b.codigo.trim())return toast('Faltan nombre y código');
  const r=await api('/api/nuevo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
  toast('Proyecto creado: '+r.codigo);T=null;await refrescarListas();if(r.id)entrar(r.id,'tablero');else irGeneral();
}

// ---- Traer uno empezado: carpeta → diagnóstico → adoptar ----
function pintarAdoptar(){
  let h='<section class="seccion"><h2>1 · La carpeta</h2><div class="aviso" style="margin:-4px 0 10px">Un proyecto que ya tenías, sin Timón. No se borra ni se mueve nada: se agrega el kit sin pisar tus archivos.</div>'
    +'<div class="fila-form"><input type="text" id="adRuta" placeholder="/Users/tu/Downloads/Plataformas/mi-proyecto" value="'+esc(nwRuta)+'" style="flex:3" onchange="nwRuta=this.value"><button class="btn sec" onclick="nwElegir()">'+ic('finder',16)+'Buscar…</button><button class="btn" onclick="diagnosticar()">'+ic('salud',16)+'Revisar</button></div>';
  if(nwExpl){const e=nwExpl;h+='<div class="expl"><div class="fila-form" style="margin:0 0 8px"><code class="dir">'+esc(e.dir)+'</code><button class="btn" onclick="nwUsar()">Usar esta carpeta</button><button class="btn sec" onclick="nwExpl=null;pintar()">Cancelar</button></div><div class="lista">'
    +(e.padre?'<button class="item" onclick="nwNavegar(\''+esc(e.padre)+'\')">'+ic('anterior',16)+' ..</button>':'')
    +e.carpetas.map(c=>'<button class="item" onclick="nwNavegar(\''+esc(c.ruta)+'\')"><span>'+ic(c.esProyecto?'proyecto':'carpeta',16)+' '+esc(c.nombre)+'</span>'+(c.esProyecto?'<span class="meta"><span class="est est-v">ya tiene algo de Timón o Claude</span></span>':'')+'</button>').join('')+(e.carpetas.length?'':'<div class="aviso">Sin subcarpetas.</div>')+'</div></div>'}
  h+='</section>';
  if(!nwDiag)return h+'<section class="seccion oscura"><h2>Qué hace</h2><div class="aviso" style="font-size:14px;line-height:1.6">Reviso la estructura (Git, archivos gigantes, raíz revuelta, SQL sueltos, cómo se arranca), agrego el kit de Timón sin pisar nada y registro cada corrección como pieza tipo Interno. La captura retroactiva (método 08) la hace la IA leyendo el código: Marco y Arquitectura como está construido hoy.</div></section>';
  const d=nwDiag;
  if(d.esTimon)return h+'<section class="seccion alerta"><b>Esta carpeta ya es un proyecto Timón.</b> Solo hay que agregarlo a la lista.<div class="fila-form"><button class="btn" onclick="adoptar()">Agregarlo a Timón</button></div></section>';
  h+='<section class="seccion"><h2>2 · Lo que encontré</h2><div class="diag-datos"><span><b>'+d.archivos.toLocaleString('es-MX')+'</b> archivos</span>'+(d.stack.length?'<span>Stack: <b>'+esc(d.stack.join(', '))+'</b></span>':'')
    +'<span>Arranca con: <b>'+(d.lanzadores.length?esc(d.lanzadores.map(l=>l.comando+(l.carpeta&&l.carpeta!=='.'?' en '+l.carpeta:'')).join(' · ')):'no lo sé')+'</b></span>'+(d.claude?'<span>CLAUDE.md: <b>'+(d.claude==='timon'?'ya habla de Timón':'propio, se respalda y pasa a la Parte 2')+'</b></span>':'')+'</div>'
    +'<div class="aviso" style="margin:12px 0 8px">Cada corrección marcada entra como pieza <b>Interno</b> en el changelog. Lo demás se queda como está.</div><div class="diag">'
    +d.problemas.map(x=>'<label class="diag-item'+(x.siempre?' fija':'')+'"><input type="checkbox" class="adCorr" value="'+esc(x.clave)+'" '+(x.siempre?'checked disabled':'checked')+'><span><b>'+esc(x.titulo)+'</b><span class="aviso">'+esc(x.detalle)+'</span><span class="pz">'+ic('piezas',14)+esc(x.pieza)+'</span></span></label>').join('')+'</div></section>';
  h+='<section class="seccion"><h2>3 · Datos</h2><div class="fila-form"><input type="text" id="adNom" placeholder="Nombre" value="'+esc(d.nombre)+'"><input type="text" id="adCod" placeholder="Código" value="'+esc(d.codigo)+'" style="max-width:200px;text-transform:uppercase" maxlength="6"></div>'
    +'<div class="fila-form">'+opcionesClientes('adCli','Cliente')+'<input type="text" id="adMar" list="adMarL" placeholder="Marca"><datalist id="adMarL">'+MARCAS.map(x=>'<option value="'+x+'"></option>').join('')+'</datalist>'
    +'<select id="adEtapa" aria-label="Etapa">'+ETAPAS_UI.map(([k,n])=>'<option value="'+k+'"'+(k==='construccion'?' selected':'')+'>'+n+'</option>').join('')+'</select></div></section>'
    +'<section class="seccion oscura"><h2>4 · Adoptar</h2><div class="aviso" style="font-size:14px;line-height:1.6">Después, en Claude: <b>"incorpora este proyecto con el método 08"</b>. La IA escribe el Marco y la Arquitectura como está hoy y arma el mapa.</div><div class="fila-form"><button class="btn-claro" onclick="adoptar()">'+ic('carpeta',16)+'Traer a Timón</button></div></section>';
  return h;
}
async function nwElegir(){nwExpl=await api('/api/explorar'+(nwRuta?'?dir='+encodeURIComponent(nwRuta):''));pintar()}
async function nwNavegar(dir){nwExpl=await api('/api/explorar?dir='+encodeURIComponent(dir));pintar()}
function nwUsar(){nwRuta=nwExpl.dir;nwExpl=null;diagnosticar()}
async function diagnosticar(){
  const i=$('#adRuta');if(i)nwRuta=i.value.trim();
  if(!nwRuta)return toast('Elige la carpeta');
  nwDiag=null;toast('Revisando la carpeta…');
  try{nwDiag=await api('/api/adoptar/diagnostico?ruta='+encodeURIComponent(nwRuta))}catch(e){}
  pintar();
}
async function adoptar(){
  const d=nwDiag;if(!d)return;
  const b=d.esTimon?{ruta:d.ruta}:{ruta:d.ruta,nombre:$('#adNom').value,codigo:$('#adCod').value,cliente:$('#adCli').value,marca:$('#adMar').value,etapa:$('#adEtapa').value,correcciones:[...document.querySelectorAll('.adCorr')].filter(c=>c.checked&&!c.disabled).map(c=>c.value)};
  if(!d.esTimon&&!b.codigo.trim())return toast('Falta el código');
  if(!d.esTimon&&!confirm('Se agregará el kit de Timón a:\n'+d.ruta+'\n\ncon código '+b.codigo.toUpperCase()+'. No se pisa ningún archivo tuyo. ¿Continuar?'))return;
  const r=await api('/api/adoptar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
  toast(r.yaEra?'Agregado a Timón':'Adoptado como '+r.codigo+(r.piezas?' · '+r.piezas.length+' piezas Interno':''));
  nwDiag=null;nwRuta='';nwModo='cero';T=null;await refrescarListas();if(r.id)entrar(r.id,'tablero');else irGeneral();
}
// Cancelar: regresa a donde estabas (o a Hoy) sin crear nada
function cancelarNuevo(){nwDiag=null;nwExpl=null;nwRuta='';nwModo='cero';if(history.length>1)atras();else irGeneral()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tab==='nuevo'&&!actual&&!document.getElementById('dialogo')&&!document.getElementById('paleta')){e.preventDefault();cancelarNuevo()}});
