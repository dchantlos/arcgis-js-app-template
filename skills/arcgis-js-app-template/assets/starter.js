// =============================================================================
// App entry (copy to main.js). Kit wiring is marked KIT; replace the DEMO parts
// with the app's WebScene/WebMap, layers and logic. OPTIONAL parts only run when
// their markup is enabled in index.html; delete them if the app doesn't need them.
// =============================================================================

import {
  initShowcase,
  createBoot,
  initWelcome,
  createModal,
  createFloatPanel,
  whenViewReady,
  applyViewTheme,
  accentRgb,
  bindNavStack,
  bindFlyout,
  bindRange,
  createTooltip
} from "./showcase/showcase.js";

// --- KIT: chrome that works before the view exists ---------------------------
initShowcase();
const boot = createBoot();
initWelcome();
createModal("#resources", { trigger: "#resourcesFab" });
createFloatPanel({
  title: "How to use this app",
  label: "Help",
  prepend: true,
  content: `
    <p>EDIT: one-line orientation for first-time visitors.</p>
    <div class="accordion__item is-open">
      <button class="accordion__q" type="button"><span>What am I looking at?</span><span class="accordion__chev" aria-hidden="true">⌄</span></button>
      <div class="accordion__a">Describe the scene, the data and what the colors mean.</div>
    </div>
    <div class="accordion__item">
      <button class="accordion__q" type="button"><span>How do I navigate?</span><span class="accordion__chev" aria-hidden="true">⌄</span></button>
      <div class="accordion__a"><ul><li><strong>Drag</strong> to pan, <strong>right-drag</strong> to orbit.</li><li><strong>Scroll</strong> to zoom.</li><li>Use <strong>⟳</strong> to reset the view.</li></ul></div>
    </div>`
});

// --- DEMO: the view (replace with the app's WebScene/WebMap) ------------------
// CDN apps load modules with $arcgis.import(); npm/Vite apps use
//   import SceneView from "@arcgis/core/views/SceneView.js";
const [Map, SceneView, GraphicsLayer, Graphic] = await $arcgis.import([
  "@arcgis/core/Map.js",
  "@arcgis/core/views/SceneView.js",
  "@arcgis/core/layers/GraphicsLayer.js",
  "@arcgis/core/Graphic.js"
]);

const demoLayer = new GraphicsLayer({ title: "Demo sites" });
const view = new SceneView({
  container: "viewDiv",
  map: new Map({ basemap: "dark-gray-vector", ground: "world-elevation", layers: [demoLayer] }),
  camera: { position: { longitude: 121.736, latitude: 25.105, z: 2200 }, heading: 20, tilt: 66 },
  qualityProfile: "high",
  ui: { components: [] }, // the kit provides its own controls; never hide the attribution
  environment: {
    atmosphereEnabled: true,
    starsEnabled: true,
    lighting: { type: "virtual", directShadowsEnabled: true }
  }
});

[
  { name: "North pier", status: "On schedule", lon: 121.7452, lat: 25.1452 },
  { name: "Fish market", status: "Delayed", lon: 121.7746, lat: 25.1463 },
  { name: "Ferry terminal", status: "Complete", lon: 121.7417, lat: 25.1338 }
].forEach(({ name, status, lon, lat }) =>
  demoLayer.add(
    new Graphic({
      geometry: { type: "point", longitude: lon, latitude: lat },
      attributes: { name, status },
      symbol: {
        type: "point-3d",
        symbolLayers: [
          { type: "object", resource: { primitive: "cylinder" }, width: 60, height: 320, material: { color: [...accentRgb(), 0.85] } }
        ]
      }
    })
  )
);

// --- DEMO: dashboard summarizing the demo sites --------------------------------
const sites = demoLayer.graphics.toArray().map((graphic) => graphic.attributes);
const complete = sites.filter((site) => site.status === "Complete").length;
const delayed = sites.filter((site) => site.status === "Delayed").length;
const pctComplete = Math.round((complete / sites.length) * 100);
document.getElementById("progressRing").style.setProperty("--pct", pctComplete);
document.getElementById("progressPct").textContent = `${pctComplete}%`;
document.getElementById("completeSummary").textContent = `${complete} of ${sites.length}`;
document.getElementById("siteCount").textContent = String(sites.length);
const delayedCount = document.getElementById("delayedCount");
delayedCount.textContent = String(delayed);
delayedCount.classList.toggle("is-bad", delayed > 0);

