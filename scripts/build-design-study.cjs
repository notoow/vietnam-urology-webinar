const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'src/design-study.json'),'utf8'));
const deck=JSON.parse(fs.readFileSync(path.join(root,'src/deck.json'),'utf8'));
const deckCount=deck.length;
const caseVideo=deck.find(s=>s.id==='case-01-video');
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const embedded=name=>'data:'+(name.endsWith('.woff2')?'font/woff2':name.endsWith('.png')?'image/png':'image/jpeg')+';base64,'+fs.readFileSync(path.join(root,'assets',name)).toString('base64');
const mediaUrl=name=>'assets/'+name+'?v='+crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets',name))).digest('hex').slice(0,12);
const box=o=>`left:${o.x/12.8}%;top:${o.y/12.8}cqw;width:${o.w/12.8}%;height:${o.h/12.8}cqw;`;
const slides=data.slides.map((s,i)=>`<article class="study-slide" id="${esc(s.id)}" aria-label="${esc(s.label)}"${i?' hidden':''}>`+s.items.map(o=>{
 if(o.kind==='image')return `<img class="item" src="${embedded(o.asset)}" alt="${esc(o.alt)}" style="${box(o)}object-fit:${o.fit}">`;
 if(o.role==='video-placeholder'&&caseVideo?.videoAsset){
  const url=mediaUrl(caseVideo.videoAsset);
  return `<video class="item" controls playsinline preload="none" aria-label="Case 1: ${esc(caseVideo.title)}" poster="${mediaUrl(caseVideo.posterAsset)}" style="${box(o)}object-fit:contain;background:#000"><source src="${url}" type="video/mp4"><a href="${url}">Open video</a></video>`;
 }
 if(o.kind==='rect')return `<div class="item${o.role?' video-placeholder':''}"${o.role?' aria-label="Operative video"':''} style="${box(o)}background:${o.color}"></div>`;
 return `<${o.size>=42?'h2':'p'} class="item study-text" style="${box(o)}font-size:${o.size/12.8}cqw;font-weight:${o.weight};color:${o.color}">${esc(o.text)}</${o.size>=42?'h2':'p'}>`;
}).join('')+'</article>').join('\n');
let html=fs.readFileSync(path.join(root,'src/design-study.template.html'),'utf8').replaceAll('__DECK_COUNT__',String(deckCount)).replace('__FONT__',embedded('PretendardVariable.woff2')).replace('__LOGO__',embedded('highst-logo.png')).replace('__SLIDES__',()=>slides).replace('__BUTTONS__',()=>data.slides.map((s,i)=>`<button type="button" data-slide="${i}" aria-pressed="${i===0}">${String(i+1).padStart(2,'0')} ${esc(s.label)}</button>`).join('')).replace('__NOTES__',()=>JSON.stringify(data.slides.map(s=>s.note)).replaceAll('<','\\u003c'));
html=html.replace(/\r\n?/g,'\n');
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+crypto.createHash('sha256').update(m[1]).digest('base64')+"'");
html=html.replace('__CSP__',`default-src 'none'; script-src ${hashes.join(' ')}; style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src data:; object-src 'none'; base-uri 'none'; form-action 'none'`);
if(/__(?:DECK_COUNT|FONT|LOGO|SLIDES|BUTTONS|NOTES|CSP)__/.test(html))throw Error('Unresolved study token');
fs.writeFileSync(path.join(root,'design-study.html'),html);
console.log('Built three-slide design study.');
