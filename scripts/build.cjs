const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let html=read('src/index.template.html');
const deck=JSON.parse(read('src/deck.json'));
const parts={DECK_SLIDES:require('./render-deck.cjs')(deck),DECK_CSS:read('src/deck.css'),REUSED_DATA:read('src/base.js').replace('__DECK_DATA__',()=>JSON.stringify(deck).replaceAll('<','\\u003c')),PERI_CSS:read('src/perioperative.css'),PERI_HTML:read('src/perioperative.html'),PERI_JS:read('src/perioperative.js'),PERI_CLOUD:read('node_modules/@supabase/supabase-js/dist/umd/supabase.js')+'\n'+read('src/perioperative-cloud.js')};
for(const [token,value] of Object.entries(parts))html=html.replaceAll('__'+token+'__',()=>value);
const source=JSON.parse(read('src/filming-source.json'));
let sourceLink='<button class="btn" type="button" disabled>공유 링크 준비 중</button>';
if(source.url){
 const url=new URL(source.url);
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Filming source must be an HTTPS share URL without credentials');
 const href=url.href.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 sourceLink='<a class="btn" href="'+href+'" target="_blank" rel="noopener noreferrer">촬영원본 열기 ↗</a>';
}
html=html.replace('__SOURCE_LINK__',()=>sourceLink);
for(const [token,name,mime] of [['LOGO','highst-logo.png','image/png'],['DERMIS1','dermis-01.png','image/png'],['DERMIS2','dermis-02.png','image/png'],['PACKAGING','graft-packaging.png','image/png'],['FONT','PretendardVariable.woff2','font/woff2']])html=html.replaceAll('__'+token+'__','data:'+mime+';base64,'+fs.readFileSync(path.join(root,'assets',name)).toString('base64'));
if(/__(?:REUSED_DATA|DECK_\w+|PERI_\w+|LOGO|DERMIS[12]|PACKAGING|FONT)__/.test(html))throw Error('Unresolved build token');
const crypto=require('node:crypto');
html=html.replace(/\r\n?/g,'\n');
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+crypto.createHash('sha256').update(m[1]).digest('base64')+"'");
const csp="default-src 'none'; script-src "+hashes.join(' ')+"; style-src 'unsafe-inline'; img-src 'self' data: https://notoow.github.io/vietnam-urology-webinar/assets/; font-src data:; connect-src https://wqymwtvktdhofzegjawn.supabase.co wss://wqymwtvktdhofzegjawn.supabase.co; object-src 'none'; base-uri 'none'; form-action 'none'";
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+csp+'"><meta name="referrer" content="no-referrer">');
fs.writeFileSync(path.join(root,'highst-review.html'),html);
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('Built presentation and shared filming plan.');
