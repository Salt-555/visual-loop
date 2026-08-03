---
name: visual-tdd-patterns
description: "TDD for rendering features. Extract pure data, test those."
version: 1.1.0
metadata:
  hermes:
    tags: [tdd, testing, visual, rendering, threejs, particles, vitest]
    category: software-development
---

# TDD for Visual / Rendering Features

When the feature is visual (particles, hit flash, screen shake, blood pools) and lives in an inline HTML game engine or any rendering layer that can't run in Node (Three.js, Canvas, DOM), you still apply TDD — but with a data/rendering seam.

## The Pattern

1. **Extract pure data functions** into a separate module (`src/combat-feedback.js`). Functions return plain objects — no Three.js meshes, no DOM elements.
   - Example: `spawnBlood(pos, count)` returns `[{ x, y, z, velX, velY, velZ, size, color, life }, ...]`
   - Example: `placeBloodPool(pos, pools)` mutates a plain array of `{ x, z, radius }` objects
   - Example: `setHitFlash(enemy)`, `updateHitFlash(enemy, delta)` manage plain timer state

2. **TDD the pure module** with vitest/pytest as normal. Test shapes, ranges, colors, counts, state transitions (e.g., flash timer decay over frames).

3. **For procedural maps, add a pure scene-plan layer** before renderer wiring — e.g. `buildVisualScenePlan({ mapData, tileSize, seed })`. It converts tile coordinates into world bounds, landmark priorities, wall/occluder bounds, and deterministic prop anchors. Test map-bound containment, sign/prop caps, spawn safety, landmark roles, and wall-facing anchors here.

4. **Wire rendering separately** in index.html — consume data descriptors and create `THREE.Mesh` instances only after map construction. This wiring step is NOT TDD-able; implement directly from the plan and verify visually.

5. **Keep the seam clean**: pure modules know nothing about Three.js or DOM; rendering maps descriptors to meshes. The pure module IS the testable contract.

## Why This Works

- Pure functions are deterministic, fast, and run in Node — full TDD cycle applies
- Rendering wiring is thin (data → mesh mapping) — low risk, easy to verify visually
- Future changes only touch one side: logic changes tested automatically, visual tweaks don't break tests

## Example: Combat Feedback Module

```javascript
// src/combat-feedback.js — PURE DATA, no Three.js dependency
export function spawnBlood(pos, count) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: pos.x,
      y: pos.y + 0.3 + Math.random() * 0.6, // mid-body height offset
      z: pos.z,
      velX: (Math.random() - 0.5) * 4,   // wider horizontal spread
      velY: Math.random() * 2 + 1,       // upward arc (1-3)
      velZ: (Math.random() - 0.5) * 4,
      size: 0.08 + Math.random() * 0.06,
      color: 0x8B0000,                    // dark arterial red
      life: 0.6 + Math.random() * 0.4,    // 0.6-1.0s lifetime
    });
  }
  return particles;
}

// index.html — RENDERING LAYER, consumes data
function renderBlood(data) {
  for (const p of data) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(p.size, p.size, p.size),
      new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 1 })
    );
    m.position.set(p.x, p.y, p.z);
    scene.add(m);
    particles.push({ mesh: m, vel: new THREE.Vector3(p.velX, p.velY, p.velZ), life: p.life });
  }
}
```

## Descriptor Contract Testing (critic-approved slices)

When a visual slice ships with an exact contract (colors, opacities, geometry numbers fixed by a critic or spec), the pure descriptor module IS the contract. Test it three ways:

1. **Exact values** — assert every contract number with `toBe`: `expect(pv.bodyColor).toBe(0xdd4433)`, `expect(pv.ring.outer).toBe(0.62)`. Loose matchers (ranges on colors, etc.) let contract drift through silently.
2. **Identity reads** — assert the options actually differ from each other: `expect(optionA.bodyColor).not.toBe(optionB.bodyColor)`. Catches a descriptor that collapsed into one hardcoded option.
3. **Range sanity** — geometry/opacity bounds: `0 < ring.inner < ring.outer < 1`, opacities in `(0,1]`, emissive intensity in `(0,1)`. Catches typos like a 1.5 opacity.

