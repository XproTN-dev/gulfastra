/* GULFASTRA X v11 core — deterministic data transforms, no invented observations. */
(function(root){
"use strict";
const REPO="https://raw.githubusercontent.com/XproTN-dev/gulfastra/intelligence-data/data/";
const FALLBACK="../data/";
const FILES=["reports.json","events.json","observations.json","alerts.json","collector_health.json","advisories.json","social.json","impact_graph.json","markets.json","daily_brief.json","direct_signals.json"];
const COUNTRY={
 Iran:{label:"Iran",lng:53.7,lat:32.2},Saudi:{label:"Saudi Arabia",lng:44.5,lat:24.5},
 Qatar:{label:"Qatar",lng:51.2,lat:25.25},UAE:{label:"United Arab Emirates",lng:54.4,lat:24.3},
 Bahrain:{label:"Bahrain",lng:50.56,lat:26.05},Kuwait:{label:"Kuwait",lng:47.5,lat:29.25},
 Iraq:{label:"Iraq",lng:43.4,lat:33.1},Oman:{label:"Oman",lng:57.3,lat:21.8},
 Yemen:{label:"Yemen",lng:47.5,lat:15.5},Israel:{label:"Israel",lng:35,lat:31.5}};
/* Grounded geographic references only: these are STATIC facilities, not activity feeds. */
const FACILITIES=[
 {id:"HIA",name:"Hamad International Airport",kind:"airport",lng:51.608,lat:25.273,country:"Qatar"},
 {id:"DXB",name:"Dubai International Airport",kind:"airport",lng:55.364,lat:25.253,country:"UAE"},
 {id:"AUH",name:"Zayed International Airport",kind:"airport",lng:54.651,lat:24.433,country:"UAE"},
 {id:"RUH",name:"King Khalid International Airport",kind:"airport",lng:46.698,lat:24.957,country:"Saudi"},
 {id:"MCT",name:"Muscat International Airport",kind:"airport",lng:58.284,lat:23.593,country:"Oman"},
 {id:"JEA",name:"Jebel Ali Port",kind:"port",lng:55.064,lat:24.987,country:"UAE"},
 {id:"HMD",name:"Hamad Port",kind:"port",lng:51.632,lat:25.025,country:"Qatar"},
 {id:"SHU",name:"Port of Shuwaikh",kind:"port",lng:47.919,lat:29.354,country:"Kuwait"}
];
const now=()=>Date.now();
const dt=x=>{let n=Date.parse(x||"");return Number.isFinite(n)?n:NaN};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const validUrl=x=>{try{const u=new URL(x);return u.protocol==="https:"?u.href:""}catch(_){return""}};
const age=x=>{const t=dt(x);if(!Number.isFinite(t))return"TIME UNKNOWN";const mins=Math.max(0,Math.floor((now()-t)/60000));return mins<1?"JUST NOW":mins<60?mins+"M AGO":mins<1440?Math.floor(mins/60)+"H AGO":Math.floor(mins/1440)+"D AGO"};
const date=x=>{const t=dt(x);return Number.isFinite(t)?new Date(t).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Unknown"};
const sourceName=x=>String(x?.source||x?.provider||"Unspecified source");
const safeText=x=>String(x??"").slice(0,800);
const asArray=x=>Array.isArray(x)?x:[];
const num=x=>Number.isFinite(+x)?+x:0;
function within(x,hours,asof=now()){
 const t=dt(x);return Number.isFinite(t)&&t<=asof+600000&&(hours===0||t>=asof-hours*3600000);
}
const countryOk=(x,c)=>!c||asArray(x.countries).includes(c)||x.country===c;
function queryOk(e,s){
 const q=(s.query||"").trim().toLocaleLowerCase();
 if(!q)return true;
 return [e.title,e.source,e.category,e.topic,asArray(e.countries).join(" ")].join(" ").toLocaleLowerCase().includes(q);
}
function dedupReports(items){
 const seen=new Set();
 return asArray(items).filter(r=>{
  if(!r||!r.title)return false;
  const key=(r.source||"").toLocaleLowerCase()+"|"+r.title.toLocaleLowerCase().replace(/[\W_]+/g," ").trim()+"|"+String(r.published_at||"").slice(0,10);
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
function latestEvidence(e){return e.coverage_last_published_at||e.last_published||e.first_published||""}
function selectReports(data,s){
 return dedupReports(data).filter(r=>countryOk(r,s.country)&&
  (s.topic==="all"||r.category===s.topic)&&queryOk(r,s)&&within(r.published_at,s.hours,s.asof))
  .sort((a,b)=>dt(b.published_at)-dt(a.published_at));
}
function selectEvents(data,s){
 return asArray(data).filter(e=>countryOk(e,s.country)&&
  (s.topic==="all"||e.category===s.topic)&&queryOk(e,s)&&
  within(latestEvidence(e),s.hours,s.asof))
  .sort((a,b)=>relevance(b,s)-relevance(a,s));
}
function relevance(e,s){
 const ageH=Math.max(0,(s.asof-dt(latestEvidence(e)))/3600000);
 const freshness=Number.isFinite(ageH)?Math.max(0,45-ageH*2):0;
 const outlets=Math.min(5,num(e.publisher_count))*5;
 const evidence=Math.min(10,num(e.report_count))*2;
 const topic=(e.category==="security"?8:e.category==="transport"?6:0);
 return Math.round(freshness+outlets+evidence+topic);
}
function selectObs(data,s){
 return asArray(data).filter(o=>{
  const when=o.occurred_at||o.published_at;
  return within(when,s.hours,s.asof)&&(!s.country||asArray(o.countries).includes(s.country)||String(o.title||"").toLowerCase().includes((COUNTRY[s.country]?.label||s.country).toLowerCase()))&&queryOk(o,s);
 }).sort((a,b)=>dt(b.occurred_at)-dt(a.occurred_at));
}
function selectAlerts(data,s){
 return asArray(data).filter(a=>countryOk(a,s.country)&&within(a.published_at,Math.min(s.hours||24,24),s.asof))
 .sort((a,b)=>dt(b.published_at)-dt(a.published_at));
}
function coords(o){if(!o||o.lat===null||o.lat===undefined||o.lon===null||o.lon===undefined||String(o.lat).trim()===""||String(o.lon).trim()==="")return null;const lat=Number(o.lat),lng=Number(o.lon);return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lng,lat]:null}
function geojson(items){
 return {type:"FeatureCollection",features:items.map(o=>({type:"Feature",geometry:{type:"Point",coordinates:o.coords},
  properties:{id:String(o.id),name:String(o.name||""),kind:o.kind||"unknown",count:o.count||1,country:o.country||""}}))};
}
function observedPoints(observations,layers){
 return asArray(observations).filter(o=>{
  const type=String(o.kind||"");
  return (layers.observed&&["earthquake","natural-event"].includes(type))||
   (layers.fires&&type==="thermal-detection");
 }).map(o=>{
  const center=coords(o);
  return center?{id:o.id,coords:center,name:o.title,kind:o.kind,country:""}:null;
 }).filter(Boolean).slice(0,650);
}
function countryCoverage(reports){
 const counts={};
 for(const r of reports){
  for(const country of new Set(asArray(r.countries).length?r.countries:r.country?[r.country]:[])){
   if(COUNTRY[country])counts[country]=(counts[country]||0)+1;
  }
 }
 return Object.entries(counts).map(([country,count])=>({id:"country:"+country,coords:[COUNTRY[country].lng,COUNTRY[country].lat],name:COUNTRY[country].label,kind:"coverage",count,country}));
}
function staticFacilities(layers,country){
 if(!layers.reference)return[];
 return FACILITIES.filter(f=>!country||f.country===country)
 .map(f=>({id:"facility:"+f.id,coords:[f.lng,f.lat],name:f.name,kind:"reference",country:f.country}));
}
function timeline(items,field,min,max,bins=48){
 const arr=Array(bins).fill(0),span=Math.max(1,max-min);
 for(const item of items){
  const t=dt(item[field]);if(!Number.isFinite(t)||t<min||t>max)continue;
  const idx=Math.min(bins-1,Math.max(0,Math.floor((t-min)/span*bins)));arr[idx]++;
 }return arr;
}
function loadState(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch(_){return fallback}}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
async function request(url,ms=9500){
 const controller=new AbortController(),clock=setTimeout(()=>controller.abort(),ms);
 try{const response=await fetch(url,{mode:"cors",cache:"no-store",signal:controller.signal});
  if(!response.ok)throw Error("HTTP "+response.status);return await response.json();
 }finally{clearTimeout(clock)}
}
async function load(previous={}){
 let manifest=null,status="live",warning="",changed=false;
 const cached=previous.files||{},priorManifest=previous.manifest||null;
 try{
  manifest=await request(REPO+"live-manifest.json?time="+now(),7500);
  if(manifest.schema!==7||manifest.channel!=="github-intelligence-data"||!manifest.files)
   throw Error("Invalid branch manifest");
 }catch(error){
  status=priorManifest?"partial":"fallback";
  warning="GitHub manifest unavailable: "+error.message;
  // Preserve last known source-backed data instead of replacing with an old
  // bundled snapshot on transient network outages. Mark it degraded.
  manifest=priorManifest;
 }
 const files={};
 await Promise.all(FILES.map(async name=>{
  const hash=manifest?.files?.[name]?.sha256;
  const previousHash=priorManifest?.files?.[name]?.sha256;
  if(hash&&previousHash===hash&&cached[name]){
   files[name]=cached[name];return;
  }
  if(hash){
   try{
    files[name]=await request(REPO+name+"?v="+encodeURIComponent(hash));
    changed=true;return;
   }catch(error){
    status="partial";warning+="; "+name+" fetch failed";
   }
  }
  if(cached[name]){
   files[name]=cached[name];return;
  }
  try{
   files[name]=await request(FALLBACK+name,6000);
   status=status==="live"?"partial":status;
   warning+="; "+name+" bundled fallback";
   changed=true;
  }catch(error){
   files[name]={};
   status="partial";
   warning+="; "+name+" unavailable";
  }
 }));
 return {manifest,files,status,warning,changed,
  checkedAt:new Date().toISOString()};
}
root.GXCore={REPO,FALLBACK,FILES,COUNTRY,FACILITIES,dt,now,esc,validUrl,age,date,sourceName,safeText,asArray,num,within,countryOk,queryOk,dedupReports,latestEvidence,selectReports,selectEvents,relevance,selectObs,selectAlerts,coords,geojson,observedPoints,countryCoverage,staticFacilities,timeline,loadState,store,request,load};
})(window);
