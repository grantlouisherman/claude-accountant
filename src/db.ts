import Database from "better-sqlite3";
import path from "node:path";
import type { UsageLogEntry, DailySummary } from "./types.js";
import { resolveDataDir } from "./config.js";
import type { Config } from "./types.js";

let db: Database.Database | null = null;

export function getDb(config: Config): Database.Database {
  if (db) return db;

  const dataDir = resolveDataDir(config);
  const dbPath = path.join(dataDir, "usage.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      task_description TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'estimate'
    );

    CREATE TABLE IF NOT EXISTS daily_summary (
      date TEXT PRIMARY KEY,
      total_input_tokens INTEGER NOT NULL DEFAULT 0,
      total_output_tokens INTEGER NOT NULL DEFAULT 0,
      total_cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      total_cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost_usd REAL NOT NULL DEFAULT 0,
      request_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_usage_log_timestamp ON usage_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_log_session ON usage_log(session_id);
  `);
}

export function logUsage(config: Config, entry: UsageLogEntry): void {
  const d = getDb(config);
  const stmt = d.prepare(`
    INSERT INTO usage_log (timestamp, session_id, model, input_tokens, output_tokens,
      cache_read_tokens, cache_write_tokens, estimated_cost_usd, task_description, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    entry.timestamp,
    entry.session_id,
    entry.model,
    entry.input_tokens,
    entry.output_tokens,
    entry.cache_read_tokens,
    entry.cache_write_tokens,
    entry.estimated_cost_usd,
    entry.task_description,
    entry.source
  );

  updateDailySummary(config, entry);
}

function updateDailySummary(config: Config, entry: UsageLogEntry): void {
  const d = getDb(config);
  const date = entry.timestamp.split("T")[0];

  d.prepare(
    `
    INSERT INTO daily_summary (date, total_input_tokens, total_output_tokens,
      total_cache_read_tokens, total_cache_write_tokens, total_cost_usd, request_count)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(date) DO UPDATE SET
      total_input_tokens = total_input_tokens + excluded.total_input_tokens,
      total_output_tokens = total_output_tokens + excluded.total_output_tokens,
      total_cache_read_tokens = total_cache_read_tokens + excluded.total_cache_read_tokens,
      total_cache_write_tokens = total_cache_write_tokens + excluded.total_cache_write_tokens,
      total_cost_usd = total_cost_usd + excluded.total_cost_usd,
      request_count = request_count + 1
  `
  ).run(
    date,
    entry.input_tokens,
    entry.output_tokens,
    entry.cache_read_tokens,
    entry.cache_write_tokens,
    entry.estimated_cost_usd
  );
}

export function getTodayUsage(config: Config): DailySummary {
  const d = getDb(config);
  const today = new Date().toISOString().split("T")[0];
  const row = d
    .prepare("SELECT * FROM daily_summary WHERE date = ?")
    .get(today) as DailySummary | undefined;

  return (
    row ?? {
      date: today,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cache_read_tokens: 0,
      total_cache_write_tokens: 0,
      total_cost_usd: 0,
      request_count: 0,
    }
  );
}

export function getUsageHistory(
  config: Config,
  days: number
): DailySummary[] {
  const d = getDb(config);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  return d
    .prepare(
      "SELECT * FROM daily_summary WHERE date >= ? ORDER BY date DESC"
    )
    .all(sinceStr) as DailySummary[];
}

export function getMonthUsage(config: Config): number {
  const d = getDb(config);
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const row = d
    .prepare(
      "SELECT COALESCE(SUM(total_cost_usd), 0) as total FROM daily_summary WHERE date >= ?"
    )
    .get(monthStart) as { total: number };

  return row.total;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