// --- KIT: match the view to the theme, reveal when it has drawn ---------------
applyViewTheme(view);
await boot.track(whenViewReady(view));
bindNavStack(view);

// --- KIT pattern: layer toggles in the right panel ----------------------------
function renderLayerToggles(layers) {
  const rows = layers.map((layer) => {
    const row = document.createElement("li");
    row.className = "toggle-row";
    row.innerHTML =
      '<span class="toggle-name"></span><label class="switch"><input type="checkbox" /><span class="track"></span></label>';
    const title = layer.title || layer.id;
    row.querySelector(".toggle-name").textContent = title;
    const input = row.querySelector("input");
    input.checked = layer.visible;
    input.setAttribute("aria-label", `Show ${title}`);
    input.addEventListener("change", () => (layer.visible = input.checked));
    return row;
  });
  document.getElementById("layerList").replaceChildren(...rows);
  document.getElementById("layerCount").textContent = String(rows.length);
}
renderLayerToggles(view.map.allLayers.filter((layer) => layer.type !== "elevation").toArray().reverse());

// --- KIT pattern: tool flyout (start/stop the tool in onToggle) ---------------
bindFlyout("#toolBtn", "#toolFlyout", {
  onToggle: (open) => {
    // e.g. create an <arcgis-slice> in #toolContainer when open, destroy it when closed
  }
});

// --- KIT pattern: hover → accent highlight + tooltip --------------------------
const tooltip = createTooltip("#tooltip");
const demoLayerView = await view.whenLayerView(demoLayer);
let highlight = null;
let pending = false;
view.on("pointer-move", async (event) => {
  if (pending) return;
  pending = true;
  try {
    const { results } = await view.hitTest(event, { include: [demoLayer] });
    const graphic = results.find((result) => result.type === "graphic")?.graphic;
    highlight?.remove();
    highlight = null;
    if (!graphic) return tooltip.hide();
    highlight = demoLayerView.highlight(graphic);
    document.getElementById("tipTitle").textContent = graphic.attributes.name;
    document.getElementById("tipValue").textContent = graphic.attributes.status;
    tooltip.show(event.native?.clientX ?? event.x, event.native?.clientY ?? event.y);
  } finally {
    pending = false;
  }
});
view.on("pointer-leave", () => {
  highlight?.remove();
  highlight = null;
  tooltip.hide();
});

// --- OPTIONAL: timeline dock ----------------------------------------------------
// Only for apps with time-based data, phases or animation. Runs when the dock in
// index.html is uncommented; delete this block if the app has no timeline.
const scrub = document.getElementById("scrub");
if (scrub) {
  const repaint = bindRange(scrub);
  // EDIT: the app's time span
  const start = new Date(2025, 0, 1);
  const end = new Date(2026, 11, 31);

  const render = (pct) => {
    const date = new Date(+start + ((end - start) * pct) / 100);
    document.getElementById("scrubLabel").textContent = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    // Apply the date to the scene here, e.g. view.timeExtent for time-aware layers.
  };
  scrub.addEventListener("input", () => render(Number(scrub.value)));
  render(Number(scrub.value));

  const playBtn = document.getElementById("playBtn");
  let timer = null;
  playBtn.addEventListener("click", () => {
    const playing = timer === null;
    playBtn.classList.toggle("is-playing", playing);
    playBtn.setAttribute("aria-pressed", String(playing));
    playBtn.querySelector(".play-btn__icon").textContent = playing ? "❚❚" : "▶";
    document.getElementById("playLabel").textContent = playing ? "Pause" : "Play";
    if (!playing) {
      clearInterval(timer);
      timer = null;
      return;
    }
    timer = setInterval(() => {
      scrub.value = String((Number(scrub.value) + 1) % 101);
      repaint();
      render(Number(scrub.value));
    }, 120);
  });
}
