# Zero-Cost Local Simulation Engine

## Overview
Python-based state machine driver that cycles through operational profiles without external network dependencies. Drives the React UI via file-based state transfer.

## Architecture

```
Python Stream                File Bridge              React Frontend
┌──────────────────┐        ┌─────────────────┐      ┌──────────────────┐
│ simulate_stream  │        │ current_state   │      │ STATE_LOADER     │
│ .py              │ ──────>│ .json           │<─────│ (TypeScript)     │
│                  │        │                 │      │                  │
│ - mock_ledger    │        │ - telemetry     │      │ CORE_GATEWAY     │
│ - 15s cycles     │        │ - metadata      │      │ - validation     │
│ - profiles       │        │ - system        │      │ - uniforms       │
└──────────────────┘        └─────────────────┘      └──────────────────┘
```

## File Structure

```
src/mirror/
├── core/
│   ├── simulate_stream.py      # Python simulation engine
│   ├── mock_ledger.json        # State profile definitions
│   ├── current_state.json      # Live state output (generated)
│   ├── stateFileLoader.ts      # TypeScript file reader
│   └── CryptoWrapper.ts        # Validation gateway
└── SIMULATION_ENGINE.md        # This file
```

## Usage

### 1. Start Python Simulation Stream

```bash
cd src/mirror/core
python3 simulate_stream.py
```

Expected output:
```
================================================================================
SOVEREIGN MIRROR - Zero-Cost Local Simulation Engine
================================================================================
Cycle Interval: 15s
Output File: /path/to/current_state.json
Milestones: 8
================================================================================

[14:32:15] Cycle #001 | STANDARD_OPERATIONAL | ACTIVE   | α=0.820 n=0.120 | particles=4700
[14:32:30] Cycle #002 | STANDARD_OPERATIONAL | SYNCING  | α=0.680 n=0.180 | particles=5000
[14:32:45] Cycle #003 | HIGH_NOISE_FISSION   | ACTIVE   | α=0.450 n=0.880 | particles=5000
...
```

### 2. Integrate with React Frontend

```typescript
import { CORE_GATEWAY } from './mirror/core/CryptoWrapper';
import { STATE_LOADER } from './mirror/core/stateFileLoader';

// Option A: Get current state directly
const state = CORE_GATEWAY.getCurrentSimulationState();
console.log(state.alpha, state.noise, state.temp);

// Option B: Use React hook for auto-updates
import { useSimulationState } from './mirror/core/stateFileLoader';

function MyComponent() {
  const simState = useSimulationState(1000); // Refresh every 1s
  
  return (
    <div>
      <p>Profile: {simState.metadata.profile_type}</p>
      <p>Alpha: {simState.telemetry.alpha}</p>
      <p>Particles: {simState.system.particle_count}</p>
    </div>
  );
}

// Option C: Manual polling in useFrame
function ResonanceTrajectory() {
  useFrame((state, delta) => {
    const uniforms = CORE_GATEWAY.getCurrentSimulationState();
    // Apply uniforms.alpha, uniforms.noise, etc. to mesh
  });
}
```

## State Profiles

### 1. STANDARD_OPERATIONAL
- **Alpha**: 0.68 - 0.91
- **Noise**: 0.12 - 0.18
- **Particles**: 4,700 - 5,000
- **Description**: Normal governance operation with balanced veracity

### 2. HIGH_NOISE_FISSION
- **Alpha**: 0.32 - 0.45
- **Noise**: 0.88 - 0.95 (extreme)
- **Temp**: 0.85 - 0.92
- **Fission Stretch**: 1.42 - 1.48
- **Description**: Dumbbell morphology - toroidal separation under noise stress

### 3. ZERO_ALPHA_STANDBY
- **Alpha**: 0.001 (near-zero)
- **Noise**: 0.03 - 0.05
- **Particles**: 800 - 1,200
- **Description**: Hibernation mode - minimal network activity

## Cycle Sequence

The engine cycles through 8 milestones in 15-second intervals:

1. **Standard Operational** (ACTIVE) → 15s
2. **Standard Operational** (SYNCING) → 15s
3. **High Noise Fission** (ACTIVE) → 15s
4. **High Noise Fission** (SYNCING) → 15s
5. **Zero Alpha Standby** (STANDBY) → 15s
6. **Zero Alpha Standby** (STANDBY) → 15s
7. **Standard Operational** (ACTIVE - Peak) → 15s
8. **High Noise Fission** (ACTIVE) → 15s → Loop

**Total cycle time**: 2 minutes

## Particle Budget Management

The system enforces a maximum of **5,000 particles** to maintain 60fps:

