# Sovereign Mirror - Attack Surface & Touchpoint Inventory

## 1. Remote Touchpoints (external network)

| # | Touchpoint | Direction | Protocol | Security | Config |
|---|------------|-----------|----------|----------|--------|
| 1 | **NOAA SWPC plasma-7-day** | Node server → external | HTTPS GET | 8s timeout, `getSafe()` NaN guard, schema validation (array+object check) | `NOAA_PLASMA_URL` env |
| 2 | **NOAA SWPC mag-7-day** | Node server → external | HTTPS GET | Same as above | `NOAA_MAGNET_URL` env |
| 3 | **Open-Meteo forecast API** | Node server → external | HTTPS GET | 8s timeout; 5-min server-side cache; 3 parallel requests per poll; no API key required | `ECO_API_URL` env |
| 4 | **GitHub liboqs release** | build_liboqs.sh → external | HTTPS | SHA-256 verified via release tag | `LIBOQS_VERSION` env |
| 5 | **npm registry** | `npm install` → external | HTTPS | Lockfile (`package-lock.json`) pins transitive deps | `package.json` |
| 6 | **crates.io** | `cargo build` → external | HTTPS | `serde_json = "=1.0.150"` exact pin; no other internet crates | `Cargo.toml` |
| 7 | **Vite dev server** | Browser → localhost:3000 | HTTP | Dev only; prod serves from static build | - |

## 2. Local Touchpoints (server → subsystem)

| # | Touchpoint | Origin → Target | Protocol | Security |
|---|------------|-----------------|----------|----------|
| 7 | **Node HTTP server** (`server/index.js`, no Express) | Localhost → port 3001 | HTTP | CORS allowlist (`localhost:5173`, `localhost:4173`, `kylosarc.org`, `www.kylosarc.org`, Hetzner prod IP); rate limit 5000/min per (IP, path); body size 4KB limit |
| 8 | **Crypto subprocess (stdin)** | Node server → `kylos-crypto-server` | JSON-RL (newline-delimited JSON) | 256-entry pending cap, 30s timeout, max 5 auto-restarts, `getCryptoResult()` error guard |
| 9 | **Crypto subprocess (stdout)** | `kylos-crypto-server` → Node server | JSON-RL | Parsed line-by-line via `readline`; malformed lines silently dropped |
| 10 | **liboqs FFI** | `kylos-crypto-server` → `liboqs.so` | C ABI (raw FFI) | Three-family defense (MQ+Lattice+Hash); serde_json::json! prevents injection; 2MB/128KB size limits at Rust level |
| 11 | **Test vectors (filesystem)** | `test_vectors.rs` → Rust test harness | File read | Throwaway CI keys; documented as non-production |

## 3. Local Touchpoints (frontend → server)

| # | Touchpoint | Origin → Target | Protocol | Security |
|---|------------|-----------------|----------|----------|
| 12 | `/api/health` GET | React → Node server | HTTP (via Vite proxy) | No auth; returns static status |
| 13 | `/api/rtsw/latest` GET | React → Node server | HTTP | Passes through validated NOAA data |
| 14 | `/api/ecology/latest` GET | React → Node server | HTTP | Passes through Open-Meteo proxy; 5-min server-side cache |
| 15 | `/api/pgate/engage` POST | React → Node server | HTTP JSON | Mode enum validation; `validateNumber()` finite check |
| 16 | `/api/veracity/calculate` POST | React → Node server | HTTP JSON | `validateNumber()` finite check on both fields |
| 17 | `/api/quorum/calculate` POST | React → Node server | HTTP JSON | `validateNumber()` finite check; `activeNodes >= 1` |
| 18 | `/api/atrophy/calculate` POST | React → Node server | HTTP JSON | `validateNumber()` finite check on both fields |
| 19 | `/api/kernel/version` GET | React → Node server | HTTP | Static version response |
| 20 | `/api/crypto/status` GET | React → Node server → subprocess | HTTP → JSON-RL | Cached 30s in `CryptoStatusPanel`; `getCryptoResult()` error guard |
| 21 | `/api/crypto/keypair` POST | React → Node server → subprocess | HTTP → JSON-RL | 4KB body limit at Node server; 128KB key limit at Rust; `getCryptoResult()` guard |
| 22 | `/api/crypto/sign` POST | React → Node server → subprocess | HTTP → JSON-RL | Same body/key/sig limits; `message`+`secret_key` required |
| 23 | `/api/crypto/verify` POST | React → Node server → subprocess | HTTP → JSON-RL | Same; `message`+`signature`+`public_key` required |

## 4. Frontend Data Flow Touchpoints

