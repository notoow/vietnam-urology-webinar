(()=>{
'use strict';
const $=id=>document.getElementById(id), clone=x=>JSON.parse(JSON.stringify(x)), key='highst-perioperative-v1';
const labels={draft:'촬영 예정',working:'확인 중',reviewed:'촬영 완료'};
const fieldDefs=[['evidence','촬영할 장면','무엇을 찍을지, 화면에 어떤 부분이 보여야 하는지만 적어 주세요.']];
const seedPhases=[{id:'pre',name:'수술 전 · Preoperative',order:1},{id:'intra',name:'수술 중 · Intraoperative',order:2},{id:'post',name:'수술 후 · Postoperative',order:3}];
const seedSteps=[
['pre','환자 평가·수술 계획','선택 기준, 상담 기록, 실제 수술 범위와 5S 구성을 정리합니다.'],
['pre','설명·동의·수술 전 기록','설명 항목, 동의 확인, 사진·측정·기록의 실제 과정을 정리합니다.'],
['pre','사전 평가·복용약 확인','실제 평가 항목, 복용약 확인과 담당자의 판단·연락 흐름을 정리합니다.'],
['pre','수술 전 환자 안내','수술 전 안내 사항과 환자에게 전달·확인하는 방법을 정리합니다.'],
['pre','수술실 환경 준비','환경 관리, 구역별 준비와 사용 전 점검 과정을 정리합니다.'],
['pre','기구 세척·포장·멸균','원내 재처리 순서, 장비 조건, 표시·기록·추적과 준비 완료 확인을 정리합니다.'],
['pre','진피·MegaFill 등 재료 준비','원내 보유 진피 3–5 mm / 5×6, 5×8, 5×10, 6×12 cm. 수화형은 직접 홈을 만들고, 건조형은 미리 구멍이 있어 수술 준비 시 수화합니다. 세부 조건은 수술팀이 작성합니다.'],
['pre','수술팀 브리핑·입실 확인','당일 계획, 역할, 환자·수술·재료 확인과 입실 흐름을 정리합니다.'],
['intra','마취·체위·모니터링 준비','실제 준비 순서, 각 담당자와 관찰·확인 내용을 정리합니다.'],
['intra','피부 준비·포장·무균 영역','피부 준비와 수술포 사용, 무균 영역 설정의 실제 과정을 정리합니다.'],
['intra','절개·박리와 수술 단계','원장님 실제 술기를 세부 과정으로 나누고 보조 역할을 정리합니다.'],
['intra','진피 가공·삽입·고정','제품 선택부터 가공·전달·삽입·고정까지 실제 술기를 정리합니다.'],
['intra','MegaDerm·MegaFill 병용 또는 단독','시행하는 경우와 순서, 재료 준비, 팀원 역할을 실제 사례 기준으로 정리합니다.'],
['intra','지혈·봉합·드레싱·종료 확인','수술 종료 단계와 최종 확인, 기록, 재료·기구 확인을 정리합니다.'],
['intra','수술 중 돌발 상황·인계','실제로 경험한 문제의 보고·판단·대응과 회복 담당자 인계를 정리합니다.'],
['post','회복 관찰·퇴실 판단','회복 시 관찰 항목·간격·담당자·보고와 퇴실 판단 과정을 정리합니다.'],
['post','퇴실 안내·환자 교육','드레싱·복약·활동·연락 안내 등 실제 교육 내용을 정리합니다.'],
['post','귀가 후 연락·정기 추적','연락과 내원 시점, 환자 상태 확인·측정·기록 방법을 정리합니다.'],
['post','부작용 보고·재평가·처치','최초 연락부터 원장 보고, 재평가·처치 결정, 경과 기록을 정리합니다.'],
['post','결과 기록·팀 회고','추적 결과, 개선할 과정과 다음 수술팀 회의의 결정 사항을 정리합니다.']];
const initial={version:1,phases:seedPhases,steps:seedSteps.map((s,i)=>({id:'step-'+String(i+1).padStart(2,'0'),phaseId:s[0],title:s[1],description:s[2],order:i+1,status:'draft',fields:{},na:[],revision:1,deleted:false,history:[]}))};
let data=clone(initial), phase='all', editing=null, phaseEditing=null, dirty=false, latestDeleted=null, adapter=null, busy=false;
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(valid(saved))data=saved;}catch{}
function valid(d){return d&&d.version===1&&Array.isArray(d.phases)&&d.phases.length>0&&d.phases.length<=100&&Array.isArray(d.steps)&&d.steps.length<=2000&&new Set(d.phases.map(p=>p.id)).size===d.phases.length&&new Set(d.steps.map(s=>s.id)).size===d.steps.length&&d.phases.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()&&Number.isFinite(p.order))&&d.steps.every(s=>typeof s.id==='string'&&typeof s.title==='string'&&typeof s.description==='string'&&d.phases.some(p=>p.id===s.phaseId)&&labels[s.status]&&Number.isFinite(s.order)&&s.fields&&typeof s.fields==='object'&&!Array.isArray(s.fields)&&Object.values(s.fields).every(v=>typeof v==='string')&&Array.isArray(s.na)&&s.na.every(v=>typeof v==='string')&&Number.isInteger(s.revision));}
function persist(){if(adapter)return;try{localStorage.setItem(key,JSON.stringify(data));}catch{connection('저장 공간 부족','입력 내용이 브라우저에 저장되지 않았습니다. 기록 내보내기로 보관해 주세요.',false);}}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function button(text,cls,fn){const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;}
function visibleSteps(){return data.steps.filter(s=>!s.deleted);}
function completed(s){return fieldDefs.filter(f=>(s.fields[f[0]]||'').trim()).length;}
function connection(title,detail,live){const node=$('peri-connection');node.classList.toggle('peri-live',!!live);node.replaceChildren(el('b','',title),el('small','',detail));}
function render(){
 const alive=visibleSteps(),total=alive.length,filled=alive.reduce((n,s)=>n+completed(s),0);
 $('peri-total').textContent=total;$('peri-progress').replaceChildren(document.createTextNode(filled+' '),el('small','','/ '+total*fieldDefs.length+' 항목'));$('peri-reviewed').replaceChildren(document.createTextNode(alive.filter(s=>s.status==='reviewed').length+' '),el('small','','/ '+total+' 과정'));
 const nav=$('peri-phase-nav'),mobile=$('peri-mobile-phase');nav.replaceChildren();mobile.replaceChildren();
 [['all','전체 과정'],...data.phases.slice().sort((a,b)=>a.order-b.order).map(p=>[p.id,p.name])].forEach(([id,name])=>{const b=button(name,'phase-link'+(phase===id?' active':''),()=>{phase=id;render();});b.appendChild(el('small','',(id==='all'?total:alive.filter(s=>s.phaseId===id).length)+'개 과정'));nav.appendChild(b);const o=el('option','',name);o.value=id;mobile.appendChild(o);});mobile.value=phase;
 const term=$('peri-search').value.trim().toLowerCase(),state=$('peri-filter').value,board=$('peri-board');board.replaceChildren();
 let matches=0;data.phases.slice().sort((a,b)=>a.order-b.order).filter(p=>phase==='all'||phase===p.id).forEach(p=>{
 const rows=alive.filter(s=>s.phaseId===p.id).filter(s=>(state==='all'||(state==='incomplete'?completed(s)<fieldDefs.length:s.status===state))&&(!term||[s.title,s.description,...Object.values(s.fields)].join(' ').toLowerCase().includes(term))).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 if((term||state!=='all')&&!rows.length)return;const section=el('section','peri-section'),head=el('div','peri-section-head'),h=el('h2','',p.name);h.appendChild(el('small','',rows.length+'개 과정'));head.append(h,button('구간 이름 변경','peri-tiny',()=>openPhase(p.id)));const cards=el('div','peri-cards');
 rows.forEach(s=>{matches++;const card=el('article','peri-card'),top=el('div','peri-card-top'),status=el('span','peri-status',labels[s.status]);status.dataset.state=s.status;top.append(el('span','','PROCESS '+String(alive.slice().sort((a,b)=>a.order-b.order).findIndex(x=>x.id===s.id)+1).padStart(2,'0')),status);const meta=el('div','peri-card-meta');meta.append(el('span','',s.fields.evidence?'촬영 메모 있음':'촬영 메모를 적어 주세요.'));card.append(top,el('h3','',s.title),el('p','',s.fields.evidence||''),meta,button('촬영 메모·이름 수정','peri-edit',()=>openStep(s.id)));const done=button(s.status==='reviewed'?'✓ 촬영 완료':'촬영 완료 표시','peri-done',async()=>{try{const next=clone(s);next.status=s.status==='reviewed'?'draft':'reviewed';await writeStep(next,s.revision);render();}catch(e){connection('저장하지 못했습니다',e.message,false);}});card.appendChild(done);cards.appendChild(card);});
 if(!rows.length)cards.appendChild(button('＋ 이 구간에 과정 추가','btn',()=>openStep(null,p.id)));section.append(head,cards);board.appendChild(section);
 });if(!matches&&(term||state!=='all'))board.appendChild(el('div','peri-empty','조건에 맞는 과정이 없습니다. 검색어나 작성 상태를 바꿔 보세요.'));
 const deleted=data.steps.filter(s=>s.deleted).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));latestDeleted=deleted[0]||null;$('peri-undo').hidden=!latestDeleted;if(latestDeleted)$('peri-undo-text').textContent='삭제한 과정: '+latestDeleted.title;
 }
 function options(select,value){select.replaceChildren();data.phases.slice().sort((a,b)=>a.order-b.order).forEach(p=>{const o=el('option','',p.name);o.value=p.id;select.appendChild(o);});select.value=value;}
 function openStep(id,phaseId){const s=data.steps.find(x=>x.id===id);editing=s?clone(s):{id:crypto.randomUUID(),phaseId:phaseId||(phase!=='all'?phase:data.phases[0].id),title:'',description:'',order:Math.max(0,...data.steps.map(x=>x.order))+1,status:'draft',fields:{},na:[],revision:0,history:[],deleted:false};dirty=false;$('peri-title').value=editing.title;options($('peri-phase'),editing.phaseId);$('peri-state').value=editing.status;$('peri-description').value=editing.description;$('peri-form-status').textContent='';$('peri-conflict').hidden=true;$('peri-dialog-heading').textContent=s?'촬영할 장면':'촬영 과정 추가';$('peri-delete').hidden=!s;$('peri-up').hidden=!s;$('peri-down').hidden=!s;
 const fields=$('peri-fields');fields.replaceChildren();fieldDefs.forEach(([id,title,hint])=>{const label=el('label','peri-field'+(id==='procedure'?' peri-wide':''),title),help=el('span','',hint),input=el('textarea');input.id='peri-field-'+id;input.value=editing.fields[id]||'';input.maxLength=20000;const na=el('span','peri-na'),check=el('input');check.type='checkbox';check.checked=editing.na.includes(id);check.id='peri-na-'+id;na.append(check,document.createTextNode('해당 없음 — 위 칸에 사유 기록'));label.append(help,input,na);fields.appendChild(label);});
 $('peri-history').textContent=editing.updatedAt?'마지막 저장: '+new Date(editing.updatedAt).toLocaleString('ko-KR')+' · 버전 '+editing.revision:'아직 저장하지 않은 새 과정입니다.';$('peri-dialog').showModal();
 }
 function formValue(){const s=clone(editing);s.title=$('peri-title').value.trim();s.phaseId=$('peri-phase').value;s.status=$('peri-state').value;s.description=$('peri-description').value.trim();s.fields={...s.fields,...Object.fromEntries(fieldDefs.map(([id])=>[id,$('peri-field-'+id).value.trim()]))};s.na=(s.na||[]).filter(id=>!fieldDefs.some(f=>f[0]===id));return s;}
 function close(){if(dirty){$('peri-form-status').textContent='저장하지 않은 변경이 있습니다. 「기록 저장」을 누르거나 한 번 더 닫으면 변경을 버립니다.';dirty=false;return;}$('peri-dialog').close();editing=null;}
 async function writeStep(s,expected){if(adapter){const row=await adapter.saveStep(s,expected);const index=data.steps.findIndex(x=>x.id===row.id);if(index<0)data.steps.push(row);else data.steps[index]=row;return row;}
 const latest=data.steps.find(x=>x.id===s.id);if(latest&&latest.revision!==expected)throw new Error('다른 창에서 이 과정을 변경했습니다. 현재 입력을 복사해 보관하고 최신 과정을 다시 열어 비교해 주세요.');const now=new Date().toISOString();s.revision=expected+1;s.updatedAt=now;s.history=[...(latest?.history||[]).slice(-19),{at:now,title:latest?.title||'새 과정',revision:expected}];if(latest)data.steps[data.steps.indexOf(latest)]=s;else data.steps.push(s);persist();return s;}
 async function guarded(fn){if(busy)return;busy=true;$('peri-save').disabled=true;try{await fn();}catch(e){$('peri-form-status').textContent=e.message||'저장하지 못했습니다. 연결 상태를 확인해 주세요.';}finally{busy=false;$('peri-save').disabled=false;}}
 $('peri-form').onsubmit=e=>{e.preventDefault();guarded(async()=>{const s=formValue();if(!s.title)throw new Error('과정 이름을 입력해 주세요.');for(const id of s.na)if(!s.fields[id])throw new Error('해당 없음으로 표시한 항목에는 사유를 적어 주세요.');await writeStep(s,editing.revision);dirty=false;$('peri-dialog').close();editing=null;render();});};
 $('peri-form').addEventListener('input',()=>{dirty=true;});$('peri-form').addEventListener('change',()=>{dirty=true;});['peri-close','peri-cancel'].forEach(id=>$(id).onclick=close);$('peri-dialog').addEventListener('cancel',e=>{e.preventDefault();close();});
 $('peri-delete').onclick=()=>guarded(async()=>{const s=clone(editing);s.deleted=true;await writeStep(s,editing.revision);dirty=false;$('peri-dialog').close();editing=null;render();});
 async function move(delta){await guarded(async()=>{if(dirty)throw new Error('입력 중인 내용을 먼저 저장한 뒤 순서를 바꿔 주세요.');const peers=visibleSteps().filter(s=>s.phaseId===editing.phaseId&&s.id!==editing.id).sort((a,b)=>a.order-b.order);const before=peers.filter(s=>s.order<editing.order),after=peers.filter(s=>s.order>=editing.order);if(delta<0&&!before.length||delta>0&&!after.length)return;const s=clone(editing);s.order=delta<0?(before.length===1?before[0].order-1:(before[before.length-2].order+before[before.length-1].order)/2):(after.length===1?after[0].order+1:(after[0].order+after[1].order)/2);editing=clone(await writeStep(s,s.revision));render();$('peri-history').textContent='순서를 저장했습니다.';});}
 $('peri-up').onclick=()=>move(-1);$('peri-down').onclick=()=>move(1);
 $('peri-restore').onclick=async()=>{if(!latestDeleted)return;try{const s=clone(latestDeleted);s.deleted=false;await writeStep(s,s.revision);render();}catch(e){connection('복원하지 못했습니다',e.message,false);}};
 function openPhase(id){phaseEditing=data.phases.find(p=>p.id===id)||null;$('peri-phase-name').value=phaseEditing?.name||'';$('peri-phase-status').textContent='';$('peri-phase-delete').hidden=!phaseEditing;$('peri-phase-dialog').showModal();}
 $('peri-phase-form').onsubmit=async e=>{e.preventDefault();const name=$('peri-phase-name').value.trim();if(!name)return;try{let p={...(phaseEditing||{id:crypto.randomUUID(),order:Math.max(...data.phases.map(x=>x.order))+1}),name};if(adapter)p=await adapter.savePhase(p,phaseEditing);const i=data.phases.findIndex(x=>x.id===p.id);if(i<0)data.phases.push(p);else data.phases[i]=p;persist();render();$('peri-phase-dialog').close();}catch(e){$('peri-phase-status').textContent=e.message;}};
 $('peri-phase-delete').onclick=async()=>{if(data.phases.length<=1){$('peri-phase-status').textContent='구간은 하나 이상 있어야 합니다.';return;}if(data.steps.some(s=>s.phaseId===phaseEditing.id)){ $('peri-phase-status').textContent='과정이 있는 구간은 삭제할 수 없습니다. 삭제한 과정까지 다른 구간으로 옮긴 뒤 진행해 주세요.';return;}try{if(adapter)await adapter.deletePhase(phaseEditing);data.phases=data.phases.filter(p=>p.id!==phaseEditing.id);if(phase===phaseEditing.id)phase='all';persist();render();$('peri-phase-dialog').close();}catch(e){$('peri-phase-status').textContent=e.message;}};
 $('peri-phase-cancel').onclick=()=>$('peri-phase-dialog').close();$('peri-add-phase').onclick=()=>openPhase(null);$('peri-add').onclick=()=>openStep(null);$('peri-back').onclick=()=>switchView('design');$('peri-search').oninput=render;$('peri-filter').onchange=render;$('peri-mobile-phase').onchange=e=>{phase=e.target.value;render();};
 function download(d,name){const a=el('a'),url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 $('peri-export').onclick=()=>download({...data,exportedAt:new Date().toISOString()},'highst-perioperative.json');$('peri-import').onclick=()=>{if(adapter){connection('공동 문서 일괄 덮어쓰기 제한','기록을 가져오려면 담당 관리자에게 병합을 요청하세요. 현재 공동 기록은 유지됩니다.',false);return;}$('peri-file').click();};
 $('peri-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>6000000)throw new Error('파일 크기가 너무 큽니다.');const next=JSON.parse(await f.text());if(!valid(next))throw new Error('수술주기 기록 파일 형식이 맞지 않습니다.');download(data,'highst-perioperative-before-import.json');data=clone(next);phase='all';persist();render();connection('기록을 가져왔습니다','기존 기록은 백업 파일로 내보냈습니다. 이 기록은 현재 브라우저에 저장됩니다.',false);}catch(err){connection('가져오지 못했습니다',err.message,false);}e.target.value='';};
 window.addEventListener('storage',e=>{if(adapter||e.key!==key)return;try{const next=JSON.parse(e.newValue);if(!valid(next))return;replace(next);}catch{}});
 function replace(next){if(!valid(next))throw new Error('공동 기록 형식이 올바르지 않습니다.');if(editing){const changed=next.steps.find(s=>s.id===editing.id);if(changed&&changed.revision!==editing.revision)$('peri-conflict').hidden=false;}data=clone(next);if(phase!=='all'&&!data.phases.some(p=>p.id===phase))phase='all';render();}
 window.PerioApp={initial:clone(initial),fields:fieldDefs,valid,getData:()=>clone(data),replace,connection,connect(a,next){adapter=a;replace(next);},disconnect(){adapter=null;try{const local=JSON.parse(localStorage.getItem(key)||'null');data=valid(local)?local:clone(initial);}catch{data=clone(initial);}editing=null;dirty=false;$('peri-dialog').close();render();},download};
 render();
})();
