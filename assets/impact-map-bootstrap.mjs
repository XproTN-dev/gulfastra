/* MapLibre GL JS 6 ESM, locally hosted. Map view is never simulated. */
let loaded=false;
let issue="";
try{
 const module=await import("../vendor/maplibre-gl.mjs");
 if(module?.Map){globalThis.maplibregl=module;loaded=true}
 else throw new Error("MapLibre ES module exports unavailable");
}catch(error){
 issue="Self-hosted MapLibre failed: "+String(error).slice(0,100);
 try{
  const module=await import("https://cdn.jsdelivr.net/npm/maplibre-gl@6.15.0/dist/maplibre-gl.mjs");
  if(!module?.Map)throw new Error("Missing MapLibre constructor");
  globalThis.maplibregl=module;loaded=true;
 }catch(fallback){issue+="; external fallback failed: "+String(fallback).slice(0,100)}
}
if(!loaded){
 globalThis.GXImpactMapLibraryError=issue;
 const warning=document.getElementById("mapFallback");
 if(warning){warning.hidden=false;warning.textContent="MAP ENGINE UNAVAILABLE · News and analysis remain accessible. Reload or check asset delivery."}
}
globalThis.GXImpactApp?.mapReady?.();
