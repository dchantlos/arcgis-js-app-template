// =============================================================================
// Esri Dev Showcase UI kit · v1.0 — behaviors for showcase.css
// Dependency-free ES module. Works with Core API views (SceneView/MapView) and
// with <arcgis-scene>/<arcgis-map> components. HTML passed to these helpers
// (icons, panel content) must be trusted, authored markup — never user input.
// =============================================================================

const $ = (target, root = document) =>
  typeof target === "string" ? root.querySelector(target) : target ?? null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Read a CSS custom property from :root (trimmed string). */
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Theme accent as [r, g, b] from --accent-rgb. */
export function accentRgb() {
  const parts = cssVar("--accent-rgb").split(",").map((n) => Number(n.trim()));
  return parts.length >= 3 && parts.every(Number.isFinite) ? parts.slice(0, 3) : [56, 226, 234];
}

// --- Escape key: closes only the top-most open layer --------------------------

const escapeStack = [];

/** Register a close handler for an opened layer; returns an unregister fn. */
function pushEscape(handler) {
  escapeStack.push(handler);
  return () => {
    const index = escapeStack.lastIndexOf(handler);
    if (index >= 0) escapeStack.splice(index, 1);
  };
}

// Capture phase on window so the map/scene view cannot swallow Escape first.
window.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Escape" || !escapeStack.length) return;
    e.preventDefault();
    e.stopPropagation();
    escapeStack[escapeStack.length - 1]();
  },
  true
);

// --- ?clean screenshot mode --------------------------------------------------

/**
 * Toggle `capture-clean` on <html> when the URL has ?clean. The starter page
 * also runs this inline in <head> so floating UI never flashes before paint.
 */
export function initCleanMode(param = "clean") {
  const on = new URLSearchParams(location.search).has(param);
  document.documentElement.classList.toggle("capture-clean", on);
  return on;
}

export const isCleanMode = () => document.documentElement.classList.contains("capture-clean");

// --- Boot veil -----------------------------------------------------------------

/**
 * Controls the Dev-logo loading veil. Until ready() is called, uncaught errors
 * and rejected promises are shown on the veil so failures are never silent.
 *
 * @param {{ el?: string|Element, timeoutMs?: number, slowMessage?: string }} [options]
 */
export function createBoot({
  el = "#boot",
  timeoutMs = 20000,
  slowMessage = "Still loading — open the browser console (F12) if this persists."
} = {}) {
  const veil = $(el);
  const text = veil?.querySelector(".boot__text");
  let settled = false;

  const show = (message) => {
    if (settled || !veil || veil.classList.contains("is-error")) return;
    veil.classList.add("is-error");
    if (text) text.textContent = message;
    console.error("[showcase]", message);
  };
  const onError = (e) => show(`Script error: ${e.message}`);
  const onRejection = (e) => show(`Load error: ${e.reason?.message ?? e.reason}`);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  const watchdog = setTimeout(() => {
    if (!settled && text && !veil.classList.contains("is-error")) text.textContent = slowMessage;
  }, timeoutMs);

  veil?.querySelector("[data-boot-retry]")?.addEventListener("click", () => location.reload());

  const finish = () => {
    settled = true;
    clearTimeout(watchdog);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    document.body.removeAttribute("aria-busy");
  };

  return {
    el: veil,
    /** Fade the veil out. Call once the view is ready to be seen. */
    ready() {
      if (settled) return;
      finish();
      veil?.classList.add("is-hidden");
      veil?.setAttribute("aria-hidden", "true");
    },
    /** Show a fatal error on the veil (keeps it visible, offers Reload). */
    error(message) {
      if (settled) return;
      show(message);
      finish();
    },
    /** Await a promise; reveal on success, show the error on failure. */
    async track(promise) {
      try {
        const result = await promise;
        this.ready();
        return result;
      } catch (err) {
        this.error(`Unable to load: ${err?.message ?? err}`);
        throw err;
      }
    }
  };
}

/**
 * Resolve when an ArcGIS view is worth revealing: the view is ready and, by
 * default, its first round of drawing has settled (or maxWaitMs elapsed).
 * Accepts a Core API view or an <arcgis-scene>/<arcgis-map> element.
 */