```typescript
const particleCount = STATE_LOADER.getParticleCount();
// Returns: Math.min(state.system.particle_count, 5000)
```

Standby modes reduce particle count to 800-1200 for performance optimization.

## File-Based State Transfer

The `current_state.json` file is updated every 15 seconds:

```json
{
  "metadata": {
    "simulation_timestamp": 1716163200000,
    "cycle_count": 42,
    "current_milestone_id": "profile_fission_001",
    "profile_type": "HIGH_NOISE_FISSION",
    "uptime_seconds": 630
  },
  "telemetry": {
    "alpha": 0.45,
    "noise": 0.88,
    "temp": 0.92,
    "velocity": 0.67,
    "state": "ACTIVE"
  },
  "system": {
    "resonance": 0.41,
    "nodes_count": 63,
    "particle_count": 5000,
    "fission_stretch": 1.42
  },
  "description": "Dumbbell fission mode..."
}
```

## Zero-Cost Validation

All telemetry passes through `CryptoWrapper.ts` which:
1. Validates alpha/noise/temp ranges (0.001 - 0.999)
2. Computes derived uniforms (fission stretch, orbital velocity)
3. Returns normalized values ready for Three.js

**No external crypto imports** - only local FNV-1a hashing for consistency checks.

## Debugging

```typescript
// Check current cycle
console.log('Cycle:', STATE_LOADER.getCycleCount());

// Check profile type
console.log('Profile:', STATE_LOADER.getProfileType());

// Check if in fission mode
if (STATE_LOADER.isFissionMode()) {
  const stretch = STATE_LOADER.getFissionStretch();
  console.log('Fission stretch:', stretch);
}

// Force cache refresh
STATE_LOADER.invalidateCache();
```

## Integration Checklist

- [ ] Python script running in background
- [ ] `current_state.json` updating every 15s
- [ ] Frontend reading from STATE_LOADER
- [ ] Particle count ≤ 5000
- [ ] No imports from `/src/crypto/` in UI layer
- [ ] CryptoWrapper processes all telemetry
- [ ] Canvas renders smoothly across all profiles

## Performance Notes

- **File I/O**: Cached for 1s to reduce disk reads
- **JSON Parse**: Handled by Vite's JSON import (hot-reload enabled)
- **State Updates**: Debounced via refresh interval
- **Particle Budget**: Dynamically adjusted per profile
- **Network Cost**: Zero - pure local file system

## Troubleshooting

**Python script not found**
```bash
# Check Python version
python3 --version

# Make script executable
chmod +x src/mirror/core/simulate_stream.py
```

**State file not updating**
```bash
# Check if script is running
ps aux | grep simulate_stream

# Watch file updates
watch -n 1 cat src/mirror/core/current_state.json
```

**Frontend not reflecting changes**
- Check browser console for import errors
- Verify Vite dev server is watching JSON files
- Call `STATE_LOADER.invalidateCache()` to force refresh

---

## Session Log - June 2026

### Actual current architecture
The Python `simulate_stream.py` is not currently running. The visualization is driven by `BrowserSimulation.ts` (a TypeScript equivalent that runs entirely in the browser, no Python process required).

The file `current_state.json` exists in the repo and is updated by the Python stream when present, but the BrowserSimulation engine takes precedence when the Python stream is absent.

### Hetzner production
On the Hetzner server (`178.156.135.222`), `current_state.json` is served by nginx from `/opt/sovereign-mirror/dist/current_state.json`. The browser polls it via `getVisualPayload()` (in `src/mirror/core/CryptoWrapper.ts`) every 500ms. There's no ABM Python service running on the server in this configuration.

### ABM service (Port 5001)
- Server: `simulation-abm.service` (systemd)
- Status: running but the high-rate `/api/ledger/entry` writes were causing the rate-limit cascade that broke `setStatementLog` and `setLastBreakdown` in the user's browser (fixed in this session by per-`(ip, path)` rate-limit keying)
- Future: would benefit from batching writes (see open question in `PLAN-Agent-Based-Simulations.md`)

### Future work
- The Python `simulate_stream.py` script could be re-enabled on the Hetzner server to drive more realistic state updates
- The `BrowserSimulation.ts` profiles (8 milestones, 15s cycle) are simpler than the Python stream and don't include the ABM's game-theory payoffs
- A unified state source (Python ABM → current_state.json → BrowserSimulation fallback) would be cleaner

### File path changes
- `src/mirror/core/current_state.json` is the live file, not `dist/active_state.json`. The dist file was used by the earlier Cloudflare deployment and is no longer authoritative.
