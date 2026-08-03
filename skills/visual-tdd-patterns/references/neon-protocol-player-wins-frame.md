# NEON//PROTOCOL — Player wins the frame slice (VL iteration-01)

Worked example of a critic-approved descriptor-flip slice executed as a TDD
worktree worker (Visual-Loop iteration 01, "combat hierarchy — the environment
outshines the player; the player must win the frame"). Commit
`2d534a5187488e5be1a7cb23d3726e5b96ff1782` on branch `vl2/iteration-01`,
worktree `/home/salt/projects/neon-protocol-worktrees/vl2-iteration-01`,
repo `/home/salt/projects/neon-protocol` (master 7e637b0). Baseline before
work: 14 files / 168 tests green.

## Contract

A. `src/player-visuals.js` — both ronin + netrunner descriptors:
- bodyEmissiveIntensity 0.30 → 0.42
- ring: color unchanged, opacity 0.9 → 1.0, inner 0.48 → 0.52, outer 0.62 → 0.70 (inner<outer<1 held)
- glowDisc: color unchanged, opacity 0.16 → 0.30, radius 1.15 → 1.30, blending: 'additive' (NEW)

B. `index.html` (ONE line only, ~line 404) — glowDisc MeshBasicMaterial gains
`...(pv.glowDisc.blending === 'additive' ? { blending: THREE.AdditiveBlending } : {})`
adapted to the existing one-line material-construction pattern. Nothing else
in index.html touched.

C. `src/visual-rig.js` — violet-depth-practical: intensity 1.1 → 0.45, distance
6 → 4 (color 0x795cff, position, decay 2 unchanged). NEW exported pure helper:
`fixturePeakLuminance({color, intensity}) = luminance(colorHex) * intensity`.

## TDD flow + evidence

1. RED (tests first, 4 failed | 11 passed): flipped bodyEmissiveIntensity
   asserts 0.30 → 0.42 (both classes), added ring.opacity → 1 / ring.outer →
   0.70 / glowDisc.blending === 'additive' exact asserts, flipped violet
   fixture to {intensity 0.45, distance 4}, added cross-seam guard test.
   Failures: `expected 0.3 to be 0.42` (both classes), violet `-4/0.45` vs
   received `6/1.1` in the fixtures `toEqual`, `TypeError: fixturePeakLuminance
   is not a function`.
2. GREEN: descriptor constants flipped + helper added → focused run 15/15
   (player-visuals 6, visual-rig 9).
3. Full: `npm test` → 14 files, 169 tests (168 baseline + 1 new guard).
4. Smoke: `node scripts/browser-smoke.mjs` → passed (real class boot, bridge,
   canvas, stable state, error-free frames).
5. Commit: exactly 5 files (src/player-visuals.js, src/visual-rig.js,
   index.html, tests/player-visuals.test.js, tests/visual-rig.test.js);
   post-commit `git status --short` clean; `git show --name-only HEAD` = the 5.

## Cross-seam guard math (hand-checked BEFORE writing expectations)

luminance weights 0.2126/0.7152/0.0722.

- violet 0x795cff: r121 g92 b255 → 109.93; ×0.45 (new) = 49.47 < 95.6 ✓
- violet ×1.1 (old) = 120.9 > 95.6 → would be RED; proves the guard is meaningful
- player anchor 0xff3344 (full opacity, no intensity multiplier): r255 g51 b68 → 95.60
- cyan 0x35e8ff ×2.2 ≈ 430, magenta 0xd83cff ×1.45 ≈ 155, amber 0xff9d3d ×2.4 ≈ 410

**Key pitfall**: the critic's rationale said "any single practical pool", but a
loop over ALL fixtures fails — cyan/magenta/amber legitimately outshine the
anchor. The guard is violet-specific by design (only the depth pool must not
win the frame). Write the named guard exactly; don't generalize to a loop
without re-checking every fixture's math first.

## Helper implementation note

Contract said "constants only, no allocation". Implemented by inlining channel
extraction (`(color>>16)&0xff` etc.) and the luminance weights instead of
reusing the module's existing `luminance(channelsFromHex(...))` (allocates a
3-element array). Duplicates the weight constants but satisfies the letter of
the no-allocation constraint; the helper is test/spec-check-only, never per-frame.

## Test-file details

- Test reproduces the luminance math inline (own `luminanceOf` helper) rather
  than importing the private module function — self-contained, exercises only
  the exported contract surface.
- Contract enumerated the exact asserts to flip/add (bodyEmissiveIntensity,
  glowDisc.radius, ring.opacity, ring.outer + blending). ring.inner and
  glowDisc.opacity changes were left to the existing range guards
  (0 < inner < outer < 1, opacities in (0,1]) — follow the enumerated list
  exactly; don't invent extra exact asserts beyond the contract.
- Em-dashes are fine in src file comments; only TEST strings trip the rolldown
  parser (see SKILL.md quirk section). Kept test names/strings ASCII.
