# neon-protocol iteration-03: Baked Neon Spill

Slice: bake neon into wall/floor materials instead of adding lights (no-new-lights invariant, Pi budget).

## Contract (critic-approved)

- `surfaces.floor` = `{ emissive: 0x101a36, emissiveIntensity: 0.45 }`
- `surfaces.wall` = `{ emissive: 0x1c2754, emissiveIntensity: 0.55 }`
- Base RGBs (surface albedo tone): wall `[9,10,20]`, floor `[9,11,21]`
- Void/background band measured at luminance 14
- No new lights: fixtures stay 4, `maxDynamicPointLights` stays 4

## Pure spec check (src/visual-rig.js)

```js
const VOID_LUMINANCE = 14;
function channelsFromHex(hex) { return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff]; }
function luminance(rgb) { return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; }
// final = base + emissive * intensity  (MeshStandardMaterial additive math, no Three.js)
export function computeSurfaceBands(rig, baseRgb = { wall: [9,10,20], floor: [9,11,21] }) {
  const band = (surface, base) => {
    const e = channelsFromHex(rig.surfaces[surface].emissive);
    const k = rig.surfaces[surface].emissiveIntensity;
    return luminance([base[0] + e[0]*k, base[1] + e[1]*k, base[2] + e[2]*k]);
  };
  return { void: VOID_LUMINANCE, floor: band('floor', baseRgb.floor), wall: band('wall', baseRgb.wall) };
}
```

## Hand-derived bands (sanity before expectations)

- floor: `[9,11,21] + [16,26,54]*0.45 = [16.2, 22.7, 45.3]` → lum ≈ **22.95**
- wall: `[9,10,20] + [28,39,84]*0.55 = [24.4, 31.45, 66.2]` → lum ≈ **32.46**
- void: **14**

Invariants: wall 32.46 > floor 22.95 + 6 ✓ · floor 22.95 > 14 + 5 ✓ · wall < 45 ✓ · floor < 30 ✓ · b > r both bands ✓

## Test assertions (tests/visual-rig.test.js)

1. `expect(rig.surfaces).toEqual({ floor: {...}, wall: {...} })` — exact contract values
2. `computeSurfaceBands(rig)`: `void === 14`, `wall > floor + 6`, `floor > void + 5`, `wall < 45`, `floor < 30`, and per-band `b > r` (recompute final channels in the test from `rig.surfaces` + base RGBs)
3. No-new-lights re-assert: `fixtures.length === 4`, `performance.maxDynamicPointLights === 4`

## RED evidence (before implementation)

```
FAIL tests/visual-rig.test.js > baked neon spill ... > expect(rig.surfaces).toEqual(...)  (undefined)
FAIL ... > computeSurfaceBands separates wall/floor bands from the void
TypeError: computeSurfaceBands is not a function
Test Files  1 failed (1)   Tests  2 failed | 6 passed (8)
```

## GREEN + gates

- focused: `Tests 8 passed (8)`
- full suite: `Tests 168 passed (168)` — 14 files
- smoke (`node scripts/browser-smoke.mjs`): `Browser smoke passed: real class boot, bridge, canvas, stable state, and error-free frames.` — smoke actually runs buildMap, so broken material wiring fails here, not in pure tests

## Wiring (index.html buildMap)

`visualRig` is a module-level `let` (declared with the other engine vars) in the same IIFE closure as `buildMap` — reference it directly, no plumbing:

```js
const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a4e, roughness: 0.7, emissive: visualRig.surfaces.wall.emissive, emissiveIntensity: visualRig.surfaces.wall.emissiveIntensity });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8, emissive: visualRig.surfaces.floor.emissive, emissiveIntensity: visualRig.surfaces.floor.emissiveIntensity });
```

## Commit

- hash: `cc43c488077a307172e7b62790ca8ee9002c115d` — `feat(visuals): baked neon spill on wall/floor materials`
- files (exactly 3, verified via `git show --name-only HEAD`): `src/visual-rig.js`, `tests/visual-rig.test.js`, `index.html`
- worktree: `neon-protocol-worktrees/vl-iteration-03`, branch `vl/iteration-03-baked-neon-spill`
- deviations: none
