# Sovereign Mirror — Architecture Blueprint

## System Overview

```
                      ┌─────────────────────────────────────────┐
                      │          SOVEREIGN MIRROR HUD           │
                      │     (React 18.2 + Three.js / R3F)       │
                      └────────────────────┬────────────────────┘
                                           │
            ┌──────────────────────────────┼──────────────────────────────┐
            ▼                              ▼                              ▼
     ┌──────────────┐               ┌──────────────┐               ┌──────────────┐
     │ ATOMS (Jotai)│               │ HUD (Zustand)│               │LEDGER (Redux)│
     ├──────────────┤               ├──────────────┤               ├──────────────┤
     │ Per-node     │               │ Global HUD   │               │ Immutable    │
     │ reactive     │               │ telemetry    │               │ audit trail  │
     │ state (pGate │               │ (flux, noise │               │ (veracity log│
     │ cycles, pos) │               │ temp, tick)  │               │ & events)    │
     └──────────────┘               └──────────────┘               └──────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │         FIVE MANDATORY GATES            │
                      │    Veracity Gate · P-Gate · Inverion    │
                      │    Abolition of Pain · Atrophy Timer    │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │        POST-QUANTUM CRYPTO CORE         │
                      │     MAYO-1 · Kyber-768 · Dilithium      │
                      └─────────────────────────────────────────┘
```
