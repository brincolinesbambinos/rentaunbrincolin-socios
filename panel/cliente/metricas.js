// Timón · Métricas del proyecto (TMN-064): cómo rinde el trabajo, día por día.
let MT=null,mtMedida=null,mtRango=(()=>{try{return localStorage.getItem('timon.mtRango')||'30'}catch(e){return '30'}})();
const MT_ESCALA=['#EEF2F7','#DCE4FF','#8EA6E6','#3D5FC0','#1C3F94'];
const MT_DIAS=['lun','mar','mié','jue','vie','sáb','dom'];
const MT_MEDIDAS=[['pts','Puntos'],['con','Construidas'],['ver','Verificadas'],['reg','Registradas']];
function mtPonerRango(r){mtRango=r;try{localStorage.setItem('timon.mtRango',r)}catch(e){}MT=null;pintar()}
const mtN=n=>n===null||n===undefined?'—':(Math.round(n*10)/10).toLocaleString('es-MX');
const mtPesos=n=>'$'+Math.round(n||0).toLocaleString('es-MX');
const mtCorta=f=>{const m=String(f||'').match(/^\d{4}-(\d{2})-(\d{2})/);return m?m[2]+' '+MESES_L[+m[1]-1].slice(0,3):''};
function mtDelta(a,b,menosEsMejor,suf){
  if(b===null||b===undefined||a===null||a===undefined)return '<span class="mt-d">sin periodo anterior</span>';
  const d=Math.round((a-b)*10)/10;if(!d)return '<span class="mt-d">igual que antes</span>';
  const bueno=menosEsMejor?d<0:d>0;return '<span class="mt-d '+(bueno?'bien':'mal')+'">'+(d>0?'▲ ':'▼ ')+mtN(Math.abs(d))+(suf||'')+' contra antes</span>';
}
async function pintarMetricas(m){
  if(!MT||MT._pid!==actual||MT._r!==mtRango){m.innerHTML='<div class="seccion">Calculando…</div>';const pid=actual;const r=await api('/api/metricas'+qp()+'&r='+mtRango);if(pid!==actual||tab!=='metricas')return;MT=r;MT._pid=pid;MT._r=mtRango}
  const X=MT,a=X.ahora,b=X.previo||{};
  if(!mtMedida){const t=k=>X.calendario.reduce((s,w)=>s+w.dias.reduce((q,d)=>q+(d?d[k]:0),0),0);mtMedida=t('pts')?'pts':t('con')?'con':'ver'}
  let h='<div class="mt-barra"><div class="seg">'+[['7','7 días'],['30','30 días'],['90','90 días'],['todo','Todo']].map(([v,l])=>'<button class="'+(mtRango===v?'on':'')+'" onclick="mtPonerRango(\''+v+'\')">'+l+'</button>').join('')+'</div>'
    +'<span class="aviso" style="margin:0">'+(X.rango==='todo'?'Desde '+esc(fFecha(X.desde)):'Del '+esc(fFecha(X.desde))+' a hoy')+(X.historialDesde?' · Timón registra cada cambio de estado desde el '+esc(fFecha(X.historialDesde))+'; antes, las fechas salen del registro y de las notas de verificación.':'')+'</span></div>';
  // cifras
  h+='<section class="mt-kpis" aria-label="Cifras del periodo">'
    +'<div class="k amarillo"><b>'+mtN(a.pts)+'</b><span>puntos construidos</span>'+mtDelta(a.pts,b.pts)+'</div>'
    +'<div class="k azul"><b>'+mtPesos(a.valor)+'</b><span>valor generado</span><span class="mt-d">puntos × '+mtPesos(X.valorPunto)+'</span></div>'
    +'<div class="k"><b>'+mtN(a.verificadas)+'</b><span>piezas verificadas</span>'+mtDelta(a.verificadas,b.verificadas)+'</div>'
    +'<div class="k"><b>'+(a.espera===null?'—':mtN(a.espera)+' d')+'</b><span>de construida a verificada</span>'+mtDelta(a.espera,b.espera,true,' d')+'</div>'
    +'<div class="k naranja"><b>'+(a.fallan===null?'—':a.fallan+'%')+'</b><span>fallan al probar</span>'+mtDelta(a.fallan,b.fallan,true,' %')+'</div></section>';
  // 01 ritmo
  const vals=X.calendario.flatMap(w=>w.dias.filter(Boolean).map(d=>d[mtMedida])),max=Math.max(1,...vals);
  const nivel=v=>!v?0:Math.min(4,Math.ceil(v/max*4));
  const nomM=(MT_MEDIDAS.find(x=>x[0]===mtMedida)||[0,''])[1].toLowerCase();
  h+='<section class="seccion mt-sec"><div class="mt-cab"><span class="num">01</span><h2>Ritmo de trabajo</h2><div class="seg">'+MT_MEDIDAS.map(([v,l])=>'<button class="'+(mtMedida===v?'on':'')+'" onclick="mtMedida=\''+v+'\';pintar()">'+l+'</button>').join('')+'</div></div>'
    +'<div class="mt-dos"><div class="mt-cal-caja"><div class="mt-cal"><div class="mt-cal-dias"><span></span>'+MT_DIAS.map((d,i)=>'<span>'+(i%2?'':d)+'</span>').join('')+'</div>'
    +X.calendario.map((w,i)=>{const m=+w.ini.slice(5,7),prev=i?+X.calendario[i-1].ini.slice(5,7):0;return '<div class="mt-cal-sem"><span class="mes">'+(m!==prev?MESES_L[m-1].slice(0,3):'')+'</span>'+w.dias.map(d=>d?'<span class="c" style="background:'+MT_ESCALA[nivel(d[mtMedida])]+(d.f===X.hoy?';outline:2px solid var(--marcador)':'')+'" title="'+esc(fFecha(d.f)+': '+mtN(d[mtMedida])+' '+nomM)+'"></span>':'<span class="c vacio"></span>').join('')+'</div>'}).join('')
    +'</div><div class="mt-ley">Menos '+MT_ESCALA.map(c=>'<i style="background:'+c+'"></i>').join('')+' Más</div></div>';
  const sd=X.semanaDia.map(x=>mtMedida==='pts'?x.pts:mtMedida==='con'?x.con:mtMedida==='ver'?x.ver:0),sdMax=Math.max(1,...sd);
  h+='<div class="mt-lado">'
    +'<div class="mt-dato amarillo"><span>Mejor día</span><b>'+(X.mejor?esc(fFecha(X.mejor.f))+' · '+(X.mejor.pts?mtN(X.mejor.pts)+' pts':(X.mejor.con+X.mejor.ver)+' piezas'):'Todavía nada')+'</b></div>'
    +'<div class="mt-dato verde"><span>Racha</span><b>'+X.racha+(X.racha===1?' día':' días')+' seguidos <small>· la más larga: '+X.rachaLarga+'</small></b></div>'
    +(mtMedida!=='reg'?'<div class="mt-sub">Día de la semana que más rindes</div>'+MT_DIAS.map((d,i)=>'<div class="mt-hbar"><span class="l">'+d+'</span><span class="b"><i style="width:'+Math.round(sd[i]/sdMax*100)+'%'+(sd[i]===sdMax&&sd[i]?';background:var(--marcador)':'')+'"></i></span><span class="n">'+mtN(sd[i])+'</span></div>').join(''):'')
    +'</div></div></section>';
  // puntos por semana
  const T=['Contratado','Extra','Garantía','Cortesía','Otro'],TC={Contratado:'#1C3F94',Extra:'#FF7A1A','Garantía':'#FFE14D','Cortesía':'#C9D0DC',Otro:'#8EA6E6'},TL={Contratado:'Contratado',Extra:'Extra','Garantía':'Garantía','Cortesía':'Regalado',Otro:'Por decidir o sin tipo'};
  const tot=X.semanas.map(s=>T.reduce((q,k)=>q+s[k],0)),tmax=Math.max(1,...tot),prom=tot.reduce((q,v)=>q+v,0)/tot.length;
  h+='<section class="seccion mt-sec"><div class="mt-cab"><h2 class="chico">Puntos construidos por semana</h2><span class="aviso" style="margin:0">promedio '+mtN(prom)+' pts · esta semana '+mtN(tot[tot.length-1])+'</span><div class="mt-leyenda">'+T.map(k=>'<span><i style="background:'+TC[k]+'"></i>'+TL[k]+'</span>').join('')+'</div></div>'
    +(tot.some(Boolean)?'<div class="mt-barras">'+X.semanas.map((s,i)=>'<div class="col" title="Semana del '+esc(fFecha(s.ini))+': '+mtN(tot[i])+' pts"><span class="t">'+(tot[i]?mtN(tot[i]):'')+'</span>'+T.slice().reverse().map(k=>s[k]?'<i style="height:'+Math.round(s[k]/tmax*170)+'px;background:'+TC[k]+'"></i>':'').join('')+'</div>').join('')+'</div><div class="mt-ejes">'+X.semanas.map(s=>'<span>'+mtCorta(s.ini)+'</span>').join('')+'</div>'
      :'<div class="aviso">Todavía no hay puntos en piezas construidas. Aparecen cuando las piezas tienen su fila en Puntos (regla 24).</div>')+'</section>';
  // 02 flujo y 03 calidad
  const F=X.flujo,pila=F.pila,pmax=Math.max(1,...pila.map(x=>x.n));
  const puntos=pila.map((x,i)=>Math.round(i/(Math.max(1,pila.length-1))*300)+','+(86-Math.round(x.n/pmax*76))).join(' ');
  const pMax=pila.reduce((m,x)=>x.n>m.n?x:m,{n:-1});
  h+='<div class="mt-fila"><section class="seccion mt-sec ancho"><div class="mt-cab"><span class="num">02</span><h2>Flujo</h2><span class="aviso" style="margin:0">dónde se atora</span></div>'
    +'<div class="mt-sub">Días promedio por paso</div>'+(F.regCon===null&&F.conVer===null?'<div class="aviso">Todavía sin piezas que hayan pasado por los dos pasos en este periodo.</div>':
      '<div class="mt-pasos"><div style="flex:'+Math.max(.5,F.regCon||0)+'" class="a"><span>Registrada → construida</span><b>'+mtN(F.regCon)+' d</b></div><div style="flex:'+Math.max(.5,F.conVer||0)+'" class="b"><span>Construida → verificada</span><b>'+mtN(F.conVer)+' d</b></div></div>'
      +(F.regCon!==null&&F.conVer!==null?'<p class="mt-nota">'+(F.conVer>F.regCon*1.3?'Probar te toma más que construir: lo que más espera es lo que ya está hecho.':F.regCon>F.conVer*1.3?'Lo que más tarda es empezar a construir: hay piezas registradas que esperan turno.':'Construir y probar van parejos.')+'</p>':''))
    +'<div class="mt-sub">Pila por probar, últimos 30 días</div><svg viewBox="0 0 300 90" class="mt-linea" role="img" aria-label="Piezas por probar cada día"><polyline points="'+puntos+'" fill="none" stroke="#1C3F94" stroke-width="3"></polyline><line x1="0" y1="89" x2="300" y2="89" stroke="#23272F" stroke-width="2"></line></svg>'
    +'<div class="mt-ejes3"><span>'+esc(mtCorta(pila[0]&&pila[0].f))+'</span><span>máx. '+(pMax.n<0?0:pMax.n)+(pMax.f?' · '+esc(mtCorta(pMax.f)):'')+'</span><span>hoy · '+(pila.length?pila[pila.length-1].n:0)+'</span></div>'
    +'<div class="mt-sub">Lo más viejo sin moverse</div>'+(F.viejas.length?F.viejas.map(v=>'<button class="mt-vieja" onclick="abrirPieza(\''+esc(v.id)+'\')"><code>'+esc(v.id)+'</code><span class="t">'+esc(v.titulo)+'</span><span class="e '+claseEst(v.estado)+'">'+ESTADO_CORTO(v.estado)+(v.dias!==null?' · '+v.dias+' d':'')+'</span></button>').join(''):'<div class="aviso">Nada abierto.</div>')+'</section>';
  const C=X.calidad,mz=Object.entries(C.mezcla).sort((x,y)=>y[1]-x[1]),mzT=mz.reduce((q,x)=>q+x[1],0)||1,MZC={'Nueva función':'#1C3F94','Mejora':'#8EA6E6','Arreglo':'#FFE14D','Cambio':'#FF7A1A','Soporte':'#7CF0B9','Interno':'#C9D0DC'};
  h+='<section class="seccion mt-sec"><div class="mt-cab"><span class="num">03</span><h2>Calidad</h2></div>'
    +'<div class="mt-cuad"><div class="naranja"><b>'+(C.fallan===null?'—':C.fallan+'%')+'</b><span>fallan la primera vez que las pruebas</span></div><div><b>'+C.reabiertas+'</b><span>se reabrieron después de verificarse</span></div></div>'
    +'<div class="mt-sub">De qué está hecho el trabajo</div>'+(mz.length?'<div class="mt-mezcla">'+mz.map(([k,v])=>'<i style="flex:'+v+';background:'+(MZC[k]||'#C9D0DC')+'" title="'+esc(k)+': '+v+'"></i>').join('')+'</div><div class="mt-leyenda" style="margin-top:8px">'+mz.map(([k,v])=>'<span><i style="background:'+(MZC[k]||'#C9D0DC')+'"></i>'+esc(k)+' '+Math.round(v/mzT*100)+'%</span>').join('')+'</div>':'<div class="aviso">Las piezas todavía no tienen Tipo.</div>')
    +'<div class="mt-sub">Módulos con más fallos</div>'+(C.falloModulos.length?C.falloModulos.map(([k,v])=>'<div class="mt-li"><span>'+esc(k)+'</span><b>'+v+'</b></div>').join(''):'<div class="aviso">Ningún fallo registrado con lugar.</div>')+'</section></div>';
  // 04 dinero y 05 alcance
  const Dn=X.dinero,ct=Dn.totales||{},tipos=[['Contratado','Contratado','#1C3F94'],['Extra','Extra','#FF7A1A'],['Garantía','Garantía','#FFE14D'],['Cortesía','Regalado','#C9D0DC'],['Iguala','Iguala','#7CF0B9'],['Por decidir','Por decidir','#8EA6E6']].filter(([k])=>ct[k]),tMax=Math.max(1,...tipos.map(([k])=>ct[k]));
  h+='<div class="mt-fila"><section class="seccion mt-sec ancho"><div class="mt-cab"><span class="num">04</span><h2>Dinero</h2></div>'
    +(Dn.conPuntos?'<div class="mt-cuad tres"><div class="azul"><b>'+mtPesos(Dn.semana)+'</b><span>valor generado esta semana</span></div><div><b>'+(Dn.valorReal?mtPesos(Dn.valorReal):'—')+'</b><span>valor del punto en el contrato · base '+mtPesos(X.valorPunto)+'</span></div><div class="amarillo"><b>'+mtPesos(Dn.regaladoMes)+'</b><span>regalado este mes</span></div></div>':'<div class="aviso">Este proyecto no tiene PUNTOS todavía; sin puntos no hay valor generado ni regalado.</div>')
    +(Dn.contratado?'<div class="mt-li fuerte"><span>Cobrado</span><span>'+mtPesos(Dn.cobrado)+' de '+mtPesos(Dn.contratado)+' contratado</span></div><div class="mt-progreso"><i style="width:'+Math.min(100,Math.round(Dn.cobrado/Dn.contratado*100))+'%"></i></div>':'')
    +(()=>{const K=X.costo;if(!K)return '';if(!K.configurado)return '<div class="mt-sub">Costo real</div><div class="aviso">Pon tu costo por hora y tu gasto mensual en IA en <button class="lnk" onclick="irTimon()">Ajustes › Cobro y fechas</button> para ver cuánto ganas de verdad.</div>';
      return '<div class="mt-sub">Costo real del periodo</div><div class="mt-cuad tres" style="margin-top:0"><div><b>'+mtPesos(K.total)+'</b><span>'+mtN(K.horasPeriodo)+' h encendido × '+mtPesos(K.costoHora)+(K.ia?' + '+mtPesos(K.ia)+' de IA':'')+'</span></div><div class="'+(K.ganancia>=0?'verde':'naranja')+'"><b>'+mtPesos(K.ganancia)+'</b><span>ganancia: valor generado menos costo</span></div><div><b>'+(K.porPunto===null?'—':mtPesos(K.porPunto))+'</b><span>te cuesta cada punto · lo cobras a '+mtPesos(X.valorPunto)+'</span></div></div>'+(X.horas.desde?'':'<div class="aviso" style="margin-top:6px">Las horas se registran desde hoy: el costo se irá llenando.</div>')})()
    +(tipos.length?'<div class="mt-sub">Puntos por tipo de cobro</div>'+tipos.map(([k,l,c])=>'<div class="mt-hbar ancha"><span class="l">'+l+'</span><span class="b"><i style="width:'+Math.round(ct[k]/tMax*100)+'%;background:'+c+'"></i></span><span class="n">'+mtN(ct[k])+' pts</span></div>').join(''):'')+'</section>';
  const A=X.alcance,mmax=Math.max(1,...A.modulos.map(x=>x[1]));
  h+='<section class="seccion mt-sec"><div class="mt-cab"><span class="num">05</span><h2>Alcance</h2></div>'
    +(A.contratados?'<div class="mt-dato naranja"><span>Fuera de la cotización</span><b>+'+Math.round(A.fuera/A.contratados*100)+'% <small>· '+mtN(A.fuera)+' pts sobre '+mtN(A.contratados)+' contratados</small></b></div>':'<div class="aviso">Sin cotización en Puntos: no puedo medir cuánto creció fuera de ella.</div>')
    +'<div class="mt-sub">Dónde se concentra el trabajo</div>'+(A.modulos.length?A.modulos.map(([k,v])=>'<div class="mt-hbar"><span class="l ancha">'+esc(k)+'</span><span class="b"><i style="width:'+Math.round(v/mmax*100)+'%"></i></span><span class="n">'+v+'</span></div>').join(''):'<div class="aviso">Las piezas todavía no tienen Dónde.</div>')
    +'<div class="mt-cuad"><div><b>'+A.ideasEntraron+'</b><span>ideas entraron</span></div><div class="verde"><b>'+A.ideasProcesadas+'</b><span>ideas procesadas</span></div></div></section></div>';
  // 06 pronóstico y horas encendido
  const Pr=X.pronostico,Hs=X.horas,hmax=Math.max(.1,...Hs.dias.map(x=>x.h));
  let pron='<div class="aviso" style="color:var(--gris2)">Sin piezas abiertas o sin ritmo medido todavía.</div>';
  if(Pr&&Pr.abiertas&&Pr.termina){const dif=Pr.finPlan?Math.round((Date.parse(Pr.finPlan)-Date.parse(Pr.termina))/864e5):null;
    pron='<p class="grande">Al ritmo actual, las <b>'+Pr.abiertas+' piezas abiertas</b> se terminan el <b class="res">'+esc(fFecha(Pr.termina))+'</b>.</p>'
      +(Pr.finPlan?'<div class="mt-plan"><i class="'+(dif>=0?'ok':'mal')+'"></i><span>'+esc(nomEtapaS(Pr.etapa))+' termina según el plan el '+esc(fFecha(Pr.finPlan))+': '+(dif>=0?'vas <b>'+dif+(dif===1?' día':' días')+' antes</b>.':'vas <b>'+(-dif)+((-dif)===1?' día':' días')+' tarde</b>.')+'</span></div>':'')
      +'<div class="nota">Calculado con '+mtN(Pr.porSemana)+' piezas verificadas por semana de las últimas 6 semanas.</div>'}
  else if(Pr&&Pr.abiertas)pron='<p class="grande"><b>'+Pr.abiertas+' piezas abiertas</b> y ninguna verificada en las últimas 6 semanas: no hay ritmo para calcular cuándo terminan.</p>';
  h+='<div class="mt-fila"><section class="mt-sec mt-pron ancho"><div class="mt-cab"><span class="num">06</span><h2>Pronóstico</h2></div>'+pron+'</section>'
    +'<section class="seccion mt-sec"><div class="mt-cab"><h2 class="chico">Horas encendido</h2><span class="aviso" style="margin:0">'+(Hs.desde?'desde el '+esc(fFecha(Hs.desde)):'se registra desde hoy')+'</span></div>'
    +'<div class="mt-horas">'+Hs.dias.map(x=>'<div class="col" title="'+esc(fFecha(x.f))+': '+mtN(x.h)+' h, '+x.n+' arranque(s)"><span class="t">'+(x.h?mtN(x.h)+' h':'')+'</span><i style="height:'+Math.round(x.h/hmax*80)+'px"></i></div>').join('')+'</div>'
    +'<div class="mt-ejes">'+Hs.dias.map(x=>'<span>'+MT_DIAS[(new Date(x.f+'T12:00:00').getDay()+6)%7]+'</span>').join('')+'</div>'
    +'<p class="mt-nota">'+(Hs.arranques?Hs.arranques+' arranques en 7 días · '+mtN(Hs.total)+' h encendido · la sesión más larga: '+Math.floor(Hs.larga/60)+' h '+(Hs.larga%60)+' min':'Cada vez que arranques el proyecto desde Timón quedará aquí cuánto tiempo estuvo prendido.')+'</p></section></div>';
  m.innerHTML='<div class="mt">'+h+'</div>';
}
