/* GULFASTRA X: coordinate-backed map and declared static references only. */
(function(root){
"use strict";
const C=root.GXCore;
let map=null,ready=false,onOpen=null,last=null,globe=false,style="fiord";
const empty=()=>C.geojson([]);
const layers=[["observed","#5bdac9",7],["fires","#edab63",6],["advisories","#efd07f",8],["outages","#b7a0ef",10],["reference","#8eacc7",5],["coverage","#678fd6",14]];
function ensure(){
 if(!map)return;
 for(const [kind,color,radius] of layers){
  const id="gx-"+kind;
  if(!map.getSource(id))map.addSource(id,{type:"geojson",data:empty()});
  if(!map.getLayer(id+"-dot"))map.addLayer({id:id+"-dot",type:"circle",source:id,
   paint:{"circle-radius":kind==="coverage"?["interpolate",["linear"],["get","count"],1,8,70,16,300,23]:radius,
    "circle-color":color,"circle-opacity":kind==="coverage"?.56:.88,"circle-stroke-color":"#e1f5fd","circle-stroke-width":1.3}});
  if(kind==="coverage"&&!map.getLayer(id+"-label"))map.addLayer({id:id+"-label",type:"symbol",source:id,
   layout:{"text-field":["to-string",["get","count"]],"text-size":10},
   paint:{"text-color":"#f7f9ff","text-halo-color":"#21364c","text-halo-width":1}});
 }
 ready=true;if(last)update(last);document.getElementById("mapFallback").hidden=true;
}
function update(opts){
 last=opts;
 if(!ready||!map)return;
 const {reports,observations,advisories=[],layers:enabled,country}=opts;
 const observedAll=C.observedPoints(observations,enabled);
 const observed=observedAll.filter(o=>o.kind!=="thermal-detection");
 const fires=observedAll.filter(o=>o.kind==="thermal-detection");
 const outages=[];
 if(enabled.outages)for(const o of observations){
  if(o.kind!=="connectivity-outage")continue;
  for(const cc of C.asArray(o.countries)){
   const ref=C.COUNTRY[cc];
   if(ref&&(!country||country===cc))outages.push({
    id:o.id,coords:[ref.lng,ref.lat],country:cc,
    name:o.title,kind:"outage"
   });
  }
 }
 const regionAdvisories=enabled.advisories?advisories.map(e=>{
    const loc=C.coords(e);return loc?{id:e.id,coords:loc,name:e.title,kind:"advisory",country:""}:null
  }).filter(Boolean):[];
 const coverage=enabled.coverage?C.countryCoverage(reports):[];
 const reference=C.staticFacilities(enabled,country);
 const payload={observed,fires,advisories:regionAdvisories,outages,coverage,reference};
 for(const [kind,rows] of Object.entries(payload)){
  const src=map.getSource("gx-"+kind);if(src)src.setData(C.geojson(rows));
 }
}
function pick(e){
 if(!map||!onOpen)return;
 const names=["gx-observed-dot","gx-fires-dot","gx-advisories-dot","gx-outages-dot","gx-reference-dot","gx-coverage-dot"].filter(id=>map.getLayer(id));
 const matches=map.queryRenderedFeatures(e.point,{layers:names});
 if(!matches.length)return;
 const item=matches[0],p=item.properties||{};
 if(item.layer.id.includes("observed")||item.layer.id.includes("fires")||item.layer.id.includes("outages"))onOpen("observation",p.id);
 if(item.layer.id.includes("advisories"))onOpen("advisory",p.id);
 if(item.layer.id.includes("reference"))onOpen("facility",p.id);
 if(item.layer.id.includes("coverage"))onOpen("country",p.country);
}
function init(callback,settings){
 onOpen=callback;style=settings.style||"fiord";globe=!!settings.globe;
 const warning=document.getElementById("mapFallback");
 if(!root.maplibregl){warning.hidden=false;warning.innerHTML="<strong>MAP LIBRARY UNAVAILABLE</strong><span>Source evidence remains available in the right panel.</span>";return false}
 try{
  map=new maplibregl.Map({container:"map",style:"https://tiles.openfreemap.org/styles/"+style,
   center:settings.region==="gulf"?[49.2,26]:[29,21],zoom:settings.region==="gulf"?3.8:2,
   minZoom:1.2,maxZoom:15,attributionControl:true,renderWorldCopies:false,dragRotate:false});
  map.on("load",()=>{ensure();if(globe)projection(true)});
  map.on("style.load",ensure);
  map.on("click",pick);
  map.on("mousemove",e=>{
   const active=["gx-observed-dot","gx-fires-dot","gx-advisories-dot","gx-outages-dot","gx-reference-dot","gx-coverage-dot"].filter(id=>map.getLayer(id));
   map.getCanvas().style.cursor=map.queryRenderedFeatures(e.point,{layers:active}).length?"pointer":"";
  });
  let failures=0;
  map.on("error",()=>{failures++;if(failures>=8&&!ready){warning.hidden=false;warning.innerHTML="<strong>MAP TILES UNAVAILABLE</strong><span>Check network access. Public-source cards and search remain usable.</span>"}});
  return true;
 }catch(e){warning.hidden=false;return false}
}
function focus(region){if(map)map.flyTo({center:region==="gulf"?[49.2,26]:[29,21],zoom:region==="gulf"?3.8:2,duration:500})}
function reset(){if(map)focus("global")}
function zoom(n){map?.zoomTo(map.getZoom()+n,{duration:250})}
function changeStyle(){
 style=style==="fiord"?"liberty":"fiord";ready=false;
 if(map)map.setStyle("https://tiles.openfreemap.org/styles/"+style);
 return style;
}
function projection(on){
 if(!map||typeof map.setProjection!=="function")return false;
 try{map.setProjection({type:on?"globe":"mercator"});globe=on;return true}catch(_){return false}
}
function resize(){map?.resize()}
root.GXMap={init,update,focus,reset,zoom,changeStyle,projection,resize,get ready(){return ready}};
})(window);
