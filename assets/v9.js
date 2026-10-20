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
const state={reports:[],events:[],sources:{},manifest:null,windows:new Map(),sequence:100,newsLimit:28,country:"",currentMode:"map",palette:"phosphor",lastError:null};
const names={
 wire:{title:"PUBLIC INTELLIGENCE WIRE",icon:"▤",foot:"ORIGINAL PUBLISHED HEADLINES · UNVERIFIED"},
 verify:{title:"EVIDENCE & VERIFICATION",icon:"◈",foot:"SOURCE CORRELATION IS NOT INCIDENT CONFIRMATION"},
 hormuz:{title:"HORMUZ / MARITIME WATCH",icon:"≋",foot:"PUBLIC MARITIME HEADLINES · NOT VESSEL TELEMETRY"},
 alerts:{title:"SECURITY REPORTING",icon:"◇",foot:"HEADLINE ALERTS ONLY · NOT EMERGENCY GUIDANCE"},
 sources:{title:"SOURCE HEALTH",icon:"⌁",foot:"PER-PROVIDER COLLECTION STATUS"},
 timeline:{title:"PUBLICATION TIMELINE",icon:"▥",foot:"PUBLICATION DATES · NOT EVENT OCCURRENCE"},
 lab:{title:"ANALYST LAB",icon:"⌘",foot:"SOURCE REVIEW · QUERY · REPLAY"}
};
function health(){
 const provider=Object.entries(state.sources||{});
 const ok=provider.filter(([,v])=>v?.ok===true).length;
 const status=window.GulfastraData?.info()||{};
 const manifest=status.manifest||state.manifest;
 const channel=status.channel==="data-branch"?"PUBLIC GITHUB DATA":status.channel==="static-fallback"?"BUNDLED SNAPSHOT":status.channel==="cached-branch"?"CACHED DATA":"CHECKING DATA";
 $("v9DataStatus").textContent=channel+" / "+ok+"/"+provider.length+" SOURCES / "+(manifest?.collected_at?age(manifest.collected_at):"COLLECTING");
 $("v9TickerAge").textContent=manifest?.latest_article_published_at?"NEWEST "+age(manifest.latest_article_published_at):"DATA CHECKING";
 $("v9DataStatus").title="Source: "+channel+". Data timestamp: "+(manifest?.collected_at?shortTime(manifest.collected_at):"pending")+". Not live weapon tracking.";
}
function ticker(){
 const usable=state.reports.filter(r=>r.title&&/^https:\/\//i.test(r.url||"")).slice().sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
 const seen=new Set(),items=[];
 for(const r of usable){
  const key=r.title.toLowerCase().trim().replace(/[^\p{L}\p{N}]/gu," ").replace(/\s+/g," ");
  if(seen.has(key))continue;
  seen.add(key);items.push(r);
  if(items.length>=12)break;
 }
 const html=items.map(r=>'<a dir="auto" target="_blank" rel="noopener noreferrer" href="'+esc(validURL(r.url))+'">'+esc(r.title)+' <small>['+esc(r.source||"SOURCE")+']</small></a>').join("");
 $("v9TickerItems").innerHTML=html?html+html:'AWAITING PUBLIC SOURCE REPORTING';
}
function filteredNews({maritime=false,alerts=false}={}){
 const maritimeTerms=/hormuz|strait|tanker|shipping|vessel|maritime|naval|port|harbor|هرمز|مضيق|ملاحة|ناقلات|سفن|السفن|ميناء|موانئ/i;
 return state.reports.filter(r=>(!state.country||(r.countries||[r.country]).includes(state.country))&&
 (!maritime||maritimeTerms.test(r.title||""))&&(!alerts||r.category==="security")&&
 (!alerts||Date.now()-new Date(r.published_at).getTime()<86400000))
 .sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
}
function newsItem(r){
 const rtl=r.language==="ar"||/[\u0600-\u06ff]/.test(r.title||"");
 return '<article class="v9-news"><div class="v9-news-top"><span class="v9-tag">'+esc((r.category||"REGIONAL").toUpperCase())+'</span>'+
 '<span>'+esc(age(r.published_at))+'</span><span>◉ '+esc(r.country||"REGIONAL")+'</span></div>'+
 '<h3 dir="'+(rtl?"rtl":"ltr")+'">'+esc(r.title)+'</h3>'+
 '<span class="v9-news-source" dir="auto">'+esc(r.source||"Published outlet")+'</span> '+
 '<a href="'+esc(validURL(r.url))+'" target="_blank" rel="noopener noreferrer">READ ORIGINAL ↗</a></article>';
}
function sourceRow(name,p){
 const status=p.ok===true?"OK":p.ok===false?"ERROR":"BACKOFF";
 return '<div class="v9-source-line"><strong dir="auto">'+esc(name)+'</strong><span class="'+(p.ok===true?"":"bad")+'">'+
 status+(p.ok===true?" · "+esc(p.relevant??p.items??""):"")+'</span></div>';
}
function timelineHtml(){
 const days=new Map();
 for(const r of state.reports){const day=(r.published_at||"").slice(0,10);if(day)days.set(day,(days.get(day)||0)+1)}
 const items=[...days].sort((a,b)=>a[0].localeCompare(b[0])).slice(-14),max=Math.max(1,...items.map(x=>x[1]));
 return '<div class="v9-timeline-grid">'+items.map(([day,count])=>'<div class="v9-timeline-row"><span>'+esc(day)+'</span><i style="width:'+Math.max(3,Math.round(count/max*100))+'%"></i><b>'+count+'</b></div>').join("")+'</div>';
}
function panelContent(type){
 if(type==="wire"){
  const a=filteredNews();
  return '<p>ORIGINAL PUBLIC ARTICLES / '+a.length+' IN ARCHIVE '+(state.country?" / "+esc(state.country.toUpperCase()):"")+'</p>'+
  (a.length?a.slice(0,state.newsLimit).map(newsItem).join(""):'<div class="v9-empty">No headlines in this country filter. Try clearing the map selection.</div>')+
  '<button class="v9-lab-button" data-v9-action="more">LOAD MORE</button>';
 }
 if(type==="verify"){
  const events=state.events.filter(e=>!state.country||(e.countries||[]).includes(state.country)).slice(0,40);
  return '<p>Related published sources are grouped for review. These are NOT independently confirmed incidents.</p>'+
    events.map(e=>'<article class="v9-news"><div class="v9-news-top"><span class="v9-tag">'+esc(e.category||"SOURCE")+'</span>'+
    '<span>'+esc(e.report_count)+" ARTICLES · "+esc(e.publisher_count)+' OUTLETS</span></div><h3 dir="auto">'+esc(e.title)+'</h3>'+
    '<small class="v9-news-source">'+esc((e.countries||[]).join(", "))+'</small></article>').join("")+
    '<button class="v9-lab-button" data-v9-action="verify-full">OPEN COMPLETE EVIDENCE WORKBENCH ↗</button>';
 }
 if(type==="hormuz"){
  const a=filteredNews({maritime:true});
  return '<p>GULF SHIPPING & STRAIT COVERAGE / '+a.length+' SOURCE HEADLINES<br>Not direct AIS or official UKMTO ingestion.</p>'+
   (a.length?a.slice(0,35).map(newsItem).join(""):'<div class="v9-empty">No maritime headlines match current filters.</div>')+
   '<a class="v9-lab-button" href="https://www.ukmto.org/" target="_blank" rel="noopener noreferrer">UKMTO ORIGINAL BULLETINS ↗</a>';
 }
 if(type==="alerts"){
  const a=filteredNews({alerts:true});
  return '<p>Security-classified reporting published within 24 hours, not verified warnings. Use official local emergency services for safety guidance.</p>'+
   (a.length?a.slice(0,28).map(newsItem).join(""):'<div class="v9-empty">No security-classified published headlines in this window.</div>');
 }
 if(type==="sources"){
  const providers=Object.entries(state.sources||{});
  return '<p>'+providers.filter(([,p])=>p.ok===true).length+' OF '+providers.length+' SOURCES SUCCEEDED AT LAST COLLECTION. Browser data channel: '+
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
}
function ensurePanel(type){
 if(type==="lab"){ /* Lab also has floating launch pad */ }
 const existing=state.windows.get(type);
 if(existing){existing.style.zIndex=++state.sequence;existing.querySelector(".v9-panel-body").innerHTML=panelContent(type);return existing}
 if(state.windows.size>=4){const oldest=state.windows.keys().next().value;closePanel(oldest)}
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
 document.querySelectorAll('[data-v9-panel="'+type+'"]').forEach(b=>b.classList.add("active"));
 panel.querySelector(".v9-panel-close").onclick=()=>closePanel(type);
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
  if(action==="refresh")reload();
 });
 return panel;
}
function togglePanel(type){if(state.windows.has(type))closePanel(type);else ensurePanel(type)}
function syncPanels(){
 for(const [type,panel] of state.windows){const content=panel.querySelector(".v9-panel-body");if(content)content.innerHTML=panelContent(type)}
}
function mapMode(mode){
 const map=window.__gulfastraMap;
 if(mode==="wire"){ensurePanel("wire");return}
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
  const [reports,events]=await Promise.allSettled([window.GulfastraData.get("reports.json"),window.GulfastraData.get("events.json")]);
  if(reports.status==="fulfilled"){state.reports=reports.value.reports||[];state.sources=reports.value.providers||{}}
  if(events.status==="fulfilled")state.events=events.value.events||[];
  state.manifest=window.GulfastraData.info()?.manifest||null;
  health();ticker();syncPanels();
 }catch(e){state.lastError=String(e)}
}
function bind(){
 document.querySelectorAll("[data-v9-panel]").forEach(b=>b.addEventListener("click",()=>togglePanel(b.dataset.v9Panel)));
 document.querySelectorAll("[data-v9-mode]").forEach(b=>b.addEventListener("click",()=>mapMode(b.dataset.v9Mode)));
 $("v9ZoomIn").onclick=()=>window.__gulfastraMap?.zoomIn({duration:250});
 $("v9ZoomOut").onclick=()=>window.__gulfastraMap?.zoomOut({duration:250});
 $("v9Reset").onclick=()=>mapMode("map");
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
  if(["reports.json","events.json"].includes(e.detail?.name))reload();
 });
 window.addEventListener("gulfastra:source",()=>{state.manifest=window.GulfastraData.info()?.manifest;health()});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)reload()});
 window.addEventListener("resize",()=>{window.__gulfastraMap?.resize()});
}
async function init(){
 bind();let palette="phosphor";
 try{palette=localStorage.getItem("gulfastra-v9-palette")||palette}catch(_){}
 appearance(palette);await reload();setInterval(()=>{if(!document.hidden)reload()},30000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();