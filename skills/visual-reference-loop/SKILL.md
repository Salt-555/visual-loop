---
name: visual-reference-loop
description: "Use Visual-Reference-Loop (VRL) for visual iterations."
version: 1.1.0
author: ALLMIND
license: MIT
metadata:
  hermes:
    tags: [visual-direction, screenshots, tdd, worktrees, delegation, iteration]
---

# Visual-Reference-Loop (VRL)

Run a short, reference-driven visual-improvement loop for any project: games, web apps, native UI, 3D scenes, renders, dashboards, or mockups.

The parent agent is the **orchestrator only**. It delegates capture, visual criticism, code implementation, and review. The parent handles kickoff, ordering, merge/test gates, the compact ledger, and final human-test handoff.

## Kickoff: ask before acting

If the user did not already provide these, ask for:

1. **Target project:** repo/path/URL/app plus branch to change, if relevant.
2. **Reference material:** URLs, local images/videos, named scenes/works, mood board, or written direction.
3. **Transfer goal:** mood, palette, materials, layout, typography, animation, or other dimension.
4. **Constraints:** target hardware/platform, performance/readability/accessibility rules, target camera/layout rules, and permission to modify/commit/merge.

Discover the actual test command, runtime command, rendering/UI architecture, dependency versions, worktree status, and relevant target-specific skills before iteration 1.

## Defaults and hard rules

- Run **3 complete iterations** unless the user requests another count.
- A delegated capture worker is mandatory before and after every iteration. The parent never captures or critiques images itself.
- Give critics the original separate target/reference images. A labeled composite is optional secondary orientation only; never use it as sole evidence.
- Preserve target constraints. Do not copy a reference camera/layout literally when formats differ.
- Keep artifacts under an ignored path such as `references/visual-loop/iteration-NN/`; never commit downloaded references, screenshots, or composites.
- Do not run implementation workers on overlapping files. If the work converges on one entry file, use one worker.
- No merge before independent review approval.
- Do not claim success without a fresh after-merge capture from the merged target branch.

## Per-iteration protocol

Repeat for `01` through the requested count (default `01` through `03`).

### 1. Capture worker

Delegate a worker that:

- obtains/reuses valid reference material and records URLs/paths;
- launches the target through its real runtime path;
- reaches meaningful target state, not a menu/placeholder;
- writes `target-before.png`, separate original reference files, and optional `orientation-composite.png`;
- confirms actual rendered/UI content, server liveness, and needed assets/modules;
- makes no production-code changes.

Required return: artifact paths, reference sources, server/runtime command, and validation facts.

### 2. Critic worker

Delegate a hypercritical visual critic with separate images, optional composite, constraints, and current code seams.

Require exactly **one highest-leverage, small visual slice**:

- observed screenshot-grounded gap;
- transferable reference quality that respects target constraints;
- exact implementation contract (colors/materials/spacing/lighting/layout/etc.);
- performance and readability budget;
- testable pure-data seam if applicable;
- scoped files and safe worktree boundaries;
- non-goals;
- visible after-capture acceptance evidence.

Reject generic suggestions such as “make it premium” or “add more effects.”

### 3. TDD worktree implementation

Parent creates up to three non-overlapping worktrees from the current merge base. If files overlap, use one worker.

Every implementation worker must:

1. Write one focused failing test first and show RED.
2. Implement the minimum change and show focused GREEN.
3. Run the full project test command.
4. For visual wiring, run a real runtime/browser smoke test.
5. Commit only scoped files.
6. Return commit hash, changed files, RED/GREEN evidence, full-test result, and runtime artifact paths.

For visual systems, keep logic in a pure descriptor/layout/scene-plan module when possible; test it separately from rendering. Render map/scene-owned decor only after bounds/state exist. Before rebuild, dispose old map/scene-owned meshes, materials, geometries, textures, effects, or DOM nodes.

### 4. Independent review

Delegate a fresh reviewer for every implementation branch. It returns only `APPROVED` or `REQUEST_CHANGES`.

It checks:

- critic contract and non-goals;
- TDD evidence and test scope;
- target/version compatibility;
- resource lifecycle and rebuild safety;
- full-target performance budget, including transient effects;
- no file-scope creep or prohibited expensive effects;
- preserved readability/accessibility/target constraints.

On request changes, dispatch a focused fix worker and review again.

### 5. Merge and after-capture

For approved work:

1. Re-check primary worktree status.
2. Merge without rewriting history.
3. Run the full project test command after each merge.
4. Run the merged target over HTTP/native runtime.
5. Delegate a fresh capture worker to write `target-after.png` and optional after-composite.
6. Confirm the critic’s acceptance evidence and report improvement, no perceptible gain, or regression.

If merged target fails, stop the iteration and use a fix worker. Never replace a working artifact with plausible prose.

### 6. Parent ledger

Write one compact ignored record:

```text
Iteration: 02/03
Target: <project/state>
Reference: <URLs/paths>
Gap: <one sentence>
Implemented: <one sentence>
Commits: <hashes>
Tests: <actual result>
After capture: improved / no perceptible gain / regression
Next focus: <one sentence>
```

## Recovery

- **Blank/black target:** first verify runtime/server, asset/module transfer, and target state; do not randomly change visuals.
- **Blocked worker:** inspect the real worktree and finish only missing verification/commit after checking the diff.
- **Late report:** compare against current target branch; act only on still-unsolved findings.
- **Conflict:** use a targeted integration worker; never force merge.
- **Missing reference:** reuse a recorded prior reference and still capture the target freshly.

## Final handoff

After all requested iterations, report the compact ledger, merged commits, final actual test output, final screenshot path, verified improvements, remaining constraints/performance budget, and a direct human-test request with exact things to inspect.

Never claim blanket labels such as “AAA.” State what evidence verified.
