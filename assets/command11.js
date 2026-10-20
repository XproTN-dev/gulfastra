/* GULFASTRA X orchestration — static/GitHub-only, published data not live telemetry. */
(function(root){
"use strict";
const C=root.GXCore,M=root.GXMap,V=root.GXStream,E=root.GXExtras,$=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)];
if(!C||!M||!V||!E){document.body.textContent="GULFASTRA module failed to load.";return}
const KEY="gulfastra-x-v11";
const defaults={workspace:"global",region:"global",country:"",topic:"all",hours:72,asof:Date.now(),replay:false,
 layers:{observed:true,fires:false,outages:false,coverage:false,reference:true},
 tab:"priority",theme:"midnight",language:"en",mapStyle:"fiord",globe:false,watchlist:[],query:""};
const previous=C.loadState(KEY,{});
const S={...defaults,...previous,layers:{...defaults.layers,...previous.layers},asof:Date.now(),replay:false,
  files:{},manifest:null,channel:"connecting",warning:"",loaded:false,pending:false,lastRefresh:0,
  newlyIndexed:0,lastRenderedTab:null};
const WORK={global:"GLOBAL OVERVIEW",gulf:"GULF WATCH",maritime:"MARITIME WATCH",aviation:"AVIATION WATCH",hazards:"NATURAL HAZARDS",analyst:"ANALYST LAB"};
const store=()=>C.store(KEY,Object.fromEntries(["workspace","region","country","topic","hours","layers","tab","theme","language","mapStyle","globe","watchlist"].map(k=>[k,S[k]])));
const raw=()=>({
 allReports:C.asArray(S.files["reports.json"]?.reports),
 allEvents:C.asArray(S.files["events.json"]?.events),
 allObs:C.asArray(S.files["observations.json"]?.observations),
 allAlerts:C.asArray(S.files["alerts.json"]?.alerts),
 allAdvisories:C.asArray(S.files["advisories.json"]?.items),
 allSocial:C.asArray(S.files["social.json"]?.posts),
 supplementalSources:S.files["advisories.json"]?.sources||{},
 socialSource:S.files["social.json"]?.source||{state:"not-collected"},
 aviationSnapshot:S.files["advisories.json"]?.aviation_snapshot||null,
 providers:S.files["reports.json"]?.providers||{},
 new_alert_ids:C.asArray(S.files["alerts.json"]?.new_alert_ids),
 alerts:C.asArray(S.files["alerts.json"]?.alerts),
 events:C.asArray(S.files["events.json"]?.events)
});
const cutoff=()=>S.replay?S.asof:Date.now();
const filter=()=>({country:S.country,topic:S.topic,hours:S.hours,asof:cutoff(),query:S.query});
function filtered(){
 const data=raw(),f=filter();
 const reports=C.selectReports(data.allReports,f);
 const events=C.selectEvents(data.allEvents,f);
 const related=(title)=>{
  const t=String(title||"").toLocaleLowerCase();
  if(S.workspace==="maritime")return /\b(ship|vessel|tanker|shipping|port|maritime|naval|hormuz|strait|red sea|piracy)\b|سفن|السفن|ناقلة|ناقلات|ملاحه|ملاحة|مضيق|بحري|ميناء|موانئ/u.test(t);
  if(S.workspace==="aviation")return /\b(airspace|airport|flights?|airlines?|aviation|air traffic|runway|grounded|aircraft)\b|المطار|مطارات|المجال الجوي|الطيران|رحلات|أجواء|اجواء/u.test(t);
  return true;
 };
 return {...data,
  reports:reports.filter(r=>related(r.title)),
  events:events.filter(e=>related(e.title)||C.asArray(e.sources).some(r=>related(r.title))),
  observations:C.selectObs(data.allObs,f),
  alerts:C.selectAlerts(data.allAlerts,f),
  advisories:data.allAdvisories.filter(a=>C.within(a.published_at,f.hours,f.asof)&&
    (!f.country||String(a.title||"").toLowerCase().includes((C.COUNTRY[f.country]?.label||f.country).toLowerCase()))&&
    (!f.query||String(a.title||"").toLowerCase().includes(f.query.toLowerCase()))),
  social:data.allSocial.filter(p=>C.within(p.published_at,f.hours,f.asof)&&
    (!f.country||String(p.text||"").toLowerCase().includes((C.COUNTRY[f.country]?.label||f.country).toLowerCase()))&&
    (!f.query||String(p.text||"").toLowerCase().includes(f.query.toLowerCase()))),
  };
}
function healthy(){
 const t=C.dt(S.manifest?.collected_at);
 // Collection target is five minutes. More than three missed cycles is delayed.
 return S.channel==="live"&&Number.isFinite(t)&&Date.now()-t<15*60000&&Date.now()>=t-600000;
}
function elapsed(){return S.manifest?.collected_at?C.age(S.manifest.collected_at):"UNAVAILABLE"}
function viewContext(){return {tab:S.tab,workspace:S.workspace,channel:S.channel,quality:S.manifest?.quality_gate||"unknown",
 delayed:!healthy(),collected:S.manifest?.collected_at||null,hours:S.hours,filter:filter(),
 supplementalSources:raw().supplementalSources,socialSource:raw().socialSource,
 aviationSnapshot:raw().aviationSnapshot}}
