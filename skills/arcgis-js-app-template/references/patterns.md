# Component patterns

Every component below is already wired in [starter.html](../assets/starter.html) and [starter.js](../assets/starter.js) — copy markup from there. Optional parts (the timeline dock, a second-page tab) are commented out in starter.html. This file lists the classes, the JS helper that drives each component, and the rules that keep apps consistent.

## Page skeleton (z-order, bottom → top)

| Layer | Element | Notes |
|---|---|---|
| View | `#viewDiv.vignette` or `<arcgis-scene class="sc-view vignette">` | Full-bleed. Vignette is optional. |
| Chrome | `.topbar`, `.panel--left`, `.panel--right`, `.nav-stack`, `.flyout`, `.dock` (optional) | `position: absolute`, always add `.glass` (except `.dock`, which has its own lighter glass). |
| Pop-ups | `.tooltip` | Follows the pointer (`createTooltip`). |
| Floating | `.fab-stack` › `.fab`, `.float-panel` | Bottom-right, above the attribution strip. |
| Veil | `#boot.boot` | Covers everything until the view is ready. |
| Dialogs | `#welcome.welcome`, `.modal` | Welcome sits **above** the veil so visitors read it while the scene loads. |

## Brand: top bar

- `.topbar.glass` › `.brand` (link to `https://developers.arcgis.com/`, `target="_blank" rel="noopener noreferrer"`) › `.brand__logo-wrap` (`.brand__logo` = `dev-logo.png` + `.brand__glow`) + `.brand__text` (`.brand__badge` "Develop with <span class=brand__accent>ArcGIS</span>" + `.brand__title` app name).
- Optional `.topbar__nav` › `.tab-link` (icon + `.tab-link__label`) to switch between pages of the same app; label hides on phones.
- Optional `.topbar__status` for one short status or location string (e.g. "Taiwan · Keelung"); not in the starter. Add `.dot.dot--live` only when the data really is live. Hidden on phones.
- Never replace the Dev logo, the "Develop with ArcGIS" badge or its colors per app — they are brand constants.

## Loading veil

- Markup: `#boot.boot` › `.boot__mark` (`.boot__pulse` + `img.boot__logo`), `.boot__text` (+ `.boot__dots`), `button.btn-glow.boot__retry[data-boot-retry]`.
- JS: `const boot = createBoot()` as early as possible, then `await boot.track(whenViewReady(view))` (or `boot.ready()` / `boot.error(msg)` manually).
- `whenViewReady` waits for `view.when()` **and** the first drawing pass (`view.updating === false`, capped at 8 s) so the veil never reveals a half-drawn scene. Pass `{ settle: false }` to reveal sooner.
- Errors before `ready()` (uncaught or rejected) are printed on the veil with a Reload button. A slow load (20 s) shows a hint without turning red.
- The pulse mask loads `./dev-logo.png` **relative to showcase.css** — keep the logo next to the CSS.

## Panels (pinned head, scrolling body)

```html
<aside class="panel panel--left glass" aria-label="Dashboard">
  <div class="panel__head"><h2 class="panel__title">Overview</h2><span class="chip">…</span></div>
  <div class="panel__body"> … sections … </div>
  <footer class="panel__foot"> … provenance … </footer>
</aside>
```

- Only `.panel__body` scrolls (thin accent scrollbar, `overscroll-behavior: contain`). Head and foot stay pinned. Never make the whole panel scroll.
- `.panel--left` (368 px dashboard) and `.panel--right` (216 px list). On phones the left panel becomes full width (40 vh) and one right panel moves to the bottom (above the dock, if there is one).
- With a `.nav-stack`, the right panel is capped to end above it; set `--nav-stack-h` if the stack has more than 4 buttons.
- Collapse: add `button.panel-collapse[data-panel-toggle]` in the head; `initShowcase()` wires it (`+`/`–`, `aria-expanded`). Start collapsed with `.is-collapsed`.
- Content primitives: `.panel__section` (+ `.panel__section-head`), `.kicker` (section label), `.panel__note` (help text), `.chip` / `.chip--sm` / `.chip--danger`, `.accent-text`, `.btn-ghost` ("Reset").
- Dashboard primitives: `.metrics` › `.metric` (`.kicker` + `strong`, add `.is-bad` for warnings); `.ring-card` › `.ring` (set `--pct` 0–100 via `style.setProperty("--pct", n)`) + `.ring-card__meta`.
- Layer toggles: `ul.toggle-list` › `li.toggle-row` › `.toggle-name` + `label.switch` › `input[type=checkbox]` + `.track`. Give each input an `aria-label`. See `renderLayerToggles()` in starter.js.
- Any other scroll container: add `.scroll-thin`.

