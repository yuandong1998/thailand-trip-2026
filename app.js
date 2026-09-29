'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY = 86400000;
const STORAGE_KEY = 'thailand-trip-v1';
const cities = [
  {id:'bangkok',name:'曼谷',en:'BANGKOK',lat:13.7563,lon:100.5018,photo:'bangkok.jpg',alt:'曼谷郑王庙与湄南河日落',desc:'河畔日落，街巷烟火。',tags:'寺庙 · 街巷 · 美食'},
  {id:'pattaya',name:'芭堤雅',en:'PATTAYA',lat:12.9236,lon:100.8825,photo:'pattaya.jpg',alt:'芭堤雅海滩与海岸',desc:'去海边，把脚步放慢。',tags:'海滩 · 日落 · 海鲜'},
  {id:'chiangmai',name:'清迈',en:'CHIANG MAI',lat:18.7883,lon:98.9853,photo:'chiangmai.jpg',alt:'清迈双龙寺金色佛塔',desc:'古城散步，山林呼吸。',tags:'古城 · 咖啡 · 山林'}
];
const packingGroups = [
  {id:'documents',name:'证件与预订',items:[['passport','护照','与电子备份分开保存'],['tickets','机票与酒店确认单','提前下载离线副本'],['insurance','旅行保险与紧急联系人','按个人情况准备'],['payment','银行卡与泰铢现金','分开保管']]},
  {id:'clothes',name:'衣物与鞋履',items:[['tops','轻薄透气上衣','按旅行天数准备，可结合中途洗衣'],['underwear','内衣与袜子',''],['temple','遮肩上衣与过膝下装','寺庙参观备用'],['jacket','薄外套','机舱、商场与山上备用'],['shoes','舒适步行鞋',''],['swim','泳衣与凉鞋','芭堤雅海边']]},
  {id:'weather',name:'防晒与防雨',items:[['sunscreen','防晒用品',''],['hat','遮阳帽与太阳镜',''],['umbrella','折叠伞或轻便雨衣',''],['bag','防水袋','海边与雨天保护物品']]},
  {id:'electronics',name:'数码与网络',items:[['phone','手机与充电线',''],['power','充电宝','携带规定以承运航空公司为准'],['adapter','旅行转换插头',''],['esim','手机漫游 / SIM / eSIM','提前确认设备兼容'],['offline','离线地图与翻译','出发前下载']]},
  {id:'daily',name:'洗护与日常',items:[['toiletries','个人洗护用品',''],['medicine','个人常用药','原包装与所需说明'],['repellent','驱蚊用品',''],['tissue','纸巾与湿巾',''],['bottle','可重复使用水杯','']]},
  {id:'group',name:'六人同行',items:[['meet','确认集合地点与时间',''],['split','确认分账方式',''],['luggage','核对每人的行李额度','以已订机票为准'],['transfer','确认接送车与行李空间','六人出行，预约前说明箱数']]}
];
const members=[{id:'jinxi',name:'近西'},{id:'kitty',name:'kitty'},{id:'bing',name:'饼'},{id:'yanye',name:'颜烨'},{id:'azer',name:'Azer'},{id:'jing',name:'璟'}];
const scheduledCity=date=>date>='2026-09-28'&&date<='2026-09-30'?'bangkok':date>='2026-10-01'&&date<='2026-10-03'?'pattaya':date>='2026-10-04'&&date<='2026-10-08'?'chiangmai':'';
const scheduledFrom=date=>date==='2026-10-01'?'bangkok':date==='2026-10-04'?'pattaya':'';
const emptyProfile=()=>({days:{},flights:[],hotels:[],packed:{},customItems:[]});
const defaults = {version:2,start:'2026-09-28',end:'2026-10-08',travelers:6,days:{},packed:{},customItems:[],members:Object.fromEntries(members.map(m=>[m.id,emptyProfile()]))};
for(let date of datesBetween(defaults.start,defaults.end))defaults.days[date]={city:scheduledCity(date),from:scheduledFrom(date),note:'',events:[]};
function validDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===v&&v>='2020-01-01'&&v<='2100-12-31';}
function datesBetween(start,end){if(!validDate(start)||!validDate(end))return [];const n=(Date.parse(end)-Date.parse(start))/DAY+1;if(n<1||n>60)return [];return Array.from({length:n},(_,i)=>new Date(Date.parse(start)+i*DAY).toISOString().slice(0,10));}
function normalizeBase(data){
  if(!data||data.version!==1||!datesBetween(data.start,data.end).length||!Number.isInteger(data.travelers)||data.travelers<1||data.travelers>50)throw new Error('请选择 1–60 天的旅行日期，人数为 1–50 人。');
  const clean={version:1,start:data.start,end:data.end,travelers:data.travelers,days:{},packed:{},customItems:[]};
  const str=(s,n)=>typeof s==='string'?s.slice(0,n):'';
  if(data.days&&typeof data.days==='object')for(const [date,d] of Object.entries(data.days).slice(0,365)){
    if(!validDate(date)||!d||typeof d!=='object')continue;
    clean.days[date]={city:cities.some(c=>c.id===d.city)?d.city:'',from:cities.some(c=>c.id===d.from)?d.from:'',note:str(d.note,3000),events:[]};
    if(Array.isArray(d.events))clean.days[date].events=d.events.slice(0,30).filter(e=>e&&typeof e.title==='string'&&e.title.trim()).map((e,i)=>({id:str(e.id,80)||'import-'+i,title:str(e.title,100),time:/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)?e.time:'',duration:str(e.duration,40),place:str(e.place,200),travel:str(e.travel,160),notes:str(e.notes,2000)}));
    const seen=new Set();clean.days[date].events.forEach((e,i)=>{if(seen.has(e.id))e.id='import-'+i+'-'+date;seen.add(e.id);});
  }
  if(Array.isArray(data.customItems))clean.customItems=data.customItems.slice(0,100).filter(i=>i&&typeof i.text==='string'&&i.text.trim()).map((i,n)=>({id:typeof i.id==='string'&&/^custom-[a-zA-Z0-9-]+$/.test(i.id)?i.id:'custom-import-'+n,text:str(i.text,60)}));
  clean.customItems=clean.customItems.filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i);
  const allowed=new Set([...packingGroups.flatMap(g=>g.items.map(i=>i[0])),...clean.customItems.map(i=>i.id)]);
  if(data.packed&&typeof data.packed==='object')for(const k of allowed)if(data.packed[k]===true)clean.packed[k]=true;
  return clean;
}
function normalize(data){
  if(!data||![1,2].includes(data.version))throw Error('不支持的行程格式');
  const old=data.version===1;
  const base=normalizeBase({...data,version:1,start:old&&data.start==='2026-09-29'?'2026-09-28':data.start});
  const clean={...base,version:2,members:{}};
  if(old)for(const date of datesBetween(clean.start,clean.end)){
    if(!clean.days[date])clean.days[date]={city:scheduledCity(date),from:scheduledFrom(date),note:'',events:[]};
    else if(!clean.days[date].city){clean.days[date].city=scheduledCity(date);clean.days[date].from=scheduledFrom(date);}
  }
  for(const m of members){
    const raw=data.members?.[m.id]||emptyProfile();
    const profile=normalizeBase({...raw,version:1,start:clean.start,end:clean.end,travelers:6});
    clean.members[m.id]={days:profile.days,packed:profile.packed,customItems:profile.customItems};
    for(const kind of ['flights','hotels']){
      const fields=kind==='flights'?['title','date','time','arrivalDate','arrivalTime','origin','destination','baggage','notes']:['title','date','endDate','address','notes'];
      clean.members[m.id][kind]=(Array.isArray(raw[kind])?raw[kind]:[]).slice(0,60).filter(x=>x&&typeof x.title==='string'&&x.title.trim()).map((x,i)=>{
        const row={id:typeof x.id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(x.id)?x.id:kind+'-'+i+'-'+m.id};
        for(const key of fields)row[key]=typeof x[key]==='string'?x[key].slice(0,key==='notes'?2000:200):'';
        for(const key of ['date','endDate','arrivalDate'])if(key in row&&!validDate(row[key]))row[key]='';
        for(const key of ['time','arrivalTime'])if(key in row&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(row[key]))row[key]='';
        return row;
      });
    }
  }
  return clean;
}
let state=structuredClone(defaults),storageAvailable=true;
try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const raw=JSON.parse(saved);if(raw.version===1&&!localStorage.getItem(STORAGE_KEY+'-legacy-backup'))localStorage.setItem(STORAGE_KEY+'-legacy-backup',saved);state=normalize(raw);}}catch{storageAvailable=false;}
let selectedMember='group',editingBooking=null;
let selectedDay=0,activeTab='overview',filter='all',editingEvent=null,weatherData={},weatherBusy=false,weatherFetchTime='',toastTimer;
const tripDates=()=>datesBetween(state.start,state.end);
const profile=()=>selectedMember==='group'?state:state.members[selectedMember];
const memberName=()=>members.find(m=>m.id===selectedMember)?.name||'共同安排';
const groupDay=date=>state.days[date]||{city:'',from:'',note:'',events:[]};
const dayState=date=>profile().days[date]||{city:groupDay(date).city,from:groupDay(date).from||'',note:'',events:[]};
function ensureDay(date){if(!profile().days[date])profile().days[date]=structuredClone(dayState(date));return profile().days[date];}
function citiesOnDate(date){const ids=new Set();for(const d of [groupDay(date),...members.map(m=>state.members[m.id].days[date]).filter(Boolean)])for(const id of [d.city,d.from])if(id)ids.add(id);return ids;}
function weatherDates(city){return tripDates().filter(date=>citiesOnDate(date).has(city));}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;toast('浏览器无法保存，请导出行程备份。');}$('#save-state').textContent=storageAvailable?'修改保存在此设备':'无法本地保存 · 请导出备份';window.tripCloud?.changed();}
function confirmAction(message){return new Promise(resolve=>{const dialog=$('#confirm-dialog');$('#confirm-message').textContent=message;dialog.returnValue='cancel';dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true});dialog.showModal();});}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function dateLabel(date,weekday=false){return new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',...(weekday?{weekday:'short'}:{}),timeZone:'Asia/Bangkok'}).format(new Date(date+'T12:00:00+07:00'));}
function mapSearch(place,city){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place+' '+(city?.en||'')+' Thailand');}
function mapRoute(a,b,city){return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(a+' '+(city?.en||'')+' Thailand')+'&destination='+encodeURIComponent(b+' '+(city?.en||'')+' Thailand');}
function showTab(tab){
  if(!['overview','itinerary','bookings','weather','transport','packing'].includes(tab))return;
  activeTab=tab;$$('.panel').forEach(p=>p.hidden=p.id!==tab);$$('.tab').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');});
  history.replaceState(null,'','#'+tab);
  if(tab==='bookings')renderBookings();if(tab==='itinerary')renderItinerary();if(tab==='packing')renderPacking();if(tab==='weather')renderWeather();window.tripCloud?.access();
}
function renderHeader(){
  $('#trip-date').textContent=state.start.replaceAll('-','.')+' — '+state.end.slice(5).replace('-','.');
  $('#trip-duration').textContent=tripDates().length+' 天 · 3 座城市';$('.trip-badge').textContent=state.travelers+' 人同行 · 自由行';
  const ids=tripDates();$('#member-context').textContent=selectedMember==='group'?'编辑全员共同安排；个人机票与酒店请先选择成员。':'正在编辑 '+memberName()+' 的个人资料 · 共同安排仍可查看';
  $('#city-cards').innerHTML=cities.map((c,i)=>{const stay=weatherDates(c.id),count=stay.length;return `<button class="city-card" data-city="${c.id}" aria-label="查看${c.name}的行程"><div class="city-photo"><img src="./assets/${c.photo}" alt="${c.alt}" width="480" height="320"><span class="city-index">0${i+1}</span></div><div class="city-card-copy"><div class="city-name-row"><h3>${c.name}</h3><span>${count?dateLabel(stay[0])+'–'+dateLabel(stay.at(-1)):'待分配日期'}</span></div><span class="city-en">${c.en}</span><p class="city-desc">${c.desc}</p><div class="city-bottom"><span>${c.tags}</span><span class="city-arrow" aria-hidden="true">↗</span></div></div></button>`;}).join('');
  $('#save-state').textContent=storageAvailable?'修改保存在此设备':'无法本地保存 · 请导出备份';
  $('#photo-credits').innerHTML='<p>照片均作裁切显示：<a href="https://commons.wikimedia.org/wiki/File:Wat_Arun_Sunset.jpg" target="_blank" rel="noopener noreferrer">曼谷 © miketnorton</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a>；<a href="https://commons.wikimedia.org/wiki/File:Pattaya_Beach,_Thailand.jpg" target="_blank" rel="noopener noreferrer">芭堤雅 © Vyacheslav Argenberg</a>；<a href="https://commons.wikimedia.org/wiki/File:Doi_Suthep_Temple_Chiang_Mai_Thailand.jpg" target="_blank" rel="noopener noreferrer">清迈 © Philip Nalangan</a>，后两张为 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。来自 Wikimedia Commons。</p>';
}
function renderItinerary(){
  const dates=tripDates();selectedDay=Math.min(selectedDay,dates.length-1);const date=dates[selectedDay],d=dayState(date),city=cities.find(c=>c.id===d.city);
  $('#day-list').innerHTML=dates.map((dt,i)=>{const data=dayState(dt),c=cities.find(c=>c.id===data.city);return `<button class="day-button ${i===selectedDay?'active':''}" data-day="${i}" ${i===selectedDay?'aria-current="date"':''}><b>${String(i+1).padStart(2,'0')}</b><span>${dateLabel(dt)}<small>${c?c.name:'城市待安排'} · ${data.events.length} 项</small></span></button>`;}).join('');
  const sorted=[...d.events].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
  $('#day-detail').innerHTML=`<div class="day-title"><div><p class="eyebrow">DAY ${String(selectedDay+1).padStart(2,'0')} · ${dateLabel(date,true)} · ${esc(memberName())}</p><h2>${city?city.name+'，按自己的节奏。':'这一天，想怎么过？'}</h2><label class="city-select-label">当天城市 <select id="day-city"><option value="">待安排</option>${cities.map(c=>`<option value="${c.id}" ${c.id===d.city?'selected':''}>${c.name}</option>`).join('')}</select></label><label class="city-select-label"> 出发地 <select id="day-from"><option value="">不换城</option>${cities.map(c=>`<option value="${c.id}" ${c.id===d.from?'selected':''}>${c.name}</option>`).join('')}</select></label></div><span class="day-number" aria-hidden="true">${String(selectedDay+1).padStart(2,'0')}</span></div>${renderSharedDay(date)}<div class="events-heading"><span class="muted">${sorted.length?'共 '+sorted.length+' 段安排 · 按时间排序':'让旅行，从你的第一段安排开始。'}</span><button class="button" id="add-event">添加安排 +</button></div><div class="timeline">${sorted.length?sorted.map((e,i)=>`<div class="timeline-item"><time class="timeline-time">${e.time||'待定'}</time><div><div class="event-heading"><h3>${esc(e.title)}</h3><div><button class="event-action" data-edit="${esc(e.id)}" aria-label="编辑${esc(e.title)}">编辑</button><button class="event-action delete" data-delete="${esc(e.id)}" aria-label="删除${esc(e.title)}">删除</button></div></div>${e.duration?`<span class="duration-tag">停留 ${esc(e.duration)}</span>`:''}${e.notes?`<p class="user-text">${esc(e.notes)}</p>`:''}${e.place?`<a class="place-link" href="${mapSearch(e.place,city)}" target="_blank" rel="noopener noreferrer">⌖ ${esc(e.place)} ↗</a>`:''}${e.travel?`<span class="leg-note">↳ ${esc(e.travel)}</span>`:''}${i>0&&e.place&&sorted[i-1].place?`<a class="route-map-link" href="${mapRoute(sorted[i-1].place,e.place,city)}" target="_blank" rel="noopener noreferrer">查看上一站到这里的路程 ↗</a>`:''}</div></div>`).join(''):'<div class="empty-plan"><span aria-hidden="true">＋</span><h3>今天的故事，留给你来写。</h3><p>添加地点、时间和交通方式。<br>有地址的安排，可以一键打开地图。</p></div>'}</div><div class="booking-note"><strong>${esc(memberName())} · 机票与酒店</strong><button class="inline-button" id="day-bookings">查看 / 编辑预订 ↗</button></div><label class="day-note-label" for="day-note">当天备忘</label><textarea class="day-note" id="day-note" maxlength="3000" placeholder="集合地点、餐厅心愿、需要提醒同行人的事…">${esc(d.note)}</textarea><div class="day-footer"><button class="button outline" id="previous-day" ${selectedDay===0?'disabled':''}>← 前一天</button><button class="button outline" id="next-day" ${selectedDay===dates.length-1?'disabled':''}>后一天 →</button></div>`;
  $('#day-city').addEventListener('change',e=>{ensureDay(date).city=e.target.value;save();renderHeader();renderItinerary();renderWeather();});
  $('#day-from').addEventListener('change',e=>{ensureDay(date).from=e.target.value;save();renderHeader();renderWeather();});
  $('#day-bookings').addEventListener('click',()=>showTab('bookings'));
  $('#day-note').addEventListener('input',e=>{ensureDay(date).note=e.target.value;save();});
  $('#add-event').addEventListener('click',()=>openEvent());
  $('#previous-day').addEventListener('click',()=>{selectedDay--;renderItinerary();});$('#next-day').addEventListener('click',()=>{selectedDay++;renderItinerary();});
  window.tripCloud?.access();
}
function openEvent(id){
  const day=dayState(tripDates()[selectedDay]);if(!id&&day.events.length>=30){toast('每天最多添加 30 段安排。');return;}
  editingEvent=id||null;const e=day.events.find(x=>x.id===id)||{};$('#event-dialog-title').textContent=id?'编辑这段安排':'添加一段安排';
  for(const key of ['title','time','duration','place','travel','notes'])$('#event-'+key).value=e[key]||'';
  $('#event-dialog').showModal();$('#event-title').focus();
}
function renderTransport(){
  $('#transport-content').innerHTML=`<div class="transport-grid"><article class="transport-card"><span class="transport-type">01 → 02 · 公路交通参考</span><h3>曼谷 → 芭堤雅</h3><p>市区之间，以实际酒店地址为准。</p><div class="transport-facts"><div><strong>约 150 km</strong><span>城市间距离参考</span></div><div><strong>2–3 小时</strong><span>正常路况的规划估算</span></div></div><ul><li>${state.travelers} 人同行，预约接送时说明乘客和行李箱数量，确认实际座位与后备箱空间。</li><li>也可选择城际巴士，再单独安排酒店接驳。</li><li>曼谷拥堵时需要更久；精确路程等酒店地址补充后确认。</li></ul><a class="button outline" href="https://www.google.com/maps/dir/?api=1&origin=Bangkok+Thailand&destination=Pattaya+Thailand&travelmode=driving" target="_blank" rel="noopener noreferrer">查看公路路线 ↗</a></article><article class="transport-card"><span class="transport-type">02 → 03 · 换城交通参考</span><h3>芭堤雅 → 清迈</h3><p>实际以你已订航班及出发机场为准。</p><div class="transport-facts"><div><strong>待补充</strong><span>航班与出发机场</span></div><div><strong>预留大半天</strong><span>包含接送、候机与飞行</span></div></div><ul><li>若从曼谷出发，可采用芭堤雅 → 曼谷机场 → 清迈的组合。</li><li>先确认机票是 BKK（素万那普）、DMK（廊曼）还是 UTP（乌塔堡），不要混淆机场。</li><li>接送时间与值机截止时间需按已订机票安排；这里不假设你的航班。</li></ul><a class="button outline" href="https://www.google.com/maps/search/?api=1&query=Chiang+Mai+International+Airport" target="_blank" rel="noopener noreferrer">查看清迈机场位置 ↗</a></article></div><div class="transport-local"><article class="local-card"><h3>曼谷 · 城市内</h3><p>按地点组合步行、轨道交通或打车。每天填写两个地点后，可直接查上一站到下一站的路线。</p></article><article class="local-card"><h3>芭堤雅 · 海边</h3><p>海滩、酒店与码头之间的接送按实际位置安排。如有出海行程，当天再确认海况与运营情况。</p></article><article class="local-card"><h3>清迈 · 古城与山路</h3><p>古城内可按距离步行；去山上或市外，单独预留往返时间。六人同行可提前询问接送车辆。</p></article></div><p class="transport-note">每天的「到达方式与路程」由你填写；地图链接用于查询实时路线。这里的距离与耗时是参考，不是已确认的接送安排。</p>`;
}
function allPacking(){return [...packingGroups.flatMap(g=>g.items.map(i=>({id:i[0],text:i[1]}))),...profile().customItems];}
function updatePackingProgress(){const items=allPacking(),done=items.filter(i=>profile().packed[i.id]).length,total=items.length,percent=total?Math.round(done/total*100):0;$('#packing-count').textContent=done+'/'+total;$('#preview-progress').style.width=percent+'%';$('#packing-progress').style.width=percent+'%';$('#preview-packed').textContent=done+' / '+total+' 件已准备';$('#packing-total').textContent=done+' / '+total+' 已打包';}
function renderPacking(){
  const groupHTML=(name,items,custom=false)=>{const visible=items.filter(i=>filter!=='pending'||!profile().packed[i[0]]);if(!visible.length)return '';return `<section class="packing-group"><div class="packing-group-heading"><h3>${name}</h3><span>${items.filter(i=>profile().packed[i[0]]).length}/${items.length}</span></div>${visible.map(i=>`<div class="${custom?'custom-row':''}"><label class="check-item ${profile().packed[i[0]]?'checked':''}"><input type="checkbox" data-pack="${esc(i[0])}" ${profile().packed[i[0]]?'checked':''}><span>${esc(i[1])}${i[2]?`<small>${esc(i[2])}</small>`:''}</span></label>${custom?`<button class="delete-item" data-remove-item="${esc(i[0])}" aria-label="删除${esc(i[1])}">×</button>`:''}</div>`).join('')}</section>`;};
  $('#packing-groups').innerHTML=packingGroups.map(g=>groupHTML(g.name,g.items)).join('')+groupHTML('我的补充',profile().customItems.map(i=>[i.id,i.text,'']),true)||'<p class="empty-note">都准备好了，轻松出发！</p>';
  updatePackingProgress();window.tripCloud?.access();
}
function weatherLabel(code){if(code===0)return ['☀','晴'];if([1,2].includes(code))return ['☀','晴间多云'];if(code===3)return ['☁','多云'];if([45,48].includes(code))return ['≋','雾'];if(code>=95)return ['ϟ','雷雨'];if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return ['☂','有雨'];if([71,73,75,77,85,86].includes(code))return ['❄','降雪'];return ['—','未知'];}
function n(v,suffix=''){return typeof v==='number'&&Number.isFinite(v)?Math.round(v)+suffix:'—';}
function renderWeather(){
  const dates=tripDates();
  $('#weather-preview-list').innerHTML=cities.map(c=>{const data=weatherData[c.id],curr=data?.current,w=weatherLabel(curr?.weather_code);return `<div class="weather-mini"><span class="weather-symbol" aria-hidden="true">${curr?w[0]:'—'}</span><div class="weather-mini-name">${c.name}<small>${curr?w[1]:weatherBusy?'获取中…':'暂时无法获取'}</small></div><span class="weather-mini-temp">${curr?n(curr.temperature_2m,'°'):'—'}</span></div>`;}).join('');
  $('#weather-detail').innerHTML=cities.map(c=>{
    const data=weatherData[c.id],daily=data?.daily,assigned=weatherDates(c.id),curr=data?.current;
    if(!assigned.length)return '';
    if(!daily)return `<section class="weather-city"><h3>${c.name}</h3><p class="weather-error">${weatherBusy?'正在获取真实预报…':'天气暂时无法获取。请检查网络后点击刷新；不会用模拟天气代替。'}</p></section>`;
    const indices=assigned.map(dt=>({dt,i:daily.time.indexOf(dt)}));
    const beyond=assigned.some(dt=>!daily.time.includes(dt));
    return `<section class="weather-city"><div class="weather-city-header"><div><h3>${c.name} <span class="muted">${c.en}</span></h3><p>${dateLabel(assigned[0])} — ${dateLabel(assigned.at(-1))} · 仅停留与换城日期</p></div><div class="current-temp">${weatherLabel(curr?.weather_code)[0]} ${n(curr?.temperature_2m,'°')}<small class="muted"> 现在</small></div></div><div class="forecast-list" style="--forecast-count:${indices.length}">${indices.map(({dt,i})=>{if(i<0)return `<div class="forecast-day unavailable"><strong>${dateLabel(dt)}</strong><p>暂无预报</p><small>已过去或超出预报范围</small></div>`;const w=weatherLabel(daily.weather_code[i]),inTrip=assigned.includes(dt);return `<div class="forecast-day ${inTrip?'in-trip':''}"><div class="trip-label">${inTrip?'旅行日':' '}</div><strong>${dateLabel(dt)}</strong><span class="weather-symbol" aria-hidden="true">${w[0]}</span><small>${w[1]}</small><div>${n(daily.temperature_2m_max[i],'°')} / ${n(daily.temperature_2m_min[i],'°')}</div><div class="rain">降雨 ${n(daily.precipitation_probability_max[i],'%')}</div></div>`;}).join('')}</div>${beyond?'<p class="tiny">部分日期已过去或超出预报范围；仅保留日期提示，不显示其他日期代替。</p>':''}<p class="tiny">当前天气时间：${esc(curr?.time?.replace('T',' ')||'未知')}（泰国）。温度为摄氏度，降雨为当日最高降水概率。</p></section>`;
  }).join('');
  $('#weather-updated').textContent=weatherFetchTime?'获取时间：'+weatherFetchTime+' · 泰国时间（UTC+7）':'尚未成功获取天气';
}
async function loadWeather(){
  if(weatherBusy)return;weatherBusy=true;$('#refresh-weather').disabled=true;renderWeather();
  const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:cities.map(c=>c.lat).join(','),longitude:cities.map(c=>c.lon).join(','),current:'temperature_2m,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',timezone:'Asia/Bangkok',forecast_days:'16'}).toString();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{const res=await fetch(url,{signal:controller.signal});if(!res.ok)throw Error('weather');const data=await res.json();if(!Array.isArray(data)||data.length!==3||data.some(d=>!Array.isArray(d.daily?.time)))throw Error('format');cities.forEach((c,i)=>weatherData[c.id]=data[i]);weatherFetchTime=new Intl.DateTimeFormat('zh-CN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date());}
  catch{if(weatherFetchTime)toast('刷新失败，仍显示上次获取的天气。');}
  finally{clearTimeout(timeout);weatherBusy=false;$('#refresh-weather').disabled=false;renderWeather();}
}
function renderAll(){renderBookings();renderHeader();renderItinerary();renderPacking();renderTransport();renderWeather();window.tripCloud?.access();}
function exportTrip(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='泰国旅行-'+state.start+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('六位成员与共同安排已完整导出。');}
function printTrip(){
  $('#print-content').innerHTML=`<h1>我们的泰国旅行 · ${esc(memberName())}</h1><p>${state.start} — ${state.end} · 曼谷 → 芭堤雅 → 清迈 · 日程按泰国时间；机票按各机场当地时间</p>${bookingPrint()}${tripDates().map((date,i)=>{const d=dayState(date),c=cities.find(c=>c.id===d.city);return `<section class="print-day">${renderSharedDay(date)}<h2>Day ${i+1} · ${dateLabel(date,true)} · ${c?c.name:'城市待安排'}</h2>${[...d.events].sort((a,b)=>(a.time||'99').localeCompare(b.time||'99')).map(e=>`<p><strong>${esc(e.time||'时间待定')} ${esc(e.title)}</strong>${e.duration?' · '+esc(e.duration):''}</p>${e.place?`<p>地点：${esc(e.place)}</p>`:''}${e.travel?`<p>路程：${esc(e.travel)}</p>`:''}${e.notes?`<p class="user-text">${esc(e.notes)}</p>`:''}`).join('')||'<p>活动待安排</p>'}${d.note?`<p class="user-text">备忘：${esc(d.note)}</p>`:''}</section>`;}).join('')}<h2>行李清单</h2><div class="print-packing">${allPacking().map(i=>`<p>${profile().packed[i.id]?'☑':'□'} ${esc(i.text)}</p>`).join('')}</div>`;
  window.print();
}
function renderSharedDay(date){
  if(selectedMember==='group')return '';
  const d=groupDay(date);if(!d.events.length&&!d.note)return '';
  return `<aside class="shared-day"><strong>全员共同安排</strong>${[...d.events].sort((a,b)=>(a.time||'99').localeCompare(b.time||'99')).map(e=>`<p class="user-text">${esc(e.time)} ${esc(e.title)}${e.place?' · '+esc(e.place):''}${e.notes?' · '+esc(e.notes):''}</p>`).join('')}${d.note?`<p class="user-text">${esc(d.note)}</p>`:''}<small>切换到「共同安排」可编辑</small></aside>`;
}
function bookingCard(item,kind,editable=true){
  const hotel=kind==='hotels';
  return `<article class="booking-card"><div class="event-heading"><h3>${esc(item.title)}</h3>${editable?`<div><button class="event-action" data-book-edit="${esc(item.id)}" data-kind="${kind}">编辑</button><button class="event-action delete" data-book-delete="${esc(item.id)}" data-kind="${kind}">删除</button></div>`:''}</div><p>${hotel?'入住':'出发'}：${esc(item.date||'日期待补充')} ${esc(item.time||'')}${hotel?' · 退房：'+esc(item.endDate||'待补充'):''}</p>${hotel?(item.address?`<a href="${mapSearch(item.address)}" target="_blank" rel="noopener noreferrer">⌖ ${esc(item.address)} ↗</a>`:''):`<p>${esc(item.origin||'出发机场待补充')} → ${esc(item.destination||'抵达机场待补充')}</p><p>抵达：${esc(item.arrivalDate||'日期待补充')} ${esc(item.arrivalTime||'时间待补充')}</p>${item.baggage?`<p>行李额度：${esc(item.baggage)}</p>`:''}`}<p class="user-text">${esc(item.notes)}</p></article>`;
}
function bookingPrint(){return selectedMember==='group'?'<p>个人机票与酒店请切换成员后打印。</p>':['flights','hotels'].map(kind=>`<h2>${kind==='flights'?'机票':'酒店'}</h2>${profile()[kind].map(x=>bookingCard(x,kind,false)).join('')||'<p>详情待补充</p>'}`).join('');}
function renderBookings(){
  $('#bookings-content').innerHTML=selectedMember==='group'?`<div class="empty-plan"><h3>六个人，各自安排，也一起出发。</h3><p>选择上方成员名字，即可编辑个人行程、机票和酒店。</p><div class="member-quick">${members.map(m=>`<button class="button outline" data-pick-member="${m.id}">${m.name}</button>`).join('')}</div></div>`:`<div class="section-heading"><h2>${esc(memberName())}的机票与酒店</h2><span class="muted">时间按机场 / 酒店当地时间填写</span></div><div class="booking-columns">${['flights','hotels'].map(kind=>`<section><div class="section-heading"><h3>${kind==='flights'?'我的机票':'我的酒店'}</h3><button class="button outline" data-book-add="${kind}">添加${kind==='flights'?'机票':'酒店'} +</button></div>${profile()[kind].map(x=>bookingCard(x,kind)).join('')||'<div class="empty-plan"><p>已预订 · 具体信息由你补充</p></div>'}</section>`).join('')}</div>`;
  window.tripCloud?.access();
}
function selectMember(id){if(id!=='group'&&!members.some(m=>m.id===id))return;selectedMember=id;$$('[data-member]').forEach(b=>{b.classList.toggle('active',b.dataset.member===id);b.setAttribute('aria-pressed',String(b.dataset.member===id));});renderAll();}
function openBooking(kind,id){
  if(selectedMember==='group')return;
  if(!id&&profile()[kind].length>=60){toast('最多添加 60 条预订。');return;}
  editingBooking={kind,id,member:selectedMember};const item=profile()[kind].find(x=>x.id===id)||{},hotel=kind==='hotels';
  $('#booking-dialog-title').textContent=memberName()+' · '+(id?'编辑':'添加')+(hotel?'酒店':'机票');
  const fields=hotel?[['title','酒店名称 *','text'],['date','入住日期','date'],['endDate','退房日期','date'],['address','酒店地址','text']]:[['title','航空公司 / 航班号 *','text'],['date','出发日期（出发地当地时间）','date'],['time','起飞时间','time'],['origin','出发机场 / 航站楼','text'],['destination','抵达机场 / 航站楼','text'],['arrivalDate','抵达日期（目的地当地时间）','date'],['arrivalTime','抵达时间','time'],['baggage','行李额度','text']];
  $('#booking-fields').innerHTML=fields.map(([key,label,type])=>`<label for="booking-${key}">${label}</label><input id="booking-${key}" name="${key}" type="${type}" ${type==='date'?'min="2020-01-01" max="2100-12-31"':''} maxlength="200" value="${esc(item[key])}" ${key==='title'?'required':''}>`).join('')+`<label for="booking-notes">备注</label><textarea name="notes" id="booking-notes" maxlength="2000" placeholder="集合、接送、房型等…">${esc(item.notes)}</textarea>`;
  $('#booking-dialog').showModal();$('#booking-title').focus();
}
$('#member-switch').innerHTML=[{id:'group',name:'共同安排'},...members].map(m=>`<button data-member="${m.id}" class="member-button ${m.id==='group'?'active':''}" aria-pressed="${m.id==='group'}">${m.name}</button>`).join('');
$('#member-switch').addEventListener('click',e=>{const b=e.target.closest('[data-member]');if(b)selectMember(b.dataset.member);});
$('#bookings-content').addEventListener('click',async e=>{
  const pick=e.target.closest('[data-pick-member]'),add=e.target.closest('[data-book-add]'),edit=e.target.closest('[data-book-edit]'),del=e.target.closest('[data-book-delete]');
  if(pick)selectMember(pick.dataset.pickMember);if(add)openBooking(add.dataset.bookAdd);if(edit)openBooking(edit.dataset.kind,edit.dataset.bookEdit);
  if(del&&await confirmAction('删除这条'+memberName()+'的预订？')){profile()[del.dataset.kind]=profile()[del.dataset.kind].filter(x=>x.id!==del.dataset.bookDelete);save();renderBookings();}
});
$('#close-booking').addEventListener('click',()=>$('#booking-dialog').close());
$('#booking-form').addEventListener('submit',e=>{
  e.preventDefault();if(!editingBooking)return;const {kind,id,member}=editingBooking,item={id:id||kind+'-'+crypto.randomUUID()};
  for(const [key,value] of new FormData(e.target))item[key]=value.trim();if(!item.title)return;
  if(kind==='hotels'&&item.date&&item.endDate&&item.endDate<=item.date){toast('退房日期需要晚于入住日期。');return;}
  const rows=state.members[member][kind],index=rows.findIndex(x=>x.id===id);if(index>=0)rows[index]=item;else rows.push(item);
  save();renderBookings();$('#booking-dialog').close();toast('预订已保存到 '+members.find(m=>m.id===member).name+' 的资料。');
});
$$('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));$$('[data-open]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.open)));
$('#city-cards').addEventListener('click',e=>{const b=e.target.closest('[data-city]');if(!b)return;const index=tripDates().findIndex(dt=>dayState(dt).city===b.dataset.city);selectedDay=index>=0?index:0;showTab('itinerary');if(index<0)toast('先为旅行日期选择城市，再添加安排。');});
$('#day-list').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(b){selectedDay=Number(b.dataset.day);renderItinerary();}});
$('#day-detail').addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit)openEvent(edit.dataset.edit);if(del){const day=ensureDay(tripDates()[selectedDay]);if(await confirmAction('删除这段安排？')){day.events=day.events.filter(x=>x.id!==del.dataset.delete);save();renderItinerary();}}});
$('#close-event').addEventListener('click',()=>$('#event-dialog').close());
$('#event-form').addEventListener('submit',e=>{e.preventDefault();const day=ensureDay(tripDates()[selectedDay]),event={id:editingEvent||'event-'+crypto.randomUUID()};for(const key of ['title','time','duration','place','travel','notes'])event[key]=$('#event-'+key).value.trim();if(!event.title)return;if(editingEvent){const i=day.events.findIndex(x=>x.id===editingEvent);if(i<0)return;day.events[i]=event;}else day.events.push(event);save();$('#event-dialog').close();renderItinerary();toast('这段安排已保存。');});
$('#settings-button').addEventListener('click',()=>{$('#start-date').value=state.start;$('#end-date').value=state.end;$('#travelers').value=state.travelers;$('#settings-dialog').showModal();});$('#close-settings').addEventListener('click',()=>$('#settings-dialog').close());
$('#settings-form').addEventListener('submit',e=>{e.preventDefault();try{const next=normalize({...state,start:$('#start-date').value,end:$('#end-date').value,travelers:Number($('#travelers').value)});state=next;selectedDay=0;save();renderAll();$('#settings-dialog').close();toast('行程设置已保存。');}catch(error){toast(error.message);}});
$('#packing-groups').addEventListener('change',e=>{if(!e.target.matches('[data-pack]'))return;profile().packed[e.target.dataset.pack]=e.target.checked;save();renderPacking();});
$('#packing-groups').addEventListener('click',e=>{const b=e.target.closest('[data-remove-item]');if(!b)return;profile().customItems=profile().customItems.filter(i=>i.id!==b.dataset.removeItem);delete profile().packed[b.dataset.removeItem];save();renderPacking();});
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;$$('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderPacking();}));
$('#add-item-form').addEventListener('submit',e=>{e.preventDefault();const text=$('#custom-item').value.trim();if(!text)return;if(profile().customItems.length>=100){toast('自定义物品最多 100 件。');return;}profile().customItems.push({id:'custom-'+crypto.randomUUID(),text});save();$('#custom-item').value='';filter='all';$$('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter==='all');b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));});renderPacking();toast('已加入行李清单。');});
$('#export-trip').addEventListener('click',exportTrip);$('#import-trip').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('文件过大，请选择本网页导出的 JSON 文件。');const next=normalize(JSON.parse(await file.text()));if(!await confirmAction('导入将替换此设备的全部成员、共同安排与行李清单。建议先导出备份。继续吗？'))return;state=next;selectedDay=0;save();renderAll();toast('行程已导入。');}catch{toast('无法导入：请选择本网页导出的有效 JSON 行程文件。');}finally{e.target.value='';}});
$('#print-button').addEventListener('click',printTrip);$('#refresh-weather').addEventListener('click',loadWeather);
window.addEventListener('hashchange',()=>showTab(location.hash.slice(1)));
function updateClock(){$('#thai-time').textContent='泰国时间 '+new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Bangkok'}).format(new Date());}updateClock();setInterval(updateClock,60000);
renderAll();showTab(location.hash.slice(1)||'overview');loadWeather();
// Optional WebMCP: expose the same local-only editing actions when supported.
if(document.modelContext?.registerTool){
  const abort=new AbortController();window.addEventListener('pagehide',()=>abort.abort(),{once:true});
  for(const tool of [
    {name:'read_thailand_trip',description:'Read the current device-local Thailand trip and packing list.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>structuredClone(state)},
    {name:'set_packing_status',description:'Set checked status for existing packing items on this device and update the visible checklist.',inputSchema:{type:'object',properties:{items:{type:'array',items:{type:'object',properties:{id:{type:'string'},packed:{type:'boolean'}},required:['id','packed'],additionalProperties:false}}},required:['items'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(window.tripCloud&&!window.tripCloud.canEdit())throw Error('当前成员只读');const allowed=new Set(allPacking().map(i=>i.id));if(!input||!Array.isArray(input.items)||input.items.some(i=>!i||!allowed.has(i.id)||typeof i.packed!=='boolean'))throw Error('Invalid packing item');for(const i of input.items)profile().packed[i.id]=i.packed;save();renderPacking();return {updated:input.items.length};}}
  ]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:abort.signal})).catch(()=>{});}catch{}}
}
