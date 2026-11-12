---
name: arcgis-js-app-template
description: 'Template for starting custom ArcGIS Maps SDK for JavaScript web apps in the Esri Developers showcase style of the construction-timelapse app: Dev logo top bar and loading screen, dark glass panels with pinned headers and thin scrolling bodies, welcome dialog, Help and Resources floating buttons, hover tooltip, layer toggles, ?clean screenshot mode, per-app color themes (cyan, seafoam) and an optional timeline dock (play button and scrubber) for time-based data. Ships a dependency-free CSS/JS kit and a starter page. Use when starting a new custom web app, demo or digital twin from a template, restyling or retrofitting an existing app to this look, adding a panel, control, dialog, floating button or timeline, theming an app, or reviewing UI consistency, accessibility and Esri attribution.'
license: Apache-2.0
argument-hint: 'new <app> | retrofit <app> | add <component> | theme <app> | review'
---

# ArcGIS JS App Template

A starting point for custom web apps built with the ArcGIS Maps SDK for JavaScript. It packages the look and behavior of the construction-timelapse reference app (<https://dchantlos.github.io/construction-timelapse/>) as a dependency-free CSS/JS kit (the `showcase/` folder each app gets) plus a starter page with every component wired. Works with CDN, ESM import-map and Vite apps, and with Core API views or `arcgis-*` components.

Not for SDK API questions (use `build-with-arcgis-maps-sdk-for-javascript` from [Esri's developer agent skills](https://github.com/Esri/esri-developer-agent-skills) if installed) or Calcite-first enterprise UIs (use `build-with-calcite-design-system`).

## Rules

### Fixed — identical in every app
1. **Brand:** Dev logo top bar (`.brand` → developers.arcgis.com, "Develop with ArcGIS" badge, Esri/Dev blues). Never re-color or replace per app.
2. **Loading:** Dev-logo boot veil; reveal only after the view has drawn (`whenViewReady`); errors are shown on the veil, never silent.
3. **Surfaces:** `.glass` panels from tokens, Inter font, `.kicker` labels, thin accent scrollbars; panel heads/feet pinned, only `.panel__body` scrolls.
4. **Floating UI:** every floating button lives in `.fab-stack`; floating windows are draggable; Esc closes only the top-most layer.
5. **Screenshots:** `?clean` hides floating chrome (inline script in `<head>`).
6. **Attribution:** the SDK's Esri attribution ("Powered by Esri" + data providers) stays visible and uncovered — an Esri requirement. Never hide `.esri-attribution`, never set `hide-attribution`, keep bottom UI above `--safe-bottom`.
7. **Accessibility:** `aria-label` on icon buttons, visible focus, full keyboard use, WCAG AA text on glass, `prefers-reduced-motion` respected.

### Themeable — per app
- Only through tokens in one `theme-*.css` loaded after `showcase.css`: palette (`--accent*`, `--bg`, glass tint, text tones, `--surface-*`), `--radius`, `--blur`. Provided: [theme-cyan.css](./assets/theme-cyan.css) (construction/AEC, default) and [theme-seafoam.css](./assets/theme-seafoam.css) (ports/water).
- Never hard-code accent colors: use `var(--accent)`, `rgba(var(--accent-rgb), a)` in CSS and `accentRgb()` for SDK symbols.

### Composition
- Reuse kit components ([patterns.md](./references/patterns.md)) before writing new UI. New components are built from `.glass` + tokens + `.kicker`/`.chip`, with the same state conventions (`.is-open`, `.is-active`, `.is-collapsed`, `.is-hidden`, `aria-*`).
- App-specific CSS goes in the app's own stylesheet after the theme. Do not edit an app's copy of `showcase.css`; improve the kit in this skill instead.
- Keep the app's SDK version and loading approach; the kit has no SDK dependency.

## Procedures

### New app
1. Confirm app name, theme, target folder, SDK delivery (CDN for single-page demos; Vite when the app needs a build) and whether the app needs a timeline (time-aware layers, phases or animation). Most apps don't; the timeline dock is off by default.
2. Copy the kit and starter into the app folder. `KIT` is the `assets/` folder next to this SKILL.md, wherever the skill is installed (for example `~/.copilot/skills/arcgis-js-app-template/assets`):
   ```bash
   KIT="<this skill's folder>/assets"
   mkdir -p showcase && cp "$KIT"/{showcase.css,showcase.js,dev-logo.png,esri-logo.png,theme-cyan.css} showcase/
   cp "$KIT/starter.html" index.html && cp "$KIT/starter.js" main.js
   ```
   Swap `theme-cyan.css` for the chosen theme in both the copy and the `<link>`.
3. Fill every `EDIT` marker in `index.html` and `main.js` (title, veil text, welcome copy, brand title, provenance, help content, resources links).
4. Replace the `DEMO` parts of `main.js` with the app's WebScene/WebMap, layers and logic; keep the `KIT` parts. For npm/Vite, replace `$arcgis.import()` with `@arcgis/core` imports.
5. Timeline: only if the app needs one, delete the two comment lines around the dock in `index.html` and connect `render()` in the `OPTIONAL` timeline block of `main.js` to the app's time-aware layers. Otherwise delete the commented dock and that block.
6. Delete components the app does not need (ring, nav stack, flyout…) instead of leaving placeholders.
7. Validate (below).

### Retrofit an existing app
Follow [retrofit.md](./references/retrofit.md): confirm scope and theme → inventory → add kit → map tokens → swap regions one at a time → remove attribution hacks and dead CSS → validate.

### Add or change a component
Find it in [patterns.md](./references/patterns.md), copy the markup from [starter.html](./assets/starter.html), wire it with the matching [showcase.js](./assets/showcase.js) helper, then check overlaps at all three sizes.

### Create a theme
Copy `theme-cyan.css` to `theme-<app>.css` inside the app's `showcase/` folder, change values only (keep every token, including each `*-rgb` triplet), check text contrast on glass over the brightest part of the scene. If the theme is reusable, add it to this skill's `assets/`.

### Review
Run [checklist.md](./references/checklist.md) against the running app.

## Validation
1. Serve the app and open it with the client's browser tools, or run `node <this skill's folder>/scripts/screenshots.mjs <url> [outDir]` from the app folder (needs Playwright; see [screenshots.mjs](./scripts/screenshots.mjs)).
2. Look at every screenshot (desktop + welcome, laptop, phone, `?clean`) and walk the checklist; `report.json` must show `boot: "ready"` and no console issues.
3. Exercise the interactions: welcome close, Help/Resources, Esc layering, panel collapse, flyout, play/scrubber (if the app has the dock), hover tooltip + highlight.
4. Report anything that could not be verified.

## Files
| File | Purpose |
|---|---|
| [assets/showcase.css](./assets/showcase.css) | Tokens, components, Calcite bridge, `?clean`, responsive, reduced motion |
| [assets/showcase.js](./assets/showcase.js) | Behaviors: boot veil, view reveal + theme, welcome, panels, flyouts, FABs, float panels, modals, scrubber, nav, tooltip |
| [assets/theme-cyan.css](./assets/theme-cyan.css), [assets/theme-seafoam.css](./assets/theme-seafoam.css) | Themes |
| [assets/starter.html](./assets/starter.html), [assets/starter.js](./assets/starter.js) | New-app template with every component wired; the timeline dock is commented out (optional) |
| [assets/dev-logo.png](./assets/dev-logo.png), [assets/esri-logo.png](./assets/esri-logo.png) | Brand assets (keep `dev-logo.png` next to `showcase.css`) |
| [references/patterns.md](./references/patterns.md) | Component catalog, SDK integration notes, JS API |
| [references/retrofit.md](./references/retrofit.md) | Step-by-step retrofit + Badouzi mapping |
| [references/checklist.md](./references/checklist.md) | QA checklist |
| [scripts/screenshots.mjs](./scripts/screenshots.mjs) | Screenshot + console QA run |

## Maintaining the kit
The source is <https://github.com/dchantlos/arcgis-js-app-template>; copies installed with `gh skill install` update with `gh skill update`. Apps hold their own copies of the kit, so improvements do not reach them automatically. Change the kit in the source repo, bump the version in the `showcase.css`/`showcase.js` headers, re-validate with the starter, publish a release, then update apps deliberately by copying the new files.
