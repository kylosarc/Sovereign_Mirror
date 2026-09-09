# Sovereign Mirror - Technical Specification

## Objective

Sovereign Mirror is a distributed governance simulator built on Radical Veracity principles. It visualizes the interplay between veracity scores, p-gate confirmations, and node physicalization through a symbolic 3D environment with golden threads and Sierpinski fractal morphing.

**Target users:** Developers and researchers exploring decentralized governance models.

**Success criteria:**
- 60fps rendering with up to 2000 particles
- Veracity gate correctly enforces V_active - V_control
- P-gate requires 7 confirmation cycles with quorum formula
- Atrophy timer triggers at T_limit (86400000ms)
- Redux Ledger maintains immutable audit trail

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18.2 |
| Language | TypeScript | 5.3 |
| 3D Engine | Three.js | 0.160 |
| 3D React | @react-three/fiber | 8.15 |
| 3D Utils | @react-three/drei | 9.92 |
| State (Atoms) | Jotai | 2.6 |
| State (HUD) | Zustand | 4.5 |
| State (Ledger) | Redux Toolkit | 2.11 |
| Styling | Tailwind CSS | 3.4 |
| Build | Vite | 6.4 |

## Commands

```bash
# Development
npm run dev              # Start Vite dev server (port 5173)

# Production
npm run build            # TypeScript check + Vite build
npm run preview          # Preview production build

# Server
npm run server           # Run Node.js Express server
```

## Project Structure

```
src/
├── components/
│   ├── three/                    # 3D visualization
│   │   └── ResonanceTrajectory  # Main WebGL canvas
│   ├── ui/                      # React UI components
│   │   ├── Dashboard            # Main layout orchestrator
│   │   ├── Background          # Animated gradient background
│   │   ├── SystemicSliders     # Temperature, noise, flux controls
│   │   └── PGateButton         # P-gate trigger button
│   └── hud/                     # HUD layer displays
│       └── VeracityLog          # Redux-connected audit log
├── state/
│   ├── stores/                  # Zustand stores
│   │   ├── hudStore.ts          # temperature, noiseFilter, sunriseOpacity
│   │   └── nodeStore.ts         # flux, nodeIds
│   ├── atoms/                   # Jotai atoms
│   │   └── nodeAtoms.ts         # pGateConfirmation families
│   ├── ledger/                  # Redux Toolkit
│   │   ├── store.ts
│   │   └── slices/
│   │       ├── veracitySlice.ts
│   │       └── physicalizationSlice.ts
│   └── syncBridge/              # Zustand → Redux sync
│       └── syncBridge.ts
├── logic/                       # Pure functions (5 mandatory gates)
│   ├── veracityGate.ts          # max(0, V_active - V_control)
│   ├── pGate.ts                 # 7-cycle confirmation, quorum
│   ├── inverionDivide.ts        # Node remediation (NOT deletion)
│   ├── abolitionOfPain.ts        # Pain threshold enforcement
│   └── atrophyTimer.ts           # T_limit: 86400000ms
├── services/
│   └── apiService.ts            # Client-side API wrapper
├── App.tsx                      # Root component
├── main.tsx                     # React entry point
└── index.css                    # Tailwind + custom utilities

server/
└── index.js                     # Express server fallback

agent-skills/                   # AI agent skills
├── skills/
│   ├── spec-driven-development/
│   ├── frontend-ui-engineering/
│   ├── debugging-and-error-recovery/
│   └── incremental-implementation/
├── CLAUDE.md
├── AGENTS.md
└── README.md
```

## State Architecture

| Layer | Library | Purpose |
|-------|---------|---------|
| Atoms | Jotai | Per-node reactive state (pGate confirmation families) |
| HUD | Zustand | Flux, noise, sunrise opacity, temperature, tick rate |
| Ledger | Redux | Veracity log, physicalization events, audit trail |

### Zustand Stores

**hudStore.ts:**
```typescript
interface HUDState {
  temperature: number;      // Boltzmann temperature (0-1)
  noiseFilter: number;     // Thermodynamic flux (0-1)
  sunriseOpacity: number;  // Background gradient opacity (0-1)
  effectiveTickRate: number; // Current tick rate in ms
  setTemperature: (t: number) => void;
  setNoiseFilter: (n: number) => void;
  setSunriseOpacity: (s: number) => void;
  setEffectiveTickRate: (t: number) => void;
}
```

**nodeStore.ts:**
```typescript
interface NodeState {
  flux: number;           // Resonance flux (0-1)
  nodeIds: string[];       // Active node identifiers
  setFlux: (f: number) => void;
  addNode: (id: string) => void;
  removeNode: (id: string) => void;
}
```

### Jotai Atoms

