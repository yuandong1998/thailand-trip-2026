'use strict';
// The database, not this UI, enforces invite membership and write access.
const cloudConfig=window.TRIP_CLOUD_CONFIG||{};
const cloud={client:null,member:null,connected:false,busy:false,connecting:false,revisions:{},baseline:{},dirty:new Set(),conflicts:new Set(),timer:null,message:'',pendingRemote:null};
const cloudScopes=['group',...members.map(m=>m.id)];
const cloudConfigured=()=>Boolean(cloudConfig.url&&cloudConfig.key);
const cloudCacheKey=()=>`thailand-cloud-cache:${cloudConfig.url}:${cloud.member}`;
function cloudSplit(value=state){const {members:profiles,version,...group}=value;return {group,...profiles};}
function cloudJoin(records){return normalize({...defaults,...records.group,version:2,members:Object.fromEntries(members.map(m=>[m.id,{...emptyProfile(),...records[m.id]}]))});}
function cloudEditable(){return !cloudConfigured()||(cloud.connected&&(selectedMember==='group'||selectedMember===cloud.member));}
function cloudCache(){try{localStorage.setItem(cloudCacheKey(),JSON.stringify({state,revisions:cloud.revisions,baseline:cloud.baseline,dirty:[...cloud.dirty],conflicts:[...cloud.conflicts]}));}catch{toast('本机备份失败，请导出备份。');}}
function cloudAccess(){
  if(!cloudConfigured())return;
  const editable=cloudEditable();
  $$('#day-detail input,#day-detail select,#day-detail textarea,#day-detail button[data-edit],#day-detail button[data-delete],#add-event,#bookings-content button[data-book-add],#bookings-content button[data-book-edit],#bookings-content button[data-book-delete],#packing-groups input,#packing-groups button,#add-item-form input,#add-item-form button').forEach(el=>el.disabled=!editable);
  $('#import-trip').disabled=true;$('#settings-button').disabled=!cloud.connected;
  $('#member-context').textContent=!cloud.connected?'通过自己的邀请链接加入旅行后，即可共享资料。':selectedMember==='group'?'共同安排 · 六位成员都可以编辑':selectedMember===cloud.member?'我的资料 · 自动同步给同行成员':memberName()+'的资料 · 可以查看，由本人编辑';
  $('#storage-explainer').textContent=cloud.connected?'已启用共享；可查看全员资料，编辑自己的内容与共同安排。':'云端同步待连接；请打开属于自己的邀请链接。';
  $('#save-state').textContent=cloud.conflicts.size?'有修改冲突 · 请处理':cloud.connected?(cloud.dirty.size?'已存本机 · 等待同步':'已与同行成员同步'):'尚未连接共享旅行';
  $('#cloud-status').textContent=cloud.message||(cloud.connected?'已作为 '+members.find(m=>m.id===cloud.member).name+' 加入 · 自动刷新其他成员更新':'使用自己的邀请链接加入，酒店和机票资料仅对成员可见。');
  $('#cloud-local-backup').hidden=!localStorage.getItem(STORAGE_KEY+'-before-cloud');$('#cloud-retry').hidden=!cloud.connected;$('#cloud-resolve').hidden=!cloud.conflicts.size;
  $('#cloud-connect-form').hidden=cloud.connected;$('#cloud-note').textContent=cloud.connected?'离线时修改先保存在本机；保持页面打开，恢复网络后会自动重试。':'邀请链接相当于该成员的编辑钥匙，请只发给本人。';
}
function cloudMarkDirty(){
  if(!cloud.connected)return;
  const records=cloudSplit();
  for(const scope of ['group',cloud.member]){if(JSON.stringify(records[scope])!==JSON.stringify(cloud.baseline[scope]))cloud.dirty.add(scope);}
  cloudCache();cloudAccess();clearTimeout(cloud.timer);cloud.timer=setTimeout(cloudSync,700);
}
function cloudIsEditing(){return Boolean($('dialog[open]'))||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);}
function cloudApplyRows(rows){
  const records=cloudSplit();let changed=false;
  for(const row of rows){
    if(!cloudScopes.includes(row.scope)||row.revision===cloud.revisions[row.scope])continue;
    if(cloud.dirty.has(row.scope)){cloud.conflicts.add(row.scope);continue;}
    records[row.scope]=row.payload;cloud.revisions[row.scope]=row.revision;changed=true;
  }
  if(changed){state=cloudJoin(records);const normalized=cloudSplit();for(const scope of cloudScopes)if(!cloud.dirty.has(scope))cloud.baseline[scope]=structuredClone(normalized[scope]);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}renderAll();
  }
  cloudCache();cloudAccess();
}
async function cloudSync(){
  if(!cloud.connected||cloud.busy)return;cloud.busy=true;
  try{
    for(const scope of [...cloud.dirty]){
      if(cloud.conflicts.has(scope))continue;
      const payload=structuredClone(cloudSplit()[scope]);
      const {data,error}=await cloud.client.rpc('save_trip_record',{record_scope:scope,expected_revision:cloud.revisions[scope],record_payload:payload});
      if(error)throw error;
      if(!data?.length){cloud.conflicts.add(scope);continue;}
      cloud.revisions[scope]=data[0].revision;cloud.baseline[scope]=payload;
      if(JSON.stringify(cloudSplit()[scope])===JSON.stringify(payload))cloud.dirty.delete(scope);
    }
    const {data,error}=await cloud.client.from('trip_records').select('scope,payload,revision');if(error)throw error;
    if(data.length!==7)throw Error('成员权限已失效或数据尚未初始化');
    if(cloudIsEditing())cloud.pendingRemote=data;else{cloud.pendingRemote=null;cloudApplyRows(data);}
    cloud.message=cloud.conflicts.size?'同一份资料在另一台设备上也有修改，已暂停上传，请处理冲突。':cloud.dirty.size?'修改已存本机，正在等待同步。':'已作为 '+members.find(m=>m.id===cloud.member).name+' 同步 · '+new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
  }catch(error){cloud.message='同步未完成，修改保留在此设备。将自动重试；也可点击「立即同步」。';}
  finally{cloud.busy=false;cloudCache();cloudAccess();}
}
async function cloudConnect(rawToken){
  if(cloud.connecting)return;
  if(!cloudConfigured()){toast('云端尚未配置完成。');return;}
  const token=String(rawToken||'').trim().replace(/^.*#invite=/,'');
  if(token&&!/^[a-f0-9]{64}$/.test(token)){toast('邀请链接格式不正确，请使用完整邀请链接。');return;}
  cloud.connecting=true;$('#cloud-connect').disabled=true;cloud.message='正在连接共享旅行…';cloudAccess();
  try{
    if(!window.supabase)throw Error('无法加载同步组件，请检查网络后刷新');
    if(!cloud.client)cloud.client=window.supabase.createClient(cloudConfig.url,cloudConfig.key,{global:{fetch:cloudFetch}});
    const session=await cloud.client.auth.getSession();if(session.error)throw session.error;
    if(!session.data.session){if(!token){cloud.message='请打开自己的邀请链接加入旅行。';return;}const auth=await cloud.client.auth.signInAnonymously();if(auth.error)throw auth.error;}
    const joined=token?await cloud.client.rpc('join_trip',{invite_token:token}):await cloud.client.rpc('trip_member');
    if(joined.error)throw joined.error;if(!members.some(m=>m.id===joined.data))throw Error('尚未加入旅行，请填写邀请链接');
    cloud.member=joined.data;
    const {data,error}=await cloud.client.from('trip_records').select('scope,payload,revision');if(error)throw error;if(data.length!==7)throw Error('云端资料未初始化');
    let cached=null;try{cached=JSON.parse(localStorage.getItem(cloudCacheKey()));}catch{}
    try{if(!localStorage.getItem(STORAGE_KEY+'-before-cloud'))localStorage.setItem(STORAGE_KEY+'-before-cloud',JSON.stringify(state));}catch{}
    cloud.revisions=Object.fromEntries(data.map(row=>[row.scope,row.revision]));
    state=cloudJoin(Object.fromEntries(data.map(row=>[row.scope,row.payload])));cloud.baseline=structuredClone(cloudSplit());cloud.dirty.clear();cloud.conflicts.clear();
    if(cached?.state&&Array.isArray(cached.dirty)){
      const draft=cloudSplit(normalize(cached.state)),records=cloudSplit();
      for(const scope of cached.dirty.filter(s=>s==='group'||s===cloud.member)){
        const alreadySaved=JSON.stringify(draft[scope])===JSON.stringify(records[scope]);if(alreadySaved)continue;
        records[scope]=draft[scope];cloud.dirty.add(scope);if(cached.revisions?.[scope]!==cloud.revisions[scope])cloud.conflicts.add(scope);
      }
      state=cloudJoin(records);
    }
    cloud.connected=true;cloud.message='已连接共享旅行。';$('#invite-token').value='';selectMember(cloud.member);cloudCache();await cloudSync();
  }catch(error){cloud.message='连接失败：'+(error.message||'请检查网络与邀请链接');}
  finally{cloud.connecting=false;$('#cloud-connect').disabled=false;cloudAccess();}
}
function cloudResolve(){
  $('#conflict-list').innerHTML=[...cloud.conflicts].map(scope=>`<p>${scope==='group'?'共同安排':esc(members.find(m=>m.id===scope)?.name||scope)}：另一台设备已有更新。你的修改仍保存在本机。</p>`).join('');
  $('#conflict-dialog').showModal();
}
$('#cloud-local-backup').addEventListener('click',()=>{const raw=localStorage.getItem(STORAGE_KEY+'-before-cloud');if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='泰国旅行-连接前本机备份.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#cloud-connect-form').addEventListener('submit',e=>{e.preventDefault();cloudConnect($('#invite-token').value);});
$('#cloud-retry').addEventListener('click',cloudSync);$('#cloud-resolve').addEventListener('click',cloudResolve);
$('#close-conflict').addEventListener('click',()=>$('#conflict-dialog').close());
$('#conflict-export').addEventListener('click',exportTrip);
$('#conflict-use-cloud').addEventListener('click',async()=>{
  if(!await confirmAction('建议先导出本机备份。确定放弃冲突部分的本机修改，采用云端版本吗？'))return;
  const {data,error}=await cloud.client.from('trip_records').select('scope,payload,revision');if(error){toast('读取云端失败，请重试。');return;}
  for(const scope of cloud.conflicts){cloud.dirty.delete(scope);delete cloud.revisions[scope];}cloud.conflicts.clear();cloudApplyRows(data);$('#conflict-dialog').close();toast('已采用云端版本，可继续编辑。');
});
window.tripCloud={changed:cloudMarkDirty,access:cloudAccess,canEdit:cloudEditable};
async function cloudFetch(url,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000),abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}}
const reconnect=()=>cloud.connected?cloudSync():cloudConnect('');
const invitation=location.hash.startsWith('#invite=')?location.hash.slice(8):'';
if(invitation){history.replaceState(null,'','#overview');showTab('overview');}
$('#cloud-box').hidden=false;
if(cloudConfigured()){cloudAccess();cloudConnect(invitation);setInterval(()=>{if(!document.hidden)reconnect();},10000);window.addEventListener('online',reconnect);document.addEventListener('visibilitychange',()=>{if(!document.hidden)reconnect();});window.addEventListener('beforeunload',e=>{if(cloud.dirty.size){e.preventDefault();e.returnValue='';}});}
else{$('#cloud-status').textContent='共享功能正在配置，当前修改仅保存到本机。';$('#cloud-connect-form').hidden=true;$('#cloud-retry').hidden=true;}

window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#invite=')){const token=location.hash.slice(8);history.replaceState(null,'','#overview');showTab('overview');cloudConnect(token);}});
