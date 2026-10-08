const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let html=read('src/index.template.html');
const parts={REUSED_DATA:read('src/base.js'),PERI_CSS:read('src/perioperative.css'),PERI_HTML:read('src/perioperative.html'),PERI_JS:read('src/perioperative.js'),PERI_CLOUD:read('node_modules/@supabase/supabase-js/dist/umd/supabase.js')+'\n'+read('src/perioperative-cloud.js')};
for(const [token,value] of Object.entries(parts))html=html.replaceAll('__'+token+'__',()=>value);
for(const [token,name,mime] of [['LOGO','highst-logo.png','image/png'],['DERMIS1','dermis-01.png','image/png'],['DERMIS2','dermis-02.png','image/png'],['PACKAGING','graft-packaging.png','image/png'],['FONT','PretendardVariable.woff2','font/woff2']])html=html.replaceAll('__'+token+'__','data:'+mime+';base64,'+fs.readFileSync(path.join(root,'assets',name)).toString('base64'));
if(/__(?:REUSED_DATA|PERI_\w+|LOGO|DERMIS[12]|PACKAGING|FONT)__/.test(html))throw Error('Unresolved build token');
fs.writeFileSync(path.join(root,'highst-review.html'),html);
console.log('Built presentation and shared filming plan.');
