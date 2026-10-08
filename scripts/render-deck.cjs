const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
module.exports=function renderDeck(deck){
 return deck.map((s,i)=>{
  const page=String(i+1).padStart(2,'0');
  let body;
  if(s.type==='cover')body='<div class="cover-left"><img class="slide-logo" src="__LOGO__" alt="HIGHST"><div class="eyebrow">Vietnam Urology Webinar</div><h2>'+esc(s.title).replaceAll('\n','<br>')+'</h2><p class="subtitle">'+esc(s.subtitle)+'</p><div class="byline"><strong>Jinmo Koo</strong><span>21 October 2026</span></div></div><div class="cover-visual"><img src="__DERMIS1__" alt="Dermal graft supplied by HIGHST"></div>';
  else{
   body='<div class="eyebrow">'+esc(s.section)+(s.knowhow?' / HIGHST Clinical Pearl':'')+'</div><h2>'+esc(s.title)+'</h2>';
   if(s.type==='spec')body+='<div class="spec-grid"><div class="spec-values"><div><div class="metric-label">Thickness</div><div class="big-metric">3–5<small>mm</small></div></div><div><div class="metric-label">Available sizes at HIGHST</div><div class="sizes">'+['5 × 6','5 × 8','5 × 10','6 × 12'].map(v=>'<div class="size">'+v+'<small>cm</small></div>').join('')+'</div></div></div><div class="graft-photo"><img src="__DERMIS2__" alt="HIGHST dermal graft photograph"></div></div>';
   else if(s.type==='image')body+='<div class="packaging-frame"><img src="__PACKAGING__" alt="Packaged dermal grafts at HIGHST"></div>';
   else if(s.type==='tests')body+='<div class="deck-test-list">'+s.rows.map(r=>'<p>'+esc(r.head)+'</p>').join('')+'</div>';
   else if(s.type==='video')body+='<div class="deck-video"><p class="deck-video-label">OPERATIVE VIDEO '+esc(s.videoNumber)+'</p><p class="deck-duration">'+esc(s.minutes)+'<span>minutes</span></p></div>';
   else if(s.type==='closing')body+='<p class="deck-closing">Questions &amp; Answers</p>';
   else body+='<div class="deck-content deck-'+esc(s.type)+'">'+s.rows.map((r,j)=>'<div class="deck-point"><span class="deck-number">'+String(j+1).padStart(2,'0')+'</span><div><h3>'+esc(r.head)+'</h3><p>'+esc(r.body)+'</p></div></div>').join('')+'</div>';
   if(s.caption)body+='<p class="strip-note">'+esc(s.caption)+'</p>';
  }
  return '<article class="slide '+(s.type==='cover'?'cover ':'')+(i===0?'current':'')+'" data-title="'+esc(s.ko)+'" data-state="'+esc(s.state)+'">'+body+'<div class="foot"><span>'+esc(s.foot||'Jinmo Koo · HIGHST Urology')+'</span><span>'+page+'</span></div></article>';
 }).join('\n');
};
