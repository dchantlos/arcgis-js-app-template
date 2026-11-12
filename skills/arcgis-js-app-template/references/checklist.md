# Showcase QA checklist

Run after building or changing UI. Use the client's browser tools if available, otherwise:

```bash
# from the app folder, with the app running; <skill> is where this skill is installed
node <skill>/scripts/screenshots.mjs http://localhost:5173/ showcase-qa
```

It captures desktop (with and without the welcome dialog), laptop, phone and `?clean` shots plus `report.json` (veil state and console errors/warnings per shot). Review every screenshot; a green report alone is not enough.

## Brand
- [ ] Dev logo + "Develop with ArcGIS" in the top bar, linking to developers.arcgis.com in a new tab.
- [ ] Loading veil shows the Dev logo pulse; welcome dialog shows the Esri logo and "Made with the ArcGIS Maps SDK for JavaScript".
- [ ] Inter is the active font (`document.fonts.check('600 13px Inter')`).

## Loading
- [ ] Veil stays until the scene has drawn, then fades (no half-loaded flash).
- [ ] A forced failure (bad item ID) shows the error on the veil with a Reload button.

## Layout + scrolling
- [ ] Panel heads/foots stay pinned; only `.panel__body` scrolls, with the thin accent scrollbar.
- [ ] Nothing overlaps at 1440×900, 1024×768 and 390×844: top bar, panels, nav stack, dock (if any), FAB stack, attribution.
- [ ] A timeline dock only if the app has time-based data, phases or animation; without one, the FAB stack and phone panel sit at the bottom with no gap.
- [ ] Every surface uses `.glass` (or the dock's own glass); no stray default-styled widgets.

## Theme
- [ ] Exactly one theme file loaded, after `showcase.css`.
- [ ] No hard-coded accent colors in app CSS/JS (`rgba(var(--accent-rgb), a)`, `accentRgb()` for symbols).
- [ ] Highlight color and Calcite brand color follow the theme accent.

## Interaction + accessibility
- [ ] Every icon-only button has `aria-label` (and `title`); toggles use `aria-pressed`/`aria-expanded`.
- [ ] Keyboard: Tab reaches all controls with a visible focus ring; Enter/Space activate.
- [ ] Esc closes only the top-most layer (welcome → modal → float panel → flyout); focus returns to the opener.
- [ ] Body text meets WCAG AA on glass over bright scenery.
- [ ] `prefers-reduced-motion` stops pulses, glows and dialog animations.

## SDK + attribution
- [ ] Esri attribution strip ("Powered by Esri" + data providers) is visible and uncovered in every shot, including `?clean`.
- [ ] Default SDK UI removed or replaced by kit controls; no deprecated-widget warnings introduced by the UI work.
- [ ] Console has no errors; dev-server-only errors are re-checked in a production build.

## Screenshot mode
- [ ] `?clean` hides the welcome dialog, FABs, floating windows and tooltips; keeps scene, top bar, panels, dock and attribution.
- [ ] Anything else that should not appear in marketing shots has `data-capture="hide"`.