export async function whenViewReady(viewOrElement, { settle = true, maxWaitMs = 8000 } = {}) {
  let view = viewOrElement;
  if (typeof view?.viewOnReady === "function") {
    await view.viewOnReady();
    view = view.view;
  }
  await view.when();
  if (settle) {
    const start = performance.now();
    while (view.updating && performance.now() - start < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  return view;
}

/**
 * Match the view to the kit: theme-accent selection highlight (SDK 4.32+
 * `view.highlights`, falling back to `highlightOptions`) and dark attribution
 * (SDK 5.x `attributionMode`). Attribution stays visible — this only styles it.
 */
export function applyViewTheme(view, { fillOpacity = 0.18, haloOpacity = 0.95, attributionMode = "dark" } = {}) {
  const color = accentRgb();
  const highlight = view.highlights?.find?.((h) => h.name === "default");
  if (highlight) {
    highlight.color = color;
    highlight.haloOpacity = haloOpacity;
    highlight.fillOpacity = fillOpacity;
  } else if ("highlightOptions" in view) {
    view.highlightOptions = { color, haloOpacity, fillOpacity };
  }
  if (attributionMode && "attributionMode" in view) view.attributionMode = attributionMode;
}

// --- Welcome dialog -------------------------------------------------------------

/**
 * Wire the intro dialog: close via [data-welcome-close], backdrop or Esc;
 * focus the primary button; restore focus on close. Skipped in ?clean mode.
 * @param {{ el?: string|Element, rememberKey?: string, onClose?: () => void }} [options]
 *   rememberKey: show once per browser session instead of on every load.
 */
export function initWelcome({ el = "#welcome", rememberKey = null, onClose } = {}) {
  const modal = $(el);
  if (!modal) return null;
  if (isCleanMode() || (rememberKey && sessionStorage.getItem(rememberKey))) {
    modal.hidden = true;
    return null;
  }
  modal.hidden = false;
  const opener = document.activeElement;
  let release = null;

  function close() {
    if (modal.hidden || modal.classList.contains("is-closing")) return;
    modal.classList.add("is-closing");
    release?.();
    if (rememberKey) sessionStorage.setItem(rememberKey, "1");
    setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove("is-closing");
      if (opener && opener !== document.body) opener.focus?.();
      onClose?.();
    }, prefersReducedMotion() ? 0 : 260);
  }

  modal.querySelectorAll("[data-welcome-close]").forEach((node) => node.addEventListener("click", close));
  release = pushEscape(close);
  requestAnimationFrame(() => modal.querySelector("[data-welcome-primary], .welcome__btn")?.focus());
  return { close };
}

// --- Panels, flyouts, accordions, dragging --------------------------------------

