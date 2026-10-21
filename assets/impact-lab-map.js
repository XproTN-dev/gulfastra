/* Impact Lab geographic workspace: shares the Command Center's real MapLibre data layers.
   Published news is country-level coverage, NEVER incident coordinates. */
(function(root){
"use strict";
const C=root.GXCore,M=root.GXMap;
const $=id=>document.getElementById(id);
if(!C||!M)return;
let started=false,lastInfo=null;
let data=()=>({}),getFilter=()=>({}),open=()=>{};
const link=(url,label)=>{
 const valid=C.validUrl(url);
 return valid?'<a class="context-link" href="'+C.esc(valid)+'" target="_blank" rel="noopener noreferrer">'+C.esc(label)+" ↗</a>":"";
};
const field=(name,value)=>'<div class="context-row"><small>'+C.esc(name)+'</small>'+C.esc(value??"Not supplied")+'</div>';
const inputs=()=>{
 const files=data(),f=getFilter(),q={country:f.country,topic:f.category||"all",
  hours:f.hours||48,asof:f.asof||Date.now(),query:""};
 const allReports=C.asArray(files["reports.json"]?.reports);
 const allObs=C.asArray(files["observations.json"]?.observations);
 const allAdvisory=C.asArray(files["advisories.json"]?.items);
 const reports=C.selectReports(allReports,q);
 const observations=C.selectObs(allObs,{...q,topic:"all"});
 // GDACS event coordinates are provider geographic context, not verified sites.
 // Do not guess country boundaries from a coordinate alone.
 const advisories=allAdvisory.filter(a=>
  C.within(a.published_at,q.hours,q.asof)&&
  (!q.country||C.asArray(a.countries).includes(q.country)));
 return {reports,observations,advisories,country:q.country};
};
function showDetails(type,id){
 const files=data();
 if(type==="observation"){
  const o=C.asArray(files["observations.json"]?.observations).find(x=>x.id===id);
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
 requestAnimationFrame(()=>M.resize());
 // Hidden-to-visible maps need one additional size read after CSS layout.
 setTimeout(()=>M.resize(),120);
 return true;
}
function hide(){$("labMapHost").hidden=true}
function update(){
 if(!started)return;
 const parts=inputs();
 const layers={};
 document.querySelectorAll("[data-map-layer]").forEach(box=>{
   layers[box.dataset.mapLayer]=!!box.checked;
 });
 M.update({...parts,layers});
 const counts=parts.observations.filter(o=>C.coords(o)).length;
 $("labMapCounts").textContent=
  "Geolocated observations: "+counts+
  "\nOfficial region advisories: "+parts.advisories.length+
  "\nNews articles (country refs): "+parts.reports.length+
  "\nOriginal publication times, not incidents confirmed.";
}
function action(command){
 if(!started)return;
 if(command==="gulf"||command==="global")M.focus(command);
 if(command==="style")M.changeStyle();
 if(command==="globe")M.projection(true);
 if(command==="zoom-in")M.zoom(1);
 if(command==="zoom-out")M.zoom(-1);
}
root.GXImpactMap={configure,show,hide,update,action,get started(){return started}};
})(window);