function paintClock(){
 $("utc").textContent=new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"UTC"})+" UTC";
 if(!S.replay)S.asof=Date.now();
 if(S.loaded)paintMetrics();
}
function paintMetrics(){
 const d=filtered(),ok=healthy(),m=S.manifest;
 const ribbon=$("freshnessBar");
 if(ribbon){
  const articleTime=m?.latest_article_published_at;
  const articleAge=Number.isFinite(C.dt(articleTime))?C.age(articleTime):"UNKNOWN";
  ribbon.dataset.state=!ok?"delayed":S.newlyIndexed>0?"updated":"current";
  $("freshnessCollection").textContent="COLLECTED "+elapsed();
  $("freshnessArticle").textContent="LATEST ARTICLE "+articleAge;
  $("freshnessChecked").textContent="BROWSER CHECK "+(S.lastRefresh?C.age(new Date(S.lastRefresh).toISOString()):"WAITING");
  $("freshnessUpdates").textContent=S.newlyIndexed>0?
    "+"+S.newlyIndexed+" NEWLY INDEXED ARTICLES":"BEST-EFFORT 5-MIN TARGET · NOT REAL-TIME";
 }
 const newsAge=$("mobileNewsAge"),batchAge=$("mobileBatchAge");
 if(newsAge&&batchAge){
  const published=m?.latest_article_published_at;
  const validPub=Number.isFinite(C.dt(published));
  const ageMinutes=validPub?Math.max(0,(Date.now()-C.dt(published))/60000):Infinity;
  newsAge.textContent=validPub?C.age(published):"UNKNOWN";
  newsAge.classList.toggle("delay",!ok||ageMinutes>60);
  newsAge.title="Latest source article published at "+(published||"unknown")+
   ". This is NOT the incident time or real-time streaming.";
  batchAge.textContent="COLLECTED "+elapsed();
  batchAge.title="Last successfully completed GitHub Actions feed collection";
 }
 $("metricChannel").textContent=S.channel==="live"?"GITHUB DATA":S.channel==="fallback"?"BUNDLED SNAPSHOT":"DEGRADED DATA";
 $("metricChannelSub").textContent=S.warning||"GITHUB ACTIONS / PERIODIC FETCH";
 $("metricReports").textContent=d.reports.length.toLocaleString();
 $("metricEvents").textContent=d.events.length.toLocaleString();
 $("metricObs").textContent=d.observations.filter(o=>C.coords(o)).length.toLocaleString();
 const enabled=ok&&m?.alerts_available===true&&m?.quality_gate==="passed";
 const qualifying=enabled?d.alerts.filter(a=>a.level==="critical-reporting"&&C.dt(a.published_at)>=Date.now()-7200000):[];
 $("metricAlerts").textContent=enabled?String(qualifying.length):"UNAVAILABLE";
 $("metricAlerts").style.color=qualifying.length?"var(--warn)":"";
 $("metricHealth").textContent=ok?"HEALTHY":"DELAYED";
 $("metricHealth").style.color=ok?"var(--good)":"var(--warn)";
 $("metricHealthSub").textContent=elapsed()+" · "+(m?.healthy_sources??"?")+"/"+(m?.source_count??"?")+" SOURCES";
 $("dataTimestamp").textContent=(S.channel==="live"?"DATA BRANCH":"FALLBACK")+" · "+elapsed();
 $("mapStatus").textContent=(ok?"SOURCE CHECK ":"DELAYED ")+elapsed();
}
function controls(){
 $$("[data-workspace]").forEach(b=>b.classList.toggle("active",b.dataset.workspace===S.workspace));
 $$("[data-region]").forEach(b=>b.classList.toggle("active",b.dataset.region===S.region));
 $$("[data-hours]").forEach(b=>b.classList.toggle("active",Number(b.dataset.hours)===S.hours));
 $$("[data-topic]").forEach(b=>b.classList.toggle("active",b.dataset.topic===S.topic));
 $$("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===S.tab));
 $$("[data-layer]").forEach(b=>b.checked=!!S.layers[b.dataset.layer]);
 $("layerCount").textContent=Object.values(S.layers).filter(Boolean).length+" ENABLED";
 $("countryFilter").value=S.country;
 $("workspaceTitle").textContent=WORK[S.workspace]||WORK.global;
 $("mapSceneName").textContent=(WORK[S.workspace]||WORK.global)+" / PUBLIC SOURCES";
}
function timeline(){
 const end=Date.now(),windowH=S.hours||720,start=end-windowH*3600000;
 const d=raw(),news=C.timeline(d.allReports,"published_at",start,end,48),
       obs=C.timeline(d.allObs,"occurred_at",start,end,48),
       max=Math.max(1,...news.map((n,i)=>n+obs[i]));
 $("timelineBars").innerHTML=news.map((n,i)=>{
  const count=n+obs[i],height=Math.max(4,Math.round(count/max*43));
  return '<button class="'+(count?"has-data ":"")+(S.replay&&i>Number($("timelineScrub").value)*.48?"":"active")+
   '" data-bin="'+i+'" style="height:'+height+'px" title="'+count+' publications / observations in this bin" aria-label="'+count+' public records in bin '+(i+1)+'"></button>';
 }).join("");
 $("timelineStart").textContent=S.hours?S.hours+"H AGO":"30D AGO";
 $("timelineEnd").textContent="NOW";
 $("timelineChosen").textContent=S.replay?"CUTOFF "+C.date(new Date(S.asof).toISOString()):"CURRENT VIEW";
 $("timelineLabel").textContent="ACTUAL PUBLICATION / OBSERVATION HISTOGRAM";
}
function render(){
 if(!S.loaded)return;
 const d=filtered();
 controls();paintMetrics();
 const stream=$("stream"),position=stream.scrollTop;
 const sameTab=S.lastRenderedTab===S.tab;
 V.render(viewContext(),d);
 stream.scrollTop=sameTab?position:0;
 S.lastRenderedTab=S.tab;
 timeline();
 M.update({observations:d.observations,reports:d.reports,layers:S.layers,country:S.country});
}
function period(hours){
 S.hours=hours;S.asof=Date.now();S.replay=false;$("timelineScrub").value=100;store();render();
}
function workspace(name){
 if(!WORK[name])return;
 S.workspace=name;S.country="";S.query="";
 if(name==="global"){S.region="global";S.hours=72;S.topic="all";S.tab="priority"}
 if(name==="gulf"){S.region="gulf";S.hours=72;S.topic="all";S.tab="priority"}
 if(name==="maritime"){S.region="gulf";S.hours=168;S.topic="transport";S.tab="events"}
 if(name==="aviation"){S.region="gulf";S.hours=72;S.topic="transport";S.tab="news"}
 if(name==="hazards"){S.region="gulf";S.hours=168;S.topic="all";S.layers.observed=true;S.tab="priority"}
 if(name==="analyst"){S.region="global";S.hours=168;S.topic="all";S.tab="brief"}
 S.replay=false;S.asof=Date.now();$("timelineScrub").value=100;
 M.focus(S.region);store();render();
}
async function refresh(){
 if(S.pending)return;
 S.pending=true;
 try{
  const wasLoaded=S.loaded,priorReports=C.asArray(S.files["reports.json"]?.reports);
  const priorIds=new Set(priorReports.map(r=>r.id).filter(Boolean));
  const result=await C.load({manifest:S.manifest,files:S.files});
  S.files={...S.files,...result.files};S.channel=result.status;S.manifest=result.manifest;
  S.warning=result.warning;S.lastRefresh=Date.now();S.loaded=true;
  if(result.changed&&wasLoaded){
   S.newlyIndexed=C.asArray(S.files["reports.json"]?.reports)
    .filter(r=>r.id&&!priorIds.has(r.id)).length;
  }else if(!wasLoaded){S.newlyIndexed=0}
  // A newly published archive must not snap the analyst panel back to the
  // first article while the reader is scrolling. Unchanged archives never
  // rebuild the stream, which also avoids mobile layout churn.
  if(!wasLoaded||result.changed){
   const stream=$("stream"),scroll=wasLoaded?stream.scrollTop:0;
   render();
   if(wasLoaded&&scroll>0)stream.scrollTop=scroll;
  }else paintMetrics();
  if(!wasLoaded||result.changed)E.notifyCritical();
 }catch(error){
  S.warning="Refresh failed: "+String(error).slice(0,120);S.channel="partial";
  if(!S.loaded){S.loaded=true;render()}else paintMetrics();
  E.notify(S.warning);
 }finally{S.pending=false}
}
function setup(){
 for(const [id,c] of Object.entries(C.COUNTRY)){
  const opt=document.createElement("option");opt.value=id;opt.textContent=c.label;$("countryFilter").appendChild(opt);
 }
 V.init(raw,()=>viewContext(),c=>{S.country=c;store();render()});
 E.init({save:store,render,refresh,workspace,period,getData:raw,getFiltered:filtered},S);
 const mapSettings={style:S.mapStyle,region:S.region,globe:S.globe};
 const mapClick=(kind,id)=>V.showDossier(kind,id);
 const initialMap=M.init(mapClick,mapSettings);
 if(!initialMap) {
  // The ES module bootstrap has already tried same-origin then CDN fallback.
  console.warn("Map could not initialize:",window.GXMapLibraryError||"WebGL or style initialization failed");
 }
 $$("[data-workspace]").forEach(b=>b.onclick=()=>workspace(b.dataset.workspace));
 $$("[data-region]").forEach(b=>b.onclick=()=>{S.region=b.dataset.region;M.focus(S.region);store();render()});
 $$("[data-hours]").forEach(b=>b.onclick=()=>period(Number(b.dataset.hours)));
 $$("[data-topic]").forEach(b=>b.onclick=()=>{S.topic=b.dataset.topic;store();render()});
 $$("[data-tab]").forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;store();render()});
 $$("[data-layer]").forEach(b=>b.onchange=()=>{
  S.layers[b.dataset.layer]=b.checked;store();render();
  if(b.dataset.layer==="fires"&&b.checked&&!raw().allObs.some(o=>o.kind==="thermal-detection"))E.notify("FIRMS data not configured: a free NASA key is required. No simulated thermal pins.");
 });
 $("countryFilter").onchange=e=>{S.country=e.target.value;store();render()};
 $("resetFilters").onclick=()=>{S.country="";S.query="";S.topic="all";period(72)};
 $("collapseLayers").onclick=()=>{
  if(window.innerWidth<=900){
   $("app").classList.remove("mobile-layers");
   $("tabletLayersButton").setAttribute("aria-expanded","false");
  }else document.body.classList.toggle("collapsed");
  requestAnimationFrame(M.resize);
 };
 $("tabletLayersButton").onclick=()=>{
  const open=$("app").classList.toggle("mobile-layers");
  $("tabletLayersButton").setAttribute("aria-expanded",String(open));
  requestAnimationFrame(M.resize);
 };
 $("refresh").onclick=refresh;
 $("mapStyle").onclick=()=>{S.mapStyle=M.changeStyle();store()};
 $("mapGlobe").onclick=()=>{S.globe=!S.globe;if(!M.projection(S.globe)){S.globe=false;E.notify("Globe projection unsupported")}store()};
 $("mapReset").onclick=()=>M.focus(S.region);
 $("zoomIn").onclick=()=>M.zoom(1);
 $("zoomOut").onclick=()=>M.zoom(-1);
 $("dossierClose").onclick=V.hideDossier;$("dossierBackdrop").onclick=V.hideDossier;
 $("stream").onclick=e=>{
  const action=e.target.closest("[data-action]");
  if(action?.dataset.action==="load-x-timelines"){V.loadXTimelines();return}
  const el=e.target.closest("[data-open]");
  if(el)V.showDossier(el.dataset.open,el.dataset.id);
 };
 $("dossierContent").onclick=e=>{
  const f=e.target.closest("[data-filter-country]");if(f){S.country=f.dataset.filterCountry;V.hideDossier();store();render();return}
  const el=e.target.closest("[data-open]");if(el)V.showDossier(el.dataset.open,el.dataset.id);
 };
 $("timelineNow").onclick=()=>{S.replay=false;S.asof=Date.now();$("timelineScrub").value=100;render()};
 $("timelineScrub").oninput=e=>{
  const p=Number(e.target.value)/100;S.replay=p<.999;S.asof=Date.now()-(1-p)*(S.hours||720)*3600000;render();
 };
 $("timelineBars").onclick=e=>{const bin=e.target.closest("[data-bin]");if(!bin)return;
  $("timelineScrub").value=Math.min(100,Math.round((Number(bin.dataset.bin)+1)*100/48));
  $("timelineScrub").dispatchEvent(new Event("input"));
 };
 window.addEventListener("resize",M.resize);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
 controls();paintClock();refresh();
 setInterval(paintClock,15000);
 setInterval(()=>{if(!document.hidden)refresh()},60000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
root.GXApp={getState:()=>S,refresh,workspace,period,render};
})(window);
