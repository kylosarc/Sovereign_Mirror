# Sovereign Mirror - Deployment Guide

## Current Status

### ✓ Completed
1. **Shader Uniforms Extended**
   - Added `u_bolt_impulse` and `u_grain_density` to vertex/fragment shaders
   - Located in: `src/components/three/ResonanceTrajectory.tsx:51-52,117-142`

2. **CryptoWrapper Updated**
   - `VisualPayload` interface includes `bolt` and `grain` fields
   - `getVisualPayload()` async function fetches `./active_state.json`
   - Falls back to browser-based `STATE_LOADER` if file unavailable
   - Located in: `src/mirror/core/CryptoWrapper.ts:16-22,96-120`

3. **Frontend Wired**
   - `ResonanceTrajectory.tsx` polls `getVisualPayload()` every 500ms
   - Shader uniforms updated from live state
   - Located in: `src/components/three/ResonanceTrajectory.tsx:284-297,428-434`

4. **Python Stream Updated**
   - `simulate_stream.py` writes both `current_state.json` and `active_state.json`
   - Located in: `src/mirror/core/simulate_stream.py:19,93-96`

5. **Network Quarantine**
   - Verified: No `/src/components/` imports from `/src/crypto/`
   - CryptoWrapper acts as sole gateway

### ⚠️ Blocked - Requires Action

#### Build System (UNC Path Issue)
**Problem**: Vite build fails from `\\wsl$\Ubuntu\` UNC path
**Workaround Options**:
1. Copy to `C:\temp\sovereign-build\` and build there
2. Use WSL native path and build from Linux side
3. Map UNC to drive letter: `net use Z: \\wsl$\Ubuntu`

**Manual Build Steps**:
```bash
# Option 1: Copy and build
mkdir C:\temp\sovereign-build
xcopy /E /I . C:\temp\sovereign-build
cd C:\temp\sovereign-build
npm run build

# Option 2: WSL native
wsl
cd ~/cup
npm run build
```

#### Cloudflare Pages Deployment
**Requirements**:
1. Get Cloudflare API token: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
2. Set environment variable:
   ```bash
   set CLOUDFLARE_API_TOKEN=your_token_here
   ```
3. Deploy:
   ```bash
   node node_modules/wrangler/bin/wrangler.js pages deploy dist --project-name=sovereignmirror
   ```

**Alternative - Manual Upload**:
1. Go to Cloudflare Dashboard → Pages → sovereignmirror
2. Upload `dist/` folder directly

## Production Files Required

### dist/ folder must contain:
- `index.html`
- `assets/index-*.js` (bundled React app)
- `assets/index-*.css` (styles)
- **`active_state.json`** (simulation state) ✓ Already created

### active_state.json structure:
```json
{
  "metadata": { ... },
  "telemetry": {
    "alpha": 0.82,
    "noise": 0.12,
    "temp": 0.55,
    "bolt": 0.0,
    "grain": 0.0
  },
  "system": { ... }
}
```

## Post-Deployment Setup

### Option A: Python Stream (Server-Side)
If you have Python on Cloudflare Workers or separate server:
```bash
python3 src/mirror/core/simulate_stream.py
```
This updates `active_state.json` every 15 seconds.

### Option B: Browser-Only (Current Default)
No server setup needed. Frontend uses `BrowserSimulation.ts` which:
- Runs entirely in browser
- Cycles through 8 milestones every 15 seconds
- No external dependencies

## Verification

1. **Open deployed URL**
2. **Check DevTools Console** for:
   ```
   ✓ Browser Simulation Engine Started
   Cycle Interval: 15000ms
   ```
3. **Inspect Network tab** - Should see fetch to `./active_state.json`
4. **Verify shaders** - Open console and check:
   ```javascript
   // Should see uniforms updating
   u_bolt_impulse: 0.0 to 1.0
   u_grain_density: 0.0 to 1.0
   ```

## Known Limitations

1. **Particle Budget**: Locked at INSTANCE_COUNT=2000 (not 5000 as originally specified)
   - Located: `ResonanceTrajectory.tsx:12`
   - Can increase to 5000 but may impact FPS on lower-end devices

2. **Bolt/Grain Values**: Currently default to 0.0
   - Need to populate in `active_state.json` or wire to interactive controls

3. **Build System**: Requires workaround due to WSL UNC path limitations

## Next Steps

1. **Build fresh bundle** with today's changes (bolt/grain uniforms)
2. **Get Cloudflare API token** for automated deployment
3. **Deploy to kylosarc.com/sovereign-mirror**
4. **Test live state fetching**
5. **Wire interactive controls** for bolt/grain parameters

---

## Session Log - June 2026

### Build path resolution
- Vite no longer fails from the `\wsl$\Ubuntu\...` UNC path. Build is now run via `wsl.exe -e bash -c "cd /home/retroporter/cup && PATH=/home/retroporter/.nvm/versions/node/v24.15.0/bin:/usr/bin:/bin npm run build"`. The WSL node at `/home/retroporter/.nvm/versions/node/v24.15.0/bin/` is the correct path (was previously documented as v20.20.2).

### Production deployment: Hetzner (current)
The app is now live on Hetzner at `http://178.156.135.222/` (not Cloudflare). systemd services:

| Service | Port | Notes |
|---------|------|-------|
| `nginx` | 80 | Reverse proxy + static. Has exact-match `location = /validate` and `location = /classify` blocks (the earlier 301 issue is fixed) |
| `express-api.service` | 3001 | Express serving `/api/*` (feedback, ledger, pgate). Backing file: `/opt/sovereign-mirror/index.js` |
| `roberta-classifier.service` | 5002 | Python RoBERTa fallacy classifier |
| `free-agents.service` | 5003 | Groq + OpenRouter multi-agent validator. systemd `Environment=` line appends `/usr/bin:/bin` so subprocess `curl` works (was failing with `ENOENT`) |
| `simulation-abm.service` | 5001 | Mesa ABM |

### Deploy procedure (now standard)
1. `wsl.exe -e bash -c "cd /home/retroporter/cup && PATH=/home/retroporter/.nvm/versions/node/v24.15.0/bin:/usr/bin:/bin npm run build"`
2. `wsl.exe -e bash -c "cd /home/retroporter/cup/dist && tar czf /tmp/dist.tar.gz ."`
3. `wsl.exe -e scp -i /home/retroporter/.ssh/id_hetzner_server /tmp/dist.tar.gz root@178.156.135.222:/tmp/dist.tar.gz`
4. `wsl.exe -e ssh -i /home/retroporter/.ssh/id_hetzner_server root@178.156.135.222 'rm -rf /opt/sovereign-mirror/dist/assets/* /opt/sovereign-mirror/dist/index.html && tar xzf /tmp/dist.tar.gz -C /opt/sovereign-mirror/dist/'`
5. For server-side code changes: `powershell.exe -NoProfile scp -i "\\wsl\$/Ubuntu/home/retroporter/.ssh/id_hetzner_server" "\\wsl\$/Ubuntu/home/retroporter/cup/server/<file>" root@178.156.135.222:/opt/sovereign-mirror/<file>` then `systemctl restart express-api.service`

### Vercel + WordPress
- The WordPress iframe is hardcoded to `https://dist-alpha-topaz-27.vercel.app` (per current `WORDPRESS_INTEGRATION.md`)
- Vercel CLI is installed (`Vercel CLI 54.4.1`) but not authenticated - push deferred
- When ready: `cd dist && vercel --prod --yes` to redeploy with the latest bundle
