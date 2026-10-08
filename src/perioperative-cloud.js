(()=>{
'use strict';
const app=window.PerioApp,$=id=>document.getElementById(id);
let teamKey=new URLSearchParams(location.hash.split('&').slice(1).join('&')).get('team');
try{if(teamKey)sessionStorage.setItem('highst-filming-team',teamKey);else teamKey=sessionStorage.getItem('highst-filming-team');}catch{}
if(!teamKey){app.connection('개인 미리보기','수술팀 전용 링크로 열면 로그인 없이 공동 저장됩니다.',false);return;}
const config={url:'https://wqymwtvktdhofzegjawn.supabase.co',key:'sb_publishable_DaYVJvbfHCFE6luJoqfIIw_C7qCj_bx'};
const client=window.supabase.createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
let sequence=0,subscribed=false,active=false,refreshTimer=null;
const locked={saveStep:async()=>{throw new Error('공동 저장 연결을 확인하는 중입니다. 잠시 후 다시 저장해 주세요.');},savePhase:async()=>{throw new Error('공동 저장 연결을 먼저 확인해 주세요.');},deletePhase:async()=>{throw new Error('공동 저장 연결을 먼저 확인해 주세요.');}};
app.connect(locked,app.initial);app.connection('공동 기록을 여는 중','수술팀 촬영 목록을 불러옵니다.',false);
function rowValue(r){return {...r.payload,revision:r.version,updatedAt:r.updated_at};}
function snapshot(rows){return {version:1,phases:rows.filter(r=>r.kind==='phase'&&!r.payload.deleted).map(rowValue),steps:rows.filter(r=>r.kind==='step').map(rowValue)};}
function message(error){if(/TEAM_LINK_REQUIRED/.test(error.message))return '팀 링크를 확인해 주세요. 현재 링크에는 편집 권한이 없습니다.';if(/EDIT_CONFLICT/.test(error.message))return '다른 팀원이 먼저 수정했습니다. 입력 내용은 유지됩니다. 내용을 복사해 두고 최신 과정을 다시 열어 비교해 주세요.';if(/PHASE_NOT_EMPTY/.test(error.message))return '이 구간에 과정이 남아 있습니다. 다른 구간으로 옮긴 뒤 삭제해 주세요.';return '서버에 저장하지 못했습니다. 입력 내용은 유지됩니다. 인터넷 연결을 확인한 뒤 다시 저장해 주세요.';}
async function read(){const {data,error}=await client.rpc('highst_filming_read',{p_key:teamKey});if(error)throw error;return snapshot(data||[]);}
async function refresh(){const n=++sequence;try{const data=await read();if(n!==sequence)return;app.replace(data);app.connection(subscribed?'공동 저장 · 실시간 연결됨':'공동 저장 연결됨',subscribed?'저장한 변경이 수술팀 화면에 바로 반영됩니다.':'촬영 목록이 저장됩니다. 실시간 연결을 확인하고 있습니다.',true);}catch(e){if(n===sequence)app.connection('공동 기록 연결을 확인해 주세요',message(e),false);}}
function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,200);}
async function save(kind,payload,expected){sequence++;const body={...payload};delete body.revision;delete body.updatedAt;delete body.history;const {data,error}=await client.rpc('highst_filming_save',{p_key:teamKey,p_id:body.id,p_kind:kind,p_payload:body,p_expected:expected});if(error){if(/EDIT_CONFLICT/.test(error.message))scheduleRefresh();throw new Error(message(error));}scheduleRefresh();return rowValue(data);}
const adapter={saveStep:(s,v)=>save('step',s,v),savePhase:(p,old)=>save('phase',p,old?.revision||0),deletePhase:p=>save('phase',{...p,deleted:true},p.revision)};
async function start(){try{const data=await read();app.connect(adapter,data);active=true;$('peri-import').hidden=true;app.connection('공동 저장 연결됨','촬영 목록이 저장됩니다. 실시간 연결을 시작합니다.',true);
const share=document.createElement('button');share.className='btn';share.textContent='팀 링크 복사';share.onclick=async()=>{const link='https://notoow.github.io/vietnam-urology-webinar/#perioperative&team='+encodeURIComponent(teamKey);try{await navigator.clipboard.writeText(link);share.textContent='링크 복사됨';setTimeout(()=>share.textContent='팀 링크 복사',1800);}catch{window.prompt('이 링크를 수술팀에 공유하세요.',link);}};document.querySelector('#perioperative .actions').prepend(share);
client.channel('highst-filming-refresh',{config:{private:false}}).on('broadcast',{event:'changed'},scheduleRefresh).subscribe(status=>{subscribed=status==='SUBSCRIBED';if(subscribed)refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')app.connection('공동 저장 가능 · 실시간 연결 재시도 중','저장 기능은 사용할 수 있습니다. 최신 내용은 주기적으로 다시 확인합니다.',false);});
setInterval(()=>{if(document.visibilityState==='visible')refresh();},20000);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
}catch(e){app.connection('팀 링크를 확인해 주세요',message(e),false);}}
start();
})();
