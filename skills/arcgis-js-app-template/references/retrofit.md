# Retrofitting an existing app

Goal: an existing app gets the showcase look and behavior **without** changing its SDK version, SDK loading, data or app-specific features. Work in small steps and keep the app running after each one.

## 0. Confirm before editing

- Which theme: an existing `theme-*.css`, or a new `theme-<app>.css` derived from the app's current palette.
- Scope: full retrofit, or specific parts (e.g. "just the loader and scrollbars").
- Whether the app should get the welcome dialog and help/resources FABs (most showcase apps do).
- Work on a branch; do not touch sibling projects.

## 1. Inventory the current UI

Read the app's HTML/CSS/JS and list:

| Region | Look for |
|---|---|
| Loading | overlays, spinners, `hidden`/`is-hidden` toggles, where they are dismissed |
| Brand/header | logo, title, links, status text |
| Panels | side/bottom panels, their scroll containers, collapse buttons |
| Controls | zoom/home/tool buttons, sliders, playback, toggles |
| Floating | help/info/resources buttons, chat/assistant windows, their positioning |
| Dialogs | intro/about/resources modals |
| SDK UI | `ui.components`, CSS that hides `.esri-*` elements, restyled widgets, deprecated widgets in the console |
| Tokens | `:root` variables, hard-coded colors (`rgba(…)`, hex), fonts |

Grep for class-name collisions with the kit before linking it: `.panel`, `.chip`, `.metric(s)`, `.dock`, `.fab`, `.tooltip`, `.modal`, `.welcome`, `.boot`, `.brand`, `.topbar`, `.kicker`, `.switch`, `.ring`. Rename or scope the app's classes that collide.

## 2. Add the kit

1. Copy `showcase.css`, `showcase.js`, the chosen `theme-*.css`, `dev-logo.png`, `esri-logo.png` into a `showcase/` folder (next to `index.html` for static apps; next to the entry module for Vite apps).
2. Load order: SDK CSS → `showcase.css` → theme → the app's own CSS.
3. Add the `?clean` inline script to `<head>` and Inter (Google Fonts link, or self-hosted for offline kiosks).
4. Run the app — nothing should break yet. Fix collisions found here.

## 3. Map tokens → theme

- Map the app's variables to kit tokens (`--glass`, `--glass-strong`, `--glass-border`, `--text*`, `--accent*`, `--danger`, `--radius`, `--blur`, `--surface-*`). Every `--*-rgb` token needs an `r, g, b` triplet.
- Replace hard-coded accent colors in app CSS with `var(--accent)` / `rgba(var(--accent-rgb), a)`; in JS symbols use `accentRgb()`.
- Keep body text at WCAG AA on glass: lift dim text colors if needed rather than dimming the glass.

## 4. Swap the regions (one at a time, verify after each)

1. **Loader → boot veil.** Replace the overlay with `#boot.boot` markup; call `createBoot()` at startup and `await boot.track(whenViewReady(view))` where the old overlay was dismissed. Delete the old overlay CSS/JS afterwards.
2. **Header → top bar.** `.topbar.glass` with the Dev logo `.brand`; app title in `.brand__title`; status in `.topbar__status`.
3. **Panels → `.panel`.** Wrap content as `__head` / `__body` / `__foot`; move scrolling to `.panel__body`; replace custom collapse buttons with `[data-panel-toggle]`. Rebuild cards with `.metric`, `.chip`, `.kicker`, `.ring-card`, `.toggle-list`.
4. **Controls.** Default SDK zoom/compass → `.nav-stack` + `bindNavStack(view)`; tool panels → `.flyout` + `bindFlyout()`. Replace deprecated widgets with components while moving them (coordinate with the `build-with-arcgis-maps-sdk-for-javascript` skill if installed).
5. **Bottom controls → `.dock`** (play + scrubber) when the app has a timeline or animation.
6. **Floating buttons → `.fab-stack`.** Remove per-button `bottom`/`right` offsets; use `createFloatPanel()` for help/assistant windows and `createModal()` for resources.
7. **Welcome dialog** (if in scope) and `applyViewTheme(view)`.

## 5. Compliance + cleanup

- Remove any CSS/JS that hides or covers the Esri attribution (`.esri-attribution { display: none }`, `hide-attribution`, overlapping bottom UI). This is required, not cosmetic.
- Delete now-unused CSS and duplicated scrollbar/drag/FAB code. Keep genuinely app-specific styles.
- Run the [checklist](./checklist.md) and the screenshot script; compare side by side with construction-timelapse.

## Worked example: Badouzi (Vite, @arcgis/core 5.1, seafoam)

| Badouzi today | Kit replacement |
|---|---|
| `--glass-bg`, `--glass-bg-strong`, `--accent-glow`, `--coral` | `--glass`, `--glass-strong`, `rgba(var(--accent-rgb), .5)`, `--danger` via `theme-seafoam.css` |
| `#loadingOverlay` + `.loader-ring` + `.hidden` | `#boot.boot` + `createBoot()` + `whenViewReady(view)` |
| `.brand-mark` + "Badouzi Port / Taiwan · Keelung" | `.brand` with Dev logo; "Badouzi Port" in `.brand__title`; "Taiwan · Keelung" in `.topbar__status` |
| `.esri-attribution { display: none !important }` | **Delete** — attribution must stay visible |
| `ui: { components: ["zoom"] }` + restyled `.esri-widget--button` | `ui: { components: [] }` + `.nav-stack` (zoom in/out/home) |
| Slice + Measurement widgets (deprecated) in "Tools" | `arcgis-slice` / measurement components in `.flyout`s |
| Weather, Data layers, Tools, Asset exposure cards | `.panel` sections with `.kicker`, `.metric`, `.chip`, `.toggle-list` |
| Scenario buttons (0m–3m) | Keep as app-specific, restyled with kit tokens (`.btn-ghost`/`.chip` look) |
| Default browser scrollbars | `.panel__body` / `.scroll-thin` |
| "Powered by Esri" badge | Optional `.esri-badge` inside `.fab-stack` (in addition to the SDK attribution) |