Expected RED for a brand-new module is `Cannot find module '../src/x.js'` — that IS the red; don't chase it, implement the module and re-run the focused test.

### Ground decal wiring (rings, glow discs)

Flat ground markers added to a player/entity group:

- Ring: `RingGeometry(inner, outer, segments)`; glow: `CircleGeometry(radius, segments)`.
- Both need `rotation.x = -Math.PI/2` to lie flat — apply it even when the contract only says "ground disc".
- Stack with small y offsets (e.g. ring y=0.02, glow y=0.015) and `depthWrite: false` to avoid z-fighting with the floor.
- `MeshBasicMaterial` with `toneMapped: false` for UI-style markers — cheap on low-end GPUs, needs no light.
- Don't set `castShadow` on them (MeshBasic can't cast; keep them out of the shadow pass).

### Grid layout fixtures (tile maps, adjacency edges)

For modules that walk a tile grid (`grid[y][x]`, WALL=0/FLOOR=1/DOOR=2) and emit one descriptor per wall→floor adjacency edge:

- **Hand-derive one fixture cell-by-cell BEFORE writing expectations.** Grid transposition is the #1 source of false REDs: expectations with row/column swapped (`tx`↔`tz`), or n↔s / e↔w edge names swapped. When RED output looks like your expected set with coordinates or directions transposed, the module is usually RIGHT and the fixture is wrong — verify the module's semantics against the spec contract line by line before "fixing" the implementation. A common failure mode: two RED rounds burned this exact way while the module was never the problem.
- **Edge name = direction FROM the emitting tile TO the neighbor** — so a wall on the room's north row (y=0) emits `'s'` (floor below), a west-column wall (x=0) emits `'e'`. Non-wall neighbors include doors: treat any non-WALL tile as a junction.
- **Assert adjacency sets, not arrays**: build a key `` `${t.tx},${t.tz}:${t.edge}` `` and compare `new Set(trims.map(key))` to an expected Set. Order-independent, and the vitest diff prints both sets readably.
- **Guard before destructuring**: `export function f(options) { const { mapData } = options || {}; ... }`. Destructuring the argument directly crashes on `f(null)` with `Cannot destructure property 'mapData' of 'object null'`.
- Keep the neighbor sweep order fixed (n, e, s, w) so output is deterministic; assert with `expect(f(a)).toEqual(f(a))`.

### InstancedMesh for many identical descriptors (three.js r128)

When a descriptor emits dozens/hundreds of same-shape markers (wall trims, baseboards, decals), render ONE `InstancedMesh` per distinct material instead of one `Mesh` per instance — a 2-material feature costs 2 draw calls total:

- `new THREE.InstancedMesh(geometry, material, count)`; per instance reuse a single `THREE.Matrix4` with `makeRotationY(...)` + `setPosition(...)`, then `mesh.setMatrixAt(i, matrix)`.
- **Set `mesh.instanceMatrix.needsUpdate = true` after the batch** — not guaranteed by `setMatrixAt` in all r128-era builds.
- **Set `mesh.frustumCulled = false`** — r128 culls InstancedMesh via the base geometry's bounding sphere, which wrongly culls instances positioned away from the origin.
- Shared geometry/material are disposed for free if the mesh is a child of a group whose rebuild does `group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); })`.
- For flush-against-wall boxes, center the instance `(ts/2 - wallThickness/2)` inside the wall so the rest overhangs the floor; rotationY is 0 when the box's length axis already runs along the wall face, `Math.PI/2` when it needs to turn 90°.

### Baked emissive surfaces (luminance-band spec checks)

