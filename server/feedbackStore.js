import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'feedback.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_weights (
    agent TEXT PRIMARY KEY,
    weight REAL NOT NULL DEFAULT 1.0,
    correct INTEGER NOT NULL DEFAULT 0,
    incorrect INTEGER NOT NULL DEFAULT 0,
    last_updated INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS feedback_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    statement_id TEXT NOT NULL,
    fallacy_id TEXT,
    text TEXT,
    verdict TEXT NOT NULL,
    agent_scores TEXT NOT NULL,
    weight_before TEXT NOT NULL,
    weight_after TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_feedback_statement ON feedback_events(statement_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_events(created_at);

  CREATE TABLE IF NOT EXISTS analysis_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    statement_id TEXT NOT NULL,
    text TEXT,
    roberta_fallacies TEXT,
    roberta_max REAL,
    groq_score REAL,
    groq_detected INTEGER,
    openrouter_scores TEXT,
    openrouter_mean REAL,
    weights_used TEXT,
    weighted_score REAL,
    state TEXT,
    inverion_triggered INTEGER,
    bypass_triggered INTEGER,
    raw_roberta_response TEXT,
    raw_free_agents_response TEXT,
    processing_ms INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_analysis_created ON analysis_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_analysis_statement ON analysis_events(statement_id);
`);

const DEFAULT_AGENTS = ['roberta', 'groq', 'openrouter'];

const seedStmt = db.prepare(`
  INSERT OR IGNORE INTO agent_weights (agent, weight, last_updated) VALUES (?, 1.0, ?)
`);
for (const agent of DEFAULT_AGENTS) seedStmt.run(agent, Date.now());

export function getAllWeights() {
  const rows = db.prepare('SELECT agent, weight, correct, incorrect, last_updated FROM agent_weights').all();
  const out = {};
  for (const r of rows) {
    out[r.agent] = {
      weight: r.weight,
      correct: r.correct,
      incorrect: r.incorrect,
      lastUpdated: r.last_updated,
    };
  }
  return out;
}

export function recordFeedback({ statementId, fallacyId, text, verdict, agentScores, weightBefore, weightAfter }) {
  const insert = db.prepare(`
    INSERT INTO feedback_events (statement_id, fallacy_id, text, verdict, agent_scores, weight_before, weight_after, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(
    statementId,
    fallacyId || null,
    text || null,
    verdict,
    JSON.stringify(agentScores || {}),
    JSON.stringify(weightBefore || {}),
    JSON.stringify(weightAfter || {}),
    Date.now(),
  );
}

export function applyVerdict({ verdict, agentScores }) {
  const DELTA = 0.1;
  const MIN_W = 0.1;
  const MAX_W = 5.0;
  const agents = Object.keys(agentScores || {});
  const before = getAllWeights();

  const update = db.prepare(`
    UPDATE agent_weights
    SET weight = ?,
        correct = correct + ?,
        incorrect = incorrect + ?,
        last_updated = ?
    WHERE agent = ?
  `);
  const tx = db.transaction(() => {
    for (const agent of agents) {
      const s = agentScores[agent];
      const current = before[agent]?.weight ?? 1.0;
      let next = current;
      if (verdict === 'correct' && s.detected) next = Math.min(MAX_W, current + DELTA);
      else if (verdict === 'correct' && !s.detected) next = Math.max(MIN_W, current - DELTA);
      else if (verdict === 'incorrect' && s.detected) next = Math.max(MIN_W, current - DELTA);
      else if (verdict === 'incorrect' && !s.detected) next = Math.min(MAX_W, current + DELTA);
      // false_negative: analyzer missed a real fallacy - boost agents that didn't fire
      else if (verdict === 'false_negative' && !s.detected) next = Math.min(MAX_W, current + DELTA);
      else if (verdict === 'false_negative' && s.detected) next = Math.max(MIN_W, current - DELTA);
      const correctDelta = (verdict === 'correct' || verdict === 'false_negative') ? 1 : 0;
      const incorrectDelta = verdict === 'incorrect' ? 1 : 0;
      update.run(next, correctDelta, incorrectDelta, Date.now(), agent);
    }
  });
  tx();
  return getAllWeights();
}

export function getRecentFeedback(limit = 50) {
  return db.prepare(`
    SELECT id, statement_id, fallacy_id, text, verdict, agent_scores, weight_before, weight_after, created_at
    FROM feedback_events ORDER BY id DESC LIMIT ?
  `).all(limit);
}

export function recordAnalysis({ statementId, text, robertaFallacies, robertaMax, groqScore, groqDetected, openrouterScores, openrouterMean, weightsUsed, weightedScore, state, inverionTriggered, bypassTriggered, rawRobertaResponse, rawFreeAgentsResponse, processingMs }) {
  db.prepare(`
    INSERT INTO analysis_events (
      statement_id, text, roberta_fallacies, roberta_max,
      groq_score, groq_detected, openrouter_scores, openrouter_mean,
      weights_used, weighted_score, state,
      inverion_triggered, bypass_triggered,
      raw_roberta_response, raw_free_agents_response, processing_ms,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    statementId,
    text || null,
    JSON.stringify(robertaFallacies || []),
    robertaMax ?? null,
    groqScore ?? null,
    groqDetected === null || groqDetected === undefined ? null : (groqDetected ? 1 : 0),
    JSON.stringify(openrouterScores || []),
    openrouterMean ?? null,
    JSON.stringify(weightsUsed || {}),
    weightedScore ?? null,
    state ?? null,
    inverionTriggered ? 1 : 0,
    bypassTriggered ? 1 : 0,
    rawRobertaResponse ? JSON.stringify(rawRobertaResponse) : null,
    rawFreeAgentsResponse ? JSON.stringify(rawFreeAgentsResponse) : null,
    processingMs ?? null,
    Date.now(),
  );
}

export function getRecentAnalyses(limit = 50) {
  return db.prepare(`
    SELECT id, statement_id, text, roberta_fallacies, roberta_max, groq_score, groq_detected,
           openrouter_scores, openrouter_mean, weights_used, weighted_score, state,
           inverion_triggered, bypass_triggered, processing_ms, created_at
    FROM analysis_events ORDER BY id DESC LIMIT ?
  `).all(limit);
}
