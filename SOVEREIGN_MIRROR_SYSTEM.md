# Sovereign Mirror — System Architecture & Specification

## Executive Overview

The **Sovereign Mirror** (Kylos Arc // Cognoscentae Ultrans) is a distributed digital governance simulator built upon the principles of **Radical Veracity**, **Post-Quantum Cryptographic (PQC) Verification**, and **Decentralized Node Sovereignty**. 

Sovereignty in the system is not vested in a centralized authority, platform, or consensus validator cartel; it is geometrically and mathematically distributed across every node in a **golden-ratio (`0.618`) toroidal mesh**.

---

## 1. The Five Pure-Function Mandatory Logic Gates

Governance transitions occur strictly through five stateless, pure mathematical functions:

### 1.1 Veracity Gate
$$V_{	ext{advance}} = \max(0, V_{	ext{active}} - V_{	ext{control}})$$
Only proposals and statements with net-positive truth advancement pass the gate. If $V_{	ext{advance}} \le 0$, the transition is halted (`GATE_FAIL_ZERO_ADVANCE`).

### 1.2 P-Gate (Physicalization Confirmation)
$$	ext{Quorum} = \lfloor \sqrt{N} floor + 2, \quad 	ext{Cycles} = 7$$
Physicalization of state (committing changes to the immutable ledger) requires 7 consecutive ticks of multi-node affirmative quorum.

### 1.3 Inverion Divide
$$	ext{Remediate, not delete.}$$
Deprecated, dissenting, or anomalous nodes are never erased. They are partitioned into an immutable historical branch (`OBJECTIVE_REALITY` $<0.15$, `TRANSITIONAL` $0.15-0.60$, `SUBJECTIVE_NOISE` $\ge 0.60$).

### 1.4 Abolition of Pain
$$	ext{pain\_index} \ge 	ext{PAIN\_FLOOR\_THRESHOLD} \implies 	ext{Trigger Remediation}$$
Enforces a non-negotiable structural floor against runaway feedback loops or destructive consensus pressure.

### 1.5 Atrophy Timer
$$T_{	ext{limit}} = 86,400,000	ext{ ms } (24	ext{ hours})$$
Nodes dormant beyond 24 hours are flagged for automated peer review and state reassignment.

---

## 2. Cryptographic Security & Epistemic Demarcation

1. **Post-Quantum Cryptography**:
   - Integrates **Kyber-768** key encapsulation and **MAYO-1** / **Dilithium** asymmetric digital signatures.
   - All node votes, p-gate confirmations, and operator overrides must carry a valid PQC signature.
2. **Zero-Default Token Weights Matrix**:
   - Operates on [`token-weights-matrix.schema.json`](token-weights-matrix.schema.json).
   - Initializes with `0.0` default linguistic weights to guarantee complete value-neutrality.
3. **Tamper-Evident SHA-256 Forward-Linked Ledger**:
   - Every physicalized event generates an append-only cryptographic block linked to the prior block hash.

---

## 3. Real-Time 3D Toroidal Mesh Visualization

The user interface renders a real-time Three.js / React Three Fiber particle mesh:
- **Cyan / Teal**: Active healthy voting & consensus.
- **Yellow / Orange**: Synchronizing P-Gate validation cycles.
- **Red / White**: Dumbbell Fission stress state.
- **Dim / Gray**: Standby mode.
- **Governance Cycle**: 15-second loop cycling `ACTIVE -> SYNC -> FISSION -> STANDBY`.
- **NOAA Solar Wind Stream**: Live space weather flux drives particle dynamics.

---

## 4. Three-Tier Hybrid State Architecture

- **Jotai (`ATOMS`)**: Micro-reactive per-node state (P-Gate cycles, coordinates, timestamps).
- **Zustand (`HUD`)**: Global dashboard telemetry (temperature, flux, noise filter, sunrise opacity).
- **Redux Toolkit (`LEDGER`)**: Append-only immutable veracity ledger and event audit logs.
