/* GULFASTRA X: command palette, themes, watchlist, notifications and export. */
(function(root){
"use strict";
const C=root.GXCore,$=id=>document.getElementById(id),$$=q=>[...document.querySelectorAll(q)];
let hooks={},state=null,options=[],selection=0;
const storage="gulfastra-x-alerts-seen";
function notify(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(notify.t);notify.t=setTimeout(()=>el.classList.remove("show"),3200)}
function theme(value){
 state.theme=["midnight","obsidian","sand"].includes(value)?value:"midnight";
 document.body.dataset.theme=state.theme;
 $$("[data-theme-choice]").forEach(b=>b.classList.toggle("active",b.dataset.themeChoice===state.theme));hooks.save();
}
function mobile(view){
 document.body.classList.toggle("mobile-intel",view==="intel");
 $("app").classList.toggle("mobile-layers",view==="layers");
 $$("[data-mobile]").forEach(b=>b.classList.toggle("active",b.dataset.mobile===view));
 root.GXMap.resize();
}
function presentation(){
 document.body.classList.toggle("presentation");requestAnimationFrame(()=>root.GXMap.resize());
}
function openPalette(){
 $("commandOverlay").hidden=false;$("globalSearch").value="";selection=0;find();$("globalSearch").focus();
}
function closePalette(){$("commandOverlay").hidden=true}
function find(){
 const q=$("globalSearch").value.trim().toLowerCase();
 const commands=[
  ["Open Global Overview","WORKSPACE",()=>hooks.workspace("global")],
  ["Open Gulf Watch","WORKSPACE",()=>hooks.workspace("gulf")],
  ["Open Maritime Watch","WORKSPACE",()=>hooks.workspace("maritime")],
  ["Open Aviation Watch","WORKSPACE",()=>hooks.workspace("aviation")],
  ["Open Natural Hazards","WORKSPACE",()=>hooks.workspace("hazards")],
  ["Open Analyst Lab","WORKSPACE",()=>hooks.workspace("analyst")],
  ["Full reporting archive","TIME FILTER",()=>hooks.period(0)],
  ["Last 24 hours","TIME FILTER",()=>hooks.period(24)],
  ["Refresh public intelligence data","DATA",()=>hooks.refresh()],
  ["Presentation mode","VIEW",presentation]
 ];
 const matches=commands.filter(x=>(x[0]+" "+x[1]).toLowerCase().includes(q))
  .slice(0,8).map(([title,description,action])=>({title,description,action}));
 // Deterministic query syntax; no model or inferred intelligence.
 if(/(?:country|topic|hours):/i.test(q)){
  const clauses=[...q.matchAll(/(country|topic|hours):([^\s]+)/g)];
  if(clauses.length)matches.unshift({
   title:"APPLY STRUCTURED ANALYST QUERY",description:clauses.map(v=>v[0]).join(" · "),
   action:()=>{for(const [,key,value] of clauses){
    if(key==="country"){
     const name=Object.keys(C.COUNTRY).find(id=>
      id.toLowerCase()===value.toLowerCase()||
      C.COUNTRY[id].label.toLowerCase().replace(/\s/g,"")===value.toLowerCase());
     if(name)state.country=name;
    }
    if(key==="topic"&&["all","security","transport","diplomacy"].includes(value))state.topic=value;
    if(key==="hours"&&[0,24,72,168,720].includes(Number(value)))state.hours=Number(value);
   }state.query="";hooks.save();hooks.render();notify("Analyst query filters applied")}
  });
 }
 const articles=C.asArray(hooks.getData().events).filter(e=>q&&
  (String(e.title||"")+" "+C.asArray(e.countries).join(" ")).toLowerCase().includes(q))
  .slice(0,12).map(e=>({title:e.title,description:"EVIDENCE GROUP · "+C.date(C.latestEvidence(e)),action:()=>root.GXStream.showDossier("event",e.id)}));
 options=[...matches,...articles].slice(0,18);
 $("commandResults").innerHTML=options.length?options.map((opt,i)=>
  '<button class="'+(i===selection?"selected":"")+'" data-cmd="'+i+'"><strong dir="auto">'+C.esc(opt.title)+'</strong><small>'+
  C.esc(opt.description)+'</small></button>').join(""):'<div class="empty-state">No matching commands or published records.</div>';
}
function execute(i){if(!options[i])return;const action=options[i].action;closePalette();action()}
function manageWatch(){
 const value=prompt("Add a monitored country (e.g. Qatar) or a keyword prefixed with #:", "");
 if(!value)return;
 const clean=value.trim().slice(0,60);if(!clean)return;
 if(!state.watchlist.includes(clean))state.watchlist.push(clean);
 state.watchlist=state.watchlist.slice(-12);hooks.save();renderWatch();
}
function renderWatch(){
 $("watchlist").innerHTML=state.watchlist.length?state.watchlist.map((v,i)=>
  '<button class="watch-token" data-watch="'+i+'" title="Click to filter; Alt-click to remove">'+C.esc(v)+'</button>').join(""):
  '<span class="dim">No watchlist yet. Use EDIT to monitor a country or keyword.</span>';
}
function applyWatch(v){
 if(!v)return;
 if(C.COUNTRY[v]){state.country=v;$("countryFilter").value=v}
 else{state.query=v.startsWith("#")?v.slice(1):v;state.tab="news"}
 hooks.render();hooks.save();notify("Watch filter applied");
}
function exportJSON(){
 const d=hooks.getFiltered();
 const output={product:"GULFASTRA X",exported_at:new Date().toISOString(),
  source_channel:state.channel,
  filters:{country:state.country,topic:state.topic,publication_window_hours:state.hours,cutoff:new Date(state.asof).toISOString()},
  warning:"Public reporting is unverified. Country mentions are not verified incident locations.",
  reports:d.reports,events:d.events,observations:d.observations,alerts:d.alerts};
 const blob=new Blob([JSON.stringify(output,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download="gulfastra-x-public-reporting-"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function notifyCritical(){
 const d=hooks.getData(),a=C.asArray(d.alerts),m=state.manifest;
 const collected=C.dt(m?.collected_at),fresh=Number.isFinite(collected)&&Date.now()-collected<1800000&&Date.now()>=collected-600000;
 if(!fresh||m?.quality_gate!=="passed"||m?.alerts_available!==true||document.hidden)return;
 const critical=a.filter(x=>x.level==="critical-reporting"&&C.dt(x.published_at)>Date.now()-7200000);
 const ids=critical.map(x=>x.id);
 const old=C.loadState(storage,null);
 if(!Array.isArray(old)){C.store(storage,ids);return}
 const published=new Set(C.asArray(d.new_alert_ids));
 const unseen=critical.filter(x=>!old.includes(x.id)&&published.has(x.id));
 C.store(storage,[...new Set([...old,...ids])].slice(-300));
 if(unseen.length&&"Notification" in root&&Notification.permission==="granted"){
  new Notification("GULFASTRA · CRITICAL PUBLIC REPORTING",{
   body:unseen[0].title.slice(0,165)+" · Unverified. Check original sources.",
   tag:"gulfastra-public-"+unseen[0].id});
 }
}
function language(){
 state.language=state.language==="ar"?"en":"ar";
 const ar=state.language==="ar";
 document.documentElement.lang=state.language;
 $("languageButton").textContent=ar?"EN / عربي":"ع / EN";
 $("globalSearch").placeholder=ar?"ابحث عن تقارير ومصادر وأوامر…":"Search published events, countries, sources and commands…";
 $("timelineLabel").textContent=ar?"تواريخ النشر والملاحظات، لا تواريخ الحوادث":"ACTUAL PUBLICATION / OBSERVATION TIMES · NOT INCIDENT TIMES";
 $("streamHeading").textContent=ar?"موجز المصادر العلنية":"INTELLIGENCE STREAM";
 $("mapStatus").title=ar?"البيانات ليست لحظية":"Data is not guaranteed real-time";
 hooks.save();hooks.render();
}
function init(h,s){
 hooks=h;state=s;theme(state.theme);renderWatch();
 $("commandButton").onclick=openPalette;$("mobileSearch").onclick=openPalette;
 $("commandClose").onclick=closePalette;
 $("globalSearch").oninput=()=>{selection=0;find()};
 $("globalSearch").onkeydown=e=>{
  if(["ArrowDown","ArrowUp"].includes(e.key)){e.preventDefault();selection=(selection+(e.key==="ArrowDown"?1:-1)+options.length)%Math.max(1,options.length);find()}
  if(e.key==="Enter"){e.preventDefault();execute(selection)}
 };
 $("commandResults").onclick=e=>{const b=e.target.closest("[data-cmd]");if(b)execute(+b.dataset.cmd)};
 $("commandOverlay").onclick=e=>{if(e.target.id==="commandOverlay")closePalette()};
 $("settingsButton").onclick=()=>{$("settingsOverlay").hidden=false};
 $("settingsClose").onclick=()=>{$("settingsOverlay").hidden=true};
 $("settingsOverlay").onclick=e=>{if(e.target.id==="settingsOverlay")$("settingsOverlay").hidden=true};
 $$("[data-theme-choice]").forEach(b=>b.onclick=()=>theme(b.dataset.themeChoice));
 $("densityButton").onclick=()=>document.body.classList.toggle("spacious");
 $("notificationButton").onclick=async()=>{
  if(!("Notification" in root)){notify("Browser notifications unsupported");return}
  if(Notification.permission==="denied"){notify("Notifications denied in browser settings");return}
  const answer=await Notification.requestPermission();
  notify("Notification permission "+answer+" · page-open only");
 };
 $("languageButton").onclick=language;
 $("manageWatch").onclick=manageWatch;
 $("watchlist").onclick=e=>{
  const b=e.target.closest("[data-watch]");if(!b)return;
  const idx=+b.dataset.watch;
  if(e.altKey){state.watchlist.splice(idx,1);renderWatch();hooks.save()}
  else applyWatch(state.watchlist[idx]);
 };
 $("exportButton").onclick=exportJSON;
 $$("[data-mobile]").forEach(b=>b.onclick=()=>mobile(b.dataset.mobile));
 $("mapFullscreen").onclick=presentation;
 document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openPalette();return}
  if(e.key==="Escape"){closePalette();root.GXStream.hideDossier();$("settingsOverlay").hidden=true}
  if(e.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){
    e.preventDefault();openPalette()}
 });
}
root.GXExtras={init,notify,notifyCritical,renderWatch,theme,mobile,presentation,openPalette,closePalette};
})(window);
