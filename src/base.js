const deck=__DECK_DATA__;
const notes=deck.map(s=>s.note);
let current=0,activeView='design';
const slides=[...document.querySelectorAll('.slide')];
const outline=document.getElementById('outline-list'),select=document.getElementById('slide-select');
const sectionNames={Overview:'표지',Preparation:'검사·수술 준비','Operative Videos':'수술영상 · 각 10분',Discussion:'질의응답'};
let lastSection='';
slides.forEach((s,i)=>{
 if(deck[i].section!==lastSection){lastSection=deck[i].section;const h=document.createElement('p');h.className='outline-group';h.textContent=sectionNames[lastSection];outline.append(h);}
 const b=document.createElement('button');const n=document.createElement('span'),title=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');title.textContent=s.dataset.title;b.append(n,title);b.onclick=()=>show(i);outline.append(b);
 const opt=document.createElement('option');opt.value=i;opt.textContent=String(i+1).padStart(2,'0')+' / '+s.dataset.title;select.append(opt);
});
function show(i){
 current=Math.max(0,Math.min(slides.length-1,Number(i)));slides.forEach((s,j)=>s.classList.toggle('current',j===current));
 [...outline.querySelectorAll('button')].forEach((b,j)=>b.setAttribute('aria-current',j===current));select.value=current;
 document.getElementById('slide-count').textContent=String(current+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
 document.getElementById('slide-status').textContent=slides[current].dataset.state;document.getElementById('slide-note').textContent=notes[current];
 document.getElementById('prev').disabled=current===0;document.getElementById('next').disabled=current===slides.length-1;
}
select.onchange=e=>show(e.target.value);document.getElementById('prev').onclick=()=>show(current-1);document.getElementById('next').onclick=()=>show(current+1);
function switchView(view,writeHash=true){if(!['design','perioperative','program','interview','materials'].includes(view))view='design';activeView=view;document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==view);document.querySelectorAll('.main-nav button').forEach(b=>b.setAttribute('aria-selected',b.dataset.view===view));if(writeHash)history.replaceState(null,'','#'+view);window.scrollTo(0,0)}
document.querySelectorAll('.main-nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));document.querySelector('.brand-link').onclick=e=>{e.preventDefault();switchView('design')};window.addEventListener('hashchange',()=>switchView(location.hash.slice(1).split('&')[0],false));
const memo=document.getElementById('speaker-notes');document.getElementById('notes-toggle').onclick=()=>memo.open=!memo.open;
let previousScroll=0;document.getElementById('present').onclick=()=>{previousScroll=window.scrollY;document.body.classList.add('presenting');document.getElementById('exit-present').focus()};function exitPresentation(){document.body.classList.remove('presenting');window.scrollTo(0,previousScroll);document.getElementById('present').focus()}document.getElementById('exit-present').onclick=exitPresentation;
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='Escape'&&document.body.classList.contains('presenting'))exitPresentation();if(activeView==='design'&&document.body.classList.contains('presenting')){if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();show(current+1)}if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}}});
const eventProgram=[
{start:900,end:915,title:'Opening',detail:'오프닝'},
{start:915,end:955,title:'Vietnamese Physician Session',detail:'베트남 남성의학과 회장 또는 부회장 진행 예정'},
{start:955,end:960,title:'Short Break',detail:'휴식'},
{start:960,end:1020,title:'Jinmo Koo Presentation',detail:'구진모 원장님 영어 발표 · 요청된 60분 세션',speaker:true},
{start:1020,end:1040,title:'Q&A',detail:'프로그램상 20분 · 요청 문구의 30분과 차이 있음'},
{start:1040,end:1045,title:'Unspecified',detail:'공유받은 프로그램에 내용이 없는 5분 · 확인 필요',gap:true},
{start:1045,end:1050,title:'Closing',detail:'클로징'}
];
const modules=[
['Blood and Urine Testing','피검사·소변검사 항목 설명',null],
['Shaving and Draping','쉐이빙·드랩',null],
['Circumcision-line Incision','포경선 절개 수술영상',10],
['Pubic Incision','치골절개 수술영상',10],
['Revision Surgery','재수술 영상',10]
];

