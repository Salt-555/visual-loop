---
name: visual-loop
description: "Visual-Loop (VL): critique-driven visual iteration with NO reference images — the critic judges the target's own screenshot on its visual merits."
version: 1.3.0
author: ALLMIND
license: MIT
related_skills: [headless-visual-capture, visual-tdd-patterns, visual-reference-loop]
metadata:
  hermes:
    tags: [visual-direction, screenshots, tdd, worktrees, delegation, iteration, critique]
---

# Visual-Loop (VL)

Run a short, critique-driven visual-improvement loop for any project: games, web apps, native UI, 3D scenes, renders, dashboards, or mockups. No reference material — the critic judges the project's own screenshot on its visual merits.

The parent agent is the **orchestrator only**. It delegates capture, visual criticism, code implementation, and review. The parent handles kickoff, ordering, merge/test gates, the compact ledger, and final human-test handoff.

## Kickoff: ask before acting

If the user did not already provide these, ask for:

1. **Target project:** repo/path/URL/app plus branch to change, if relevant.
2. **Direction (optional, written only):** aesthetic goals, mood, palette, materials, layout, typography, animation, or other dimension to judge against. No reference images required — the critic evaluates the screenshot on its own.
3. **Constraints:** target hardware/platform, performance/readability/accessibility rules, target camera/layout rules, and permission to modify/commit/merge.

Discover the actual test command, runtime command, rendering/UI architecture, dependency versions, worktree status, and relevant target-specific skills before iteration 1.

## Defaults and hard rules

- Run **3 complete iterations** unless the user requests another count.
- A delegated capture worker is mandatory before and after every iteration. The parent never captures or critiques images itself.
- The critic works from the actual target screenshot(s) only. Every finding must be grounded in pixels visible in the capture — never in prose descriptions of what the code "should" look like.
- Preserve target constraints.
- Keep artifacts under an ignored path such as `references/visual-loop/iteration-NN/`; never commit screenshots.
- Do not run implementation workers on overlapping files. If the work converges on one entry file, use one worker.
- No merge before independent review approval.
- Do not claim success without a fresh after-merge capture from the merged target branch.
- Clean up implementation worktrees after every merge: each leftover worktree carries its own `node_modules` (worktrees share `.git` but NOT `node_modules`), so every stale worktree is a full duplicate install. Remove the worktree and delete the merged branch once the verdict is recorded.
- The merged tree must never end an iteration visually worse than it started. A `REGRESSION` verdict means revert first, restore and confirm the baseline, then **continue** the loop — never start the next iteration on a regressed tree.
- Never judge an after-capture against anything but the iteration baseline (see Regression & no-gain policy).

## Regression & no-gain policy (foolproof rules)

These are invariants, not suggestions. Their purpose: the loop can only leave the target equal-or-better than it found it, a bad direction resets safely instead of compounding, and a persistently wrong direction stops the loop instead of burning iterations.

- **Baseline is always the iteration start.** Iteration `01` baseline: the merged state captured as `target-before.png`. Iterations `02+` baseline: the previous iteration's merged state (its `target-after.png`). After a `REGRESSION` revert, the next iteration's baseline is the reverted (restored) state — the same tree that iteration started on — recaptured as `target-before.png`, never the regressed merge. Never compare against an older state — a change that improves over iteration `01` but regresses iteration `02`'s work is still a regression.
- **Only a fresh comparison worker judges.** After every after-capture, delegate a lightweight comparison worker — never the critic or implementer from that iteration, both are biased — to view the before/after captures side by side and return exactly one verdict: `IMPROVED`, `NO_GAIN`, or `REGRESSION`.
- **Comparable captures first.** The comparator verifies both captures show the same target state, viewport, and resolution before judging. If they are not comparable, recapture. Never judge mismatched pixels.
- **`REGRESSION` ⇒ revert, confirm the baseline, then continue.** `git revert` that iteration's merge (never force-merge, never rewrite history), recapture the reverted branch, and confirm the capture matches the baseline. Record the verdict in the ledger. The reverted state IS the next iteration's baseline — capture it as `target-before.png` and **continue the loop**. The regressed iteration still counts toward the iteration budget. A single regression is a reset, not a verdict on the whole direction — unless it is the second one (next bullet). Never "fix forward" on a regressed tree; the revert must land first.
- **Two `REGRESSION` verdicts anywhere in the loop ⇒ permanent stop.** Revert the second, restore and confirm the baseline, record both, and do not continue. Two independent directions both ended worse than their baselines — the approach is wrong and more iterations will not fix it. Hand back to the human with the ledger and the restored state as the new baseline.
- **`NO_GAIN` is not progress.** The merge stays (the state is not worse), but the iteration is recorded as no gain. Two consecutive `NO_GAIN` verdicts ⇒ stop the loop and hand back instead of grinding through the remaining iterations.
- **Success requires net improvement over the original baseline.** The loop claims success only when the final after-capture is judged `IMPROVED` against iteration `01`'s `target-before.png`. Reverted (regressed) iterations contribute nothing toward net improvement. If the final verdict is `NO_GAIN` or `REGRESSION`, report "no net improvement" and hand back. Never claim success without a verified gain.