When the slice is about material presence — neon spill, glow, surface separation from the background — bake it into `MeshStandardMaterial` via `emissive` + `emissiveIntensity` instead of adding point lights. Emissive is free on low-end GPUs (no light cost, no shadow pass, no per-light count). Lock the no-new-lights constraint by re-asserting it in the same slice's tests: fixture count unchanged AND `maxDynamicPointLights` unchanged.

Then prove the surfaces actually read above the background WITHOUT rendering:

- Add a pure spec-check export to the descriptor module, e.g. `computeSurfaceBands(rig, baseRgb)`.
- Reproduce MeshStandardMaterial's additive emissive math in plain numbers: `final = base + channels(emissive) * emissiveIntensity` (emissive hex → `[r,g,b]` via `(hex>>16)&0xff, (hex>>8)&0xff, hex&0xff`).
- Convert to luminance with constant weights `0.2126R + 0.7152G + 0.0722B`, one band per surface plus a measured void/background band as a fixed constant (e.g. `VOID_LUMINANCE = 14`).
- Assert ordering invariants, not exact band values: `wall > floor + 6`, `floor > void + 5`, dark-mood caps (`wall < 45`, `floor < 30`), and hue-family checks (`b > r` per band). Exact `toEqual` on the authored surface values still catches contract drift; the band invariants catch separation collapse that exact values can't (they encode the *visual* guarantee: materials read above the void and above each other).
- Sanity-check the math by hand once before writing expectations so a false RED is caught before touching the implementation.

Renderer wiring: in `buildMap`, materials read `visualRig.surfaces.wall.emissive` / `.emissiveIntensity` directly — the rig is a module-level `let` in the same IIFE closure, so no plumbing needed. This wiring is not TDD-able; the pure band function IS the contract.

### Cross-seam luminance guards (fixture vs player anchor)

When a slice's thesis is "the player must win the frame" — the player's ground anchor must outshine the environment's practical pools — prove it WITHOUT rendering: add a pure guard export to the rig module, `fixturePeakLuminance({color, intensity}) = luminance(hex) * intensity` (constants only, no allocation: inline channel extraction and the 0.2126/0.7152/0.0722 weights rather than reusing array-allocating helpers), then assert `fixturePeakLuminance(violet) < luminance(playerGlowHex)` with the luminance math reproduced inline in the test.

Pitfall — the guard is usually FIXTURE-SPECIFIC, not "any practical pool": the critic's rationale wording may overstate. Hand-compute peak luminance for EVERY fixture before writing the expectation. Often only one fixture (e.g. a depth/ambient pool) drops below the anchor — the focal/rim practicals are SUPPOSED to outshine, so a loop over all fixtures fails by design. Also verify the OLD value would have failed: that proves the guard is meaningful (RED before the flip, GREEN after).

### Critic-approved slice handoff loop