**nodeAtoms.ts:**
```typescript
// Per-node pGate confirmation state
export const pGateConfirmationFamily = atomFamily(
  (nodeId: string) => atom({
    confirmed: boolean;
    cycleCount: number;  // 0-7 cycles
    timestamp: number;
  })
);
```

### Redux Slices

**veracitySlice.ts:**
- Tracks V_active, V_control, velocity
- Logs VERACITY_CALCULATED, VERACITY_GATE_CROSSED events

**physicalizationSlice.ts:**
- Tracks P-gate state per node
- Logs P_GATE_ACTIVATED, P_GATE_TRIGGERED, QUORUM_REACHED events

## Logic Kernel (5 Mandatory Gates)

All logic functions MUST remain pure. No side effects, no state mutations.

### 1. veracityGate.ts

```typescript
export function veracityGate(V_active: number, V_control: number): number {
  return Math.max(0, V_active - V_control);
}
```

### 2. pGate.ts

```typescript
// 7-cycle confirmation protocol
export function pGate(nodeId: string, affirmingNodes: number, totalNodes: number): {
  triggered: boolean;
  quorumSize: number;
} {
  const quorum = Math.min(totalNodes, Math.ceil(Math.sqrt(totalNodes)) + 2);
  const triggered = affirmingNodes >= quorum;
  return { triggered, quorumSize: quorum };
}
```

### 3. inverionDivide.ts

Remediation (NOT deletion) of deprecated nodes.

```typescript
export function inverionDivide(nodeId: string, reason: string): {
  action: 'remediate' | 'preserve';
  nodeId: string;
  reason: string;
} {
  // Remediation preserves node in deprecated state for audit
  return { action: 'remediate', nodeId, reason };
}
```

### 4. abolitionOfPain.ts

Pain threshold enforcement.

```typescript
export function abolitionOfPain(currentPain: number, threshold: number): boolean {
  return currentPain >= threshold;
}
```

### 5. atrophyTimer.ts

```typescript
export const ATROPHY_T_LIMIT = 86400000; // 24 hours in ms

export function atrophyTimer(lastActivity: number, currentTime: number): boolean {
  return (currentTime - lastActivity) >= ATROPHY_T_LIMIT;
}
```

## Key Constants

```typescript
GOLDEN_RATIO = 0.618
THRESHOLD_ENTROPY = 0.07  // ±7.0%
ATROPHY_T_LIMIT = 86400000
CONFIRMATION_CYCLES = 7
BASE_TICK_RATE = 400      // ms
MAX_NODES = 100           // InstancedMesh limit for stability
```

## Visualization

### ResonanceTrajectory.tsx

Main 3D canvas using React Three Fiber. Renders particles with custom GLSL shaders.

**Features:**
- 2000 particles with glowing cores (custom shader)
- NOAA solar wind data driving animation (speed, density, Bz)
- HSL-based color mapping (hue shifts with speed/density)
- Background star field (500 points)
- Animated glow ring responding to flux
- Camera rig with subtle orbital movement

**Shaders:**
- Vertex: size attenuation based on distance
- Fragment: soft glow with bright core

**Data flow:**
1. Fetch NOAA data every 6 seconds
2. Smooth values via lerp (0.02 factor)
3. Calculate normalized speed/density/gust
4. Update particle positions and colors each frame
5. Use ACES filmic tone mapping for color reproduction

### Background.tsx

Animated gradient responding to `sunriseOpacity` from Zustand.

```css
radial-gradient(ellipse at 50% 100%,
  rgba(251, 146, 60, ${opacity * 0.4}) 0%,
  rgba(244, 63, 94, ${opacity * 0.2}) 40%,
  transparent 70%
)
```

### VeracityLog.tsx

Redux-connected terminal-style display of ledger events.

**Events displayed:**
- VERACITY_CALCULATED, VERACITY_GATE_CROSSED (amber)
- P_GATE_ACTIVATED, P_GATE_TRIGGERED, QUORUM_REACHED (rose)
- NODE_PHYSICALIZED, PHYSICALIZATION_REJECTED (rust)

## Code Style

### TypeScript
- Strict mode enabled
- No unused locals or parameters
- Use `interface` for object shapes, `type` for unions/primitives
- Prefer explicit return types on exported functions

### Naming
- Components: PascalCase (ResonanceTrajectory, SystemicSliders)
- Functions/variables: camelCase (calculateQuorum, nodeIds)
- Constants: SCREAMING_SNAKE_CASE (GOLDEN_RATIO, MAX_NODES)

### Error Handling
- Validate all math operations with `isFinite()` before assignment
- Guard against NaN: `if (isNaN(matrix.elements[0])) continue`
- Cap deltas: `Math.min(delta, 0.05)` to prevent huge jumps
- Use `Math.min(value, 0.99)` to prevent singularities

