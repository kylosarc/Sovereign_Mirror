# Sovereign Mirror

A non-moral, procedural computing interface engineered to structurally isolate and safeguard human cognitive focus.

---

## Thesis & Architecture Specification

The Sovereign Mirror does not possess, simulate, or exercise moral judgment, nor does it claim unconditioned semantic neutrality. Recognizing that semantic classification is inherently probabilistic rather than absolute, the system functions as a transparent, graded bounding box - executing localized filters and real-time gate severities to insulate human agency from known, catalogued vectors of telemetry exploitation and information manipulation.

For full architectural blueprints, see:
- [ARCHITECTURE.md](file:///home/retroporter/cup/ARCHITECTURE.md) - Comprehensive 4-Pillar Specification
- [SAFETY.md](file:///home/retroporter/cup/SAFETY.md) - Tropelex Gate Policy & Safety Convergence
- [token-weights-matrix.schema.json](file:///home/retroporter/cup/token-weights-matrix.schema.json) - Operator Token Matrix JSON Validation Schema

---

## The 4 Core Pillars

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Catalogued Focus-Isolation (Known-Pattern Proxy Interception)        │
│    • Deterministic signature database targeting explicit telemetry.     │
│    • Uncatalogued vectors bypass initial database (Scope Boundary).     │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. The Epistemic Filter (Information Demarcation)                       │
│    • Value-Neutral: Strips structural noise automatically.              │
│    • Zero-Default: 0.0 default linguistic weights at design time.       │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. Decoupled Gate Severities (Tropelex Alignment)                       │
│    • Tiered procedural constraints (GATE_PASS to GATE_STATE_FREEZE).    │
│    • Non-moralized runtime execution exceptions.                        │
├─────────────────────────────────────────────────────────────────────────┤
│ 4. Bound Policy Architecture (Tamper-Evident Session Tracking)          │
│    • Execution pre-authorized by operator private key signature.        │
│    • Append-only SHA-256 forward-linked session ledger.                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start trusted kernel server
npm run server
```

---

## Tech Stack & Verification

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Three.js, React Three Fiber, Tailwind CSS |
| **State Management** | Jotai (Atoms), Zustand (HUD), Redux Toolkit (Session Ledger) |
| **Post-Quantum Cryptography** | QPADL (`liboqs` / MAYO-1, MAYO-3, MAYO-5, Falcon-512, ML-DSA-65, SPHINCS+) |
| **Persistence Engine** | SQLite WAL with bounded memory pagination (`better-sqlite3`) |
| **Build & Tooling** | Vite, TypeScript compiler |

---

## Tropelex Gate Severity Hierarchy

| Gate Level | Identifier | System Action | Operator Surface |
| :--- | :--- | :--- | :--- |
| **Tier 0** | `GATE_PASS` | Unimpeded execution | Silent stream pass |
| **Tier 1** | `GATE_INFO_DEMARCATE` | Non-informational syntax strip | Structural diff badge |
| **Tier 2** | `GATE_HALT_EVAL` | Execution paused on token match | Operator inspection prompt |
| **Tier 3** | `GATE_STATE_FREEZE` | Unsigned policy mutation blocked | Cryptographic signature prompt |

---

## Links & Ecosystem

- [KylosArc.com](https://kylosarc.com) - Project Home
- [Tropelex Convergence](file:///home/retroporter/cup/SAFETY.md) - Shared Gate Severity Architecture
