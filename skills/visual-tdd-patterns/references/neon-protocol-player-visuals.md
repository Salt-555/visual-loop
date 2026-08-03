# NEON//PROTOCOL — Player visuals slice (vl-iteration-01)

Worked example of a critic-approved visual slice executed as a TDD worktree worker
(Visual-Loop iteration 01). Commit `eddcab605f27e2f03c8dfb8d1478d7f6eaaab3c9` on
branch `vl/iteration-01-player-visibility`, worktree
`/home/salt/projects/neon-protocol-worktrees/vl-iteration-01`.

## Contract: createPlayerVisualDescriptor({ className })

Pure module `src/player-visuals.js`, no Three.js/DOM. Exact values are the contract:

| field | ronin | netrunner |
|---|---|---|
| bodyColor | 0xdd4433 | 0x22ddaa |
| bodyEmissive | 0xcc3333 | 0x1fbf9a |
| bodyEmissiveIntensity | 0.30 | 0.30 |
| visorColor | 0xff4455 | 0x44ffcc |
| ring.color / opacity / inner / outer | 0xff3344 / 0.9 / 0.48 / 0.62 | 0x33ffcc / 0.9 / 0.48 / 0.62 |
| glowDisc.color / opacity / radius | 0xff3344 / 0.16 / 1.15 | 0x33ffcc / 0.16 / 1.15 |

Unknown class → `throw new Error('Unknown class: <name>')` (matches `characters.js`
convention; test asserts `/Unknown class/`).

## Test shape (tests/player-visuals.test.js, 6 tests)

1. Exact values per class (`toBe` on every contract number)
2. Identity read: `ronin.bodyColor !== netrunner.bodyColor`, same for ring.color
3. Range sanity: `0 < inner < outer < 1` for both classes
4. Opacities in `(0,1]`, `bodyEmissiveIntensity` in `(0,1)`
5. Unknown class throws

## index.html wiring (module bridge + createPlayerMesh)

- Bridge block: `import * as PV from './src/player-visuals.js';` + `window.PV = PV;`
  next to the other `import * as X` / `window.X = X` lines, before
  `dispatchEvent(new Event('module-bridge-ready'))`.
- `createPlayerMesh()` consumes `PV.createPlayerVisualDescriptor({ className: player.class })`
  (`player.class` is 'ronin' | 'netrunner', set by `Characters`):
  - Body: `MeshStandardMaterial({ color: pv.bodyColor, roughness: 0.45, metalness: 0.15,
    emissive: pv.bodyEmissive, emissiveIntensity: pv.bodyEmissiveIntensity })`
  - Visor: `MeshBasicMaterial({ color: pv.visorColor, side: THREE.DoubleSide })`
  - Ring: `RingGeometry(pv.ring.inner, pv.ring.outer, 24)`, MeshBasic
    `{ transparent: true, opacity: pv.ring.opacity, toneMapped: false, depthWrite: false,
    side: THREE.DoubleSide }`, `rotation.x = -Math.PI/2`, `y = 0.02`
  - Glow disc: `CircleGeometry(pv.glowDisc.radius, 20)`, same material style,
    `rotation.x = -Math.PI/2`, `y = 0.015`
  - Both added to the player group; no `castShadow`; enemies untouched.
  - Scope note: contract said "modify ONLY createPlayerMesh()" — the bridge import
    lines were still required (explicitly mandated by the contract's bridge instruction).

## Evidence captured (RED → GREEN → full → smoke)

- RED: `Error: Cannot find module '../src/player-visuals.js' imported from
  .../tests/player-visuals.test.js` (suite failed, 0 tests run)
- Focused GREEN: `✓ tests/player-visuals.test.js (6 tests)` → 6 passed
- Full: `npm test` → 13 files, 159 tests passed (153 baseline + 6 new)
- Smoke: `npm run smoke` → `Browser smoke passed: real class boot, bridge, canvas,
  stable state, and error-free frames.`
- Commit: 3 files (+100/-2): `src/player-visuals.js` (new), `tests/player-visuals.test.js` (new),
  `index.html` (bridge + createPlayerMesh only). `git status --short` showed exactly those
  three before committing — no package.json/package-lock drift.

## Report format used (worker → orchestrator)

Commit hash (full SHA), changed files, RED evidence (error line), GREEN evidence
(test counts), full test count, smoke result verbatim, deviations — even minor ones
(here: the extra `window.PV` bridge line; glow disc `rotation.x` implied by "ground disc").