## Nav stack + tool flyout

- `.nav-stack.glass[role=toolbar]` › `button.nav-btn` with `aria-label` + `title`. `bindNavStack(view)` wires `data-nav="zoom-in|zoom-out|home"` (home = viewpoint when bound). Interrupted `goTo` (AbortError) is ignored by design.
- Tool toggles use `aria-pressed`; `.flyout.glass` (head + `.flyout__hint` + `.flyout__widget`) opens beside the stack: `bindFlyout(button, flyout, { onToggle(open) { … } })`. Create the SDK tool in `onToggle(true)` and destroy it in `onToggle(false)`.
- Host SDK tools as **components** (`arcgis-slice`, measurement components) — widgets are deprecated in 5.x. `.flyout .esri-widget` is made transparent so legacy widgets blend in.
- Remove default view UI (`ui: { components: [] }` or component attributes) and use the nav stack instead. Hidden on phones (pinch/drag instead).

## Timeline dock (optional)

- Only for apps with time-based data, phases or animation; most apps don't need it. It is commented out in starter.html: delete the two comment lines around it and the `OPTIONAL` timeline block in starter.js wires it (the block does nothing when the dock is absent).
- `footer.dock` › `button.play-btn` (`.play-btn__icon` + label; toggle `.is-playing` + `aria-pressed`) + `.scrub` › `.scrub__label` + `input.scrub__range[type=range][data-range-fill]`.
- The filled track is CSS (`--fill`). After changing `input.value` in code, call the repaint function returned by `bindRange(input)`.
- If an SDK TimeSlider drives time-aware layers headlessly, keep its container hidden and drive it from the scrubber (construction-timelapse pattern).
- With a dock, the FAB stack (below 900 px) and the phone right panel lift above it automatically (`body:has(.dock)`); without one they sit on `--safe-bottom`.

## Floating buttons, help window, resources modal

- `.fab-stack` (bottom-right) holds every floating button; never position FABs individually. Order = DOM order (top → bottom). Below 900 px it lifts above the dock when there is one.
- Help/guide/assistant: `createFloatPanel({ title, label, icon, content, prepend })` adds a `.fab` and a draggable `.float-panel` (Esc closes, focus returns to the FAB). Use `.accordion__item` › `button.accordion__q` (+ `.accordion__chev`) + `.accordion__a` for Q&A content.
- Resources: static `.fab#resourcesFab` + `.modal#resources[hidden]` › `.modal__panel` (head with `.modal__icon`, `.modal__titles`, `.modal__close[data-modal-close]`) › `.modal__group` › `a.link-card` (`.link-card__badge`, `__body`, `__title`, `__desc`, `svg.link-card__arrow`). Wire with `createModal("#resources", { trigger: "#resourcesFab" })`.
- Optional `a.esri-badge.glass` ("Powered by Esri") goes last inside `.fab-stack`. It does **not** replace the SDK attribution.

## Welcome dialog

- `#welcome.welcome[role=dialog][aria-modal=true]` › `.welcome__backdrop[data-welcome-close]` + `.welcome__panel.glass` › `.welcome__badge`, `h1.welcome__title`, `.welcome__made` ("Made with the **ArcGIS Maps SDK for JavaScript**"), `.welcome__desc`, `button.welcome__btn[data-welcome-close][data-welcome-primary]`, `img.welcome__esri` (`esri-logo.png`, 140 px).
- `initWelcome()` focuses the primary button, closes on backdrop/button/Esc and is skipped in `?clean` mode. `initWelcome({ rememberKey: "app-welcome" })` shows it once per session instead of every load.

