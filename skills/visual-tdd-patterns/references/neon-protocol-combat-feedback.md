# Neon Protocol — Combat Feedback & Visual TDD Session Notes

## Phase 1: Combat Feedback Extraction (2026-07-27)

Extracted combat feedback logic from inline `index.html` Three.js game engine into testable `src/combat-feedback.js`, then wired rendering back into the HTML.

### Module: `src/combat-feedback.js`

Pure data functions, no Three.js dependency:
- `spawnBlood(pos, count)` — blood particle descriptors with dark red color (0x8B0000), mid-body height offset, wider spread than regular particles
- `placeBloodPool(pos, existingPools)` — persistent floor stains with merging logic and max radius cap (0.6)
- `clearBloodPools(pools)` — cleanup between rounds
- `setHitFlash(enemy)` / `updateHitFlash(enemy, delta)` — 150ms white emissive flash timer with decay
- `spawnWallSparks(pos, count=3)` — yellow-white spark particles (0xffffaa) for bullet-wall impact
- `spawnKillPools(pos, count=3)` — scattered blood pool cluster where enemies die

### Tests: `tests/combat-feedback.test.js`

32 tests covering all functions. Went from 43 total tests to 75 with zero regressions.

## Phase 2: Combat Visuals (2026-07-28)

Extended the pure-data pattern to enemy combat visuals — projectiles, muzzle flash, gun arms, bullet trails.

### Module: `src/combat-visuals.js`

4 pure functions, no Three.js:
- `createEnemyProjectile(fromPos, targetPos, damage)` → `{ x, z, dir, speed, life, damage, muzzleFlash }`
  - Normalized direction vector, default 15 damage, 18 units/s speed, 2.5s lifetime
  - Includes muzzle flash data (position offset in fire direction)
- `updateProjectile(proj, delta)` → mutates proj position, decrements life, returns `{ expired }`
- `createMuzzleFlash(muzzlePos, fireDir)` → `{ x, y, z, color, intensity, radius, duration }`
  - Warm yellow (0xffcc44), short duration (60ms)
- `createBulletTrail(start, end)` → `{ start, end, length, life, color }`
  - Calculates segment length via distance formula, 0.3s fade lifetime

### Tests: `tests/combat-visuals.test.js`

23 tests covering direction normalization, speed ranges, lifetime decay, collision distance, trail length calculation (including zero-length edge case). Total project tests: 127 across 7 files.

### Rendering Wiring in index.html

**Enemy bullets**: Red spheres (`0xff4422`) at 18 units/s with slight inaccuracy (+/-0.04 direction jitter). Wall spark particles on impact (orange `0xff6644`). Hit detection against player body radius (0.7u) and tile walkability.

**Player gun arm**: Barrel + grip + muzzle glow tip mesh group attached to right side of player body. Recoil animation: kick back 0.12u on fire, smooth linear recovery over 80ms via `gunRecoilTimer` in update loop. Muzzle glow flashes white-yellow (60ms) per shot.

**Enemy gun arms**: Barrel + muzzle glow tip mesh group. Per-shot recoil (kick back 0.08u, return after 60ms). Orange muzzle flash light (`0xff6644`) on fire.

**Bullet trails**: Yellow cylinders (`0xffcc44`, radius 0.015) between previous and current bullet positions each frame. Fade via particle system (opacity = remaining life). Minimum segment length filter (0.1u) prevents micro-trails.

### Bridge Pattern

```html
<script type="module">
  import * as AI from './src/ai.js';
  import * as CV from './src/combat-visuals.js';
  window.AI = AI;
  window.CV = CV;
</script>
```

Inline game engine accesses pure modules via `window.CV.createEnemyProjectile(...)`.

## Dual Codebase Trap (2026-07-28)

**Symptom**: Black screen when opening index.html. UI elements render, 3D scene is black. No console errors.

**Root cause**: `index.html` had an inlined copy of `generateMap()` that did NOT include the `waypoints` property added to `src/mapgen.js`. When enemies spawned with `new EnemyAI({ waypoints: mapData.waypoints })`, `mapData.waypoints` was `undefined`, causing silent failure during enemy creation.

**Fix**: Added nearest-neighbor waypoint generation to the inlined `generateMap()` inside `index.html` to match the module version.

**Detection**: Search for function names that exist both inline and as modules:
```bash
grep -rn 'function generateMap' . --include='*.html' --include='*.js'
```

## ES Module Serving Requirement (2026-07-28)

`<script type="module">` with relative imports (`import * as X from './src/x.js'`) fails silently over `file://` protocol. Browsers block cross-origin module loading for CORS. The page renders UI but the 3D scene is black because the game loop never starts (the inline script depends on modules that didn't load).

**Fix**: Serve via HTTP:
```bash
cd /home/salt/projects/neon-protocol && npx -y http-server -p 8080 -c-1
# Open http://localhost:8080
```

## Parser Issues (Vitest v4.x with rolldown)

Em-dashes (`—`) and certain single-quote patterns in test names cause `Expected '=>' but found '{'` parse errors. Fix: use double quotes for `it("...")` and strip non-ASCII from test files.
