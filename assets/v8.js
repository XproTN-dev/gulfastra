/* Gulfastra 08 — user-directed complete appearance studio and application navigation. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const VALID=new Set(["atlas","nocturne","terminal"]);
const THEME_COLOR={atlas:"#e8edef",nocturne:"#09131f",terminal:"#070d0b"};
const saveKey="gulfastra-appearance-08";
const studio=$("v8ThemeStudio");
let lastFocus=null;
function preferred(){
 try{const val=localStorage.getItem(saveKey);if(VALID.has(val))return val}catch(_){}
 return "atlas";
}
function harmonizeMap(theme){
 const map=window.__gulfastraMap;
 if(!map)return;
 function sync(){
  const button=$("mapStyle");
  if(!button)return;
  const dark=theme!=="atlas";
  // Existing map engine owns map state and marker regeneration. Use its control.
  const currentlyLight=button.textContent.includes("FIORD MAP");
  if((!dark&&!currentlyLight)||(dark&&currentlyLight))button.click();
  else try{map.resize()}catch(_){}
 }
 if(map.loaded())sync();
 else map.once("load",sync);
}
function themeApply(name,{persist=true}={}){
 if(!VALID.has(name))return;
 document.body.dataset.gfTheme=name;
 if(persist)try{localStorage.setItem(saveKey,name)}catch(_){}
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=THEME_COLOR[name];
 document.querySelectorAll("[data-v8-theme]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.v8Theme===name)));
 const control=$("v6Theme");
 if(control){control.title="Appearance studio · "+name;control.setAttribute("aria-label","Appearance studio. Current style "+name)}
 window.dispatchEvent(new CustomEvent("gulfastra:theme",{detail:{name}}));
 harmonizeMap(name);
}
function openStudio(){
 lastFocus=document.activeElement;
 studio.hidden=false;
 document.body.classList.add("v8-studio-open");
 studio.querySelector('[data-v8-theme="'+document.body.dataset.gfTheme+'"]')?.focus();
}
function closeStudio(){
 studio.hidden=true;document.body.classList.remove("v8-studio-open");
 if(lastFocus?.focus)lastFocus.focus();else $("v6Theme")?.focus();
}
function filterPanel(){
 const mobileFilter=document.querySelector('[data-mobile="filters"]');
 if(mobileFilter)mobileFilter.click();
 else {$("controlpanel")?.classList.toggle("open")}
}
function bind(){
 $("v6Theme")?.addEventListener("click",openStudio);
 $("v8ThemeClose")?.addEventListener("click",closeStudio);
 $("v8ThemeDone")?.addEventListener("click",closeStudio);
 studio?.addEventListener("click",event=>{
  if(event.target.closest("[data-close-theme]"))closeStudio();
  const themeButton=event.target.closest("[data-v8-theme]");
  if(themeButton)themeApply(themeButton.dataset.v8Theme);
 });
 document.addEventListener("keydown",event=>{
  if(studio?.hidden===false && event.key==="Escape"){event.stopImmediatePropagation();closeStudio();return}
  if(studio?.hidden===false&&event.key==="Tab"){
   const buttons=[...studio.querySelectorAll("button:not([disabled])")];
   const first=buttons[0],last=buttons.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 });
 $("v8Filters")?.addEventListener("click",filterPanel);
 document.querySelectorAll("[data-gf-open]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-gf-open]").forEach(b=>b.classList.toggle("selected",b===button));
 }));
 $("gfClose")?.addEventListener("click",()=>{
  document.querySelectorAll("[data-gf-open]").forEach(b=>b.classList.remove("selected"))
 });
 let resizeTick;
 window.addEventListener("resize",()=>{clearTimeout(resizeTick);resizeTick=setTimeout(()=>window.__gulfastraMap?.resize(),220)});
}
function init(){
 bind();
 themeApply(preferred(),{persist:false});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();