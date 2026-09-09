# Pilot Committee - Technical Specification

Status: design only. Nothing in this document is implemented yet. This spec
exists to be reviewed and argued with before code changes it describes.

## Scope

One committee. Not "the network." This pilot deliberately does not attempt
federation, cross-committee aggregation, or civilizational scale - see
`MANIFESTO.md`, Boundedness. Success here is the precondition for ever
discussing a second committee, not a formality on the way to one.

**Explicit non-goals for this pilot:**
- Multi-committee federation / aggregation layer
- Raising `MAX_NODES` above what this committee actually needs
- Any claim about "the system" scaling - this spec is about one committee's
  math being sound, nothing more

## Committee formation

**Sortition selection.** Members are drawn at random from the active node
pool, not self-nominated and not appointed. Random selection is the only
mechanism in this spec that doesn't require a value judgment about who
deserves a seat - it's the closest thing to a neutral admission rule
available, and it should be named as a choice, not hidden as a default.

**Size.** N = 25, giving f = 8 (from N ≥ 3f + 1 → f = 8 is the largest
tolerable fault count at N = 25). This replaces `MAX_NODES = 100` as an
arbitrary visualization cap - 25 is a number chosen because the fault
tolerance math is provable at that size, not because it fits in an
`InstancedMesh` nicely.

## Quorum: honest derivation, shown against the current formula

**Current formula** (`src/logic/pGate.ts:177`, duplicated in
`server/logic/kernel.js`, `functions/api/quorum.ts`):

```
quorum = min(N, ceil(sqrt(N)) + 2)
```

At N = 25 this gives `quorum = 7`. Seven affirming nodes out of 25 is 28%  - 
barely more than a fifth of the committee, with **zero proven fault
tolerance**. This formula was never derived from a safety property; it was
chosen because it looked reasonable and scales sub-linearly, which was
mistaken for a security property. It isn't one.

**Proposed formula**, standard PBFT-style byzantine quorum (Lamport,
Shostak, Pease 1982; Castro & Liskov 1999):

```
N ≥ 3f + 1        (safety requires more than 2/3 honest)
quorum = 2f + 1   (affirming votes needed to trigger)
```

At N = 25, f = 8, **quorum = 17** (68%). This is a real supermajority with
a provable guarantee: the committee cannot be forced to a false positive or
a false negative by any coalition of 8 or fewer compromised/wrong members.
The old formula had no such guarantee at any coalition size above 6-7
members acting together - a coalition that small could already dominate a
7-vote quorum.

**This delta is the whole point of doing this honestly.** The old formula
produces a quorum three times smaller than the real one, and the difference
between them is exactly the gap between "looks like security" and "is
security."

## Fallacy classifier: retired from governance, confined to training

**Decision (2026-07-08): the RoBERTa classifier (`server/simulation/fallacy_classifier.py`)
is not used in any governance context - not gating, not advisory, not one
input among others. Zero role.** This is stronger than the pilot's earlier
"advisory only" stance, and it's based on accumulated, verified evidence,
not a hunch:

1. Only 4.0% of `fallacy_data.json`'s 1,661 labeled entries match one of the
   classifier's 13 actual output classes; the rest would need an explicit
   rollup mapping never built, or exclusion as out-of-scope.
2. Zero non-fallacious (negative) examples exist in the dataset - recall on
   "no fallacy present" has never been measurable.
3. The documented threshold pipeline (`SOVEREIGN_MIRROR_SYSTEM.md`:
   `FALLACY_CRITICAL_THRESHOLD=0.15` / `ROBERTA_THRESHOLD=0.60`, three
   tiers) does not match what's actually running in
   `training/src/interface/TrainingSession.ts:371` (two tiers, gated on
   0.15 alone; `ROBERTA_THRESHOLD` has zero references anywhere in the live
   code). The shipped system intercepts content 4x more aggressively than
   documented, undiscovered until this review.
4. The self-correction loop this classifier was supposed to have  - 
   `applyVerdict()` in `server/feedbackStore.js`, adjusting agent weights
   from human verdicts - has **never fired**: `feedback_events` has 0 rows,
   checked directly against the live database. The passive analysis log
   fares little better: `analysis_events` has 2 rows total, despite
   substantially more manual testing having been run through the training
   module. [TrainingSession.ts:427](../training/src/interface/TrainingSession.ts)
   posts to `/api/feedback/analyze` and silently swallows the result with
   `.catch(() => {})` - any failure there is invisible, which is the likely
   proximate cause.

**What replaces it:** the certified logic doyen (human, yearly-retested)
is the actual authority on fallacy type and falsifiability in any
governance context - see the doyen certification discussion. The local,
deterministic regex engine (`training/src/engines/FallacyMapEngine.ts`) is
the more defensible automated signal where one is wanted at all: fully
auditable pattern matching with no external model, no opaque training-data
provenance, no silent black box.

