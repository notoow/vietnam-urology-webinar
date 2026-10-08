const deck=__DECK_DATA__;
const notes=deck.map(s=>s.note);
let current=0,activeView='design';
const slides=[...document.querySelectorAll('.slide')];
const outline=document.getElementById('outline-list'),select=document.getElementById('slide-select');
const sectionNames={Overview:'강의 개요',Preoperative:'수술 전',Intraoperative:'수술 중',Postoperative:'수술 후',Summary:'핵심 정리',Discussion:'질의응답'};
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
 document.getElementById('prev').disabled=current===0;document.getElementById('next').disabled=current===slides.length-1;renderSlideSources();
}
function renderSlideSources(){
 const root=document.getElementById('slide-sources'),coverage=document.getElementById('deck-coverage');root.replaceChildren();
 const app=window.PerioApp;if(!app){root.hidden=true;return;}
 const data=app.getData(),alive=data.steps.filter(s=>!s.deleted),mapped=new Set(deck.flatMap(s=>s.steps));
 const connected=alive.filter(s=>mapped.has(s.id)).length;
 coverage.textContent='수술주기 '+alive.length+'개 중 '+connected+'개 과정이 발표에 연결됨'+(connected<alive.length?' · 새 과정은 슬라이드 연결이 필요합니다.':'');
 root.hidden=!deck[current].steps.length;if(root.hidden)return;
 const h=document.createElement('h3');h.textContent='연결된 촬영 과정';root.append(h);
 for(const id of deck[current].steps){
  const step=alive.find(s=>s.id===id),row=document.createElement('div');row.className='slide-source';
  if(!step){const msg=document.createElement('p');msg.textContent='이 과정은 삭제되었거나 현재 기록에서 찾을 수 없습니다.';row.append(msg);root.append(row);continue;}
  const button=document.createElement('button');button.type='button';button.textContent=step.title+' ↗';button.onclick=()=>{switchView('perioperative');app.focusStep(id);};
  const media=document.createElement('small');media.textContent=(app.mediaLabels[step.mediaType]||'촬영 종류 미정')+(step.status==='reviewed'?' · 촬영 완료':'');row.append(button,media);
  const scenes=app.scenesOf(step);if(step.mediaType==='none'){const p=document.createElement('p');p.textContent='촬영 불필요';row.append(p);}
  else if(scenes.length)scenes.forEach((scene,i)=>{const p=document.createElement('p');p.textContent='씬 '+(i+1)+' · '+(scene.text||'촬영할 장면을 적어 주세요.');row.append(p);});
  else{const p=document.createElement('p');p.textContent='촬영할 장면을 추가해 주세요.';row.append(p);}
  root.append(row);
 }
}
window.SlideDeck={hasStep:id=>deck.some(s=>s.steps.includes(id)),openForStep(id){const i=deck.findIndex(s=>s.steps.includes(id));if(i<0)return;show(i);switchView('design');document.getElementById('speaker-notes').open=true;outline.querySelector('[aria-current="true"]')?.scrollIntoView({block:'nearest'});}};
window.addEventListener('perioperative:change',renderSlideSources);
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
['Overview and the HIGHST Approach','슬라이드 1–3 · 수술주기 전체 흐름과 5S',4],
['Preoperative Preparation','슬라이드 4–11 · 상담·검사·수술환경·재료·입실 준비',15],
['Intraoperative Practice','슬라이드 12–23 · 마취·드레이핑·절개·진피·노터치·MegaFill·보조 처치',27],
['Postoperative Course and Cases','슬라이드 24–29 · 회복·추적·합병증·대표 증례',12],
['Key Lessons','슬라이드 30 · 핵심 요점. 슬라이드 31 질의응답은 별도 세션',2]
];

