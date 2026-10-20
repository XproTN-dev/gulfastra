/* Gulfastra v7: GitHub-only branch-backed incremental source loader.
 * Public browser requests; no GitHub API token, private API or Pages redeployment.
 * GitHub raw/CDN propagation is best-effort and is NOT guaranteed real-time.
 */
(()=>{
"use strict";
const BASE="https://raw.githubusercontent.com/XproTN-dev/gulfastra/intelligence-data/data/";
const FALLBACK="data/";
const ALLOWED=new Set(["reports.json","events.json","revisions.json","observations.json"]);
const state={channel:"starting",checked_at:null,manifest:null,error:null,dataVersions:{},fallback:false};
const memory=new Map(),loading=new Map();
let manifestPromise=null,lastManifestCheck=0;
const PING_MS=24000;
const toUrl=(path,revision)=>BASE+path+(revision?"?version="+encodeURIComponent(revision):"?fresh="+Date.now());
const timeout=()=>typeof AbortSignal!=="undefined"&&AbortSignal.timeout?{signal:AbortSignal.timeout(11500)}:{};
async function fetchJSON(url){
 const response=await fetch(url,{mode:"cors",cache:"no-store",credentials:"omit",...timeout()});
 if(!response.ok)throw new Error("HTTP "+response.status+": "+url.split("?")[0]);
 return response.json();
}
function publishStatus(mode,error=null){
 state.channel=mode;state.error=error?String(error.message||error).slice(0,150):null;
 state.fallback=mode==="static-fallback";
 window.__gulfastraDataStatus={channel:state.channel,error:state.error,checked_at:state.checked_at,manifest:state.manifest};
 window.dispatchEvent(new CustomEvent("gulfastra:source",{detail:window.__gulfastraDataStatus}));
}
async function manifest(force=false){
 const now=Date.now();
 if(!force&&state.manifest&&now-lastManifestCheck<PING_MS)return state.manifest;
 if(manifestPromise)return manifestPromise;
 manifestPromise=(async()=>{
  try{
   const doc=await fetchJSON(toUrl("live-manifest.json"));
   if(doc.channel!=="github-intelligence-data"||doc.schema!==7||!doc.files||!doc.collected_at)throw Error("Invalid live data manifest");
   state.manifest=doc;state.checked_at=new Date().toISOString();lastManifestCheck=Date.now();
   publishStatus("data-branch");return doc;
  }catch(error){
   state.checked_at=new Date().toISOString();lastManifestCheck=Date.now();
   if(state.manifest){publishStatus("cached-branch",error);return state.manifest}
   publishStatus("static-fallback",error);return null;
  }finally{manifestPromise=null}
 })();
 return manifestPromise;
}
async function get(name,{force=false}={}){
 if(!ALLOWED.has(name))throw new Error("Unsupported dataset "+name);
 const doc=await manifest(force);
 const entry=doc?.files?.[name];
 if(entry?.sha256){
  const hash=entry.sha256;
  const cached=memory.get(name);
  if(!force&&cached?.version===hash)return cached.data;
  const requestKey=name+":"+hash;
  if(loading.has(requestKey))return loading.get(requestKey);
  const request=(async()=>{
   try{
    const data=await fetchJSON(toUrl(name,hash));
    if(name==="reports.json"&&!Array.isArray(data.reports))throw Error("Invalid remote article archive");
    if(name==="events.json"&&!Array.isArray(data.events))throw Error("Invalid remote Fusion archive");
    memory.set(name,{version:hash,data});state.dataVersions[name]=hash;
    if(state.channel!=="data-branch")publishStatus("data-branch");
    return data;
   }catch(error){
    if(cached){publishStatus("cached-branch",error);return cached.data}
    publishStatus("static-fallback",error);
    return local(name);
   }finally{loading.delete(requestKey)}
  })();
  loading.set(requestKey,request);
  return request;
 }
 const cached=memory.get(name);
 if(cached)return cached.data;
 return local(name);
}
async function local(name){
 if(loading.has("local:"+name))return loading.get("local:"+name);
 const request=(async()=>{
  try{
   const data=await fetchJSON(FALLBACK+name);
   memory.set(name,{version:"bundled-fallback",data});
   return data;
  }finally{loading.delete("local:"+name)}
 })();
 loading.set("local:"+name,request);return request;
}
function info(){return {...state,dataVersions:{...state.dataVersions}}}
function clearCache(){memory.clear();lastManifestCheck=0}
window.GulfastraData={get,manifest,info,clearCache,raw_base:BASE};
})();
