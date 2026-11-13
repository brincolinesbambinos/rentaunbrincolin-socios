// Timón · Carriles e hilos (TMN-068, reglas 18 y 25)
// Hasta 3 carriles por proyecto: cada uno es una conversación de IA (un hilo) con su pieza o su lote.
// El límite real va en Por probar: con 6 o más construidas sin probar no entra nada nuevo.
let carFoco=null;
function pintarCarriles(m){
  const K=S.carriles;
  if(!K){m.innerHTML='<section class="seccion"><div class="aviso">No pude leer los carriles de este proyecto.</div></section>';return}
  const pzBtn=x=>'<button class="car-pz" onclick="abrirPieza(\''+esc(x.id)+'\')"><code>'+esc(x.id)+'</code><span>'+esc(x.titulo)+'</span><small>'+esc(ESTADO_CORTO(x.estado))+'</small></button>';
  const hiloCab=h=>'<div class="car-hilo'+(carFoco===h.hilo?' foco':'')+'" id="h-'+esc(h.hilo)+'"><code class="car-cod">'+esc(h.hilo)+'</code>'
    +'<button class="mini" onclick="copiarTexto(\''+esc(h.hilo)+'\')" title="Copia el código para buscarlo en tus chats">'+ic('copiar',14)+'Copiar</button>'
    +(h.enlace&&/^https?:/.test(h.enlace)?'<button class="mini" onclick="window.open(\''+esc(h.enlace)+'\',\'_blank\')">'+ic('enlace',14)+'Abrir el chat</button>':'<button class="mini" onclick="enlaceHilo(\''+esc(h.hilo)+'\')" title="Opcional">'+ic('enlace',14)+'Guardar enlace</button>')
    +(h.fecha?'<span class="aviso" style="margin:0">desde '+esc(fechaCorta(h.fecha))+'</span>':'')+'</div>';
  const pct=Math.min(100,Math.round(K.porProbar.length/K.limite*100));
  let h='<section class="seccion car-tope'+(K.lleno?' lleno':'')+'"><div class="car-tope-f"><div><h2>Por probar</h2><div class="aviso" style="margin:2px 0 0">'
    +(K.lleno?'Llegaste al límite. Prueba antes de abrir más.':'Con '+K.limite+' se detiene lo nuevo hasta que pruebes.')+'</div></div>'
    +'<div class="car-cifra"><b>'+K.porProbar.length+'</b><span>de '+K.limite+'</span></div>'
    +(K.porProbar.length?'<button class="btn'+(K.lleno?'':' sec')+'" onclick="VER=[];vFoco=null;irA(\'verificar\')">'+ic('probar',16)+'Probar</button>':'')+'</div>'
    +'<div class="car-barra"><span style="width:'+pct+'%"></span></div></section>';
  if(K.choques.length)h+='<section class="seccion alerta"><h2>Dos carriles en el mismo lugar</h2><div class="aviso" style="margin:-4px 0 10px;color:var(--grafito)">Se pueden pisar el mismo archivo o la misma tabla. Tú decides: sigue, congela uno o júntalos en un lote.</div>'
    +K.choques.map(c=>'<div class="falta-l"><code>'+esc(c.pa)+'</code> ('+esc(c.a)+') y <code>'+esc(c.pb)+'</code> ('+esc(c.b)+') · '+esc(c.donde||'mismo módulo')+'</div>').join('')+'</section>';
  h+='<div class="car-grid">';
  for(const c of K.carriles){
    h+='<section class="seccion car'+(c.hilos.length?' ocupado':'')+'"><div class="car-n"><span>Carril</span><b>'+c.n+'</b></div>';
    if(!c.hilos.length)h+='<div class="car-libre">Libre</div><div class="aviso" style="margin:0">Dile a un chat nuevo «trabaja [pieza]»: toma este carril y su hilo solo.</div>';
    else h+=c.hilos.map(x=>hiloCab(x)+x.taller.map(pzBtn).join('')+(x.piezas.length>x.taller.length?'<details class="car-mas"><summary>'+(x.piezas.length-x.taller.length)+' más en este hilo</summary>'+x.piezas.filter(p=>!/🔄|🔨/.test(p.estado)).map(pzBtn).join('')+'</details>':'')).join('');
    h+='</section>';
  }
  h+='</div>';
  if(K.sinCarril.length)h+='<section class="seccion alerta"><h2>En el taller sin carril</h2><div class="aviso" style="margin:-4px 0 10px;color:var(--grafito)">Estos hilos tienen piezas en construcción pero no dicen su carril'+(K.sinCarril.length+K.carriles.filter(c=>c.hilos.length).length>K.max?', y ya pasan del máximo de '+K.max:'')+'.</div>'
    +K.sinCarril.map(x=>hiloCab(x)+x.taller.map(pzBtn).join('')).join('')+'</section>';
  if(K.sinHilo.length)h+='<section class="seccion"><h2>En el taller sin hilo</h2><div class="aviso" style="margin:-4px 0 10px">Alguna sesión las tomó sin anotarse (regla 25). La próxima vez que un chat las trabaje, les pone su hilo.</div>'+K.sinHilo.map(id=>'<button class="mini" onclick="abrirPieza(\''+esc(id)+'\')">'+esc(id)+'</button>').join(' ')+'</section>';
  const otros=K.hilos.filter(x=>!x.ocupado);
  h+='<section class="seccion"><h2>Todos los hilos'+(K.hilos.length?' <span class="n">'+K.hilos.length+'</span>':'')+'</h2>'
    +(K.hilos.length?'':'<div class="aviso" style="margin:0">Todavía no hay hilos. Nacen solos cuando un chat empieza a trabajar una pieza'+(K.archivo?'':'; la IA crea <code>HILOS-'+esc(S.proyecto.codigo)+'.md</code> la primera vez')+'.</div>')
    +otros.slice().reverse().map(x=>'<div class="car-fila">'+hiloCab(x)+'<span class="pill'+(/cerrad/i.test(x.estado)?' g':x.cerrable?' w':'')+'">'+esc(x.cerrable?'Listo para cerrar':x.estado)+'</span><div class="car-pzs">'+x.piezas.map(p=>'<button class="mini" onclick="abrirPieza(\''+esc(p.id)+'\')" title="'+esc(p.titulo)+' · '+esc(ESTADO_CORTO(p.estado))+'">'+esc(p.id)+'</button>').join(' ')+'</div></div>').join('')
    +'</section>';
  m.innerHTML=h;
  if(carFoco){const e=document.getElementById('h-'+carFoco);if(e&&e.scrollIntoView)e.scrollIntoView({block:'center'});carFoco=null}
}
async function enlaceHilo(hilo){
  const v=prompt('Pega el enlace de la conversación de '+hilo+' (opcional)');if(!v||!v.trim())return;
  await post('/api/hilos/enlace',{hilo,enlace:v.trim()});await recargar();toast('Enlace guardado en '+hilo);
}
// "Tomar pieza": asigna hilo y carril desde el panel y copia el mensaje de arranque para un chat nuevo.
async function tomarPiezaPanel(id,forzar){
  const r=await post('/api/hilos/tomar',{id,forzar:!!forzar});
  if(!r.ok){if(!confirm(r.avisos.join('\n')+'\n\n¿La tomas de todos modos?'))return;return tomarPiezaPanel(id,true)}
  try{await navigator.clipboard.writeText(r.mensaje)}catch(e){}
  PZ=null;await recargar();
  toast(r.hilo+' · carril '+(r.carril||'—')+'. Mensaje copiado: pégalo en un chat nuevo');
}