| # | Touchpoint | Location | Security |
|---|------------|----------|----------|
| 24 | **Redux cryptoSlice** | `cryptoSlice.ts` | Runtime type validation via `validateCryptoStatus()` before dispatch |
| 25 | **Zustand HUD store (ecoHealth)** | `src/state/stores/` | Normalized [0,1] float from server; clamped before write |
| 26 | **apiService.ts response validation** | All `post<T>()` / `get<T>()` calls | Per-response validator functions reject malformed server data |
| 27 | **zkProof.ts keypair cache** | `keypairCache[algorithm]` | In-memory only, process lifetime; algorithms ≤ 8 entries in practice |
| 28 | **CryptoStatusPanel render** | Reads from Redux store | Pure display; no revalidation needed |
| 29 | **Vite proxy** | `vite.config.ts` → `/api` → `localhost:3001` | Dev only; prod build serves static files directly |
| 30 | **PGateButton proof generation** | `handleEngage()` → `generateProof()` → `verifyProof()` | Error caught by try/catch + console.error |

## 5. Build/Deploy Touchpoints

| # | Touchpoint | File | Security |
|---|------------|------|----------|
| 29 | **build.sh** | `kylos-qpadl/build.sh` | No hardcoded paths; uses `LIBOQS_INSTALL_DIR` env |
| 30 | **build_liboqs.sh** | `kylos-qpadl/build_liboqs.sh` | Downloads from GitHub; `LIBOQS_VERSION` env (default 0.13.0) |
| 31 | **Cross.toml** | `kylos-qpadl/Cross.toml` | `LIBOQS_VERSION` env var for cross-compile |
| 32 | **ci.yml** | `kylos-qpadl/.github/workflows/ci.yml` | Same env var pattern for CI |
| 33 | **cross_compile.sh** | `kylos-qpadl/scripts/cross_compile.sh` | Same env var pattern |
| 34 | **Cargo.toml** | `kylos-qpadl/Cargo.toml` | `serde_json` pinned `=1.0.150`; `rust-version = "1.85"`; `edition = "2024"` |

`kylos-qpadl` is a git submodule pinned to a specific commit (see `.gitmodules`); it is not part of this repo's own build/deploy pipeline.

## 6. Eliminated Attack Surfaces

| Surface | How Eliminated |
|---------|---------------|
| Hardcoded WSL paths | `CRYPTO_SERVER_BIN`/`CRYPTO_SERVER_ARGS` env vars with JSON.parse array |
| Hardcoded cargo registry path | `build_liboqs.sh` downloads from GitHub via `LIBOQS_VERSION` |
| JSON injection in crypto server | `serde_json::json!` macro replaces string concat |
| Unbounded allocations (crypto) | `MAX_BODY_BYTES=2MB`, `MAX_KEY_BYTES=128KB`, `MAX_SIG_BYTES=128KB` in Rust |
| Unbounded pending requests | `CRYPTO_PENDING_MAX=256` Map cap |
| Rate-limit Map memory leak | Periodic `setInterval` evicts stale entries (`server/index.js`) |
| Infinite crypto restart loop | `CRYPTO_MAX_RESTARTS=5` cap |
| Crypto response `result.result` access without null check | `getCryptoResult()` helper throws on missing/error |
| `readCryptoBody` write-after-destroy race | `req.destroyed` guard before response write, applied to every body-reading endpoint |
| Unvalidated NOAA response | `validateNOAAResponse()` schema check + `getSafe()` per field |
| Hardcoded NOAA URLs | `NOAA_PLASMA_URL` / `NOAA_MAGNET_URL` env vars |
| Predictable proof IDs (`Math.random()`) | `secureRandomAlphanumeric()` (`src/crypto/secureRandom.ts`) used for all `QPADL_*` proof IDs |

## 7. Remaining Acceptable Risk

- **No authentication on `/api/crypto/*`**: keypair/sign/verify are unauthenticated like the rest of the API surface - acceptable while this is a single-operator deployment, but a multi-tenant deployment would need this addressed before relying on these endpoints for anything beyond demonstration.
- **Falcon-512 floating-point FFT**: documented in `kylos-qpadl/QPADL_THREAT_MODEL.md` as a temp patch pending NIST On-Ramp.
- **NOAA SWPC dependency**: external API; degraded experience (503) on fetch failure, not a crash.
- **`sovereign-mirror.service` runs as root in production** (Hetzner): the Node backend should run as an unprivileged user; this is a known gap, not yet remediated.
- **npm remote fetch at install time**: implicit trust in registry + lockfile pinning.
- **crates.io at build time**: single exact-pinned dependency.
