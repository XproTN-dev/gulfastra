/* GULFASTRA / COMMAND VIEW 09.
   An original interactive command UI. Visual model: user's world-monitor-style reference.
   Data integrity: country references and source articles are NOT live incident locations.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const validURL=x=>/^https:\/\//i.test(x||"")?x:"#";
const shortTime=x=>{const d=new Date(x);return Number.isFinite(+d)?d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"UNKNOWN"};
const age=x=>{const t=Date.now()-new Date(x).getTime();if(!Number.isFinite(t))return"UNKNOWN";const m=Math.max(0,Math.floor(t/60000));return m<1?"JUST NOW":m<60?m+"M":m<1440?Math.floor(m/60)+"H":Math.floor(m/1440)+"D"};
const ageLong=x=>{const t=Date.now()-new Date(x).getTime();if(!Number.isFinite(t))return"TIME UNKNOWN";const m=Math.max(0,Math.floor(t/60000));return m<1?"LESS THAN 1 MIN AGO":m<60?m+" MIN AGO":m<1440?Math.floor(m/60)+" HR AGO":Math.floor(m/1440)+" DAY AGO"};
function headline(record){
 const raw=String(record?.title||"").trim(),source=String(record?.source||"").trim();
 const match=raw.match(/^(.+?)\s+[-—|]\s+([^—|]+)$/u);
 if(!match||!source)return raw;
 const clean=x=>x.toLowerCase().replace(/^www\./,"").replace(/[^\p{L}\p{N}]/gu,"");
 const suffix=clean(match[2]),origin=clean(source);
 return suffix&&origin&&(suffix===origin||suffix===origin.replace(/com$|net$|org$/,""))?match[1].trim():raw;
}
function maritimeRelevant(record){
 const t=headline(record).toLowerCase();
 const specific=/strait of hormuz|hormuz strait|مضيق\s*هرمز|مضيق\s*باب\s*المندب|bab.el.mandeb/i;
 const water=/shipping|tanker|vessel|merchant ship|maritime|port (?:closure|operations|traffic)|sea lane|naval blockade|commercial shipping|ship traffic|حركة\s*السفن|الشحن\s*البحري|الملاحة|الناقلات|ناقلة|السفن|سفينة|ميناء|موانئ|الموانئ|البحر\s*الاحمر|البحر\s*العربي/i;
 const region=/hormuz|الخليج|هرمز|gulf|iran|إيران|ايران|qatar|قطر|bahrain|البحرين|oman|عمان|emirates|الإمارات|saudi|السعودية|red sea|البحر\s*الأحمر|yemen|اليمن|kuwait|الكويت/i;
 return specific.test(t)||(water.test(t)&&region.test(t));
}
const state={reports:[],events:[],sources:{},manifest:null,windows:new Map(),sequence:100,newsLimit:28,newsWindowHours:72,coverageWindow:"recent",country:"",currentMode:"map",palette:"phosphor",lastError:null,renderSignature:null,alerts:[],newAlertIds:[],alertFeedVersion:null};
const names={
 wire:{title:"PUBLIC INTELLIGENCE WIRE",icon:"▤",foot:"ORIGINAL PUBLISHED HEADLINES · UNVERIFIED"},
 verify:{title:"EVIDENCE & VERIFICATION",icon:"◈",foot:"SOURCE CORRELATION IS NOT INCIDENT CONFIRMATION"},
 hormuz:{title:"HORMUZ / MARITIME WATCH",icon:"≋",foot:"PUBLIC MARITIME HEADLINES · NOT VESSEL TELEMETRY"},
 alerts:{title:"CRITICAL REPORTING WATCH",icon:"◇",foot:"UNVERIFIED PUBLIC CLAIMS · NOT OFFICIAL SAFETY WARNINGS"},
 sources:{title:"SOURCE HEALTH",icon:"⌁",foot:"PER-PROVIDER COLLECTION STATUS"},
 timeline:{title:"PUBLICATION TIMELINE",icon:"▥",foot:"PUBLICATION DATES · NOT EVENT OCCURRENCE"},
 lab:{title:"ANALYST LAB",icon:"⌘",foot:"SOURCE REVIEW · QUERY · REPLAY"}
};
function health(){
 const provider=Object.entries(state.sources||{});
 const ok=provider.filter(([,v])=>v?.ok===true).length;
 const status=window.GulfastraData?.info()||{};
 const manifest=status.manifest||state.manifest;
 const versions=status.dataVersions||{};
 const fromBranch=Boolean(versions["reports.json"]&&versions["reports.json"]!=="bundled-fallback");
 const channel=fromBranch?"PUBLIC GITHUB DATA":status.channel==="cached-branch"?"CACHED DATA":status.channel==="static-fallback"?"BUNDLED SNAPSHOT":"CONNECTING DATA";
 const stale=manifest?.collected_at&&(Date.now()-new Date(manifest.collected_at).getTime()>20*60000);
 $("v9DataStatus").textContent=(stale?"DELAYED · ":"")+channel+" / "+ok+"/"+provider.length+" SOURCES / "+(manifest?.collected_at?ageLong(manifest.collected_at):"COLLECTING");
 $("v9TickerAge").textContent=manifest?.latest_article_published_at?"ARTICLE "+ageLong(manifest.latest_article_published_at):"ARTICLE TIME UNKNOWN";
 $("v9DataStatus").title="Source: "+channel+". Data timestamp: "+(manifest?.collected_at?shortTime(manifest.collected_at):"pending")+". Not live weapon tracking.";
}
function ticker(){
 const usable=state.reports.filter(r=>r.title&&/^https:\/\//i.test(r.url||"")&&
  Date.now()-new Date(r.published_at).getTime()>=-600000&&
  Date.now()-new Date(r.published_at).getTime()<=72*3600000)
  .slice().sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
 const seen=new Set(),items=[];
 for(const r of usable){
  const key=r.title.toLowerCase().trim().replace(/[^\p{L}\p{N}]/gu," ").replace(/\s+/g," ");
  if(seen.has(key))continue;
  seen.add(key);items.push(r);
  if(items.length>=12)break;
 }
 const html=items.map(r=>'<a dir="auto" target="_blank" rel="noopener noreferrer" href="'+esc(validURL(r.url))+'">'+esc(headline(r))+' <small>['+esc(r.source||"SOURCE")+']</small></a>').join("");
 $("v9TickerItems").innerHTML=html?html+html:'NO RECENT PUBLIC REPORTING · ARCHIVE AVAILABLE IN INTEL WIRE';
}
function alertCurrent(a){
 const t=new Date(a.published_at).getTime();
 const collected=new Date(state.manifest?.collected_at).getTime();
 // No stale alarms: if collection stops, previously generated alerts expire.
 return Number.isFinite(t)&&t<=Date.now()+600000&&Date.now()-t<=2*3600000&&
   (!Number.isFinite(collected)||(collected<=Date.now()+600000&&Date.now()-collected<=30*60000));
}
function alertBadge(){
 const critical=state.alerts.filter(a=>alertCurrent(a)&&a.level==="critical-reporting"&&
   (!state.country||(a.countries||[]).includes(state.country)));
 const banner=$("v9CriticalBanner");
 if(!banner)return;
 banner.hidden=critical.length===0;
 banner.textContent=critical.length?"◇ "+critical.length+" CRITICAL REPORTING":"";
 banner.title="Unverified recently published reports; not live incident detection or emergency guidance";
}
function notifyNewAlerts(){
 const channel=window.GulfastraData?.info()?.dataVersions?.["alerts.json"];
 if(!channel||channel==="bundled-fallback"||document.hidden)return;
 const ids=state.alerts.filter(a=>alertCurrent(a)&&a.level==="critical-reporting").map(a=>a.id);
 const key="gulfastra-alerts-seen-v1";
 let previous=null;
 try{previous=JSON.parse(localStorage.getItem(key)||"null")}catch(_){}
 // First visit is a baseline, not a reason to issue a backlog notification.
 if(!Array.isArray(previous)){
  try{localStorage.setItem(key,JSON.stringify(ids.slice(0,300)))}catch(_){}
  return;
 }
 const seen=new Set(previous),upcoming=state.alerts.filter(a=>
  alertCurrent(a)&&a.level==="critical-reporting"&&state.newAlertIds.includes(a.id)&&!seen.has(a.id));
 try{localStorage.setItem(key,JSON.stringify([...new Set([...ids,...previous])].slice(0,300)))}catch(_){}
 if(!upcoming.length)return;
 if("Notification" in window&&Notification.permission==="granted"){
  const top=upcoming[0];
  new Notification("GULFASTRA · CRITICAL PUBLIC REPORTING",{
    body:top.title.slice(0,180)+" · Unverified, check official guidance.",
    tag:"gulfastra-report-"+top.id
  });
 }
}
function criticalContent(){
 const filtered=state.alerts.filter(a=>alertCurrent(a)&&
  (!state.country||(a.countries||[]).includes(state.country)));
 const serious=filtered.filter(a=>a.level==="critical-reporting");
 const watch=filtered.filter(a=>a.level!=="critical-reporting");
 const entry=a=>{
  const links=(a.source_urls||[]).filter(v=>/^https:\/\//i.test(v.url||""))
   .map(v=>'<a href="'+esc(validURL(v.url))+'" target="_blank" rel="noopener noreferrer">'+esc(v.name||"SOURCE")+' ↗</a>').join(" ");
  return '<article class="v9-news v9-critical-report"><div class="v9-news-top"><span class="v9-tag '+(a.level==="critical-reporting"?"v9-critical-level":"")+'">'+
   esc(a.level==="critical-reporting"?"CRITICAL REPORTING":"REVIEW / SINGLE OUTLET")+'</span><span>'+esc(age(a.published_at))+'</span></div>'+
   '<h3 dir="auto">'+esc(headline(a))+'</h3><p>'+esc(a.outlet_count||0)+' named outlets · '+esc((a.countries||[]).join(", ")||"REGIONAL")+
   ' · PUBLIC CLAIM NOT VERIFIED</p><div class="v9-verify-links">'+links+'</div></article>';
 };
 const optIn=("Notification" in window&&Notification.permission!=="granted"&&Notification.permission!=="denied")?
  '<button class="v9-lab-button" data-v9-action="notify-opt-in">ENABLE IN-TAB CRITICAL REPORT NOTIFICATIONS</button>':"";
 const collected=state.manifest?.collected_at;
 const stale=collected&&Date.now()-new Date(collected).getTime()>30*60000;
 return '<p>'+(stale?'DATA COLLECTION DELAYED — ABSENCE OF ALERTS IS NOT AN ALL-CLEAR. ':'')+
  'WARNING: These are newly published, keyword-screened public reports, NOT confirmed incidents, continuous detection, or emergency instructions. Old/historical/speculative headlines cannot trigger this alert feed. Collection is best-effort.</p>'+
 optIn+'<h4>'+serious.length+' RECENT MULTI-OUTLET CANDIDATE'+(serious.length===1?"":"S")+'</h4>'+
 (serious.length?serious.map(entry).join(""):'<div class="v9-empty">No qualifying critical public reporting in the latest two-hour window.</div>')+
 (watch.length?'<h4>'+watch.length+' SINGLE-OUTLET ITEMS REQUIRING REVIEW</h4>'+watch.slice(0,12).map(entry).join(""):"");
}
function filteredNews({maritime=false,alerts=false}={}){
 return state.reports.filter(r=>(!state.country||(r.countries||[r.country]).includes(state.country))&&
 (!maritime||maritimeRelevant(r))&&(!alerts||r.category==="security")&&
 (!alerts||Date.now()-new Date(r.published_at).getTime()<86400000)&&
 ((alerts||state.newsWindowHours===0)||
  (Number.isFinite(new Date(r.published_at).getTime())&&
   Date.now()-new Date(r.published_at).getTime()>=-600000&&
   Date.now()-new Date(r.published_at).getTime()<=state.newsWindowHours*3600000)))
 .sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
}
function newsItem(r){
 const rtl=r.language==="ar"||/[\u0600-\u06ff]/.test(r.title||"");
 const hours=(Date.now()-new Date(r.published_at).getTime())/3600000;
 const stateName=hours<0?"DATE REVIEW":hours<2?"NEW REPORT":hours<24?"RECENT":hours<168?"OLDER":"ARCHIVE";
 const context=r.context==="retrospective"?" · HISTORICAL CONTEXT":r.context==="speculative"?" · SPECULATIVE":r.context==="denial"?" · DENIAL":"";
 const dateLabel=r.date_quality==="index-first-seen"?"FIRST INDEXED":"PUBLISHED";
 return '<article class="v9-news"><div class="v9-news-top"><span class="v9-tag">'+esc((r.category||"REGIONAL").toUpperCase())+'</span>'+
 '<span>'+esc(stateName+context)+'</span><span>'+esc(dateLabel+" "+age(r.published_at))+'</span><span>◉ '+esc(r.country||"REGIONAL")+'</span></div>'+
 '<h3 dir="'+(rtl?"rtl":"ltr")+'">'+esc(headline(r))+'</h3>'+
 '<span class="v9-news-source" dir="auto">'+esc(r.source||"Published outlet")+'</span> '+
 '<a href="'+esc(validURL(r.url))+'" target="_blank" rel="noopener noreferrer">OPEN ARTICLE LINK ↗</a></article>';
}
function sourceRow(name,p){
 const status=p.ok===true?"OK":p.ok===false?"ERROR":"BACKOFF";
 return '<div class="v9-source-line"><strong dir="auto">'+esc(name)+'</strong><span class="'+(p.ok===true?"":"bad")+'">'+
 status+(p.ok===true?" · "+esc(p.relevant??p.items??""):"")+'</span></div>';
}
function timelineHtml(){
 const days=new Map();
 for(const r of state.reports){const day=(r.published_at||"").slice(0,10);if(day)days.set(day,(days.get(day)||0)+1)}
 const cutoff=Date.now()-14*86400000;
 const items=[...days].filter(([day])=>{const t=new Date(day+"T00:00:00Z").getTime();return Number.isFinite(t)&&t>=cutoff&&t<=Date.now()+86400000}).sort((a,b)=>a[0].localeCompare(b[0]));
 const max=Math.max(1,...items.map(x=>x[1]));
 return '<div class="v9-timeline-grid">'+items.map(([day,count])=>'<div class="v9-timeline-row"><span>'+esc(day)+'</span><i style="width:'+Math.max(3,Math.round(count/max*100))+'%"></i><b>'+count+'</b></div>').join("")+'</div>';
}
function panelContent(type){
 if(type==="wire"){
  const a=filteredNews();
  const periods=[[24,"24H"],[72,"72H"],[168,"7 DAYS"],[0,"ARCHIVE"]];
  const controls='<div class="v9-verify-links">'+periods.map(([hours,label])=>
    '<button class="v9-lab-button" style="padding:6px;'+(hours===state.newsWindowHours?'color:var(--cmd-accent);':'')+
    '" data-v9-action="wire-window" data-hours="'+hours+'">'+label+'</button>').join("")+'</div>';
  return '<p>PUBLIC REPORTING BY PUBLICATION TIME / '+a.length+' ARTICLES '+(state.country?" / "+esc(state.country.toUpperCase()):"")+
   '. NEW REPORTING DOES NOT MEAN AN INCIDENT IS CURRENTLY ACTIVE.</p>'+controls+
  (a.length?a.slice(0,state.newsLimit).map(newsItem).join(""):'<div class="v9-empty">No reporting in this time window. Select ARCHIVE for older sources.</div>')+
  '<button class="v9-lab-button" data-v9-action="more">LOAD MORE</button>';
 }
 if(type==="verify"){
  const periods=[["current","ACTIVE COVERAGE / 2H"],["recent","LAST 24H"],["all","ARCHIVE"]];
  const controls='<div class="v9-verify-links">'+periods.map(([key,label])=>
   '<button class="v9-lab-button" data-v9-action="coverage-filter" data-window="'+key+'" style="padding:6px;'+
   (state.coverageWindow===key?'color:var(--cmd-accent);':'')+'">'+label+'</button>').join("")+'</div>';
  const events=state.events.filter(e=>(!state.country||(e.countries||[]).includes(state.country))&&
    (state.coverageWindow==="all"||
     (state.coverageWindow==="current"?Boolean(e.current_reporting):
      ["new-coverage","developing-coverage","renewed-coverage","recent-coverage"].includes(e.coverage_stage))))
   .slice(0,40);
  const entries=events.map(e=>{
    const sourceList=Array.isArray(e.sources)?e.sources:[];
    const publisherNames=new Set(sourceList.map(x=>String(x.source||"").trim().toLowerCase()).filter(Boolean));
    const publishers=publisherNames.size||Number(e.publisher_count)||0;
    const headlineCount=sourceList.length||Number(e.report_count)||0;
    const attribution=publishers>0?publishers+" NAMED OUTLET"+(publishers>1?"S":""):"ORIGIN UNAVAILABLE";
    const review=e.wording_review?.review_required?'<span class="v9-tag v9-warning">WORDING REVIEW</span>':"";
    const links=sourceList.filter(x=>/^https:\/\//i.test(x.url||"")).slice(0,5).map(x=>
      '<a href="'+esc(validURL(x.url))+'" target="_blank" rel="noopener noreferrer">'+esc(x.source||"ORIGINAL ARTICLE")+' ↗</a>').join("");
    return '<article class="v9-news v9-verify"><div class="v9-news-top"><span class="v9-tag">'+
      esc((e.category||"SOURCE").toUpperCase())+'</span><span class="v9-tag">'+
      esc(String(e.coverage_stage||"publication-time-unknown").replace(/-/g," ").toUpperCase())+
      '</span><span>'+headlineCount+
      ' REPORT'+(headlineCount===1?"":"S")+' · '+esc(attribution)+'</span>'+review+'</div><h3 dir="auto">'+
      esc(headline(e))+'</h3><small class="v9-news-source">'+esc((e.countries||[]).join(", ")||"REGIONAL")+
      ' · '+esc(e.corroboration||"UNVERIFIED")+
      ' · INCIDENT STATUS '+esc((e.incident_status||"UNKNOWN").toUpperCase())+
      '</small><div class="v9-verify-links">'+
      (links||'<span>Source URLs not present in this record</span>')+'</div></article>';
  });
  return '<p>Publication activity can be new, developing, quiet or archived. It is NOT evidence an incident is currently active or resolved.</p>'+
   controls+(entries.length?entries.join(""):'<div class="v9-empty">No matching publication coverage. Try LAST 24H or ARCHIVE.</div>')+
   '<button class="v9-lab-button" data-v9-action="verify-full">OPEN COMPLETE EVIDENCE WORKBENCH ↗</button>';
 }
 if(type==="hormuz"){
  const a=filteredNews({maritime:true});
  return '<p>GULF MARITIME KEYWORD MATCHES / '+a.length+' ARTICLES IN '+(state.newsWindowHours?state.newsWindowHours+" HOURS":"ARCHIVE")+
   '<br>These are candidate maritime reports, not verified incidents or live AIS/UKMTO data.</p>'+
   (a.length?a.slice(0,35).map(newsItem).join(""):'<div class="v9-empty">No maritime headlines match current filters.</div>')+
   '<a class="v9-lab-button" href="https://www.ukmto.org/" target="_blank" rel="noopener noreferrer">UKMTO ORIGINAL BULLETINS ↗</a>';
 }
 if(type==="alerts")return criticalContent();
 if(type==="sources"){
  const providers=Object.entries(state.sources||{});
  const quality=state.manifest?.quality_gate||"unknown";
  const danger=quality!=="passed"?'<p class="v9-warning">ALERT SYSTEM QUALITY GATE: '+esc(quality.toUpperCase())+
   '. Critical alert delivery may be disabled; zero alerts is not an all-clear.</p>':"";
  return danger+'<p>'+providers.filter(([,p])=>p.ok===true).length+' OF '+providers.length+' SOURCES SUCCEEDED AT LAST COLLECTION. Browser data channel: '+
  esc(window.GulfastraData?.info()?.channel||"unknown")+'.</p>'+
  providers.map(([n,p])=>sourceRow(n,p)).join("")+
  '<button class="v9-lab-button" data-v9-action="refresh">RECHECK PUBLIC ARCHIVE ↻</button>';
 }
 if(type==="timeline")return '<p>REPORTS BY ORIGINAL PUBLICATION DATE. No incident-date reconstruction.</p>'+timelineHtml()+
   '<button class="v9-lab-button" data-v9-action="timeline-full">OPEN REPLAY ANALYTICS ↗</button>';
 if(type==="lab")return '<p>GULFASTRA ANALYST WORKSPACE / EVIDENCE · QUERY · SOURCE HEALTH · SITREP</p>'+
  '<button class="v9-lab-button" data-v9-action="query-full">⌘ OPEN QUERY CONSOLE</button>'+
  '<button class="v9-lab-button" data-v9-action="fusion-full">◈ OPEN EVENT FUSION</button>'+
  '<button class="v9-lab-button" data-v9-action="sitrep-full">▤ SITUATION REPORT</button>'+
  '<button class="v9-lab-button" data-v9-action="sources-full">◉ SOURCE DIAGNOSTICS</button>';
 return '<div class="v9-empty">No content available.</div>';
}
function closePanel(type){
 const node=state.windows.get(type);if(!node)return;
 node.remove();state.windows.delete(type);
 document.querySelectorAll('[data-v9-panel="'+type+'"]').forEach(b=>b.classList.remove("active"));
 if(type==="wire"&&state.currentMode==="wire"){state.currentMode="map";document.querySelectorAll("[data-v9-mode]").forEach(b=>b.classList.toggle("active",b.dataset.v9Mode==="map"))}
}
function tilePanels(){
 if(matchMedia("(max-width:640px)").matches)return;
 const area=$("v9Panels");if(!area)return;
 const panels=[...state.windows.values()];
 if(!panels.length)return;
 const gap=12,width=area.clientWidth,height=area.clientHeight;
 const cols=Math.min(panels.length,Math.max(1,Math.floor((width+gap)/360)));
 const rows=Math.ceil(panels.length/cols);
 const w=Math.min(430,Math.floor((width-gap*(cols-1))/cols));
 const h=Math.min(440,Math.max(190,Math.floor((height-gap*(rows-1))/rows)));
 panels.forEach((panel,i)=>{
  const c=i%cols,r=Math.floor(i/cols);
  panel.style.width=w+"px";panel.style.height=h+"px";
  panel.style.left=c*(w+gap)+"px";panel.style.top=r*(h+gap)+"px";
 });
}
function ensurePanel(type){
 if(type==="lab"){ /* Lab also has floating launch pad */ }
 const existing=state.windows.get(type);
 if(existing){existing.style.zIndex=++state.sequence;existing.querySelector(".v9-panel-body").innerHTML=panelContent(type);return existing}
 if(matchMedia("(max-width:640px)").matches){for(const open of [...state.windows.keys()])closePanel(open)}
 else if(state.windows.size>=4){const oldest=state.windows.keys().next().value;closePanel(oldest)}
 const info=names[type];if(!info)return;
 const panel=document.createElement("section");
 panel.className="v9-panel";panel.dataset.panel=type;panel.setAttribute("aria-label",info.title);
 panel.style.left=(8+state.windows.size*17)+"%";panel.style.top=(10+state.windows.size*9)+"%";panel.style.zIndex=++state.sequence;
 panel.innerHTML='<div class="v9-panel-titlebar"><span class="v9-panel-icon">'+info.icon+'</span><strong class="v9-panel-title">'+
 esc(info.title)+'</strong><span class="v9-panel-meta">PUBLIC OSINT</span>'+
 '<button class="v9-panel-close" title="Close window" aria-label="Close '+esc(info.title)+'">✕</button></div>'+
 '<div class="v9-panel-body">'+panelContent(type)+'</div>'+
 '<footer class="v9-panel-foot"><span>'+esc(info.foot)+'</span><button class="v9-panel-top" title="Bring to front">▣</button></footer>';
 $("v9Panels").appendChild(panel);state.windows.set(type,panel);
 tilePanels();
 document.querySelectorAll('[data-v9-panel="'+type+'"]').forEach(b=>b.classList.add("active"));
 panel.querySelector(".v9-panel-close").onclick=()=>closePanel(type);
 panel.querySelector(".v9-panel-top").onclick=()=>{panel.style.zIndex=++state.sequence;panel.querySelector(".v9-panel-titlebar").focus?.()};
 panel.addEventListener("pointerdown",()=>{panel.style.zIndex=++state.sequence});
 panel.querySelector(".v9-panel-titlebar").addEventListener("pointerdown",event=>{
  if(event.button!==0||event.target.closest("button")||matchMedia("(max-width:640px)").matches)return;
  const handle=event.currentTarget,box=$("v9Panels").getBoundingClientRect(),position=panel.getBoundingClientRect();
  const fromX=event.clientX,fromY=event.clientY,left=position.left-box.left,top=position.top-box.top;
  handle.setPointerCapture(event.pointerId);
  const move=e=>{
   const x=Math.max(0,Math.min(box.width-position.width,left+e.clientX-fromX));
   const y=Math.max(0,Math.min(box.height-position.height,top+e.clientY-fromY));
   panel.style.left=x+"px";panel.style.top=y+"px";
  };
  const end=()=>{handle.removeEventListener("pointermove",move);handle.removeEventListener("pointerup",end);handle.removeEventListener("pointercancel",end)};
  handle.addEventListener("pointermove",move);handle.addEventListener("pointerup",end);handle.addEventListener("pointercancel",end);
 });
 panel.addEventListener("click",event=>{
  const b=event.target.closest("[data-v9-action]");if(!b)return;
  const action=b.dataset.v9Action;
  const dispatch={ "verify-full":"verify","timeline-full":"timeline","query-full":"query","fusion-full":"fusion","sitrep-full":"sitrep","sources-full":"sources" };
  if(dispatch[action]){document.querySelector('[data-gf-open="'+dispatch[action]+'"]')?.click();return}
  if(action==="more"){state.newsLimit+=35;panel.querySelector(".v9-panel-body").innerHTML=panelContent("wire")}
  if(action==="wire-window"){state.newsWindowHours=Number(b.dataset.hours)||0;state.newsLimit=28;
   panel.querySelector(".v9-panel-body").innerHTML=panelContent("wire");panel.querySelector(".v9-panel-body").scrollTop=0}
  if(action==="coverage-filter"){state.coverageWindow=b.dataset.window||"recent";
   panel.querySelector(".v9-panel-body").innerHTML=panelContent("verify");panel.querySelector(".v9-panel-body").scrollTop=0}
  if(action==="refresh")reload();
  if(action==="notify-opt-in"&&"Notification" in window&&Notification.permission==="default"){
   Notification.requestPermission().then(()=>{panel.querySelector(".v9-panel-body").innerHTML=panelContent("alerts")});
  }
 });
 return panel;
}
function togglePanel(type){if(state.windows.has(type))closePanel(type);else ensurePanel(type)}
function syncPanels(){
 for(const [type,panel] of state.windows){
  const content=panel.querySelector(".v9-panel-body");
  if(!content)continue;
  const scrollY=content.scrollTop;
  content.innerHTML=panelContent(type);
  content.scrollTop=scrollY;
 }
}
function mapMode(mode){
 const map=window.__gulfastraMap;
 if(mode==="wire"){ensurePanel("wire");state.currentMode="wire";document.querySelectorAll("[data-v9-mode]").forEach(b=>b.classList.toggle("active",b.dataset.v9Mode==="wire"));return}
 if(!map){return}
 if(mode==="globe"){
  if(typeof map.setProjection==="function"){
   try{map.setProjection({type:"globe"});map.flyTo({center:[49,27],zoom:2.15,duration:900});
    state.currentMode="globe"}catch(e){state.lastError=String(e);ensurePanel("lab");return}
  }else{state.lastError="3D globe projection unsupported";ensurePanel("lab");return}
 }else{
  if(typeof map.setProjection==="function")try{map.setProjection({type:"mercator"})}catch(_){}
  map.flyTo({center:[43,28],zoom:3.3,duration:850});state.currentMode="map";
 }
 document.querySelectorAll("[data-v9-mode]").forEach(b=>b.classList.toggle("active",b.dataset.v9Mode===state.currentMode));
}
function appearance(theme){
 const allowed=["phosphor","arctic","ember"];if(!allowed.includes(theme))return;
 state.palette=theme;document.body.dataset.v9Palette=theme;
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=theme==="phosphor"?"#050b09":theme==="arctic"?"#061019":"#110e09";
 document.querySelectorAll("[data-v9-theme]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v9Theme===theme)));
 try{localStorage.setItem("gulfastra-v9-palette",theme)}catch(_){}
}
function filterToggle(){
 const el=$("controlpanel");el.classList.toggle("v9-show");
 if(!el.classList.contains("v9-show"))el.classList.remove("open");
}
async function reload(){
 if(!window.GulfastraData)return;
 try{
  const [reports,events,alerts]=await Promise.allSettled([
    window.GulfastraData.get("reports.json"),
    window.GulfastraData.get("events.json"),
    window.GulfastraData.get("alerts.json")]);
  if(reports.status==="fulfilled"){state.reports=reports.value.reports||[];state.sources=reports.value.providers||{}}
  if(events.status==="fulfilled")state.events=events.value.events||[];
  if(alerts.status==="fulfilled"){
    state.alerts=alerts.value.alerts||[];
    state.newAlertIds=alerts.value.new_alert_ids||[];
  }
  const info=window.GulfastraData.info();
  state.manifest=info?.manifest||null;
  const stamp=[info?.dataVersions?.["reports.json"]||"snapshot",info?.dataVersions?.["events.json"]||"snapshot",
    info?.dataVersions?.["alerts.json"]||"snapshot",state.reports.length,state.events.length,
    state.reports[0]?.published_at||""].join("|");
  health();alertBadge();notifyNewAlerts();
  if(stamp!==state.renderSignature){
    state.renderSignature=stamp;
    ticker();syncPanels();
  }
 }catch(e){state.lastError=String(e)}
}

function populateCountries(){
 const list=$("v9CountryList");if(!list)return;
 const countries=window.__gulfastraGeography||{};
 list.innerHTML=Object.entries(countries).map(([key,value])=>
  '<option value="'+esc(value.label||key)+'"></option>').join("");
}
function locate(){
 const input=$("v9Locate");if(!input)return;
 const q=input.value.trim().toLowerCase();if(!q)return;
 const countries=window.__gulfastraGeography||{};
 const match=Object.entries(countries).find(([key,value])=>key.toLowerCase()===q||(value.label||"").toLowerCase()===q)
  ||Object.entries(countries).find(([key,value])=>(value.label||key).toLowerCase().includes(q));
 if(!match){input.setCustomValidity("Country not found in Gulfastra reference regions");input.reportValidity();return}
 input.setCustomValidity("");
 const [key,value]=match,map=window.__gulfastraMap;
 state.country=key;
 if(map){map.flyTo({center:value.center,zoom:5.1,duration:600})}
 input.value=value.label||key;
 ensurePanel("wire");
}
function registerMapPreview(){
 let tooltip=null;
 function destroy(){tooltip?.remove();tooltip=null}
 document.addEventListener("pointerover",event=>{
  if(event.pointerType==="touch")return;
  const marker=event.target.closest(".country-pin");
  if(!marker||marker.contains(event.relatedTarget))return;
  destroy();
  const country=marker.dataset.country,geo=window.__gulfastraGeography?.[country];
  // The map pin is computed from the ACTIVE map filters. The full archive can be
  // much larger: never label its size as the marker's visible reporting count.
  const visibleCount=marker.querySelector(".pin-number")?.textContent?.trim()||"0";
  const list=state.reports.filter(r=>(r.countries||[r.country]).includes(country))
   .sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
  const box=marker.getBoundingClientRect();
  tooltip=document.createElement("div");tooltip.className="v9-tooltip";
  tooltip.innerHTML='<strong>'+esc(geo?.label||country)+' · '+esc(visibleCount)+' MAP-FILTERED HEADLINES</strong>'+
   '<small>COUNTRY MENTIONS · NOT EXACT EVENT POSITIONS</small>'+
   (list.length?'<span dir="auto">'+esc(headline(list[0]))+'</span><small>NEWEST INDEXED ARTICLE · '+esc(shortTime(list[0].published_at))+'</small>':'');
  document.body.appendChild(tooltip);
  const left=Math.min(window.innerWidth-250,Math.max(8,box.right+12));
  const top=Math.min(window.innerHeight-110,Math.max(43,box.top-24));
  tooltip.style.left=left+"px";tooltip.style.top=top+"px";
 });
 document.addEventListener("pointerout",event=>{
  const marker=event.target.closest(".country-pin");
  if(marker&&!marker.contains(event.relatedTarget))destroy();
 });
 window.addEventListener("scroll",destroy,{passive:true});
}
function bind(){
 document.querySelectorAll("[data-v9-panel]").forEach(b=>b.addEventListener("click",()=>togglePanel(b.dataset.v9Panel)));
 document.querySelectorAll("[data-v9-mode]").forEach(b=>b.addEventListener("click",()=>mapMode(b.dataset.v9Mode)));
 $("v9CriticalBanner")?.addEventListener("click",()=>ensurePanel("alerts"));
 $("v9Tile")?.addEventListener("click",tilePanels);
 $("v9MobileTile")?.addEventListener("click",()=>{tilePanels();$("v9MobileMenu").hidden=true;$("v9MobileToolsButton").setAttribute("aria-expanded","false")});
 $("v9MobileToolsButton")?.addEventListener("click",()=>{
  const menu=$("v9MobileMenu"),open=menu.hidden;
  menu.hidden=!open;$("v9MobileToolsButton").setAttribute("aria-expanded",String(open));
 });
 document.querySelectorAll("#v9MobileMenu [data-v9-panel]").forEach(b=>b.addEventListener("click",()=>{
  $("v9MobileMenu").hidden=true;$("v9MobileToolsButton").setAttribute("aria-expanded","false");
 }));
 $("v9ZoomIn").onclick=()=>window.__gulfastraMap?.zoomIn({duration:250});
 $("v9ZoomOut").onclick=()=>window.__gulfastraMap?.zoomOut({duration:250});
 $("v9Reset").onclick=()=>{state.country="";$("v9Locate").value="";syncPanels();mapMode("map")};
 $("v9LocateGo").onclick=locate;
 $("v9Locate").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();locate()}});
 populateCountries();registerMapPreview();
 $("v9Filters").onclick=filterToggle;
 $("v9MobileFilters").onclick=filterToggle;
 $("closeLayers").addEventListener("click",()=>{$("controlpanel").classList.remove("v9-show")});
 $("v9Appearance").onclick=()=>{$("v9AppearanceMenu").hidden=!$("v9AppearanceMenu").hidden};
 document.querySelectorAll("[data-v9-theme]").forEach(b=>b.addEventListener("click",()=>{
  appearance(b.dataset.v9Theme);$("v9AppearanceMenu").hidden=true;
 }));
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
   $("v9AppearanceMenu").hidden=true;$("controlpanel").classList.remove("v9-show");
   if($("v9MobileMenu"))$("v9MobileMenu").hidden=true;
   $("v9MobileToolsButton")?.setAttribute("aria-expanded","false");
   const top=[...state.windows].sort((a,b)=>Number(b[1].style.zIndex)-Number(a[1].style.zIndex))[0];
   if(top)closePanel(top[0]);
  }
 });
 // Stop legacy country marker click from scrolling to the hidden old feed. Use actual country tags for filtering.
 document.addEventListener("click",event=>{
  const marker=event.target.closest(".country-pin");
  if(!marker||!marker.dataset.country)return;
  event.stopImmediatePropagation();event.preventDefault();
  state.country=marker.dataset.country;
  ensurePanel("wire");
  const map=window.__gulfastraMap;
  const pos=window.__gulfastraGeography?.[state.country]?.center;
  if(map&&pos)map.easeTo({center:pos,zoom:Math.max(map.getZoom(),4.3),duration:450});
 },true);
 window.addEventListener("gulfastra:data-changed",e=>{
  if(["reports.json","events.json","alerts.json"].includes(e.detail?.name))reload();
 });
 window.addEventListener("gulfastra:source",()=>{state.manifest=window.GulfastraData.info()?.manifest;health()});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)reload()});
 window.addEventListener("resize",()=>{window.__gulfastraMap?.resize();tilePanels()});
}
async function init(){
 bind();let palette="phosphor";
 try{palette=localStorage.getItem("gulfastra-v9-palette")||palette}catch(_){}
 appearance(palette);await reload();setInterval(()=>{if(!document.hidden)reload()},30000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();