The visual-loop iteration loop ships visual slices as scoped TDD commits. The sequence that satisfies the handoff: (1) failing vitest for the new pure module — capture the RED error text verbatim; (2) implement module + renderer wiring — capture GREEN; (3) full `npm test`; (4) `npm run smoke` (headless chromium: real class boot, bridge, canvas, error-free frames — it actually runs buildMap, so broken renderer wiring fails HERE, which pure tests can't catch); (5) `git add` ONLY the slice's files (`src/x.js`, `tests/x.test.js`, `index.html`) — verify scope with `git status --short` and `git show --name-only HEAD` before and after commit; (6) report commit hash, changed files, RED/GREEN evidence, test count, smoke result, and deviations from the contract.

## Vitest / Rolldown Parser Quirks (v4.x)

When using vitest v4.x with the rolldown backend:

- **Em-dashes in test strings** (`—` = `\xe2\x80\x94`) cause parse failure: `Expected '=>' but found '{'`. Strip non-ASCII from test files.
- **Certain single-quote patterns** in `it('...')` test names can trigger the same error. Switch to double quotes: `it("...", () => {`.
- Quick fix: `python3 -c "d=open(f,'r').read(); d=d.replace('\u2014','-'); open(f,'w').write(d)"`

## Bridge Pattern: Exposing Modules to Inline Scripts

When the rendering layer lives in an inline `<script>` tag (not a module), use a small ES module bridge to expose pure modules on `window`:

```html
<!-- index.html -->
<script type="module">
  import * as AI from './src/ai.js';
  import * as CV from './src/combat-visuals.js';
  window.AI = AI;
  window.CV = CV;
</script>
<script>
// Inline game engine — accesses pure modules via window.CV, window.AI
const projData = window.CV.createEnemyProjectile(fromPos, targetPos, damage);
</script>
```

**CRITICAL**: This requires serving over HTTP (`npx http-server -p 8080`), NOT `file://`. ES module imports fail silently on the file protocol — no console error, just a blank canvas.

### Module Bridge Readiness Gate

Module scripts execute asynchronously; a following classic inline script can call `initThree()` before `window.AI` / `window.CV` exists. Gate engine startup on a bridge-ready event instead of assuming script order:

```html
<script type="module">
  import * as AI from './src/ai.js';
  import * as CV from './src/combat-visuals.js';
  window.AI = AI;
  window.CV = CV;
  window.dispatchEvent(new Event('module-bridge-ready'));
</script>
<script>
  function startGame() { initThree(); setupInput(); gameLoop(); }
  if (window.AI && window.CV) startGame();
  else window.addEventListener('module-bridge-ready', startGame, { once: true });
</script>
```

When browser verification shows a black canvas, first distinguish a scene problem from a dead server: confirm module resources have nonzero transfer sizes and that required `window` bridge objects are present before changing lighting/camera code.

**Dual codebase trap**: If `index.html` contains inlined copies of functions that also exist as modules (e.g., an inline `generateMap()` alongside `src/mapgen.js`), changes to the module do NOT propagate to the inline copy. This causes silent divergence — tests pass against the module but runtime fails because the stale inline version is what actually runs. Detect with: `grep -rn 'function generateMap' . --include='*.html' --include='*.js'`. Fix by either eliminating inline duplicates or synchronizing both copies on every change.

## Scene-Dependent Decoration Lifecycle

Generated-map decor must be treated as map-owned rather than scene-global. A deterministic descriptor is still wrong if it is rendered before map bounds exist.

1. Keep palette/layout calculations in pure `src/` modules and test them normally.
2. Build the map first, including its tile size and world bounds.
3. Convert descriptor coordinates against that generated map only after construction.
4. Place lights, signage, and haze in one dedicated decoration group or tracked array.
5. Before each round/map rebuild, remove and dispose old decor resources, then recreate them.

Do not instantiate map-dependent practical lights or prop layouts in generic scene initialization at arbitrary coordinates. They illuminate empty world space, drift on larger rounds, and accumulate across rebuilds.

For low-end GPUs, make the performance contract explicit: cap light/decoration counts, share static geometry/materials, and set version-sensitive renderer parameters explicitly (for example `PointLight` decay) instead of trusting defaults. A point-light cap is whole-scene policy: audit every `new THREE.PointLight`, including transient muzzle flashes, hits, and effects. If the environment owns the complete budget, use `MeshBasicMaterial` muzzle glows, particles, and tracers for combat feedback instead of temporary point lights; encode a zero transient-light allowance in the pure lighting descriptor and test it. Avoid composer, bloom, render targets, per-prop lights, and dynamic texture work unless profiling proves the budget.

## Browser Verification Gate

A class-select overlay only proves the DOM loaded. To verify a rendering change, serve over HTTP, confirm required module-bridge objects exist, select into gameplay, and inspect the rendered canvas. If the canvas is black, first distinguish a dead/stale local server from a scene failure: confirm module resource requests transferred bytes and bridge globals are present before changing lighting or camera code.

## When NOT to Use This Pattern

- If the feature has NO visual component (pure logic), just TDD it directly
- If the rendering IS the logic (e.g., shader code), use integration tests or visual regression tools instead
- For throwaway prototypes, skip the extraction — inline is fine
