#!/usr/bin/env node
// =============================================================================
// Showcase QA screenshots: desktop, laptop, phone, welcome and ?clean shots,
// plus console errors/warnings per shot (report.json).
//
// Usage (run from the app folder):
//   node <skill folder>/scripts/screenshots.mjs <url> [outDir]
// Needs Playwright in the app (npm i -D playwright && npx playwright install chromium)
// or installed globally (npm i -g playwright).
// =============================================================================

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function loadPlaywright() {
  const bases = [process.cwd()];
  try {
    bases.push(execSync("npm root -g", { encoding: "utf8" }).trim());
  } catch {
    // npm not on PATH — the app folder is the only candidate
  }
  for (const base of bases) {
    const require = createRequire(path.join(base, "noop.js"));
    for (const name of ["playwright", "playwright-core"]) {
      try {
        return require(name);
      } catch {
        // try the next candidate
      }
    }
  }
  return null;
}

const url = process.argv[2];
const outDir = path.resolve(process.argv[3] ?? "showcase-qa");
if (!url) {
  console.error("Usage: node screenshots.mjs <url> [outDir]");
  process.exit(1);
}

const playwright = loadPlaywright();
if (!playwright) {
  console.error("Playwright not found. In the app folder run:\n  npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

const shots = [
  { name: "desktop-1440x900-welcome", width: 1440, height: 900, keepWelcome: true },
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "laptop-1024x768", width: 1024, height: 768 },
  { name: "phone-390x844", width: 390, height: 844, mobile: true },
  { name: "desktop-1440x900-clean", width: 1440, height: 900, clean: true }
];

// Headless GPU driver chatter, not app problems
const NOISE = /GL Driver Message|GPU stall due to ReadPixels/;

mkdirSync(outDir, { recursive: true });
const browser = await playwright.chromium.launch();
const report = [];

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: shot.mobile ? 2 : 1,
    isMobile: Boolean(shot.mobile),
    hasTouch: Boolean(shot.mobile),
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const issues = [];
  let ignored = 0;
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    if (NOISE.test(msg.text())) ignored++;
    else issues.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => issues.push(`pageerror: ${err.message}`));

  const target = new URL(url);
  if (shot.clean) target.searchParams.set("clean", "");
  await page.goto(target.href, { waitUntil: "load" });

  const boot = await page
    .waitForFunction(
      () => {
        const veil = document.querySelector(".boot");
        if (!veil) return "no-veil";
        if (veil.classList.contains("is-error")) return "error";
        return veil.classList.contains("is-hidden") ? "ready" : false;
      },
      null,
      { timeout: 45000 }
    )
    .then((handle) => handle.jsonValue())
    .catch(() => "timeout");

  if (!shot.keepWelcome) await page.keyboard.press("Escape");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  const file = path.join(outDir, `${shot.name}.png`);
  await page.screenshot({ path: file });
  report.push({ shot: shot.name, url: target.href, boot, file, issues, ignoredGpuMessages: ignored });
  await context.close();
}

await browser.close();
writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
for (const entry of report) {
  const ok = entry.boot === "ready" && entry.issues.length === 0;
  console.log(`${ok ? "✓" : "✗"} ${entry.shot} — boot: ${entry.boot}, console issues: ${entry.issues.length}`);
}
console.log(`Screenshots and report.json written to ${outDir}`);
