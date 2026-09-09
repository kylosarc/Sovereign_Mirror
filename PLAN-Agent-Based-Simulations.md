# Agent-Based Simulations + Game Theory Plan
## Sovereign Mirror Dynamics Layer

---

## Overview

Build an agent-based simulation (ABS) layer that models Cognoscentae Ultrans nodes interacting under governance rules. This transforms static visualizations into predictive, scalable governance models.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SOVEREIGN MIRROR APP                        │
├─────────────────────────────────────────────────────────────────┤
│  React Frontend                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Resonance    │  │ Training     │  │ Agent Dashboard      │ │
│  │ Trajectory   │  │ Module       │  │ (simulation results)  │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    API SERVICE (Express)                        │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐│
│  │ /api/simulate    │  │ /api/simulation/:id/results          ││
│  │ POST             │  │ GET                                   ││
│  └──────────────────┘  └──────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                 PYTHON SIMULATION BACKEND                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐│
│  │ Mesa ABM Engine  │  │ Game Theory      │  │ Data Generator ││
│  │ - Agent states  │  │ - Payoff matrices│  │ - Time series  ││
│  │ - Environment   │  │ - Strategy eval  │  │ - Param sweeps ││
│  └──────────────────┘  └──────────────────┘  └────────────────┘│
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Agent Types:                                                  ││
│  │  - HighVeracity: Follows all 5 gates, slow but stable        ││
│  │  - ModerateVeracity: Follows P-Gate, adaptive               ││
│  │  - LowVeracity: Rational actor, maximizes short-term gain   ││
│  │  - StrategicManipulator: Exploits others' veracity gaps      ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Attributes

```python
class CognoscentaeNode:
    node_id: str
    veracity_adherence: float      # 0.0 - 1.0
    emotional_regulation: float    # 0.0 - 1.0
    module_adoption_level: float   # 0.0 - 1.0 (which modules adopted)
    energy: float                 # Resource for actions
    position: tuple               # Network position
    
    # Game theory
    strategy: StrategyType         # COOPERATE, DEFECT, TIT_FOR_TAT, etc.
    payoff_history: list           # Historical payoffs
    
    # State
    inverion_state: InverionState  # Current epistemic state
    fallacy_count: int             # Fallacies detected this round
```

---

## Game Theory Payoffs

### Core Matrix (Iterated Prisoner's Dilemma Variant)

| Agent A \ Agent B | Cooperate (Truth) | Defect (Fallacy) |
|-------------------|-------------------|------------------|
| **Cooperate**     | (+1, +1)          | (-2, +3)          |
| **Defect**        | (+3, -2)          | (-1, -1)          |

### Veracity-Specific Rules

```
COOPERATE_ON_TRUTH:
  → Non-zero-sum reward: both gain veracity
  → Group cohesion bonus
  → P-Gate success probability increases

DEFECT_WITH_FALLACY:
  → Temporary gain in short-term metrics
  → BUT: veracity decay penalty
  → BUT: group atrophy contagion risk
  → BUT: P-Gate failure probability increases
```

---

## Mesa Implementation Plan

### Phase 1: Core ABM Engine

```python
# server/simulation/mesa_model.py
import mesa

class SovereignMirrorModel(mesa.Model):
    def __init__(self, n_agents, veracity_dist, params):
        self.schedule = mesa.time.RandomActivation(self)
        self.grid = mesa.NetworkGrid()
        
        # Create agents with veracity distribution
        for i in range(n_agents):
            adoption = veracity_dist[i]
            agent = CognoscentaeNode(i, adoption)
            self.schedule.add(agent)
            self.grid.place_agent(agent, (i % GRID_SIZE, i // GRID_SIZE))
    
    def step(self):
        self.schedule.step()
        # Collect metrics
```

### Phase 2: Game Logic

```python
# server/simulation/game_logic.py
class GameEngine:
    def calculate_payoff(self, agent_a, agent_b) -> tuple:
        # Veracity alignment affects payoff
        v_a = agent_a.veracity_adherence
        v_b = agent_b.veracity_adherence
        
        if agent_a.strategy == COOPERATE and agent_b.strategy == COOPERATE:
            base_payoff = (v_a + v_b) / 2
            return (base_payoff, base_payoff)
        
        # ... full matrix implementation
```

### Phase 3: Visualization Bridge

```python
# Output format for frontend
{
    "timestep": 42,
    "collective_v_active": 0.73,
    "fallacy_cascade_probability": 0.12,
    "pgate_success_rate": 0.89,
    "agent_states": [
        {"id": "A1", "veracity": 0.82, "strategy": "COOPERATE"},
        ...
    ],
    "unified_victory_metric": 0.67  # Collective alignment
}
```

---

## Integration Points

### Frontend → Backend

```
POST /api/simulate
{
    "n_agents": 100,
    "timesteps": 500,
    "veracity_distribution": [0.2, 0.5, 0.3],  # % low, mid, high
    "module_adoption": [0.4, 0.3, 0.2, 0.1], # % adoption per module
    "environmental_shocks": true,
    "solar_data_source": "NOAA"  # External variable
}

Response: { "simulation_id": "sim_abc123" }
```

### Backend → Frontend

```
GET /api/simulation/:id/results
{
    "complete": true,
    "time_series": {
        "v_active": [...],
        "fallacy_cascade": [...],
        "pgate_success": [...]
    },
    "final_state": {...},
    "parameter_sweeps": [...]
}
```

---

## Visualization Outputs

### 1. Agent State Evolution (Mirror Integration)

Agent states influence particle colors in ResonanceTrajectory:
- High veracity → White/gold particles
- Low veracity → Red/orange particles  
- Defection cascade → Flux spike animation

