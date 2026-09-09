# Sovereign Mirror - System Overview

## Architecture

The Sovereign Mirror is a distributed governance simulator built on Radical Veracity principles. It combines ML-based fallacy detection, agent-based simulation, and multi-agent validation to identify and correct cognitive biases in real-time.

## Components

### 1. RoBERTa Fallacy Classifier (Port 5002)
- **Purpose**: ML-powered fallacy detection using transformer models
- **Model**: `MidhunKanadan/roberta-large-fallacy-classification`
- **Hardware**: Runs on CUDA (GTX 1060 6GB)
- **Capabilities**: Detects 13 types of logical fallacies
- **Fallback**: Regex-based contextual analysis if unavailable

### 2. Simulation ABM (Port 5001)
- **Purpose**: Agent-based governance simulation with game theory
- **Framework**: Mesa-inspired architecture
- **Features**:
  - RealNodeAgent class with strategy evolution
  - Network topologies (small-world, scale-free, etc.)
  - Game theory payoffs (PD, Stag Hunt, Hawk-Dove)
  - Veracity tracking and quorum detection
- **Data Source**: Reads from `truth_claims.json` for real agent verification

### 3. Free Agents Service (Port 5003)
- **Purpose**: Multi-agent validation for borderline cases
- **Agents**: Groq, OpenRouter (various free models)
- **Logic**: When RoBERTa detects high confidence on short text, query free agents for consensus
- **Threshold**: Word count < 8 AND confidence >= 0.60 triggers validation

### 4. Training Module (Ultrans)
- **Purpose**: Interactive fallacy detection training
- **Location**: `training/src/interface/CognoscentaeUltrans.tsx`
- **Features**:
  - Statement input and analysis
  - Fallacy spectrograph display
  - Statement log with history
  - Refactoring modal for intercepted statements
- **Integration**: Uses TrainingSession hook for state management

## Data Flow

```
User Input
    ↓
TrainingSession.analyzeInput()
    ↓
┌─────────────────────────────────────┐
│  IF word_count < 8 AND confidence    │
│  >= 0.60                            │
│  THEN query Free Agents (5003)      │
│  Adjust confidence based on         │
│  consensus                           │
└─────────────────────────────────────┘
    ↓
RoBERTa Classifier (5002)
    ↓
┌─────────────────────────────────────┐
│  IF RoBERTa unavailable             │
│  THEN use regex fallback             │
└─────────────────────────────────────┘
    ↓
ManifoldDeformer (GravityWell)
    ↓
3D Visualization + Ledger Entry
```

## Inference Pipeline

### Fallacy Detection Sequence

1. **Short text check**: `< 8 words` triggers multi-agent validation
2. **High confidence check**: `>= 0.60 confidence` triggers secondary validation
3. **Free agent query**: Groq/OpenRouter asked to confirm or deny
4. **Confidence adjustment**: If free agent disagrees, reduce RoBERTa confidence by 50%
5. **InverionState determination**: Based on final confidence

### Confidence Thresholds

| Threshold | InverionState | Action |
|-----------|---------------|--------|
| `< 0.15` | OBJECTIVE_REALITY | Pass |
| `0.15 - 0.60` | TRANSITIONAL | Log only |
| `>= 0.60` | SUBJECTIVE_NOISE | Intercept prompt |

## Supported Fallacies (RoBERTa)

1. Ad Hominem
2. Ad Populum
3. Appeal to Emotion
4. Circular Reasoning
5. Equivocation
6. Fallacy of Credibility
7. Fallacy of Extension
8. Fallacy of Logic
9. Fallacy of Relevance
10. False Causality
11. False Dilemma
12. Faulty Generalization
13. Intentional

## Local Fallacy Dataset

- **Source**: HuggingFace `MrOvkill/fallacies-fallacy-base`
- **Size**: ~1700 examples
- **Format**: TSV with text, label, explanation, response
- **Location**: `fallacy_data.json`

