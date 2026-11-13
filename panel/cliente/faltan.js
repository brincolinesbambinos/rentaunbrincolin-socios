// Timón · Datos que faltan en las piezas (TMN-065): sin puntos, sin Tipo o sin Dónde, y el texto para que la IA los complete.
function textoFaltantes(f){
  const L=['Proyecto '+f.nombre+' ('+f.codigo+'), carpeta: '+f.ruta];
  if(f.sinPuntos.length)L.push('- Cuenta los puntos con el catálogo de cotizar-proyecto y agrega su fila en PUNTOS-'+f.codigo+'.md con su tipo de cobro (regla 24): '+f.sinPuntos.join(', '));
  if(f.sinTipo.length)L.push('- Llena la columna Tipo en el changelog (regla 21): '+f.sinTipo.join(', '));
  if(f.sinDonde.length)L.push('- Llena la columna Dónde con los nombres de MAPA-'+f.codigo+'.md (regla 21): '+f.sinDonde.join(', '));
  L.push('Antes de escribir vuelve a leer cada archivo del disco y cambia solo esas filas (regla 23). Si un Tipo o un Dónde no es obvio, pregúntame en una línea.');
  return L.join('\n');
}
function resumenFaltantes(f){return [f.sinPuntos.length?f.sinPuntos.length+' sin puntos':'',f.sinTipo.length?f.sinTipo.length+' sin Tipo':'',f.sinDonde.length?f.sinDonde.length+' sin Dónde':''].filter(Boolean).join(' · ')}
function copiarFaltantes(i){const f=(INI&&INI.faltantes||[])[i];if(f)copiarTexto(textoFaltantes(f))}
function copiarFaltantesProyecto(){const f=S.faltantes;if(f)copiarTexto(textoFaltantes({...f,nombre:S.proyecto.nombre,codigo:S.proyecto.codigo,ruta:S.proyecto.ruta}))}
function bloqueFaltantes(){
  const F=(INI&&INI.faltantes)||[];if(!F.length)return '';
  const n=F.reduce((t,f)=>t+new Set([...f.sinPuntos,...f.sinTipo,...f.sinDonde]).size,0);
  return '<section class="ini-faltan" aria-label="Datos que faltan"><div class="cab"><b>Faltan datos en '+n+(n===1?' pieza':' piezas')+'</b><span>La IA los completa sola al empezar su próxima sesión en cada proyecto; si quieres que sea ya, copia la instrucción y pégasela.</span></div>'
    +F.map((f,i)=>'<div class="fila">'+chipProy(f.codigo,(PROY.find(p=>p.id===f.pid)||{}).cliente)+'<span class="n">'+esc(f.nombre)+'</span><span class="q">'+resumenFaltantes(f)+'</span><button class="mini" onclick="copiarFaltantes('+i+')">'+ic('copiar',14)+'Copiar para la IA</button><button class="mini" onclick="entrar(\''+f.pid+'\',\'salud\')">Ver</button></div>').join('')+'</section>';
}
