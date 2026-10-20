(()=>{
"use strict";
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
const themes=["spectre","obsidian","slate"];
let archive=null;
function themeSet(value){
 const name=themes.includes(value)?value:"spectre";
 document.body.dataset.gfTheme=name;
 const button=$("v6Theme");
 if(button){button.title="Theme: "+name+" · Click to switch";button.setAttribute("aria-label","Change theme, current "+name);button.textContent=name==="spectre"?"◐":name==="obsidian"?"◑":"◒"}
 try{localStorage.setItem("gulfastra-v6-theme",name)}catch(error){}
}
function themeToggle(){
 const i=themes.indexOf(document.body.dataset.gfTheme||"spectre");
 themeSet(themes[(i+1)%themes.length]);
}
function resizeMap(){
 const map=window.__gulfastraMap;
 if(!map)return;
 try{map.resize();requestAnimationFrame(()=>map.resize());setTimeout(()=>map.resize(),260)}catch(error){}
}
function mapToggle(){
 const col=$("mapColumn");
 const expanded=col.classList.toggle("v6-expanded");
 const btn=$("v6ExpandMap");
 btn.textContent=expanded?"↙ COMPACT":"⛶ EXPAND";
 btn.setAttribute("aria-pressed",String(expanded));
 resizeMap();
}
function minutesSince(t){
 const delta=Date.now()-new Date(t).getTime();
 return Number.isFinite(delta)?Math.max(0,Math.floor(delta/60000)):Infinity;
}
function ago(t){
 const n=minutesSince(t);
 return n===Infinity?"unknown":n<1?"just now":n<60?n+"m ago":n<1440?Math.floor(n/60)+"h ago":Math.floor(n/1440)+"d ago";
}
function clock(t){
 const d=new Date(t);
 return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"medium"}):"unavailable";
}
function updated(){
 if(!archive)return;
 const time=archive.last_successful_run||archive.last_run;
 const diff=minutesSince(time);
 const freshness=diff<8?"RECENT":diff<16?"DELAYED":diff<30?"STALE":"OFFLINE";
 const feeds=Object.entries(archive.providers||{});
 const ok=feeds.filter(([,value])=>value.ok===true).length;
 const bad=feeds.filter(([,value])=>value.ok===false).length;
 const newest=(archive.reports||[]).reduce((best,r)=>!best||new Date(r.published_at)>new Date(best.published_at)?r:best,null);
 const header=$("headerUpdated");
 if(header){header.textContent="COLLECTED "+ago(time).toUpperCase();header.title="Last completed collector at "+clock(time)}
 const pulse=$("v6Pulse");
 if(pulse){pulse.textContent=ok+"/"+feeds.length+" SOURCES · "+ago(time).toUpperCase();pulse.classList.toggle("degraded",bad>0||diff>=16)}
 const fresh=$("freshness");
 if(fresh){fresh.textContent=freshness;fresh.style.color=diff<16?"var(--v6-accent)":"#ffbf79"}
 const sub=$("freshnessSub");
 if(sub)sub.textContent="Collector "+ago(time)+" · "+ok+"/"+feeds.length+" online";
 const newestLabel=$("feedUpdated");
 if(newestLabel)newestLabel.textContent=newest?"LATEST ARTICLE "+ago(newest.published_at).toUpperCase():"NO ARTICLES";
 const src=$("sourceTime");
 if(src)src.textContent=ok+"/"+feeds.length+" feeds OK · "+bad+" unavailable · "+ago(time);
 const brief=$("v6BriefInfo");
 if(brief)brief.textContent="NEWEST PUBLICATION "+(newest?ago(newest.published_at).toUpperCase():"UNKNOWN");
}
function highlights(){
 if(!archive)return;
 const output=$("v6Briefs");
 if(!output)return;
 const sorted=[...archive.reports].sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
 const chosen=[],seen=new Set();
 for(const record of sorted){
  if(!record.title||!/^https:\/\//i.test(record.url||""))continue;
  let headline=record.title.split(" - ")[0].trim();
  if(headline.length<28)headline=record.title;
  const key=headline.toLowerCase().replace(/\W+/g," ").trim();
  if(seen.has(key))continue;
  seen.add(key);chosen.push({...record,headline});
  if(chosen.length>=3)break;
 }
 output.innerHTML=chosen.length?chosen.map(r=>{
  const arabic=r.language==="ar"||/[\u0600-\u06ff]/.test(r.title);
  const label=r.category==="security"?"SECURITY":r.category==="transport"?"DISRUPTION":"REGIONAL";
  return '<a class="intel-card" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(r.url)+'"><small dir="auto">'+escapeHtml(label+" / "+(r.source||"OUTLET")+" / "+ago(r.published_at))+'</small><strong dir="'+(arabic?"rtl":"ltr")+'">'+escapeHtml(r.headline)+'</strong></a>';
 }).join(""):'<div class="intel-skeleton">No source-linked highlights available yet.</div>';
}
async function pull(){
 try{
  const data=await window.GulfastraData.get("reports.json");
  if(!Array.isArray(data.reports))throw Error("Invalid archive");
  archive=data;highlights();updated();
 }catch(error){
  const label=$("v6BriefInfo");if(label)label.textContent="ARCHIVE REQUEST FAILED";
  const pulse=$("v6Pulse");if(pulse){pulse.classList.add("degraded");pulse.textContent="ARCHIVE REQUEST FAILED"}
 }
}
function sources(){
 const panel=$("sourcebox"),head=panel?.querySelector(".block-title");
 if(!head)return;
 head.setAttribute("role","button");head.setAttribute("tabindex","0");head.setAttribute("aria-expanded","false");
 const toggle=()=>{const open=panel.classList.toggle("v6-open");head.setAttribute("aria-expanded",String(open))};
 head.addEventListener("click",toggle);
 head.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle()}});
}
async function init(){
 let initial="spectre";
 try{initial=localStorage.getItem("gulfastra-v6-theme")||initial}catch(error){}
 themeSet(initial);
 $("v6Theme")?.addEventListener("click",themeToggle);
 $("v6ExpandMap")?.addEventListener("click",mapToggle);
 $("sync")?.addEventListener("click",pull);
 $("refreshFromPanel")?.addEventListener("click",pull);
 sources();
 window.addEventListener("resize",()=>{clearTimeout(init.timer);init.timer=setTimeout(resizeMap,160)});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)pull()});
 await pull();
 window.addEventListener("gulfastra:data-changed",e=>{if(e.detail?.name==="reports.json")pull()});
 setInterval(()=>{if(!document.hidden)pull()},45000);
 setInterval(updated,15000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();