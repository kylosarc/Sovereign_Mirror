# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sovereign Mirror - a distributed governance simulator built on "Radical Veracity" principles. React + Three.js frontend visualizes veracity scores, P-Gate confirmations, and node physicalization as a symbolic 3D environment, driven by live NOAA solar wind data. A Python agent-based model (Mesa) simulates "free agents" debating statements, scored for logical fallacies, feeding into the same veracity/ledger system.

## Commands

```bash
npm run dev              # Vite dev server (port 3000)
npm run build             # tsc typecheck + vite build
npm run preview           # Preview production build
npm run server            # Run the Node http server (server/index.js)
npm test                  # vitest (watch)
npm run test:run          # vitest run (single pass)
npm run test:coverage     # vitest run --coverage
```

Run a single test file: `npx vitest run src/logic/pGate.test.ts`

There is no lint script configured. Python side (`server/simulation/`) uses `ruff` (cache present at `.ruff_cache/`) but no committed config/script was found - check before assuming a command exists.

## Working Agreements (from AGENTS.md)

This repo has explicit process rules in `AGENTS.md` - read it for the full text. Key points:
- State assumptions and tradeoffs explicitly before implementing; don't pick silently between interpretations.
- Minimum code that solves the problem - no speculative abstractions, flexibility, or error handling for impossible scenarios.
- Surgical changes only: don't refactor or "improve" adjacent code/comments/formatting that isn't part of the request. Remove imports/vars that your own change orphaned; mention (don't delete) pre-existing dead code you notice.
- For non-trivial work, state a brief numbered plan with a verification step per item.

## Architecture

### Three-layer state model
The app deliberately runs three different state libraries side by side, each for a distinct concern:

| Layer | Library | Purpose |
|-------|---------|---------|
| Atoms | Jotai (`src/state/atoms/`) | Per-node reactive state |
| HUD | Zustand (`src/state/stores/`) | Flux, noise, sunrise opacity - read via `getState()` inside `useFrame`, not via hooks |
| Ledger | Redux (`src/state/ledger/`) | Audit trail, veracity log |

Zustand → Redux is one-directional, kept in sync by `src/state/syncBridge/syncBridge.ts` via `subscribe`. `src/state/middleware/VeracityEnforcer.ts` throws if Zustand/Redux drift exceeds 0.01 - if you touch state flow, keep both sides updated together.

### Logic kernel (`src/logic/`)
Five pure, side-effect-free gates that are the mathematical core of the simulation. A mirror implementation lives in `server/logic/kernel.js` for server-side use (e.g. `/api/veracity/calculate`) - keep the two in sync when changing the math.

1. `veracityGate.ts` - `max(0, V_active - V_control)`
2. `pGate.ts` - 7-cycle confirmation, quorum = `min(N, ceil(sqrt(N)) + 2)`
3. `inverionDivide.ts` - remediation (NOT deletion) of deprecated nodes
4. `abolitionOfPain.ts` - pain threshold enforcement
5. `atrophyTimer.ts` - decays VirtualResonance if a node isn't physicalized within `T_limit` (24h / 86,400,000ms)

Constants live in `src/logic/types.ts` (`GOLDEN_RATIO = 0.618`, `THRESHOLD_ENTROPY = 0.07`, `CONFIRMATION_CYCLES = 7`, `BASE_TICK_RATE = 400ms`).

### Server (`server/index.js`)
Plain Node `http.createServer` - intentionally no Express (`server/package.json` is separate from the root). Routes are dispatched by manual `if (url.pathname === ... && req.method === ...)` checks; add new endpoints there in the same style rather than introducing a router. Endpoints: `/api/health`, `/api/rtsw/latest` (NOAA solar wind proxy), `/api/pgate/engage`, `/api/veracity/calculate`, `/api/quorum/calculate`, `/api/atrophy/calculate`, `/api/kernel/version`, `/api/feedback*`.

`server/feedbackStore.js` persists per-agent confidence weights and analysis/feedback history to SQLite (`better-sqlite3`, `server/data/feedback.db`). `applyVerdict` nudges agent weights ±0.1 per correct/incorrect verdict, clamped to `[0.1, 5.0]` - this is how the multi-agent fallacy classifier (Groq / RoBERTa / OpenRouter) self-corrects over time. OpenRouter/DeepInfra are currently disabled as unreliable; Groq is the primary validator (see recent commit history).

`functions/api/*.ts` are separate Cloudflare Pages Functions versions of the gate endpoints (for the Wrangler/Cloudflare deployment path) - keep them aligned with `server/logic/kernel.js` if the math changes.

### Python simulation (`server/simulation/`)
A Mesa-based agent-based model (`model.py`, `agents.py`, `network.py`, `free_agents.py`) where simulated agents post statements that get scored by `fallacy_classifier.py` against `fallacy_data.json`, then bridged into the JS ledger via `real_time_bridge.py`. `api.py` exposes this over HTTP for the Node server / frontend to consume.

### Training / Nine Pillars (`training/src/`)
A separate Vite app (`training/vite.config.ts`, `training/package.json`) that builds the Cognoscentae Ultrans training system. Entry point: `training/src/main.tsx`. Deployed as a WordPress plugin at `kylosarc.com/training/` (Hostinger). Also embedded in the main Sovereign Mirror app via `Dashboard.tsx` (architecture panel → "OPEN TRAINING MODULE →" link).

**Canonical nine-pillar curriculum - live site at `kylosarc.com/training/` is the authority:**

| # | Title | Subtitle |
|---|-------|----------|
| 1 | Intellectual Veracity | Logical Fallacies · Cognitive Biases · Epistemic Hygiene |
| 2 | Relational Integrity | Conflict Resolution · Communication Protocols · Covenant-Based Coordination |
| 3 | Environmental Stewardship | Regenerative Design · Circular Economics · Ecological Intelligence |
| 4 | Technological Fluency | AI Alignment · Systems Architecture · Exponential Tooling |
| 5 | Physiological Optimization | Sleep Architecture · Metabolic Flexibility · Stress Adaptation · Longevity |
| 6 | Temporal Discipline | Deep Work · Attention Economics · Deadline Architecture |
| 7 | Creative Synthesis | Cross-Domain Transfer · Lateral Thinking · Innovation Pipeline |
| 8 | Collaborative Governance | DAO Primitives · Consent-Based Governance · Meritocratic Allocation |
| 9 | The Flourishing Metric | Multi-Capital Accounting · Wellbeing Indices · Anti-Fragility |

Pillar 1 is live (wraps `CognoscentaeUltrans`). Pillars 2–9 are `ModuleStub` placeholders. Do not rename pillars or change their order without updating both `ModuleRouter.tsx` and the live WordPress site. The router uses `training/src/router/ModuleRouter.tsx`; module files are `training/src/modules/Module1.tsx` through `Module9.tsx`.

The fallacy detection engine (`engines/FallacyDataset.ts`, `engines/FallacyMapEngine.ts`) and `interface/CognoscentaeUltrans.tsx` are included in the root `tsconfig.json` (`include: ["src", "training/src"]`) and share the root fallacy corpus (`fallacy_data.json`).

### 3D visualization
- `src/components/three/ResonanceTrajectory.tsx` - main canvas. `MAX_NODES = 100` (instanced mesh), Sierpinski fractal depth capped at 3 (depth ≥4 crashes most browsers), morphs in when flux > 0.5, flux clamped at 0.95 to prevent lerp collapse.
- `src/components/three/OrbitalRings.tsx` - 5-layer orbital ring HUD (radii 0.8–3.85, 24/16/12/8/6 spokes, alternating rotation direction, drifting particles per ring), all rings face the camera.
- Required guards throughout this code: `isFinite()`/`isNaN()` checks before writing to matrices (`setMatrixAt`), capped deltas (`Math.min(delta, 0.05)`), geometry disposal in `useEffect` cleanup, `frustumCulled={false}` on dynamically-moving `InstancedMesh`.

## Repo hygiene notes
The working tree has large generated/backup artifacts at the root (`backup/`, `backup_manual*/`, `*.tar.gz`, `dist/`, `cloudflared`, SSH keys like `id_hetzner_server`) - these are not part of the app's source tree; don't treat them as canonical when searching for current implementations, and never commit secrets/keys from them. `.gitignore` already excludes most of these patterns.

As of 2026-06-25, also be aware of:
- `kylos-qpadl/` is a separate real project (`github.com/shansimmons-eng/kylos-qpadl`, post-quantum signatures in Rust) checked out inside this working tree. It's tracked as a git submodule (see `.gitmodules`) - don't expect its contents to show up in this repo's own commits.
- `server/simulation/` had its Python venv deleted at some point, which silently broke three systemd services on Hetzner that all share it (`free-agents`, `simulation-abm`, `roberta-classifier`) - only one actually crash-looped, the other two kept running on stale in-memory processes until restarted. If you're debugging a "works locally, broken on server" issue, check `venv/bin/python` actually exists there first.
- See `ENVIRONMENT.md` for the current state of API keys/secrets and which are load-bearing vs optional.
- `origin/master` and `main` were, until this date, two **unrelated-history** branches by the same author that had silently diverged - `master`'s last commit had a real, working `/api/crypto/*` bridge to `kylos-qpadl` (subprocess management, restart caps, `TOUCHPOINTS.md`) that `main` lacked; `main` had a UI shell calling an endpoint that didn't exist on that branch. That work was manually ported (not merged - `git merge --allow-unrelated-histories` was deliberately avoided for this security-sensitive code) into `main`. `origin/master` still exists on GitHub but is now historical/superseded - don't treat it as a second source of truth, and don't try to merge it into `main` again.
- `TOUCHPOINTS.md` at the repo root is the attack-surface inventory for the crypto subsystem - update it if you touch `server/index.js`'s `/api/crypto/*` routes or the subprocess bridge.
