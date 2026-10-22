#!/usr/bin/env node
/* Deterministic offline browser-module tests. Synthetic records are test-only. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
const root=path.resolve(import.meta.dirname,"..");
const html=fs.readFileSync(path.join(root,"lab/index.html"),"utf8");
const style=fs.readFileSync(path.join(root,"assets/impact-lab.css"),"utf8");
const window={innerWidth:1400};
const document={readyState:"loading",addEventListener(){}};
const context=vm.createContext({window,document,Date,Math,JSON,Number,Array,Set,Map,String,URL,console,Intl,
 localStorage:{getItem(){return null},setItem(){}},
 setInterval(){},setTimeout(){},clearTimeout(){}});
const js=["command11-core.js","impact-lab-render.js","impact-lab.js"];
for(const filename of js){
 const src=fs.readFileSync(path.join(root,"assets",filename),"utf8");
 new vm.Script(src,{filename}).runInContext(context);
 assert(html.includes(filename),filename+" must load on Impact Lab page");
}
const labJS=fs.readFileSync(path.join(root,"assets/impact-lab.js"),"utf8");
assert(labJS.includes('$$("[data-view]").forEach'),"All workspace tabs need querySelectorAll");
assert(labJS.includes('$$("[data-mode]").forEach'),"All presentation modes need querySelectorAll");
assert(labJS.includes('$$("#labControls label").forEach'),"All filter labels need querySelectorAll");
assert(labJS.includes('$$("[data-map-layer]").forEach'),"Map layer selectors must use querySelectorAll");
assert(labJS.includes('$$("[data-map-action]").forEach'),"Map toolbar selectors must use querySelectorAll");
assert(html.includes('data-view="map"'),"The Lab must include a Map workspace");
assert(html.includes('data-mobile-view="map"'),"Mobile map navigation must stay inside Lab");
assert(html.includes("impact-map-bootstrap.mjs"),"MapLibre module loader must be linked");
assert(html.includes("impact-lab-map.js"),"Actual map data controller must be loaded");
assert(html.includes("impact-themes.css"),"Theme CSS must be applied to all workspaces");
assert(html.includes('id="labTheme"'),"Accessible theme selection must be visible");
assert(html.includes('data-map-hours="1"'),"One-hour source window must exist");
assert(html.includes('data-map-hours="2"'),"Two-hour source window must exist");
assert(labJS.includes("mapHours:1"),"New users must see last-hour map by default");
assert(labJS.includes('theme:"crimson"'),"Black/red must be the default palette");
assert(labJS.includes('getFilter:()=>({country:S.country,category:S.category,hours:S.mapHours'),
 "Map must use separate latest-hour window rather than 48-hour graph period");
const themeCSS=fs.readFileSync(path.join(root,"assets/impact-themes.css"),"utf8");
for(const theme of ["crimson","carbon","matrix","arctic"])
 assert(themeCSS.includes('body[data-theme="'+theme+'"]'),"Working theme palette missing: "+theme);
const mapJS=fs.readFileSync(path.join(root,"assets/impact-lab-map.js"),"utf8");
assert(mapJS.includes("pollHourlyUSGS"),"Direct USGS hourly provider must be wired");
assert(mapJS.includes("NOAA SWPC"),"Independent non-geographic NOAA bulletin must appear");
assert(mapJS.includes("direct_signals.json"),"Independent EMSC observations must be read");
assert(mapJS.includes("Latest published reports"),"Show separate actual recent report count");

assert(!/(^|[^$])\$\("[^"]+"\)\.forEach\(/m.test(labJS),"No single-element DOM selector may be used as a NodeList");
const C=window.GXCore,R=window.GXImpactRender;
const sampleGroups=()=>R.groups({nodes:[{id:"GF-A",topic:"maritime",category:"transport",title:"Shipping report",published_at:new Date().toISOString(),report_count:2},{id:"GF-B",topic:"maritime",category:"transport",title:"Another shipping report",published_at:new Date().toISOString(),report_count:1},{id:"GF-C",topic:"diplomacy",category:"diplomacy",title:"Diplomatic report",published_at:new Date().toISOString(),report_count:1}],edges:[]});
assert.equal(sampleGroups().length,2,"Grouping must reflect actual topics, never arbitrary spatial scatter");
const sampleCluster={nodes:[{id:"GF-A",topic:"maritime",category:"transport",title:"Arabic عربي report",published_at:new Date().toISOString(),report_count:1,sources:[]}],edges:[]};
assert(R.clusterOverview(sampleCluster).includes('data-cluster="maritime"'),"Graph must default to readable topic cards");
assert(R.clusterOverview(sampleCluster,"maritime").includes('data-node="GF-A"'),"Topic drill-down must preserve article access");
assert(!R.clusterOverview(sampleCluster).includes("network-svg"),"Initial graph must not render an unreadable node-cloud");

assert(window.GXImpactApp&&C&&R);
const now=Date.now(),hour=3600000,date=n=>new Date(now-n*hour).toISOString();
const a={id:"GF-1",title:"Test aviation report",countries:["Qatar"],category:"transport",published_at:date(1),
 report_count:3,publisher_count:2,topic:"airspace"};
const b={...a,id:"GF-2",title:"Second report",published_at:date(3)};
const c={...a,id:"GF-3",title:"Different country",countries:["Iran"],published_at:date(3)};
const graph={nodes:[a,b,c],edges:[{source:a.id,target:b.id,relation_verified:false,first_visible_at:date(1),
 label:"Related metadata; not causation"},{source:a.id,target:c.id,relation_verified:false,first_visible_at:date(1)}]};
let selected=R.filtered(graph,{country:"Qatar",category:"all",cutoff:now,hours:48});
assert.equal(selected.nodes.length,2);
assert.equal(selected.edges.length,1);
selected=R.filtered(graph,{country:"Qatar",category:"all",cutoff:now-2*hour,hours:48});
assert.equal(selected.nodes.length,1);
assert.equal(selected.edges.length,0);
selected=R.filtered(graph,{country:"Qatar",category:"security",cutoff:now,hours:48});
assert.equal(selected.nodes.length,0);
const svg=R.graphSvg(R.filtered(graph,{country:"",cutoff:now,hours:48}),{mode:"network",zoom:1});
assert(svg.includes("<svg")&&svg.includes('data-node="GF-1"')&&svg.includes("Related metadata"));
assert(R.graphSvg({nodes:[a],edges:[]},{mode:"spatial"}).includes('class="network-svg spatial"'));
assert(R.chronology({nodes:[a]}).includes("data-node"));
const points=[["2008-10-15",35],["2008-10-16",37]];
assert(R.spark(points).includes("chart-svg"));
assert(R.spark([]).includes("Not enough genuine"));
const markets={series:{VIXCLS:{id:"VIXCLS",name:"VIX",unit:"index",
 last_observation:{date:"2026-10-19",value:18},recent:points,
 historical_2007_2009:points,url:"https://fred.stlouisfed.org/series/VIXCLS"}},
 source_status:{VIXCLS:"healthy"}};
assert(R.marketCards(markets).includes('data-market="VIXCLS"'));
assert(R.compare(markets).includes("2008 REFERENCE"));
assert(R.compare({series:{}}).includes("NO SOURCE OBSERVATIONS"));
assert(R.pathways().includes("HYPOTHETICAL"));
assert(R.briefing({groups:1,developments:[{event_id:"GF-1",title:"Claim",published_at:date(1),
 category:"transport",outlet_count:1}]},now,{new:1,changed:0}).includes("GF-1"));
assert(R.radar([a,b]).includes("PUBLICATION")===false); // radar contains counts, never invented threat probability
assert(style.includes("@media(max-width:650px)")&&style.includes("lab-mobile-nav"));
assert(!html.includes("v9.css"));
console.log("Impact Lab PASS: module parsing, synthetic fixture filters, time cutoff, false-causality protections, honest missing macro handling, SVG graph, 2008 data, daily brief and mobile styles");
