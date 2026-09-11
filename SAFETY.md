# SAFETY.md — Sovereign Mirror & Cognitive Isolation

## Core Safety Constraints

1. **Zero-Default Linguistic Weights**:
   - The system initializes with `0.0` bias weights. All filtering criteria are explicit, operator-signed, and recorded to the immutable ledger.
2. **Abolition of Pain Gate**:
   - Any consensus state exceeding the safety entropy threshold ($\pm 7.0\%$) triggers immediate stress freezing and remediation.
3. **Cryptographic Non-Repudiation**:
   - Every state transition requires verified post-quantum signatures (MAYO-1 / Kyber-768).
4. **Audit Immutability**:
   - Forward-linked SHA-256 hash chains prevent retrospective manipulation of vote history.
