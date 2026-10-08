(()=>{
'use strict';
const app=window.PerioApp,$=id=>document.getElementById(id);
try{sessionStorage.removeItem('highst-filming-team');}catch{}
if(location.hash.includes('&team='))history.replaceState(null,'',location.pathname+location.search+location.hash.split('&')[0]);
const config={url:'https://wqymwtvktdhofzegjawn.supabase.co',key:'sb_publishable_DaYVJvbfHCFE6luJoqfIIw_C7qCj_bx'};
const client=window.supabase.createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
let sequence=0,subscribed=false,refreshTimer=null,lastRefresh=0,recoveryCursor=null,recoveryBusy=false;
const locked={saveStep:async()=>{throw new Error('공동 저장 연결을 확인하는 중입니다. 잠시 후 다시 저장해 주세요.');},savePhase:async()=>{throw new Error('공동 저장 연결을 먼저 확인해 주세요.');},deletePhase:async()=>{throw new Error('공동 저장 연결을 먼저 확인해 주세요.');}};
app.connect(locked,app.initial);app.connection('공동 기록을 여는 중','로그인 없이 같은 촬영 목록을 함께 사용합니다.',false);$('peri-import').hidden=true;
function rowValue(r){return {...r.payload,revision:r.version,updatedAt:r.updated_at};}
function snapshot(rows){return {version:1,phases:rows.filter(r=>r.kind==='phase'&&!r.payload.deleted).map(rowValue),steps:rows.filter(r=>r.kind==='step').map(rowValue)};}
function message(error){
 const value=error.message||'';
 if(/EDIT_CONFLICT/.test(value))return '다른 사람이 먼저 수정했습니다. 입력 내용은 유지됩니다. 내용을 복사해 두고 최신 과정을 다시 열어 비교해 주세요.';
 if(/PHASE_NOT_EMPTY|LAST_PHASE/.test(value))return '과정이 남아 있거나 마지막 구간이어서 삭제할 수 없습니다.';
 if(/PHASE_NOT_FOUND/.test(value))return '수술 구간이 변경되었습니다. 구간을 먼저 복원하거나 최신 목록에서 다시 선택해 주세요.';
 if(/RATE_LIMIT/.test(value))return '짧은 시간에 변경이 많아 잠시 저장을 제한했습니다. 입력은 유지됩니다. 잠시 후 다시 저장해 주세요.';
 if(/BOARD_LIMIT/.test(value))return '과정 수가 한도에 도달했습니다. 기존 과정을 수정하거나 삭제한 과정을 복원해 주세요.';
 if(/EDITING_PAUSED/.test(value))return '공동 편집이 잠시 중지되었습니다. 입력한 내용은 유지됩니다.';
 if(/CLIENT_UPDATE_REQUIRED/.test(value))return '새 씬 기능이 적용되었습니다. 입력을 복사해 두고 페이지를 새로고침해 주세요.';
 if(/INVALID_/.test(value))return '글자 수와 내용을 확인해 주세요. 씬은 카드당 20개·총 4,000자까지, HTML 없이 일반 글로 입력해 주세요.';
 return '서버에 저장하지 못했습니다. 입력 내용은 유지됩니다. 인터넷 연결을 확인한 뒤 다시 저장해 주세요.';
}
async function rpc(name,args={}){const {data,error}=await client.rpc('highst_filming_public_'+name,args);if(error)throw error;return data;}
async function read(){return snapshot(await rpc('read')||[]);}
async function refresh(){const n=++sequence;lastRefresh=Date.now();try{const data=await read();if(n!==sequence)return;app.replace(data);app.connection(subscribed?'누구나 편집 · 실시간 연결됨':'누구나 편집 · 공동 저장 연결됨','과정과 촬영 메모를 저장하면 다른 화면에도 반영됩니다.',true);}catch(e){if(n===sequence)app.connection('공동 기록 연결을 확인해 주세요',message(e),false);}}
function scheduleRefresh(){if(refreshTimer)return;refreshTimer=setTimeout(()=>{refreshTimer=null;refresh();},Math.max(200,1500-(Date.now()-lastRefresh)));}
function payload(kind,p){return kind==='phase'?{id:p.id,name:p.name,order:p.order,deleted:!!p.deleted}:{id:p.id,phaseId:p.phaseId,title:p.title,order:p.order,status:p.status,fields:{evidence:app.scenesOf(p).map(x=>x.text).join('\n\n')},mediaType:p.mediaType||'pending',scenes:app.scenesOf(p),deleted:!!p.deleted};}
async function save(kind,p,expected){sequence++;try{const data=await rpc('save',{p_id:p.id,p_kind:kind,p_payload:payload(kind,p),p_expected:expected});scheduleRefresh();return rowValue(data);}catch(error){if(/EDIT_CONFLICT/.test(error.message))scheduleRefresh();throw new Error(message(error));}}
const adapter={saveStep:(s,v)=>save('step',s,v),savePhase:(p,old)=>save('phase',p,old?.revision||0),deletePhase:p=>save('phase',{...p,deleted:true},p.revision)};
function node(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
async function historyPage(reset=false){
 if(recoveryBusy)return;recoveryBusy=true;$('peri-recovery-more').disabled=true;
 try{
  if(reset){recoveryCursor=null;$('peri-recovery-list').replaceChildren();}
  const rows=await rpc('history',{p_before:recoveryCursor});
  for(const h of rows){const p=h.before_record.payload,card=node('article','','peri-recovery-item');
   card.append(node('small',new Date(h.saved_at).toLocaleString('ko-KR')+' 변경 전 · 버전 '+h.before_record.version),node('h3',p.title||p.name),node('p',p.fields?.evidence||'촬영 메모 없음'));
   if(p.deleted)card.append(node('small','삭제된 상태로 되돌리는 기록입니다.'));
   const b=node('button','이 내용으로 복원','btn');b.type='button';b.onclick=async()=>{
    if(recoveryBusy)return;recoveryBusy=true;b.disabled=true;
    try{await rpc('restore',{p_history_id:h.id,p_expected:h.current_version});await refresh();$('peri-recovery-status').textContent='복원했습니다. 복원 전 내용도 보관되어 있습니다.';recoveryBusy=false;await historyPage(true);}
    catch(e){$('peri-recovery-status').textContent=message(e);b.disabled=false;}
    finally{recoveryBusy=false;}
   };card.append(b);$('peri-recovery-list').append(card);
  }
  recoveryCursor=rows.at(-1)?.id||recoveryCursor;$('peri-recovery-more').hidden=rows.length<20;
  if(reset&&!rows.length)$('peri-recovery-list').append(node('p','아직 이전 내용이 없습니다.'));
 }catch(e){$('peri-recovery-status').textContent=message(e);}finally{recoveryBusy=false;$('peri-recovery-more').disabled=false;}
}
$('peri-recovery-open').onclick=()=>{$('peri-recovery-status').textContent='';$('peri-recovery-dialog').showModal();historyPage(true);};
$('peri-recovery-close').onclick=()=>$('peri-recovery-dialog').close();$('peri-recovery-more').onclick=()=>historyPage();
async function start(){try{app.connect(adapter,await read());app.connection('누구나 편집 · 공동 저장 연결됨','로그인 없이 바로 작성하고 저장할 수 있습니다.',true);
const share=document.createElement('button');share.className='btn';share.textContent='링크 복사';share.onclick=async()=>{const link='https://notoow.github.io/vietnam-urology-webinar/#perioperative';try{await navigator.clipboard.writeText(link);share.textContent='링크 복사됨';setTimeout(()=>share.textContent='링크 복사',1800);}catch{window.prompt('이 링크를 수술팀에 공유하세요.',link);}};document.querySelector('#perioperative .actions').prepend(share);
client.channel('highst-filming-refresh',{config:{private:false}}).on('broadcast',{event:'changed'},scheduleRefresh).subscribe(status=>{subscribed=status==='SUBSCRIBED';if(subscribed)scheduleRefresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')app.connection('공동 저장 가능 · 실시간 연결 재시도 중','저장 기능은 사용할 수 있습니다. 최신 내용은 주기적으로 다시 확인합니다.',false);});
setInterval(()=>{if(document.visibilityState==='visible')scheduleRefresh();},20000);window.addEventListener('online',scheduleRefresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRefresh();});
}catch(e){app.connection('공동 저장 연결을 확인해 주세요',message(e),false);const retry=document.createElement('button');retry.className='btn';retry.textContent='연결 다시 시도';retry.onclick=()=>{retry.remove();start();};$('peri-connection').append(retry);}}
start();
})();
