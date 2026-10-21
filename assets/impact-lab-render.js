/* GULFASTRA X Impact Lab: deterministic, source-backed presentation helpers. */
(function(root){
"use strict";
const C=root.GXCore;
const palette={security:"#e78f73",transport:"#74b4ed",diplomacy:"#a799ea",other:"#69cfaa"};
const safe=x=>C.esc(x);
const as=C.asArray;
const dt=C.dt;
const ms=hours=>hours*3600000;
function filtered(graph,opts={}){
 const end=Number.isFinite(opts.cutoff)?opts.cutoff:Date.now(),hours=opts.hours||48;
 const earliest=end-ms(hours);
 const nodes=as(graph?.nodes).filter(n=>{
  const at=dt(n.published_at);
  return Number.isFinite(at)&&at<=end&&at>=earliest&&
   (!opts.country||as(n.countries).includes(opts.country))&&
   (!opts.category||opts.category==="all"||opts.category===n.category);
 }).slice(0,95);
 const ids=new Set(nodes.map(n=>n.id));
 const edges=as(graph?.edges).filter(e=>ids.has(e.source)&&ids.has(e.target)&&
   dt(e.first_visible_at)<=end&&!e.relation_verified);
 return {nodes,edges,cutoff:end,hours};
}
const col=n=>palette[n.category]||palette.other;
function pHash(s){
 let n=17;for(const c of String(s))n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;
 return n>>>0;
}
function positions(nodes,mode){
 const result={},w=1080,h=610;
 if(mode==="chronology"){
  const sorted=[...nodes].sort((a,b)=>dt(a.published_at)-dt(b.published_at));
  const lanes={security:0,transport:1,diplomacy:2,other:3};
  sorted.forEach((node,i)=>{const lane=lanes[node.category]??3;
   result[node.id]={x:85+i/Math.max(1,sorted.length-1)*895,
      y:100+lane*110+((pHash(node.id)%5)-2)*12};});
 }else{
  const counts={security:0,transport:0,diplomacy:0,other:0};
  const centers={security:[310,240],transport:[720,245],diplomacy:[350,440],other:[750,438]};
  nodes.forEach((node,i)=>{
   const kind=centers[node.category]?node.category:"other";
   const idx=counts[kind]++,turn=idx*2.3999632297;
   const rad=27*Math.sqrt(idx+.3);
   const center=centers[kind];
   result[node.id]={x:Math.max(35,Math.min(w-35,center[0]+Math.cos(turn)*rad)),
     y:Math.max(40,Math.min(h-30,center[1]+Math.sin(turn)*rad))};
  });
 }
 return result;
}
function graphSvg(data,opts={}){
 const nodes=as(data.nodes),edges=as(data.edges),mode=opts.mode||"network",
  positionsById=positions(nodes,mode);
 const top=new Set(nodes.slice(0,Math.min(nodes.length,mode==="chronology"?20:18)).map(x=>x.id));
 const zoom=Number.isFinite(opts.zoom)?Math.max(.65,Math.min(3,opts.zoom)):1;
 const vw=1080/zoom,vh=610/zoom,x=(1080-vw)/2,y=(610-vh)/2;
 const lines=edges.map(e=>{
  const a=positionsById[e.source],b=positionsById[e.target];
  return a&&b?'<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+
  '" stroke-dasharray="4 5" data-edge="'+safe(e.source+"|"+e.target)+'"><title>'+
  safe(e.label||"Shared reporting metadata; not causation")+'</title></line>':"";
 }).join("");
 const circles=nodes.map(n=>{
  const pos=positionsById[n.id],r=5+Math.min(7,Math.sqrt(Math.max(1,n.report_count||1))*1.6),
  title=String(n.title||"").slice(0,44),selected=opts.selected===n.id;
  return '<g class="graph-node" data-node="'+safe(n.id)+'" tabindex="0" role="button" aria-label="'+safe(n.title)+
   '" transform="translate('+pos.x+' '+pos.y+')"><circle class="hit-zone" r="'+(r+15)+
   '" fill="transparent" stroke="none" pointer-events="all"/><circle r="'+(selected?r+3:r)+
   '" fill="'+col(n)+'" opacity="'+(selected?1:.9)+'"/>'+
   (selected?'<circle r="'+(r+9)+'" fill="none" stroke="'+col(n)+'" stroke-width="1.2" opacity=".7"/>':"")+
   (top.has(n.id)?'<text x="'+(r+7)+'" y="4">'+safe(title)+(n.title?.length>44?"…":"")+'</text>':"")+
   '<title>'+safe(n.title+" · "+C.date(n.published_at))+'</title></g>';
 }).join("");
 return '<svg class="network-svg'+(mode==="spatial"?" spatial":"")+'" xmlns="http://www.w3.org/2000/svg" viewBox="'+x+' '+y+' '+vw+' '+vh+
  '" preserveAspectRatio="xMidYMid meet" aria-label="Published evidence relationship network">'+
  '<defs><pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M45 0H0V45" fill="none" stroke="#1d3650" stroke-width=".55"/></pattern></defs>'+
  '<rect x="0" y="0" width="1080" height="610" fill="url(#grid)" opacity=".55" pointer-events="none"/>'+
  lines+circles+'</svg>';
}
function chronology(data){
 const nodes=[...as(data.nodes)].sort((a,b)=>dt(b.published_at)-dt(a.published_at));
 return '<div class="chronology-list">'+nodes.map(n=>
 '<button class="chronology-item" data-node="'+safe(n.id)+'"><time>'+
 C.date(n.published_at)+'</time><span><strong dir="auto">'+safe(n.title)+
 '</strong><small>'+safe(n.category.toUpperCase())+' · '+safe(as(n.countries).join(", "))+
 ' · '+Number(n.publisher_count||0)+' NAMED OUTLETS · UNVERIFIED</small></span></button>'
 ).join("")+'</div>';
}

/* Investigable publication clusters: no unreadable 95-node hairball.
   Group labels are publisher metadata, not AI-inferred crisis severity. */
const topicNames={
 regional:"Regional reporting",maritime:"Maritime & shipping",missile:"Missile reporting",
 interception:"Interception reporting",diplomacy:"Diplomacy",sanctions:"Sanctions",
 drone:"Drone reporting",aviation:"Aviation",unspecified:"Other reporting"
};
const iconForTopic={
 regional:"◎",maritime:"≋",missile:"↗",interception:"◈",
 diplomacy:"◇",sanctions:"§",drone:"✧",aviation:"✈",unspecified:"◌"
};
function groups(data){
 const grouped=new Map();
 for(const n of as(data?.nodes)){
  const topic=String(n.topic||"unspecified").toLowerCase();
  if(!grouped.has(topic))grouped.set(topic,{id:topic,title:topicNames[topic]||
   topic.replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase()),nodes:[],links:0,latest:0,
   articleTotal:0,kind:n.category||"other"});
  const g=grouped.get(topic);
  g.nodes.push(n);g.latest=Math.max(g.latest,dt(n.published_at)||0);
  g.articleTotal+=Number(n.report_count||0);
 }
 const idToTopic=new Map(as(data?.nodes).map(n=>[n.id,String(n.topic||"unspecified").toLowerCase()]));
 for(const e of as(data?.edges)){
  const a=idToTopic.get(e.source),b=idToTopic.get(e.target);
  if(a&&grouped.has(a))grouped.get(a).links++;
  if(b&&b!==a&&grouped.has(b))grouped.get(b).links++;
 }
 return [...grouped.values()].map(g=>{
  g.nodes.sort((a,b)=>dt(b.published_at)-dt(a.published_at));
  const categoryCounts={};for(const n of g.nodes)categoryCounts[n.category]=(categoryCounts[n.category]||0)+1;
  g.kind=Object.entries(categoryCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"other";
  return g;
 }).sort((a,b)=>b.nodes.length-a.nodes.length||b.latest-a.latest);
}
function clusterCard(g){
 const newest=g.nodes[0],count=g.nodes.length;
 const prev=g.nodes.slice(0,2).map(n=>'<div class="cluster-headline" dir="auto">'+
  safe(n.title)+'</div>').join("");
 return '<button type="button" data-cluster="'+safe(g.id)+'" class="cluster-card cluster-'+
 safe(g.kind)+'" aria-label="Explore '+safe(g.title)+' '+count+' source reporting groups">'+
 '<span class="cluster-card-top"><span class="cluster-topic-icon">'+
 safe(iconForTopic[g.id]||"◌")+'</span><span class="cluster-count">'+count+
 '<small>GROUPS</small></span></span>'+
 '<strong class="cluster-title">'+safe(g.title)+'</strong>'+
 '<span class="cluster-card-summary">'+prev+'</span>'+
 '<span class="cluster-card-bottom"><span>'+g.links+
 ' SOURCE-METADATA LINKS</span><span>'+safe(C.age(newest?.published_at))+' ↗</span></span></button>';
}
function relationshipCards(data,all=false){
 const byId=new Map(as(data?.nodes).map(n=>[n.id,n]));
 const records=as(data?.edges).filter(e=>byId.has(e.source)&&byId.has(e.target)&&!e.relation_verified);
 const items=(all?records:records.slice(0,5)).map(e=>{
  const a=byId.get(e.source),b=byId.get(e.target);
  return '<button type="button" class="relation-card" data-edge="'+safe(e.source+"|"+e.target)+
   '" aria-label="Inspect published reporting relationship">'+
   '<span class="relation-meta">'+safe((e.shared_topic||"TOPICAL OVERLAP").toUpperCase())+
   ' · '+safe(as(e.shared_countries).join(", ")||"COUNTRY MENTION")+'</span>'+
   '<span class="relation-pair"><span dir="auto">'+safe(a.title)+
   '</span><span class="relation-arrow">↔</span><span dir="auto">'+safe(b.title)+'</span></span>'+
   '<span class="relation-footer">SHARED METADATA, NOT CAUSATION <b>EXPLORE ↗</b></span></button>';
 }).join("");
 if(!records.length)return '<div class="cluster-empty">No related reporting groups meet the chosen period and metadata criteria. This is not evidence of safety.</div>';
 return '<div class="relation-grid">'+items+'</div>';
}
function clusterOverview(data,focus=null){
 const grouped=groups(data);
 if(focus){
  const g=grouped.find(x=>x.id===focus);
  if(g){
   return '<div class="cluster-drill"><button type="button" class="cluster-back" data-cluster-back="1">← ALL REPORTING TOPICS</button>'+
    '<div class="cluster-drill-hero"><span class="kicker">TOPIC INVESTIGATION · SOURCE CLAIMS ONLY</span>'+
    '<h2>'+safe(g.title)+'</h2><p>'+g.nodes.length+' publication groups · '+g.links+
    ' associated metadata links. Open any story to inspect original publisher evidence.</p></div>'+
    '<div class="cluster-story-list">'+g.nodes.map(n=>'<button class="cluster-story" data-node="'+safe(n.id)+'">'+
     '<span class="cluster-story-identity"><i style="--k:'+col(n)+'"></i>'+
     safe((n.category||"other").toUpperCase())+' · '+safe(C.age(n.published_at))+
     ' · '+Number(n.publisher_count||0)+' NAMED PUBLISHERS</span>'+
     '<strong dir="auto">'+safe(n.title)+'</strong>'+
     '<span class="cluster-story-footer">READ PUBLISHER EVIDENCE ↗</span></button>').join("")+
    '</div></div>';
  }
 }
 const show=grouped.slice(0,12);
 return '<div class="cluster-dashboard">'+
 '<section class="cluster-overview-intro"><div><span class="kicker">STRUCTURED NEWS LANDSCAPE</span>'+
 '<h2>Explore what is being reported</h2>'+
 '<p>'+as(data.nodes).length+' source-linked groups organized into '+grouped.length+
 ' publisher-topic categories. Headlines stay readable; original reporting is one click away.</p></div>'+
 '<div class="cluster-uncertainty"><b>NO AUTOMATED CAUSAL CLAIMS</b><span>Clusters are a navigation tool, not independent confirmation of the underlying events.</span></div></section>'+
 '<div class="cluster-grid">'+show.map(clusterCard).join("")+'</div>'+
 (grouped.length>12?'<div class="cluster-caveat">'+(grouped.length-12)+' additional topics available using the reporting category filter.</div>':"")+
 '<section class="cluster-relations"><div class="cluster-section-head"><div>'+
 '<span class="kicker">PUBLISHED RELATIONSHIPS</span><h3>Related coverage worth comparing</h3>'+
 '<p>Shared topic, country and publication period. Not a cause-and-effect conclusion.</p></div>'+
 '<button type="button" data-network-mode="spatial">SEE ALL '+as(data.edges).length+' LINKS ↗</button></div>'+
 relationshipCards(data,false)+'</section></div>';
}
function relationExplorer(data){
 return '<div class="cluster-dashboard"><section class="cluster-overview-intro"><div>'+
 '<span class="kicker">EVIDENCE LINK EXPLORER</span><h2>Investigate related coverage</h2>'+
 '<p>Only actual shared-metadata connections returned by the collector. Headlines remain attached to their original source dossiers.</p></div>'+
 '<div class="cluster-uncertainty"><b>NO CAUSATION ASSUMED</b>'+
 '<span>These links do not prove two headlines describe the same event.</span></div></section>'+
 relationshipCards(data,true)+'</div>';
}

function spark(points,other=null){
 points=as(points).filter(p=>Array.isArray(p)&&Number.isFinite(Number(p[1]))).slice(-130);
 other=as(other).filter(p=>Array.isArray(p)&&Number.isFinite(Number(p[1]))).slice(-130);
 if(points.length<2)return '<div class="state-empty">Not enough genuine observations for a chart.</div>';
 const all=[...points,...other],numbers=all.map(p=>Number(p[1]));
 let lo=Math.min(...numbers),hi=Math.max(...numbers);
 if(lo===hi){lo-=1;hi+=1}
 const path=(arr)=>arr.length<2?"":arr.map((v,i)=>{
  const x=8+(i/Math.max(1,arr.length-1))*584,y=132-((Number(v[1])-lo)/(hi-lo))*117;
  return (i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1);
 }).join(" ");
 return '<svg class="chart-svg" viewBox="0 0 600 145" preserveAspectRatio="none" role="img" aria-label="FRED actual historical observation chart">'+
 [30,78,124].map(y=>'<line class="gridline" x1="0" y1="'+y+'" x2="600" y2="'+y+'"/>').join("")+
 '<path d="'+path(points)+'"/>'+
 (other.length>1?'<path d="'+path(other)+'" style="stroke:#e5b274;stroke-dasharray:5 3"/>':"")+
 '<title>Recorded observations with their source periods. No live exchange quote.</title></svg>'+
 '<div class="chart-footer"><span>'+safe(points[0][0])+'</span><span>'+safe(points[points.length-1][0])+'</span></div>';
}
function marketCards(markets,cb){
 const series=markets?.series||{};
 const names=["VIXCLS","DCOILBRENTEU","DCOILWTICO","BAMLH0A0HYM2","T10Y2Y","UNRATE"];
 return '<div class="data-grid">'+names.map(id=>{
  const s=series[id],status=markets?.source_status?.[id]||"not-configured";
  if(!s)return '<div class="data-card"><small>'+safe(id)+'</small><h3>UNAVAILABLE</h3>'+
   '<p>'+safe(status)+' — no invented figures.</p></div>';
  const o=s.last_observation||{};
  return '<div class="data-card"><button data-market="'+safe(id)+'"><small>'+safe(id)+
    ' · '+safe(status.toUpperCase())+'</small><h3>'+safe(s.name)+'</h3>'+
    '<div class="data-value"><b>'+safe(o.value)+'</b><span>'+safe(s.unit)+'</span></div>'+
    spark(s.recent)+
    '<div class="source-row"><span>AS OF '+safe(o.date)+'</span> · <span>FRED ORIGINAL SERIES ↗</span></div></button></div>';
 }).join("")+'</div>';
}
function compare(markets){
 const all=markets?.series||{},ids=["VIXCLS","BAMLH0A0HYM2","DCOILBRENTEU","UNRATE"];
 return '<div class="risk-label">RAW OBSERVATIONS: 2008 reference values and latest values are NOT a statistical probability of crisis or a comparable world-risk score. Different publication frequencies, economic structures and measurement definitions apply. Each line is plotted in its own time window on a SHARED vertical value scale; the two horizontal windows are not the same calendar dates.</div>'+
 '<div class="compare-grid">'+ids.map(id=>{
  const s=all[id];
  if(!s)return '<div class="historical-card">'+safe(id)+' · NO SOURCE OBSERVATIONS</div>';
  const prev=as(s.historical_2007_2009);
  const target=prev.filter(x=>x[0]<="2008-10-15").slice(-1)[0]||prev[0],recent=s.last_observation||{};
  const historical=prev.filter(x=>x[0]>="2008-09-01"&&x[0]<="2008-12-31");
  const latest=as(s.recent).slice(-90);
  return '<div class="historical-card"><small>'+safe(id)+'</small><b>'+safe(s.name)+'</b>'+
   '<div class="compare-values"><div>2008 REFERENCE <strong>'+safe(target?.[1]??"N/A")+
   '</strong><span>'+safe(target?.[0]||"No period")+'</span></div><div>RECENT OBSERVATION<strong>'+
   safe(recent.value??"N/A")+'</strong><span>'+safe(recent.date||"Unknown")+'</span></div></div>'+
   spark(latest,historical)+
   '<div class="graph-legend"><span style="color:#60c8ed">━ RECENT PERIOD</span>'+
   '<span style="color:#e5b274">┄ SEP–DEC 2008</span></div>'+
   '<div class="source-row"><a href="'+safe(C.validUrl(s.url))+'" target="_blank" rel="noopener">FRED SERIES ↗</a> · '+safe(s.unit)+'</div></div>';
 }).join("")+'</div>';
}
function briefing(brief,now,changes){
 const news=as(brief?.developments),advice=as(brief?.recent_official_advisories),
   categories=brief?.category_counts||{};
 const warning='<div class="context-warning">Public reporting groups are not independently verified events; article publication time is not occurrence time. This deterministic briefing does not offer emergency guidance or forecasts.</div>';
 return '<div class="brief-top"><span class="kicker">PUBLIC-SOURCE DAILY INTELLIGENCE / '+safe(C.date(brief?.generated_at))+'</span>'+
 '<h3>Latest 24-hour publication briefing</h3><p>'+Number(brief?.groups||0)+' related coverage groups. '+
 'Since your last visit: '+Number(changes.new||0)+' new groups, '+Number(changes.changed||0)+
 ' updated source sets, based on this browser’s saved snapshot.</p><div class="graph-legend">'+
 Object.entries(categories).map(([key,n])=>'<span>'+safe(key.toUpperCase())+': '+Number(n)+'</span>').join("")+'</div></div>'+
 warning+'<h3 class="brief-head">PUBLISHED REPORTING · '+news.length+' ITEMS</h3>'+
 (news.length?news.map(n=>'<button class="brief-row" data-brief="'+safe(n.event_id)+'"><i class="brief-category" style="background:'+
 (palette[n.category]||palette.other)+'"></i><span><strong dir="auto">'+safe(n.title)+
 '</strong><small>'+safe(n.category)+' · '+C.age(n.published_at)+' · '+Number(n.outlet_count||0)+' NAMED OUTLETS</small></span></button>').join(""):'<div class="state-empty">No relevant reports in the configured briefing period.</div>')+
 '<h3 class="brief-head">OFFICIAL/INSTITUTIONAL NOTICES · '+advice.length+'</h3>'+
 (advice.length?advice.map(n=>'<div class="brief-row"><span><strong dir="auto">'+safe(n.title)+
 '</strong><small>'+safe(n.source)+' · '+C.age(n.published_at)+'</small><a class="brief-link" href="'+safe(C.validUrl(n.url))+
 '" target="_blank" rel="noopener noreferrer">OPEN NOTICE ↗</a></span></div>').join(""):'<div class="state-empty">No source-linked notices selected in this time window. This is not an all-clear.</div>');
}
const PATHWAYS=[
 {id:"shipping",label:"MARITIME / ENERGY",chain:["Maritime disruption hypothesis","Shipping costs and delays","Energy supply sensitivity","Potential downstream prices"],mechanism:"If there is a confirmed disruption affecting a major shipping route, freight costs and delivery times may change. Energy price responses also depend on spare capacity, inventories, routes and market expectations.",evidence:"Illustrative economic transmission mechanism; no current disruption is inferred from news mentions."},
 {id:"aviation",label:"AVIATION / REGIONAL TRADE",chain:["Airspace closure hypothesis","Diversions and capacity changes","Travel time and cost","Potential regional business effects"],mechanism:"Actual aviation disruption requires an authoritative NOTAM, airline or aviation authority notice. Headline mentions alone cannot show flight activity or status.",evidence:"Scenario only; not a live aviation system."},
 {id:"financial",label:"RATES / CREDIT",chain:["Financial stress hypothesis","Credit spread repricing","Financing conditions","Possible investment slowdown"],mechanism:"A movement in a quoted spread is an observation, not evidence of a particular geopolitical cause. Multiple competing explanations must be evaluated.",evidence:"Historical mechanism, not a causal link derived from today's reports."},
 {id:"hazards",label:"HAZARDS / LOGISTICS",chain:["Natural hazard observation","Infrastructure exposure","Potential supply interruptions","Recovery and insurance effects"],mechanism:"Observed natural hazards and official warnings describe physical conditions or warnings; actual commercial damage and ongoing impact require separate corroboration.",evidence:"Possible consequence chain for exploration only."}
];
function pathways(){
 return '<div class="scenario-note">HYPOTHETICAL IMPACT PATHWAYS · These are explanatory scenarios, not predictions or evidence an incident has occurred. No percentage probabilities have been assigned.</div>'+
 PATHWAYS.map(p=>'<button class="pathway-row" data-pathway="'+safe(p.id)+'"><span class="kicker">'+safe(p.label)+
 '</span><div class="pathway-chain">'+p.chain.map((part,i)=>(i?'<b>→</b>':"")+'<span>'+safe(part)+'</span>').join("")+
 '</div><p>'+safe(p.mechanism)+'</p></button>').join("");
}
function radar(nodes){
 const categories=["security","transport","diplomacy","other"],
 counts=Object.fromEntries(categories.map(k=>[k,nodes.filter(x=>x.category===k).length])),
 peak=Math.max(1,...Object.values(counts)),cx=155,cy=128,r=96;
 const poly=(scale)=>categories.map((key,i)=>{
  const ang=i*Math.PI/2-Math.PI/2,value=counts[key]/peak*scale;
  return (cx+Math.cos(ang)*value).toFixed(1)+","+(cy+Math.sin(ang)*value).toFixed(1);
 }).join(" ");
 return '<svg viewBox="0 0 320 260" width="100%" height="230" role="img" aria-label="Publication category coverage radar; not danger index">'+
 [35,70,105].map(rad=>'<circle cx="'+cx+'" cy="'+cy+'" r="'+rad+'" fill="none" stroke="#28445b"/>').join("")+
 '<polygon points="'+poly(96)+'" fill="#60c8ed2c" stroke="#60c8ed" stroke-width="2"/>'+
 categories.map((k,i)=>{
  const ang=i*Math.PI/2-Math.PI/2;return '<text x="'+(cx+Math.cos(ang)*124)+'" y="'+(cy+Math.sin(ang)*117)+
 '" fill="#c3d5e8" font-size="10" text-anchor="middle">'+safe(k.toUpperCase()+" "+counts[k])+'</text>';
 }).join("")+'</svg>';
}
root.GXImpactRender={filtered,graphSvg,chronology,groups,clusterOverview,relationExplorer,spark,marketCards,compare,briefing,pathways,radar,PATHWAYS};
})(window);
