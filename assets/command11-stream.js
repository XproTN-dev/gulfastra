/* GULFASTRA X / Evidence-first intelligence cards, dossiers, and SITREP. */
(function(root){
"use strict";
const C=root.GXCore,$=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString();
let DATA=()=>({}),CTX=()=>({}),onFilter=()=>{};
const tag=(s,t="")=>'<span class="tag '+C.esc(t)+'">'+C.esc(s)+'</span>';
const val=x=>C.esc(x??"Unknown");
function fact(label,value){return '<div><small>'+val(label)+'</small><strong>'+val(value)+'</strong></div>'}
function link(url,name){const u=C.validUrl(url);return u?'<a href="'+C.esc(u)+'" target="_blank" rel="noopener noreferrer">'+val(name||"READ PRIMARY SOURCE")+' ↗</a>':""}
function cardEvent(e){
 const name=String(e.coverage_stage||"publication-time-unknown").replace(/-/g," ").toUpperCase();
 return '<button class="intel-card" data-open="event" data-id="'+val(e.id)+'"><div class="tags">'+tag((e.category||"REPORTING").toUpperCase())+
 tag(name,e.current_reporting?"good":"neutral")+'</div><h3 dir="auto">'+val(e.title||"Public report")+'</h3>'+
 '<div class="smallmeta"><span>'+C.age(C.latestEvidence(e))+'</span><span>'+fmt(e.report_count)+' ARTICLES · '+
 fmt(e.publisher_count)+' OUTLET NAMES</span></div>'+
 '<p>Related reporting · '+val(C.asArray(e.countries).join(", ")||"Location unknown")+
 ' · Incident status unknown.</p></button>';
}
function cardReport(r){
 return '<button class="intel-card" data-open="report" data-id="'+val(r.id)+'"><div class="tags">'+tag((r.category||"NEWS").toUpperCase())+
 tag(r.date_quality==="index-first-seen"?"FIRST INDEXED":"PUBLISHED","neutral")+
 (r.context&&r.context!=="reporting"?tag(r.context.toUpperCase(),"warn"):"")+
 '</div><h3 dir="auto"'+(r.language==="ar"?' class="headline-ar"':"")+'>'+val(r.title)+'</h3>'+
 '<div class="smallmeta"><span>'+val(r.source)+'</span><span>'+C.age(r.published_at)+'</span></div></button>';
}
function cardObs(o){
 return '<button class="intel-card" data-open="observation" data-id="'+val(o.id)+'"><div class="tags">'+
 tag(o.kind==="earthquake"?"USGS SEISMIC":o.kind==="thermal-detection"?"SATELLITE THERMAL":"NATURAL OBSERVATION","good")+
 tag(C.coords(o)?"COORDINATES OBSERVED":"NO PRECISE COORDINATES","neutral")+'</div>'+
 '<h3 dir="auto">'+val(o.title)+'</h3><div class="smallmeta"><span>'+val(o.source)+'</span><span>'+
 C.age(o.occurred_at||o.published_at)+'</span></div></button>';
}
function cardAlert(a){
 return '<button class="intel-card" data-open="alert" data-id="'+val(a.id)+'"><div class="tags">'+tag("CRITICAL PUBLIC REPORTING","critical")+tag("UNVERIFIED","warn")+'</div>'+
 '<h3 dir="auto">'+val(a.title)+'</h3><div class="smallmeta"><span>'+fmt(a.outlet_count)+' OUTLETS</span><span>'+C.age(a.published_at)+'</span></div></button>';
}
function showSourceHealth(ctx,data){
 const p=data.providers||{},sources=Object.entries(p);
 return (ctx.quality!=="passed"?'<div class="notice-box">Alert-quality gate is '+val(ctx.quality)+'. An empty alert list is not an all-clear.</div>':"")+
 (ctx.delayed?'<div class="notice-box">LAST COLLECTION DELAYED · latest reports and alerts may be missing.</div>':"")+
 (ctx.channel!=="live"?'<div class="notice-box">Public GitHub data branch unavailable or partly cached. Data freshness is uncertain.</div>':"")+
 '<div class="brief-box"><strong>'+sources.filter(([,v])=>v.ok===true).length+'/'+sources.length+' SOURCE CHECKS SUCCEEDED</strong><p>Last successful collection: '+
 val(ctx.collected||"unknown")+'. Backoff and rate-limits are not equivalent to confirmed source failures.</p></div>'+
 sources.map(([name,s])=>'<div class="source-line"><span dir="auto">'+val(name)+'</span><span class="source-flag '+
 (s.ok===true?"":s.ok===false?"failed":"backoff")+'">'+(s.ok===true?"OK":s.ok===false?"ERROR":"BACKOFF")+'</span></div>').join("")+
 '<h3 class="eyebrow">OFFICIAL REFERENCE PORTALS · NOT LIVE INGESTION</h3>'+
 [["UKMTO · MARITIME SECURITY","https://www.ukmto.org/"],
  ["NASA FIRMS · THERMAL DATA","https://firms.modaps.eosdis.nasa.gov/"],
  ["USGS · SEISMIC EVENTS","https://earthquake.usgs.gov/"],
  ["NASA EONET · NATURAL EVENTS","https://eonet.gsfc.nasa.gov/"],
  ["GDACS · DISASTER ALERTS","https://www.gdacs.org/"],
  ["OpenSky · CIVIL AVIATION DATA","https://opensky-network.org/"]]
 .map(([name,url])=>link(url,name)).join("")+
 '<div class="notice-box">External reference links are not automatically ingested streams. Their operational coverage, permissions and latency vary.</div>';
}
function brief(ctx,d){
 const counts={security:0,transport:0,diplomacy:0};
 d.events.forEach(e=>{counts[e.category]=(counts[e.category]||0)+1});
 return '<div class="brief-box"><span class="eyebrow">DETERMINISTIC INTELLIGENCE SUMMARY</span>'+
 '<h3>PUBLIC REPORTING WINDOW / '+(ctx.hours?ctx.hours+" HOURS":"AVAILABLE ARCHIVE")+'</h3>'+
 '<p>Related coverage groups: '+d.events.length+'. Indexed headlines: '+d.reports.length+
 '. Observational records: '+d.observations.length+'.</p>'+
 '<p>Security: '+(counts.security||0)+' · Transport: '+(counts.transport||0)+
 ' · Diplomacy: '+(counts.diplomacy||0)+'.</p>'+
 '<p>Source freshness: '+val(ctx.collected||"unknown")+'. Quality tests: '+val(ctx.quality)+'.</p></div>'+
 '<div class="notice-box">This is a rule-based summary of public publication metadata, not an AI-generated prediction. Reporting volume cannot establish the number or severity of real incidents.</div>'+
 '<h3 class="eyebrow">RELEVANT COVERAGE</h3>'+d.events.slice(0,8).map(cardEvent).join("")+
 '<h3 class="eyebrow">GEOLOCATED OBSERVATIONS</h3>'+d.observations.slice(0,5).map(cardObs).join("");
}
function render(ctx,d){
 const tab=ctx.tab,root=$("stream");
 let markup="",description="";
 if(tab==="priority"){
  const important=!ctx.delayed&&ctx.quality==="passed"?d.alerts.filter(a=>a.level==="critical-reporting"&&C.dt(a.published_at)>Date.now()-7200000):[];
  markup=important.slice(0,5).map(cardAlert).join("")+d.events.slice(0,60).map(cardEvent).join("");
  if(!d.events.length)markup+=d.observations.slice(0,12).map(cardObs).join("");
  description="PRIORITIZED BY PUBLICATION AGE + OUTLET DIVERSITY · "+d.events.length+" REPORTING GROUPS";
 }else if(tab==="events"){
  markup=d.events.slice(0,100).map(cardEvent).join("");
  description="SOURCE CORRELATION · "+d.events.length+" CANDIDATE GROUPS · UNVERIFIED";
 }else if(tab==="news"){
  markup=d.reports.slice(0,120).map(cardReport).join("");
  description="ORIGINAL PUBLISHED HEADLINES · "+d.reports.length+" IN FILTER";
 }else if(tab==="sources"){markup=showSourceHealth(ctx,d);description="INDEPENDENT SOURCE FETCH HEALTH / NOT SOURCE CREDIBILITY"}
 else if(tab==="brief"){markup=brief(ctx,d);description="RULE-BASED SITREP · LINKED SOURCES · NO GENERATIVE AI"}
 $("streamHeading").textContent=({priority:"INTELLIGENCE STREAM",events:"EVENT EVIDENCE",news:"PUBLIC NEWS WIRE",sources:"SOURCE HEALTH",brief:"SITUATION REPORT"})[tab]||"INTELLIGENCE";
 $("streamSummary").textContent=description;
 root.innerHTML=markup||'<div class="empty-state">No matching public records for this period. Select ALL to examine the archive. Lack of reporting does not imply safety.</div>';
}
function showDossier(type,id){
 const d=DATA(),ctx=CTX();let item,body="";
 if(type==="event"){
  item=d.allEvents.find(x=>x.id===id);if(!item)return;
  const sources=C.asArray(item.sources);
  body='<div class="notice-box">These are candidate correlated public claims—not verified incidents. No operational status or exact incident location is established.</div>'+
   '<div class="dossier-grid">'+fact("PUBLICATION LIFECYCLE",(item.coverage_stage||"unknown").replace(/-/g," ").toUpperCase())+
   fact("INCIDENT STATUS","UNKNOWN / NOT VERIFIED")+fact("LINKED REPORTS",item.report_count)+fact("NAMED OUTLETS",item.publisher_count)+
   fact("LATEST ARTICLE",C.date(C.latestEvidence(item)))+fact("LOCATION QUALITY",item.location_quality||"country mention")+'</div>'+
   (item.wording_review?.review_required?'<div class="notice-box">Automated opposing wording cues detected. Manual verification needed.</div>':"")+
   '<h3>RELATED PUBLICATION EVIDENCE · '+sources.length+' LINKS</h3>'+
   sources.slice(0,60).map(x=>'<div class="brief-box"><strong dir="auto">'+val(x.title)+'</strong><p>'+val(x.source)+' · '+C.date(x.published_at)+
     ' · '+val(x.date_quality||"publication time not audited")+'</p>'+link(x.url,"OPEN PUBLISHER / ARTICLE")+'</div>').join("");
 }else if(type==="report"){
  item=d.allReports.find(x=>x.id===id);if(!item)return;
  body='<div class="dossier-grid">'+fact("ORIGINAL OUTLET",item.source)+fact("TIME",C.date(item.published_at))+
   fact("DATE PROVENANCE",item.date_quality)+fact("CATEGORY",item.category)+fact("CONTEXT",item.context)+
   fact("COUNTRIES MENTIONED",C.asArray(item.countries).join(", "))+'</div>'+
   '<div class="notice-box">Article publication does not establish the time, truth or location of the reported incident.</div>'+
   link(item.url,"OPEN PUBLISHED ARTICLE");
 }else if(type==="observation"){
  item=d.allObs.find(x=>String(x.id)===String(id));if(!item)return;
  body='<div class="dossier-grid">'+fact("PROVIDER",item.source)+fact("OBSERVED AT",C.date(item.occurred_at))+
   fact("KIND",item.kind)+fact("COORDINATES",C.coords(item)?.join(", ")||"country-level only")+
   fact("MAGNITUDE",item.magnitude??"Not applicable")+fact("LOCATION PROVENANCE",item.coordinates_quality)+'</div>'+
   '<div class="notice-box">A natural hazard or satellite thermal anomaly is NOT evidence of hostile activity.</div>'+link(item.url,"OPEN PRIMARY PROVIDER RECORD");
 }else if(type==="alert"){
  item=d.allAlerts.find(x=>x.id===id);if(!item)return;
  body='<div class="notice-box">Potentially critical public REPORTING only—not official safety guidance or a confirmed event.</div>'+
   '<div class="dossier-grid">'+fact("LEVEL",item.level)+fact("PUBLISHER NAMES",item.outlet_count)+fact("PUBLICATION",C.date(item.published_at))+
   fact("COUNTRY MENTIONS",C.asArray(item.countries).join(", "))+'</div>'+
   '<h3>LINKED ORIGINAL REPORTS</h3>'+C.asArray(item.source_urls).map(x=>link(x.url,x.name)).join("");
 }else if(type==="facility"){
  item=C.FACILITIES.find(x=>"facility:"+x.id===id);if(!item)return;
  body='<div class="notice-box">Static infrastructure reference. NOT a live operating, flight, ship or security feed.</div>'+
   '<div class="dossier-grid">'+fact("TYPE",item.kind)+fact("COUNTRY",item.country)+fact("LOCATION",item.lng+", "+item.lat)+fact("OPERATING STATUS","NOT MONITORED")+'</div>';
 }else if(type==="country"){
  item=C.COUNTRY[id];if(!item)return;
  const matched=C.selectReports(d.allReports,{...ctx.filter,country:id});
  body='<div class="notice-box">Country marker is a geographic reference point and count of country mentions, NOT real incidents or accurate event coordinates.</div>'+
   '<div class="dossier-grid">'+fact("REPORTS MATCHING FILTER",matched.length)+fact("COUNTRY REFERENCE",item.lng+", "+item.lat)+'</div>'+
   '<button class="linebutton" data-filter-country="'+val(id)+'">FILTER DASHBOARD TO '+val(item.label)+'</button>'+
   '<h3>RECENT PUBLISHED ARTICLES</h3>'+matched.slice(0,14).map(cardReport).join("");
 }else return;
 $("dossierTitle").textContent=String(item?.title||item?.name||item?.label||"EVIDENCE");
 $("dossierContent").innerHTML=body;
 $("dossierBackdrop").hidden=false;$("dossier").hidden=false;$("dossierClose").focus();
}
function hideDossier(){$("dossierBackdrop").hidden=true;$("dossier").hidden=true}
root.GXStream={init(dataFn,contextFn,filterFn){DATA=dataFn;CTX=contextFn;onFilter=filterFn},render,showDossier,hideDossier,cardEvent,cardReport,cardObs};
})(window);
