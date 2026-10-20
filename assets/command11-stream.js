/* GULFASTRA X / Evidence-first intelligence cards, dossiers, and SITREP. */
(function(root){
"use strict";
const C=root.GXCore,$=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString();
let DATA=()=>({}),CTX=()=>({}),onFilter=()=>{},xEmbedsEnabled=false;
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
function loadXTimelines(){
 xEmbedsEnabled=true;
 const slot=$("xTimelineSlot");
 if(!slot)return;
 slot.innerHTML='<div class="notice-box">Public timelines are rendered directly by X. X may use cookies and may require login; this content is not part of GULFASTRA critical alerts.</div>'+
 '<div class="brief-box"><a class="twitter-timeline" data-theme="dark" data-height="380" href="https://x.com/QNAEnglish">Latest public posts from QNA English</a></div>'+
 '<div class="brief-box"><a class="twitter-timeline" data-theme="dark" data-height="380" href="https://x.com/QatarNewsAgency">Latest public posts from Qatar News Agency (Arabic)</a></div>';
 if(window.twttr?.widgets?.load){window.twttr.widgets.load(slot);return}
 if(document.getElementById("gxXEmbedLoader"))return;
 const loader=document.createElement("script");
 loader.id="gxXEmbedLoader";loader.async=true;loader.src="https://platform.twitter.com/widgets.js";
 loader.onerror=()=>{slot.insertAdjacentHTML("beforeend",
 '<p class="notice-box">X embed unavailable in this browser. Use the account links above to open posts on X.</p>')};
 document.head.appendChild(loader);
}
function cardAdvisory(a){
 return '<button class="intel-card official-advisory" data-open="advisory" data-id="'+val(a.id)+'">'+
 '<div class="tags">'+tag(String(a.source||"PUBLIC SOURCE").toUpperCase(),"good")+
 tag(String(a.level||a.category||"PUBLIC ADVISORY").toUpperCase(),"neutral")+'</div>'+
 '<h3 dir="auto">'+val(a.title)+'</h3>'+
 '<div class="smallmeta"><span>PROVIDER PUBLICATION · '+C.age(a.published_at)+
 '</span><span>REVIEW ORIGINAL NOTICE</span></div></button>';
}
function cardSocial(p){
 return '<button class="intel-card social-post" data-open="social" data-id="'+val(p.id)+'">'+
 '<div class="tags">'+tag("X · SOCIAL POST","neutral")+tag("UNVERIFIED","warn")+'</div>'+
 '<h3 dir="auto">'+val(p.text)+'</h3>'+
 '<div class="smallmeta"><span>'+val(p.author)+'</span><span>'+C.age(p.published_at)+'</span></div></button>';
}
function supplementalStatus(ctx){
 const statuses=ctx.supplementalSources||{};
 const social=ctx.socialSource||{};
 const rows=Object.entries(statuses).map(([name,status])=>
  '<div class="source-line"><span>'+val(name)+'</span><span class="source-flag '+
  (status.ok===true?"":status.ok===false?"failed":"backoff")+'">'+
  val(status.state||"unknown").toUpperCase()+'</span></div>').join("");
 const sky=ctx.aviationSnapshot;
 return '<h3 class="eyebrow">ADDITIONAL PUBLIC DATA / DIFFERENT PROVENANCE</h3>'+rows+
 '<div class="source-line"><span>X API · SOCIAL POSTS</span><span class="source-flag '+
 (social.ok===true?"":social.ok===false?"failed":"backoff")+'">'+val(social.state||"unconfigured").toUpperCase()+'</span></div>'+
 (sky?'<div class="notice-box">OpenSky CIVIL TRANSPONDER SNAPSHOT: '+
 val(sky.civil_transponder_observations)+' recorded samples at '+val(sky.sample_at)+
 '. NOT live aircraft tracking or airspace clearance.</div>':"");
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
 supplementalStatus(ctx)+'<h3 class="eyebrow">OFFICIAL REFERENCE PORTALS · NOT LIVE INGESTION</h3>'+
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
  const hazardFirst=ctx.workspace==="hazards";
  markup=(hazardFirst?d.observations.slice(0,40).map(cardObs).join(""):"")+
    important.slice(0,5).map(cardAlert).join("")+d.events.slice(0,hazardFirst?15:60).map(cardEvent).join("");
  if(!d.events.length&&!hazardFirst)markup+=d.observations.slice(0,12).map(cardObs).join("");
  description=hazardFirst?"COORDINATE-BACKED NATURAL OBSERVATIONS · NOT CONFLICT CLAIMS":
   "PRIORITIZED BY PUBLICATION AGE + OUTLET DIVERSITY · "+d.events.length+" REPORTING GROUPS";
 }else if(tab==="events"){
  markup=d.events.slice(0,100).map(cardEvent).join("");
  description="SOURCE CORRELATION · "+d.events.length+" CANDIDATE GROUPS · UNVERIFIED";
 }else if(tab==="news"){
  markup=d.reports.slice(0,120).map(cardReport).join("");
  description="ORIGINAL PUBLISHED HEADLINES · "+d.reports.length+" IN FILTER";
 }else if(tab==="advisories"){
  markup='<div class="notice-box">Public advisories and humanitarian notices, not independent proof of damage or ongoing danger. GDACS locations may represent affected regions rather than incident coordinates.</div>'+
   d.advisories.slice(0,80).map(cardAdvisory).join("");
  description="OFFICIAL/INSTITUTIONAL ADVISORIES · "+d.advisories.length+" MATCHING";
 }else if(tab==="social"){
  const status=ctx.socialSource?.state||"not-configured";
  markup='<div class="notice-box">X PUBLIC POSTS · UNVERIFIED SOCIAL CLAIMS. The official API may cost money and is disabled unless separately authorized. Social posts do not trigger critical alerts.</div>'+
   '<div class="brief-box"><strong>VIEW PUBLIC POSTS ON X (OPENS X WEBSITE)</strong>'+
   link("https://x.com/search?q=%22Qatar%22%20%22security%22&f=live","QATAR SECURITY · X SEARCH")+
   link("https://x.com/search?q=%22Strait%20of%20Hormuz%22&f=live","HORMUZ / SHIPPING · X SEARCH")+
   link("https://x.com/search?q=%22Gulf%22%20%22airspace%22&f=live","GULF AVIATION · X SEARCH")+
   '<p>These are external X search pages, not posts ingested or checked by GULFASTRA.</p></div>'+
   '<div class="brief-box"><button type="button" class="linebutton" data-action="load-x-timelines">LOAD PUBLIC X PROFILE TIMELINES (OFFICIAL X WIDGET)</button>'+
   '<small>Loads an external X widget only after your click. If blocked, profile links remain available.</small></div>'+
   '<div id="xTimelineSlot"></div>'+
   '<div class="brief-box">X API STATUS: '+val(status).toUpperCase()+
   '<p>One capped search per six hours at most when explicitly enabled; never a continuous stream.</p></div>'+
   d.social.slice(0,70).map(cardSocial).join("");
  description="X POSTS · "+d.social.length+" MATCHING · "+status.toUpperCase();
 }else if(tab==="sources"){markup=showSourceHealth(ctx,d);description="INDEPENDENT SOURCE FETCH HEALTH / NOT SOURCE CREDIBILITY"}
 else if(tab==="brief"){markup=brief(ctx,d);description="RULE-BASED SITREP · LINKED SOURCES · NO GENERATIVE AI"}
 $("streamHeading").textContent=({priority:"INTELLIGENCE STREAM",events:"EVENT EVIDENCE",news:"PUBLIC NEWS WIRE",advisories:"PUBLIC ADVISORIES",social:"X PUBLIC POSTS",sources:"SOURCE HEALTH",brief:"SITUATION REPORT"})[tab]||"INTELLIGENCE";
 $("streamSummary").textContent=description;
 root.innerHTML=markup||'<div class="empty-state">No matching public records for this period. Select ALL to examine the archive. Lack of reporting does not imply safety.</div>';
 if(tab==="social"&&xEmbedsEnabled)loadXTimelines();
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
 }else if(type==="advisory"){
  item=d.allAdvisories.find(x=>x.id===id);if(!item)return;
  body='<div class="notice-box">Public institutional notice. Regional disaster coordinates may represent the event area, not an exact incident point. Current status and damage are not inferred.</div>'+
   '<div class="dossier-grid">'+fact("SOURCE",item.source)+fact("PUBLISHED",C.date(item.published_at))+
   fact("ADVISORY LEVEL",item.level||"Unspecified")+fact("LOCATION PRECISION",item.location_quality||"Not specified")+
   fact("EVIDENCE",item.verification||"Provider publication")+'</div>'+link(item.url,"OPEN ORIGINAL PUBLIC NOTICE");
 }else if(type==="social"){
  item=d.allSocial.find(x=>x.id===id);if(!item)return;
  body='<div class="notice-box">X post: an unverified public claim, NOT a confirmed emergency, official account verification, or an independently corroborated event.</div>'+
   '<div class="dossier-grid">'+fact("AUTHOR",item.author)+fact("POSTED",C.date(item.published_at))+
   fact("PROVENANCE","Official X API, if enabled")+fact("VERIFICATION","Unverified")+'</div>'+
   '<p dir="auto">'+val(item.text)+'</p>'+link(item.url,"OPEN ORIGINAL X POST");
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
root.GXStream={init(dataFn,contextFn,filterFn){DATA=dataFn;CTX=contextFn;onFilter=filterFn},render,showDossier,hideDossier,loadXTimelines,cardEvent,cardReport,cardObs};
})(window);
