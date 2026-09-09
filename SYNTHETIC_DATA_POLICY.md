# Synthetic Data Policy — A Living Record

Status: living document. New synthetic data generators or datasets entering
this project get an entry here before they're used for anything load-bearing,
not after. This is not a one-time disclosure — it's an append-only record,
same spirit as the threshold ledger in `PILOT_COMMITTEE_SPEC.md`.

## Why this exists

Synthetic data is genuinely useful and genuinely underregulated. The risk
isn't hypothetical for this project specifically: if a synthetic dataset
feeds a governance decision, a certification exam, or a stress test, and
nobody documented where it came from or what it silently assumes, the
system is trusting something nobody actually checked. That's the same
failure mode as an undocumented threshold, an unbenchmarked classifier, or
an unverified NOAA dependency — just aimed at data instead of a number or
a live feed.

This framework converges independently on the shape of existing serious
work in the field — **Datasheets for Datasets** (Gebru et al.), **Model
Cards for Model Reporting** (Mitchell et al.), and the disclosure
requirements emerging in the EU AI Act (Article 50) and NIST's synthetic
content guidance. Worth naming that plainly: this isn't a new invention,
it's applying an existing, recognized discipline to this project
specifically, with a few additions those standard frameworks don't require.

## The documentation template

Every synthetic dataset or generator used in this project needs an entry
covering:

1. **Identification** — the generating entity, the authorizing entity (who
   approved its use here, which may not be the same party who generated
   it), the source/seed data used, **and the rights basis for that source
   data** (license, consent, public domain — not just its name), and the
   models used to generate it.
2. **Categories of data** — explicit enumeration, not a placeholder. What
   modality/structure/content type does this cover (synthetic dialogue,
   synthetic interaction graphs, synthetic numeric time series, etc.)?
3. **Users and markets** — who actually uses this data, in what markets,
   at what intended scale.
4. **Intended end use** — the intended end users, their targets, the use
   cases, the intended scale, **and explicit out-of-scope/prohibited
   uses** — what this data should never be used for, stated as plainly as
   what it should.
5. **Purpose** — how this data is meant to help its users and their
   targets, in plain language.
6. **Known limitations** — biases, privacy considerations, preprocessing
   steps applied, and areas where the data is not suitable. One section,
   not split across two.
7. **Explicit generator/environment assumptions** — what the generator or
   simulation silently assumes about the world in order to produce this
   data, stated instead of left implicit.
8. **Quality measures** — fidelity and utility, with whatever evidence
   backs those claims.
9. **Risk assessment** — bias and corruptibility potential (could this
   dataset be deliberately poisoned after release, and would anyone
   notice), monitoring approach, and mitigation plan.
10. **Privacy-preserving techniques** — differential privacy or other
    safeguards applied, and their known limitations.
11. **Retention/deletion policy** — separate from version control. When
    does this dataset expire or get deleted, not just how its revisions
    are tracked.
12. **Downstream distinguishability** — how a consumer of this data,
    possibly outside this system entirely, can tell it's synthetic. Data
    that doesn't carry this marking risks being re-ingested elsewhere as
    if it were real — the same failure mode ML research calls model
    collapse, just not yet named as a risk to this project until now.
13. **Standards/certification adherence** — any registry, protocol, or
    governmental/civil-society standard this claims to follow.
14. **Independent verification** — who attested this entry's accuracy
    besides the generating entity itself. Self-graded documentation isn't
    documentation, it's marketing — same rule already applied to the
    fallacy classifier's confidence scores and the appeal panel's fairness.
15. **Version control entry** — see the dataset ledger below.

## The dataset ledger

Same audit-trail pattern as the threshold ledger
(`PILOT_COMMITTEE_SPEC.md`), adapted for datasets instead of policy
constants:

| Field | Purpose |
|---|---|
| `dataset_name` | e.g. `fallacy_data.json`, `quorum_adversarial_coalition_v1` |
| `version` | |
| `generated_by` | The entity/process that produced it |
| `authorized_by` | Who approved its use in this project |
| `generated_at` | |
| `source_seed_data` | What it was seeded from, and its rights basis |
| `models_used` | |
| `rationale` | Why this dataset, why this version |
| `attested_by` | Independent verifier, distinct from `generated_by` |
| `review_date` | When this must be re-examined |
| `superseded_version` | What it replaced, if anything |
| `appeal_path` | Where to contest this dataset's use or claims about it |
| `distinguishability_marking` | How downstream consumers can tell this is synthetic |

## Current inventory

Applying the template honestly against what already exists or is already
planned in this project — most of this is currently **undocumented**,
which is the point of starting the record now rather than continuing
without one.

### `fallacy_data.json` — first real entry, worked example

- **Identification**: generated by Google's Gemini models (1.5 Flash,
  Experimental, and Pro) via Vertex AI. Authorizing entity for its use in
  this project: unclear — adopted as "the fallacy dataset" without an
  explicit approval record. Source/seed data: Wikipedia's list of
  fallacies, PDF backup dated 2024-06-26. Rights basis: MIT license
  (confirmed 2026-07-08). Models used: Gemini 1.5 Flash / Experimental /
  Pro.
- **Categories of data**: synthetic short-form argumentative text paired
  with a fallacy-type label, an explanation, and a response.
- **Users and markets**: this project's fallacy classifier benchmark and,
  going forward, logic doyen certification retests.
- **Intended end use**: training/evaluation data for fallacy
  classification. **Not previously stated as out-of-scope: using this
  data as if it were human-labeled ground truth for measuring real-world
  classifier accuracy** — it was being treated this way before this
  policy existed.
