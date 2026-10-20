/* Load MapLibre v6 correctly as an ES module, never as removed legacy UMD .js. */
let mapModule = null;
let diagnostic = null;
try {
  // Primary source: same-origin GitHub Pages asset included in deployment.
  mapModule = await import("../vendor/maplibre-gl.mjs");
  globalThis.GXMapLibrarySource = "same-origin";
} catch (error) {
  diagnostic = "Self-hosted MapLibre failed: " + String(error).slice(0,140);
  // Optional emergency fallback only. Site never relies on this CDN to work.
  try {
    mapModule = await import("https://cdn.jsdelivr.net/npm/maplibre-gl@6.15.0/dist/maplibre-gl.mjs");
    globalThis.GXMapLibrarySource = "external-fallback";
  } catch (alternate) {
    diagnostic += "; CDN fallback: " + String(alternate).slice(0,140);
  }
}
if (mapModule?.Map) {
  globalThis.maplibregl = mapModule;
} else {
  globalThis.GXMapLibraryError = diagnostic || "ES module unavailable";
  const message = document.querySelector("#mapFallback");
  if (message) {
    message.hidden = false;
    message.innerHTML =
      "<strong>INTERACTIVE MAP LIBRARY UNAVAILABLE</strong>" +
      "<span>The intelligence stream remains available. This may be a browser policy or asset-delivery failure; no fictional map is substituted.</span>";
  }
}
// Always start the data/evidence UI, even if map import fails.
try {
  await import("./command11.js?v=11-6");
} catch (error) {
  console.error("GULFASTRA UI bootstrap failed", error);
  const label = document.querySelector("#metricChannel");
  if (label) label.textContent = "UI ERROR";
}
