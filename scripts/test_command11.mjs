#!/usr/bin/env node
/* Offline GULFASTRA X integrity gates: no network, no fictional data. */
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const files=["command11-core.js","command11-map.js","command11-stream.js","command11-extra.js","command11.js"];
const html=fs.readFileSync(path.join(root,"command/index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"assets/command11.css"),"utf8");
const window={};
const document={readyState:"loading",addEventListener(){}};
const context=vm.createContext({window,document,Date,Math,JSON,Number,Array,Set,Map,String,URL,
 setTimeout,clearTimeout,console,Intl,encodeURIComponent,decodeURIComponent});
for(const name of files){
 const source=fs.readFileSync(path.join(root,"assets",name),"utf8");
 new vm.Script(source,{filename:name}).runInContext(context);
 if(name==="command11.js"){
   assert(html.includes("command11-bootstrap.mjs?"),"HTML must load the ESM MapLibre bootstrap");
 }else{
   assert(html.includes(name+"?"),"HTML missing client asset: "+name);
 }
}
for(const name of ["GXCore","GXMap","GXStream","GXExtras","GXApp"]){
 assert(window[name],name+" must register its runtime module");
}
const C=window.GXCore;
assert(!css.includes(".country-pin:hover{transform"),"Legacy marker animations must not return");
assert(!html.includes("assets/v9.css"),"Do not include the legacy CSS cascade");
assert(html.includes("../vendor/maplibre-gl.css"),"MapLibre CSS must be same-origin");
assert(!html.includes("unpkg.com/maplibre-gl"),"Do not depend on third-party MapLibre CDN at initial load");
assert(!html.includes("maplibre-gl.js"),"The removed MapLibre v6 UMD script is invalid");
const boot=fs.readFileSync(path.join(root,"assets/command11-bootstrap.mjs"),"utf8");
execFileSync(process.execPath,["--check",path.join(root,"assets/command11-bootstrap.mjs")],{stdio:"pipe"});
assert(boot.includes("../vendor/maplibre-gl.mjs"),"MapLibre v6 bootstrap must import pinned same-origin ESM asset");
const t=new Date(Date.now()-3600000).toISOString();
const base={id:"r1",title:"Qatar airspace closes",source:"Outlet A",
 published_at:t,countries:["Qatar"],country:"Qatar",category:"transport",language:"en"};
const f={country:"Qatar",topic:"all",hours:72,asof:Date.now(),query:""};
assert.equal(C.selectReports([base],f).length,1);
assert.equal(C.selectReports([base],{...f,country:"Iran"}).length,0);
assert.equal(C.selectReports([base],{...f,hours:0}).length,1);
assert.equal(C.selectReports([base,base],f).length,1,"Same publisher/title/day dedup");
const event={id:"e1",title:base.title,category:"transport",last_published:t,
 report_count:2,publisher_count:2,countries:["Qatar"]};
assert.equal(C.selectEvents([event],f).length,1);
assert.equal(C.selectEvents([event],{...f,topic:"security"}).length,0);
assert.equal(C.coords({lat:25,lon:51})[0],51);
assert.equal(C.coords({lat:null,lon:51}),null,"Missing latitude must not become zero");
assert.equal(C.coords({lat:25,lon:null}),null,"Missing longitude must not become zero");
assert.equal(C.coords({lat:99,lon:51}),null,"Impossible latitude rejected");
assert.equal(C.observedPoints([{id:"usgs:1",kind:"earthquake",lat:25,lon:51}],
 {observed:true,fires:false}).length,1);
assert.equal(C.observedPoints([{id:"usgs:1",kind:"earthquake",lat:25,lon:51}],
 {observed:false,fires:false}).length,0);
assert.equal(C.observedPoints([{id:"thermal:1",kind:"thermal-detection",lat:25,lon:51}],
 {observed:true,fires:false}).length,0,"Thermal detections require explicit layer opt-in");
assert.equal(C.observedPoints([{id:"thermal:1",kind:"thermal-detection",lat:25,lon:51}],
 {observed:false,fires:true}).length,1);
assert(C.staticFacilities({reference:true},"Qatar").every(x=>x.country==="Qatar"));
assert.equal(C.validUrl("javascript:alert(1)"),"","Unsafe links rejected");
assert.equal(C.validUrl("https://example.com/article"),"https://example.com/article");
assert.equal(C.timeline([{published_at:t}],"published_at",Date.now()-2*3600000,Date.now()).reduce((a,b)=>a+b,0),1);
const coverage=C.countryCoverage([base]);
assert.equal(coverage[0].country,"Qatar");
assert.equal(coverage[0].kind,"coverage");
assert.equal(C.geojson(coverage).features[0].geometry.type,"Point");
console.log("GULFASTRA X offline integrity gates PASSED:",files.length,"modules, map layers, filters, timestamps, URL safety, replay, source provenance");
