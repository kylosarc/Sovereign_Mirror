# Environment Variables

Real secrets live only in untracked `.env` files (root and `server/simulation/`)
and in `/etc/default/free-agents` on the Hetzner box (mode `600`, owned by
`www-data` - not world-readable). None of those files are committed; `.env.example`
templates are, so anyone standing this project up can supply their own keys
without ever seeing - or needing - the originals.

To get started: `cp .env.example .env` (and `cp server/simulation/.env.example
server/simulation/.env`), then fill in only the keys you actually need (see
"Required vs optional" below).

## Keys

| Variable | Used by | Free tier? | Required? |
|---|---|---|---|
| `GROQ_API_KEY` | `server/index.js`, `server/feedbackStore.js`, `server/simulation/free_agents.py` | Yes - groq.com has a free tier | **Yes**, this is the primary fallacy-classification validator |
| `OPENROUTER_API_KEY` | `server/index.js` (`/validate` endpoint), `server/simulation/free_agents.py` | Yes - openrouter.ai has free-tier models (`:free` suffix) | Optional. OpenRouter was previously disabled repo-wide in favor of Groq (see commit `9dfffb0`) but a `/validate` endpoint reintroducing it currently sits uncommitted locally - decide whether that's intentional before relying on this key |
| `HF_API_KEY` | Hugging Face Hub access (used by `transformers`/RoBERTa classifier tooling) | Yes - huggingface.co free tier | Optional, only needed if pulling gated/rate-limited HF models |
| `DEEPINFRA_API_KEY` | `server/simulation/free_agents.py` | Has a free trial credit, not a permanent free tier | Optional - code comments note DeepInfra was disabled as "unreliable" |
| `CLOUDFLARE_API` | Wrangler / Cloudflare Pages deploy tooling (`wrangler.toml`, `functions/api/*`) | Yes - Cloudflare has a free tier | Optional, only needed if you redeploy the Cloudflare Pages path instead of Hetzner |
| `HETZNER_IP4_PUBLIC_IP` / `HETZNER_IP6_PUBLIC_IP` | Deploy scripts / your own reference | N/A (your server's address, not a secret) | Optional |
| `HETZNER_USER` | Deploy scripts | N/A | Optional |

### Dropped from the template (cleanup, not just omission)
- `HETZNER_PASSWORD` / `Hetzner_SSH_PASSPHRASE` - the existing `.env` stored
  these, but access to the Hetzner box already works via SSH key
  (`ssh root@<host>`, no password prompt). Storing a server login password in
  a plaintext `.env` next to API keys is unnecessary risk for a credential
  that shouldn't be needed at all - if password auth is still enabled on the
  server, prefer disabling it in `sshd_config` in favor of key-only auth
  rather than documenting the password.
- `GEN_OPENROUTER` / `OPENROUTER_FREE` / `FREE_OPENROUTER` - these are legacy
  alias env-var names that accumulated across several "fix OpenRouter" commits
  (`server/index.js` and `free_agents.py` each check 2-4 different names for
  what is the same OpenRouter key). They're left out of the template
  deliberately; `OPENROUTER_API_KEY` is the one name worth keeping. Cleaning
  up the fallback chains in code is a separate, small follow-up.

## Where secrets currently live
- Local dev: `.env` (root) and `server/simulation/.env` - untracked, read by
  `npm run server` / `python free_agents.py` etc. via shell `export`.
- Hetzner production: `/etc/systemd/system/free-agents.service` loads
  `EnvironmentFile=/etc/default/free-agents` (mode `600`, `www-data`-owned).
  `sovereign-mirror.service` (the main Node backend) currently has no
  `EnvironmentFile` configured - if it needs `GROQ_API_KEY`/`OPENROUTER_API_KEY`
  at runtime, confirm where it's actually getting them from (the process
  environment it was started with, the project's local `.env`, or a gap).

## If you need to expand without spending money
- `GROQ_API_KEY` is the only key this app treats as load-bearing - Groq's
  free tier covers the primary classification path.
- Everything else (OpenRouter, Hugging Face, DeepInfra) is optional
  redundancy/fallback. You can run with just `GROQ_API_KEY` set and leave the
  rest blank.
- The Hetzner box itself (2GB RAM) is the more likely cost/scaling
  bottleneck before any API key tier is - see the repo-hygiene notes in
  `CLAUDE.md` for what's currently eating its disk.
