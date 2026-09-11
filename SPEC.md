# Sovereign Mirror — Technical Specification

## 1. Functional Objective

To provide an empirical, mathematically auditable simulator for distributed node governance, proving that consensus and truth-tracking can occur without central authority, subjective censorship, or administrative arbitrariness.

---

## 2. Subsystem Breakdown

1. **Frontend HUD (`src/`)**:
   - `ThreeCanvas`: Volumetric toroidal particle simulation.
   - `ResonanceTrajectory`: Real-time phase velocity and solar wind modulation.
   - `VeracityLedger`: Forward-linked audit events with PQC verification stamps.
   - `GateController`: Manual and automated gate triggers.
2. **Simulation ABM (`server/simulation_abm.py`)**:
   - Agent-based modeling engine with game-theoretic payoffs (Stag Hunt, Prisoner's Dilemma, Hawk-Dove).
   - Real-time tick loop (`BASE_TICK_RATE = 400ms`).
3. **Cryptographic Core (`server/crypto_service.py`)**:
   - Quantum-resistant MAYO-1, Kyber-768, Dilithium verification.
   - Zero-default token weights schema validation.

---

## 3. State Schema & Persistence

All node and event transactions conform to:
- `token-weights-matrix.schema.json`
- Append-only `memory/*.json` store with SHA-256 forward-linked provenance hashes.
