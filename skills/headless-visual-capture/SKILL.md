---
name: headless-visual-capture
description: "Headless screenshots of web games/apps for visual critique."
version: 1.0.0
author: ALLMIND
license: MIT
metadata:
  hermes:
    tags: [screenshots, playwright, chromium, visual-qa, capture, headless]
---

# Headless Visual Capture

Capture a real, non-blank screenshot of a web-based game or app without a display, for visual critique loops (visual-loop / visual-reference-loop capture steps), visual QA, or regression evidence. Verified on Raspberry Pi 5 (ARM64) + headless Chromium.

## When to use

- A capture worker must produce `target-before.png` / `target-after.png` for a visual iteration loop.
- Any "does the UI actually render?" screenshot need on a headless box.
- Verifying a kiosk/static-site render without opening a window.

## The recipe (verified)

1. **Serve the target with correct content types.** The project's own `serve` may suffice, but a tiny node http server (mimic the project's existing browser-smoke script) is safest: `.html` → `text/html`, `.js`/`.mjs` → `text/javascript`. Wrong content types make module imports fail silently → blank canvas. Path-traversal guard: `resolve(root, ...)` + `startsWith(root + sep)`.
2. **Launch chromium via playwright-core with the system executable** — do NOT download full playwright browsers. Find the binary: `process.env.CHROMIUM_BIN || '/usr/bin/chromium' || '/usr/bin/chromium-browser' || '/usr/bin/google-chrome'`, pass `executablePath` to `chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] })`.
3. **Reach meaningful state, not a menu.** Prefer the app's own deterministic boot hooks (`/?smoke=ronin` in neon-protocol auto-selects the class and boots to round 1). If none exist, click through the real UI via playwright selectors.
4. **Wait for initialized gameplay state.** Poll until the runtime bridge is truthy (e.g. `window.Gameplay`), `document.querySelector('canvas')` exists, and a real state readout is correct (e.g. `#hud-round` === '1'). Then wait ~2.5s extra for haze/lighting/effects to settle before capturing.
5. **Screenshot** at a fixed viewport (1600x900 dsf=1 worked well) to `references/visual-loop/iteration-NN/target-before.png` (`mkdir -p` first).
6. **Verify non-blank** — a file existing is NOT proof of a render. Decode the PNG in-script (zlib inflate + pixel sampling): assert several distinct colors and full luma range. Threshold ~>50KB file size as a coarse guard.

## Validation facts to report

- artifact absolute path + file size
- exact runtime command (server + launch args)
- bridge/canvas/state readouts (`window.Gameplay`, canvas present, hud round, page error count)
- pixel-sample result (distinct colors, luma range, blank: false)
- note benign errors separately (e.g. favicon 404) — only pageerrors/unhandled rejections count as real failures

## Pitfalls

- **Blank/black target:** check server content types first, then asset/module transfer, then state reached — do not randomly change visuals.
- Fresh git worktrees share `.git` but NOT `node_modules` — run `npm install --no-audit --no-fund` in the worktree before capture/implement workers run.
- Headless chromium may lack the app's display assumptions — keep capture args minimal (`--no-sandbox --disable-gpu`); no `--kiosk`/Wayland flags needed for plain headless capture.
- If capture genuinely fails, report exactly what failed and what was observed — never claim a screenshot that isn't verified non-blank.

## Template

`templates/capture-worker.mjs` — parameterized capture script: serve root → boot hook → state poll → settle → screenshot → pixel verify. Copy, set ROOT/BOOT_URL/STATE_CHECK/OUT, run with `node`.

`references/neon-protocol-capture.md` — verified target recipe for the neon-protocol game (boot hook, state check, exact env-var command, worktree/artifact conventions).
