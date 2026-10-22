/* Impact Lab geographic workspace: shares the Command Center's real MapLibre data layers.
   Published news is country-level coverage, NEVER incident coordinates. */
(function(root){
"use strict";
const C=root.GXCore,M=root.GXMap;
const $=id=>document.getElementById(id);
if(!C||!M)return;
let started=false,lastInfo=null,liveUSGS=[],liveStatus="not-checked",lastUSGS=0;
let inFlight=null;
const SOURCE_USGS="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
let data=()=>({}),getFilter=()=>({}),open=()=>{};
const link=(url,label)=>{
 const valid=C.validUrl(url);
 return valid?'<a class="context-link" href="'+C.esc(valid)+'" target="_blank" rel="noopener noreferrer">'+C.esc(label)+" ↗</a>":"";
};
const field=(name,value)=>'<div class="context-row"><small>'+C.esc(name)+'</small>'+C.esc(value??"Not supplied")+'</div>';
const inputs=()=>{
 const files=data(),f=getFilter(),q={country:f.country,topic:f.category||"all",
  hours:f.hours||1,asof:Date.now(),query:""};
 const allReports=C.asArray(files["reports.json"]?.reports);
 const geo=C.asArray(files["observations.json"]?.observations);
 const direct=C.asArray(files["direct_signals.json"]?.observations);
 const advisory=C.asArray(files["advisories.json"]?.items);
 const reports=C.selectReports(allReports,q);
 // Merge USGS browser-hour feed with cached GitHub source data; same id wins.
 const combined=new Map();
 for(const item of [...geo,...direct,...liveUSGS]){
  if(item.id)combined.set(item.id,item);
 }
 const observations=C.selectObs([...combined.values()],{...q,topic:"all"});
 const advisories=advisory.filter(a=>
  C.within(a.published_at,q.hours,q.asof)&&
  (!q.country||C.asArray(a.countries).includes(q.country)));
 return {reports,observations,advisories,country:q.country};
};
async function pollHourlyUSGS(){
 const now=Date.now();
 if(inFlight||now-lastUSGS<120000)return;
 lastUSGS=now;
 const controller=new AbortController();
 const fail=setTimeout(()=>controller.abort(),9500);
 inFlight=(async()=>{
  try{
   const response=await fetch(SOURCE_USGS,{signal:controller.signal,cache:"no-store"});
   if(!response.ok)throw Error("HTTP "+response.status);
   const body=await response.json(),fresh=[];
   for(const x of (body.features||[]).slice(0,300)){
    const p=x.properties||{},coords=x.geometry?.coordinates||[];
    if(coords.length<2)continue;
    const lon=Number(coords[0]),lat=Number(coords[1]);
    if(lon<32||lon>66||lat<10||lat>40)continue;
    const timestamp=Number(p.time);
    if(!Number.isFinite(timestamp)||timestamp>now+300000||timestamp<now-3900000)continue;
    const id=String(x.id||"");
    if(!id)continue;
    fresh.push({id:"usgs:"+id,kind:"earthquake",source:"USGS / direct hourly feed",
     title:String(p.title||"USGS earthquake").slice(0,180),
     url:C.validUrl(p.url)||"https://earthquake.usgs.gov/earthquakes/map/",
     occurred_at:new Date(timestamp).toISOString(),published_at:new Date(timestamp).toISOString(),
     lat,lon,magnitude:Number.isFinite(Number(p.mag))?Number(p.mag):null,
     coordinates_quality:"USGS preliminary epicentre",classification:"natural-earthquake-observation"});
   }
   liveUSGS=fresh;
   liveStatus="active · "+fresh.length+" Gulf records";
  }catch(error){
   liveStatus="unavailable · GitHub cached observations remain";
  }finally{
   clearTimeout(fail);inFlight=null;
   if(started&&(!$("labMapHost").hidden))update();
  }
 })();
 return inFlight;
}
function showDetails(type,id){
 const files=data();
 if(type==="observation"){
  const o=inputs().observations.find(x=>x.id===id);
  if(!o)return;
  const coordinates=C.coords(o);
  open(o.title||"Public geographic observation",
    '<div class="context-warning">Provider geographic observation. Coordinates and timestamps retain the source\'s precision; neither establishes a conflict incident, damage, cause or emergency advice.</div>'+
    field("SOURCE",o.source||o.provider||"Unspecified")+
    field("RECORD TYPE",o.kind||"Observation")+
    field("OBSERVED / PUBLISHED",C.date(o.occurred_at||o.published_at))+
    field("COORDINATES",coordinates?coordinates[1].toFixed(3)+", "+coordinates[0].toFixed(3):"Unavailable")+
    field("LOCATION PRECISION",o.coordinates_quality||o.location_quality||"Provider stated")+
    link(o.url||o.source_url,"Original provider data"));
 }else if(type==="report"){
  const r=inputs().reports.find(x=>String(x.id)===String(id));
  if(!r)return;
  open(r.title||"Published reporting",
   '<div class="context-warning">Source-published headline, NOT an independently verified incident. Its country label is not an exact event coordinate.</div>'+
   field("PUBLISHER",r.source||"Unknown")+
   field("PUBLISHED",C.date(r.published_at))+
   field("CATEGORY",r.category||"Unknown")+
   field("GEOLOCATION","Mentioned countries only; no incident point asserted")+
   link(r.url,"Open original published reporting"));
 }else if(type==="advisory"){
  const a=C.asArray(files["advisories.json"]?.items).find(x=>x.id===id);
  if(!a)return;
  open(a.title||"Institutional advisory",
    '<div class="context-warning">Public institutional hazard advisory, not independently confirmed damage. Point geometry may represent a large region rather than an event center.</div>'+
    field("SOURCE",a.source)+field("PUBLICATION",C.date(a.published_at))+
    field("ADVISORY LEVEL",a.level||"Unknown")+
    field("LOCATION PRECISION",a.location_quality||"Source geometry")+
    link(a.url,"Original provider advisory"));
 }else if(type==="country"){
  const country=String(id||"");
  if(!C.COUNTRY[country])return;
  const d=inputs(),matching=d.reports.filter(r=>C.asArray(r.countries).includes(country)||r.country===country);
  open(C.COUNTRY[country].label+" · Published coverage",
    '<div class="context-warning">This pin is the COUNTRY REFERENCE CENTER for news mentions, not a geolocated event or evidence of an active incident.</div>'+
    field("MATCHING REPORTS",matching.length)+field("TIME WINDOW",getFilter().hours+" hours")+
    matching.slice(0,12).map(r=>link(r.url,(r.source||"PUBLISHER")+" · "+(r.title||"Original report"))).join(""));
 }else if(type==="facility"){
  const k=String(id||"").replace(/^facility:/,"");
  const f=C.FACILITIES.find(x=>x.id===k);
  if(!f)return;
  open(f.name,
    '<div class="context-warning">STATIC GEOGRAPHIC REFERENCE ONLY. Not a live airport/port activity feed, route clearance, flight tracking, maritime status or safety advisory.</div>'+
    field("KIND",f.kind)+field("COUNTRY",C.COUNTRY[f.country]?.label||f.country)+
    field("COORDINATES",f.lat+", "+f.lng));
 }
}
function configure({getData,getFilter:filters,onDetails}){
 data=getData;getFilter=filters;open=onDetails;
}
function show(){
 $("labMapHost").hidden=false;
 if(!started&&root.maplibregl){
  started=M.init(showDetails,{style:"fiord",region:getFilter().country?"gulf":"global",globe:false});
 }
 if(!started){
  const warning=$("mapFallback");
  warning.hidden=false;
  warning.textContent=root.GXImpactMapLibraryError||
   "MAP LIBRARY LOADING. Other public-source views remain available.";
  return false;
 }
 update();
 pollHourlyUSGS();
 requestAnimationFrame(()=>M.resize());
 // Hidden-to-visible maps need one additional size read after CSS layout.
 setTimeout(()=>M.resize(),120);
 return true;
}
function hide(){$("labMapHost").hidden=true}
function update(){
 if(!started)return;
 const parts=inputs(),files=data(),f=getFilter();
 const layers={};
 document.querySelectorAll("[data-map-layer]").forEach(box=>{
   layers[box.dataset.mapLayer]=!!box.checked;
 });
 M.update({...parts,layers});
 const observations=parts.observations.filter(o=>C.coords(o)).length;
 const localReports=parts.reports.filter(r=>C.asArray(r.countries).length||r.country);
 $("labMapCounts").textContent=
  "Geolocated sensor observations: "+observations+
  "\nOfficial region advisories: "+parts.advisories.length+
  "\nLatest published reports: "+parts.reports.length+
  "\nNews pins are country references only.";
 const collection=f.collectionTime,latest=f.latestArticle;
 const delay=Date.now()-C.dt(collection);
 const stale=!Number.isFinite(delay)||delay>18*60000;
 const freshness=$("mapSourceFreshness");
 freshness.dataset.stale=String(stale);
 freshness.textContent="NEWS COLLECTOR "+C.age(collection)+
  "  ·  NEWEST ARTICLE "+C.age(latest)+(stale?"  ·  DELAYED":"");
 const latestBox=$("labLatestReports");
 const top=parts.reports.slice(0,12);
 latestBox.innerHTML=top.length?top.map(r=>
  '<button type="button" data-latest-report="'+C.esc(String(r.id||""))+'">'+
  '<span class="latest-meta">'+C.esc(r.source||"PUBLIC REPORT")+
  ' · '+C.esc(C.age(r.published_at))+'</span>'+
  '<span class="latest-head" dir="auto">'+C.esc(r.title)+'</span></button>'
 ).join(""):'<p>No publisher articles in the last '+f.hours+
  ' hour(s). Expand the window to see older reporting. This is not an all-clear.</p>';
 const providerBox=$("labDirectProviders");
 const observationsHealth=C.asArray(files["observations.json"]?.health);
 const direct=files["direct_signals.json"]||{},supp=files["advisories.json"]||{};
 const rows=[
  ["USGS · browser hourly",liveStatus,"https://earthquake.usgs.gov/earthquakes/feed/v1.0/"],
  ...["USGS","NASA EONET","Cloudflare Radar"].map(key=>{
    const h=observationsHealth.find(x=>x.source===key)||{};
    return [key,h.ok===true?"GitHub fetched":h.ok===false?"provider error":"not configured",
      key==="NASA EONET"?"https://eonet.gsfc.nasa.gov/":
      key==="Cloudflare Radar"?"https://radar.cloudflare.com/":"https://earthquake.usgs.gov/"];
  }),
  ["EMSC",direct.health?.EMSC?.state||"not yet collected","https://www.emsc-csem.org/"],
  ["GDACS",supp.sources?.GDACS?.state||"not yet collected","https://www.gdacs.org/"],
  ["NOAA SWPC",direct.health?.["NOAA SWPC"]?.state||"not yet collected","https://www.swpc.noaa.gov/"],
  ["OpenSky",supp.sources?.OpenSky?.state||"credentials required","https://opensky-network.org/"]
 ];
 providerBox.innerHTML=rows.map(([title,status,url])=>
  '<div class="provider-line"><a href="'+C.esc(url)+'" target="_blank" rel="noopener noreferrer">'+
  C.esc(title)+'</a><em class="'+(/error|unavailable|not configured|credentials|not yet/.test(status)?"off":"")+'">'+
  C.esc(status)+'</em></div>').join("");
 const bulletins=C.asArray(direct.bulletins).filter(b=>C.within(b.published_at,Math.max(24,f.hours),Date.now()));
 const newest=bulletins[0];
 $("labSpaceWeather").textContent=newest?
  "NOAA GLOBAL BULLETIN · "+C.age(newest.published_at)+" · "+newest.title+
  ". Not pinned to any Gulf location.":
  "NOAA GLOBAL BULLETINS · none recent or provider unavailable. Not geolocated.";
}
function action(command){
 if(!started)return;
 if(command==="gulf"||command==="global")M.focus(command);
 if(command==="style")M.changeStyle();
 if(command==="globe")M.projection(true);
 if(command==="zoom-in")M.zoom(1);
 if(command==="zoom-out")M.zoom(-1);
}
$("labLatestReports").addEventListener("click",e=>{
 const button=e.target.closest("[data-latest-report]");
 if(button)showDetails("report",button.dataset.latestReport);
});
root.GXImpactMap={configure,show,hide,update,action,pollHourlyUSGS,get started(){return started}};
})(window);