/** Collapse/expand `.panel` via buttons with [data-panel-toggle]. */
export function initPanelToggles(root = document) {
  root.querySelectorAll("[data-panel-toggle]").forEach((button) => {
    const panel = button.closest(".panel");
    if (!panel || button.dataset.scBound) return;
    button.dataset.scBound = "1";
    const name = panel.getAttribute("aria-label") || "panel";
    const sync = () => {
      const collapsed = panel.classList.contains("is-collapsed");
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${name}`);
      button.textContent = collapsed ? "+" : "–";
    };
    button.addEventListener("click", () => {
      panel.classList.toggle("is-collapsed");
      sync();
    });
    sync();
  });
}

/**
 * Toggle a `.flyout` tool panel from a `.nav-btn`. Closes via its
 * [data-flyout-close] button or Esc. onToggle(open) lets the app start/stop
 * the tool (e.g. create or destroy a slice/measure component).
 */
export function bindFlyout(button, flyout, { onToggle } = {}) {
  const btn = $(button);
  const panel = $(flyout);
  if (!btn || !panel) return null;
  let release = null;
  const set = (open) => {
    if (open === panel.classList.contains("is-open")) return;
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    btn.setAttribute("aria-pressed", String(open));
    if (open) release = pushEscape(() => set(false));
    else release?.();
    onToggle?.(open);
  };
  btn.setAttribute("aria-pressed", "false");
  panel.setAttribute("aria-hidden", "true");
  btn.addEventListener("click", () => set(!panel.classList.contains("is-open")));
  panel.querySelector("[data-flyout-close]")?.addEventListener("click", () => {
    set(false);
    btn.focus();
  });
  return { open: () => set(true), close: () => set(false) };
}

/** Wire `.accordion__q` buttons inside `.accordion__item`s. */
export function initAccordions(root = document) {
  root.querySelectorAll(".accordion__q").forEach((question) => {
    const item = question.closest(".accordion__item");
    if (!item || question.dataset.scBound) return;
    question.dataset.scBound = "1";
    question.setAttribute("aria-expanded", String(item.classList.contains("is-open")));
    question.addEventListener("click", () => {
      const open = item.classList.toggle("is-open");
      question.setAttribute("aria-expanded", String(open));
    });
  });
}

/** Drag a fixed-position panel by its handle, kept inside the viewport. */
export function makeDraggable(panel, handle = panel, { ignore = "button, a, input, select, textarea" } = {}) {
  let drag = null;
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(ignore)) return;
    const rect = panel.getBoundingClientRect();
    Object.assign(panel.style, { left: `${rect.left}px`, top: `${rect.top}px`, right: "auto", bottom: "auto" });
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    panel.classList.add("is-dragging");
    handle.setPointerCapture?.(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag) return;
    panel.style.left = `${clamp(e.clientX - drag.dx, 8, innerWidth - panel.offsetWidth - 8)}px`;
    panel.style.top = `${clamp(e.clientY - drag.dy, 8, innerHeight - panel.offsetHeight - 8)}px`;
  });
  const end = (e) => {
    if (!drag) return;
    drag = null;
    panel.classList.remove("is-dragging");
    handle.releasePointerCapture?.(e.pointerId);
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

// --- Floating buttons, floating windows, modals -----------------------------------

/** The bottom-right `.fab-stack` (created on first use). */
export function ensureFabStack() {
  let stack = document.querySelector(".fab-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "fab-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

/**
 * Add a FAB to the stack that opens a draggable `.float-panel` (help, guide,
 * assistant…). Content may be a Node or trusted HTML.
 * @param {{ title: string, label?: string, icon?: string, content?: Node|string,
 *           id?: string, open?: boolean, prepend?: boolean }} options
 *   prepend: put this FAB above the existing ones (default: append below).
 */
export function createFloatPanel({ title, label = title, icon = "?", content = "", id, open = false, prepend = false }) {
  const stack = ensureFabStack();

  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "fab";
  fab.title = title;
  fab.setAttribute("aria-haspopup", "dialog");
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = `<span class="fab__icon" aria-hidden="true">${icon}</span><span class="fab__label"></span>`;
  fab.querySelector(".fab__label").textContent = label;

  const panel = document.createElement("section");
  panel.className = "float-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);
  if (id) panel.id = id;
  panel.innerHTML =
    '<header class="float-panel__head"><span class="float-panel__title"></span>' +
    '<button type="button" class="float-panel__close" aria-label="Close">✕</button></header>' +
    '<div class="float-panel__body"></div>';
  panel.querySelector(".float-panel__title").textContent = title;
  const body = panel.querySelector(".float-panel__body");
  if (typeof content === "string") body.innerHTML = content;
  else if (content) body.append(content);

  if (prepend) stack.prepend(fab);
  else stack.appendChild(fab);
  document.body.appendChild(panel);
  initAccordions(panel);

  const closeBtn = panel.querySelector(".float-panel__close");
  let release = null;
  const show = () => {
    if (panel.classList.contains("is-open")) return;
    panel.classList.add("is-open");
    fab.classList.add("is-hidden");
    fab.setAttribute("aria-expanded", "true");
    release = pushEscape(hide);
    closeBtn.focus();
  };
  function hide() {
    if (!panel.classList.contains("is-open")) return;
    panel.classList.remove("is-open");
    fab.classList.remove("is-hidden");
    fab.setAttribute("aria-expanded", "false");
    release?.();
    fab.focus();
  }
  fab.addEventListener("click", show);
  closeBtn.addEventListener("click", hide);
  makeDraggable(panel, panel.querySelector(".float-panel__head"));
  if (open) show();
  return { fab, panel, body, open: show, close: hide };
}

/**
 * Wire a `.modal` (resources, details). Closes via [data-modal-close], the
 * backdrop or Esc, and restores focus to the opener.
 * @param {string|Element} el
 * @param {{ trigger?: string|Element }} [options] element that opens the modal
 */
export function createModal(el, { trigger } = {}) {
  const modal = $(el);
  if (!modal) return null;
  const triggerEl = $(trigger);
  let lastFocus = null;
  let release = null;

  function open() {
    if (!modal.hidden) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    triggerEl?.setAttribute("aria-expanded", "true");
    release = pushEscape(close);
    requestAnimationFrame(() => modal.querySelector(".modal__close")?.focus());
  }
  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    triggerEl?.setAttribute("aria-expanded", "false");
    release?.();
    lastFocus?.focus?.();
  }
  modal.querySelectorAll("[data-modal-close]").forEach((node) => node.addEventListener("click", close));
  triggerEl?.addEventListener("click", open);
  return { el: modal, open, close };
}

// --- Dock, nav stack, tooltip ----------------------------------------------------

const rangePainters = new WeakMap();

/**
 * Paint the filled part of a `.scrub__range` via --fill. Returns a repaint
 * function to call after setting `input.value` programmatically. Safe to call
 * more than once for the same input.
 */
export function bindRange(input) {
  const range = $(input);
  if (!range) return () => {};
  if (rangePainters.has(range)) return rangePainters.get(range);
  const paint = () => {
    const min = Number(range.min || 0);
    const max = Number(range.max || 100);
    const pct = ((Number(range.value) - min) / (max - min || 1)) * 100;
    range.style.setProperty("--fill", `${clamp(pct, 0, 100)}%`);
  };
  range.addEventListener("input", paint);
  rangePainters.set(range, paint);
  paint();
  return paint;
}

/**
 * Wire `.nav-btn`s marked data-nav="zoom-in|zoom-out|home" to a view.
 * Call after the view is ready; "home" returns to the viewpoint at that moment.
 * Interrupted navigation (AbortError) is expected and ignored.
 */
export function bindNavStack(view, root = document) {
  const home = view.viewpoint?.clone?.();
  const go = (target) =>
    view.goTo(target, { duration: 700 }).catch((err) => {
      if (err?.name !== "AbortError") console.warn("[showcase] navigation failed", err);
    });
  root.querySelector('[data-nav="zoom-in"]')?.addEventListener("click", () => go({ zoom: view.zoom + 1 }));
  root.querySelector('[data-nav="zoom-out"]')?.addEventListener("click", () => go({ zoom: view.zoom - 1 }));
  root.querySelector('[data-nav="home"]')?.addEventListener("click", () => home && go(home));
}

/** Position a `.tooltip` near the pointer, kept inside the viewport. */
export function createTooltip(el) {
  const tip = $(el);
  if (!tip) return { show() {}, hide() {} };
  return {
    show(x, y) {
      const pad = 16;
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      const left = x + pad + w > innerWidth - 8 ? x - pad - w : x + pad;
      const top = y + pad + h > innerHeight - 8 ? y - pad - h : y + pad;
      tip.style.left = `${clamp(left, 8, innerWidth - w - 8)}px`;
      tip.style.top = `${clamp(top, 8, innerHeight - h - 8)}px`;
      tip.classList.add("is-visible");
      tip.setAttribute("aria-hidden", "false");
    },
    hide() {
      tip.classList.remove("is-visible");
      tip.setAttribute("aria-hidden", "true");
    }
  };
}

// --- One-call setup ----------------------------------------------------------------

/**
 * Wire every declarative kit behavior in `root`: clean mode, panel toggles,
 * accordions, and ranges marked [data-range-fill].
 */
export function initShowcase(root = document) {
  initCleanMode();
  initPanelToggles(root);
  initAccordions(root);
  root.querySelectorAll("[data-range-fill]").forEach((range) => bindRange(range));
}