## Tooltip + highlight

- `.tooltip.glass#tooltip[role=tooltip]` › `.tooltip__tag`, `h3.tooltip__title`, `.tooltip__row` (label + `strong`, `.tooltip__status` for a good-state value).
- `createTooltip("#tooltip").show(clientX, clientY)` / `.hide()`. Pair with `layerView.highlight(graphic)`; `applyViewTheme(view)` makes the default highlight use the theme accent (SDK `view.highlights`).
- Throttle `hitTest` on `pointer-move` (one in flight at a time) — see starter.js.

## ?clean screenshot mode

- `?clean` adds `.capture-clean` to `<html>` (inline script in `<head>` so nothing flashes). It hides the welcome dialog, FABs, floating windows and tooltips; keeps the scene, top bar, panels, dock and attribution.
- Hide anything else in screenshots with `data-capture="hide"`.

## SDK integration notes

- **Delivery:** keep the app's existing SDK setup (CDN script, ESM import map, or npm/Vite). The kit has no SDK dependency.
  - CDN: `const [SceneView] = await $arcgis.import(["@arcgis/core/views/SceneView.js"])`.
  - npm/Vite: `import SceneView from "@arcgis/core/views/SceneView.js"`.
  - Components: `<arcgis-scene>` → `await whenViewReady(sceneElement)` (uses `viewOnReady()`), then `sceneElement.view`.
- **Where the kit lives:** a `showcase/` folder next to the page (static/CDN apps) or next to the entry module (Vite: `src/showcase/` or the root). Vite apps may `import "./showcase/showcase.css"` from the entry module instead of `<link>`.
- **Core CSS:** Core API views (SceneView/MapView) still need the SDK theme CSS (`…/esri/themes/dark/main.css`); component-only apps do not.
- **View look:** `applyViewTheme(view)` (accent highlight + `attributionMode: "dark"`), `qualityProfile: "high"`, atmosphere + stars, virtual lighting with shadows for 3D.
- **Attribution:** never hide `.esri-attribution`, never set `hide-attribution`, never cover the bottom strip. `--safe-bottom` keeps bottom UI above it.
- **Calcite / map components:** `showcase.css` sets `color-scheme: dark` and maps `--calcite-color-*` + `--calcite-font-family` to kit tokens, so Calcite and `arcgis-*` components follow the theme. Prefer kit classes for the signature chrome (top bar, veil, dock, FABs); Calcite is fine for forms and dense controls inside panels.

## JS API (showcase.js)

| Function | Purpose |
|---|---|
| `initShowcase(root?)` | Clean mode + panel toggles + accordions + `[data-range-fill]` ranges |
| `createBoot({ el, timeoutMs, slowMessage })` | Veil controller → `{ ready, error, track(promise) }` |
| `whenViewReady(viewOrElement, { settle, maxWaitMs })` | Ready + first draw settled; returns the view |
| `applyViewTheme(view, { fillOpacity, haloOpacity, attributionMode })` | Accent highlight, dark attribution |
| `initWelcome({ el, rememberKey, onClose })` | Intro dialog behavior |
| `createFloatPanel({ title, label, icon, content, id, open, prepend })` | FAB + draggable window → `{ fab, panel, body, open, close }` |
| `createModal(el, { trigger })` | Modal behavior → `{ el, open, close }` |
| `bindFlyout(button, flyout, { onToggle })` | Tool flyout → `{ open, close }` |
| `bindNavStack(view, root?)` | Zoom/home buttons |
| `bindRange(input)` | Scrubber fill → repaint function |
| `createTooltip(el)` | `{ show(x, y), hide() }` |
| `initPanelToggles`, `initAccordions`, `makeDraggable`, `ensureFabStack` | Lower-level helpers |
| `accentRgb()`, `cssVar(name)`, `isCleanMode()`, `prefersReducedMotion()` | Utilities (use `accentRgb()` for symbol colors) |

Escape always closes only the top-most open layer (welcome → modal → float panel → flyout), in capture phase so the view cannot swallow it.
