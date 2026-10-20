(()=>{
'use strict';
const GEOGRAPHY={
Iran:{center:[53.7,32.2],label:"IRAN"},Saudi:{center:[44.5,24.5],label:"SAUDI ARABIA"},Qatar:{center:[51.2,25.25],label:"QATAR"},
UAE:{center:[54.4,24.3],label:"UAE"},Bahrain:{center:[50.56,26.05],label:"BAHRAIN"},Kuwait:{center:[47.5,29.25],label:"KUWAIT"},
Iraq:{center:[43.4,33.1],label:"IRAQ"},Oman:{center:[57.3,21.8],label:"OMAN"},Yemen:{center:[47.5,15.5],label:"YEMEN"},
Israel:{center:[35.0,31.5],label:"ISRAEL"}};
const CATEGORIES={
security:{name:"Missile / drone / security reports",short:"SECURITY",color:"#ff687a"},
transport:{name:"Airspace / shipping reports",short:"TRANSPORT",color:"#f8ba70"},
diplomacy:{name:"Diplomacy / sanctions",short:"DIPLOMACY",color:"#59cef4"},
other:{name:"Other regional reporting",short:"REGIONAL",color:"#b1a3ff"}
};
const s={reports:[],providers:{},last_run:null,chosenCountry:"",search:"",hours:24,mode:"all",language:"all",enabled:new Set(Object.keys(CATEGORIES)),map:null,mapReady:false,markers:[],bright:false,loadedOnce:false,alertPermission:false,shown:[],lastSeen:null};
const $=id=>document.getElementById(id);
function txt(x){return String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function fmtDate(v){let d=new Date(v);return isNaN(d)?"Unknown":d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
function fmtFull(v){let d=new Date(v);return isNaN(d)?"Unknown":d.toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}
function age(v){let t=new Date(v).getTime();if(!Number.isFinite(t))return"UNKNOWN TIME";let m=Math.max(0,Math.floor((Date.now()-t)/60000));return m<1?"JUST NOW":m<60?m+"M AGO":m<1440?Math.floor(m/60)+"H AGO":Math.floor(m/1440)+"D AGO"}
function notify(message){let e=$("toast");e.textContent=message;e.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(()=>e.classList.remove("show"),3600)}
function countryOptions(){let c=$("country");for(let [id,v]of Object.entries(GEOGRAPHY)){let o=document.createElement("option");o.value=id;o.textContent=v.label;c.appendChild(o)}}
function categoryControls(){let root=$("layers");root.innerHTML=Object.entries(CATEGORIES).map(([id,v])=>'<button class="layer-button" data-layer="'+id+'" aria-pressed="true"><span class="layer-glyph" style="background:'+v.color+';color:'+v.color+'"></span><span>'+txt(v.name)+'</span><em>✓</em></button>').join("");
root.addEventListener("click",e=>{let b=e.target.closest("[data-layer]");if(!b)return;let key=b.dataset.layer;if(s.enabled.has(key))s.enabled.delete(key);else s.enabled.add(key);b.classList.toggle("off",!s.enabled.has(key));b.setAttribute("aria-pressed",String(s.enabled.has(key)));b.querySelector("em").textContent=s.enabled.has(key)?"✓":"–";$("layerCount").textContent=s.enabled.size+" OF 4 ON";render()})}
function initMap(){
 if(typeof maplibregl==="undefined"){$("mapLoad").textContent="Map library unavailable. Reports remain accessible below.";return}

 try{
  s.map=new maplibregl.Map({container:"map",style:"https://tiles.openfreemap.org/styles/fiord",center:[49.4,26.7],zoom:4.6,minZoom:3,maxZoom:13,renderWorldCopies:false,attributionControl:true});
  s.map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");
  window.__gulfastraMap=s.map; window.__gulfastraGeography=GEOGRAPHY;
  s.map.on("load",()=>{s.mapReady=true;$("mapLoad").classList.add("off");plot()});
  let fallback=false;
  s.map.on("error",e=>{if(!s.mapReady&&!fallback){fallback=true;s.map.setStyle("https://tiles.openfreemap.org/styles/liberty")}else if(!s.mapReady){$("mapLoad").innerHTML="Map tiles unavailable. News and filters remain usable."}});
 }catch(e){$("mapLoad").textContent="Map error: "+e.message}
}
function centerMap(){if(s.map)s.map.flyTo({center:[49.4,26.7],zoom:4.6,duration:900})}
function clearPins(){s.markers.forEach(m=>m.remove());s.markers=[]}
function plot(){if(!s.mapReady||!s.map)return;clearPins();let groups={};for(let r of filtered()){const mentions=Array.isArray(r.countries)&&r.countries.length?r.countries:(r.country?[r.country]:[]);for(const country of mentions){if(GEOGRAPHY[country])(groups[country]??=[]).push(r)}}for(let [country,list]of Object.entries(groups)){let color=list.some(x=>x.category==="security")?"#ff687a":list.some(x=>x.category==="transport")?"#f8ba70":"#59cef4";
let node=document.createElement("button");node.className="country-pin";node.dataset.country=country;node.style.setProperty("--pin-color",color);node.type="button";node.title=list.length+" news reports mention "+country+"; click to filter";node.setAttribute("aria-label",node.title);node.innerHTML='<span class="pin-number">'+list.length+'</span><span class="pin-label">'+txt(GEOGRAPHY[country].label)+'</span>';
node.addEventListener("click",()=>{s.chosenCountry=country;$("country").value=country;render();notify("Filtering reports mentioning "+country);if(window.innerWidth<=850)document.querySelector("#feedpanel").scrollIntoView({behavior:"smooth"})});
let marker=new maplibregl.Marker({element:node,anchor:"center"}).setLngLat(GEOGRAPHY[country].center).addTo(s.map);s.markers.push(marker)}
$("mapCount").textContent=filtered().length}
function filtered(){let low=s.hours?Date.now()-s.hours*3600000:0;return s.reports.filter(r=>s.enabled.has(CATEGORIES[r.category]?r.category:"other")&&(!s.chosenCountry||r.country===s.chosenCountry||(Array.isArray(r.countries)&&r.countries.includes(s.chosenCountry)))&&(s.language==="all"||(r.language||(/[؀-ۿ]/.test(r.title)?"ar":"en"))===s.language)&&(!s.search||[r.title,r.source,r.country].join(" ").toLowerCase().includes(s.search))&&(!low||(new Date(r.published_at).getTime()||0)>=low)).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at))}
function visibleList(){let rows=filtered();return s.mode==="all"?rows:rows.filter(r=>s.mode==="security"?r.category==="security":r.category==="transport")}
function updateMetrics(){
 $("mTotal").textContent=s.reports.length.toLocaleString();$("mSecurity").textContent=s.reports.filter(r=>r.category==="security").length;$("mTransport").textContent=s.reports.filter(r=>r.category==="transport").length;
 $("mOutlets").textContent=new Set(s.reports.map(r=>r.source).filter(Boolean)).size;
 let m=(Date.now()-new Date(s.last_run||0).getTime())/60000;
 let label=!s.last_run?"NO DATA":m<=45?"CURRENT":m<=180?"DELAYED":"STALE";
 $("freshness").textContent=label;$("freshness").style.color=label==="CURRENT"?"#62e6c2":label==="STALE"||label==="NO DATA"?"#ffc180":"#f0df9c";
 $("freshnessSub").textContent=s.last_run?"Collector: "+age(s.last_run):"No completed collection";
 $("headerUpdated").textContent=s.last_run?"LAST UPDATE · "+age(s.last_run):"AWAITING DATA";
 $("feedUpdated").textContent=s.last_run?age(s.last_run):"NO DATA";
 $("sourceTime").textContent=s.last_run?"Last collection: "+fmtDate(s.last_run):"Dataset not populated";
 $("mapFooter").textContent=s.last_run?"Collector timestamp: "+fmtFull(s.last_run):"No verified collection";
 let status=Object.entries(s.providers||{});
 $("providerStatus").innerHTML=status.length?status.map(([key,v])=>'<div class="provider"><span>'+txt(key)+'</span><b class="'+(v.ok===false?"error":"")+'">'+(v.ok===true?"✓ "+(v.items??"")+" FETCHED":"! ERROR")+'</b></div>').join(""):"No diagnostics yet — collection has not run.";
}
function updateActivity(){
 let bins=Array(24).fill(0);for(let r of filtered()){let d=(Date.now()-new Date(r.published_at).getTime())/3600000;if(Number.isFinite(d)&&d>=0&&d<24)bins[23-Math.floor(d)]++}
 let max=Math.max(1,...bins);$("bars").innerHTML=bins.map((n,i)=>'<div class="chartbar" title="'+n+' article(s)" data-count="'+n+'" style="height:'+Math.max(2,Math.round(100*n/max))+'%"></div>').join("");$("activityMeta").textContent=bins.reduce((a,b)=>a+b,0)+" ARTICLES / 24H";
}
function cleanHeadline(title){const value=String(title||"").trim();const parts=value.split(/\s[-—]\s/);return parts.length>1&&parts[0].length>=35?parts[0]:value}
function groupReports(items){const groups=new Map();for(const r of items){const headline=cleanHeadline(r.title);const textKey=headline.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g," ").trim();const key=textKey.length>=32?String(r.published_at||"").slice(0,10)+":"+textKey:r.id;if(groups.has(key)){groups.get(key).related.push(r)}else{groups.set(key,{...r,title:headline,related:[r]})}}return Array.from(groups.values())}
function updateFeed(){
 let rawRows=visibleList(),rows=groupReports(rawRows);s.shown=rows;$("feedCount").textContent=rows.length;$("feedSummary").textContent=rows.length+" COVERAGE GROUPS FROM "+rawRows.length+" REPORTS";
 $("feed").innerHTML=rows.length?rows.slice(0,250).map((r,i)=>{
 let kind=CATEGORIES[r.category]||CATEGORIES.other;
 return '<article class="report" tabindex="0" role="button" data-report="'+i+'" aria-label="Open report"><div class="report-header"><span class="event-pill '+txt(r.category)+'">'+txt(r.tag||kind.short)+'</span><span class="report-age">'+txt(age(r.published_at))+'</span></div><h3 dir="auto" lang="'+(r.language==="ar"?"ar":"en")+'">'+txt(r.title)+'</h3><div class="report-byline"><strong>'+txt(r.related.length>1?r.related.length+" RELATED HEADLINES":r.source||"News source")+'</strong><span>'+txt(r.country||"REGIONAL")+'</span></div></article>'}).join(""):'<div class="empty"><div class="empty-symbol">⌁</div><strong>No reports in this view</strong><p>Try ALL dates, another country, or clear your search. An empty result does not mean no incidents occurred.</p></div>';
 $("feed").querySelectorAll("[data-report]").forEach(node=>{let open=()=>showReport(rows[+node.dataset.report]);node.addEventListener("click",open);node.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}})});
 $("alertUnread").textContent=s.reports.filter(r=>r.category==="security"&&Date.now()-new Date(r.published_at)<86400000).length;
}
function render(){updateMetrics();updateActivity();updateFeed();plot();$("mapLayerName").textContent=s.chosenCountry||"ALL SOURCES"}
function setDrawer(tag,content){$("drawerTag").textContent=tag;$("drawerContent").innerHTML=content;$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");$("backdrop").hidden=false}
function closeDrawer(){$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");if(!$("controlpanel").classList.contains("open"))$("backdrop").hidden=true}
function showReport(r){
 if(!r)return;
 const related=r.related||[r],category=CATEGORIES[r.category]||CATEGORIES.other;
 const external=typeof r.url==="string"&&/^https:\/\//i.test(r.url)?r.url:"#";
 const links=related.length>1?'<p>'+related.length+' published headlines have similar wording. Similar headlines do not establish independent verification.</p><div class="panel-eyebrow">RELATED ARTICLE LINKS</div>'+related.map(item=>{const url=/^https:\/\//i.test(item.url||"")?item.url:"#";return '<div class="alert-card"><span dir="auto">'+txt(item.source||"News outlet")+' · '+txt(fmtDate(item.published_at))+'</span><p dir="auto"><a href="'+txt(url)+'" target="_blank" rel="noopener noreferrer">'+txt(item.title)+' ↗</a></p></div>'}).join(""):"";
 const body='<h2 dir="auto">'+txt(r.title)+'</h2><div class="detail-grid"><div><small>NEWS OUTLET</small><strong>'+txt(r.source||"Not specified")+'</strong></div><div><small>MENTIONED COUNTRY</small><strong>'+txt(r.country||"Regional / uncertain")+'</strong></div><div><small>PUBLICATION DATE</small><strong>'+txt(fmtDate(r.published_at))+'</strong></div><div><small>VERIFICATION</small><strong>Unverified report</strong></div></div><p>This is a publicly indexed news headline, not an independently confirmed attack. Countries are general reference markers, not exact incident locations.</p><a class="open-source" href="'+txt(external)+'" target="_blank" rel="noopener noreferrer">OPEN ORIGINAL NEWS SOURCE ↗</a>'+links;
 setDrawer("PUBLIC REPORT / "+category.short,body);
}
function showAlerts(){let rows=s.reports.filter(r=>r.category==="security"&&Date.now()-new Date(r.published_at).getTime()<86400000).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at)).slice(0,35);
let body='<h2>Security Reporting Alerts</h2><p>Recent public articles containing conflict-related terms. These are headline alerts, <strong>not verified missile or drone detections</strong>. Notifications work only while the website is open.</p><button class="open-source" id="enableNotify">ENABLE BROWSER NOTIFICATIONS</button><div class="panel-eyebrow" style="margin-top:25px">RECENT SECURITY ARTICLES</div>';
body+=rows.length?rows.map((r,i)=>'<div class="alert-card"><span>'+txt(age(r.published_at))+' · '+txt(r.source)+'</span><button data-alert-index="'+i+'">'+txt(r.title)+'</button></div>').join(""):'<p>No matching security headlines published in the last 24 hours.</p>';
setDrawer("ALERT CENTER / PUBLIC NEWS",body);
$("enableNotify").onclick=async()=>{if(!("Notification" in window)){notify("This browser does not support notifications");return}try{let status=await Notification.requestPermission();s.alertPermission=status==="granted";notify(status==="granted"?"Notifications enabled while page is open":"Notification permission not granted")}catch(e){notify("Notification unavailable")}};
$("drawerContent").querySelectorAll("[data-alert-index]").forEach(b=>b.onclick=()=>showReport(rows[+b.dataset.alertIndex]));}
function showHelp(){setDrawer("GULFASTRA / METHODOLOGY",'<h2>What you are seeing</h2><p>Gulfastra collects published news headlines about regional security, transport disruptions and diplomacy. News searches are refreshed by a scheduled GitHub Actions workflow on a best-effort basis. A report may be inaccurate, duplicated or unrelated to a real incident.</p><div class="detail-grid"><div><small>MAP DISPLAY</small><strong>Country aggregation</strong></div><div><small>DATA TYPE</small><strong>Published news reports</strong></div><div><small>ALERT MODEL</small><strong>Headline-based</strong></div><div><small>UPDATE CADENCE</small><strong>Best-effort schedule</strong></div></div><p>Country markers are geographic reference points and do not identify weapon launches, impacts, military assets or exact incident locations. This is not a security or emergency alert service. Check original sources and official local guidance.</p><a class="open-source" target="_blank" rel="noopener noreferrer" href="https://github.com/XproTN-dev/gulfastra">VIEW PUBLIC PROJECT SOURCE ↗</a>')}
function checkNewReports(){let latest=s.reports.filter(r=>r.category==="security").sort((a,b)=>new Date(b.published_at)-new Date(a.published_at))[0];if(!latest)return;
try{const key="gulfastra-last-security";let previous=localStorage.getItem(key);if(previous&&s.loadedOnce&&new Date(latest.published_at).getTime()>new Date(previous).getTime()){notify("New security reporting is available");if(Notification.permission==="granted")new Notification("Gulfastra: new published security reporting",{body:"New source-linked headline(s). Not independently verified."})}if(!previous||new Date(latest.published_at)>new Date(previous))localStorage.setItem(key,latest.published_at)}catch(e){}}
async function load(){try{const response=await fetch("data/reports.json?time="+Date.now(),{cache:"no-store"});if(!response.ok)throw new Error("HTTP "+response.status);let data=await response.json();if(!Array.isArray(data.reports))throw Error("Invalid dataset schema");s.reports=data.reports;s.last_run=data.last_run;s.providers=data.providers||{};checkNewReports();s.loadedOnce=true;render()}catch(e){$("feed").innerHTML='<div class="empty"><strong>Published archive unavailable</strong><p>'+txt(e.message)+'. Source collection is independent of this browser.</p></div>';$("freshness").textContent="FETCH ERROR";$("headerUpdated").textContent="ARCHIVE UNAVAILABLE";notify("Unable to load published reports")}}
function toggleFilters(open){$("controlpanel").classList.toggle("open",open);$("backdrop").hidden=!open&&!$("drawer").classList.contains("open")}

function languageTabs(){
 $("languageTabs").addEventListener("click",e=>{
  const b=e.target.closest("[data-lang]");if(!b)return;
  s.language=b.dataset.lang; $("languageTabs").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));
  render();notify(s.language==="ar"?"عرض الأخبار العربية":s.language==="en"?"English reporting":"All languages");
 });
}
function linkCard(title,url,description){
 return '<a class="discovery-link" href="'+txt(url)+'" target="_blank" rel="noopener noreferrer"><strong dir="auto">'+txt(title)+' ↗</strong><small dir="auto">'+txt(description)+'</small></a>';
}
function showNabd(){
 const links=[
 ["نبض — الأخبار العاجلة","https://nabd.com/category/877-227ac9/عاجل","أخبار مجمّعة من مصادر متعددة"],
 ["نبض — السعودية","https://nabd.com/category/4-93ad90/","أخبار السعودية من ناشرين محليين"],
 ["نبض — مصادر الأخبار العربية","https://nabd.com/","البحث عن المصادر والناشرين"],
 ["الجزيرة نت","https://www.aljazeera.net/","مصدر عربي مباشر"],
 ["العربية","https://www.alarabiya.net/","متابعة الأخبار الخليجية مباشرة"],
 ["وكالة الأنباء القطرية","https://qna.org.qa/ar-QA/","بيانات وأخبار رسمية قطرية"]
 ];
 setDrawer("NABD / GULF PUBLISHER DISCOVERY",'<h2 dir="auto">مصادر أخبار الخليج — نبض</h2><p dir="auto">نبض يجمع أخبار الناشرين. هذه روابط للبحث والتحقق من الناشر الأصلي؛ لا ندّعي امتلاك وصول مباشر لواجهة برمجة خاصة بتطبيق نبض. الأخبار العربية في Gulfastra تأتي من RSS وفهارس Google News العربية.</p>'+links.map(x=>linkCard(...x)).join(""));
}
function showXWatch(){
 const searches=[
 ["بحث عربي: إيران والخليج","(إيران OR الخليج OR السعودية OR قطر) (صواريخ OR مسيرات OR اعتراض)"],
 ["بحث عربي: مضيق هرمز","(هرمز OR الخليج) (ناقلات OR سفن OR ملاحة)"],
 ["English: Gulf reporting","(Iran OR Saudi OR Qatar OR Bahrain) (missile OR drone OR airspace)"],
 ["Official-account discovery","(QNA OR SPA OR WAM OR CENTCOM) Gulf Iran"]
 ];
 const html='<h2>X / PUBLIC POST WATCH</h2><p>Open current public X searches directly in X. The free Gulfastra site cannot automatically retrieve X posts through the official paid API; these are external searches, not a live embedded ingestion feed. Posts are unverified until corroborated.</p>'+searches.map(([title,q])=>linkCard(title,"https://x.com/search?q="+encodeURIComponent(q)+"&f=live","Open public X search · Latest")).join("");
 setDrawer("X / SOCIAL SOURCE DISCOVERY",html);
}
function setupEvents(){
languageTabs();$("openNabd").onclick=showNabd;$("openXWatch").onclick=showXWatch;
categoryControls();countryOptions();$("country").onchange=e=>{s.chosenCountry=e.target.value;if(s.map){let c=GEOGRAPHY[s.chosenCountry];if(c)s.map.flyTo({center:c.center,zoom:5.5});else centerMap()}render();if(window.innerWidth<=850)toggleFilters(false)};
$("search").oninput=e=>{s.search=e.target.value.toLowerCase().trim();render()};
$("windows").addEventListener("click",e=>{let b=e.target.closest("[data-hours]");if(!b)return;s.hours=+b.dataset.hours;$("windows").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));render()});
$("feedTabs").addEventListener("click",e=>{let b=e.target.closest("[data-mode]");if(!b)return;s.mode=b.dataset.mode;$("feedTabs").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));updateFeed()});
$("mapRecenter").onclick=centerMap;$("mapStyle").onclick=()=>{if(!s.map)return;s.bright=!s.bright;s.mapReady=false;$("mapLoad").classList.remove("off");s.map.setStyle("https://tiles.openfreemap.org/styles/"+(s.bright?"liberty":"fiord"));s.map.once("style.load",()=>{s.mapReady=true;$("mapLoad").classList.add("off");plot()});$("mapStyle").textContent=s.bright?"◈ FIORD MAP":"◈ LIGHT MAP"};
$("sync").onclick=()=>{load();notify("Checking published data…")};$("refreshFromPanel").onclick=load;$("showAll").onclick=()=>{s.chosenCountry="";$("country").value="";s.search="";$("search").value="";s.hours=0;$("windows").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.hours==="0"));s.mode="all";s.language="all";$("languageTabs").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.lang==="all"));$("feedTabs").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.mode==="all"));render();notify("All archived reports shown")};
$("alertToggle").onclick=showAlerts;$("openHelp").onclick=showHelp;$("drawerClose").onclick=closeDrawer;$("closeLayers").onclick=()=>toggleFilters(false);$("backdrop").onclick=()=>{closeDrawer();toggleFilters(false)};
document.querySelectorAll("[data-mobile]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-mobile]").forEach(x=>x.classList.toggle("active",x===b));let to=b.dataset.mobile;if(to==="filters")toggleFilters(true);if(to==="reports")$("feedpanel").scrollIntoView({behavior:"smooth"});if(to==="map")$("mapColumn").scrollIntoView({behavior:"smooth"});if(to==="alerts")showAlerts()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeDrawer();toggleFilters(false)}});
$("utc").textContent=new Date().toISOString().slice(11,19)+" UTC";setInterval(()=>{$("utc").textContent=new Date().toISOString().slice(11,19)+" UTC"},1000);
}
function init(){setupEvents();initMap();load();setInterval(load,60000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();