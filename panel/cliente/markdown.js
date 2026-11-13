// Timón · Mini lector de markdown
// ---- mini markdown ----
function md(src){
  if(!src)return'';
  const lines=src.split('\n');let out=[],inCode=false,inList=false,tabla=[];
  const inline=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" style="color:var(--acc)">$1</a>');
  const flushTabla=()=>{if(!tabla.length)return;let h='<div class="tablewrap"><table>';tabla.forEach((c,i)=>{if(c.every(x=>/^[-:\s]*$/.test(x)))return;h+='<tr>'+c.map(x=>(i===0?'<th>':'<td>')+inline(x)+(i===0?'</th>':'</td>')).join('')+'</tr>'});out.push(h+'</table></div>');tabla=[]};
  const cerrarLista=()=>{if(inList){out.push('</ul>');inList=false}};
  for(const l of lines){
    if(l.trim().startsWith('```')){flushTabla();cerrarLista();out.push(inCode?'</code></pre>':'<pre><code>');inCode=!inCode;continue}
    if(inCode){out.push(esc(l)+'\n');continue}
    if(l.trim().startsWith('|')){cerrarLista();tabla.push(l.trim().split('|').slice(1,-1).map(c=>c.trim()));continue}
    flushTabla();
    if(/^#{1,4}\s/.test(l)){cerrarLista();const n=Math.min(l.match(/^#+/)[0].length,3);out.push('<h'+n+'>'+inline(l.replace(/^#+\s*/,''))+'</h'+n+'>');continue}
    if(/^---+\s*$/.test(l.trim())){cerrarLista();out.push('<hr>');continue}
    if(/^\s*[-*]\s/.test(l)){if(!inList){out.push('<ul>');inList=true}out.push('<li>'+inline(l.replace(/^\s*[-*]\s/,''))+'</li>');continue}
    if(/^>\s?/.test(l)){cerrarLista();out.push('<blockquote>'+inline(l.replace(/^>\s?/,''))+'</blockquote>');continue}
    if(l.trim()===''){cerrarLista();continue}
    cerrarLista();out.push('<p>'+inline(l)+'</p>');
  }
  flushTabla();cerrarLista();if(inCode)out.push('</code></pre>');
  return out.join('');
}