## Configuration

### Environment Variables

```bash
# API Keys (see .env template)
GROQ_API_KEY=       # Groq free tier
OPENROUTER_API_KEY= # OpenRouter multi-agent
HF_API_KEY=         # HuggingFace (optional)

# Simulation Config
SIMULATION_TICK_MS=400
N_INITIAL_AGENTS=50
MAX_AGENTS=100
```

### Key Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| FALLACY_CRITICAL_THRESHOLD | 0.15 | Radical veracity pass/fail |
| ROBERTA_THRESHOLD | 0.60 | Trigger free agent check |
| WORD_COUNT_THRESHOLD | 8 | Short text boundary |
| ATROPHY_T_LIMIT | 86400000 | 24h in ms |
| GOLDEN_RATIO | 0.618 | Manifold deformation |
| CONFIRMATION_CYCLES | 7 | P-Door confirmation |

## API Endpoints

### Simulation ABM (5001)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/simulation/state` | GET | Current simulation state |
| `/api/simulation/metrics` | GET | Latest metrics |
| `/api/simulation/agents` | GET | Agent states |
| `/api/simulation/start` | POST | Start simulation |
| `/api/simulation/stop` | POST | Stop simulation |
| `/api/simulation/reset` | POST | Reset simulation |
| `/api/simulation/config` | GET/POST | Configuration |

### RoBERTa Classifier (5002)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/classify-single` | POST | Classify single text |
| `/classify` | POST | Batch classify |
| `/labels` | GET | Supported fallacy labels |
| `/fallacy-data` | GET | HuggingFace dataset |

### Free Agents (5003)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/validate` | POST | Multi-agent validation |

## Development

### Starting Services

```bash
# Terminal 1 - Simulation ABM
cd ~/cup && source server/simulation/.venv/bin/activate
python server/simulation/api.py

# Terminal 2 - RoBERTa Classifier
cd ~/cup && source server/simulation/.venv/bin/activate
python server/simulation/fallacy_classifier.py

# Terminal 3 - Free Agents
cd ~/cup && source .env && source server/simulation/.venv/bin/activate
python server/simulation/free_agents.py

# Terminal 4 - Frontend
cd ~/cup && yarn dev
```

### Testing

```bash
# Test RoBERTa classifier
curl -X POST http://localhost:5002/classify-single \
  -H "Content-Type: application/json" \
  -d '{"text": "Your test statement"}'

# Test simulation
curl http://localhost:5001/api/health

# Run endpoint tests
python server/simulation/test_endpoints.py
```

### Cloudflare Tunnels

```bash
# Simulation ABM
cloudflared tunnel --url http://localhost:5001

# RoBERTa Classifier
cloudflared tunnel --url http://localhost:5002
```

## Directory Structure

```
cup/
├── server/
│   └── simulation/          # Python backend
│       ├── api.py           # Flask API (port 5001)
│       ├── fallacy_classifier.py  # RoBERTa (port 5002)
│       ├── free_agents.py   # Multi-agent (port 5003)
│       ├── model.py         # Mesa model
│       ├── agents.py        # Agent classes
│       ├── game_logic.py    # Game theory
│       ├── network.py       # Network topologies
│       ├── real_time_bridge.py
│       └── fallacy_data.json
├── training/                # Training module
│   └── src/
│       ├── interface/
│       │   ├── CognoscentaeUltrans.tsx
│       │   └── TrainingSession.ts
│       ├── cluster/
│       │   ├── GravityWell.ts
│       │   └── SlidingWindowBuffer.ts
│       ├── engines/
│       │   └── FallacyMapEngine.ts
│       ├── validators/
│       │   └── EpistemicValidator.ts
│       └── types/
│           └── index.ts
├── src/                     # Main React app
│   ├── components/
│   │   ├── ui/Dashboard.tsx
│   │   └── three/
│   └── state/
└── fallacy_data.json        # HuggingFace dataset
```

