// Timón · Fase 5: Ideas en tarjetas (TMN-028, tablero 09)
// Cada entrada del INBOX es una tarjeta. Promover crea la pieza y marca la idea como procesada; nada se borra.
let idOrden=(()=>{try{return localStorage.getItem('timon.idOrden')||'nuevas'}catch(e){return 'nuevas'}})(),idFiltro='sin',idAbierta=null,idPromover=null,idVerArchivo=false;
function pintarInbox(m){
  const I=S.ideas||[],cuenta=e=>I.filter(x=>x.estado===e).length;
  const chip=(v,l,n)=>'<button class="chipf'+(idFiltro===v?' on':'')+'" onclick="idFiltro=\''+v+'\';pintar()">'+l+(n!==undefined?' <span class="n">'+n+'</span>':'')+'</button>';
  let h='<section class="seccion lila captura"><label for="qc"><b>Anotar una idea</b></label><div class="fila-form" style="margin:8px 0 0"><textarea id="qc" rows="2" placeholder="Pega la idea, el bug o lo que pidió el cliente, tal cual." style="flex:1 1 420px;min-width:0"></textarea><button class="btn" style="align-self:flex-start;min-height:48px" onclick="capturar()">Anotar</button></div></section>';
  h+='<div class="pz-barra"><div class="pz-chips">'+chip('sin','Sin procesar',cuenta('sin'))+chip('procesada','Procesadas',cuenta('procesada'))+chip('descartada','Descartadas',cuenta('descartada'))+chip('todas','Todas',I.length)+'</div>'
    +'<div class="pz-chips"><span class="seg"><button class="'+(idOrden==='nuevas'?'on':'')+'" onclick="ponerOrdenIdeas(\'nuevas\')">Más nuevas</button><button class="'+(idOrden==='viejas'?'on':'')+'" onclick="ponerOrdenIdeas(\'viejas\')">Más viejas</button></span></div>'+(S.inbox?'<div class="pz-chips"><button class="chipf'+(idVerArchivo?' on':'')+'" onclick="idVerArchivo=!idVerArchivo;pintar()">'+ic('documento',16)+'Ver el archivo</button></div>':'')+'</div>';
  if(idVerArchivo&&S.inbox){m.innerHTML=h+'<section class="seccion"><h2>'+esc(S.inbox.file)+'</h2><div class="md">'+md(S.inbox.contenido)+'</div></section>';return}
  const L=I.filter(x=>idFiltro==='todas'?true:x.estado===idFiltro).map((x,k)=>({x,k})).sort((a,b)=>{const c=String(a.x.fecha||'').localeCompare(String(b.x.fecha||''))||a.k-b.k;return idOrden==='viejas'?c:-c}).map(o=>o.x);
  if(!L.length)h+='<section class="seccion"><div class="aviso" style="margin:0">'+(idFiltro==='sin'?'No hay ideas sin procesar. Lo que llegue en bruto, anótalo arriba.':'Nada por aquí.')+'</div></section>';
  else h+='<div class="ideas">'+L.map(tarjetaIdea).join('')+'</div>';
  m.innerHTML=h;
}
function tarjetaIdea(x){
  const larga=x.texto.length>320,abierta=idAbierta===x.n;
  let h='<article class="idea est-'+x.estado+'"><div class="cab"><span class="f">'+(x.fecha?fFecha(x.fecha):'sin fecha')+'</span>'+(x.estado==='sin'?edadDesde(x.fecha,'espera desde'):'')+(x.origen?'<span class="pill">'+esc(x.origen)+'</span>':'')
    +(x.estado==='procesada'?'<span class="pill g">Procesada</span>':x.estado==='descartada'?'<span class="pill">Descartada</span>':x.estado==='sin'?'<span class="pill w">Sin procesar</span>':'')+'</div>'
    +'<h3>'+esc(x.titulo)+'</h3><div class="txt'+(larga&&!abierta?' corta':'')+'">'+md(x.texto)+'</div>'
    +(larga?'<button class="lnk" onclick="idAbierta='+(abierta?'null':x.n)+';pintar()">'+(abierta?'Ver menos':'Ver todo')+'</button>':'');
  if(x.estado==='procesada')h+='<div class="pie">'+(x.ids.length?x.ids.map(id=>'<button class="mini" onclick="abrirPieza(\''+esc(id)+'\')">'+ic('piezas',14)+esc(id)+'</button>').join(''):'')+'<span class="aviso">'+esc(x.marca)+'</span></div>';
  else if(x.estado==='descartada')h+='<div class="pie"><span class="aviso">'+esc(x.marca)+'</span></div>';
  else if(idPromover===x.n){
    h+='<div class="promover"><label class="campo"><span>Qué se pide (una línea)</span><input type="text" id="ipDesc" value="'+esc(x.titulo)+'"></label>'
      +'<div class="campos"><label class="campo"><span>Tipo</span><select id="ipTipo"><option value="">Elige…</option>'+(S.tiposSolicitud||[]).map(t=>'<option>'+t+'</option>').join('')+'</select></label>'
      +'<label class="campo"><span>Dónde</span><select id="ipDonde">'+opcionesDonde('').replace('<option value="">—</option>','<option value="">Sin lugar todavía</option>')+'</select></label></div>'
      +'<div class="fila-form"><button class="btn" onclick="promoverIdeaUI('+x.n+')">'+ic('piezas',16)+'Crear la pieza</button><button class="btn sec" onclick="idPromover=null;pintar()">Cancelar</button></div>'
      +'<div class="aviso">¿Trae varios temas? Mejor pídele a la IA que la separe: <button class="lnk" onclick="copiarTexto(\'Procesa la idea del '+esc(x.fecha)+' «'+esc(x.titulo.replace(/'/g,''))+'» del inbox de '+esc(S.proyecto.codigo)+'\')">copiar la instrucción</button>.</div></div>';
  }else h+='<div class="pie"><button class="btn" onclick="idPromover='+x.n+';pintar()">'+ic('piezas',16)+'Promover a pieza</button><button class="btn sec" onclick="descartarIdeaUI('+x.n+')">Descartar</button></div>';
  return h+'</article>';
}
async function promoverIdeaUI(n){
  const d=$('#ipDesc').value.trim();if(!d)return toast('Escribe qué se pide');
  const r=await post('/api/ideas/promover',{n,descripcion:d,tipo:$('#ipTipo').value,donde:$('#ipDonde').value});
  idPromover=null;toast('Idea promovida: '+r.id);recargar();
}
async function descartarIdeaUI(n){
  const motivo=prompt('¿Por qué se descarta? (opcional)');if(motivo===null)return;
  await post('/api/ideas/descartar',{n,motivo});toast('Idea descartada (queda en el archivo)');recargar();
}
function ponerOrdenIdeas(v){idOrden=v;try{localStorage.setItem('timon.idOrden',v)}catch(e){}pintar()}