### 2. Collective Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  COLLECTIVE V_ACTIVE CURVE                                   │
│  ════════════════════════════════════                      │
│       ╱╲                                                    │
│      ╱  ╲    ╱╲                                             │
│  ───╱────╲──╱──╲───────                                    │
│     0    100  200  timesteps                                │
│                                                              │
│  Fallacy Cascade Prob: 0.12 | P-Gate Success: 0.89          │
│  Unified Victory: 0.67 ✨                                    │
└─────────────────────────────────────────────────────────────┘
```

### 3. Manifold Distortion (experiment/map)

Fallacy cascades deform the manifold visualization:
- High cascade → Mesh tearing
- Low cascade → Smooth manifold

---

## Parameter Sweep Examples

```python
# What if questions
questions = [
    ("30% adopt Emotional Regulation?", {"emotional_regulation_adoption": 0.3}),
    ("50% High Veracity?", {"veracity_distribution": [0.1, 0.4, 0.5]}),
    ("Solar storm disrupts energy?", {"solar_disruption": True}),
]

# Results feed back to:
# - Mirror visualization parameters
# - Dashboard metrics
# - Training module difficulty
```

---

## Tooling Recommendations

| Tool | Use Case | Pros | Cons |
|------|----------|-----|------|
| **Mesa** | Main ABM engine | Popular, Jupyter support, good viz | Larger footprint |
| **Helipad** | Game theory focus | Lighter, flexible | Less documented |
| **NumPy+NetworkX** | Simple models | Minimal deps | More boilerplate |
| **Custom (TS)** | Browser-native sims | No backend needed | Limited complexity |

**Recommendation**: Start with **NumPy+NetworkX** for proof-of-concept, migrate to **Mesa** for production with visualization needs.

---

## Implementation Phases

### Phase 1: Foundation (1-2 weeks)
- [ ] Python simulation backend skeleton
- [ ] Basic agent class with veracity attributes
- [ ] Simple cooperator/defector game
- [ ] REST endpoint for triggering simulations
- [ ] Mock data for frontend testing

### Phase 2: Game Theory (1 week)
- [ ] Full payoff matrix with veracity scaling
- [ ] Strategy types: TFT, Always Defect, Always Cooperate, Random
- [ ] Network topology effects (who interacts with whom)
- [ ] Evolutionary selection pressure

### Phase 3: Integration (1 week)
- [ ] Connect to Mirror particle system
- [ ] Agent states → particle colors
- [ ] Real-time metric updates
- [ ] Fallacy cascade events trigger visualization effects

### Phase 4: Advanced (2 weeks)
- [ ] Mesa migration if needed
- [ ] Solar/NOAA data integration
- [ ] Parameter sweep UI
- [ ] Time-series prediction

---

## Success Metrics

1. **Convergence Test**: High-veracity agents dominate after N generations
2. **Cascade Detection**: System accurately predicts when a single defector triggers cascade
3. **Parameter Sweep Speed**: <5s for 100-agent, 500-timestep simulation
4. **Visualization Latency**: Agent state changes reflect in Mirror within 100ms

---

## File Structure

```
server/
├── simulation/
│   ├── __init__.py
│   ├── model.py           # Main ABM model
│   ├── agents.py          # Agent classes
│   ├── game_logic.py      # Payoff matrices
│   ├── network.py          # Agent interactions
│   └── api.py              # REST endpoints
├── data/
│   └── agent_results/     # Simulation outputs
└── requirements.txt
```

---

## Quick Start Command

```bash
# Start simulation backend
cd server
pip install mesa networkx flask
python -m simulation.api

# Trigger simulation
curl -X POST http://localhost:5000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"n_agents": 50, "timesteps": 100}'
```
---

## Session Log - June 2026

### ABM → real fallacy data wiring (DEFERRED)
Per user direction: ABM integration with real RoBERTa outputs is deferred until Layer A (data foundation) is complete. The current ABM still runs synthetic agents.

### Phase 1 status (mostly done, but with caveats)
- [x] Python simulation backend skeleton (`server/simulation/api.py`)
- [x] Basic agent class with veracity attributes (`server/simulation/agents.py` - `RealNodeAgent`)
- [x] Simple cooperator/defector game (in `agents.py` and `game_logic.py`)
- [x] REST endpoint for triggering simulations (`/api/simulation/*`)
- [~] Mock data for frontend testing - partial. `src/mirror/core/BrowserSimulation.ts` cycles through 8 milestones every 15s, but the simulation isn't pulling from the ABM in real-time.

### Phase 2 status (deferred)
- [~] Full payoff matrix with veracity scaling - present in `game_logic.py` but not wired to the visualization
- [~] Strategy types: TFT, Always Defect, Always Cooperate, Random - partial
- [ ] Network topology effects
- [ ] Evolutionary selection pressure

### Phase 3 status (blocked on ABM → real data)
Visualization integration blocked. The `ResonanceTrajectory` shows kinetic particles based on synthetic profiles from `BrowserSimulation.ts`, not real agent state.

### Phase 4 status (deferred)
- Mesa migration: not needed yet. Current implementation uses NumPy+NetworkX
- Solar/NOAA data integration: not pursued
- Parameter sweep UI: not pursued
- Time-series prediction: not pursued

### Open question for the user
The current ABM writes to a SQLite ledger (`/opt/sovereign-mirror/data/ledger.db`) at very high rate (>100/min). This was burning through the global rate limit before the per-`(ip, path)` fix. Should we:
1. Batch the ABM ledger writes (e.g., flush every 5s instead of every event)
2. Move the ABM to its own dedicated rate-limit bucket
3. Keep as-is and let the per-path fix handle it