**Where RoBERTa still lives:** the Nine Pillars training module only
(`CognoscentaeUltrans.tsx`, Pillar 1 - Intellectual Veracity). Being wrong
there is low-stakes and pedagogically useful - a bad flag becomes the
teaching moment the doyen concept already describes. It has no bearing on
any node's standing, resources, or dispute outcomes.

**Deferred, not abandoned:** a real population-scale, cross-rater fallacy
consensus system - Community-Notes-style, but for fallacy classification  - 
remains a legitimate future direction. It's parked because a single
annotator can't produce reliable ground truth, a large population still
risks being "largely inaccurate - a complete disaster" without real rigor
behind it, the task is plausibly harder in idiom-dense adversarial registers
than in more literal text, and the computational/logistical cost of doing
it properly is closer to Community Notes' actual infrastructure spend than
to a quick add-on. Revisit when there's time and care to give it, not before.

## The threshold ledger

A new, append-only log - same audit-trail pattern as
`src/state/ledger/` (Redux), pointed at policy instead of node state.

**Schema, per entry:**

| Field | Purpose |
|---|---|
| `constant_name` | e.g. `PGATE_QUORUM_F`, `FALLACY_CONFIDENCE_THRESHOLD` |
| `value` | The number itself |
| `set_by` | Who made this call - a person, not "the system" |
| `set_at` | Timestamp |
| `rationale` | Why this value, in prose, not a formula alone |
| `error_mode_estimate` | What this value costs in false positives/negatives, if known; "unknown, not yet benchmarked" is a valid and required answer when true |
| `review_date` | When this must be re-examined |
| `superseded_value` | What it replaced, if anything |
| `appeal_path` | Where to contest this value |

**Enforcement, not just schema:** a scheduled job flags any entry whose
`review_date` has passed as `STALE` in the audit log and surfaces it in the
`VeracityLog` HUD component the same way `PHYSICALIZATION_REJECTED` events
are surfaced today. A stale threshold is a defect of the same class as a
failing test - visible, not silently inherited.

## Humility mechanisms as system requirements

Not prose - each of these needs an actual implementation before the pilot
can be called complete:

1. **Calibration tracking job.** Compare every gate's stated confidence
   against outcomes once known; compute a Brier score or equivalent;
   publish it via a `/api/feedback/calibration` endpoint (extends the
   existing `feedbackStore.js` pattern, which already tracks per-agent
   weight adjustment - this generalizes it to the gates themselves).
2. **Sunset enforcement.** The scheduled job described above under the
   threshold ledger.
3. **Dissent capture.** `pGate.ts`'s confirmation logic needs to log which
   nodes did *not* affirm and, where available, why - not just the
   affirming count. This is a real code change to `checkPGateConfirmation`'s
   return shape, not a UI addition.
4. **Scope-of-validity strings.** Every API response that includes a score
   (`/api/veracity/calculate`, `/api/pgate/engage`, `/api/quorum/calculate`)
   gets a `scope_of_validity` field. No score ships without one.

## Success / failure criteria, written down now

**Pilot succeeds if:**
- The quorum math holds under a simulated coalition of exactly f = 8
  adversarial members (it should resist; a coalition of 9 should not be
  guaranteed to be resisted, and that boundary should be demonstrated, not
  assumed).
- The fallacy classifier's benchmark gaps are closed and a real confusion
  matrix is published, however unflattering.
- At least one threshold in the ledger gets contested and changed through
  the appeal path during the pilot window, proving the path is real and
  not decorative.

**Pilot fails if:**
- The quorum guarantee is asserted but never actually tested against a
  simulated coalition.
- Any score ships without a `scope_of_validity` string.
- No threshold is ever contested - which would mean either the system is
  perfect (implausible) or the appeal path is unused/undiscoverable
  (likely, and worth stating plainly if it happens).

## Mapping to existing code

| Requirement | File(s) to change |
|---|---|
| Quorum formula | `src/logic/pGate.ts`, `server/logic/kernel.js`, `functions/api/quorum.ts` - all three, kept in sync |
| Dissent logging | `checkPGateConfirmation` in `src/logic/pGate.ts` |
| Threshold ledger | New: `src/state/ledger/slices/thresholdLedgerSlice.ts`, mirroring `veracitySlice.ts` |
| Calibration tracking | Extends `server/feedbackStore.js` |
| Scope-of-validity strings | `server/index.js` API handlers, `functions/api/*.ts` |
| Fallacy benchmark | New: `server/simulation/benchmark_fallacy_classifier.py`, needs a negative-example set and rollup mapping (both currently undecided - see open questions) |

## Open questions this spec does not resolve

- Who builds the negative-example set for the fallacy benchmark, and from
  what source, so it isn't just synthesized to be easy to classify?
- Who has standing to use the appeal path - any node, or only committee
  members? This is a governance-layer choice, not an engineering one, and
  it should be made explicitly rather than defaulted.