### Three.js / R3F
- InstancedMesh: always set `frustumCulled={false}` when instances move
- Geometry disposal: always dispose in useEffect cleanup
- useFrame: read Zustand state via `getState()` inside useFrame, not through hooks

## Color System

| Token | Hex | Usage |
|-------|-----|-------|
| `dawn-obsidian` | `#0F172A` | Background, dark panels |
| `ultranetic-amber` | `#FB923C` | Accents, tick rate, slider values |
| `radiant-cream` | `#FFF7ED` | Labels, text highlights |
| `physical-rose` | `#F43F5E` | P-Gate active state, physicalization |
| `healed-sage` | `#86EFAC` | Positive indicators, "LIVE" dot |
| `deprecated-rust` | `#DC2626` | Atrophy/audit markers |

## Boundaries

### Always Do
- Run TypeScript check before build: `npm run build`
- Validate math with isFinite() guards
- Dispose geometries in useEffect cleanup
- Use syncBridge to keep Zustand/Redux in sync

### Ask First
- Adding new dependencies
- Changing state architecture
- Modifying the 5 mandatory gates
- Increasing MAX_NODES above 100

### Never Do
- Commit secrets or API keys
- Remove the veracity gate logic
- Change the p-gate quorum formula
- Increase Sierpinski depth above 3

## Testing

```bash
# Test specific logic module
npx tsx src/logic/pGate.ts
```

No formal test framework configured yet. Manual testing via dev server.

## Open Questions

- [ ] What is the expected rate of veracity score updates?
- [ ] Should the ledger persist to localStorage?
- [ ] What triggers sunriseOpacity changes?
- [ ] Is there a maximum node count for quorum calculation?
---

## Session Log - June 2026

### Tech stack actual versions
| Component | Technology | Actual version in `package.json` |
|-----------|------------|----------------------------------|
| Framework | React | 18.2 |
| Language | TypeScript | 5.3 |
| 3D Engine | Three.js | 0.160 |
| 3D React | @react-three/fiber | 8.15 |
| 3D Utils | @react-three/drei | 9.92 |
| State (Atoms) | Jotai | 2.6 |
| State (HUD) | Zustand | 4.5 |
| State (Ledger) | Redux Toolkit | 2.11 |
| Styling | Tailwind CSS | 3.4 |
| Build | Vite | **7.3** (was 6.4 in earlier docs) |
| `better-sqlite3` | NEW | used by `server/feedbackStore.js` for weight persistence |

### `src/components/three/OrbitalRings.tsx` - major rewrite
5-layer concentric ring system (was 3 thin layers). All face the camera. Includes spokes, particles, wireframe outer sphere, reticle crosshair, pulse ring, glow ring. See commit `f2f5641` for details.

### `src/components/three/ResonanceTrajectory.tsx`
- Kinetic particle opacity reduced 0.65 → 0.35 (was drowning the orbital rings)
- ResizeObserver now explicitly sets `canvas.style.width/height` to match container

### `src/components/ui/Dashboard.tsx`
- `<main>` changed from `md:overflow-hidden` to `md:overflow-hidden overflow-y-auto` - fixes mobile clipping
- Cognoscentae Ultrans wrapper uses `.cui-wrapper` (min/max-height + overflow), collapsible to 1 column on mobile

### State slices - added
- `src/state/ledger/ledgerThunks.ts`: thunks for `fetchLedgerHistory`
- `src/state/middleware/ledgerPersist.ts`: persists `veracity/logEvent` and `physicalization/triggerPhysicalization` actions to `/api/ledger/entry`

### New files
- `server/feedbackStore.js`: SQLite-backed adaptive weight store
- `src/state/ledger/ledgerThunks.ts`
- `src/state/middleware/ledgerPersist.ts`
- `test_openrouter.py`: smoke test for OpenRouter integration (legacy; OpenRouter currently disabled)

### New endpoints
- `GET /api/feedback/weights`
- `POST /api/feedback` (verdict → updates weights + logs)
- `GET /api/feedback/history?limit=N`
- `POST /api/feedback/analyze` (logs every analysis run)
- `GET /api/feedback/analyses?limit=N`

### Known issues addressed this session
- **Empty statement log** after analyze: caused by rate-limit cascade (ABM flooding `/api/ledger/entry` and starving the user's analyze request). Fixed with per-`(ip, path)` keying in the rate limiter.
- **Test API button "fails to set alpha 0.75"**: the P-Gate *was* engaging at 0.75 server-side, but the UI gave no visual confirmation. Added status box in `PGateButton.tsx` showing actual flux value and a `✓ Flux set to 0.75` / `✗ Flux mismatch` indicator.
