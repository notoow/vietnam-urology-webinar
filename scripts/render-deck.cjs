const fs=require('node:fs'),path=require('node:path');
const layoutDeck=require('./layout-deck.cjs');
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const embedded=new Map();
function asset(name){
 if(!embedded.has(name))embedded.set(name,'data:'+(name.endsWith('.png')?'image/png':'image/jpeg')+';base64,'+fs.readFileSync(path.join(__dirname,'../assets',name)).toString('base64'));
 return embedded.get(name);
}
const box=o=>'left:'+o.x/12.8+'%;top:'+o.y/12.8+'cqw;width:'+o.w/12.8+'%;height:'+o.h/12.8+'cqw;';
module.exports=function renderDeck(deck){
 return layoutDeck(deck).slides.map((s,i)=>'<article class="slide conference-slide '+(i===0?'current':'')+'" data-slide-id="'+esc(s.id)+'" data-title="'+esc(s.ko)+'" data-state="'+esc(s.state)+'">'+s.items.map(o=>{
  if(o.kind==='image')return '<img class="conference-item" src="'+asset(o.asset)+'" alt="'+esc(o.alt)+'" style="'+box(o)+'object-fit:'+o.fit+'">';
  if(o.kind==='rect')return '<div class="conference-item'+(o.role==='video-placeholder'?' deck-blank-media':'')+'"'+(o.role?' aria-label="'+esc(o.label||'Surgical video')+'"':'')+' style="'+box(o)+'background:'+o.color+'"></div>';
  if(o.kind==='table')return '<table class="conference-item conference-table" style="'+box(o)+'font-size:'+o.size/12.8+'cqw"><colgroup>'+o.widths.map(w=>'<col style="width:'+w/o.w*100+'%">').join('')+'</colgroup><tbody>'+o.values.map((row,r)=>'<tr'+(o.header&&r===0?' class="table-heading"':'')+'>'+row.map((v,c)=>'<'+(o.header&&r===0?'th':'td')+' style="height:'+o.h/o.values.length/12.8+'cqw"'+(!o.header&&c===0?' class="profile-label"':'')+'>'+esc(v)+'</'+(o.header&&r===0?'th':'td')+'>').join('')+'</tr>').join('')+'</tbody></table>';
  const tag=o.size>=42?'h2':'p';
  return '<'+tag+' class="conference-item conference-text" style="'+box(o)+'font-size:'+o.size/12.8+'cqw;font-weight:'+o.weight+';color:'+o.color+'">'+esc(o.text)+'</'+tag+'>';
 }).join('')+'</article>').join('\n');
};
