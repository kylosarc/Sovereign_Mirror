# Logic Kernel

The logic kernel implements the five mandatory gates of the Sovereign Mirror governance system. All gates are pure functions with no side effects, enabling deterministic verification and testing.

## The Five Gates

### 1. Veracity Gate (`veracityGate.ts`)

**Formula:** `V = max(0, V_active - V_control)`

The core truth-derivation function. Veracity emerges from the difference between active contribution and control friction. When control exceeds activity, veracity is zero - not negative. Truth cannot be borrowed or leveraged into existence.

- `active`: Direct contribution to the system
- `control`: Friction from resonance weighted by the friction multiplier

### 2. P-Gate (`pGate.ts`)

**Quorum Formula:** `Q = min(N, ceil(sqrt(N)) + 2)`

The physicalization gate governs transition from virtual to physical state. Requires:
- Resonance above threshold (GOLDEN_RATIO * 1.07)
- 7 consecutive confirmation cycles
- Quorum of affirming nodes

The confirmation window prevents reactive voting. Deliberation over impulse.

### 3. Inverion Divide (`inverionDivide.ts`)

**Principle:** Remediation, not deletion

Deprecated entries are tombstoned, not removed. Healing is always possible. The causal chain is preserved for audit. Veracity impact of healed entries is zero, but the record remains.

This reflects the system's commitment to truth over convenience - history cannot be erased, only reconciled.

### 4. Abolition of Pain (`abolitionOfPain.ts`)

**Principle:** `friction === Infinity` indicates pain-inducing state

Selects lowest-friction paths. When all paths are blocked (Infinity), the system acknowledges the pain state rather than forcing a bad choice.

Maps to Pillar 7: Physical Wellbeing - maintenance of the pain-free state through system design, not enforcement.

### 5. Atrophy Timer (`atrophyTimer.ts`)

**Formula:** `V * (0.95)^floor(elapsed / T_LIMIT)`

Virtual resonance decays over time. T_LIMIT is 24 hours. Decay rate is 0.95 per period. After ~145 days of inactivity, a node atrophies completely.

This ensures engagement remains current. Credentials cannot be hoarded indefinitely.

## Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| GOLDEN_RATIO | 0.618 | Base threshold for P-Gate |
| THRESHOLD_ENTROPY | 0.07 | ±7% tolerance band |
| ATROPHY_T_LIMIT | 86,400,000ms | 24 hours |
| ATROPHY_DECAY_RATE | 0.95 | Per-period decay |
| CONFIRMATION_CYCLES | 7 | Required cycles for P-Gate |

## The Nine Pillars

The `pillarMastery` array in NodeAtom tracks contribution across nine domains:

| Index | Pillar | Domain |
|-------|--------|--------|
| 0 | Intellectual Veracity | Mastery of Logic |
| 1 | Emotional Regulation | End of Aggression |
| 2 | Environmental Stewardship | Planetary Healing |
| 3 | Community Synthesis | Unified Action |
| 4 | Technical Literacy | System Knowledge |
| 5 | Collaborative Governance | Collective Participation |
| 6 | Physical Wellbeing | Abolition of Involuntary Pain |
| 7 | Creative Contribution | Knowledge Growth & Expression |
| 8 | Privacy Guardianship | Data Sovereignty |

## Testing

```bash
npm install
npm test
```

All gates have comprehensive test coverage in `*.test.ts` files.

---

## Session Log - June 2026

### Five gates - verified pure
All five gates remain pure functions:
- `veracityGate(V_active, V_control): max(0, V_active - V_control)`
- `pGate(nodeId, affirming, total): { triggered, quorumSize }` where `quorum = min(N, ⌈√N⌉ + 2)`
- `inverionDivide(nodeId, reason): { action: 'remediate', nodeId, reason }` (NEVER `'delete'`)
- `abolitionOfPain(currentPain, threshold): boolean`
- `atrophyTimer(lastActivity, currentTime): boolean` (T_LIMIT = 86,400,000ms = 24h)

### Verifications
- No state mutations in any gate
- No side effects (no I/O, no logging)
- All inputs are typed as `number` or `string`, all outputs are typed
- No `Date.now()` or `Math.random()` calls inside gates (deterministic given inputs)

### Adaptive weight logic (NOT a gate)
The new adaptive weighting system in `server/feedbackStore.js` is a *learning layer* on top of the gates, not a gate itself. The gates remain pure and deterministic; the learning layer is in the storage/feedback pipeline.

### Constants actual
```typescript
GOLDEN_RATIO = 0.618
THRESHOLD_ENTROPY = 0.07  // ±7.0%
ATROPHY_T_LIMIT = 86400000
ATROPHY_DECAY_RATE = 0.95
CONFIRMATION_CYCLES = 7
FALLACY_CRITICAL_THRESHOLD = 0.15
ROBERTA_THRESHOLD = 0.60  // up from 0.50 in earlier docs
WORD_COUNT_CAP = 200
```

### Atrophy decay
Decay rate 0.95 per 24h period means a node atrophies to <1% of its starting value after ~145 days of inactivity (`0.95^145 ≈ 0.0006`). Confirmed in current code.
