# Target capture recipe (fill-in template)

Copy this file, rename it to `<your-target>-capture.md`, and fill in every
field with your target's real values. Used by visual-loop / visual-reference-loop
capture workers.

## Target facts

- Repo: <absolute path or URL> (git branch <branch>)
- Runtime: <serve command, e.g. `npm run serve`>; smoke: <smoke script, if any>
- Tests: <test command, e.g. `npm test`>. Fresh git worktrees share `.git` but
  NOT `node_modules` — run `npm install --no-audit --no-fund` per worktree.
- Boot hook: <URL param or route that deterministically boots to a meaningful
  state, e.g. `/?smoke=1` — no UI clicking>
- State bridge: <JS expressions that prove real state: a runtime bridge global
  truthy, `canvas` present, and a HUD/state readout at its expected value>
- Chromium: `CHROMIUM_BIN` or `/usr/bin/chromium`; launch args
  `--no-sandbox --disable-gpu`; viewport 1600x900 dsf=1

## Capture command (templates/capture-worker.mjs, env-parameterized)

Copy the template into the repo (e.g. `scripts/capture-worker.mjs`), then run
with env vars:

```
ROOT=/path/to/your-target \
BOOT_URL='/?smoke=1' \
STATE_CHECK='window.Gameplay && document.getElementById("hud-round") && document.getElementById("hud-round").textContent === "1"' \
OUT=/path/to/your-target/references/visual-loop/iteration-NN/target-before.png \
node scripts/capture-worker.mjs
```

Wait ~15s (boot + 2.5s settle). Report: artifact size (>50KB coarse guard),
`pageErrors` (must be `[]`), `distinctColors`, `lumaRange`, `blank:false`.
Record a known-good run's numbers here so later runs can be compared:
<known-good: size, distinct colors, luma range, page errors>

## Worktree / artifact conventions for VL runs

- Branches `vl/iteration-0X` in `<target>-worktrees/vl-iteration-0X`
- Artifacts under `references/visual-loop/iteration-NN/`
- `references/` is gitignored — never commit screenshots or capture artifacts.
