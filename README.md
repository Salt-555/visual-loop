# Visual-Loop (VL)

Critique-driven visual iteration for any project — games, web apps, native UI, 3D scenes, renders, dashboards, or mockups. **No reference material required** — the critic judges the project's own screenshot on its visual merits.

## What it does

Runs a short, critique-driven visual-improvement loop (default 3 iterations). The parent agent is an **orchestrator only** — it delegates capture, visual criticism, TDD implementation, and independent review. It never captures or critiques images itself.

Per iteration:

1. **Capture** — a worker launches the real target, reaches meaningful state, screenshots it
2. **Critique** — a hypercritical critic returns exactly ONE highest-leverage visual slice, grounded in pixels visible in the capture
3. **Implement** — TDD worktree workers (RED → GREEN → full tests → smoke test → scoped commit)
4. **Review** — an independent reviewer approves or requests changes
5. **Merge & verdict** — merge, recapture, and a fresh comparison worker returns `IMPROVED` / `NO_GAIN` / `REGRESSION`

## Why the regression policy matters

The loop can only leave the target equal-or-better than it found it:

- **`REGRESSION`** → `git revert` that iteration's merge, recapture, confirm the baseline is restored, then **continue** the loop from the restored state. A single bad direction resets safely instead of compounding.
- **Two `REGRESSION`s anywhere** → permanent stop. Two independent directions both ending worse means the approach is wrong.
- **Two consecutive `NO_GAIN`s** → stop. The merge stays (not worse), but grinding more iterations won't help.
- **Success** requires net improvement over the original baseline — reverted iterations contribute nothing.

## Install (Hermes Agent)

The repo IS the skill bundle — each directory under `skills/` is a complete Hermes skill. Install all four at once:

```bash
cp -r skills/* ~/.hermes/skills/software-development/
```

Or install just Visual-Loop:

```bash
mkdir -p ~/.hermes/skills/software-development/visual-loop
cp skills/visual-loop/SKILL.md ~/.hermes/skills/software-development/visual-loop/
```

## Bundle contents

- `skills/visual-loop/` — Visual-Loop (VL) v1.3.0, the critique-driven loop
- `skills/headless-visual-capture/` — v1.1.0: headless screenshot recipe (Playwright + system Chromium, non-blank pixel verification, capture template)
- `skills/visual-tdd-patterns/` — v1.1.0: pure-data/descriptor seam TDD for rendering features
- `skills/visual-reference-loop/` — v1.1.0: the reference-driven sibling (VRL)

## License

MIT — see [LICENSE](LICENSE).