function renderAgenda(){const zone=document.getElementById('timezone').value;const offset=zone==='ict'?-120:0;const format=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');document.getElementById('zone-heading').textContent=zone==='ict'?'베트남시간 ICT':'한국시간 KST';document.getElementById('event-body').innerHTML=eventProgram.map(r=>'<tr class="'+(r.gap?'gap-row':r.speaker?'speaker-row':'')+'"><td>'+format(r.start+offset)+'–'+format(r.end+offset)+'</td><td>'+r.title+'</td><td>'+r.detail+'</td></tr>').join('');let elapsed=0;document.getElementById('agenda-body').innerHTML=modules.map(m=>{const start=elapsed;elapsed+=m[2];return '<tr><td>'+start+'–'+elapsed+' min</td><td>'+m[0]+'<small>'+m[2]+'분</small></td><td>'+m[1]+'</td></tr>'}).join('')}
document.getElementById('timezone').onchange=()=>{renderAgenda();save()};
const groups=[
['발표 조건과 자료 공개 범위',[
['event','행사와 발표자 정보','공식 영문 행사명·병원명, 직함, 추가 진행 안내','Jinmo Koo / 베트남 MegaDerm 웨비나 / 2026-10-21 수요일 / 전체 15:00–17:30 KST, 발표 16:00–17:00 KST / 영어 발표 요청 / 영어↔베트남어 통역 / 50명 예정'],
['interpretation','통역 방식과 Q&A 시간은 확정되었나요?','동시·순차통역, 60분 내 통역 배분, Q&A 20분·30분 차이, 17:20–17:25 공백','통역 언어는 영어↔베트남어. 방식 및 Q&A 최종 운영 확인 필요.'],
['sharing','현장 발표와 배포본의 범위','수술 사진·영상 사용 동의, 현장 전용 노하우, 배포 제외 자료, 기존 PPT·로고 위치','']]],
['5S 복합수술의 정확한 정의',[
['five_s','S1~S5는 각각 무엇인가요?','한글명·영문명, 각 항목의 목적, 필수·선택 여부','5S 복합수술. 다섯 항목의 세부 정의는 확인 예정.'],
['pearls','하이스트의 가장 중요한 차별점 3~5개','구체적 행동 + 이유 + 피하려는 문제 + 실제 사례로 설명해 주세요','']]],
['환자 선택과 수술 전 준비',[
['selection','어떤 환자에게 시행하거나 피하나요?','초수술·재수술, 과거 시술, 기저 상태, 기대 조정, 검사·동의 기준',''],
['prep','수술 전날부터 입실까지 실제 준비 순서는?','검사, 사진·측정 방식, 피부 상태 확인, 마취 계획, 준비물·스태프 역할','']]],
['수술실 환경과 멸균·무균 관리',[
['room','수술실 환경을 설명할 자료는 무엇인가요?','실제 사진·설비, 공조·환기·구역 관리, 청소·출입 절차, 점검 기록','선생님 설명: 대학병원급 멸균 수술실. 실제 시설과 관리 자료 확인 예정.'],
['instruments','기구 세척·포장·멸균·보관은 어떻게 하나요?','기구별 재처리법, 장비와 제조사 조건, 모니터링·기록·부적합 대응, 일회용 구분',''],
['asepsis','환자 준비와 무균술의 원내 절차는?','피부 준비 제품·조건, 드레이핑, 손 위생·가운·장갑, 교체 시점과 오염 대응',''],
['material_handling','메가덤·메가필 개봉과 무균 취급의 실제 순서는?','정확한 제품 IFU, 보관·개봉 시점·전처리, 도구와 담당자, 오염 방지 포인트','']]],
['MegaDerm·MegaFill 사례 선택과 병용',[
['case_availability','공개 가능한 실제 사례는 어느 쪽인가요?','MegaDerm＋MegaFill 병용 사례가 있으면 우선 검토. 없으면 MegaFill 단독 사례도 가능. 사진·영상과 추적 자료 위치','자료 보유 여부 확인 예정. 대리점의 희망 사항이며 실제 사례는 아직 확인되지 않음.'],
['products','정확히 어떤 제품과 규격을 쓰나요?','제조사·모델·규격, 최신 사용설명서, 국내 및 행사 관련 제품 표기, 이해관계',''],
['combined','왜 함께 쓰며 어느 환자에서 선택하나요?','각 재료의 역할, 선택·제외 기준, 단독 사용과의 판단 차이',''],
['sequence','동일 세션의 실제 사용 순서와 세부 조건은?','각 단계·해부학적 층, 양·규격 결정, 준비 방법, 술기 영상과 연결',''],
['combined_pitfalls','병용에서 특히 주의하는 문제와 수정 기준은?','이상 소견, 확인 시점, 수술 계획 변경·중단 기준, 경험과 근거의 구분','']]],
['수술 단계별 노하우',[
['workflow','실제 수술을 처음부터 끝까지 설명해 주세요','선택한 접근, 박리·재료 적용·고정·봉합 등 실제 단계와 분기',''],
['technique','가장 실패하기 쉬운 단계와 하이스트의 해결법은?','손동작, 기구 선택, 보조자 역할, 확인할 해부학 구조, 수정 기준','']]],
['부작용·합병증·재수술 사례',[
['complications','실제 경험한 문제를 사례별로 알려주세요','문제명, 수술 후 발생 시점, 최초 징후, 판단·처치, 경과·추적 기간',''],
['revision','재수술 또는 프로토콜 변경으로 이어진 사례는?','개입을 결정한 기준, 실제 선택, 이후 결과, 지금은 달리 하는 점','']]],
['사후관리·결과·근거 자료',[
['aftercare','수술 직후부터 장기 추적까지 어떻게 관리하나요?','드레싱·내원·활동 안내, 경고 증상, 연락·재평가 체계, 환자 안내문',''],
['outcomes','어떤 결과 자료를 보여줄 수 있나요?','전체 증례 수·기간, 측정법·시점, 추적률, 합병증 정의와 분모, 환자 보고 결과',''],
['evidence','강의에서 인용할 논문과 제품 자료가 있나요?','원내 경험, 제품 IFU, 문헌·가이드라인을 구분할 원문과 버전',''],
['cases','우선 보여주고 싶은 대표 증례 3개는?','일반적 증례, 판단이 어려웠던 증례, 합병증·재수술에서 배운 증례','']]]
];

groups.splice(2,0,['진피 사양과 준비 과정',[
['graft_specs','원내 보유 두께와 사이즈','선생님이 알려주신 재료 사양','두께 3–5 mm / 5×6, 5×8, 5×10, 6×12 cm'],
['graft_types','수화형과 건조형의 준비 차이','선생님이 알려주신 타입별 차이','수화타입: 홈이 없어 직접 홈을 만듦. 건조타입: 구멍이 뚫려 있으며 수술 준비 시 수화시켜 부드럽게 만듦.'],
['photo_state','동종진피1·2는 각각 어떤 상태인가요?','건조형 원본, 수화 후, 직접 홈을 낸 후 등 촬영 상태와 제품','확인 예정'],
['hydration_details','건조형을 수화시키는 실제 조건은?','용액, 시간, 확인 방법, 원내 절차와 제품 IFU',''],
['opening_method','수화형의 홈을 어떻게 만드나요?','홈의 목적·형태·위치, 사용하는 도구, 실제 사진 또는 영상','']
]]);
const fields={};const qroot=document.getElementById('questionnaire');groups.forEach((g,i)=>{const d=document.createElement('details');d.className='qa-group';d.open=i===2;const s=document.createElement('summary');s.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span>'+g[0];d.appendChild(s);const grid=document.createElement('div');grid.className='qa-fields';g[1].forEach(f=>{const label=document.createElement('label');label.htmlFor=f[0];label.append(document.createTextNode(f[1]));const hint=document.createElement('span');hint.textContent=f[2];const input=document.createElement('textarea');input.id=f[0];input.value=f[3];input.placeholder='메모하거나 대화로 말씀해 주세요.';input.addEventListener('input',save);fields[f[0]]=input;label.append(hint,input);grid.appendChild(label)});d.appendChild(grid);qroot.appendChild(d)});
function collect(){return{version:3,updatedAt:new Date().toISOString(),design:'HIGHST original logo / white and gold / Pretendard',timezone:document.getElementById('timezone').value,eventDate:'2026-10-21',presentationMinutes:60,webinarMinutes:150,answers:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]))}}
function save(){try{localStorage.setItem('highst-vietnam-review-v1',JSON.stringify(collect()));document.getElementById('save-state').textContent='현재 브라우저에 저장됨 · 파일과 채팅에는 자동 반영되지 않습니다.'}catch(e){document.getElementById('save-state').textContent='브라우저 저장이 제한됩니다. 답변 내보내기로 보관해 주세요.'}}
try{const saved=JSON.parse(localStorage.getItem('highst-vietnam-review-v1')||'null');if(saved&&[1,2,3].includes(saved.version)){Object.entries(saved.answers||{}).forEach(([k,v])=>{if(fields[k]&&typeof v==='string'&&!(k==='event'&&v==='Jinmo Koo / 2시간 30분 / 영어 슬라이드 방향'))fields[k].value=v});if(['kst','ict'].includes(saved.timezone))document.getElementById('timezone').value=saved.timezone}}catch(e){}
document.getElementById('export').onclick=()=>{const data=collect();data.questions=Object.fromEntries(groups.flatMap(g=>g[1].map(f=>[f[0],f[1]])));const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='highst-webinar-answers.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);const toast=document.getElementById('toast');toast.textContent='답변 파일을 다운로드했습니다.';toast.style.display='block';setTimeout(()=>toast.style.display='none',3000)};
show(0);renderAgenda();switchView(location.hash.slice(1).split('&')[0]||'design',false);

document.getElementById('periop-open').onclick=()=>switchView('perioperative');
