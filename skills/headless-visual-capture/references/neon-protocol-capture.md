# Target capture recipe: neon-protocol

Verified on Pi 5 (ARM64) + headless Chromium, used by visual-loop / visual-reference-loop capture workers.

## Target facts
- Repo: /home/salt/projects/neon-protocol (git branch master)
- Runtime: `npm run serve` (python3 -m http.server 8765); smoke: `node scripts/browser-smoke.mjs`
- Tests: `npm test` (vitest run). Fresh git worktrees share `.git` but NOT `node_modules` — run `npm install --no-audit --no-fund` per worktree.
- Boot hook: `/?smoke=ronin` auto-selects the Ronin class and boots to round 1 (deterministic, no UI clicking)
- State bridge: `window.Gameplay` truthy; `canvas` present; `#hud-round` textContent === '1'
- Chromium: `CHROMIUM_BIN` or `/usr/bin/chromium`; launch args `--no-sandbox --disable-gpu`; viewport 1600x900 dsf=1

## Capture command (templates/capture-worker.mjs, env-parameterized)

Copy the template into the repo (e.g. `scripts/capture-worker.mjs`), then run with env vars:

```
ROOT=/home/salt/projects/neon-protocol \
BOOT_URL='/?smoke=ronin' \
STATE_CHECK='window.Gameplay && document.getElementById("hud-round") && document.getElementById("hud-round").textContent === "1"' \
OUT=/home/salt/projects/neon-protocol/references/visual-loop/run-2/iteration-NN/target-before.png \
node scripts/capture-worker.mjs
```

Wait ~15s (boot + 2.5s settle). Report: artifact size (>50KB coarse guard), `pageErrors` (must be `[]`), `distinctColors`, `lumaRange`, `blank:false`. Known-good run: 108,974 bytes, 132 distinct colors, luma 3.2–111.9, 0 page errors.

## Worktree convention for VL runs on this target
- Prior run: branches `vl/iteration-0X` in `/home/salt/projects/neon-protocol-worktrees/vl-iteration-0X`
- Fresh run: branches `vl2/iteration-0X` in `.../vl2-iteration-0X`; artifacts under `references/visual-loop/run-2/iteration-NN/`
- `references/` is gitignored — never commit screenshots or capture artifacts.
