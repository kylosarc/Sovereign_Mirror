import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'ledger.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    slice TEXT NOT NULL,
    nodeId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  );
  CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON ledger_entries(timestamp);
  CREATE INDEX IF NOT EXISTS idx_ledger_slice_type ON ledger_entries(slice, eventType);
  CREATE INDEX IF NOT EXISTS idx_ledger_nodeId ON ledger_entries(nodeId);
`);

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO ledger_entries (id, slice, nodeId, eventType, timestamp, payload)
  VALUES (@id, @slice, @nodeId, @eventType, @timestamp, @payload)
`);

const selectAllStmt = db.prepare(`
  SELECT * FROM ledger_entries ORDER BY timestamp DESC LIMIT 200
`);

const selectSinceStmt = db.prepare(`
  SELECT * FROM ledger_entries WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT 200
`);

const selectBySliceStmt = db.prepare(`
  SELECT * FROM ledger_entries WHERE slice = ? ORDER BY timestamp DESC LIMIT 200
`);

const countStmt = db.prepare(`SELECT COUNT(*) AS n FROM ledger_entries`);

const statsByTypeStmt = db.prepare(`
  SELECT slice, eventType, COUNT(*) AS n FROM ledger_entries GROUP BY slice, eventType
`);

export function saveEntry(slice, event) {
  if (!event || !event.id) throw new Error('event.id required');
  insertStmt.run({
    id: event.id,
    slice,
    nodeId: event.nodeId || '',
    eventType: event.eventType || '',
    timestamp: event.timestamp || Date.now(),
    payload: JSON.stringify(event),
  });
}

export function loadAll() {
  return selectAllStmt.all().map(rowToEntry);
}

export function loadSince(since) {
  return selectSinceStmt.all(since).map(rowToEntry);
}

export function loadBySlice(slice) {
  return selectBySliceStmt.all(slice).map(rowToEntry);
}

export function getStats() {
  const total = countStmt.get().n;
  const byType = statsByTypeStmt.all();
  return { total, byType };
}

function rowToEntry(row) {
  return {
    ...JSON.parse(row.payload),
    slice: row.slice,
    _stored_at: row.created_at,
  };
}

console.log(`[LEDGER] SQLite store initialized at ${DB_PATH}`);
