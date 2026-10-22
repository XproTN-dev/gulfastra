/* GULFASTRA Early Detector UI: independent source signals, not claimed emergencies. */
(function(root){
"use strict";
const C=root.GXCore;
if(!C)return;
const $=id=>document.getElementById(id);
const esc=C.esc,arr=C.asArray;
const ORDER={"P1":1,"P2":2,"P3":3};
let windowHours=2,priority="all",alertOptIn=false,lastShown=new Set();
try{alertOptIn=localStorage.getItem("gulfastra-detector-notices")==="yes"}catch(_){}
const chip=(label,cls)=>'<span class="det-chip '+cls+'">'+esc(label)+'</span>';
const safeTime=t=>Number.isFinite(C.dt(t))?C.age(t):"UNKNOWN DATE";
const labelFor=s=>s.evidence_state==="unverified-reporting"?"UNVERIFIED FIRST REPORT":
 s.evidence_state==="provider-observation"?"PROVIDER OBSERVATION":"PUBLISHED ADVISORY";
const signalLabel=s=>s.priority==="P1"?"P1 · REVIEW NOW":
 s.priority==="P2"?"P2 · IMPORTANT":"P3 · CONTEXT";
const sourceName=s=>s.original_source||s.sources?.[0]?.name||"PUBLIC SOURCE";
function filtered(signals,opts={}){
 const hours=Number.isFinite(opts.hours)?opts.hours:windowHours,priorityFilter=opts.priority??priority;
 const end=Date.now(),country=opts.country||"";
 return arr(signals).filter(s=>s&&ORDER[s.priority]&&
   Number.isFinite(C.dt(s.last_published_at))&&C.dt(s.last_published_at)<=end+300000&&
   C.dt(s.last_published_at)>=end-hours*3600000&&
   (priorityFilter==="all"||s.priority===priorityFilter)&&
   (!country||arr(s.countries).includes(country)))
 .sort((a,b)=>(ORDER[a.priority]-ORDER[b.priority])||
             (C.dt(b.last_published_at)-C.dt(a.last_published_at))).slice(0,150);
}
function panel(files,context={}){
 const doc=files["early_signals.json"]||{};
 const fast=files["fast_signals.json"]||{};
 const selected=filtered(doc.signals,{country:context.country});
 const isSlow=Date.now()-C.dt(doc.generated_at)>16*60000;
 const generated=doc.generated_at?safeTime(doc.generated_at):"NEVER COLLECTED";
 const urgent=selected.filter(s=>s.priority==="P1").length;
 const flagged=selected.filter(s=>s.evidence_state==="unverified-reporting").length;
 const evidence=selected.filter(s=>s.evidence_state!=="unverified-reporting").length;
 const sources=Object.entries(fast.sources||{});
 let html='<div class="detector-root">'+
 '<div class="detector-head"><div><span class="kicker">SIGNAL-FIRST INTELLIGENCE · NOT AN EMERGENCY SERVICE</span>'+
 '<h2>Early detection feed</h2><p>Original provider observations and important first publisher reports. '+
 'Every signal remains linked to source evidence and its verification state.</p></div>'+
 '<div class="detector-status '+(isSlow?"late":"")+'">'+
 '<strong>'+(isSlow?"COLLECTION DELAYED":"RECENT COLLECTION")+'</strong>'+
 '<span>GENERATED '+generated+'</span>'+
 '<span>TEST GATE: '+esc(doc.quality_gate||"UNKNOWN").toUpperCase()+'</span></div></div>'+
 '<div class="det-metrics"><div><small>P1 · IMMEDIATE REVIEW</small><b>'+urgent+
 '</b><span>Importance ≠ confirmation</span></div>'+
 '<div><small>PROVIDER SIGNALS</small><b>'+evidence+'</b><span>Official data & observations</span></div>'+
 '<div><small>FIRST PUBLISHER CLAIMS</small><b>'+flagged+
 '</b><span>Unverified breaking reporting</span></div>'+
 '<div><small>NEW SINCE LAST COLLECTION</small><b>'+arr(doc.new_ids).length+
 '</b><span>Detections, not confirmed incidents</span></div></div>'+
 '<div class="det-toolbar"><div class="det-range"><span>RECENCY</span>'+
 [1,2,6,24].map(h=>'<button data-detect-window="'+h+'" class="'+(windowHours===h?"active":"")+'">'+h+'H</button>').join("")+
 '</div><div class="det-range"><span>PRIORITY</span>'+
 ["all","P1","P2","P3"].map(level=>'<button data-detect-priority="'+level+
 '" class="'+(priority===level?"active":"")+'">'+level.toUpperCase()+'</button>').join("")+
 '</div></div>'+
 '<div class="det-notice">'+
 '<b>EARLY WARNING ≠ CONFIRMATION</b><span>First report: unverified. Provider warning: published by source. '+
 'Earthquakes, weather and global space-weather alerts do not prove attacks or casualties. '+
 'An empty or delayed feed is not an all-clear.</span></div>'+
 '<div class="detector-body"><div class="detector-list"><div class="det-section-title">PUBLIC SIGNALS IN '+windowHours+
 'H WINDOW <span>'+selected.length+' RECORDS</span></div>';
 if(!selected.length)html+='<div class="det-empty">No matching newly published signals in this window, or detector data is not available yet. '+
 'Try 6H or inspect provider status. Absence of reporting is not evidence of safety.</div>';
 for(const s of selected){
  const nSource=arr(s.sources).length;
  html+='<button type="button" class="det-event priority-'+esc(s.priority)+'" data-early-id="'+esc(s.id)+'">'+
  '<div class="det-event-meta">'+chip(signalLabel(s),s.priority.toLowerCase())+
  chip(labelFor(s),s.evidence_state==="unverified-reporting"?"unverified":"provider")+
  '<span>'+safeTime(s.last_published_at)+'</span></div>'+
  '<strong dir="auto">'+esc(s.title)+'</strong>'+
  '<div class="det-event-foot"><span>'+esc(sourceName(s))+
  (nSource>1?" · "+nSource+" SOURCE LINKS":"")+'</span>'+
  '<span>FIRST DETECTED '+safeTime(s.first_detected_at)+' ↗</span></div></button>';
 }
 html+='</div><aside class="detector-sources"><div class="det-section-title">SOURCE HEALTH</div>'+
  '<div class="det-sources-note">Last fetch status is not evidence an event is active. The dashboard checks new file versions while open.</div>';
 if(!sources.length)html+='<div class="det-empty">Fast collector has not published provider status yet.</div>';
 for(const [name,info] of sources){
  const bad=info.ok===false||info.state==="failed";
  html+='<div class="det-source-row"><span>'+esc(name)+'</span><b class="'+(bad?"bad":"")+'">'+
   esc(info.state||"unknown").toUpperCase()+'</b><small>'+safeTime(info.last_success_at||info.attempt_at)+'</small></div>';
 }
 html+='<div class="det-enable">'+
  '<button type="button" id="detNotify" data-detect-notify="1">'+
  (alertOptIn?"BROWSER NOTICES ENABLED":"ENABLE BROWSER NOTICES")+'</button>'+
  '<small>Only while this page is open, with browser permission; not guaranteed push notifications. '+
  'Opt-in Telegram is configured separately.</small></div></aside></div>'+
  '<p class="det-footer">Urgency is an editorial review queue, not a mathematical risk probability. '+
  'The first-detected time records OUR collector discovery, not when the real-world incident began.</p></div>';
 return html;
}
function dossier(s){
 const evidence=arr(s.sources).map(a=>{
  const url=C.validUrl(a.url);
  return url?'<a href="'+esc(url)+'" class="context-link" target="_blank" rel="noopener noreferrer">'+
   esc(a.name||"Source")+' · '+safeTime(a.published_at)+' ↗</a>':"";
 }).join("");
 const coords=s.coordinates;
 return '<div class="context-warning">PUBLIC SIGNAL · '+esc(labelFor(s))+
 '. P1 is an urgency queue, NOT an officially confirmed emergency. '+esc(s.evidence_note||"")+'</div>'+
  '<div class="context-row"><small>DETECTION PRIORITY</small>'+esc(signalLabel(s))+'</div>'+
  '<div class="context-row"><small>REPORT TYPE</small>'+esc(s.kind)+'</div>'+
  '<div class="context-row"><small>PUBLISHED</small>'+esc(C.date(s.last_published_at))+'</div>'+
  '<div class="context-row"><small>FIRST SEEN BY COLLECTOR</small>'+esc(C.date(s.first_detected_at))+'</div>'+
  '<div class="context-row"><small>VERIFICATION</small>'+esc(s.evidence_state)+'</div>'+
  '<div class="context-row"><small>STATUS OF UNDERLYING INCIDENT</small>UNKNOWN</div>'+
  (coords?'<div class="context-row"><small>PROVIDER COORDINATES ('+
   esc(coords.precision||"unspecified")+')</small>'+esc(coords.lat)+', '+esc(coords.lon)+'</div>':
   '<div class="context-row"><small>INCIDENT COORDINATES</small>NOT ESTABLISHED</div>')+
  '<h3>ORIGINAL EVIDENCE</h3>'+evidence+
  '<p class="context-meta">This signal may be corrected or withdrawn by its source. '+
  'Follow official local guidance for urgent safety decisions.</p>';
}
function maybeNotify(files){
 if(!alertOptIn||!("Notification" in root)||Notification.permission!=="granted")return;
 const doc=files["early_signals.json"]||{};
 for(const id of arr(doc.new_urgent_ids).slice(0,3)){
  if(lastShown.has(id))continue;
  const record=arr(doc.signals).find(s=>s.id===id);
  if(!record)continue;
  try{
   const key="gx-detect:"+id,seen=localStorage.getItem(key);
   if(seen)continue;
   localStorage.setItem(key,"1");
   lastShown.add(id);
   new Notification("GULFASTRA P1 · PUBLIC SIGNAL",{
    body:(record.evidence_state==="unverified-reporting"?"UNVERIFIED REPORT: ":"PROVIDER NOTICE: ")+
      String(record.title).slice(0,110),
    tag:"gulfastra-"+id.slice(0,64)});
  }catch(_){}
 }
}
async function enableNotice(){
 if(!("Notification" in root))return "This browser does not support notification permission.";
 try{
  const status=await Notification.requestPermission();
  if(status==="granted"){
   alertOptIn=true;
   try{localStorage.setItem("gulfastra-detector-notices","yes")}catch(_){}
   return "Browser notices enabled while this page remains open.";
  }
  return "Notification permission was not granted.";
 }catch(e){return "Browser notification permission failed."}
}
root.GXEarlyUI={panel,dossier,filtered,maybeNotify,enableNotice,
 setHours(h){if([1,2,6,24].includes(h))windowHours=h},
 setPriority(p){if(["all","P1","P2","P3"].includes(p))priority=p},
 get hours(){return windowHours}};
})(window);
