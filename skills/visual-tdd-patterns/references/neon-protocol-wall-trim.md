# Neon Protocol — Wall-Base Trim Slice (vl-iteration-02)

Worked example of a critic-approved grid-adjacency slice shipped via strict TDD.
Commit: `4d72509` on `vl/iteration-02-wall-trim` — files: `src/wall-trim.js`,
`tests/wall-trim.test.js`, `index.html` only (3 files, 240 insertions).

## Contract (from the critic)

`buildWallTrimLayout({ mapData, tileSize })` → `{ trims: [{ tx, tz, edge, colorRole }] }`

- One trim per wall→floor **adjacency edge** (a wall with floor on two sides emits TWO trims).
- `tx`/`tz` are the WALL tile's grid coords (column x, row z — note: row is the grid's y, i.e. `grid[tz][tx]`).
- `edge` from neighbor direction: `dx:-1→'w'`, `dx:1→'e'`, `dy:-1→'n'`, `dy:1→'s'` — the direction FROM the wall tile TO the floor neighbor.
- `colorRole`: `'amber'` if that neighbor is the exit tile (`mapData.exit` tile coords), else `'cyan'`.
- Doors (`grid[y][x] === 2`) count as floor neighbors (junction exists).
- Guards: `null`/invalid/partial mapData → `[]` (bare array). Valid input → `{ trims }`.
- Renderer: 2 InstancedMeshes in `buildMap` — cyan `0x45edff`, amber `0xffac4a`,
  `MeshBasicMaterial({ toneMapped:false, transparent:true, opacity:0.9, depthWrite:true })`,
  `BoxGeometry(ts, 0.08, 0.10)`, y=0.07, `frustumCulled=false`, added to `mapGroup`.

## Fixtures used (5x5 wall field, 3x3 room at rows/cols 1-3)

`ROOM_MAP` (exit at room center (2,2) → no wall touches it → all cyan):

```
0 0 0 0 0
0 1 1 1 0
0 1 1 1 0
0 1 1 1 0
0 0 0 0 0
```

12 trims — one per bordering wall. Correct edge table (hand-derived, cell by cell):

| wall (tx,tz) | floor neighbor | edge |
|---|---|---|
| (1,0),(2,0),(3,0) — north row y=0 | below (y=1) | `s` |
| (0,1),(0,2),(0,3) — west col x=0 | right (x=1) | `e` |
| (4,1),(4,2),(4,3) — east col x=4 | left (x=3) | `w` |
| (1,4),(2,4),(3,4) — south row y=4 | above (y=3) | `n` |

`AMBER_MAP`: same room but `exit: {x:1,y:1}` and door at (2,1) → `grid[2][1]=2`.
Amber = walls touching (1,1): wall (0,1) west of it → `0,1:e`; wall (1,0) north of it → `1,0:s`.
Door-adjacent wall: (0,2) west of the door → `{tx:0,tz:2,edge:'e',colorRole:'cyan'}`.

## The failure mode (two false RED rounds)

Round 1: module emitted correct output; test expectations had n/s and e/w swapped
(e.g. expected `'0,1:s'` for the west column wall, but a west-column wall faces EAST).
Round 2: same class of error on the south-row vs east-column walls, and the
partial-grid guard fixture. The module was right every time — the fix was always
in the test's hand-derived expectations. Lesson: derive fixture expectations from
`grid[y][x]` semantics (y is the row!) and the "edge = FROM tile TO neighbor" rule
BEFORE running; when RED shows a transposed-looking set, re-derive the fixture, not
the module.

Also caught in round 1: `export function f({ mapData }) {...}` crashes on
`f(null)` with `Cannot destructure property 'mapData' of 'object null'` — the guard
must run before destructuring (`const { mapData } = options || {}`).

## Assertion pattern that made diffs readable

```js
const key = t => `${t.tx},${t.tz}:${t.edge}`;
expect(new Set(trims.map(key))).toEqual(new Set(['1,0:s', '0,1:e', /* ... */]));
```

## Renderer wiring (index.html buildMap, after the wall loop)

```js
const trimLayout = window.WallTrim.buildWallTrimLayout({ mapData: data, tileSize: ts });
const trims = Array.isArray(trimLayout) ? trimLayout : trimLayout.trims; // guard returns []
if (trims.length > 0) {
  const trimGeometry = new THREE.BoxGeometry(ts, 0.08, 0.10);
  const trimMaterials = {
    cyan:  new THREE.MeshBasicMaterial({ color: 0x45edff, toneMapped: false, transparent: true, opacity: 0.9, depthWrite: true }),
    amber: new THREE.MeshBasicMaterial({ color: 0xffac4a, toneMapped: false, transparent: true, opacity: 0.9, depthWrite: true }),
  };
  for (const colorRole of ['cyan', 'amber']) {
    const instances = trims.filter(t => t.colorRole === colorRole);
    if (instances.length === 0) continue;
    const trimMesh = new THREE.InstancedMesh(trimGeometry, trimMaterials[colorRole], instances.length);
    const matrix = new THREE.Matrix4();
    const offset = ts / 2 - 0.03; // 0.03 of the 0.10 thickness sits under the wall face
    instances.forEach((trim, i) => {
      let px = (trim.tx - data.width / 2) * ts;
      let pz = (trim.tz - data.height / 2) * ts;
      if (trim.edge === 'n') pz -= offset;
      else if (trim.edge === 's') pz += offset;
      else if (trim.edge === 'w') px -= offset;
      else if (trim.edge === 'e') px += offset;
      matrix.makeRotationY(trim.edge === 'n' || trim.edge === 's' ? 0 : Math.PI / 2);
      matrix.setPosition(px, 0.07, pz); // spans y 0.03–0.11, above the floor plane
      trimMesh.setMatrixAt(i, matrix);
    });
    trimMesh.instanceMatrix.needsUpdate = true;
    trimMesh.frustumCulled = false; // r128 culls via base geometry bounding sphere
    mapGroup.add(trimMesh); // mapGroup.traverse dispose covers geometry + material
  }
}
```

## Evidence trail (report shape that satisfied the handoff)

- RED: `Error: Cannot find module '../src/wall-trim.js' imported from .../tests/wall-trim.test.js` (1 file failed, 0 tests) → then 4 failed/2 passed on first impl (2 expectation classes + guard crash).
- GREEN: `tests/wall-trim.test.js → 6 passed (6)`.
- Full: `npm test` → 14 files, 165 tests passed (159 baseline + 6 new).
- Smoke: `npm run smoke` → `Browser smoke passed: real class boot, bridge, canvas, stable state, and error-free frames.` — headless chromium runs buildMap, so the InstancedMesh wiring is exercised here, not in vitest.
- Commit scope verified with `git status --short` (only M index.html + 2 untracked) and `git show --name-only HEAD` after.
