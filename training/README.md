# Sovereign Mirror - CU Training Module

## Overview

Module 1: **Shattering the Darwinian Ghost** - A cognitive training system designed to identify, isolate, and systematically dismantle evolutionary survival impulses that distort reality.

## Architecture

```
training/
├── src/
│   ├── types/           # Core type definitions (InverionState, EpistemicFrame, etc.)
│   ├── engines/         # Fallacy detection and semantic analysis
│   ├── validators/      # Frame validation and invariant checking
│   ├── cluster/         # Manifold deformation and gravity well systems
│   └── interface/       # React components for training UI
```

## Key Components

### 1. EpistemicFrame (`types/index.ts`)
The foundational data frame for training:
- `InverionState` enum: UNSPECIFIED → SUBJECTIVE_NOISE → TRANSITIONAL → OBJECTIVE_REALITY
- `FallacyVector`: Detected cognitive distortions with confidence scores
- `EpistemicFrame`: Header + Payload + Settlement structure

### 2. Fallacy Detection (`engines/FallacyMapEngine.ts`)
Real-time semantic analysis for Darwinian cognitive distortions:
- CU-FALLACY-TRIBALISM (0.90 weight)
- CU-FALLACY-AD-HOMINEM (0.85 weight)
- CU-FALLACY-FALSE-DICHOTOMY (0.70 weight)
- And more...

### 3. Manifold Deformation (`cluster/GravityWell.ts`)
Spatial visualization system translating cognitive distortions into 3D geometry:
- `GravityWell`: Inverse square law displacement
- `ManifoldDeformer`: Mesh deformation engine
- `SemanticBridge`: Maps LLM output to manifold coordinates

### 4. Sliding Window Buffer (`cluster/SlidingWindowBuffer.ts`)
Real-time input stream processing with token-based windowing.

### 5. Training Session (`interface/TrainingSession.ts`)
React hook managing the training session state machine.

### 6. Cognoscentae Ultrans UI (`interface/CognoscentaeUltrans.tsx`)
The visual interface - an active cognitive mirror that visualizes the hidden mechanics of reasoning.

## Usage

```typescript
import { useTrainingSession, InverionState } from './training/src';

function MyComponent() {
  const {
    interceptActive,
    detectedFallacies,
    metrics,
    analyzeInput,
    triggerIntercept,
    resolveIntercept,
  } = useTrainingSession({ 
    nodeId: 'NODE_001',
    onFrameCreated: (frame, rawInput) => {
      // Handle frame creation for ledger settlement
    }
  });

  // Analyze text for cognitive distortions
  const result = analyzeInput("Our team is always right, they are wrong");

  // Intercept triggered if result.inverion_triggered
  if (interceptActive) {
    // User must refactor input to clear
  }
}
```

## Constants

- `FALLACY_CRITICAL_THRESHOLD = 0.15` - Confidence score above which intercept triggers
- `UUID_REGEX` - Validates frame_id as UUIDv4
- `FALLACY_ID_REGEX` - Pattern: `CU-FALLACY-[A-Z_-]+`

## Integration with CU Framework

This training module integrates with the existing Sovereign Mirror system:

1. **Veracity Gate**: Uses `veracityGate(V_active, V_control)` from `src/logic/veracityGate.ts`
2. **Node State**: Works with `NodeAtom` type for tracking veracity scores
3. **Ledger Settlement**: Creates `EpistemicFrame` objects for immutable logging

## Success Criteria

1. **Detection Latency**: Fallacy Map Engine flags linguistic distortion within <150ms
2. **Behavioral Interception**: Interrupt trigger halts outward communication
3. **Decoupling Metric**: Baseline frequency of triggered intercepts drops by ≥75% over 30 days
---

## Session Log - June 2026

### `interface/CognoscentaeUltrans.tsx` - major updates
- Mobile responsiveness: 1-column layout (was 3-column with divider). On `<768px`, `.cui-main` collapses to flex-direction column.
- Loading state: button shows `ANALYZING...` with a spinning indicator while `analyzeInput` is pending. Pulsing dot + "ROUTING TO RO+BERTa · GROQ · OPENROUTER" subtext below.
- Per-fallacy spectrograph: weighted score + per-agent breakdown (groq, openrouter) with `✓` / `✗` verdict buttons that call `markVerdict`.
- LEDGER CORE: was showing "Radical Veracity Passed" regardless of actual state. Now reads `lastBreakdown.weightedScore` directly: shows " - Awaiting first analysis" when null, "Radical Veracity Passed (X.XX < 0.15)" when below threshold, "Radical Veracity Failed (X.XX ≥ 0.15)" in red when above.
- CURRENT box: always shows the latest analyzed text, falling back to current `inputText`.
- Footer: shows `Threshold: 0.15 (score: X.XX)` when a breakdown exists.
- Tooltips on Intercepts, Streak, Weights, Current State, Threshold.

### `interface/TrainingSession.ts` - adaptive weights
- `useTrainingSession` now fetches weights on mount via `useEffect`
- Collects per-agent raw scores: `robertaMax`, `groqScore`, `openrouterMean`
- Computes weighted score: `Σ(agent.score × agent.weight) / Σ(weight)`, clamped to `[0, 1]`
- Logs every analysis to `/api/feedback/analyze` with raw RoBERTa + free-agents responses
- New `markVerdict(statementId, fallacyId, 'correct'|'incorrect')` handler
- Exposes `weights`, `lastBreakdown`, `markVerdict` in hook return
- Added `[TRAINING] analyze complete` and `[TRAINING] statementLog updated` console.log diagnostics
- Added two `useEffect` hooks that log `lastBreakdown` / `statementLog` state changes for debugging

### `engines/FallacyDataset.ts`
- `loadFallacyDataset()` now hits `/classify/fallacy-data` (was `/classify/fallacy-data` - same endpoint, just confirmed)
- `findMatchingFallacy()` uses word-overlap threshold of 0.6 (the existing implementation)

### Decoupling metric
The 30-day "Decoupling Metric" success criterion (#3) requires longitudinal tracking, which is Layer A. Currently `statementLog` holds the last 50 entries in memory; persistence to `/api/history` is pending.

### Open: rebuttal suggestions (item 8 from session plan)
`fallacy_data.json` already has `explanation` and `response` fields per entry. `findMatchingFallacy()` returns the best match. The Ultrans UI just needs a "Suggested Reframe" panel that calls `findMatchingFallacy` on the highest-confidence detected fallacy. No new infrastructure required.
