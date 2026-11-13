// Timón · Arranque y refresco automático
document.querySelectorAll('[data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,+e.dataset.sz||18)});
inicio().then(()=>{if(CONSOLA.abierta)pintarConsola()});
setInterval(()=>{const foco=(document.activeElement||{}).tagName||'';if(/INPUT|TEXTAREA|SELECT/.test(foco)||document.getElementById('dialogo')||document.getElementById('paleta'))return;if(!['run','tabla','inbox','textos','tiempo','etapas','tpiezas','mapa','piezas','timon','puntos','archivos','proyecto','verificar','vtodos','cobros','cobranza','nuevo','salud','sql'].includes(tab)&&!specAbierto&&!sqlAbierto)actual?recargar():refrescarGeneral()},20000);
// la barra lateral se pega justo debajo del encabezado (que cambia de alto con las pestañas)
(()=>{const h=document.querySelector('header.top');if(!h)return;const f=()=>document.documentElement.style.setProperty('--alto-top',h.offsetHeight+'px');f();try{new ResizeObserver(f).observe(h)}catch(e){window.addEventListener('resize',f)}})();
