import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { veracityGate, calculateQuorum, calculateAtrophyDecay, getThresholdWithEntropy } from './logic/kernel.js';
import { getAllWeights, recordFeedback, applyVerdict, getRecentFeedback, recordAnalysis, getRecentAnalyses } from './feedbackStore.js';
import { saveEntry, loadAll, loadSince, getStats } from './ledgerStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let CRYPTO_BIN = process.env.CRYPTO_SERVER_BIN;
let CRYPTO_ARGS = [];

if (CRYPTO_BIN) {
  try {
    CRYPTO_ARGS = process.env.CRYPTO_SERVER_ARGS ? JSON.parse(process.env.CRYPTO_SERVER_ARGS) : [];
  } catch {
    CRYPTO_ARGS = [];
  }
} else if (existsSync('/opt/sovereign-mirror/kylos-crypto-server')) {
  CRYPTO_BIN = '/opt/sovereign-mirror/kylos-crypto-server';
  CRYPTO_ARGS = [];
} else if (existsSync('/home/retroporter/cup/kylos-qpadl/target/release/kylos-crypto-server')) {
  CRYPTO_BIN = '/home/retroporter/cup/kylos-qpadl/target/release/kylos-crypto-server';
  CRYPTO_ARGS = [];
} else {
  CRYPTO_BIN = 'wsl.exe';
  CRYPTO_ARGS = ['/home/retroporter/cup/kylos-qpadl/target/release/kylos-crypto-server'];
}
const CRYPTO_MAX_RESTARTS = 5;
let cryptoProc = null;
let cryptoReady = false;
let cryptoReqId = 1;
let cryptoPending = new Map();
const CRYPTO_PENDING_MAX = 256;
let cryptoRestartCount = 0;

function startCryptoServer() {
  if (cryptoRestartCount >= CRYPTO_MAX_RESTARTS) {
    console.error('[CRYPTO] Max restarts reached, giving up');
    cryptoReady = false;
    return;
  }

  cryptoProc = spawn(CRYPTO_BIN, CRYPTO_ARGS, {
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
  });

  cryptoRestartCount++;

  const rl = createInterface({ input: cryptoProc.stdout });
  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      const id = msg.id;
      if (id != null && cryptoPending.has(id)) {
        const { resolve } = cryptoPending.get(id);
        cryptoPending.delete(id);
        if (cryptoRestartCount > 0) {
          cryptoRestartCount = 0;
          console.log('[CRYPTO] Server responsive, restart counter reset');
        }
        resolve(msg);
      }
    } catch { /* ignore malformed lines */ }
  });

  cryptoProc.on('error', (err) => {
    console.error('[CRYPTO] Server error:', err.message);
    cryptoReady = false;
  });

  cryptoProc.on('exit', (code) => {
    console.error(`[CRYPTO] Server exited (${code}), restarting in 2s (restart ${cryptoRestartCount}/${CRYPTO_MAX_RESTARTS})`);
    cryptoReady = false;
    cryptoPending.forEach(({ reject }) => reject(new Error('crypto server exited')));
    cryptoPending.clear();
    setTimeout(startCryptoServer, 2000);
  });

  cryptoReady = true;
}

function sendCryptoRequest(method, params) {
  return new Promise((resolve, reject) => {
    if (!cryptoProc || !cryptoProc.stdin.writable) {
      reject(new Error('crypto server not available'));
      return;
    }
    if (cryptoPending.size >= CRYPTO_PENDING_MAX) {
      reject(new Error('crypto server overloaded'));
      return;
    }
    const id = cryptoReqId++;
    cryptoPending.set(id, { resolve, reject });
    const request = JSON.stringify({ id, method, params }) + '\n';
    cryptoProc.stdin.write(request);
    setTimeout(() => {
      if (cryptoPending.has(id)) {
        cryptoPending.delete(id);
        reject(new Error('crypto request timeout'));
      }
    }, 30000);
  });
}

startCryptoServer();

const PORT = parseInt(process.env.PORT || '3001', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173,https://kylosarc.org,https://www.kylosarc.org').split(',');
const MAX_BODY_SIZE = parseInt(process.env.MAX_BODY_SIZE || '4096', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '5000', 10);
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
const requestCounts = new Map();

// Security headers for all responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];
const VALIDATE_TIMEOUT_MS = 15000;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_REFRAME_MODEL = 'llama-3.3-70b-versatile';
const REFRAME_TIMEOUT_MS = 12000;
const REFRAME_SYSTEM_PROMPT = `You are a clarity editor. The user has submitted a statement that may contain logical fallacies or faulty reasoning. Rewrite the statement to be more accurate, fair, and logically sound - preserving the core intent while removing fallacious elements. Return only the rewritten statement, with no preamble, explanation, or quotation marks.`;

function getGroqKey() {
  return process.env.GROQ_API_KEY || null;
}

async function queryGroqReframe(text) {
  const key = getGroqKey();
  if (!key) return null;
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_REFRAME_MODEL,
        messages: [
          { role: 'system', content: REFRAME_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(REFRAME_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content ? { reframe: content, model: GROQ_REFRAME_MODEL } : null;
  } catch {
    return null;
  }
}

const GROQ_EVAL_FALLBACK_MODEL = 'llama-3.1-8b-instant';
const OR_EVAL_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
];

function buildEvalPrompt(question, rubric, moduleName) {
  return `You are an evaluator for a philosophical training module on ${moduleName}. A student has responded to the following question. Evaluate the depth of their thinking honestly but generously.

QUESTION: ${question}

DEPTH RUBRIC:
${rubric}

Evaluate the student's response against this rubric. Return ONLY valid JSON with no preamble:
{"depth": "surface" or "developing" or "deep", "reflection": "2-4 sentences that surface what the question was really probing, acknowledge what the student got right, and gently name what they may have missed - be honest without being harsh"}`;
}

function parseEvalResponse(content) {
  const parsed = JSON.parse(content.trim());
  if (!parsed.depth || !parsed.reflection) throw new Error('malformed response');
  if (!['surface', 'developing', 'deep'].includes(parsed.depth)) throw new Error('invalid depth value');
  return { depth: parsed.depth, reflection: parsed.reflection };
}

async function evaluateWithGroq(systemPrompt, studentResponse, model) {
  const key = getGroqKey();
  if (!key) throw new Error('no groq key');
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: studentResponse },
      ],
      max_tokens: 300,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(REFRAME_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`groq ${model} ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty groq response');
  return parseEvalResponse(content);
}

async function evaluateWithOR(systemPrompt, studentResponse) {
  const key = getOpenRouterKey();
  if (!key) throw new Error('no openrouter key');
  for (const model of OR_EVAL_MODELS) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://kylosarc.org',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: studentResponse },
          ],
          max_tokens: 300,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(VALIDATE_TIMEOUT_MS),
      });
      if (!res.ok) { console.warn(`[EVAL_OR] ${model} ${res.status}`); continue; }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) continue;
      return parseEvalResponse(content);
    } catch (e) {
      console.warn(`[EVAL_OR] ${model} error: ${e.message}`);
    }
  }
  throw new Error('all openrouter eval models failed');
}

async function evaluatePillar(question, rubric, moduleName, pillarLabel, studentResponse = '') {
  const systemPrompt = buildEvalPrompt(question, rubric, moduleName);
  const userContent = studentResponse || rubric;

  const providers = [
    { name: 'groq-primary',  fn: () => evaluateWithGroq(systemPrompt, userContent, GROQ_REFRAME_MODEL) },
    { name: 'groq-fallback', fn: () => evaluateWithGroq(systemPrompt, userContent, GROQ_EVAL_FALLBACK_MODEL) },
    { name: 'openrouter',    fn: () => evaluateWithOR(systemPrompt, userContent) },
  ];

  let lastError;
  for (const { name, fn } of providers) {
    try {
      const result = await fn();
      console.log(`[${pillarLabel}] depth=${result.depth} via ${name}`);
      return result;
    } catch (e) {
      console.warn(`[${pillarLabel}] ${name} failed: ${e.message}`);
      lastError = e;
    }
  }
  throw new Error('Evaluation service unavailable');
}

const FALLACY_SYSTEM_PROMPT = `You are a logical fallacy detection expert. Analyze the statement and determine if it contains a logical fallacy.

Supported fallacies:
- ad_hominem
- false_dilemma
- appeal_to_emotion
- false_causality
- circular_reasoning
- hasty_generalization
- strawman
- slippery_slope

Respond ONLY with valid JSON:
{"detected": true/false, "fallacy_type": "type or null", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY || process.env.FREE_OPENROUTER || process.env.GEN_OPENROUTER || null;
}

async function queryOR(text, modelId, apiKey) {
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kylosarc.org',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: FALLACY_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        max_tokens: 500,
        temperature: 0.1,
        stream: false,
      }),
      signal: AbortSignal.timeout(VALIDATE_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[VALIDATE] ${modelId} returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return {
      detected: !!parsed.detected,
      fallacy_type: parsed.fallacy_type || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reasoning: parsed.reasoning || '',
      model: modelId,
    };
  } catch (e) {
    console.warn(`[VALIDATE] ${modelId} error: ${e.message}`);
    return null;
  }
}