## Per-iteration protocol

Repeat for `01` through the requested count (default `01` through `03`). A `REGRESSION` that reverts mid-loop does not end the loop; the next iteration proceeds from the restored baseline. Only the two-`REGRESSION` cap or two consecutive `NO_GAIN` verdicts end the loop early.

### 1. Capture worker

Delegate a worker that:

- launches the target through its real runtime path;
- reaches meaningful target state, not a menu/placeholder;
- writes `target-before.png`;
- confirms actual rendered/UI content, server liveness, and needed assets/modules;
- makes no production-code changes.

Required return: artifact paths, server/runtime command, and validation facts.

### 2. Critic worker

Delegate a hypercritical visual critic, giving it the actual screenshot(s), constraints, and current code seams.

The critic evaluates the screenshot on its own merits: composition, hierarchy, spacing, color, typography, readability, polish, alignment, visual bugs, and coherence with the stated direction. No reference image is involved — the screenshot is the sole evidence.

Require exactly **one highest-leverage, small visual slice**:

- observed screenshot-grounded gap (must cite what is visible in the capture);
- exact implementation contract (colors/materials/spacing/lighting/layout/etc.);
- performance and readability budget;
- testable pure-data seam if applicable;
- scoped files and safe worktree boundaries;
- non-goals;
- visible after-capture acceptance evidence.

Reject generic suggestions such as "make it premium" or "add more effects."

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

### 5. Merge, verdict, and after-capture

For approved work:

1. Re-check primary worktree status.
2. Merge without rewriting history.
3. Run the full project test command after each merge.
4. Run the merged target over HTTP/native runtime.
5. Delegate a fresh capture worker to write `target-after.png`.
6. Delegate a fresh comparison worker to judge `target-after.png` against the iteration baseline. It returns exactly one verdict: `IMPROVED`, `NO_GAIN`, or `REGRESSION`.
7. Act on the verdict per the Regression & no-gain policy:
   - `IMPROVED` — confirm the critic's acceptance evidence, write the ledger, proceed.
   - `NO_GAIN` — keep the merge, record it, and check the consecutive-count rule.
   - `REGRESSION` — revert immediately, recapture to confirm the baseline is restored, record it, then continue to the next iteration from the restored baseline. Permanent stop only if this is the second `REGRESSION` of the loop.

If the merged target fails to run, stop the iteration and use a fix worker first — a failing merge is not yet a visual verdict. Never replace a working artifact with plausible prose.

### 7. Worktree cleanup (mandatory)

After the verdict is recorded and the ledger written, remove every implementation worktree created for that iteration and delete its merged branch:

```bash
git worktree remove --force /path/to/<project>-worktrees/<iteration-worktree>
git branch -d <branch-name>
```

- Only delete branches that are actually merged into the target branch (`git branch -d` refuses otherwise).
- For an unmerged/reverted iteration whose work might be worth keeping, remove the worktree directory (reclaims the duplicate install) but keep the branch ref — the commit lives in `.git` either way.
- Never remove the primary worktree or any worktree another worker is actively using.
- Verify after cleanup: `git worktree list` shows only the primary worktree plus any actively-used ones.

### 6. Parent ledger

Write one compact ignored record:

```text
Iteration: 02/03
Target: <project/state>
Gap: <one sentence>
Implemented: <one sentence>
Commits: <hashes>
Tests: <actual result>
Verdict: IMPROVED / NO_GAIN / REGRESSION
Reverted: yes / no
Next focus: <one sentence>
```

## Recovery

- **Blank/black target:** first verify runtime/server, asset/module transfer, and target state; do not randomly change visuals.
- **Blocked worker:** inspect the real worktree and finish only missing verification/commit after checking the diff.
- **Late report:** compare against current target branch; act only on still-unsolved findings.
- **Conflict:** use a targeted integration worker; never force merge.
- **Stale screenshot:** if the capture does not reflect current code, recapture before critiquing — never critique stale pixels.
- **Regression:** never treat it as cosmetic. Revert the iteration merge, recapture to confirm the baseline is restored, record the verdict, and continue from the restored baseline per the Regression & no-gain policy (permanent stop only on the second regression of the loop). Do not "fix forward" on a regressed tree.

## Final handoff

After all requested iterations, report the compact ledger, merged commits, final actual test output, final screenshot path, the final verdict against the original baseline, any reverted iterations, remaining constraints/performance budget, and a direct human-test request with exact things to inspect.

Never claim blanket labels such as "AAA." State what evidence verified.
