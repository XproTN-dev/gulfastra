(()=>{
"use strict";
const $=id=>document.getElementById(id);
const D={events:[],countryStats:{},daily:{},revisions:[],observations:[],obsHealth:[],reportHealth:{},generated:null,view:"fusion",focus:null,country:"",hours:72,lang:"all",day:"",query:"",queryResults:[],watch:[],hazardMarkers:[],hazardsVisible:false};
const countries={Iran:"Iran / إيران",Saudi:"Saudi Arabia / السعودية",Qatar:"Qatar / قطر",UAE:"UAE / الإمارات",Bahrain:"Bahrain / البحرين",Kuwait:"Kuwait / الكويت",Iraq:"Iraq / العراق",Oman:"Oman / عمان",Yemen:"Yemen / اليمن",Israel:"Israel / إسرائيل"};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dates=x=>{let d=new Date(x);return Number.isFinite(+d)?d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Unknown"};
const since=x=>Math.max(0,Math.floor((Date.now()-new Date(x).getTime())/3600000));
const disclaimer="Coverage groups represent published claims, not verified military incidents. Country references are not impact or launch coordinates.";
const pill=(v,kind="")=>'<span class="gf-pill '+kind+'">'+esc(v)+'</span>';
const title=(name,sub,actions="")=>'<div class="gf-section-head"><div><span class="gf-micro">GULFASTRA / FUSION INTELLIGENCE</span><h3>'+esc(name)+'</h3><p>'+esc(sub)+'</p></div><div class="gf-section-actions">'+actions+'</div></div>';
const kpi=(name,val,note)=>'<div class="gf-kpi"><span class="gf-micro">'+esc(name)+'</span><strong>'+esc(val)+'</strong><small>'+esc(note)+'</small></div>';
const kpis=items=>'<div class="gf-kpis">'+items.map(x=>kpi(...x)).join("")+'</div>';
const url=x=>/^https:\/\//i.test(x||"")?x:"#";
const sortedEvents=()=>D.events.filter(e=>(!D.country||e.countries.includes(D.country))&&(D.lang==="all"||e.languages.includes(D.lang))&&(!D.day||e.last_published.slice(0,10)===D.day)&&(!D.hours||since(e.last_published)<=D.hours));
function controls(){return '<div class="gf-filterbar"><select class="gf-select" id="gfCountry"><option value="">All countries</option>'+Object.entries(countries).map(([k,v])=>'<option value="'+k+'" '+(k===D.country?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select><select class="gf-select" id="gfWindow">'+[24,72,168,336,0].map(n=>'<option value="'+n+'" '+(n===D.hours?"selected":"")+'>'+(n?n+" hours":"Entire archive")+'</option>').join("")+'</select><select class="gf-select" id="gfLang">'+[["all","All languages"],["ar","عربي"],["en","English"]].map(([k,v])=>'<option value="'+k+'" '+(k===D.lang?"selected":"")+'>'+v+'</option>').join("")+'</select><button class="gf-control" data-act="clear">RESET</button></div>'}
function eventRow(e){return '<article class="gf-event" role="button" tabindex="0" data-gf-event="'+esc(e.id)+'"><div class="gf-event-top">'+pill(e.category.toUpperCase())+pill(e.topic.toUpperCase(),"mute")+'<span class="gf-small">'+esc(dates(e.last_published))+'</span></div><h4 dir="auto">'+esc(e.title)+'</h4><div class="gf-event-foot"><span>◈ '+e.report_count+' ARTICLES</span><span>◉ '+e.publisher_count+' PUBLISHER NAMES</span><span>◎ '+esc(e.countries.join(", ")||"Unassigned")+'</span></div></article>'}
const list=(items,max=55)=>items.length?items.slice(0,max).map(eventRow).join(""):'<div class="gf-empty">No matching coverage groups. Try another date or filter.</div>';
function dossier(e){let edits=D.revisions.filter(x=>x.id===e.id);return title("Evidence dossier",e.id,'<button class="gf-control" data-act="back">← RETURN</button>')+
kpis([["LINKED ARTICLES",e.report_count,"Source documents"],["NAMED PUBLISHERS",e.publisher_count,"Not proof of independence"],["REVISION",e.revision||1,"Published source-set history"],["LOCATION","COUNTRY","Location mentioned only"]])+
'<div class="gf-card"><h4 dir="auto">'+esc(e.title)+'</h4>'+pill(e.corroboration,"warn")+pill("NOT VERIFIED","warn")+pill(e.topic)+
'<p>First publication: '+dates(e.first_published)+'. Latest: '+dates(e.last_published)+'. Countries: '+esc(e.countries.join(", ")||"unassigned")+'.</p><div class="gf-notice">'+esc(disclaimer)+'</div></div>'+
'<div class="gf-row"><section class="gf-card"><h4>PRIMARY SOURCE LINKS ('+e.sources.length+')</h4>'+e.sources.map(s=>'<div class="gf-evidence"><span class="gf-micro" dir="auto">'+esc(s.source||"Publisher")+' · '+esc(s.language||"")+' · '+esc(dates(s.published_at))+'</span><p dir="auto">'+esc(s.title)+'</p><a target="_blank" rel="noopener noreferrer" class="gf-source-link" href="'+esc(url(s.url))+'">ORIGINAL REPORT ↗</a></div>').join("")+'</section><aside><div class="gf-card"><h4>ASSESSMENT</h4><p>Source type: public published reporting.</p><p>Cross-language candidate: '+(e.cross_language_candidate?"YES — review manually":"No")+'.</p><p>Claim status: Not independently verified.</p><p>Reported event time: Unestablished.</p><p>Source wording: '+(e.wording_review?.review_required?'<strong style="color:#ffc081">MANUAL REVIEW REQUIRED</strong>':'No opposing wording cues detected')+'</p><p>'+esc(e.wording_review?.note||'No independent verification')+'</p></div><div class="gf-card"><h4>CHANGE HISTORY</h4>'+(edits.length?edits.map(r=>'<p>Rev '+r.revision+' · '+dates(r.at)+' · '+esc(r.change)+'</p>').join(""):'<p>No stored revisions yet.</p>')+'</div></aside></div>'}
function fusion(){let records=sortedEvents();return title("Intelligence Fusion","Related multilingual reports, original evidence and auditable revisions—not live weapon tracking.",
'<button class="gf-control" data-act="go-query">⌘ ANALYST QUERY</button>')+
kpis([["COVERAGE GROUPS",records.length,"Published reporting clusters"],["LINKED HEADLINES",records.reduce((a,x)=>a+x.report_count,0),"All original reports retained"],["MULTI-PUBLISHER",records.filter(x=>x.publisher_count>1).length,"Not independent confirmation"],["COUNTRIES",new Set(records.flatMap(x=>x.countries)).size,"Mentioned geographic areas"]])+
controls()+'<div class="gf-row"><section><h4 class="gf-micro">RECENT REPORTING CLUSTERS</h4>'+list(records)+'</section><aside><div class="gf-card"><h4>SOURCE QUALITY</h4><p>All entries remain marked unverified without explicit source-based confirmation.</p><p>Correlation model: deterministic title comparison with strict country, topic and time matching.</p><div class="gf-notice">'+esc(disclaimer)+'</div></div><div class="gf-card"><h4>ARCHIVE STATUS</h4><p>Last event regeneration: '+esc(dates(D.generated))+'</p><p>Last revisions: '+D.revisions.length+'</p><p>Refreshes are best-effort through GitHub Actions, not instantaneous.</p></div></aside></div>'}
function countryDesk(){let rows=Object.entries(D.countryStats).sort((a,b)=>b[1].reports-a[1].reports),max=Math.max(1,...rows.map(x=>x[1].reports));return title("Country intelligence desk","Coverage volume, publisher diversity and civilian disruption topics. No fabricated risk scores.")+
'<div class="gf-data-grid">'+rows.map(([name,stat])=>'<div class="gf-country" tabindex="0" role="button" data-gf-country="'+esc(name)+'"><strong>'+esc(countries[name]||name)+'</strong><div class="gf-country-stats"><span>'+stat.events+' GROUPS</span><span>'+stat.reports+' REPORTS</span><span>'+stat.sources+' OUTLETS</span></div><div class="gf-mini-bar"><i style="width:'+Math.max(2,stat.reports/max*100)+'%"></i></div></div>').join("")+'</div>'+
'<div class="gf-card"><h4>GCC CIVILIAN IMPACT PRIORITIES</h4><p>Airport status, civil aviation notices, maritime commerce, government safety notices, internet outages, and observed natural hazards.</p><div class="gf-notice">Report density is not the frequency or severity of security incidents.</div></div>'}
function timeline(){let days=Object.entries(D.daily).slice(-35),max=Math.max(1,...days.map(x=>x[1]));return title("Historical reporting replay","Publication-date timeline. It does not reconstruct what was known at each historical moment.",
'<button class="gf-control" data-act="day-reset">ALL DAYS</button>')+
'<section class="gf-card"><h4>PUBLICATION ACTIVITY BY DAY</h4><div class="gf-timeline-bars">'+days.map(([day,n])=>'<button title="'+esc(day)+' · '+n+' groups" data-gf-day="'+esc(day)+'" class="'+(D.day===day?"active":"")+'" style="height:'+Math.max(3,Math.round(n/max*100))+'%"></button>').join("")+'</div><div class="gf-event-foot"><span>EARLIER</span><span>'+esc(D.day||"ALL PUBLICATION DATES")+'</span><span>RECENT</span></div></section>'+controls()+'<section class="gf-card"><h4>TIMELINE EVIDENCE</h4>'+list(sortedEvents(),75)+'</section>'}
function markdownReport(){let records=sortedEvents(),ar=D.lang==="ar",lines=[ar?"# جلفاسترا — موجز مصادر الأخبار":"# GULFASTRA / PUBLIC-SOURCE SITREP",ar?"تحليل التقارير المنشورة":"Open-source coverage brief",ar?"تنبيه: لا تعتبر هذه الأخبار حوادث مؤكدة":disclaimer,""];
for(let cat of ["security","transport","diplomacy","other"]){let entries=records.filter(x=>x.category===cat).slice(0,18);if(!entries.length)continue;lines.push("## "+cat.toUpperCase());for(let e of entries){lines.push("- "+e.title+" ["+e.corroboration+"]");for(let s of e.sources.slice(0,3))lines.push("  - "+s.source+": "+s.url)}lines.push("")}return lines.join("\n")}
function sitrep(){let rec=sortedEvents();return title("Situation report","Deterministic bilingual source-linked summary, not model-written assertions.",
'<button class="gf-control" data-act="brief-copy">⧉ COPY</button><button class="gf-control" data-act="brief-download">↓ MARKDOWN</button>')+
controls()+'<section class="gf-card gf-sitrep" dir="'+(D.lang==="ar"?"rtl":"ltr")+'"><h3>'+(D.lang==="ar"?"موجز جلفاسترا":"GULFASTRA / GULF SITREP")+'</h3><p>'+rec.length+' source-coverage groups. Publication dates are not event times.</p>'+
["security","transport","diplomacy","other"].map(cat=>{let x=rec.filter(r=>r.category===cat).slice(0,18);if(!x.length)return"";return '<h3>'+cat.toUpperCase()+'</h3><ul>'+x.map(e=>'<li dir="auto"><strong>'+esc(e.title)+'</strong> <span class="gf-small">('+e.report_count+' reports; '+esc(e.corroboration)+')</span><p><a target="_blank" rel="noopener noreferrer" class="gf-source-link" href="'+esc(url(e.sources[0]?.url))+'">'+esc(e.sources[0]?.source||"Source")+' ↗</a></p></li>').join("")+'</ul>'}).join("")+
'<p class="gf-notice">'+esc(disclaimer)+'</p></section>'}


function parseQuery(input){
const tokens=input.match(/(?:[^\s"]+|"[^"]*")+/g)||[];
const q={words:[],error:[],country:"",type:"",lang:"",source:"",topic:"",after:0};
for(let tok of tokens){let m=tok.match(/^([a-z]+):(.+)$/i);if(!m){q.words.push(tok.toLowerCase().replace(/^"|"$/g,""));continue}
let key=m[1].toLowerCase(),v=m[2].toLowerCase().replace(/^"|"$/g,"");
if(["country","type","lang","source","topic"].includes(key))q[key]=v;
else if(key==="after"){let duration=v.match(/^(\d+)(h|d)$/);if(duration)q.after=+duration[1]*(duration[2]==="d"?24:1);else q.error.push("after: uses 24h or 7d")}
else q.error.push("Unknown operator "+key)
}return q
}
function queryMatches(query){
let q=parseQuery(query);if(q.error.length)return {error:q.error.join("; "),records:[]};
let records=D.events.filter(e=>{
if(q.country&&!e.countries.some(x=>x.toLowerCase().includes(q.country)))return false;
if(q.type&&e.category!==q.type)return false;
if(q.lang&&!e.languages.includes(q.lang))return false;
if(q.topic&&e.topic!==q.topic)return false;
if(q.source&&!e.sources.some(x=>x.source.toLowerCase().includes(q.source)))return false;
if(q.after&&since(e.last_published)>q.after)return false;
let blob=[e.title,e.topic,e.category,...e.sources.map(x=>x.title)].join(" ").toLowerCase();
return q.words.every(x=>blob.includes(x))
});
return {error:"",records};
}
function queryView(){
let match=D.query?queryMatches(D.query):{error:"",records:D.events.slice(0,40)};
D.queryResults=match.records;
return title("Analyst query console","Structured, multilingual search across original published coverage.",
'<button class="gf-control" data-act="export-query">↓ EXPORT CSV</button>')+
'<section class="gf-card"><h4>QUERY OPERATORS</h4><form id="gfQueryForm" class="gf-querybox"><input class="gf-field" id="gfQueryInput" spellcheck="false" placeholder="country:Qatar type:security lang:ar after:7d" value="'+esc(D.query)+'"><button class="gf-control">EXECUTE ↵</button></form><p>country: · type:security/transport/diplomacy · lang:ar/en · source: · topic: · after:24h/7d · keywords</p></section>'+
'<div class="gf-console">'+esc(match.error||"MATCHED "+match.records.length+" source-linked coverage groups.")+'</div><section class="gf-card"><h4>SEARCH RESULTS</h4>'+list(match.records,100)+'</section>'
}
function healthView(){
let rows=Object.entries(D.reportHealth);
return title("Source health & data provenance","Live source diagnostics and independent environmental provider statuses.")+
kpis([["NEWS SOURCES",rows.length,"RSS and open news search"],["OK",rows.filter(([,v])=>v.ok===true).length,"Successful collectors"],["ERRORS",rows.filter(([,v])=>v.ok===false).length,"No simulated responses"],["OTHER FEEDS",D.obsHealth.length,"Natural context providers"]])+
'<div class="gf-row"><section class="gf-card"><h4>NEWS</h4>'+rows.map(([name,v])=>'<div class="gf-signal"><span dir="auto">'+esc(name)+'</span>'+pill(v.ok===true?"OK · "+(v.relevant??v.items??0):v.ok===null?"RATE-LIMIT BACKOFF":"ERROR",v.ok===true?"good":"warn")+'</div>'+(v.error?'<p>'+esc(v.error)+'</p>':"")).join("")+'</section>'+
'<section class="gf-card"><h4>INDEPENDENT OBSERVATIONS</h4>'+D.obsHealth.map(v=>'<div class="gf-signal"><span>'+esc(v.source)+'</span>'+pill(v.ok===true?"OK · "+v.count:v.ok===null?"NOT CONFIGURED":"ERROR",v.ok===true?"good":"warn")+'</div>'+(v.error?'<p>'+esc(v.error)+'</p>':"")).join("")+'<div class="gf-notice">Cloudflare Radar requires an authorized token and its noncommercial license must be respected.</div></section></div>'
}


function observationsView(){
let o=D.observations;
return title("Environmental observations","Observed natural hazards and optional connectivity reports, separate from any claims of attacks.",
'<button class="gf-control" data-act="hazard-map">'+(D.hazardsVisible?"HIDE MAP LAYER":"SHOW MAP LAYER")+'</button>')+
kpis([["OBSERVATIONS",o.length,"Public provider data"],["EARTHQUAKES",o.filter(x=>x.kind==="earthquake").length,"USGS observed locations"],["NATURAL EVENTS",o.filter(x=>x.source==="NASA EONET").length,"NASA independent observations"],["OUTAGES",o.filter(x=>x.kind==="connectivity-outage").length,"Requires licensed API token"]])+
'<div class="gf-notice">Earthquakes, wildfires and outages must never automatically be classified as military incidents.</div>'+
'<section class="gf-card"><h4>OBSERVED DATA</h4>'+(o.length?o.slice(0,110).map(x=>'<div class="gf-signal"><span>'+esc(x.title)+'</span><span class="gf-small">'+esc(x.source)+'</span><a class="gf-source-link" target="_blank" rel="noopener noreferrer" href="'+esc(url(x.url))+'">SOURCE ↗</a></div>').join(""):'<div class="gf-empty">No regional observation records available; inspect provider diagnostics.</div>')+'</section>'
}
function relationshipView(){
let pairs=new Map(),publishers=new Map();
for(let e of D.events){let c=e.countries||[];for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++){let key=[c[i],c[j]].sort().join(" ↔ ");pairs.set(key,(pairs.get(key)||0)+1)}for(let s of e.sources)publishers.set(s.source,(publishers.get(s.source)||0)+1)}
return title("Reporting relationship explorer","Describes co-mentions in open reporting. It does not attribute military behavior or intent.")+
'<div class="gf-row"><section class="gf-card"><h4>COUNTRY CO-MENTIONS</h4>'+[...pairs].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,n])=>'<div class="gf-relationship"><strong>'+esc(k)+'</strong><span>'+n+' coverage groups</span></div>').join("")+'</section>'+
'<section class="gf-card"><h4>NEWS SOURCE DISTRIBUTION</h4>'+[...publishers].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,n])=>'<div class="gf-relationship"><strong dir="auto">'+esc(k)+'</strong><span>'+n+' headlines</span></div>').join("")+'</section></div>'+
'<div class="gf-notice">Co-mentions and common publishers do not prove coordination, corroboration or causality.</div>'
}
function watchView(){
let records=D.events.filter(e=>D.watch.some(x=>e.countries.includes(x)||e.topic===x));
return title("Analyst watchlist","Saved in your browser only. Alerts are for published reporting, not confirmed military detection.")+
'<section class="gf-card"><h4>YOUR MONITORING RULES</h4><div class="gf-filterbar"><select class="gf-select" id="gfWatchSelect"><option value="">Choose country or topic</option>'+Object.keys(countries).map(x=>'<option value="'+x+'">'+esc(countries[x])+'</option>').join("")+["missile","drone","interception","aviation","maritime","diplomacy"].map(x=>'<option>'+x+'</option>').join("")+'</select><button class="gf-control" data-act="watch-add">+ ADD WATCH</button></div>'+
(D.watch.length?D.watch.map(x=>'<button class="gf-control" data-watch-remove="'+esc(x)+'">'+esc(x)+' ✕</button>').join(" "):'<p>No watch rules configured.</p>')+'</section>'+
'<div class="gf-card"><h4>WATCHED PUBLICATIONS</h4>'+list(records,65)+'</div>'
}
function pageHtml(){
if(D.focus){let e=D.events.find(x=>x.id===D.focus);if(e)return dossier(e);D.focus=null}
switch(D.view){
case "countries":return countryDesk();
case "timeline":return timeline();
case "sitrep":return sitrep();
case "query":return queryView();
case "sources":return healthView();
case "hazards":return observationsView();
case "graph":return relationshipView();
case "watchlist":return watchView();
default:return fusion();
}
}
const pageNames={fusion:"Evidence Fusion",countries:"Country Intelligence",timeline:"Publication Replay",sitrep:"Situation Report",query:"Analyst Console",sources:"Source Health",hazards:"Environmental Data",graph:"Relationship Graph",watchlist:"Watchlist"};
function draw(){let n=$("fusionView");if(!n)return;n.innerHTML=pageHtml();$("fusionHeading").textContent=D.focus?"Evidence Dossier":pageNames[D.view]||"Fusion";$("fusionWorkNav").querySelectorAll("[data-gf-page]").forEach(x=>x.classList.toggle("active",x.dataset.gfPage===D.view))}
function open(page="fusion"){D.view=page;D.focus=null;$("fusionWorkbench").hidden=false;document.body.style.overflow="hidden";draw()}
function close(){$("fusionWorkbench").hidden=true;document.body.style.overflow=""}
function output(name,body,mime){let file=new Blob([body],{type:mime||"text/plain;charset=utf-8"}),uri=URL.createObjectURL(file),a=document.createElement("a");a.href=uri;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1500)}
function csv(records){let keys=["id","category","topic","title","countries","first_published","last_published","report_count","publisher_count","corroboration"];let quote=x=>'"'+String(Array.isArray(x)?x.join("|"):x??"").replace(/"/g,'""')+'"';return [keys.join(","),...records.map(r=>keys.map(x=>quote(r[x])).join(","))].join("\r\n")}
function hazardOverlay(active){
D.hazardsVisible=active;for(let marker of D.hazardMarkers)marker.remove();D.hazardMarkers=[];
if(!active)return;
let map=window.__gulfastraMap;if(!map||typeof maplibregl==="undefined")return;
for(let o of D.observations){if(!Number.isFinite(o.lon)||!Number.isFinite(o.lat))continue;
let node=document.createElement("button");node.className="gf-hazard-dot";node.title=o.title+" — "+o.source;
node.onclick=()=>{open("hazards");$("fusionView").insertAdjacentHTML("afterbegin",'<div class="gf-notice">'+esc(o.title)+' / '+esc(o.source)+'</div>')};
D.hazardMarkers.push(new maplibregl.Marker({element:node}).setLngLat([o.lon,o.lat]).addTo(map))}
}
function saveWatch(){try{localStorage.setItem("gulfastra-v5-watch",JSON.stringify(D.watch))}catch(e){}}
function loadWatch(){try{let a=JSON.parse(localStorage.getItem("gulfastra-v5-watch")||"[]");D.watch=Array.isArray(a)?a.filter(x=>typeof x==="string"):[]}catch(e){D.watch=[]}}


function doAction(action){
if(action==="clear"){D.country="";D.hours=72;D.lang="all";D.day=""}
if(action==="back")D.focus=null;
if(action==="day-reset")D.day="";
if(action==="go-query")D.view="query";
if(action==="brief-copy"){let text=markdownReport();if(navigator.clipboard)navigator.clipboard.writeText(text).catch(()=>output("Gulfastra-SITREP.md",text));else output("Gulfastra-SITREP.md",text)}
if(action==="brief-download")output("Gulfastra-SITREP.md",markdownReport(),"text/markdown;charset=utf-8");
if(action==="export-query")output("Gulfastra-results.csv",csv(D.queryResults),"text/csv;charset=utf-8");
if(action==="watch-add"){let value=$("gfWatchSelect")?.value;if(value&&!D.watch.includes(value)){D.watch.push(value);saveWatch()}}
if(action==="hazard-map"){hazardOverlay(!D.hazardsVisible);close();$("mapColumn")?.scrollIntoView({behavior:"smooth"});return}
draw();
}
async function requestData(name){let r=await fetch("data/"+name+"?v="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status+" "+name);return r.json()}
async function refresh(){
const attempts=await Promise.allSettled(["events.json","revisions.json","observations.json","reports.json"].map(requestData));
if(attempts[0].status==="fulfilled"){
let d=attempts[0].value;D.events=d.events||[];D.countryStats=d.country_stats||{};D.daily=d.daily_coverage||{};D.generated=d.generated_at}
if(attempts[1].status==="fulfilled")D.revisions=attempts[1].value.history||[];
if(attempts[2].status==="fulfilled"){D.observations=attempts[2].value.observations||[];D.obsHealth=attempts[2].value.health||[]}
if(attempts[3].status==="fulfilled")D.reportHealth=attempts[3].value.providers||{};
$("fusionHealth").textContent=D.events.length?"◈ "+D.events.length+" COVERAGE GROUPS":"FUSION ARCHIVE PENDING";
$("fusionHealth").classList.toggle("warning",!D.events.length);
$("fusionGenerated").textContent=D.generated?"UPDATED "+dates(D.generated):"ARCHIVE PENDING";
if(!$("fusionWorkbench").hidden)draw();
}
function bind(){
$("gfClose").onclick=close;
$("gfExport").onclick=()=>output("Gulfastra-public-coverage.json",JSON.stringify({generated_at:D.generated,events:sortedEvents()},null,2),"application/json;charset=utf-8");
document.querySelectorAll("[data-gf-open]").forEach(b=>b.onclick=()=>open(b.dataset.gfOpen));
$("fusionWorkNav").addEventListener("click",e=>{let n=e.target.closest("[data-gf-page]");if(!n)return;D.view=n.dataset.gfPage;D.focus=null;draw()});
$("fusionView").addEventListener("click",e=>{
let event=e.target.closest("[data-gf-event]");if(event){D.focus=event.dataset.gfEvent;draw();$("fusionView").scrollTop=0;return}
let c=e.target.closest("[data-gf-country]");if(c){D.country=c.dataset.gfCountry;D.view="fusion";draw();return}
let d=e.target.closest("[data-gf-day]");if(d){D.day=d.dataset.gfDay;D.hours=0;draw();return}
let w=e.target.closest("[data-watch-remove]");if(w){D.watch=D.watch.filter(x=>x!==w.dataset.watchRemove);saveWatch();draw();return}
let a=e.target.closest("[data-act]");if(a)doAction(a.dataset.act)});
$("fusionView").addEventListener("change",e=>{if(e.target.id==="gfCountry")D.country=e.target.value;else if(e.target.id==="gfWindow")D.hours=+e.target.value;else if(e.target.id==="gfLang")D.lang=e.target.value;else return;D.day="";draw()});
$("fusionView").addEventListener("submit",e=>{if(e.target.id!=="gfQueryForm")return;e.preventDefault();D.query=$("gfQueryInput").value;draw()});
$("fusionView").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-gf-event],[data-gf-country]")){e.preventDefault();e.target.click()}});
document.querySelector('[data-mobile="fusion"]')?.addEventListener("click",e=>{e.stopImmediatePropagation();open("fusion")},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("fusionWorkbench").hidden)close();if(e.key==="/"&&!e.ctrlKey&&!e.metaKey&&!["INPUT","TEXTAREA"].includes(e.target.tagName)){e.preventDefault();open("query");$("gfQueryInput")?.focus()}});
}
async function init(){loadWatch();bind();await refresh();setInterval(refresh,180000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();

})();