const FALLACY_DATA_PATH = join(__dirname, '..', 'fallacy_data.json');
let _fallacyDatasetCache = null;

function loadFallacyDataset() {
  if (_fallacyDatasetCache) return _fallacyDatasetCache;
  if (!existsSync(FALLACY_DATA_PATH)) {
    console.warn('[FALLACY] fallacy_data.json not found at', FALLACY_DATA_PATH);
    return { entries: [], by_type: {}, total: 0, sources: [] };
  }
  try {
    const raw = readFileSync(FALLACY_DATA_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const entries = data.entries || [];
    const by_type = {};
    const sources = [];
    const seenSources = new Set();
    for (const entry of entries) {
      const t = entry.fallacy_type;
      if (!by_type[t]) by_type[t] = [];
      by_type[t].push(entry);
      if (entry.source && !seenSources.has(entry.source)) {
        seenSources.add(entry.source);
        sources.push(entry.source);
      }
    }
    _fallacyDatasetCache = { entries, by_type, total: entries.length, sources };
    console.log(`[FALLACY] Loaded ${entries.length} entries (${Object.keys(by_type).length} types, ${sources.length} sources)`);
    return _fallacyDatasetCache;
  } catch (e) {
    console.error('[FALLACY] Failed to load fallacy_data.json:', e.message);
    return { entries: [], by_type: {}, total: 0, sources: [] };
  }
}

const PLASMA_URL = process.env.NOAA_PLASMA_URL || 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const MAGNET_URL = process.env.NOAA_MAGNET_URL || 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';
const RTSW_CACHE_TTL_MS = 30000;

const ECO_API_BASE = process.env.ECO_API_URL || 'https://api.open-meteo.com/v1/forecast';
const ECO_CACHE_TTL_MS = 300000; // 5 minutes - climate signal changes slowly
const ECO_TIMEOUT_MS = 8000;
// Three latitudinal reference points; Arctic and Antarctic weighted 2x (amplified warming signal)
// Baseline: pre-industrial 1850-1900 approximation, derived by subtracting IPCC AR6 zone warming
// offsets from 1991-2020 ERA5 ocean surface means (Arctic -2.0°C, Equatorial -0.7°C, Southern -1.0°C)
// This anchors the anomaly to the honest pre-industrial floor rather than the already-warmed WMO normal
const ECO_REFERENCE_POINTS = [
  {
    lat: 70, lon: 0, weight: 2, // Greenland Sea (Arctic ocean)
    // 1991-2020: [-5,-6,-5,-2,2,5,8,8,4,0,-3,-4] minus 2.0°C Arctic amplification offset
    monthlyNormals: [-7, -8, -7, -4, 0, 3, 6, 6, 2, -2, -5, -6],
  },
  {
    lat: 0, lon: 0, weight: 1, // Gulf of Guinea (equatorial Atlantic)
    // 1991-2020: [26,26.5,26.5,26,25.5,24.5,23.5,23,23.5,24.5,25.5,25.5] minus 0.7°C tropical offset
    monthlyNormals: [25.3, 25.8, 25.8, 25.3, 24.8, 23.8, 22.8, 22.3, 22.8, 23.8, 24.8, 24.8],
  },
  {
    lat: -60, lon: 0, weight: 2, // Southern Ocean (60°S - ocean, not ice sheet)
    // 1991-2020: [1,0,-2,-4,-6,-7,-8,-8,-6,-4,-1,0] minus 1.0°C Southern Ocean offset
    monthlyNormals: [0.0, -1.0, -3.0, -5.0, -7.0, -8.0, -9.0, -9.0, -7.0, -5.0, -2.0, -1.0],
  },
];
const ECO_MAX_ANOMALY_C = 6.0; // +6°C above pre-industrial normal → ecoHealth = 0
let _ecoCache = null;
let _ecoCacheTime = 0;

async function fetchEcologyPoint(lat, lon) {
  const url = `${ECO_API_BASE}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_mean&temperature_unit=celsius&timezone=UTC&past_days=7&forecast_days=0`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SovereignMirror/1.0' },
    signal: AbortSignal.timeout(ECO_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const data = await res.json();
  const temps = (data.daily?.temperature_2m_mean || []).filter(t => t != null);
  if (!temps.length) throw new Error('no temperature data');
  return temps.reduce((a, b) => a + b, 0) / temps.length;
}

async function fetchEcologyData() {
  const results = await Promise.all(
    ECO_REFERENCE_POINTS.map(p => fetchEcologyPoint(p.lat, p.lon))
  );
  const month = new Date().getMonth(); // 0-11
  let totalWeight = 0;
  let weightedAnomalySum = 0;
  ECO_REFERENCE_POINTS.forEach((ref, i) => {
    const anomaly = results[i] - ref.monthlyNormals[month];
    weightedAnomalySum += anomaly * ref.weight;
    totalWeight += ref.weight;
  });
  const temperatureAnomaly = weightedAnomalySum / totalWeight;
  const ecoHealth = Math.max(0, Math.min(1, 1 - temperatureAnomaly / ECO_MAX_ANOMALY_C));
  return {
    ecoHealth,
    temperatureAnomaly: Math.round(temperatureAnomaly * 100) / 100,
    source: 'Open-Meteo · baseline 1850-1900 (IPCC AR6)',
    timestamp: Date.now(),
  };
}

async function getEcology() {
  const now = Date.now();
  if (_ecoCache && now - _ecoCacheTime < ECO_CACHE_TTL_MS) return _ecoCache;
  try {
    const data = await fetchEcologyData();
    _ecoCache = data;
    _ecoCacheTime = now;
  } catch (e) {
    console.warn('[ECO] Fetch failed:', e.message);
  }
  return _ecoCache;
}
let _rtswCache = null;
let _rtswCacheTime = 0;

function getSafe(val, fallback) {
  const v = Number(val);
  return (v !== null && v !== undefined && isFinite(v) && v > -900) ? v : fallback;
}

// NOAA SWPC switched to array-of-arrays format: [[headers], [row], ...]
// This normalises both formats (objects or arrays) to a plain named-property object.
function parseNOAARow(data) {
  if (!Array.isArray(data) || data.length < 2) return null;
  const last = data[data.length - 1];
  if (!last) return null;
  if (!Array.isArray(last)) return last; // already an object-per-row format
  const headers = data[0];
  if (!Array.isArray(headers) || headers.length !== last.length) return null;
  const obj = {};
  headers.forEach((key, i) => { obj[key] = last[i]; });
  return obj;
}

async function fetchRTSWFromNOAA() {
  try {
    const [plasmaRes, magRes] = await Promise.all([
      fetch(PLASMA_URL, { headers: { 'User-Agent': 'SovereignMirror/1.0' }, signal: AbortSignal.timeout(8000) }),
      fetch(MAGNET_URL, { headers: { 'User-Agent': 'SovereignMirror/1.0' }, signal: AbortSignal.timeout(8000) })
    ]);
    if (!plasmaRes.ok || !magRes.ok) throw new Error(`NOAA HTTP ${plasmaRes.status}/${magRes.status}`);
    const [plasma, mag] = await Promise.all([plasmaRes.json(), magRes.json()]);
    const lp = parseNOAARow(plasma);
    const lm = parseNOAARow(mag);
    if (!lp || !lm) throw new Error('NOAA response schema unrecognised');
    // NOAA uses bx_gsm/by_gsm/bz_gsm; fall back to bx_gse/by_gse/bz_gse or plain bx/by/bz
    return {
      speed: getSafe(lp.speed ?? lp.bulk_speed, 400),
      density: getSafe(lp.density ?? lp.proton_density, 10),
      temperature: getSafe(lp.temperature ?? lp.ion_temperature, 100000),
      bx: getSafe(lm.bx_gsm ?? lm.bx_gse ?? lm.bx, 0),
      by: getSafe(lm.by_gsm ?? lm.by_gse ?? lm.by, 0),
      bz: getSafe(lm.bz_gsm ?? lm.bz_gse ?? lm.bz, 0),
      bt: getSafe(lm.bt, 0),
      timestamp: Date.now(),
      source: 'NOAA SWPC',
    };
  } catch (e) {
    console.warn('[RTSW] fetch failed, will serve stale cache:', e.message);
    return null;
  }
}

async function getRTSW() {
  const now = Date.now();
  if (_rtswCache && now - _rtswCacheTime < RTSW_CACHE_TTL_MS) {
    return _rtswCache;
  }
  const data = await fetchRTSWFromNOAA();
  if (data) {
    _rtswCache = data;
    _rtswCacheTime = now;
  }
  return _rtswCache;
}

function getRateLimitKey(req) {
  const ip = req.socket.remoteAddress || 'unknown';
  return `${ip}|${req.url?.split('?')[0] ?? ''}`;
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(key, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up expired rate limit entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      requestCounts.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  // Only return origin if it's in the allowed list; return null for unknown origins
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return null; // Reject unknown origins instead of defaulting
}

function validateNumber(value, name) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return `${name} must be a finite number`;
  }
  return null;
}

const VALID_MODES = new Set(['resonance', 'refining', 'virtual']);

const server = createServer(async (req, res) => {
  // Set request timeout to prevent slow loris attacks
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    res.writeHead(408, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request timeout' }));
    req.destroy();
  });

  // Apply security headers to all responses
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(header, value);
  }

  const origin = getCorsOrigin(req);
  
  // Only set CORS headers if origin is allowed
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    if (!origin) {
      // Reject preflight from unknown origins
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Origin not allowed' }));
      return;
    }
    res.writeHead(204);
    res.end();
    return;
  }

  const rateLimitKey = getRateLimitKey(req);
  if (isRateLimited(rateLimitKey)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many requests' }));
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'TRUSTED_KERNEL_ONLINE', timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/classify/fallacy-data' && req.method === 'GET') {
    const dataset = loadFallacyDataset();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dataset));
    return;
  }

  if (url.pathname === '/validate' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { text } = JSON.parse(body);
        if (!text || typeof text !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'text must be a non-empty string' }));
          return;
        }
        const apiKey = getOpenRouterKey();
        if (!apiKey) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No OpenRouter API key configured' }));
          return;
        }
        // Query models with fallback chain
        let result = null;
        for (const model of OR_MODELS) {
          result = await queryOR(text, model, apiKey);
          if (result) break;
        }
        const results = result ? [result] : [];
        const detectedCount = results.filter(r => r.detected).length;
        const avgConfidence = results.length > 0
          ? results.reduce((s, r) => s + r.confidence, 0) / results.length
          : 0;
        const consensus = {
          detected: detectedCount > 0,
          agents_detected: detectedCount,
          agents_queried: results.length,
          reasoning: results.map(r => `${r.model}: ${r.reasoning}`).join(' | '),
        };
        const agents = {
          openrouter: results.map(r => ({
            detected: r.detected,
            confidence: r.confidence,
            reasoning: r.reasoning,
            model: r.model,
          })),
        };
        console.log(`[VALIDATE] "${text.substring(0, 50)}..." detected=${consensus.detected} (${detectedCount}/${results.length})`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text, consensus, agents }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/rtsw/latest' && req.method === 'GET') {
    const rtsw = await getRTSW();
    if (rtsw) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rtsw));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'NOAA unavailable' }));
    }
    return;
  }

  if (url.pathname === '/api/ecology/latest' && req.method === 'GET') {
    const eco = await getEcology();
    if (eco) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(eco));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ecology data unavailable' }));
    }
    return;
  }

  if (url.pathname === '/api/pgate/engage' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const { mode, level } = JSON.parse(body);

        if (!mode || typeof mode !== 'string' || !VALID_MODES.has(mode)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'mode must be a non-empty string matching: resonance, refining, virtual' }));
          return;
        }

        const levelErr = validateNumber(level, 'level');
        if (levelErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: levelErr }));
          return;
        }

        const threshold = getThresholdWithEntropy();
        const canEngage = level >= threshold;

        const engagement = {
          mode,
          level,
          threshold,
          canEngage,
          status: canEngage ? 'ENGAGED' : 'BLOCKED',
          message: canEngage
            ? `P-Gate engaged at resonance level ${level.toFixed(3)}`
            : `Resonance level ${level.toFixed(3)} below threshold ${threshold.toFixed(3)}`,
          timestamp: Date.now()
        };

        console.log(`[PGATE] ${engagement.status} - ${engagement.message}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(engagement));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/veracity/calculate' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const { active, control } = JSON.parse(body);
        const activeErr = validateNumber(active, 'active');
        const controlErr = validateNumber(control, 'control');
        if (activeErr || controlErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: activeErr || controlErr }));
          return;
        }
        const result = veracityGate(active, control);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ veracity: result, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/quorum/calculate' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const { activeNodes, affirmingNodes } = JSON.parse(body);
        const nodesErr = validateNumber(activeNodes, 'activeNodes');
        if (nodesErr || activeNodes < 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: nodesErr || 'activeNodes must be >= 1' }));
          return;
        }
        if (affirmingNodes !== undefined) {
          const affErr = validateNumber(affirmingNodes, 'affirmingNodes');
          if (affErr) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: affErr }));
            return;
          }
        }
        const quorum = calculateQuorum(activeNodes);
        const reached = affirmingNodes !== undefined ? affirmingNodes >= quorum : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ quorum, reached, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/atrophy/calculate' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const { virtualResonance, elapsedMs } = JSON.parse(body);
        const vrErr = validateNumber(virtualResonance, 'virtualResonance');
        const msErr = validateNumber(elapsedMs, 'elapsedMs');
        if (vrErr || msErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: vrErr || msErr }));
          return;
        }
        const result = calculateAtrophyDecay(virtualResonance, elapsedMs);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ atrophied: result, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/kernel/version' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      version: '1.0.0',
      build: 'TRUSTED_KERNEL',
      commit: 'SOVEREIGN_MIRROR_PHASE_7',
      timestamp: Date.now()
    }));
    return;
  }

  if (url.pathname === '/api/feedback/weights' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ weights: getAllWeights(), timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE * 4) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const { statementId, fallacyId, text, verdict, agentScores } = JSON.parse(body);
        if (!verdict || !['correct', 'incorrect', 'false_negative'].includes(verdict)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'verdict must be "correct", "incorrect", or "false_negative"' }));
          return;
        }
        const before = getAllWeights();
        const after = applyVerdict({ verdict, agentScores: agentScores || {} });
        recordFeedback({ statementId, fallacyId, text, verdict, agentScores, weightBefore: before, weightAfter: after });
        console.log(`[FEEDBACK] ${verdict} on ${fallacyId || statementId} | weights: ${Object.entries(after).map(([k,v]) => `${k}=${v.weight.toFixed(2)}`).join(', ')}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, weights: after, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/feedback/history' && req.method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events: getRecentFeedback(limit), timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/api/feedback/analyze' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE * 8) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const payload = JSON.parse(body);
        recordAnalysis(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/feedback/analyses' && req.method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events: getRecentAnalyses(limit), timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/api/pillar2/evaluate' && req.method === 'POST') {
    const PILLAR2_QUESTIONS = {
      q1: {
        question: 'How do you figure out if you are right in an argument?',
        rubric: `Surface: The respondent stays within the frame of "figuring out they're right" - presenting evidence, making their case, noting when the other person can't respond. The goal of winning is unexamined.
Developing: Some awareness that winning isn't the only goal, or mentions listening to the other side, but doesn't fully reframe the question.
Deep: Recognizes the question contains a trap. "Figuring out you're right" is the wrong frame entirely. A deep answer involves seeking disconfirmation, checking one's own reasoning for errors, being genuinely willing to be wrong, and understanding that the goal is to arrive at truth - not to win. The deepest answers note that you can only really know you're right by trying hard to prove yourself wrong first.`,
      },
      q2: {
        question: 'What is the distinction between jealousy and envy?',
        rubric: `Surface: Conflates the two, reverses them, or gives only a vague sense that they differ.
Developing: Knows they're distinct and gestures at the difference but misses the structural architecture.
Deep: Identifies that jealousy is fundamentally relational and requires three people - you, the person you fear losing, and the third party threatening that bond. It is natural, not ideal, but workable through attenuation. Envy requires only two people and an object - it is learned, not natural, destructive, and has a documented escalation path toward ill-will and sometimes far worse (historically: sabotage, elimination of the person who has the thing). The structural key is the triad vs. dyad-plus-object distinction.`,
      },
      q3: {
        question: 'Is the Golden Rule the best framework for navigating ethical dilemmas? If not, what is better?',
        rubric: `Surface: Endorses the Golden Rule without qualification.
Developing: Identifies a limitation - treating others as you want to be treated can be projection, since others may want different things.
Deep: Identifies the Platinum Rule (treat others as they want to be treated) or equivalent reframing. Understands that the Golden Rule, while a useful starting heuristic, is limited by the assumption that others share your preferences. Better frameworks center the other person's actual desires and wellbeing. The deepest answers also note that even the Platinum Rule requires the epistemic humility to actually ask - rather than assume you know what others want.`,
      },
      q4: {
        question: 'Is it acceptable to be silent when someone is telling you something that is important to them?',
        rubric: `Surface: No - silence seems like dismissal or indifference.
Developing: Sometimes silence is fine, or you don't always need an answer ready.
Deep: Silence can be the deepest form of presence. Active listening is a gift. The compulsion to respond is often about the listener's own discomfort, not the speaker's need. Not everything requires a fix, a comment, or a verbal signal of engagement. Presence without performance is a mark of high relational intelligence. The deepest answers recognize that speaking too quickly often forecloses the other person's process rather than supporting it.`,
      },
    };

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { questionId, response } = JSON.parse(body);
        const q = PILLAR2_QUESTIONS[questionId];
        if (!q || !response || typeof response !== 'string' || response.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'questionId and response required' }));
          return;
        }
        const result = await evaluatePillar(q.question, q.rubric, 'Relational Integrity', 'PILLAR2', response.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message.includes('unavailable') ? 503 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/pillar3/evaluate' && req.method === 'POST') {
    const PILLAR3_QUESTIONS = {
      q1: {
        question: 'When two resource systems are in competition - say, energy and water - what principle guides which to address first?',
        rubric: `Surface: Addresses whichever is more immediately scarce or urgent, without a structural principle.
Developing: Notes that some systems depend on others, or that solving one enables solving another.
Deep: Identifies cascade dependency as the governing principle - you ask which system is prerequisite to the other. Energy enables water solutions at scale (desalination, pumping, treatment) but water is not similarly prerequisite to energy generation in most scenarios. The right sequence is not determined by severity alone but by which intervention unlocks the others. A deep answer also notes that second-order effects must be traced: solving energy cheaply might increase water consumption, worsening the original problem.`,
      },
      q2: {
        question: 'What is a second-order consequence? Describe one from any system you can think of.',
        rubric: `Surface: A secondary effect, or "unintended consequence," described without structural clarity.
Developing: Correctly identifies a consequence of a consequence - the effect of the effect - with a plausible example.
Deep: Articulates the chain: a first-order effect is the direct result of an intervention; a second-order effect is what that result causes in turn. A deep answer traces at least two steps (A causes B, B causes C) and recognizes that second-order effects are frequently more significant than first-order ones - and often in the opposite direction. Strong examples: electric vehicles reduce emissions (1st order) but increase lithium mining demand, which causes habitat destruction and water contamination (2nd order). Or: deforestation increases agricultural land (1st order) but causes topsoil erosion, which reduces long-term agricultural yield (2nd order).`,
      },
      q3: {
        question: 'What distinguishes a regenerative approach to ecological systems from a merely sustainable one?',
        rubric: `Surface: Regenerative is better than sustainable, or goes further, without explaining the structural difference.
Developing: Sustainability maintains the status quo; regenerative improves it.
Deep: Sustainability is a floor - it means not making things worse, maintaining current capacity. Regenerative is a direction - it means actively restoring degraded capacity, building surplus, increasing the system's own resilience over time. A sustainable farm doesn't deplete the soil. A regenerative farm builds topsoil year over year. The distinction matters because many planetary systems are already below their baseline - merely sustaining a depleted state perpetuates the deficit. Regenerative design acknowledges that the goal is not equilibrium with a damaged baseline but restoration toward a healthier one.`,
      },
    };

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { questionId, response } = JSON.parse(body);
        const q = PILLAR3_QUESTIONS[questionId];
        if (!q || !response || typeof response !== 'string' || response.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'questionId and response required' }));
          return;
        }
        const result = await evaluatePillar(q.question, q.rubric, 'Environmental Stewardship and systems thinking', 'PILLAR3', response.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message.includes('unavailable') ? 503 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/pillar3/sequence' && req.method === 'POST') {
    // WEFE scenario: Water Table -42%, Energy Cost +18%
    // Canonical cascade: Geothermal → Fermentation → Solar → Atmospheric
    // Reasoning: expensive energy → cheapest baseload first (Geothermal);
    // reduce agricultural water demand before adding more water supply (Fermentation);
    // scale energy once baseload is established (Solar);
    // atmospheric harvesting is energy-intensive and works best last (Atmospheric).
    const CANONICAL = ['geothermal', 'fermentation', 'solar', 'atmospheric'];
    const INTERVENTION_LABELS = {
      geothermal:   'Deep Geothermal Gyrotrons',
      fermentation: 'Precision Fermentation',
      solar:        'Space-Based Solar Power',
      atmospheric:  'Atmospheric Water Harvesting',
    };
    const CASCADE_EXPLANATION = `Given Water Table −42% and Energy Cost +18%, the governing constraint is expensive energy - every other intervention depends on cheap, reliable power.

1. Deep Geothermal first: baseload power from Earth's heat requires no fuel cost after installation, and energy is the prerequisite to everything else. With energy costs already elevated, the highest-leverage move is the cheapest baseload source.

2. Precision Fermentation second: decoupling protein production from agriculture immediately reduces pressure on the water table - no energy-intensive infrastructure required. This buys time on the water crisis before deploying the next intervention.

3. Space-Based Solar third: now that geothermal baseload is established, additional solar capacity allows energy-intensive desalination and industrial water treatment at scale.

4. Atmospheric Water Harvesting last: moisture capture arrays are energy-intensive to run at meaningful scale. They become viable only when energy surplus exists and agricultural water demand has already been reduced. Deploying them first would be prohibitively expensive given the energy cost baseline.`;

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const { sequence } = JSON.parse(body);
        if (!Array.isArray(sequence) || sequence.length !== 4) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'sequence must be an array of 4 intervention ids' }));
          return;
        }
        // Score: count positions matching canonical
        const matches = sequence.filter((id, i) => id === CANONICAL[i]).length;
        const score = matches; // 0–4
        const label = score === 4 ? 'exact' : score >= 2 ? 'partial' : 'inverted';
        console.log(`[PILLAR3] sequence=${sequence.join(',')} score=${score}/4`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          score,
          label,
          canonical: CANONICAL,
          canonicalLabels: INTERVENTION_LABELS,
          explanation: CASCADE_EXPLANATION,
        }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/reframe' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { text } = JSON.parse(body);
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'text must be a non-empty string' }));
          return;
        }
        const result = await queryGroqReframe(text.trim());
        if (result) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Reframe service unavailable' }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/pillar4/evaluate' && req.method === 'POST') {
    const PILLAR4_QUESTIONS = {
      q1: {
        question: 'What is the difference between a tool that makes you more capable and one that makes you dependent on it?',
        rubric: `Surface: Lists features of "good" vs "bad" tools, or defaults to "it depends." No structural distinction.
Developing: Notes that capability-enhancing tools leave the user more skilled when removed; dependency-creating tools degrade the user. Gets the direction right but doesn't dig into the mechanism.
Deep: The structural distinction is whether the tool transfers capability to the user or substitutes for it. Enhancing tools make you better at the underlying skill - the GPS that teaches you the city vs. the GPS that replaces your spatial reasoning. The deepest answers note that the same tool can be either, depending on how it is used (deliberate practice vs. passive reliance), and that the test is: could you function better without it after using it for a year?`,
      },
      q2: {
        question: 'If an AI system were fully aligned with your personal values but misaligned with broader social values, what would that look like - and is it a problem?',
        rubric: `Surface: "Yes it's bad" without examining what makes it a problem, or "it depends" without elaboration.
Developing: Notes the tension between personal and social values, or uses an example, but doesn't articulate why the misalignment is structurally dangerous.
Deep: This is a description of most factional AI applications: an AI perfectly optimizing for one stakeholder's preferences in a multi-stakeholder world creates competitive advantages that exacerbate power asymmetries. The deeper problem is that "alignment with my values" is usually shallow - it aligns with expressed preferences, not reflected values - and an AI that optimizes your preferences will also optimize your biases. The deepest answers note that personal/social value alignment isn't binary: the interesting space is when the two conflict and who has authority to resolve the conflict.`,
      },
      q3: {
        question: 'Name something you interact with daily that is a system. Describe one property of it that most users never perceive.',
        rubric: `Surface: Names something obvious (phone, traffic, internet) but the hidden property is trivial or generic ("it has many parts").
Developing: Identifies a non-obvious property - feedback loops, emergent behavior, latency, failure modes - but the description stays abstract.
Deep: Names a specific system and surfaces a genuinely non-obvious structural property: a feedback loop that most users experience as a feature (social media engagement as addiction architecture), a hidden dependency (city water pressure relies on constant demand - reduce demand and you reduce pressure), a failure mode baked into the design (financial clearing systems assume stability that makes them fragile at extremes), or an emergent behavior that was never intended. The deepest answers demonstrate systems-level fluency: seeing structure that others experience only as surface behavior.`,
      },
      q4: {
        question: 'Exponential growth is often cited as the engine of technological progress. When is exponential growth a warning signal rather than a feature?',
        rubric: `Surface: "When it gets too fast" or "when it's uncontrolled" - circular answers that don't identify the actual structural issue.
Developing: Identifies specific cases - viral spread, debt accumulation, resource consumption - but doesn't unify them.
Deep: Exponential growth is a warning signal when it is operating in a bounded system: the exponential will eventually hit a wall (epidemic, debt crisis, ecological collapse) and the wall arrives much faster than linear intuition predicts. The deeper problem is that the lag between cause and effect in exponential systems makes correction nearly impossible once you can perceive the problem - by the time exponential growth becomes visible, intervention is often too late. The deepest answers note that the question of whether exponential growth is good or bad is always relative to what is growing and what are the system boundaries.`,
      },
    };

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { questionId, response } = JSON.parse(body);
        const q = PILLAR4_QUESTIONS[questionId];
        if (!q || !response || typeof response !== 'string' || response.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'questionId and response required' }));
          return;
        }
        const result = await evaluatePillar(q.question, q.rubric, 'Technological Fluency', 'PILLAR4', response.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message.includes('unavailable') ? 503 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/pillar5/evaluate' && req.method === 'POST') {
    const PILLAR5_QUESTIONS = {
      q1: {
        question: 'What happens to your decision-making quality when you are sleep-deprived - and why does the most sleep-deprived person often feel the least impaired?',
        rubric: `Surface: Sleep deprivation makes you tired and slow. No structural explanation for the self-assessment blindspot.
Developing: Notes that sleep deprivation impairs judgment, including the judgment needed to assess impairment. Gets the paradox right but doesn't explain the mechanism.
Deep: Sleep deprivation degrades the prefrontal cortex - the very circuitry responsible for self-assessment - while leaving subcortical systems relatively intact. This is why subjective alertness diverges from objective performance: you feel fine because the system that would tell you otherwise is the one that is broken. The deepest answers note that this makes sleep deprivation uniquely dangerous compared to other forms of impairment - most impairments produce discomfort that signals their presence; sleep deprivation suppresses the signal along with the function.`,
      },
      q2: {
        question: 'Most people treat stress as something to eliminate. When is stress not only unavoidable but necessary for growth?',
        rubric: `Surface: "Good stress and bad stress exist" - acknowledges the category without structural analysis.
Developing: Identifies hormesis (beneficial low-dose stress), supercompensation, or specific domains (exercise, immune challenge) where stress is adaptive. Accurate but may stay at the level of examples.
Deep: Stress is necessary for growth when it triggers adaptive response: the system must be challenged beyond its current capacity, then given adequate recovery time, to build new capacity. This is the architecture of antifragility - systems that don't face stress become fragile because they optimize for current conditions. The key variables are dose, duration, and recovery: any stressor that prevents recovery destroys rather than builds. The deepest answers note that this applies as much to cognitive and social stress as physical - intellectual discomfort, productive conflict, and meaningful challenge are physiologically similar to exercise loads.`,
      },
      q3: {
        question: 'What is the difference between the absence of disease and the presence of health?',
        rubric: `Surface: They're similar, or health is just more than no disease. Doesn't identify the structural distinction.
Developing: Notes that health is positive - energy, resilience, function - not merely the absence of pathology. Gets the direction right.
Deep: Disease and health are measured on different axes. Disease is a diagnostic category - you have it or you don't (within a diagnostic threshold). Health is a continuum of function, resilience, and adaptive capacity that has no natural ceiling. The absence of diagnosed disease is a floor, not a destination. The deeper structural point is that optimization for disease absence (reactive medicine) produces a different system than optimization for health presence (regenerative or proactive medicine) - the metrics, interventions, incentives, and time horizons are all different. The deepest answers note that this is also a political and economic problem: healthcare systems are structured to treat disease, not cultivate health, because disease is legible and reimbursable in ways that health is not.`,
      },
      q4: {
        question: 'If the goal of longevity is to compress morbidity - to live fully and then decline quickly - what decisions made today most determine the quality of your final decade?',
        rubric: `Surface: Eat well, exercise, don't smoke - the standard public-health list without structural reasoning.
Developing: Identifies specific high-leverage variables: VO2 max, muscle mass, metabolic health, social connection. Gets the right categories but may not explain why they're most determinative.
Deep: The decisions that most determine the quality of your final decade are those with the longest compounding timelines and the highest leverage on the leading causes of functional decline. The research points to: (1) cardiovascular fitness measured by VO2 max - the single strongest predictor of longevity and functional independence - built through sustained aerobic training over decades; (2) muscle mass and strength - lost at 1-3% per year after 40 without active resistance training, and the primary buffer against fall-injury mortality in old age; (3) metabolic health - insulin sensitivity and glucose regulation affect cognitive function, cardiovascular risk, and inflammation across multiple pathways; (4) social connection - the strongest psychosocial predictor of longevity. The deepest answers note that these investments compound: each decade of neglect makes recovery more expensive and recovery in the final decades nearly impossible.`,
      },
    };

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { questionId, response } = JSON.parse(body);
        const q = PILLAR5_QUESTIONS[questionId];
        if (!q || !response || typeof response !== 'string' || response.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'questionId and response required' }));
          return;
        }
        const result = await evaluatePillar(q.question, q.rubric, 'Physiological Optimization', 'PILLAR5', response.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message.includes('unavailable') ? 503 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/pillar6/evaluate' && req.method === 'POST') {
    const PILLAR6_QUESTIONS = {
      q1: {
        question: 'What is the structural difference between being busy and being productive?',
        rubric: `Surface: Busy means doing lots of things; productive means doing important things. Common wisdom without structural analysis.
Developing: Notes that busyness optimizes for activity count while productivity optimizes for output quality. Identifies attention fragmentation, the tyranny of the urgent, or Parkinson's Law.
Deep: The structural distinction is between input-optimization (filling time) and output-optimization (generating value). Busyness creates the illusion of progress through continuous low-stakes activity; it is often a defense mechanism against the discomfort of high-stakes focused work. The deepest insight is that busyness is legible - it signals effort to observers and feels safe - while deep productive work is often invisible until completion, creating social pressure toward busyness in collaborative environments. The deepest answers note that a productive day and a busy day can look identical from the outside; the distinction is internal and requires reliable self-evaluation, which is itself a skill that must be trained.`,
      },
      q2: {
        question: 'Why does the person with the most control over their attention tend to produce asymmetric value - not just more output, but disproportionately more?',
        rubric: `Surface: Focused people get more done. Generic productivity advice.
Developing: Notes flow states, deep work theory, or the compounding effect of uninterrupted concentration. Gets the direction right.
Deep: The reason attention produces asymmetric returns is that cognitively demanding creative and analytic work is not linearly scalable. An hour of genuine focus on a hard problem does not produce twice what thirty minutes produces - it often produces ten or a hundred times more, because insight accumulates: each increment of focused time builds on the last in a way that fragmented attention cannot. The person who controls their attention can enter this compounding regime; the person whose attention is continuously interrupted operates at the linear level regardless of hours worked. The deepest answers note that attention is also the meta-resource - it is required for the learning that improves every other skill - which means attention advantage compounds over long time horizons into capability gaps that cannot be closed by simply working more hours.`,
      },
      q3: {
        question: 'What makes a deadline generative - one that actually produces better work - rather than merely pressuring?',
        rubric: `Surface: Deadlines help if they are realistic. Common sense without structural analysis.
Developing: Notes psychological phenomena like Parkinson's Law, that constraints catalyze creativity, or that urgency produces focus. Gets meaningful territory.
Deep: A deadline is generative when it closes off an option space that would otherwise be held open indefinitely - forcing a decision, a scope, a commitment - and when the timing aligns with the natural rhythm of the creative process. The structure of a generative deadline: it is external (not self-imposed and therefore escapable), the consequence of missing it is real and proximate enough to create urgency without panic, and it falls after enough time for genuine work but before the period of diminishing returns that afflicts all extended projects. A merely pressuring deadline has urgency without closure: it does not help you decide what to include or exclude, only when to stop. The deepest answers note that the most generative constraint is often scope rather than deadline: "this must be done by Friday and must fit on one page" is more generative than "this must be done by Friday" alone.`,
      },
      q4: {
        question: 'What does it mean to protect your attention at the level of a system rather than at the level of individual decisions?',
        rubric: `Surface: Blocking calendar time, turning off notifications. Tactical answers.
Developing: Notes that individual decisions are insufficient - systemic defaults outperform willpower exercised in the moment. Gets the structural shift.
Deep: Protecting attention at the system level means building structures that make intrusion expensive or impossible by default, rather than relying on willpower to defend focus in real time. The difference is where the decision cost falls: a system puts the cost on the intruder (they must overcome the system to reach you) rather than on the defender (who must marshal willpower to say no each time). Examples of system-level attention protection: no-meeting days enforced organizationally, asynchronous-first communication norms, physical environments without phones, technical filters. The deepest answers note that system-level protection also changes the social contract: when the system makes deep work the default, the person doing it is not being antisocial - the system absorbs the social cost. This is why individual willpower solutions consistently fail: they impose all the social cost on the individual, which is unsustainable over time.`,
      },
    };

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { questionId, response } = JSON.parse(body);
        const q = PILLAR6_QUESTIONS[questionId];
        if (!q || !response || typeof response !== 'string' || response.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'questionId and response required' }));
          return;
        }
        const result = await evaluatePillar(q.question, q.rubric, 'Temporal Discipline', 'PILLAR6', response.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message.includes('unavailable') ? 503 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/pillar7/evaluate' && req.method === 'POST') {
    const PILLAR7_QUESTIONS = {
      q1: {
        question: 'Where do genuinely new ideas come from? Not improved ones - structurally novel ones.',
        rubric: `Surface: Reading, experience, creativity, inspiration. Descriptive but not structural.
Developing: Notes the combinatorial theory - new ideas come from connecting existing ideas in new ways. Accurate but may stop there.
Deep: Genuinely novel ideas emerge from encountering problems that existing frameworks cannot solve. The pressure of an unsolvable problem drives the mind to relax the constraints of its current paradigm and search adjacent conceptual space. This is why domain-crossing is so productive: the constraints that make a problem unsolvable within one discipline often don't apply in another, and the tools that solve it there are invisible to specialists in the original field. The deepest answers note that "new" is always relative to the knower - what is genuinely novel for one person is commonplace for another - and that the question of where new ideas come from is inseparable from how much of the existing conceptual space has been mapped. A person at the edge of their domain's knowledge encounters genuinely new territory; the question is whether they recognize it as territory rather than error.`,
      },
      q2: {
        question: 'What makes an analogy between two domains useful rather than merely decorative?',
        rubric: `Surface: A good analogy helps explain things. Surface-level correct.
Developing: Notes that useful analogies share structural rather than surface similarity, or that they generate predictions rather than just illumination.
Deep: An analogy is useful when it maps relational structure from a familiar domain onto a less-familiar one, and when that mapping generates predictions or actions that are verifiable. The test of a useful analogy is not whether it illuminates - many decorative analogies illuminate - but whether it makes you expect things you wouldn't have expected without it. A structural analogy between blood circulation and economic circulation does not just help you understand economics; it tells you to look for regulators, clotting mechanisms, and pressure differentials in economic systems and check whether they exist. A decorative analogy generates only a feeling of understanding; a structural analogy generates hypotheses. The deepest answers note that the danger of analogy is that structural mappings are always partial: every analogy fails somewhere, and the failure points are as informative as the successes - they mark the precise boundaries of the structure's applicability.`,
      },
      q3: {
        question: 'Why does expertise in a field sometimes make it harder to solve problems in that field?',
        rubric: `Surface: Experts have blind spots or get set in their ways. Common intuition without mechanism.
Developing: Notes the Einstellung effect, functional fixedness, or the curse of knowledge - expertise creates grooves that are hard to leave.
Deep: Expertise encodes solutions to problems the expert has already solved, and the more successful those solutions have been, the more reflexively they are applied. The structural problem is that expertise is stored as patterns: when a domain expert encounters a new problem, pattern-matching activates their most successful past solutions before they have examined the new problem's actual structure. In a stable field this is efficient; in a field undergoing structural change it produces confident failure. The deepest answers note that expertise also creates language: domain-specific vocabulary enables fast communication within the field but shapes what problems can even be formulated. Problems that lack names in the expert's vocabulary are harder to see - and the most novel problems are precisely those that don't fit existing categories. The antidote is not less expertise but deliberate category-violation: asking what would have to be true for this problem to belong to a completely different domain.`,
      },
      q4: {
        question: 'What is the difference between a creative person and a creative process - and why does the distinction matter?',
        rubric: `Surface: Creative people have traits; creative processes have steps. Surface distinction.
Developing: Notes that creativity is more process than trait - that consistently creative people use identifiable practices, not just inspiration.
Deep: The distinction matters because attributing creativity to persons rather than processes makes creativity feel innate and therefore unteachable. A creative person, in the attributional sense, is someone who consistently produces novel output; a creative process is a reproducible sequence of conditions, inputs, and operations that reliably generates novel output regardless of who runs it. What we call "creative people" are usually people who have internalized effective creative processes to the point where the process runs without conscious effort. The implication is that creativity is trainable, but only by training process rather than character. The deepest answers note that this distinction also matters institutionally: a creative institution is one that has embedded generative processes in its structure, not one that has hired creative individuals. Individual creativity is fragile - it leaves with the person. Process creativity is robust - it persists through personnel change and can be transferred, improved, and scaled.`,
      },
    };

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { questionId, response } = JSON.parse(body);
        const q = PILLAR7_QUESTIONS[questionId];
        if (!q || !response || typeof response !== 'string' || response.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'questionId and response required' }));
          return;
        }
        const result = await evaluatePillar(q.question, q.rubric, 'Creative Synthesis', 'PILLAR7', response.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message.includes('unavailable') ? 503 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/pillar8/evaluate' && req.method === 'POST') {
    const PILLAR8_QUESTIONS = {
      q1: {
        question: 'What is the structural difference between majority rule and consent-based governance - and when does the distinction matter most?',
        rubric: `Surface: Majority rule means 51% wins; consent means everyone agrees. Surface-level correct but no structural depth.
Developing: Notes that consent-based governance requires the absence of valid principled objections, not unanimity - it shifts the burden from "who has more votes" to "does anyone have a justified objection." Gets the structural shift.
Deep: Majority rule creates a permanent minority whose preferences are systematically overridden - in repeated interactions, this minority learns that participation is futile and exits or defects. Consent-based governance requires that no participant has a principled objection the group cannot address, which means it cannot proceed until it has either resolved objections or shown they are not principled. The structural advantage is buy-in: decisions that pass consent tests have already survived challenge by every participant. The structural cost is latency. The distinction matters most in high-stakes, repeated-interaction environments where the minority's future cooperation is required - governance of shared resources, collaborative communities where exit is costly. The deepest answers note that consent-based systems require more epistemic sophistication: participants must distinguish "I prefer a different option" (not a valid objection) from "this causes harm the group hasn't considered" (a valid one). Training this distinction is as important as the protocol itself.`,
      },
      q2: {
        question: 'How does a quorum threshold protect a governance system against capture by a coordinated minority?',
        rubric: `Surface: Quorum prevents decisions when too few people show up. Basic understanding of the mechanism.
Developing: Notes that without quorum, a small coordinated group could make decisions affecting a larger group that wasn't present. Gets the capture problem.
Deep: The structural threat of minority capture is not simply low attendance but coordinated action: a small group that shows up reliably, votes in concert, and understands the rules better than the majority can consistently shape outcomes even when the majority would disagree if informed and present. Quorum requirements force a minimum population threshold before decisions are binding, but they are insufficient alone - a coordinated minority that reaches quorum while the majority is absent still captures the outcome. The deeper protection is quorum combined with supermajority thresholds: requiring both sufficient attendance and sufficient agreement. The deepest answers note that quorum formulas involve real tradeoffs: a quorum set too high makes legitimate decisions impossible; set too low it fails to protect against capture. Sub-linear growth functions (quorum growing slower than N) can make quorum reachable by honest majorities while remaining resistant to small coordinated groups. No quorum structure is fully capture-proof - all governance systems create incentives for strategic behavior, and the question is whether the strategic behavior the system incentivizes is pro-social.`,
      },
      q3: {
        question: 'What does it mean for a governance system to be "trustless" - and when would that property be worth pursuing?',
        rubric: `Surface: Trustless means you don't need to trust anyone. Tautological.
Developing: Notes that trustless systems replace trust in individuals with trust in verifiable rules or cryptographic guarantees - shifts trust from actors to protocols.
Deep: A trustless governance system is one where the correctness of decisions and the integrity of processes can be verified by any participant without relying on the good faith of any other participant. The desirability of this property is not universal - it trades human judgment and contextual flexibility for verifiability and manipulation-resistance. Trustless systems are most worth pursuing when: stakes are high enough that bad-faith actors have strong incentive to corrupt; participants lack established relationships or shared institutional history; the decision domain is rule-governed enough that algorithmic verification is possible; and the cost of verification is lower than the expected cost of trust failure. The deepest answers note that "trustless" is always relative: all systems require trust at some layer (trust in the cryptography, trust in the hardware, trust in the language rules are written in). Trustlessness is always a reduction in the scope of required trust, not its elimination - and the goal is to push the required trust downward to layers where failure is visible and auditable.`,
      },
      q4: {
        question: 'What is the structural difference between meritocratic allocation and power-responsive allocation - and how would you tell them apart in a real system?',
        rubric: `Surface: Meritocracy means the best person gets the resource; power-responsive means the most powerful person gets it.
Developing: Notes that "merit" is hard to define and often encodes existing power structures - that what presents as meritocracy is often power-responsiveness with legitimating language.
Deep: The structural distinction is whether allocation tracks a property of the recipient that is causally connected to productive use of the resource, or a property connected to their ability to demand or extract it. In genuinely meritocratic allocation, the person who gets the resource can use it to generate more value than any alternative recipient - and this is verified by a mechanism not controlled by the most powerful candidates. The diagnostic test is: what happens when a low-status person with high competence competes against a high-status person with lower competence? If the answer consistently favors the high-status person, the system is power-responsive regardless of its self-description. The deepest answers note that pure meritocracy is logically incoherent in systems where early allocations compound: initial resource access shapes future competence, so the allocations that produced "merit" were themselves shaped by prior power distributions. This is why governance systems need explicit mechanisms for resetting starting conditions, not just fair allocation rules at the point of decision.`,
      },
    };

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { questionId, response } = JSON.parse(body);
        const q = PILLAR8_QUESTIONS[questionId];
        if (!q || !response || typeof response !== 'string' || response.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'questionId and response required' }));
          return;
        }
        const result = await evaluatePillar(q.question, q.rubric, 'Collaborative Governance', 'PILLAR8', response.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message.includes('unavailable') ? 503 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/pillar9/evaluate' && req.method === 'POST') {
    const PILLAR9_QUESTIONS = {
      q1: {
        question: 'GDP is the dominant metric of national success. What does it structurally fail to measure - and why does that failure matter for governance?',
        rubric: `Surface: GDP doesn't measure happiness. Common but superficial.
Developing: Names specific exclusions: environmental externalities, unpaid labor, income distribution, health, social cohesion. Accurate but may stay at the list level.
Deep: GDP's structural limitation is not simply what it omits but what it perversely includes: environmental destruction appears as GDP growth (the cleanup counts as economic activity); ill health drives healthcare spending that counts as output; social breakdown generates security and litigation costs. The deeper problem is that GDP measures throughput, not outcome - flow of economic activity, not the stock of wellbeing, resilience, or productive capacity. A country that exhausts its natural resources, educates its children poorly, and leaves most citizens in precarious employment can have high GDP growth right up until collapse. The deepest answers note that the reason GDP persists despite these known flaws is political: it is measurable, comparable across countries, and legible to debt markets in ways that alternative metrics are not. Wellbeing, ecological sustainability, and human development are contested and harder to manipulate toward desired outcomes. The persistence of GDP is a story about what governance systems can measure and report, not a claim about what they value.`,
      },
      q2: {
        question: 'What is the structural difference between a system that is robust and one that is anti-fragile?',
        rubric: `Surface: Robust means it survives stress; anti-fragile means it gets better under stress. Accurate definition without structural analysis.
Developing: Gives examples of each and notes the contrast. May discuss redundancy as the key to robustness, or optionality as key to anti-fragility.
Deep: Robustness is designed to absorb stress without degrading - it achieves this through redundancy, over-engineering, and avoidance of tight coupling. Anti-fragility is a structurally different property: the system's response to stress is not neutral but positive, meaning stress triggers an adaptive response the system would not undergo without the stressor. The mechanism of anti-fragility is variance: an anti-fragile system has options, exercises them asymmetrically (benefits more from upside variance than it loses to downside variance), and updates based on experience. The deepest answers note the design implication: robustness optimizes against specific known stressors - you must identify the threat and engineer against it. Anti-fragility is productive under novel stressors - you don't need to predict the threat, only ensure the response is generative. In environments with high uncertainty, anti-fragility outperforms robustness because it does not require a correct threat model. The cost is that anti-fragile systems require genuine exposure to stress - protecting them from all volatility removes the mechanism that makes them strengthen.`,
      },
      q3: {
        question: 'If you had to design a single metric for flourishing in a community, what would you measure and why - and what are the hardest tradeoffs in that design?',
        rubric: `Surface: Measure happiness or quality of life. Vague without structure.
Developing: Names specific multi-capital indicators (social connection, mental health, economic security, environmental quality) or references frameworks like the Human Development Index. Gets meaningful territory.
Deep: The design challenge of a flourishing metric is not finding the right variables but finding variables that are causally connected to the target state (not proxies that can be manipulated without changing underlying conditions); measurable at reasonable cost and frequency; resistant to Goodhart's Law (when a measure becomes a target, it ceases to be a good measure); and legible enough to drive governance decisions without specialist interpretation. The deepest answers note that there is no single metric for flourishing that survives all these constraints - every scalar reduction from a multidimensional reality involves contested value judgments about what matters more, and every legible metric creates incentives to optimize the metric rather than the underlying condition. The right design is probably a dashboard of indicators with explicit acknowledgment that the weighting is a political decision, not a technical one - and with built-in mechanisms for updating the metric when its Goodhart failure mode becomes visible.`,
      },
      q4: {
        question: 'Does individual flourishing and collective flourishing always align - and if not, what determines when they conflict?',
        rubric: `Surface: They're related - happy people make happy communities. Surface-level correct.
Developing: Notes cases where they align (high-trust communities) and cases where they conflict (individual advancement through exploitation of commons). Gets the tension.
Deep: Individual and collective flourishing align when the conditions for individual wellbeing are also the conditions for collective functioning - trust, safety, health, meaningful work, political voice. They conflict when individual advancement is achieved through zero-sum competition for positional goods (status, relative income) or through extraction of commons (pollution, resource depletion, attention capture). The structural question is not whether they align in a given case but whether the system's incentive architecture makes them align by default or requires exceptional moral effort to align them. A well-designed governance system makes the individually rational choice align with the collectively beneficial choice - this is the governance design problem in compressed form. The deepest answers note that this alignment is historically rare: most societies have relied on moral or cultural pressure to bridge the gap between individual and collective interest, and these pressures erode under conditions of anonymity, mobility, and institutional distrust. Designing systems where the two genuinely align - not through suppression of individual interest but through structural design - is the central unsolved challenge of governance.`,
      },
    };

    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { questionId, response } = JSON.parse(body);
        const q = PILLAR9_QUESTIONS[questionId];
        if (!q || !response || typeof response !== 'string' || response.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'questionId and response required' }));
          return;
        }
        const result = await evaluatePillar(q.question, q.rubric, 'The Flourishing Metric', 'PILLAR9', response.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        const status = e.message.includes('unavailable') ? 503 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // --- QPADL Crypto endpoints ---

  function getCryptoResult(result) {
    if (!result || result.error) throw new Error((result && result.error) || 'crypto server error');
    if (!result.result) throw new Error('crypto server returned empty result');
    return result.result;
  }

  if (url.pathname === '/api/crypto/status' && req.method === 'GET') {
    try {
      const result = await sendCryptoRequest('status', {});
      const r = getCryptoResult(result);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ algorithms: r.algorithms, timestamp: Date.now() }));
    } catch (e) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  function readCryptoBody(req, onBody, onError) {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try { onBody(JSON.parse(body)); }
      catch { onError('Invalid JSON'); }
    });
  }

  if (url.pathname === '/api/crypto/keypair' && req.method === 'POST') {
    readCryptoBody(req, async (json) => {
      try {
        const result = await sendCryptoRequest('keypair', { algorithm: json.algorithm || 'mayo1' });
        const r = getCryptoResult(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...r, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }, (err) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err }));
    });
    return;
  }

  if (url.pathname === '/api/crypto/sign' && req.method === 'POST') {
    readCryptoBody(req, async (json) => {
      try {
        if (!json.message || !json.secret_key) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'message and secret_key required' }));
          return;
        }
        const result = await sendCryptoRequest('sign', {
          algorithm: json.algorithm || 'mayo1',
          message: json.message,
          secret_key: json.secret_key,
        });
        const r = getCryptoResult(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...r, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }, (err) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err }));
    });
    return;
  }

  if (url.pathname === '/api/crypto/verify' && req.method === 'POST') {
    readCryptoBody(req, async (json) => {
      try {
        if (!json.message || !json.signature || !json.public_key) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'message, signature, and public_key required' }));
          return;
        }
        const result = await sendCryptoRequest('verify', {
          algorithm: json.algorithm || 'mayo1',
          message: json.message,
          signature: json.signature,
          public_key: json.public_key,
        });
        const r = getCryptoResult(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: r.valid, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }, (err) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err }));
    });
    return;
  }

  if (url.pathname === '/api/ledger/entry' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const { slice, event } = JSON.parse(body);
        if (!slice || !event || !event.id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'slice and event.id required' }));
          return;
        }
        saveEntry(slice, event);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/ledger/history' && req.method === 'GET') {
    try {
      const since = url.searchParams.get('since');
      const entries = since ? loadSince(Number(since)) : loadAll();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ entries, count: entries.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function shutdown() {
  console.log('[TRUSTED_KERNEL] Shutting down...');
  if (cryptoProc) {
    cryptoProc.removeAllListeners('exit');
    cryptoProc.stdin.end();
    const timeout = setTimeout(() => cryptoProc.kill(), 3000);
    cryptoProc.on('exit', () => clearTimeout(timeout));
  }
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  console.log(`[TRUSTED_KERNEL] Server running on port ${PORT}`);
  console.log(`[TRUSTED_KERNEL] Using Node.js built-in HTTP (no express needed)`);
  console.log(`  GET  /api/rtsw/latest`);
  console.log(`  GET  /classify/fallacy-data`);
  console.log(`  GET  /api/health`);
  console.log(`  POST /validate`);
  console.log(`  POST /api/pgate/engage`);
  console.log(`  POST /api/veracity/calculate`);
  console.log(`  POST /api/quorum/calculate`);
  console.log(`  POST /api/atrophy/calculate`);
  console.log(`  GET  /api/kernel/version`);
  console.log(`  GET  /api/feedback/weights`);
  console.log(`  POST /api/feedback`);
  console.log(`  GET  /api/feedback/history`);
  console.log(`  POST /api/feedback/analyze`);
  console.log(`  GET  /api/feedback/analyses`);
  console.log(`  POST /api/reframe`);
  console.log(`  POST /api/pillar2/evaluate`);
  console.log(`  POST /api/pillar3/evaluate`);
  console.log(`  POST /api/pillar3/sequence`);
  console.log(`  GET  /api/crypto/status`);
  console.log(`  POST /api/crypto/keypair`);
  console.log(`  POST /api/crypto/sign`);
  console.log(`  POST /api/crypto/verify`);
});