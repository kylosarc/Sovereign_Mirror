# Sovereign Mirror

A non-moral, procedural computing interface engineered to structurally isolate and safeguard human cognitive focus.

---

## Thesis & Architecture Specification

The Sovereign Mirror does not possess, simulate, or exercise moral judgment, nor does it claim unconditioned semantic neutrality. Recognizing that semantic classification is inherently probabilistic rather than absolute, the system functions as a transparent, graded bounding box: executing localized filters, post-quantum cryptographic verification, and real-time gate severities to insulate human agency from known, catalogued vectors of telemetry exploitation and information manipulation.

For full architectural blueprints, see:
- [ARCHITECTURE.md](file:///home/retroporter/cup/ARCHITECTURE.md) | Comprehensive 4-Pillar Specification
- [SAFETY.md](file:///home/retroporter/cup/SAFETY.md) | Tropelex Gate Policy and Safety Convergence
- [token-weights-matrix.schema.json](file:///home/retroporter/cup/token-weights-matrix.schema.json) | Operator Token Matrix JSON Validation Schema

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

## Live Post-Quantum Cryptographic Architecture (QPADL)

Sovereign Mirror integrates a live, hardware-accelerated Post-Quantum Cryptographic (PQC) engine built on `liboqs` (`kylos-crypto-server`). The cryptographic layer is structured as a three-family arch system, ensuring that if any single mathematical family suffers an algorithmic break, the remaining arches redistribute the load and hold without collapsing the security vault.

```
                  ┌───────────────────────────────┐
                  │    POST-QUANTUM CRYPTO VAULT  │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌───────────────────┐  ┌────────────────────┐  ┌───────────────────────┐
│  MQ SIGNATURES    │  │   LATTICE-BASED    │  │      HASH-BASED       │
│  (Multivariate)   │  │  (Module Lattices) │  │  (State-Free Trees)   │
├───────────────────┤  ├────────────────────┤  ├───────────────────────┤
│ • MAYO-1 (L1)     │  │ • Falcon-512 (L1)  │  │ • SPHINCS+-256f (L5)  │
│ • MAYO-3 (L3)     │  │ • ML-DSA-65  (L3)  │  │   (Hash Anchor)       │
│ • MAYO-5 (L5)     │  │   (Primary Lattice)│  │                       │
└───────────────────┘  └────────────────────┘  └───────────────────────┘
```

### Supported Algorithm Families

1. **Multivariate Quadratic (MQ) Signatures (`MAYO-1`, `MAYO-3`, `MAYO-5`)**:
   - **Role**: Ultra-fast signature verification for high-frequency telemetry demarcation and runtime gate verification.
   - **NIST Security Levels**: Level 1 (MAYO-1), Level 3 (MAYO-3), Level 5 (MAYO-5).

2. **Lattice-Based Signatures (`ML-DSA-65`, `Falcon-512`)**:
   - **Role**: Primary lattice infrastructure for policy signing, operator authorization, and state transitions.
   - **NIST Security Levels**: Level 1 (Falcon-512), Level 3 (ML-DSA-65, NIST FIPS 204 standard).

3. **Hash-Based Signatures (`SPHINCS+-SHA2-256f-simple`)**:
   - **Role**: Stateful and state-free hash anchor providing fallback security independent of lattice or algebraic assumptions.
   - **NIST Security Levels**: Level 5 (Maximum security category).

### Cryptographic Server Daemon & Live Endpoints

The trusted backend kernel manages `kylos-crypto-server` as a persistent, supervised child process communicating over JSON-RPC:

| HTTP Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/crypto/status` | Reports active algorithm layers, NIST security levels, and daemon health. |
| `POST` | `/api/crypto/keypair` | Generates a new post-quantum public/private keypair for any supported algorithm. |
| `POST` | `/api/crypto/sign` | Cryptographically signs a message payload using the operator's secret key. |
| `POST` | `/api/crypto/verify` | Verifies the signature authenticity against the provided public key. |

### In-Browser HUD Harness

Operators can inspect and test the live cryptography directly within the Sovereign Mirror interface:
- **Parameters View**: The `QPADL CRYPTO` panel is embedded in the primary dashboard, displaying live green status indicators for all 6 active algorithms.
- **Dedicated Navigation**: Select `QPADL Crypto` in the sidebar to open the dedicated cryptographic operations panel.
- **Real-Time Signature Harness**: Select any algorithm and click `Test Key & Sign` to generate keys and execute live signing benchmarks directly against the running daemon.

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

## Tropelex Gate Severity Hierarchy

| Gate Level | Identifier | System Action | Operator Surface |
| :--- | :--- | :--- | :--- |
| **Tier 0** | `GATE_PASS` | Unimpeded execution | Silent stream pass |
| **Tier 1** | `GATE_INFO_DEMARCATE` | Non-informational syntax strip | Structural diff badge |
| **Tier 2** | `GATE_HALT_EVAL` | Execution paused on token match | Operator inspection prompt |
| **Tier 3** | `GATE_STATE_FREEZE` | Unsigned policy mutation blocked | Cryptographic signature prompt |

---

## Links & Ecosystem

- [KylosArc.com](https://kylosarc.com) | Project Home
- [Tropelex Convergence](file:///home/retroporter/cup/SAFETY.md) | Shared Gate Severity Architecture
- [Post-Quantum Attack Surface](file:///home/retroporter/cup/TOUCHPOINTS.md) | Crypto Subsystem Inventory