## State Management

| Layer | Library | Purpose |
|-------|---------|---------|
| Atoms | Jotai | Per-node reactive state |
| HUD | Zustand | Flux, noise, sunrise opacity |
| Ledger | Redux | Audit trail, veracity log |

## Next Steps

1. **Fix WSL networking** for free agents service
2. **Complete yarn install** and test frontend
3. **Add auto-restart** for tunnel processes
4. **Production deployment** via Cloudflare Workers/VM
5. **Add automated tests** for inference pipeline
---

## Session Log - June 2026

### Component port changes
The old dev port mapping (5001/5002/5003) is still in effect locally, but in production the Hetzner deployment uses:
- Express API on **3001** (was 5000)
- nginx front on **80** (was 7777 on Cloudflare dev)
- RoBERTa, free-agents, and ABM still on 5001/5002/5003 internally, fronted by nginx

### `server/feedbackStore.js` (NEW)
- SQLite at `/opt/sovereign-mirror/data/feedback.db`
- Tables: `agent_weights`, `feedback_events`, `analysis_events`
- Functions: `getAllWeights`, `recordFeedback`, `applyVerdict`, `getRecentFeedback`, `recordAnalysis`, `getRecentAnalyses`
- Adaptive weight logic: `±0.1` per verdict, clamped to `[0.1, 5.0]`. Marking `correct` rewards agents that voted `detected`; marking `incorrect` rewards agents that voted `not detected`.

### `server/index.js` - new endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/feedback/weights` | GET | Current agent weights |
| `/api/feedback` | POST | Submit verdict (correct/incorrect) for a statement, updates weights + logs event |
| `/api/feedback/history` | GET | Recent feedback events with weight_before/weight_after |
| `/api/feedback/analyze` | POST | Logs every analysis run with full breakdown (roberta, groq, openrouter, weightedScore, state, raw responses) |
| `/api/feedback/analyses` | GET | Recent analysis events |

### Cognoscentae Ultrans - weighted voting
- `useTrainingSession` now fetches weights on mount, collects per-agent raw scores (robertaMax, groqScore, openrouterMean), and computes a weighted score:
  ```
  weightedScore = Σ(agent.score × agent.weight) / Σ(weight)
  ```
- `markVerdict(statementId, fallacyId, 'correct'|'incorrect')` updates server weights, returns new weights, updates local `weights` state
- Per-fallacy `✓` / `✗` buttons in the spectrograph call `markVerdict`

### Confidence threshold update
- `ROBERTA_THRESHOLD` is now 0.60 (up from 0.50) - free agents only triggered on stronger RoBERTa signals
- `WORD_COUNT_CAP = 200` - free agents skipped on long statements

### Free agents service fix
- `free-agents.service` systemd `Environment=` line was overriding `PATH` to venv-only, breaking `subprocess.run(["curl", ...])` with `ENOENT`
- Fixed by appending `/usr/bin:/bin` to `Environment="PATH=...:/usr/bin:/bin"`
- Groq now returns real responses (was failing silently)

### Rate limit fix
- 100/min → 5000/min
- `getRateLimitKey` now returns `${ip}|${urlPath}` (per-path keying) so the ABM firehose on `/api/ledger/entry` doesn't starve the user's analyze requests
- Result: 0 429s in last 5 min (was hundreds)

### OpenRouter status
- DeepInfra and OpenRouter have been disabled in this commit history - Groq is the primary validator (per `9dfffb0 Disable unreliable OpenRouter/DeepInfra - Groq is primary validator`)
- OpenRouter still appears in the `useTrainingSession` agent list for legacy reasons; will be re-evaluated

### Mobile UI
- Cognoscentae Ultrans collapsed from 3-column desktop layout to 1-column mobile
- All dashboard panels scroll independently on mobile
- Loading spinner + "ROUTING TO..." indicator during analysis