function renderAgenda(){const zone=document.getElementById('timezone').value;const offset=zone==='ict'?-120:0;const format=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');document.getElementById('zone-heading').textContent=zone==='ict'?'베트남시간 ICT':'한국시간 KST';document.getElementById('event-body').innerHTML=eventProgram.map(r=>'<tr class="'+(r.gap?'gap-row':r.speaker?'speaker-row':'')+'"><td>'+format(r.start+offset)+'–'+format(r.end+offset)+'</td><td>'+r.title+'</td><td>'+r.detail+'</td></tr>').join('');document.getElementById('agenda-body').innerHTML=modules.map((m,i)=>'<tr><td>'+String(i+1).padStart(2,'0')+'</td><td>'+m[0]+'<small>'+(m[2]===null?'시간 미정':m[2]+'분')+'</small></td><td>'+m[1]+'</td></tr>').join('')}
document.getElementById('timezone').onchange=()=>{renderAgenda();save()};
const groups=[
['검사 목록',[
['tests','피검사·소변검사 정확한 항목','검사지의 항목명을 그대로 입력해 주세요.','간수치, 당수치, 염증수치, 성병 관련 항목. 정확한 검사명 목록 확인 필요.']]],
['수술영상',[
['video_circumcision','포경선 절개 영상 · 10분','사용할 영상 파일명 또는 시놀로지 공유 링크',''],
['video_pubic','치골절개 영상 · 10분','사용할 영상 파일명 또는 시놀로지 공유 링크',''],
['video_revision','재수술 영상 · 10분','사용할 영상 파일명 또는 시놀로지 공유 링크','']]],
['발표 운영',[
['interpretation','통역 방식과 시간 배분','영상 30분 외의 설명·통역 시간을 확인합니다.','영어↔베트남어 통역. 방식 확인 필요.']]]
];
const fields={};const qroot=document.getElementById('questionnaire');groups.forEach((g,i)=>{const d=document.createElement('details');d.className='qa-group';d.open=true;const s=document.createElement('summary');s.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span>'+g[0];d.appendChild(s);const grid=document.createElement('div');grid.className='qa-fields';g[1].forEach(f=>{const label=document.createElement('label');label.htmlFor=f[0];label.append(document.createTextNode(f[1]));const hint=document.createElement('span');hint.textContent=f[2];const input=document.createElement('textarea');input.id=f[0];input.value=f[3];input.placeholder='메모하거나 대화로 말씀해 주세요.';input.addEventListener('input',save);fields[f[0]]=input;label.append(hint,input);grid.appendChild(label)});d.appendChild(grid);qroot.appendChild(d)});
function collect(){return{version:3,updatedAt:new Date().toISOString(),design:'HIGHST original logo / white and gold / Pretendard',timezone:document.getElementById('timezone').value,eventDate:'2026-10-21',presentationMinutes:60,webinarMinutes:150,answers:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]))}}
function save(){try{localStorage.setItem('highst-vietnam-review-v1',JSON.stringify(collect()));document.getElementById('save-state').textContent='현재 브라우저에 저장됨 · 파일과 채팅에는 자동 반영되지 않습니다.'}catch(e){document.getElementById('save-state').textContent='브라우저 저장이 제한됩니다. 답변 내보내기로 보관해 주세요.'}}
try{const saved=JSON.parse(localStorage.getItem('highst-vietnam-review-v1')||'null');if(saved&&[1,2,3].includes(saved.version)){Object.entries(saved.answers||{}).forEach(([k,v])=>{if(fields[k]&&typeof v==='string'&&!(k==='event'&&v==='Jinmo Koo / 2시간 30분 / 영어 슬라이드 방향'))fields[k].value=v});if(['kst','ict'].includes(saved.timezone))document.getElementById('timezone').value=saved.timezone}}catch(e){}
document.getElementById('export').onclick=()=>{const data=collect();data.questions=Object.fromEntries(groups.flatMap(g=>g[1].map(f=>[f[0],f[1]])));const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='highst-webinar-answers.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);const toast=document.getElementById('toast');toast.textContent='답변 파일을 다운로드했습니다.';toast.style.display='block';setTimeout(()=>toast.style.display='none',3000)};
show(0);renderAgenda();switchView(location.hash.slice(1).split('&')[0]||'design',false);

document.getElementById('periop-open').onclick=()=>switchView('perioperative');
