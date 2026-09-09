File: SYSTEM_LOGIC.md

Project Goal: Build 'The Sovereign Mirror' Evolution Simulator.

Core Logic Gates:

1. Veracity Gate: Signal influence must be calculated as $V_{active} - V_{control}$. If $V_{control} > V_{active}$, the signal weight is 0.00.

2. Physicalization Gate (P-Gate): A boolean switch. isReadyToPhysicalize is true ONLY when NodeResonance > ProjectThreshold.

3. The Inverion Divide: A reserved data-class for history revisionism protocols.

4. Abolition of Pain Protocol: A global constant that forces the system to prioritize projects that reduce SystemicFriction.

5. Atrophy Timer: A recursive function that decays VirtualResonance if not applied to a physicalized project within T_limit.

---

## Session Log - June 2026

### Core logic gates - verified pure
All five gates (`veracityGate`, `pGate`, `inverionDivide`, `abolitionOfPain`, `atrophyTimer`) remain pure functions. No side effects, no state mutations. Validated in `src/logic/`.

### Threshold re-tuning
- `ROBERTA_THRESHOLD`: 0.50 → **0.60** (free-agent validation only triggered on stronger RoBERTa signals; reduces noise)
- `WORD_COUNT_CAP`: 200 (free agents skipped on long statements)
- `FALLACY_CRITICAL_THRESHOLD` unchanged at 0.15 (radical veracity pass/fail)

### Adaptive weight logic (NEW in `server/feedbackStore.js`)
- `applyVerdict(verdict, agentScores)`:
  - `correct`: agents that voted `detected` get `+0.1` weight; agents that voted `not detected` get `-0.1`
  - `incorrect`: reverse - agents that voted `not detected` get `+0.1`; agents that voted `detected` get `-0.1`
- All weights clamped to `[0.1, 5.0]`
- Stored in SQLite at `/opt/sovereign-mirror/data/feedback.db`, table `agent_weights` (PRIMARY KEY = agent name)

### Cross-cluster considerations
The atrophytimer and pGate logic remain cluster-portable. The `feedbackStore` is a per-node store today; in a multi-node federation, weights would be synchronized via the Ledger (every verdict and every analysis already gets logged).
