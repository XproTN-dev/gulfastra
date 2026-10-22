/* GULFASTRA X Impact Lab — interactive publication replay and source investigations. */
(function(root){
"use strict";
const C=root.GXCore,R=root.GXImpactRender;
if(!C||!R){document.body.textContent="Impact Lab modules could not initialize.";return}
const $=id=>document.getElementById(id),$$=q=>[...document.querySelectorAll(q)];
const KEY="gulfastra-lab-v12",VISITED="gulfastra-lab-visited-v1";
const DEFAULT={view:"map",country:"",category:"all",mode:"network",hours:48,
 mapHours:1,theme:"crimson",zoom:1,lang:"en"};
const saved=C.loadState(KEY,{});
const S={...DEFAULT,...saved,files:{},manifest:null,status:"checking",warning:"",loaded:false,pending:false,
 asof:Date.now(),scrub:100,selected:null,graphFocus:null,prior:null,visits:{new:0,changed:0},lastCheck:null};
if(!["map","graph","timeline","markets","compare","pathways","brief"].includes(S.view))S.view="map";
if(![1,2,6,12,24,48,168].includes(Number(S.mapHours)))S.mapHours=1;
if(!["crimson","carbon","matrix","arctic"].includes(S.theme))S.theme="crimson";
// All screen sizes use readable topic clusters by default, never a dense label cloud.
const color={security:"#e78f73",transport:"#74b4ed",diplomacy:"#a799ea",other:"#69cfaa"};
const words={
 en:{
  map:["LATEST SOURCE EVIDENCE","LIVE INTELLIGENCE MAP","Latest published news, official advisories and independent observations. Country markers are not incident positions."],
  graph:["SOURCE-BACKED COVERAGE","INTELLIGENCE LANDSCAPE","Explore reporting topics and original evidence. Relationships are shared metadata, not proven cause."],
  timeline:["CHRONOLOGICAL EVIDENCE","PUBLICATION TIME EXPLORER","Scrub a real publication timeline. These are publication dates, not incident occurrence times."],
  markets:["ECONOMIC CONTEXT","FRED MARKET & MACRO SERIES","Actual provider observations only. Different series have different publication delays."],
  compare:["HISTORICAL CONTEXT","2008 VS. RECENT OBSERVATIONS","Compare raw published indicators, not global collapse probabilities."],
  pathways:["SCENARIO EXPLORATION","HYPOTHETICAL IMPACT PATHWAYS","Mechanisms to investigate. No current geopolitical event is asserted to cause the listed effects."],
  brief:["DAILY INTELLIGENCE","SOURCE-BACKED DAILY BRIEF","A deterministic summary of reporting and official records from the latest 24 hours."]
 },
 ar:{
  map:["أحدث البيانات المنشورة","خريطة المراقبة المباشرة","أخبار حديثة وتنبيهات رسمية ومشاهدات مستقلة، مع تمييز مواقع الدول عن مواقع الأحداث."],
  graph:["تحليل التغطية المنشورة","مشهد الأخبار والتحليل","استكشف مواضيع التغطية ومصادرها الأصلية. التشابه في الأخبار لا يثبت السببية."],
  timeline:["التسلسل الزمني","مستكشف أوقات النشر","استعرض تاريخ نشر الأخبار الحقيقي، لا توقيت وقوع الحوادث."],
  markets:["المؤشرات الاقتصادية","بيانات الأسواق والاقتصاد من FRED","مشاهدات فعلية منشورة بتواتر مختلف. ليست أسعارا لحظية."],
  compare:["المقارنة التاريخية","بيانات 2008 مقابل المؤشرات الحالية","مقارنة قيم منشورة وليست احتمال انهيار الاقتصاد."],
  pathways:["سيناريوهات تفسيرية","مسارات التأثير المحتملة","فرضيات للتحليل لا تنبؤات أو إثباتات لوقوع الأحداث."],
  brief:["الموجز اليومي","موجز مع مصادر أصلية","تلخيص محدد القواعد لأخبار آخر 24 ساعة."]
 }
};
const AR_CHROME={
 views:{map:"◎ الخريطة الحية",graph:"◉ شبكة الأخبار",timeline:"◷ التسلسل الزمني",markets:"⌁ الأسواق والمؤشرات",
 compare:"⇄ مقارنة ٢٠٠٨",pathways:"⤳ مسارات التأثير",brief:"▤ الموجز اليومي"},
 modes:{network:"المواضيع",chronology:"العناوين",spatial:"العلاقات"},
 controls:["الجغرافيا","نوع التغطية","عرض الشبكة"],
 metrics:["مجموعات التغطية","روابط مواضيع مشتركة","سلاسل اقتصادية فعلية","موجز آخر ٢٤ ساعة"],
 title:"أدوات التحليل",method:"ⓘ المنهجية",reset:"إعادة ضبط",
 now:"↪ الآن",reference:"المصادر والمنهجية"
};
const EN_CHROME={
 views:{map:"◎ LIVE MAP",graph:"◉ EVENT NETWORK",timeline:"◷ TIME EXPLORER",markets:"⌁ MARKET INDICATORS",
 compare:"⇄ 2008 COMPARISON",pathways:"⤳ IMPACT PATHWAYS",brief:"▤ DAILY BRIEF"},
 modes:{network:"TOPICS",chronology:"HEADLINES",spatial:"RELATIONS"},
 controls:["GEOGRAPHY","REPORTING CATEGORY","NETWORK PRESENTATION"],
 metrics:["RELATED COVERAGE","METADATA CONNECTIONS","OBSERVED MACRO SERIES","LAST 24H BRIEFING"],
 title:"RESEARCH CONTROLS",method:"ⓘ METHODOLOGY",reset:"RESET",
 now:"↪ NOW",reference:"PROVENANCE & LIMITS"
};
function translateChrome(){
 const p=S.lang==="ar"?AR_CHROME:EN_CHROME;
 document.documentElement.lang=S.lang;
 document.documentElement.dir=S.lang==="ar"?"rtl":"ltr";
 $$("[data-view]").forEach(b=>{b.textContent=p.views[b.dataset.view]||b.textContent});
 $$("[data-mode]").forEach(b=>{b.textContent=p.modes[b.dataset.mode]||b.textContent});
 $$("#labControls label").forEach((b,i)=>{if(i<3)b.textContent=p.controls[i]});
 $$(".lab-metrics small").forEach((b,i)=>{if(i<4)b.textContent=p.metrics[i]});
 document.querySelector(".filter-top .kicker").textContent=p.title;
 $("labExplain").textContent=p.method;$("resetLab").textContent=p.reset;
 $("labNow").textContent=p.now;
 $("labLang").textContent=S.lang==="en"?"EN / عربي":"العربية / EN";
}
const esc=C.esc;
function applyTheme(theme){
 if(!["crimson","carbon","matrix","arctic"].includes(theme))theme="crimson";
 S.theme=theme;document.body.dataset.theme=theme;
 $("labTheme").value=theme;
 const mobile=document.querySelector('meta[name="theme-color"]');
 if(mobile)mobile.setAttribute("content",theme==="arctic"?"#eef2f6":
   theme==="matrix"?"#020a08":theme==="carbon"?"#080a0d":"#050506");
 save();
}
const save=()=>C.store(KEY,Object.fromEntries(["view","country","category","mode","hours","mapHours","theme","zoom","lang"].map(k=>[k,S[k]])));
const raw=(key,defaultValue)=>S.files[key]??defaultValue;
const graph=()=>raw("impact_graph.json",{nodes:[],edges:[]});
const markets=()=>raw("markets.json",{series:{},source_status:{}});
const brief=()=>raw("daily_brief.json",{developments:[],recent_official_advisories:[]});
const graphData=()=>R.filtered(graph(),{country:S.country,category:S.category,cutoff:S.asof,hours:S.hours});
function toast(message){
 const e=$("labToast");e.textContent=message;e.classList.add("open");
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove("open"),3500);
}
function closeContext(){
 $("impactApp").classList.remove("context-open");
 backdrop();
}
function openContext(title,body){
 $("contextTitle").textContent=title;
 $("contextContent").innerHTML=body;
 $("impactApp").classList.add("context-open");
 backdrop();
 if(root.innerWidth<=950)$("contextClose").focus();
}
function backdrop(){
 // Desktop context is an ordinary docked rail: an invisible modal backdrop
 // there would block the stage. Only phone/tablet drawers need the scrim.
 const sheet=(root.innerWidth<=950)&&(
  $("impactApp").classList.contains("filters-open")||
  $("impactApp").classList.contains("context-open"));
 $("labBackdrop").hidden=!sheet;
}
function closeLayers(){$("impactApp").classList.remove("filters-open");backdrop()}
function contextEvent(id){
 const n=graph().nodes?.find(x=>x.id===id);
 if(!n)return;
 S.selected=id;
 const links=C.asArray(n.sources).map(s=>{
  const url=C.validUrl(s.url);
  return url?'<a class="context-link" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">'+
   esc(s.publisher||"SOURCE")+" · "+esc(C.date(s.published_at))+
   '<div dir="auto">'+esc(s.title||"Read original published report")+'</div></a>':"";
 }).join("");
 openContext(n.title,
  '<div class="context-warning">A correlated published claim is not a verified incident. Publisher counts are not independent verification, and country mentions do not identify an exact event location.</div>'+
  '<div class="context-row"><small>REPORTING CATEGORY</small>'+esc(n.category||"other")+
   ' · '+esc(n.topic||"unknown")+'</div>'+
  '<div class="context-row"><small>LOCATIONS MENTIONED</small>'+esc(C.asArray(n.countries).join(", ")||"Not established")+'</div>'+
  '<div class="context-row"><small>PUBLICATION TIME</small>'+esc(C.date(n.published_at))+
   ' · '+esc(n.coverage_stage||"unknown")+'</div>'+
  '<div class="context-row"><small>LINKED PUBLISHER NAMES</small>'+Number(n.publisher_count||0)+
   ' · '+Number(n.report_count||0)+' linked articles</div>'+
  '<h3>ORIGINAL PUBLISHED EVIDENCE</h3>'+links+
  '<p class="context-meta">Source-based grouping · no inferred casualty total · no asserted ongoing status.</p>');
 // Keep the investigated topic list in position; selection does not redraw it.
}
function contextEdge(id){
 const [left,right]=id.split("|"),a=graph().nodes?.find(x=>x.id===left),b=graph().nodes?.find(x=>x.id===right);
 const edge=graph().edges?.find(x=>(x.source===left&&x.target===right)||(x.source===right&&x.target===left));
 if(!a||!b||!edge)return;
 openContext("RELATED PUBLIC COVERAGE",
  '<div class="context-warning">This dashed line is shared metadata, NOT evidence of direct influence, event causation or independent corroboration.</div>'+
  '<div class="context-row"><small>LINK BASIS</small>'+
  esc(edge.kind)+' · '+esc(edge.shared_topic)+'</div>'+
  '<div class="context-row"><small>SHARED GEOGRAPHIC MENTIONS</small>'+
  esc(C.asArray(edge.shared_countries).join(", "))+'</div>'+
  '<button class="chronology-item" data-node="'+esc(a.id)+'"><strong dir="auto">'+esc(a.title)+'</strong></button>'+
  '<button class="chronology-item" data-node="'+esc(b.id)+'"><strong dir="auto">'+esc(b.title)+'</strong></button>'+
  '<p>Review the original sources for each report before drawing any causal conclusions.</p>');
}
function contextMarket(id){
 const m=markets().series?.[id];if(!m)return;
 const recent=C.asArray(m.recent).slice(-12);
 openContext(m.name,
 '<div class="context-warning">A published economic series is not a real-time market quote. Its latest observation date may differ from the date it was retrieved.</div>'+
 '<div class="context-row"><small>LATEST PUBLISHED PERIOD</small>'+
 esc(m.last_observation?.date)+' · '+esc(m.last_observation?.value)+' '+esc(m.unit)+'</div>'+
 '<div class="context-row"><small>COLLECTED</small>'+esc(m.retrieved_at)+'</div>'+
 '<div class="context-row"><small>COLLECTION STATUS</small>'+esc(markets().source_status?.[id]||"unknown")+'</div>'+
 '<h3>RECENT ORIGINAL VALUES</h3>'+
 recent.map(p=>'<div class="context-row"><small>'+esc(p[0])+'</small>'+esc(p[1])+' '+esc(m.unit)+'</div>').join("")+
 '<a class="context-link" target="_blank" rel="noopener noreferrer" href="'+esc(C.validUrl(m.url))+'">OPEN FRED SOURCE SERIES ↗</a>');
}
function contextPathway(id){
 const p=R.PATHWAYS.find(x=>x.id===id);if(!p)return;
 openContext(p.label,
 '<div class="context-warning">HYPOTHETICAL ECONOMIC TRANSMISSION MECHANISM — NOT a fact about current events, a model probability, or a verified causal edge.</div>'+
 '<div class="pathway-chain">'+p.chain.map((n,i)=>(i?"<b>→</b>":"")+'<span>'+esc(n)+'</span>').join("")+'</div>'+
 '<h3>MECHANISM & LIMITATIONS</h3><p>'+esc(p.mechanism)+'</p>'+
 '<p class="context-meta">'+esc(p.evidence)+'</p>');
}
function markVisit(){
 const stored=C.loadState(VISITED,null);
 const snap=Object.fromEntries(C.asArray(graph().nodes).map(n=>[n.id,n.digest||""]));
 S.prior=stored&&typeof stored==="object"&&stored.digests?stored:null;
 if(!S.prior){
  S.visits={new:0,changed:0,firstVisit:true};
  C.store(VISITED,{saved_at:new Date().toISOString(),digests:snap});
 }else{
  const old=S.prior.digests||{};
  const newer=Object.keys(snap).filter(id=>!(id in old)).length;
  const changed=Object.keys(snap).filter(id=>id in old&&snap[id]!==old[id]).length;
  S.visits={new:newer,changed,firstVisit:false};
 }
}
function showStatus(){
 const m=S.manifest,stamp=C.dt(m?.collected_at),delayed=!(S.status==="live"&&
   Number.isFinite(stamp)&&Date.now()-stamp<45*60000);
 $("labStatus").dataset.level=delayed?"delayed":"current";
 $("labFreshness").textContent="NEWS COLLECTED "+(m?.collected_at?C.age(m.collected_at):"UNKNOWN")+
   (delayed?" · DELAYED":"");
 const mm=markets();
 const times=Object.values(mm.series||{}).map(s=>C.dt(s.retrieved_at)).filter(Number.isFinite);
 $("labMacroAge").textContent="MACRO DOWNLOAD "+(times.length?
   C.age(new Date(Math.max(...times)).toISOString()):"UNAVAILABLE");
 $("labNew").textContent=S.visits.firstVisit?"FIRST VISIT · BASELINE SAVED":
  S.visits.new+" NEW / "+S.visits.changed+" UPDATED SINCE LAST VISIT";
 const d=graphData();
 $("mNodes").textContent=d.nodes.length.toLocaleString();
 $("mEdges").textContent=d.edges.length.toLocaleString();
 $("mSeries").textContent=Object.keys(mm.series||{}).length;
 $("mBrief").textContent=Number(brief().groups||0).toLocaleString();
}
function view(view){
 if(!words.en[view])return;
 S.view=view;
 closeLayers();closeContext();
 $$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 $$("[data-mobile-view]").forEach(b=>b.classList.toggle("active",b.dataset.mobileView===view));
 const trans=words[S.lang]||words.en;
 const [eyebrow,title,description]=trans[view];
 $("stageEyebrow").textContent=eyebrow;$("stageTitle").textContent=title;
 $("stageDescription").textContent=description;
 $("graphFooter").hidden=!["map","graph","timeline"].includes(view);
 save();render();
}
function renderGraph(){
 const g=graphData(),mode=S.mode;
 if(!g.nodes.length){
  S.graphFocus=null;
  $("stageContent").innerHTML='<div class="state-empty">No published reporting groups match these filters and dates. Expand the period or select another country. Absence of coverage is not an all-clear.</div>';
  return;
 }
 if(mode==="chronology"){
  $("stageContent").innerHTML='<div class="cluster-dashboard"><div class="cluster-overview-intro"><div>'+
   '<span class="kicker">ORIGINAL PUBLISHED HEADLINES</span><h2>Publication chronology</h2>'+
   '<p>'+g.nodes.length+' source-linked groups, most recently reported first. Select a headline for publisher evidence.</p></div></div>'+
   R.chronology(g)+'</div>';
 }else if(mode==="spatial"){
  $("stageContent").innerHTML=R.relationExplorer(g);
 }else{
  $("stageContent").innerHTML=R.clusterOverview(g,S.graphFocus);
 }
}
function renderTimeline(){
 const g=graphData(),sorted=[...g.nodes].sort((a,b)=>C.dt(b.published_at)-C.dt(a.published_at));
 const max=Math.max(1,...Object.values(sorted.reduce((a,n)=>{a[n.category]=(a[n.category]||0)+1;return a},{})));
 const reportRadar=R.radar(sorted);
 $("stageContent").innerHTML='<div class="data-grid"><div class="data-card"><span class="kicker">PUBLICATION DISTRIBUTION</span><h3>COUNT OF REPORTING GROUPS BY CATEGORY</h3>'+
 reportRadar+'<p class="context-meta">The radar displays counts only. It is not a threat severity or global risk index.</p></div>'+
 '<div class="data-card"><span class="kicker">REPLAY METHODOLOGY</span><h3>REAL PUBLISHER DATES</h3>'+
 '<p>Each visible group was selected from reported publication timestamps. The slider cannot reconstruct all revisions of a past fact, or establish when an incident actually occurred.</p>'+
 '<p>Cutoff: '+esc(C.date(new Date(S.asof).toISOString()))+' · '+S.hours+'-hour window</p>'+
 '<p>Publication groups: '+g.nodes.length+' · source-metadata links: '+g.edges.length+'</p></div></div>'+
 '<h3 class="brief-head">SOURCE PUBLICATION SEQUENCE · '+sorted.length+'</h3>'+
 (sorted.length?R.chronology({nodes:sorted}):'<div class="state-empty">No published groups in this selected window.</div>');
}
function render(){
 if(!S.loaded)return;
 showStatus();
 const stage=$("stageContent"),page=stage.scrollTop;
 const mapIsVisible=S.view==="map";
 $("[data-map-hours]").forEach(b=>b.classList.toggle("active",Number(b.dataset.mapHours)===S.mapHours));
 const custom=$("labMapCustomWindow");
 custom.value=[48,168].includes(S.mapHours)?String(S.mapHours):"";
 if($("labLatestAge"))$("labLatestAge").textContent=S.mapHours+"H WINDOW";
 stage.hidden=mapIsVisible;
 $("labMapHost").hidden=!mapIsVisible;
 if(mapIsVisible)root.GXImpactMap?.show();
 else root.GXImpactMap?.hide();
 if(S.view==="graph")renderGraph();
 else if(S.view==="timeline")renderTimeline();
 else if(S.view==="markets")stage.innerHTML=
   '<div class="context-warning">These are original FRED observations, not realtime exchange quotes. The economic feed is retrieved approximately twice daily, depending on GitHub scheduling and source availability.</div>'+
   R.marketCards(markets());
 else if(S.view==="compare")stage.innerHTML=R.compare(markets());
 else if(S.view==="pathways")stage.innerHTML=R.pathways();
 else if(S.view==="brief")stage.innerHTML=R.briefing(brief(),Date.now(),S.visits);
 if(S.view!=="graph")stage.scrollTop=page;
 $("labReplay").value=String(S.scrub);
 $("scrubTime").textContent=S.scrub>=100?"CURRENT VIEW":"CUTOFF "+C.date(new Date(S.asof).toISOString());
 $("scrubCount").textContent=graphData().nodes.length+" PUBLISHED GROUPS";
 $$("[data-window]").forEach(b=>b.classList.toggle("active",Number(b.dataset.window)===S.hours));
 $$("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===S.mode));
}
function replay(value){
 S.scrub=Math.min(100,Math.max(0,Number(value)));
 S.asof=Date.now()-(1-S.scrub/100)*S.hours*3600000;
 render();
}
async function refresh(){
 if(S.pending)return;
 S.pending=true;$("labFreshness").textContent="CHECKING SOURCE MANIFEST…";
 try{
  const incoming=await C.load({manifest:S.manifest,files:S.files});
  const wasLoaded=S.loaded;
  S.files={...S.files,...incoming.files};S.manifest=incoming.manifest;
  S.status=incoming.status;S.warning=incoming.warning;S.loaded=true;S.lastCheck=Date.now();
  if(!wasLoaded)markVisit();
  if(!wasLoaded||incoming.changed)render();
  else{
   showStatus();
   if(S.view==="map")root.GXImpactMap?.update();
  }
 }catch(e){
  S.status="degraded";S.warning=String(e);
  if(!S.loaded){S.loaded=true;render()}
  toast("Source refresh unavailable. Last available evidence remains displayed.");
 }finally{S.pending=false}
}
function init(){
 for(const [key,country] of Object.entries(C.COUNTRY)){
  const o=document.createElement("option");o.value=key;o.textContent=country.label;
  $("countryLab").appendChild(o);
 }
 $("countryLab").value=S.country;$("topicLab").value=S.category;
 applyTheme(S.theme);
 $("labTheme").onchange=e=>applyTheme(e.target.value);
 $("[data-map-hours]").forEach(b=>b.onclick=()=>{
  S.mapHours=Number(b.dataset.mapHours);S.asof=Date.now();S.scrub=100;
  save();render();
 });
 $("labMapCustomWindow").onchange=e=>{
  if(!e.target.value)return;
  S.mapHours=Number(e.target.value);S.asof=Date.now();S.scrub=100;
  save();render();
 };
 $$("[data-view]").forEach(b=>b.onclick=()=>view(b.dataset.view));
 $$("[data-mobile-view]").forEach(b=>b.onclick=()=>view(b.dataset.mobileView));
 $$("[data-mode]").forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode;S.graphFocus=null;save();render()});
 $$("[data-window]").forEach(b=>b.onclick=()=>{S.hours=Number(b.dataset.window);S.scrub=100;S.asof=Date.now();save();render()});
 $("countryLab").onchange=e=>{S.country=e.target.value;save();render();closeLayers()};
 $("topicLab").onchange=e=>{S.category=e.target.value;save();render();closeLayers()};
 $("labReplay").oninput=e=>replay(e.target.value);
 $("labNow").onclick=()=>replay(100);
 $("resetLab").onclick=()=>{S.country="";S.category="all";S.hours=48;S.zoom=1;S.scrub=100;
   S.asof=Date.now();$("countryLab").value="";$("topicLab").value="all";closeLayers();render();save()};
 $("labRefresh").onclick=refresh;
 root.GXImpactMap?.configure({
  getData:()=>S.files,
  getFilter:()=>({country:S.country,category:S.category,hours:S.mapHours,asof:Date.now(),
    collectionTime:S.manifest?.collected_at||null,latestArticle:S.manifest?.latest_article_published_at||null}),
  onDetails:openContext
 });
 $$("[data-map-layer]").forEach(b=>b.onchange=()=>root.GXImpactMap?.update());
 $$("[data-map-action]").forEach(b=>b.onclick=()=>root.GXImpactMap?.action(b.dataset.mapAction));
 $("labFiltersOpen").onclick=()=>{$("impactApp").classList.add("filters-open");backdrop()};
 $("labBackdrop").onclick=()=>{closeContext();closeLayers()};
 $("contextClose").onclick=closeContext;
 $("labExplain").onclick=()=>openContext("WHAT THESE VISUALS MEAN",
  '<div class="context-warning">This dashboard does NOT use a numerical global threat probability, synthetic event coordinates, unverified causal model, or live financial ticker.</div>'+
  '<p>Graph: Nodes are candidate source-correlated news groups; dashed edges are shared countries/topic within 36 hours. Time replay uses publication timestamps.</p>'+
  '<p>FRED: Currency / commodity / volatility and credit values are sourced to actual published periods. Some series can lag by days.</p>'+
  '<p>Historical comparison: 2008 raw values are observational context only; there is no claim that a historic crisis is recurring.</p>'+
  '<p>Pathways: Hypothetical mechanisms require separately sourced real events and empirical testing before any causal conclusion.</p>'+
  '<p>Daily briefing: deterministic public metadata and source links; not generative autonomous analysis.</p>');
 $("stageContent").onclick=e=>{
  const back=e.target.closest("[data-cluster-back]");
  if(back){S.graphFocus=null;renderGraph();return}
  const cluster=e.target.closest("[data-cluster]");
  if(cluster){S.graphFocus=cluster.dataset.cluster;renderGraph();return}
  const networkMode=e.target.closest("[data-network-mode]");
  if(networkMode){
   S.mode=networkMode.dataset.networkMode;S.graphFocus=null;save();render();return;
  }
  const zoom=e.target.closest("[data-zoom]");
  if(zoom){
   S.zoom=zoom.dataset.zoom==="in"?Math.min(3,S.zoom+.22):
    zoom.dataset.zoom==="out"?Math.max(.65,S.zoom-.22):1;
   save();renderGraph();return;
  }
  const node=e.target.closest("[data-node]");if(node){contextEvent(node.dataset.node);return}
  const edge=e.target.closest("[data-edge]");if(edge){contextEdge(edge.dataset.edge);return}
  const market=e.target.closest("[data-market]");if(market){contextMarket(market.dataset.market);return}
  const pathway=e.target.closest("[data-pathway]");if(pathway){contextPathway(pathway.dataset.pathway);return}
  const briefing=e.target.closest("[data-brief]");if(briefing){contextEvent(briefing.dataset.brief);return}
 };
 $("contextContent").onclick=e=>{
  const node=e.target.closest("[data-node]");if(node)contextEvent(node.dataset.node);
 };
 $("stageContent").onkeydown=e=>{
  if((e.key==="Enter"||e.key===" ")&&e.target.matches(".graph-node")){
   e.preventDefault();contextEvent(e.target.dataset.node)}
 };
 $("stageContent").addEventListener("wheel",e=>{
  if(S.view!=="graph"||!e.target.closest(".network-svg"))return;
  if(root.innerWidth<=650)return;
  e.preventDefault();S.zoom=Math.max(.7,Math.min(2.7,S.zoom+(e.deltaY<0?.1:-.1)));renderGraph();
 },{passive:false});
 $("labLang").onclick=()=>{
  S.lang=S.lang==="en"?"ar":"en";
  translateChrome();
  view(S.view);
 };
 root.addEventListener("keydown",e=>{if(e.key==="Escape"){closeContext();closeLayers()}});
 root.addEventListener("pagehide",()=>{
  if(S.loaded)C.store(VISITED,{saved_at:new Date().toISOString(),
   digests:Object.fromEntries(C.asArray(graph().nodes).map(n=>[n.id,n.digest||""]))});
 });
 // Swipe down to dismiss the mobile evidence sheet. Never handles the graph
 // surface itself, so scrolling and map investigation remain functional.
 let startY=null;
 $("labContext").addEventListener("touchstart",e=>{
  if(e.target.closest(".context-body"))return;
  startY=e.touches[0]?.clientY??null;
 },{passive:true});
 $("labContext").addEventListener("touchend",e=>{
  if(startY!==null&&e.changedTouches[0].clientY-startY>95)closeContext();
  startY=null;
 },{passive:true});
 translateChrome();
 const trans=words[S.lang]||words.en;
 const [eyebrow,title,description]=trans[S.view];
 $("stageEyebrow").textContent=eyebrow;$("stageTitle").textContent=title;$("stageDescription").textContent=description;
 $$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===S.view));
 $("graphFooter").hidden=!["map","graph","timeline"].includes(S.view);
 $("labUTC").textContent=new Date().toLocaleTimeString("en-GB",{timeZone:"UTC",hour:"2-digit",minute:"2-digit"})+" UTC";
 setInterval(()=>{
  if(document.hidden)return;
  refresh();
  if(S.view==="map")root.GXImpactMap?.update();
 },60000);
 setInterval(()=>{$("labUTC").textContent=new Date().toLocaleTimeString("en-GB",{timeZone:"UTC",hour:"2-digit",minute:"2-digit"})+" UTC"},30000);
 refresh();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
root.GXImpactApp={getState:()=>S,refresh,view,replay,filter:graphData,
 mapReady:()=>{if(S.loaded&&S.view==="map")root.GXImpactMap?.show()}};
})(window);