- **Purpose**: originally, to give the fallacy classifier something to be
  benchmarked against.
- **Known limitations**: only 4.0% of its 1,661 entries match the
  classifier's 13 actual output classes (see `PILOT_COMMITTEE_SPEC.md`);
  zero non-fallacious negative examples exist; **and it is not
  human-labeled data at all — it is one AI model's synthetic output**,
  which was not previously documented anywhere in this project.
- **Generator assumptions**: unknown — Gemini's generation prompt/process
  isn't available to this project, so what it assumed about what counts
  as a valid example of each fallacy type can't currently be audited.
- **Quality measures**: none established. No fidelity or utility
  measurement has ever been run.
- **Risk assessment**: real risk of **circularity**, not just bias — using
  this to benchmark an AI classifier means benchmarking one model's
  judgment against a different model's synthetic examples, not against
  reality. This is the same model-evaluating-model problem flagged at the
  very start of this project's design conversation, discovered here in a
  place nobody had checked until now.
- **Privacy-preserving techniques**: not applicable — no real personal
  data involved (Wikipedia-seeded, synthetically generated).
- **Retention/deletion policy**: none set.
- **Downstream distinguishability**: none. Nothing in the dataset or its
  filename indicates it's synthetic; it reads as a plain labeled corpus.
- **Standards adherence**: none claimed.
- **Independent verification**: none — this entry itself was written by
  the same process auditing the rest of this project, not by an
  independent party. Flagging that explicitly rather than pretending this
  first entry meets its own bar.
- **Ledger entry**: not yet created. `generated_at`, `attested_by`, and
  `review_date` all need real values before this dataset should be used
  for anything beyond what it's already being used for today.

### `FALLACY_PATTERNS` regex table (`training/src/engines/FallacyMapEngine.ts`) — uncertain provenance, documented honestly

- **Identification**: entered the repo in a single commit (`5ec478f`,
  2026-05-30, author `shansimmons-eng`), bundled into a broader feature
  commit ("Add Node Training section to Dashboard with CognoscentaeUltrans
  UI, create Agent-Based Simulation plan"). No separate import commit
  exists — unlike `fallacy_data.json`, there's no sign this was downloaded
  from an external source. Whether the individual regex patterns were
  hand-authored, AI-assisted, or some mix during that session **cannot be
  determined from git history**, and the author's own memory doesn't
  resolve it either. That uncertainty is being recorded as the honest
  answer, not resolved into a guess in either direction.
- **Categories of data**: hand-structured (or AI-assisted) regex patterns
  mapping surface phrasing to fallacy IDs, each with a fixed confidence
  weight — not generated training data in the same sense as
  `fallacy_data.json`, but still a designed artifact whose content shapes
  a real classification outcome.
- **Users and markets**: this project's regex fallback fallacy detector,
  currently the more trusted of the two automated fallacy signals.
- **Intended end use**: local, deterministic fallacy flagging without an
  external model dependency.
- **Known limitations**: coverage is only as broad as the patterns
  written — no measured recall against a labeled set (the same
  measurement gap RoBERTa had, just not yet checked here either).
- **Risk assessment**: lower corruptibility risk than a downloaded
  dataset or a black-box model, precisely because every pattern is
  human-readable in place and can be audited directly — see note above.
  This does not mean it's complete or unbiased, only that its content is
  fully inspectable rather than opaque.
- **Independent verification**: none yet — nobody besides the original
  committer has reviewed these patterns against a labeled set.
- **Ledger entry**: not yet created. This entry itself demonstrates that
  "provenance unknown, no evidence of external import" is a valid, honest
  status — not a placeholder waiting to be resolved into false certainty.

### Mesa-based ABM (`server/simulation/model.py`, `agents.py`) — undocumented

Generates synthetic agent behavior, interactions, network topology, and
payoff histories in real time. Currently has none of the documentation
above. Lower urgency than `fallacy_data.json` while it's used for
visualization/exploration only, but any of its output that feeds a real
decision (rather than a demo) needs an entry first.

### `free_agents.py` LLM outputs — undocumented

Groq/OpenRouter model outputs used as validation signal for fallacy
detection. These are synthetic judgments with no provenance record beyond
the model name returned in the API response. Same treatment needed as
the ABM: document before anything depends on it.

### Planned, not yet built — needs an entry *before* creation

- **Negative-example set** for the fallacy benchmark / doyen certification
  retest (see `PILOT_COMMITTEE_SPEC.md`). If generated synthetically
  (e.g. LLM-authored valid arguments), this entire template applies before
  a single example is used in a certification exam.
- **Simulated adversarial coalition** for quorum stress-testing (pilot
  success criterion: "the quorum math holds under a simulated coalition of
  exactly f=8 adversarial members"). An under-documented synthetic
  adversary risks the stress test becoming theater — passing against a
  weak or unrepresentative synthetic attacker proves nothing, but could be
  reported as if it does.

## Open items

- Verify `MrOvkill/fallacies-fallacy-base`'s upload predates any use of it
  in this project's own benchmark claims, since a dataset whose synthetic
  origin wasn't known couldn't have been accounted for in anything already
  written about the classifier's reliability.
- Decide whether `fallacy_data.json` should be retired the same way
  RoBERTa was — if the benchmark it was meant to support is now judged by
  human logic doyens instead, this dataset's actual remaining purpose
  needs to be restated, not assumed to carry over unchanged.
