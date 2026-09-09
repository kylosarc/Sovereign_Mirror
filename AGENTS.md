# Sovereign Mirror - Agent Guidelines

## Process Rules

- State assumptions explicitly; don't pick silently between interpretations.
- Minimum code that solves the problem - no speculative abstractions.
- Surgical changes only: don't "improve" adjacent code/comments/formatting. Remove only imports/vars your change orphaned.
- For non-trivial work, state a numbered plan with a verification step per item.

## Build Commands

```bash
npm run dev            # Vite dev server, port 3000 (proxies /api, /classify, /validate → localhost:3001)
npm run build          # tsc typecheck + vite build
npm run test           # vitest (watch mode)
npm run test:run       # vitest single pass
npm run test:coverage  # vitest + v8 coverage (covers src/logic/**/*.ts)
npm run server         # Node server on port 3001 (server/index.js)

# Single test file
npx vitest run src/logic/pGate.test.ts

# Server standalone
cd server && node index.js
```

**No lint script is configured.** Python side uses `ruff` but there's no committed config/script - don't assume a lint command exists.

## Architecture

### Three-layer state (intentionally different libraries)

| Layer | Library | Location | Purpose |
|-------|---------|----------|---------|
| Atoms | Jotai | `src/state/atoms/` | Per-node reactive state |
| HUD | Zustand | `src/state/stores/` | Flux, noise, sunrise opacity |
| Ledger | Redux | `src/state/ledger/` | Audit trail, veracity log |

- Zustand → Redux sync: `src/state/syncBridge/syncBridge.ts` (one-directional via `subscribe`)
- `VeracityEnforcer` middleware throws if drift > 0.01 between Zustand/Redux
- In `useFrame`, read Zustand via `getState()` - never through hooks

### Logic kernel (`src/logic/`)

Five pure, side-effect-free gates. A mirror lives in `server/logic/kernel.js` - keep both in sync when changing math.

1. `veracityGate.ts` - `max(0, V_active - V_control)`
2. `pGate.ts` - 7-cycle confirmation, quorum = `min(N, ceil(sqrt(N)) + 2)`
3. `inverionDivide.ts` - remediation (NOT deletion) of deprecated nodes
4. `abolitionOfPain.ts` - pain threshold enforcement
5. `atrophyTimer.ts` - T_limit = 86,400,000ms (24h)

Constants in `src/logic/types.ts`: `GOLDEN_RATIO`, `THRESHOLD_ENTROPY` (0.07), `CONFIRMATION_CYCLES` (7), `BASE_TICK_RATE` (400ms).

### Server (`server/index.js`)

Plain Node `http.createServer` - **no Express** (despite `server/package.json` listing it; routes are manual `if (url.pathname === ...)` dispatch). Add new endpoints in the same style.

Routes: `/api/health`, `/api/rtsw/latest`, `/api/pgate/engage`, `/api/veracity/calculate`, `/api/quorum/calculate`, `/api/atrophy/calculate`, `/api/kernel/version`, `/api/feedback*`.

`server/feedbackStore.js` persists agent confidence weights to SQLite (`better-sqlite3`). `applyVerdict` nudges weights ±0.1, clamped [0.1, 5.0].

### Python simulation (`server/simulation/`)

Mesa-based ABM (`model.py`, `agents.py`, `network.py`, `free_agents.py`). Fallacy classifier scores statements against `fallacy_data.json`. Bridge to JS ledger via `real_time_bridge.py`.

**Gotcha**: Python venv deletion silently breaks systemd services (`free-agents`, `simulation-abm`, `roberta-classifier`). Check `venv/bin/python` exists first when debugging "works locally, broken on server".

### Training module (`training/`)

Separate Vite app. Entry: `training/src/main.tsx`. Router: `training/src/router/ModuleRouter.tsx`. Modules: `training/src/modules/Module1.tsx` through `Module9.tsx`. Deployed at `kylosarc.com/training/` (WordPress plugin).

Pillar 1 is live (wraps `CognoscentaeUltrans`). Pillars 2–9 are `ModuleStub` placeholders. Don't rename pillars or reorder without updating both `ModuleRouter.tsx` and the live WordPress site.

Fallacy detection engines (`engines/FallacyDataset.ts`, `engines/FallacyMapEngine.ts`) are included in the root `tsconfig.json` and share `fallacy_data.json`.

### 3D visualization

- `src/components/three/ResonanceTrajectory.tsx` - main canvas. `MAX_NODES = 100`. Sierpinski depth ≤ 3 (≥4 crashes browsers).
- `src/components/three/OrbitalRings.tsx` - 5-layer ring HUD, rings face camera.
- Required guards: `isFinite()`/`isNaN()` before `setMatrixAt`, capped deltas (`Math.min(delta, 0.05)`), geometry disposal in `useEffect` cleanup, `frustumCulled={false}` on moving InstancedMesh.

### Cloudflare deployment

`functions/api/*.ts` are Cloudflare Pages Functions versions of gate endpoints. Keep aligned with `server/logic/kernel.js` if math changes.

## Testing

- Vitest configured for `src/**/*.test.ts`, node environment, globals enabled
- Coverage covers `src/logic/**/*.ts` (excludes `src/logic/types.ts`)
- No integration test prerequisites - tests are pure unit tests

## Key Constraints

- TypeScript strict mode: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Path alias: `@/*` → `src/*`
- `tsconfig.json` excludes `training/` from main build (training has its own `tsconfig.json`)
- `.env` is gitignored (6 `.env` files untracked). See `ENVIRONMENT.md` for which keys are load-bearing.

## Repo Hygiene

- Root has large generated/backup artifacts (`backup/`, `*.tar.gz`, `dist/`, SSH keys) - don't treat them as source.
- `kylos-qpadl/` is a git submodule (Rust, post-quantum signatures) - won't appear in this repo's commits.
- `origin/master` and `main` were historically unrelated branches. `master` is superseded; don't merge it again.
- `TOUCHPOINTS.md` is the attack-surface inventory for the crypto subsystem.
